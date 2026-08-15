from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError, ValidationAppError
from app.models.enums import (
    IncidentStatus,
    NotificationType,
    RiskFactorCategory,
    UserRole,
)
from app.models.incident import Incident, IncidentEvidence
from app.models.user import User
from app.schemas.incident import IncidentCreate, IncidentVerifyRequest
from app.services.farm_service import FarmService
from app.services.notification_service import NotificationService
from app.services.risk_service import RiskEngine
from app.utils.helpers import generate_id, incident_severity


class IncidentService:
    @staticmethod
    def list_incidents(db: Session, farm_id: str | None = None, user: User | None = None) -> list[Incident]:
        query = db.query(Incident).order_by(Incident.created_at.desc())
        if farm_id:
            FarmService.get_farm(db, farm_id, user)
            query = query.filter(Incident.farm_id == farm_id)
        elif user and user.role == UserRole.FARMER:
            farm_ids = [a.farm_id for a in user.farm_assignments]
            query = query.filter(Incident.farm_id.in_(farm_ids)) if farm_ids else query.filter(False)
        elif user and user.district_id and user.role != UserRole.OFFICER:
            query = query.join(Incident.farm).filter_by(district_id=user.district_id)
        return query.all()

    @staticmethod
    def get_incident(db: Session, incident_id: str, user: User | None = None) -> Incident:
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            raise NotFoundError("Incident", incident_id)
        FarmService.ensure_farm_access(incident.farm, user)
        return incident

    @staticmethod
    def create_incident(
        db: Session,
        payload: IncidentCreate,
        user: User | None = None,
        evidence_records: list | None = None,
    ) -> Incident:
        farm = FarmService.get_farm(db, payload.farm_id, user)
        try:
            observed_at = datetime.fromisoformat(payload.date_time.replace("Z", "+00:00"))
        except ValueError as exc:
            raise ValidationAppError("Invalid dateTime format.") from exc

        severity = incident_severity(payload.number_affected)
        incident = Incident(
            id=generate_id("INC"),
            farm_id=farm.id,
            incident_type=payload.incident_type,
            animal_type=payload.animal_type,
            number_affected=payload.number_affected,
            observed_at=observed_at,
            description=payload.description,
            location=payload.location,
            status=IncidentStatus.REPORTED,
            severity=severity,
            reported_by_id=user.id if user else None,
        )
        db.add(incident)
        db.flush()

        if evidence_records:
            for record in evidence_records:
                db.add(
                    IncidentEvidence(
                        id=generate_id("IEV"),
                        incident_id=incident.id,
                        file_name=record.file_name,
                        file_url=record.file_url,
                    )
                )

        factor_desc = (
            f"{payload.description[:220]}{RiskEngine.incident_factor_ref(incident.id)}"
        )
        RiskEngine.add_factor(
            db,
            farm.id,
            RiskEngine.incident_factor_label(incident.id, payload.incident_type),
            RiskEngine.incident_penalty(severity),
            RiskFactorCategory.INCIDENT,
            factor_desc,
        )
        old_score = RiskEngine.recalculate_farm(db, farm)
        RiskEngine.update_farm_counters(db, farm)
        RiskEngine.notify_score_change(db, farm, old_score)

        NotificationService.create(
            db,
            title="New Incident Reported",
            message=f"{payload.incident_type} reported at {farm.name}.",
            notification_type=NotificationType.INCIDENT,
            broadcast_all=True,
        )
        NotificationService.create(
            db,
            title="Incident Submitted — Pending Veterinary Verification",
            message=(
                f"Your {payload.incident_type} report ({incident.id}) is awaiting "
                "veterinary review."
            ),
            notification_type=NotificationType.INCIDENT,
            target_role=UserRole.FARMER,
            action_url="/incident",
        )
        db.commit()
        db.refresh(incident)
        return incident

    @staticmethod
    def verify_incident(
        db: Session,
        incident_id: str,
        payload: IncidentVerifyRequest,
        user: User | None,
    ) -> Incident:
        incident = IncidentService.get_incident(db, incident_id, user)
        if incident.status in (IncidentStatus.VERIFIED, IncidentStatus.REJECTED):
            raise ConflictError("Incident is already closed.")

        action = payload.action
        if action == "validate":
            incident.status = IncidentStatus.VERIFIED
            incident.veterinarian_notes = payload.notes or "Verified by certified District Veterinary Officer."
            incident.verified_at = datetime.now(timezone.utc)
            incident.verified_by_id = user.id if user else None
            incident.verified_by_name = user.full_name if user else "District Veterinary Officer"
            RiskEngine.confirm_verified_incident(db, incident)
            title = "Incident Verified"
        elif action == "request_info":
            incident.status = IncidentStatus.MORE_INFO_REQUIRED
            incident.requested_info_notes = payload.notes or "Please upload additional diagnostic evidence."
            title = "Incident Info Requested"
        elif action == "reject":
            incident.status = IncidentStatus.REJECTED
            incident.veterinarian_notes = payload.notes or "Non-critical environmental anomaly. No bio-hazard detected."
            title = "Incident Rejected"
            RiskEngine.deactivate_incident_factors(db, incident.farm_id, incident.id)
            farm = incident.farm
            old_score = RiskEngine.recalculate_farm(db, farm)
            RiskEngine.update_farm_counters(db, farm)
            RiskEngine.notify_score_change(db, farm, old_score)
        else:
            raise ValidationAppError("Invalid verification action.")

        if action == "validate":
            farm = incident.farm
            old_score = RiskEngine.recalculate_farm(db, farm)
            RiskEngine.update_farm_counters(db, farm)
            RiskEngine.notify_score_change(db, farm, old_score)
            NotificationService.create(
                db,
                title="CONFIRMED — Incident Verified by Veterinarian",
                message=(
                    f"Incident {incident.id} has been verified. "
                    f"Biosecurity score updated to {farm.biosecurity_score}/100. "
                    "Awaiting veterinary action plan."
                ),
                notification_type=NotificationType.VERIFICATION,
                target_role=UserRole.FARMER,
                action_url="/risk",
            )
            NotificationService.create(
                db,
                title="Verified Incident — Action Plan Required",
                message=f"Incident {incident.id} at {farm.name} verified. Create and send action plan.",
                notification_type=NotificationType.CORRECTIVE,
                target_role=UserRole.VETERINARIAN,
                action_url="/incident",
            )
        elif action != "reject":
            farm = incident.farm
            RiskEngine.update_farm_counters(db, farm)

        if action != "validate":
            farm = incident.farm
            reason = payload.notes or incident.requested_info_notes or incident.veterinarian_notes or ""
            if action == "request_info":
                NotificationService.create(
                    db,
                    title="ACTION NEEDED — More Information Required",
                    message=(
                        f"Incident {incident.id} at {farm.name}: "
                        f"{incident.requested_info_notes or reason or 'Please upload additional evidence.'}"
                    ),
                    notification_type=NotificationType.VERIFICATION,
                    target_role=UserRole.FARMER,
                    action_url="/incident",
                )
            else:
                NotificationService.create(
                    db,
                    title="REJECTED — Incident Declined by Veterinarian",
                    message=(
                        f"Incident {incident.id} at {farm.name} was rejected by the veterinarian. "
                        f"Reason: {incident.veterinarian_notes or reason or 'No bio-hazard detected.'}"
                    ),
                    notification_type=NotificationType.VERIFICATION,
                    target_role=UserRole.FARMER,
                    action_url="/incident",
                )
        db.commit()
        db.refresh(incident)
        return incident


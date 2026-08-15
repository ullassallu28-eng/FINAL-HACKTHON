from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError, ValidationAppError
from app.models.enums import InspectionStatus, RiskLevel, UserRole
from app.models.farm import Farm
from app.models.inspection import Inspection
from app.models.spatial import SpatialZone, VetFacility
from app.models.user import User
from app.schemas.officer import InspectionComplete, InspectionCreate
from app.services.farm_service import FarmService
from app.services.notification_service import NotificationService
from app.models.enums import NotificationType
from app.utils.helpers import generate_id, haversine_km


class GisService:
    @staticmethod
    def get_map_nodes(
        db: Session,
        farm_type: str | None = None,
        risk_level: str | None = None,
        district_id: str | None = None,
    ) -> list[dict]:
        query = db.query(Farm)
        if district_id:
            query = query.filter(Farm.district_id == district_id)
        if farm_type:
            query = query.filter(Farm.farm_type == farm_type)
        if risk_level:
            query = query.filter(Farm.risk_level == risk_level)
        farms = query.all()
        nodes = []
        for farm in farms:
            last_insp = (
                db.query(func.max(Inspection.inspection_date))
                .filter(Inspection.farm_id == farm.id, Inspection.status == InspectionStatus.COMPLETED)
                .scalar()
            )
            nodes.append(
                {
                    "farm": farm,
                    "last_inspection": last_insp.isoformat() if last_insp else "N/A",
                }
            )

        vet_facilities = db.query(VetFacility).all()
        for vet in vet_facilities:
            nodes.append(
                {
                    "vet": vet,
                }
            )
        return nodes

    @staticmethod
    def spatial_risk(db: Session, farm_id: str, radius_km: float = 15.0) -> dict:
        farm = FarmService.get_farm(db, farm_id)
        if farm.latitude is None or farm.longitude is None:
            raise ValidationAppError("Farm coordinates are required for spatial analysis.")

        nearby_farms = db.query(Farm).filter(Farm.id != farm.id).all()
        high_risk = 0
        for other in nearby_farms:
            if other.latitude is None or other.longitude is None:
                continue
            dist = haversine_km(farm.latitude, farm.longitude, other.latitude, other.longitude)
            if dist <= radius_km and other.risk_level == RiskLevel.CRITICAL:
                high_risk += 1

        zones = (
            db.query(SpatialZone)
            .filter(SpatialZone.active.is_(True))
            .all()
        )
        containment = []
        for zone in zones:
            dist = haversine_km(farm.latitude, farm.longitude, zone.center_lat, zone.center_lng)
            if dist <= radius_km + zone.radius_km:
                containment.append(zone)

        from app.models.incident import Incident
        from app.models.enums import IncidentStatus

        nearby_incidents = 0
        context_parts = []
        for other in nearby_farms:
            if other.latitude is None or other.longitude is None:
                continue
            dist = haversine_km(farm.latitude, farm.longitude, other.latitude, other.longitude)
            if dist <= radius_km:
                count = (
                    db.query(func.count(Incident.id))
                    .filter(
                        Incident.farm_id == other.id,
                        Incident.status.in_([
                            IncidentStatus.REPORTED,
                            IncidentStatus.UNDER_REVIEW,
                            IncidentStatus.VERIFIED,
                        ]),
                    )
                    .scalar()
                )
                nearby_incidents += count or 0
                if other.risk_level == RiskLevel.CRITICAL:
                    context_parts.append(
                        f"1 {other.farm_type.value} farm ({other.location}, {round(dist, 1)}km away) "
                        f"currently under high bio-security quarantine."
                    )

        return {
            "center_farm_id": farm.id,
            "radius_km": radius_km,
            "nearby_incidents": nearby_incidents,
            "nearby_high_risk_farms": high_risk,
            "containment_zones": [
                {
                    "id": z.id,
                    "center_lat": z.center_lat,
                    "center_lng": z.center_lng,
                    "radius_km": z.radius_km,
                    "reason": z.reason or z.name,
                    "active": z.active,
                }
                for z in containment
            ],
            "regional_context": " ".join(context_parts) or "No high-risk farms detected within the configured radius.",
        }


class OfficerService:
    @staticmethod
    def officer_district_scope(user: User | None) -> str | None:
        if user and user.role == UserRole.OFFICER:
            return None
        return user.district_id if user else None

    @staticmethod
    def get_stats(db: Session, district_id: str | None = None) -> dict:
        query = db.query(Farm)
        if district_id:
            query = query.filter(Farm.district_id == district_id)
        farms = query.all()
        total = len(farms)
        high = sum(1 for f in farms if f.risk_level == RiskLevel.CRITICAL)
        medium = sum(1 for f in farms if f.risk_level == RiskLevel.CAUTION)
        low = sum(1 for f in farms if f.risk_level == RiskLevel.SAFE)

        from app.models.incident import Incident
        from app.models.corrective_action import CorrectiveAction
        from app.models.enums import IncidentStatus, CorrectiveActionStatus

        farm_ids = [f.id for f in farms] if district_id else None

        open_incident_filter = Incident.status.in_([
            IncidentStatus.REPORTED,
            IncidentStatus.UNDER_REVIEW,
            IncidentStatus.MORE_INFO_REQUIRED,
        ])
        open_incidents_query = db.query(func.count(Incident.id)).filter(open_incident_filter)
        if farm_ids is not None:
            open_incidents_query = open_incidents_query.filter(Incident.farm_id.in_(farm_ids))
        open_incidents = open_incidents_query.scalar() or 0

        pending_verifications_query = db.query(func.count(Incident.id)).filter(
            Incident.status.in_([IncidentStatus.REPORTED, IncidentStatus.UNDER_REVIEW])
        )
        if farm_ids is not None:
            pending_verifications_query = pending_verifications_query.filter(
                Incident.farm_id.in_(farm_ids)
            )
        pending_verifications = pending_verifications_query.scalar() or 0

        pending_inspections_query = db.query(func.count(Inspection.id)).filter(
            Inspection.status == InspectionStatus.SCHEDULED
        )
        if farm_ids is not None:
            pending_inspections_query = pending_inspections_query.filter(
                Inspection.farm_id.in_(farm_ids)
            )
        pending_inspections = pending_inspections_query.scalar() or 0

        open_actions_query = db.query(func.count(CorrectiveAction.id)).filter(
            CorrectiveAction.status.notin_([
                CorrectiveActionStatus.VERIFIED,
                CorrectiveActionStatus.CLOSED,
            ])
        )
        if farm_ids is not None:
            open_actions_query = open_actions_query.filter(CorrectiveAction.farm_id.in_(farm_ids))
        open_actions = open_actions_query.scalar() or 0

        return {
            "total_registered_farms": total,
            "high_risk_farms": high,
            "medium_risk_farms": medium,
            "low_risk_farms": low,
            "open_incidents": open_incidents,
            "pending_verifications": pending_verifications,
            "pending_inspections": pending_inspections,
            "open_corrective_actions": open_actions,
        }

    @staticmethod
    def inspection_priority(db: Session, district_id: str | None = None) -> list[Farm]:
        query = db.query(Farm)
        if district_id:
            query = query.filter(Farm.district_id == district_id)
        return query.order_by(Farm.biosecurity_score.asc()).all()


class InspectionService:
    @staticmethod
    def schedule(db: Session, payload: InspectionCreate, user: User) -> Inspection:
        farm = FarmService.get_farm(db, payload.farm_id, user)
        try:
            scheduled_at = datetime.fromisoformat(payload.scheduled_at.replace("Z", "+00:00"))
        except ValueError as exc:
            raise ValidationAppError("Invalid scheduledAt format.") from exc

        inspection = Inspection(
            id=generate_id("INSP"),
            farm_id=farm.id,
            inspector_id=user.id if user.role == UserRole.VETERINARIAN else None,
            inspector_name=user.full_name,
            inspection_date=scheduled_at.date(),
            scheduled_at=scheduled_at,
            status=InspectionStatus.SCHEDULED,
            notes=payload.notes,
        )
        db.add(inspection)
        NotificationService.create(
            db,
            title="Inspection Scheduled",
            message=(
                f"Government biosecurity inspection scheduled for {farm.name} "
                f"({farm.id}) on {scheduled_at.strftime('%d %b %Y')}."
            ),
            notification_type=NotificationType.INSPECTION,
            target_role=UserRole.FARMER,
        )
        db.commit()
        db.refresh(inspection)
        return inspection

    @staticmethod
    def complete(db: Session, inspection_id: str, payload: InspectionComplete, user: User) -> Inspection:
        inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
        if not inspection:
            raise NotFoundError("Inspection", inspection_id)
        from app.models.enums import InspectionResult

        inspection.status = InspectionStatus.COMPLETED
        inspection.result = InspectionResult(payload.result)
        inspection.notes = payload.notes
        if payload.inspection_date:
            inspection.inspection_date = datetime.fromisoformat(payload.inspection_date).date()
        db.commit()
        db.refresh(inspection)
        return inspection

    @staticmethod
    def list_inspections(
        db: Session,
        farm_id: str | None = None,
        district_id: str | None = None,
        status: InspectionStatus | None = None,
    ) -> list[Inspection]:
        query = db.query(Inspection).join(Farm, Farm.id == Inspection.farm_id)
        if farm_id:
            query = query.filter(Inspection.farm_id == farm_id)
        if district_id:
            query = query.filter(Farm.district_id == district_id)
        if status:
            query = query.filter(Inspection.status == status)
        return query.order_by(Inspection.scheduled_at.desc()).all()

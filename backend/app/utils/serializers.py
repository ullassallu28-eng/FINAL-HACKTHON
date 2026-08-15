from datetime import date, datetime, timezone

from sqlalchemy.orm import Session

from app.models.corrective_action import ActionEvidence, CorrectiveAction
from app.models.farm import Farm
from app.models.incident import Incident, IncidentEvidence
from app.models.notification import Notification
from app.models.risk import RiskFactor, RiskScoreHistory
from app.schemas.common import Coordinates
from app.schemas.corrective_action import CorrectiveActionResponse, SubmittedEvidence
from app.schemas.farm import BiosecurityPassportResponse, FarmResponse, InspectionHistoryItem
from app.schemas.gis import GisMapNodeResponse
from app.schemas.incident import EvidenceFileResponse, IncidentResponse
from app.schemas.notification import NotificationResponse
from app.schemas.risk import RiskFactorResponse, RiskHistoryPoint
from app.services.media_service import MediaService
from app.utils.helpers import format_relative_time


def farm_to_response(farm: Farm) -> FarmResponse:
    coords = None
    if farm.latitude is not None and farm.longitude is not None:
        coords = Coordinates(lat=farm.latitude, lng=farm.longitude)
    return FarmResponse(
        id=farm.id,
        name=farm.name,
        location=farm.location,
        owner_name=farm.owner_name,
        farm_type=farm.farm_type.value,
        capacity=farm.capacity,
        animal_count=farm.animal_count,
        biosecurity_score=farm.biosecurity_score,
        previous_score=farm.previous_score,
        risk_level=farm.risk_level.value,
        visitors_today=farm.visitors_today,
        vehicles_today=farm.vehicles_today,
        compliance_rate=farm.compliance_rate,
        vaccination_coverage=farm.vaccination_coverage,
        active_incidents=farm.active_incidents,
        active_alerts=farm.active_alerts,
        updated_at=farm.updated_at,
        coordinates=coords,
    )


def incident_to_response(incident: Incident, db: Session | None = None) -> IncidentResponse:
    farm = incident.farm
    return IncidentResponse(
        id=incident.id,
        farm_id=incident.farm_id,
        farm_name=farm.name if farm else "",
        farm_type=farm.farm_type.value if farm else "mixed",
        incident_type=incident.incident_type,
        animal_type=incident.animal_type,
        number_affected=incident.number_affected,
        date_time=_format_dt(incident.observed_at),
        description=incident.description,
        location=incident.location,
        evidence_files=[evidence_file_to_response(e, db) for e in incident.evidence_files],
        status=incident.status.value,
        severity=incident.severity.value,
        veterinarian_notes=incident.veterinarian_notes,
        requested_info_notes=incident.requested_info_notes,
        verified_at=_format_dt(incident.verified_at) if incident.verified_at else None,
        verified_by=incident.verified_by_name,
    )


def evidence_file_to_response(evidence: IncidentEvidence, db: Session | None = None) -> EvidenceFileResponse:
    return EvidenceFileResponse(
        name=evidence.file_name,
        url=MediaService.resolve_url(db, evidence.file_url),
        timestamp=_format_dt(evidence.uploaded_at),
    )


VET_PLAN_MARKER = "[Veterinary Action Plan]"


def action_to_response(
    action: CorrectiveAction,
    db: Session | None = None,
    include_analysis: bool = False,
) -> CorrectiveActionResponse:
    submitted = None
    if action.evidence:
        submitted = evidence_to_submitted(action.evidence, db)

    evidence_analysis = None
    if include_analysis and action.evidence:
        from app.services.evidence_analysis_service import EvidenceAnalysisService

        evidence_analysis = EvidenceAnalysisService.analyze(db, action, action.evidence)

    source = "veterinary_action_plan" if VET_PLAN_MARKER in (action.description or "") else "general"

    return CorrectiveActionResponse(
        id=action.id,
        farm_id=action.farm_id,
        farm_name=action.farm.name if action.farm else "",
        incident_id=action.incident_id,
        title=action.title,
        description=action.description,
        priority=action.priority.value,
        assigned_person=action.assigned_person,
        deadline=action.deadline.isoformat(),
        created_at=_format_dt(action.created_at),
        status=action.status.value,
        evidence_required=action.evidence_required,
        verification_status=action.verification_status.value,
        submitted_evidence=submitted,
        source=source,
        evidence_analysis=evidence_analysis,
    )


def evidence_to_submitted(evidence: ActionEvidence, db: Session | None = None) -> SubmittedEvidence:
    ts = evidence.captured_at
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    formatted = ts.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    return SubmittedEvidence(
        file_url=MediaService.resolve_url(db, evidence.file_url),
        file_name=evidence.file_name,
        timestamp=formatted,
        location=evidence.location or "",
        notes=evidence.notes or "",
    )


def risk_factor_to_response(factor: RiskFactor) -> RiskFactorResponse:
    return RiskFactorResponse(
        id=factor.id,
        label=factor.label,
        delta=factor.delta,
        category=factor.category.value,
        description=factor.description,
    )


def risk_history_to_response(point: RiskScoreHistory) -> RiskHistoryPoint:
    return RiskHistoryPoint(time=_format_dt(point.recorded_at), score=point.score)


def gis_node_from_farm(farm: Farm, last_inspection: str) -> GisMapNodeResponse:
    return GisMapNodeResponse(
        id=farm.id,
        name=farm.name,
        farm_type=farm.farm_type.value,
        risk_level=farm.risk_level.value,
        score=farm.biosecurity_score,
        lat=farm.latitude or 0.0,
        lng=farm.longitude or 0.0,
        active_incidents=farm.active_incidents,
        owner=farm.owner_name,
        contact=farm.owner_phone or "N/A",
        last_inspection=last_inspection,
    )


def notification_to_response(notification: Notification) -> NotificationResponse:
    target = "all" if notification.broadcast_all else (
        notification.target_role.value if notification.target_role else None
    )
    return NotificationResponse(
        id=notification.id,
        title=notification.title,
        message=notification.message,
        timestamp=format_relative_time(notification.created_at),
        type=notification.notification_type.value,
        read=notification.read,
        target_role=target,
        action_url=notification.action_url,
    )


def passport_to_response(
    farm: Farm,
    passport,
    inspection_history: list[InspectionHistoryItem],
) -> BiosecurityPassportResponse:
    return BiosecurityPassportResponse(
        farm_id=farm.id,
        farm_name=farm.name,
        farm_type=farm.farm_type.value,
        owner_name=farm.owner_name,
        location=farm.location,
        capacity=farm.capacity,
        animal_count=farm.animal_count,
        biosecurity_score=farm.biosecurity_score,
        hygiene_score=passport.hygiene_score,
        visitor_control_score=passport.visitor_control_score,
        quarantine_protocol_score=passport.quarantine_protocol_score,
        vaccination_coverage=farm.vaccination_coverage,
        waste_management_score=passport.waste_management_score,
        last_inspection_date=(
            passport.last_inspection_date.isoformat() if passport.last_inspection_date else "N/A"
        ),
        inspection_history=inspection_history,
        compliance_status=passport.compliance_status.value,
        risk_trend=passport.risk_trend.value,
        passport_qr_code=passport.passport_qr_code,
        issue_date=passport.issue_date.isoformat(),
    )


def _format_dt(value: datetime | date | None) -> str:
    if value is None:
        return ""
    if isinstance(value, date) and not isinstance(value, datetime):
        return value.isoformat()
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.isoformat()

from datetime import date, datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, ValidationAppError
from app.data.recommended_actions import recommended_for_incident
from app.models.corrective_action import CorrectiveAction
from app.models.enums import (
    ActionPriority,
    CorrectiveActionStatus,
    IncidentStatus,
    NotificationType,
    UserRole,
)
from app.models.user import User
from app.schemas.action_plan import ActionPlanItemRequest, ActionPlanSendRequest
from app.services.incident_service import IncidentService
from app.services.notification_service import NotificationService
from app.utils.helpers import generate_id


class ActionPlanService:
    @staticmethod
    def get_recommended(db: Session, incident_id: str, user: User | None) -> list[dict]:
        incident = IncidentService.get_incident(db, incident_id, user)
        templates = recommended_for_incident(incident.incident_type)
        return [
            {
                "key": t.key,
                "title": t.title,
                "description": t.description,
                "priority": t.priority,
                "evidence_required": t.evidence_required,
                "selected": True,
            }
            for t in templates
        ]

    @staticmethod
    def send_plan(
        db: Session,
        incident_id: str,
        payload: ActionPlanSendRequest,
        user: User | None,
    ) -> tuple[list[CorrectiveAction], int]:
        incident = IncidentService.get_incident(db, incident_id, user)
        if incident.status != IncidentStatus.VERIFIED:
            raise ValidationAppError("Action plan can only be sent for verified incidents.")
        if not payload.actions:
            raise ValidationAppError("At least one corrective action is required.")

        farm = incident.farm
        created: list[CorrectiveAction] = []
        for item in payload.actions:
            action = ActionPlanService._create_from_item(db, incident.id, farm.id, farm.owner_name, item)
            created.append(action)

        count = len(created)
        NotificationService.create(
            db,
            title="Veterinary Action Plan Received",
            message=(
                f"Incident {incident.id} has been reviewed and verified. "
                f"{count} corrective action{'s' if count != 1 else ''} require completion."
            ),
            notification_type=NotificationType.CORRECTIVE,
            target_role=UserRole.FARMER,
            action_url="/actions",
        )
        db.commit()
        for action in created:
            db.refresh(action)
        return created, count

    @staticmethod
    def _create_from_item(
        db: Session,
        incident_id: str,
        farm_id: str,
        owner_name: str,
        item: ActionPlanItemRequest,
    ) -> CorrectiveAction:
        try:
            if len(item.deadline) == 10:
                deadline = date.fromisoformat(item.deadline)
            else:
                deadline = datetime.fromisoformat(item.deadline.replace("Z", "+00:00")).date()
        except ValueError:
            deadline = (datetime.now(timezone.utc) + timedelta(days=3)).date()

        description = f"[Veterinary Action Plan]\n{item.description}"
        if item.veterinary_note:
            description = f"{description}\n\nVeterinary note: {item.veterinary_note}"

        action = CorrectiveAction(
            id=generate_id("ACT"),
            farm_id=farm_id,
            incident_id=incident_id,
            title=item.title,
            description=description,
            priority=ActionPriority(item.priority),
            assigned_person=item.assigned_person or owner_name,
            deadline=deadline,
            status=CorrectiveActionStatus.PENDING,
            evidence_required=item.evidence_required,
        )
        db.add(action)
        db.flush()
        return action

    @staticmethod
    def has_plan(db: Session, incident_id: str) -> bool:
        return (
            db.query(CorrectiveAction)
            .filter(CorrectiveAction.incident_id == incident_id)
            .count()
            > 0
        )

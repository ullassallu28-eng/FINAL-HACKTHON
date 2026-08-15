from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_optional_user
from app.database.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.notification import NotificationResponse
from app.services.notification_service import NotificationService
from app.utils.serializers import notification_to_response

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=list[NotificationResponse])
def list_notifications(
    role: UserRole | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: Annotated[User | None, Depends(get_optional_user)] = None,
):
    effective_role = role or (current_user.role if current_user else None)
    notifications = NotificationService.list_notifications(db, effective_role)
    return [notification_to_response(n) for n in notifications]


@router.patch("/{notification_id}/read", status_code=204)
def mark_notification_read(notification_id: str, db: Session = Depends(get_db)):
    NotificationService.mark_read(db, notification_id)
    return None


@router.patch("/read-all", status_code=204)
def mark_all_read(db: Session = Depends(get_db)):
    NotificationService.mark_all_read(db)
    return None

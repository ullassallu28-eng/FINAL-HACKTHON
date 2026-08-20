from sqlalchemy.orm import Session

from app.models.enums import NotificationType, UserRole
from app.models.notification import Notification
from app.utils.helpers import generate_id


class NotificationService:
    @staticmethod
    def create(
        db: Session,
        title: str,
        message: str,
        notification_type: NotificationType,
        target_role: UserRole | None = None,
        broadcast_all: bool = False,
        action_url: str | None = None,
    ) -> Notification:
        notification = Notification(
            id=generate_id("NOTIF"),
            title=title,
            message=message,
            notification_type=notification_type,
            target_role=target_role,
            broadcast_all=broadcast_all,
            action_url=action_url,
        )
        db.add(notification)
        db.flush()
        return notification

    @staticmethod
    def list_notifications(db: Session, role: UserRole | None = None) -> list[Notification]:
        query = db.query(Notification).order_by(Notification.created_at.desc())
        if role:
            query = query.filter(
                (Notification.broadcast_all.is_(True))
                | (Notification.target_role == role)
                | (Notification.target_role.is_(None))
            )
        return query.limit(100).all()

    @staticmethod
    def mark_read(db: Session, notification_id: str) -> None:
        notification = db.query(Notification).filter(Notification.id == notification_id).first()
        if notification:
            notification.read = True
            db.commit()

    @staticmethod
    def mark_all_read(db: Session) -> None:
        db.query(Notification).filter(Notification.read.is_(False)).update({"read": True})
        db.commit()

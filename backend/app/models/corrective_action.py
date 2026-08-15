from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.enums import (
    ActionPriority,
    CorrectiveActionStatus,
    VerificationStatus,
    pg_enum,
)


class CorrectiveAction(Base):
    __tablename__ = "corrective_actions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    farm_id: Mapped[str] = mapped_column(String(64), ForeignKey("farms.id"), nullable=False)
    incident_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("incidents.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[ActionPriority] = mapped_column(
        pg_enum(ActionPriority), default=ActionPriority.MEDIUM, nullable=False
    )
    assigned_person: Mapped[str] = mapped_column(String(255), nullable=False)
    deadline: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[CorrectiveActionStatus] = mapped_column(
        pg_enum(CorrectiveActionStatus), default=CorrectiveActionStatus.PENDING, nullable=False
    )
    evidence_required: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    verification_status: Mapped[VerificationStatus] = mapped_column(
        pg_enum(VerificationStatus), default=VerificationStatus.UNVERIFIED, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    farm: Mapped["Farm"] = relationship(back_populates="corrective_actions")
    incident: Mapped["Incident | None"] = relationship(back_populates="corrective_actions")
    evidence: Mapped["ActionEvidence | None"] = relationship(
        back_populates="action", uselist=False, cascade="all, delete-orphan"
    )


class ActionEvidence(Base):
    __tablename__ = "action_evidence"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    action_id: Mapped[str] = mapped_column(String(64), ForeignKey("corrective_actions.id"), unique=True, nullable=False)
    file_url: Mapped[str] = mapped_column(String(512), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    action: Mapped[CorrectiveAction] = relationship(back_populates="evidence")

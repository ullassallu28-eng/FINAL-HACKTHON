from datetime import datetime
import uuid

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.enums import IncidentSeverity, IncidentStatus, pg_enum


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    farm_id: Mapped[str] = mapped_column(String(64), ForeignKey("farms.id"), nullable=False)
    incident_type: Mapped[str] = mapped_column(String(255), nullable=False)
    animal_type: Mapped[str] = mapped_column(String(255), nullable=False)
    number_affected: Mapped[int] = mapped_column(Integer, nullable=False)
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[IncidentStatus] = mapped_column(
        pg_enum(IncidentStatus), default=IncidentStatus.REPORTED, nullable=False
    )
    severity: Mapped[IncidentSeverity] = mapped_column(
        pg_enum(IncidentSeverity), default=IncidentSeverity.MEDIUM, nullable=False
    )
    veterinarian_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    requested_info_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    verified_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    verified_by_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reported_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    farm: Mapped["Farm"] = relationship(back_populates="incidents")
    evidence_files: Mapped[list["IncidentEvidence"]] = relationship(
        back_populates="incident", cascade="all, delete-orphan"
    )
    reported_by_user: Mapped["User | None"] = relationship(
        back_populates="reported_incidents", foreign_keys=[reported_by_id]
    )
    verified_by_user: Mapped["User | None"] = relationship(
        back_populates="verified_incidents", foreign_keys=[verified_by_id]
    )
    corrective_actions: Mapped[list["CorrectiveAction"]] = relationship(back_populates="incident")


class IncidentEvidence(Base):
    __tablename__ = "incident_evidence_files"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    incident_id: Mapped[str] = mapped_column(String(64), ForeignKey("incidents.id"), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(String(512), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    incident: Mapped[Incident] = relationship(back_populates="evidence_files")

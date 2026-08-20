from datetime import date, datetime
import uuid

from sqlalchemy import Date, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.enums import InspectionResult, InspectionStatus, pg_enum


class Inspection(Base):
    __tablename__ = "inspections"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    farm_id: Mapped[str] = mapped_column(String(64), ForeignKey("farms.id"), nullable=False)
    inspector_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    inspector_name: Mapped[str] = mapped_column(String(255), nullable=False)
    inspection_date: Mapped[date] = mapped_column(Date, nullable=False)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    result: Mapped[InspectionResult | None] = mapped_column(pg_enum(InspectionResult), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[InspectionStatus] = mapped_column(
        pg_enum(InspectionStatus), default=InspectionStatus.SCHEDULED, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    farm: Mapped["Farm"] = relationship(back_populates="inspections")

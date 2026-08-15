from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class HealthRecord(Base):
    __tablename__ = "health_records"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    farm_id: Mapped[str] = mapped_column(String(64), ForeignKey("farms.id"), nullable=False)
    animal_type: Mapped[str] = mapped_column(String(255), nullable=False)
    batch_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    zone_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("zones.id"), nullable=True)
    health_status: Mapped[str] = mapped_column(String(128), nullable=False)
    mortality_count: Mapped[int] = mapped_column(Integer, default=0)
    morbidity_count: Mapped[int] = mapped_column(Integer, default=0)
    vaccination_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    farm: Mapped["Farm"] = relationship(back_populates="health_records")


class ChecklistItem(Base):
    __tablename__ = "checklist_items"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    farm_id: Mapped[str] = mapped_column(String(64), ForeignKey("farms.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    completed: Mapped[bool] = mapped_column(default=False, nullable=False)
    priority: Mapped[str | None] = mapped_column(String(32), nullable=True)

    farm: Mapped["Farm"] = relationship(back_populates="checklist_items")

from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.enums import FarmType, RegistrationStatus, RiskLevel, pg_enum


class Farm(Base):
    __tablename__ = "farms"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_name: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[str] = mapped_column(Text, nullable=False)
    farm_type: Mapped[FarmType] = mapped_column(pg_enum(FarmType), nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    animal_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    biosecurity_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    previous_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    risk_level: Mapped[RiskLevel] = mapped_column(pg_enum(RiskLevel), default=RiskLevel.SAFE, nullable=False)
    compliance_rate: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    vaccination_coverage: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    visitors_today: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    vehicles_today: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    active_incidents: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    active_alerts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    owner_phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    registration_status: Mapped[RegistrationStatus] = mapped_column(
        pg_enum(RegistrationStatus), default=RegistrationStatus.REGISTERED, nullable=False
    )
    district_id: Mapped[str] = mapped_column(String(64), ForeignKey("districts.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    district: Mapped["District"] = relationship(back_populates="farms")
    user_assignments: Mapped[list["UserFarmAssignment"]] = relationship(back_populates="farm")
    zones: Mapped[list["Zone"]] = relationship(back_populates="farm", cascade="all, delete-orphan")
    passport: Mapped["BiosecurityPassport | None"] = relationship(
        back_populates="farm", uselist=False, cascade="all, delete-orphan"
    )
    incidents: Mapped[list["Incident"]] = relationship(back_populates="farm")
    corrective_actions: Mapped[list["CorrectiveAction"]] = relationship(back_populates="farm")
    risk_factors: Mapped[list["RiskFactor"]] = relationship(back_populates="farm")
    risk_history: Mapped[list["RiskScoreHistory"]] = relationship(back_populates="farm")
    inspections: Mapped[list["Inspection"]] = relationship(back_populates="farm")
    assessments: Mapped[list["BiosecurityAssessment"]] = relationship(back_populates="farm")
    health_records: Mapped[list["HealthRecord"]] = relationship(back_populates="farm")
    checklist_items: Mapped[list["ChecklistItem"]] = relationship(back_populates="farm")


class Zone(Base):
    __tablename__ = "zones"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    farm_id: Mapped[str] = mapped_column(String(64), ForeignKey("farms.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    zone_type: Mapped[str] = mapped_column(String(64), nullable=False)
    risk_score: Mapped[int] = mapped_column(Integer, default=0)
    risk_level: Mapped[RiskLevel] = mapped_column(pg_enum(RiskLevel), default=RiskLevel.SAFE)
    compliance_rate: Mapped[float] = mapped_column(Float, default=0.0)
    animal_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_inspection: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    farm: Mapped[Farm] = relationship(back_populates="zones")

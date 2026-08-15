from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.enums import ComplianceStatus, RiskTrend, pg_enum


class BiosecurityPassport(Base):
    __tablename__ = "biosecurity_passports"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    farm_id: Mapped[str] = mapped_column(String(64), ForeignKey("farms.id"), unique=True, nullable=False)
    hygiene_score: Mapped[int] = mapped_column(Integer, default=0)
    visitor_control_score: Mapped[int] = mapped_column(Integer, default=0)
    quarantine_protocol_score: Mapped[int] = mapped_column(Integer, default=0)
    waste_management_score: Mapped[int] = mapped_column(Integer, default=0)
    compliance_status: Mapped[ComplianceStatus] = mapped_column(
        pg_enum(ComplianceStatus), default=ComplianceStatus.ATTENTION_REQUIRED, nullable=False
    )
    risk_trend: Mapped[RiskTrend] = mapped_column(
        pg_enum(RiskTrend), default=RiskTrend.STABLE, nullable=False
    )
    passport_qr_code: Mapped[str] = mapped_column(String(128), nullable=False)
    issue_date: Mapped[date] = mapped_column(Date, nullable=False)
    last_inspection_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    farm: Mapped["Farm"] = relationship(back_populates="passport")


class BiosecurityAssessment(Base):
    __tablename__ = "biosecurity_assessments"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    farm_id: Mapped[str] = mapped_column(String(64), ForeignKey("farms.id"), nullable=False)
    overall_score: Mapped[int] = mapped_column(Integer, nullable=False)
    hygiene_score: Mapped[int] = mapped_column(Integer, default=0)
    visitor_control_score: Mapped[int] = mapped_column(Integer, default=0)
    quarantine_protocol_score: Mapped[int] = mapped_column(Integer, default=0)
    waste_management_score: Mapped[int] = mapped_column(Integer, default=0)
    assessed_by_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    farm: Mapped["Farm"] = relationship(back_populates="assessments")
    responses: Mapped[list["AssessmentResponse"]] = relationship(
        back_populates="assessment", cascade="all, delete-orphan"
    )


class AssessmentResponse(Base):
    __tablename__ = "assessment_responses"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    assessment_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("biosecurity_assessments.id"), nullable=False
    )
    question_id: Mapped[str] = mapped_column(String(64), nullable=False)
    answer: Mapped[str] = mapped_column(String(64), nullable=False)
    score: Mapped[int] = mapped_column(Integer, default=0)

    assessment: Mapped[BiosecurityAssessment] = relationship(back_populates="responses")

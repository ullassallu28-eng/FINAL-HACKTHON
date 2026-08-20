import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.enums import UserRole, pg_enum


class District(Base):
    __tablename__ = "districts"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    state: Mapped[str] = mapped_column(String(128), nullable=False, default="Jharkhand")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    users: Mapped[list["User"]] = relationship(back_populates="district")
    farms: Mapped[list["Farm"]] = relationship(back_populates="district")


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(pg_enum(UserRole), nullable=False)
    district_id: Mapped[str | None] = mapped_column(String(64), ForeignKey("districts.id"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    district: Mapped[District | None] = relationship(back_populates="users")
    farm_assignments: Mapped[list["UserFarmAssignment"]] = relationship(back_populates="user")
    reported_incidents: Mapped[list["Incident"]] = relationship(
        back_populates="reported_by_user", foreign_keys="Incident.reported_by_id"
    )
    verified_incidents: Mapped[list["Incident"]] = relationship(
        back_populates="verified_by_user", foreign_keys="Incident.verified_by_id"
    )


class UserFarmAssignment(Base):
    __tablename__ = "user_farm_assignments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    farm_id: Mapped[str] = mapped_column(String(64), ForeignKey("farms.id"), nullable=False)
    is_owner: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    user: Mapped[User] = relationship(back_populates="farm_assignments")
    farm: Mapped["Farm"] = relationship(back_populates="user_assignments")

"""
OTPRequest model — stores one-time passwords for farmer phone authentication.

Each record is created when /auth/otp/send is called and consumed (marked used)
when /auth/otp/verify successfully validates the code.

Security properties:
- OTP expires after OTP_TTL_SECONDS (default 600 = 10 minutes)
- OTP is marked used=True after first successful verification (prevents reuse)
- Only NUMERIC 6-digit codes are stored (never in JWT or frontend)
- Codes are compared with constant-time hmac.compare_digest to prevent timing attacks
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class OTPRequest(Base):
    __tablename__ = "otp_requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(16), nullable=False)
    used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

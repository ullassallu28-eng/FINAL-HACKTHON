"""Add otp_requests table for real phone OTP authentication

Revision ID: 003_otp_requests
Revises: 002_file_content_base64
Create Date: 2026-08-17

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "003_otp_requests"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "otp_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("phone", sa.String(32), nullable=False),
        sa.Column("code", sa.String(16), nullable=False),
        sa.Column("used", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_otp_requests_phone", "otp_requests", ["phone"])


def downgrade() -> None:
    op.drop_index("ix_otp_requests_phone", table_name="otp_requests")
    op.drop_table("otp_requests")

"""Add base64 file content for persistent media on Render.

Revision ID: 002_file_content
Revises: 001_initial_schema
Create Date: 2026-08-13
"""

from alembic import op
import sqlalchemy as sa

revision = "002_file_content"
down_revision = "001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("file_uploads", sa.Column("content_base64", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("file_uploads", "content_base64")

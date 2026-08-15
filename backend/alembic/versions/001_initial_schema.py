"""Initial schema

Revision ID: 001_initial
Revises:
Create Date: 2026-08-11
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "districts",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("state", sa.String(length=128), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "file_uploads",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("file_path", sa.String(length=512), nullable=False),
        sa.Column("file_url", sa.String(length=512), nullable=False),
        sa.Column("mime_type", sa.String(length=128), nullable=True),
        sa.Column("size_bytes", sa.Integer(), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "vet_facilities",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("owner", sa.String(length=255), nullable=False),
        sa.Column("contact", sa.String(length=64), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "spatial_zones",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("center_lat", sa.Float(), nullable=False),
        sa.Column("center_lng", sa.Float(), nullable=False),
        sa.Column("radius_km", sa.Float(), nullable=False),
        sa.Column("zone_type", sa.String(length=64), nullable=False),
        sa.Column("related_farm_id", sa.String(length=64), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=32), nullable=True),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("role", sa.Enum("farmer", "veterinarian", "officer", name="userrole"), nullable=False),
        sa.Column("district_id", sa.String(length=64), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["district_id"], ["districts.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_table(
        "farms",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("owner_name", sa.String(length=255), nullable=False),
        sa.Column("location", sa.Text(), nullable=False),
        sa.Column("farm_type", sa.Enum("poultry", "pig", "mixed", name="farmtype"), nullable=False),
        sa.Column("capacity", sa.Integer(), nullable=False),
        sa.Column("animal_count", sa.Integer(), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("biosecurity_score", sa.Integer(), nullable=False),
        sa.Column("previous_score", sa.Integer(), nullable=False),
        sa.Column("risk_level", sa.Enum("safe", "caution", "critical", name="risklevel"), nullable=False),
        sa.Column("compliance_rate", sa.Float(), nullable=False),
        sa.Column("vaccination_coverage", sa.Float(), nullable=False),
        sa.Column("visitors_today", sa.Integer(), nullable=False),
        sa.Column("vehicles_today", sa.Integer(), nullable=False),
        sa.Column("active_incidents", sa.Integer(), nullable=False),
        sa.Column("active_alerts", sa.Integer(), nullable=False),
        sa.Column("owner_phone", sa.String(length=32), nullable=True),
        sa.Column("registration_status", sa.Enum("pending", "registered", "suspended", name="registrationstatus"), nullable=False),
        sa.Column("district_id", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["district_id"], ["districts.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "notifications",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("target_role", sa.Enum("farmer", "veterinarian", "officer", name="userrole"), nullable=True),
        sa.Column("broadcast_all", sa.Boolean(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("notification_type", sa.Enum("incident", "risk", "verification", "corrective", "evidence", "inspection", name="notificationtype"), nullable=False),
        sa.Column("read", sa.Boolean(), nullable=False),
        sa.Column("action_url", sa.String(length=512), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "biosecurity_assessments",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("farm_id", sa.String(length=64), nullable=False),
        sa.Column("overall_score", sa.Integer(), nullable=False),
        sa.Column("hygiene_score", sa.Integer(), nullable=False),
        sa.Column("visitor_control_score", sa.Integer(), nullable=False),
        sa.Column("quarantine_protocol_score", sa.Integer(), nullable=False),
        sa.Column("waste_management_score", sa.Integer(), nullable=False),
        sa.Column("assessed_by_id", sa.String(length=64), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["farm_id"], ["farms.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "biosecurity_passports",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("farm_id", sa.String(length=64), nullable=False),
        sa.Column("hygiene_score", sa.Integer(), nullable=False),
        sa.Column("visitor_control_score", sa.Integer(), nullable=False),
        sa.Column("quarantine_protocol_score", sa.Integer(), nullable=False),
        sa.Column("waste_management_score", sa.Integer(), nullable=False),
        sa.Column("compliance_status", sa.Enum("Compliant", "Attention Required", "Non-Compliant", name="compliancestatus"), nullable=False),
        sa.Column("risk_trend", sa.Enum("improving", "stable", "deteriorating", name="risktrend"), nullable=False),
        sa.Column("passport_qr_code", sa.String(length=128), nullable=False),
        sa.Column("issue_date", sa.Date(), nullable=False),
        sa.Column("last_inspection_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["farm_id"], ["farms.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("farm_id"),
    )
    op.create_table(
        "checklist_items",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("farm_id", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("completed", sa.Boolean(), nullable=False),
        sa.Column("priority", sa.String(length=32), nullable=True),
        sa.ForeignKeyConstraint(["farm_id"], ["farms.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "corrective_actions",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("farm_id", sa.String(length=64), nullable=False),
        sa.Column("incident_id", sa.String(length=64), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("priority", sa.Enum("low", "medium", "high", "urgent", name="actionpriority"), nullable=False),
        sa.Column("assigned_person", sa.String(length=255), nullable=False),
        sa.Column("deadline", sa.Date(), nullable=False),
        sa.Column("status", sa.Enum("Pending", "In Progress", "Evidence Submitted", "Awaiting Verification", "Verified", "Closed", name="correctiveactionstatus"), nullable=False),
        sa.Column("evidence_required", sa.Boolean(), nullable=False),
        sa.Column("verification_status", sa.Enum("Unverified", "Verification Pending", "Verified", name="verificationstatus"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["farm_id"], ["farms.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "incidents",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("farm_id", sa.String(length=64), nullable=False),
        sa.Column("incident_type", sa.String(length=255), nullable=False),
        sa.Column("animal_type", sa.String(length=255), nullable=False),
        sa.Column("number_affected", sa.Integer(), nullable=False),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("location", sa.String(length=255), nullable=False),
        sa.Column("status", sa.Enum("Reported", "Under Review", "Verified", "More Info Required", "Rejected", name="incidentstatus"), nullable=False),
        sa.Column("severity", sa.Enum("low", "medium", "high", "critical", name="incidentseverity"), nullable=False),
        sa.Column("veterinarian_notes", sa.Text(), nullable=True),
        sa.Column("requested_info_notes", sa.Text(), nullable=True),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("verified_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("verified_by_name", sa.String(length=255), nullable=True),
        sa.Column("reported_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["farm_id"], ["farms.id"]),
        sa.ForeignKeyConstraint(["reported_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["verified_by_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "inspections",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("farm_id", sa.String(length=64), nullable=False),
        sa.Column("inspector_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("inspector_name", sa.String(length=255), nullable=False),
        sa.Column("inspection_date", sa.Date(), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("result", sa.Enum("Passed", "Conditional Pass", "Needs Improvement", name="inspectionresult"), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", sa.Enum("scheduled", "completed", "cancelled", name="inspectionstatus"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["farm_id"], ["farms.id"]),
        sa.ForeignKeyConstraint(["inspector_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "risk_factors",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("farm_id", sa.String(length=64), nullable=False),
        sa.Column("label", sa.String(length=255), nullable=False),
        sa.Column("delta", sa.Integer(), nullable=False),
        sa.Column("category", sa.Enum("incident", "mortality", "sanitation", "visitor", "environment", name="riskfactorcategory"), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["farm_id"], ["farms.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "risk_score_history",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("farm_id", sa.String(length=64), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["farm_id"], ["farms.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "user_farm_assignments",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("farm_id", sa.String(length=64), nullable=False),
        sa.Column("is_owner", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["farm_id"], ["farms.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "zones",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("farm_id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("zone_type", sa.String(length=64), nullable=False),
        sa.Column("risk_score", sa.Integer(), nullable=False),
        sa.Column("risk_level", sa.Enum("safe", "caution", "critical", name="risklevel"), nullable=False),
        sa.Column("compliance_rate", sa.Float(), nullable=False),
        sa.Column("animal_count", sa.Integer(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("last_inspection", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["farm_id"], ["farms.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "action_evidence",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("action_id", sa.String(length=64), nullable=False),
        sa.Column("file_url", sa.String(length=512), nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("location", sa.String(length=255), nullable=True),
        sa.Column("captured_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["action_id"], ["corrective_actions.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("action_id"),
    )
    op.create_table(
        "assessment_responses",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("assessment_id", sa.String(length=64), nullable=False),
        sa.Column("question_id", sa.String(length=64), nullable=False),
        sa.Column("answer", sa.String(length=64), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["assessment_id"], ["biosecurity_assessments.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "health_records",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("farm_id", sa.String(length=64), nullable=False),
        sa.Column("animal_type", sa.String(length=255), nullable=False),
        sa.Column("batch_name", sa.String(length=255), nullable=True),
        sa.Column("zone_id", sa.String(length=64), nullable=True),
        sa.Column("health_status", sa.String(length=128), nullable=False),
        sa.Column("mortality_count", sa.Integer(), nullable=False),
        sa.Column("morbidity_count", sa.Integer(), nullable=False),
        sa.Column("vaccination_date", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("recorded_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["farm_id"], ["farms.id"]),
        sa.ForeignKeyConstraint(["zone_id"], ["zones.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "incident_evidence_files",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("incident_id", sa.String(length=64), nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("file_url", sa.String(length=512), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["incident_id"], ["incidents.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_foreign_key(None, "corrective_actions", "incidents", ["incident_id"], ["id"])


def downgrade() -> None:
    op.drop_table("incident_evidence_files")
    op.drop_table("health_records")
    op.drop_table("assessment_responses")
    op.drop_table("action_evidence")
    op.drop_table("zones")
    op.drop_table("user_farm_assignments")
    op.drop_table("risk_score_history")
    op.drop_table("risk_factors")
    op.drop_table("inspections")
    op.drop_table("incidents")
    op.drop_table("corrective_actions")
    op.drop_table("checklist_items")
    op.drop_table("biosecurity_passports")
    op.drop_table("biosecurity_assessments")
    op.drop_table("notifications")
    op.drop_table("farms")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
    op.drop_table("spatial_zones")
    op.drop_table("vet_facilities")
    op.drop_table("file_uploads")
    op.drop_table("districts")
    sa.Enum(name="userrole").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="farmtype").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="risklevel").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="registrationstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="notificationtype").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="compliancestatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="risktrend").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="actionpriority").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="correctiveactionstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="verificationstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="incidentstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="incidentseverity").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="inspectionresult").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="inspectionstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="riskfactorcategory").drop(op.get_bind(), checkfirst=True)

import enum

from sqlalchemy import Enum as SAEnum


def pg_enum(enum_cls: type[enum.Enum], **kwargs) -> SAEnum:
    """Map Python enums to PostgreSQL enum values (not member names)."""
    return SAEnum(
        enum_cls,
        values_callable=lambda members: [member.value for member in members],
        **kwargs,
    )


class UserRole(str, enum.Enum):
    FARMER = "farmer"
    VETERINARIAN = "veterinarian"
    OFFICER = "officer"


class FarmType(str, enum.Enum):
    POULTRY = "poultry"
    PIG = "pig"
    MIXED = "mixed"


class RiskLevel(str, enum.Enum):
    SAFE = "safe"
    CAUTION = "caution"
    CRITICAL = "critical"


class RegistrationStatus(str, enum.Enum):
    PENDING = "pending"
    REGISTERED = "registered"
    SUSPENDED = "suspended"


class ComplianceStatus(str, enum.Enum):
    COMPLIANT = "Compliant"
    ATTENTION_REQUIRED = "Attention Required"
    NON_COMPLIANT = "Non-Compliant"


class RiskTrend(str, enum.Enum):
    IMPROVING = "improving"
    STABLE = "stable"
    DETERIORATING = "deteriorating"


class IncidentStatus(str, enum.Enum):
    REPORTED = "Reported"
    UNDER_REVIEW = "Under Review"
    VERIFIED = "Verified"
    MORE_INFO_REQUIRED = "More Info Required"
    REJECTED = "Rejected"


class IncidentSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class CorrectiveActionStatus(str, enum.Enum):
    PENDING = "Pending"
    IN_PROGRESS = "In Progress"
    EVIDENCE_SUBMITTED = "Evidence Submitted"
    AWAITING_VERIFICATION = "Awaiting Verification"
    VERIFIED = "Verified"
    CLOSED = "Closed"


class ActionPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class VerificationStatus(str, enum.Enum):
    UNVERIFIED = "Unverified"
    VERIFICATION_PENDING = "Verification Pending"
    VERIFIED = "Verified"


class RiskFactorCategory(str, enum.Enum):
    INCIDENT = "incident"
    MORTALITY = "mortality"
    SANITATION = "sanitation"
    VISITOR = "visitor"
    ENVIRONMENT = "environment"


class NotificationType(str, enum.Enum):
    INCIDENT = "incident"
    RISK = "risk"
    VERIFICATION = "verification"
    CORRECTIVE = "corrective"
    EVIDENCE = "evidence"
    INSPECTION = "inspection"


class InspectionResult(str, enum.Enum):
    PASSED = "Passed"
    CONDITIONAL_PASS = "Conditional Pass"
    NEEDS_IMPROVEMENT = "Needs Improvement"


class InspectionStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ZoneType(str, enum.Enum):
    SHED = "shed"
    ISOLATION = "isolation"
    ENTRY_GATE = "entry_gate"
    DISINFECTION = "disinfection"
    FEED_STORAGE = "feed_storage"
    RESTRICTED = "restricted"
    WATER = "water"
    OFFICE = "office"

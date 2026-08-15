from datetime import datetime, timezone
import math
import uuid

from app.models.enums import IncidentSeverity, IncidentStatus, RiskLevel


def generate_id(prefix: str, year: int | None = None) -> str:
    year = year or datetime.now(timezone.utc).year
    suffix = uuid.uuid4().hex[:6].upper()
    return f"{prefix}-{year}-{suffix}"


def farm_risk_level(score: int) -> RiskLevel:
    if score >= 70:
        return RiskLevel.SAFE
    if score >= 40:
        return RiskLevel.CAUTION
    return RiskLevel.CRITICAL


def clamp_score(value: int) -> int:
    return max(0, min(100, value))


def incident_severity(number_affected: int) -> IncidentSeverity:
    if number_affected > 50:
        return IncidentSeverity.CRITICAL
    if number_affected > 20:
        return IncidentSeverity.HIGH
    if number_affected > 5:
        return IncidentSeverity.MEDIUM
    return IncidentSeverity.LOW


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlng / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def format_relative_time(dt: datetime) -> str:
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    delta = now - dt
    seconds = int(delta.total_seconds())
    if seconds < 60:
        return "Just now"
    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes} mins ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours} hours ago"
    days = hours // 24
    return f"{days} days ago"


OPEN_INCIDENT_STATUSES = {
    IncidentStatus.REPORTED,
    IncidentStatus.UNDER_REVIEW,
    IncidentStatus.MORE_INFO_REQUIRED,
}

OPEN_ACTION_STATUSES = {
    "Pending",
    "In Progress",
    "Evidence Submitted",
    "Awaiting Verification",
}

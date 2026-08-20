"""System-suggested biosecurity actions keyed by incident type keywords."""

from dataclasses import dataclass


@dataclass(frozen=True)
class RecommendedActionTemplate:
    key: str
    title: str
    description: str
    priority: str
    evidence_required: bool = True


DEFAULT_TEMPLATES: list[RecommendedActionTemplate] = [
    RecommendedActionTemplate(
        key="disinfection",
        title="Strengthen Entry Disinfection",
        description="Apply approved disinfectant at all entry points and vehicle wheels.",
        priority="high",
    ),
    RecommendedActionTemplate(
        key="visitors",
        title="Restrict Non-Essential Visitors",
        description="Suspend non-essential farm visits until corrective actions are verified.",
        priority="high",
    ),
    RecommendedActionTemplate(
        key="isolate",
        title="Isolate Affected Animals/Batch",
        description="Segregate affected animals and restrict cross-shed movement.",
        priority="urgent",
    ),
    RecommendedActionTemplate(
        key="movement",
        title="Review Recent Animal Movement",
        description="Audit inward/outward movement logs for the last 14 days.",
        priority="medium",
    ),
    RecommendedActionTemplate(
        key="inspection",
        title="Schedule Follow-Up Inspection",
        description="Prepare farm for veterinary follow-up inspection within 72 hours.",
        priority="medium",
        evidence_required=False,
    ),
    RecommendedActionTemplate(
        key="sanitation",
        title="Strengthen Shed Sanitation",
        description="Complete deep cleaning and disinfection of affected zones.",
        priority="high",
    ),
    RecommendedActionTemplate(
        key="quarantine",
        title="Review Quarantine Procedures",
        description="Verify quarantine protocol compliance for new stock and returning equipment.",
        priority="medium",
    ),
]

INCIDENT_TYPE_OVERRIDES: dict[str, list[str]] = {
    "mortality": ["isolate", "sanitation", "movement", "disinfection"],
    "death": ["isolate", "sanitation", "movement", "disinfection"],
    "respiratory": ["isolate", "quarantine", "visitors", "sanitation"],
    "visitor": ["visitors", "disinfection", "movement"],
    "sanitation": ["sanitation", "disinfection", "inspection"],
    "outbreak": ["isolate", "disinfection", "visitors", "quarantine", "inspection"],
}


def recommended_for_incident(incident_type: str) -> list[RecommendedActionTemplate]:
    normalized = incident_type.lower()
    keys: list[str] | None = None
    for keyword, template_keys in INCIDENT_TYPE_OVERRIDES.items():
        if keyword in normalized:
            keys = template_keys
            break
    if not keys:
        keys = ["disinfection", "visitors", "isolate", "sanitation", "movement"]

    by_key = {t.key: t for t in DEFAULT_TEMPLATES}
    return [by_key[k] for k in keys if k in by_key]

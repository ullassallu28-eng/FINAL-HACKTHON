from pydantic import Field

from app.schemas.common import CamelModel


class SubmittedEvidence(CamelModel):
    file_url: str = Field(serialization_alias="fileUrl")
    file_name: str = Field(serialization_alias="fileName")
    timestamp: str
    location: str
    notes: str


class CorrectiveActionResponse(CamelModel):
    id: str
    farm_id: str = Field(serialization_alias="farmId")
    farm_name: str = Field(serialization_alias="farmName")
    incident_id: str | None = Field(default=None, serialization_alias="incidentId")
    title: str
    description: str
    priority: str
    assigned_person: str = Field(serialization_alias="assignedPerson")
    deadline: str
    created_at: str = Field(serialization_alias="createdAt")
    status: str
    evidence_required: bool = Field(serialization_alias="evidenceRequired")
    verification_status: str = Field(serialization_alias="verificationStatus")
    submitted_evidence: SubmittedEvidence | None = Field(default=None, serialization_alias="submittedEvidence")
    source: str = "general"
    evidence_analysis: dict | None = Field(default=None, serialization_alias="evidenceAnalysis")


class EvidenceAnalysisResponse(CamelModel):
    summary: str
    observations: list[str]
    recommended_actions: list[dict] = Field(serialization_alias="recommendedActions")
    analysis_method: str = Field(serialization_alias="analysisMethod")
    relevance_level: str = Field(default="uncertain", serialization_alias="relevanceLevel")
    relevance_score: int = Field(default=0, serialization_alias="relevanceScore")
    farm_related: bool = Field(default=False, serialization_alias="farmRelated")
    image_assessment: dict | None = Field(default=None, serialization_alias="imageAssessment")
    completeness: str | None = None
    disclaimer: str


class CorrectiveActionCreate(CamelModel):
    farm_id: str = Field(alias="farmId")
    incident_id: str | None = Field(default=None, alias="incidentId")
    title: str
    description: str
    priority: str = "medium"
    assigned_person: str = Field(alias="assignedPerson")
    deadline: str
    evidence_required: bool = Field(default=True, alias="evidenceRequired")


class ActionVerifyRequest(CamelModel):
    approved: bool
    notes: str | None = None

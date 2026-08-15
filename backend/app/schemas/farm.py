from datetime import date, datetime

from pydantic import Field

from app.schemas.common import CamelModel, Coordinates


class FarmResponse(CamelModel):
    id: str
    name: str
    location: str
    owner: str = Field(validation_alias="owner_name", serialization_alias="owner")
    farm_type: str = Field(serialization_alias="farmType")
    capacity: int
    animal_count: int = Field(serialization_alias="animalCount")
    biosecurity_score: int = Field(serialization_alias="biosecurityScore")
    previous_score: int = Field(serialization_alias="previousScore")
    risk_level: str = Field(serialization_alias="riskLevel")
    visitors_today: int = Field(serialization_alias="visitorsToday")
    vehicles_today: int = Field(serialization_alias="vehiclesToday")
    compliance_rate: float = Field(serialization_alias="complianceRate")
    vaccination_coverage: float = Field(serialization_alias="vaccinationCoverage")
    active_incidents: int = Field(serialization_alias="activeIncidents")
    active_alerts: int = Field(serialization_alias="activeAlerts")
    updated_at: datetime = Field(serialization_alias="updatedAt")
    coordinates: Coordinates | None = None


class FarmCreate(CamelModel):
    name: str
    location: str
    farm_type: str = Field(alias="farmType")
    capacity: int
    animal_count: int = Field(default=0, alias="animalCount")
    coordinates: Coordinates | None = None
    owner_name: str = Field(alias="ownerName")
    owner_email: str | None = Field(default=None, alias="ownerEmail")
    owner_phone: str | None = Field(default=None, alias="ownerPhone")
    district_id: str | None = Field(default=None, alias="districtId")


class FarmUpdate(CamelModel):
    name: str | None = None
    location: str | None = None
    capacity: int | None = None
    animal_count: int | None = Field(default=None, alias="animalCount")
    owner_phone: str | None = Field(default=None, alias="ownerPhone")


class InspectionHistoryItem(CamelModel):
    id: str
    date: str
    inspector_name: str = Field(serialization_alias="inspectorName")
    result: str
    notes: str


class BiosecurityPassportResponse(CamelModel):
    farm_id: str = Field(serialization_alias="farmId")
    farm_name: str = Field(serialization_alias="farmName")
    farm_type: str = Field(serialization_alias="farmType")
    owner_name: str = Field(serialization_alias="ownerName")
    location: str
    capacity: int
    animal_count: int = Field(serialization_alias="animalCount")
    biosecurity_score: int = Field(serialization_alias="biosecurityScore")
    hygiene_score: int = Field(serialization_alias="hygieneScore")
    visitor_control_score: int = Field(serialization_alias="visitorControlScore")
    quarantine_protocol_score: int = Field(serialization_alias="quarantineProtocolScore")
    vaccination_coverage: float = Field(serialization_alias="vaccinationCoverage")
    waste_management_score: int = Field(serialization_alias="wasteManagementScore")
    last_inspection_date: str = Field(serialization_alias="lastInspectionDate")
    inspection_history: list[InspectionHistoryItem] = Field(serialization_alias="inspectionHistory")
    compliance_status: str = Field(serialization_alias="complianceStatus")
    risk_trend: str = Field(serialization_alias="riskTrend")
    passport_qr_code: str = Field(serialization_alias="passportQrCode")
    issue_date: str = Field(serialization_alias="issueDate")


class AssessmentQuestionResponse(CamelModel):
    question_id: str = Field(serialization_alias="questionId")
    answer: str
    score: int


class AssessmentCreate(CamelModel):
    responses: list[AssessmentQuestionResponse]
    notes: str | None = None


class AssessmentResponseOut(CamelModel):
    assessment_id: str = Field(serialization_alias="assessmentId")
    farm_id: str = Field(serialization_alias="farmId")
    overall_score: int = Field(serialization_alias="overallScore")
    component_scores: dict[str, int] = Field(serialization_alias="componentScores")
    passport_updated: bool = Field(serialization_alias="passportUpdated")


class ChecklistItemResponse(CamelModel):
    id: str
    title: str
    completed: bool
    priority: str | None = None


class ChecklistUpdate(CamelModel):
    completed: bool

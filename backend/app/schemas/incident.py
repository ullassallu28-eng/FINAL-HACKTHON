from pydantic import Field

from app.schemas.common import CamelModel


class EvidenceFileResponse(CamelModel):
    name: str
    url: str
    timestamp: str


class IncidentResponse(CamelModel):
    id: str
    farm_id: str = Field(serialization_alias="farmId")
    farm_name: str = Field(serialization_alias="farmName")
    farm_type: str = Field(serialization_alias="farmType")
    incident_type: str = Field(serialization_alias="incidentType")
    animal_type: str = Field(serialization_alias="animalType")
    number_affected: int = Field(serialization_alias="numberAffected")
    date_time: str = Field(serialization_alias="dateTime")
    description: str
    location: str
    evidence_files: list[EvidenceFileResponse] = Field(serialization_alias="evidenceFiles")
    status: str
    severity: str
    veterinarian_notes: str | None = Field(default=None, serialization_alias="veterinarianNotes")
    requested_info_notes: str | None = Field(default=None, serialization_alias="requestedInfoNotes")
    verified_at: str | None = Field(default=None, serialization_alias="verifiedAt")
    verified_by: str | None = Field(default=None, serialization_alias="verifiedBy")


class IncidentCreate(CamelModel):
    farm_id: str = Field(alias="farmId")
    incident_type: str = Field(alias="incidentType")
    animal_type: str = Field(alias="animalType")
    number_affected: int = Field(alias="numberAffected")
    date_time: str = Field(alias="dateTime")
    description: str
    location: str


class IncidentVerifyRequest(CamelModel):
    action: str
    notes: str | None = None

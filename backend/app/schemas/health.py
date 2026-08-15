from pydantic import Field

from app.schemas.common import CamelModel


class HealthRecordCreate(CamelModel):
    animal_type: str = Field(alias="animalType")
    batch_name: str | None = Field(default=None, alias="batchName")
    zone_id: str | None = Field(default=None, alias="zoneId")
    health_status: str = Field(alias="healthStatus")
    mortality_count: int = Field(default=0, alias="mortalityCount")
    morbidity_count: int = Field(default=0, alias="morbidityCount")
    vaccination_date: str | None = Field(default=None, alias="vaccinationDate")
    notes: str | None = None


class HealthRecordResponse(CamelModel):
    id: str
    farm_id: str = Field(serialization_alias="farmId")
    animal_type: str = Field(serialization_alias="animalType")
    batch_name: str | None = Field(default=None, serialization_alias="batchName")
    zone_id: str | None = Field(default=None, serialization_alias="zoneId")
    health_status: str = Field(serialization_alias="healthStatus")
    mortality_count: int = Field(serialization_alias="mortalityCount")
    morbidity_count: int = Field(serialization_alias="morbidityCount")
    vaccination_date: str | None = Field(default=None, serialization_alias="vaccinationDate")
    notes: str | None = None
    recorded_at: str = Field(serialization_alias="recordedAt")

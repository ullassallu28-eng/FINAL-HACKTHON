from pydantic import Field

from app.schemas.common import CamelModel


class GisMapNodeResponse(CamelModel):
    id: str
    name: str
    farm_type: str = Field(serialization_alias="farmType")
    risk_level: str = Field(serialization_alias="riskLevel")
    score: int
    lat: float
    lng: float
    active_incidents: int = Field(serialization_alias="activeIncidents")
    owner: str
    contact: str
    last_inspection: str = Field(serialization_alias="lastInspection")


class ContainmentZone(CamelModel):
    id: str
    center_lat: float = Field(serialization_alias="centerLat")
    center_lng: float = Field(serialization_alias="centerLng")
    radius_km: float = Field(serialization_alias="radiusKm")
    reason: str
    active: bool


class SpatialRiskResponse(CamelModel):
    center_farm_id: str = Field(serialization_alias="centerFarmId")
    radius_km: float = Field(serialization_alias="radiusKm")
    nearby_incidents: int = Field(serialization_alias="nearbyIncidents")
    nearby_high_risk_farms: int = Field(serialization_alias="nearbyHighRiskFarms")
    containment_zones: list[ContainmentZone] = Field(serialization_alias="containmentZones")
    regional_context: str = Field(serialization_alias="regionalContext")

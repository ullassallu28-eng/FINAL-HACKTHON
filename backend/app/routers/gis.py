from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_optional_user
from app.database.session import get_db
from app.models.enums import UserRole
from app.models.spatial import VetFacility
from app.models.user import User
from app.schemas.gis import GisMapNodeResponse, SpatialRiskResponse
from app.services.officer_service import GisService
from app.utils.serializers import gis_node_from_farm

router = APIRouter(prefix="/gis", tags=["GIS"])


@router.get("/nodes", response_model=list[GisMapNodeResponse])
def get_gis_nodes(
    farm_type: str | None = Query(default=None, alias="farmType"),
    risk_level: str | None = Query(default=None, alias="riskLevel"),
    db: Session = Depends(get_db),
    current_user: Annotated[User | None, Depends(get_optional_user)] = None,
):
    district_id = None
    if current_user and current_user.role == UserRole.VETERINARIAN and current_user.district_id:
        district_id = current_user.district_id
    nodes = GisService.get_map_nodes(db, farm_type, risk_level, district_id)
    result = []
    for node in nodes:
        if "farm" in node:
            result.append(gis_node_from_farm(node["farm"], node["last_inspection"]))
        elif "vet" in node:
            vet: VetFacility = node["vet"]
            result.append(
                GisMapNodeResponse(
                    id=vet.id,
                    name=vet.name,
                    farm_type="mixed",
                    risk_level="safe",
                    score=100,
                    lat=vet.latitude,
                    lng=vet.longitude,
                    active_incidents=0,
                    owner=vet.owner,
                    contact=vet.contact,
                    last_inspection="N/A",
                )
            )
    return result


@router.get("/spatial-risk", response_model=SpatialRiskResponse)
def spatial_risk(
    farm_id: str = Query(alias="farmId"),
    radius_km: float = Query(default=15.0, alias="radiusKm"),
    db: Session = Depends(get_db),
    current_user: Annotated[User | None, Depends(get_optional_user)] = None,
):
    return GisService.spatial_risk(db, farm_id, radius_km)

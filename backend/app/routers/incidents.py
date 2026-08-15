from typing import Annotated

from fastapi import APIRouter, Depends, Query, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.core.dependencies import get_optional_user, require_roles
from app.database.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.action_plan import (
    ActionPlanSendRequest,
    ActionPlanSendResponse,
    RecommendedActionResponse,
)
from app.schemas.incident import IncidentCreate, IncidentResponse, IncidentVerifyRequest
from app.services.action_plan_service import ActionPlanService
from app.services.file_service import save_upload_file
from app.services.incident_service import IncidentService
from app.utils.serializers import incident_to_response

router = APIRouter(prefix="/incidents", tags=["Incidents"])


@router.get("", response_model=list[IncidentResponse])
def list_incidents(
    farm_id: str | None = Query(default=None, alias="farmId"),
    db: Session = Depends(get_db),
    current_user: Annotated[User | None, Depends(get_optional_user)] = None,
):
    incidents = IncidentService.list_incidents(db, farm_id, current_user)
    return [incident_to_response(i, db) for i in incidents]


@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(
    incident_id: str,
    db: Session = Depends(get_db),
    current_user: Annotated[User | None, Depends(get_optional_user)] = None,
):
    incident = IncidentService.get_incident(db, incident_id, current_user)
    return incident_to_response(incident, db)


@router.post("", response_model=IncidentResponse, status_code=201)
async def create_incident(
    db: Session = Depends(get_db),
    current_user: Annotated[User | None, Depends(get_optional_user)] = None,
    farm_id: str = Form(...),
    incident_type: str = Form(...),
    animal_type: str = Form(...),
    number_affected: int = Form(...),
    date_time: str = Form(...),
    description: str = Form(...),
    location: str = Form(...),
    evidence: UploadFile | None = File(default=None),
):
    payload = IncidentCreate(
        farmId=farm_id,
        incidentType=incident_type,
        animalType=animal_type,
        numberAffected=number_affected,
        dateTime=date_time,
        description=description,
        location=location,
    )
    evidence_records = []
    if evidence and evidence.filename:
        record = await save_upload_file(db, evidence)
        evidence_records.append(record)

    incident = IncidentService.create_incident(db, payload, current_user, evidence_records)
    return incident_to_response(incident, db)


@router.post("/json", response_model=IncidentResponse, status_code=201)
def create_incident_json(
    payload: IncidentCreate,
    db: Session = Depends(get_db),
    current_user: Annotated[User | None, Depends(get_optional_user)] = None,
):
    incident = IncidentService.create_incident(db, payload, current_user)
    return incident_to_response(incident, db)


@router.post("/{incident_id}/verify", response_model=IncidentResponse)
def verify_incident(
    incident_id: str,
    payload: IncidentVerifyRequest,
    db: Session = Depends(get_db),
    current_user: Annotated[User | None, Depends(require_roles(UserRole.VETERINARIAN, UserRole.OFFICER))] = None,
):
    incident = IncidentService.verify_incident(db, incident_id, payload, current_user)
    return incident_to_response(incident, db)


@router.get("/{incident_id}/recommended-actions", response_model=list[RecommendedActionResponse])
def get_recommended_actions(
    incident_id: str,
    db: Session = Depends(get_db),
    current_user: Annotated[User | None, Depends(require_roles(UserRole.VETERINARIAN, UserRole.OFFICER))] = None,
):
    return ActionPlanService.get_recommended(db, incident_id, current_user)


@router.post("/{incident_id}/action-plan", response_model=ActionPlanSendResponse)
def send_action_plan(
    incident_id: str,
    payload: ActionPlanSendRequest,
    db: Session = Depends(get_db),
    current_user: Annotated[User | None, Depends(require_roles(UserRole.VETERINARIAN, UserRole.OFFICER))] = None,
):
    created, count = ActionPlanService.send_plan(db, incident_id, payload, current_user)
    return ActionPlanSendResponse(
        incident_id=incident_id,
        actions_created=count,
        action_ids=[a.id for a in created],
    )

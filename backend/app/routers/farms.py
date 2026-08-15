from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_optional_user, require_roles
from app.database.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.farm import (
    AssessmentCreate,
    BiosecurityPassportResponse,
    ChecklistItemResponse,
    ChecklistUpdate,
    FarmCreate,
    FarmResponse,
    FarmUpdate,
)
from app.services.farm_service import FarmService
from app.services.health_service import ChecklistService
from app.services.passport_service import PassportService
from app.services.risk_service import RiskEngine
from app.utils.serializers import farm_to_response, passport_to_response

router = APIRouter(prefix="/farms", tags=["Farms"])


@router.get("", response_model=list[FarmResponse])
def list_farms(
    db: Session = Depends(get_db),
    current_user: Annotated[User | None, Depends(get_optional_user)] = None,
):
    farms = FarmService.list_farms(db, current_user)
    for farm in farms:
        RiskEngine.recalculate_farm(db, farm)
    db.commit()
    for farm in farms:
        db.refresh(farm)
    return [farm_to_response(f) for f in farms]


@router.post("", response_model=FarmResponse, status_code=201)
def create_farm(
    payload: FarmCreate,
    db: Session = Depends(get_db),
    current_user: Annotated[User, Depends(require_roles(UserRole.FARMER, UserRole.OFFICER))] = None,
):
    farm = FarmService.create_farm(db, payload, current_user)
    return farm_to_response(farm)


@router.get("/{farm_id}", response_model=FarmResponse)
def get_farm(
    farm_id: str,
    db: Session = Depends(get_db),
    current_user: Annotated[User | None, Depends(get_optional_user)] = None,
):
    farm = FarmService.get_farm(db, farm_id, current_user)
    RiskEngine.recalculate_farm(db, farm)
    db.commit()
    db.refresh(farm)
    return farm_to_response(farm)


@router.patch("/{farm_id}", response_model=FarmResponse)
def update_farm(
    farm_id: str,
    payload: FarmUpdate,
    db: Session = Depends(get_db),
    current_user: Annotated[User, Depends(get_current_user)] = None,
):
    farm = FarmService.update_farm(db, farm_id, payload, current_user)
    return farm_to_response(farm)


@router.get("/{farm_id}/passport", response_model=BiosecurityPassportResponse)
def get_passport(
    farm_id: str,
    db: Session = Depends(get_db),
    current_user: Annotated[User | None, Depends(get_optional_user)] = None,
):
    farm, passport, history = PassportService.get_passport(db, farm_id, current_user)
    return passport_to_response(farm, passport, history)


@router.post("/{farm_id}/assessments")
def submit_assessment(
    farm_id: str,
    payload: AssessmentCreate,
    db: Session = Depends(get_db),
    current_user: Annotated[User, Depends(require_roles(UserRole.VETERINARIAN, UserRole.OFFICER))] = None,
):
    return PassportService.submit_assessment(db, farm_id, payload, current_user)


@router.get("/{farm_id}/checklist", response_model=list[ChecklistItemResponse])
def get_checklist(
    farm_id: str,
    db: Session = Depends(get_db),
    current_user: Annotated[User | None, Depends(get_optional_user)] = None,
):
    items = ChecklistService.list_items(db, farm_id, current_user)
    return [
        ChecklistItemResponse(id=i.id, title=i.title, completed=i.completed, priority=i.priority)
        for i in items
    ]


@router.patch("/{farm_id}/checklist/{item_id}", response_model=ChecklistItemResponse)
def update_checklist_item(
    farm_id: str,
    item_id: str,
    payload: ChecklistUpdate,
    db: Session = Depends(get_db),
    current_user: Annotated[User, Depends(require_roles(UserRole.FARMER))] = None,
):
    item = ChecklistService.update_item(db, farm_id, item_id, payload.completed, current_user)
    return ChecklistItemResponse(id=item.id, title=item.title, completed=item.completed, priority=item.priority)

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_optional_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.risk import RiskFactorResponse, RiskHistoryPoint, RiskSummaryResponse, ScoreTimelineEvent, ScoreTimelineEvent
from app.services.farm_service import FarmService
from app.services.risk_service import RiskEngine
from app.utils.serializers import risk_factor_to_response, risk_history_to_response

router = APIRouter(prefix="/risk", tags=["Risk Analytics"])


@router.get("/factors", response_model=list[RiskFactorResponse])
def get_risk_factors(
    farm_id: str | None = Query(default=None, alias="farmId"),
    db: Session = Depends(get_db),
    current_user: Annotated[User | None, Depends(get_optional_user)] = None,
):
    if farm_id:
        farm = FarmService.get_farm(db, farm_id, current_user)
        RiskEngine.recalculate_farm(db, farm)
        db.commit()
    factors = RiskEngine.get_factors(db, farm_id)
    return [risk_factor_to_response(f) for f in factors]


@router.get("/farms/{farm_id}/history", response_model=list[RiskHistoryPoint])
def get_risk_history(
    farm_id: str,
    days: int = Query(default=7, ge=1, le=90),
    db: Session = Depends(get_db),
    current_user: Annotated[User | None, Depends(get_optional_user)] = None,
):
    FarmService.get_farm(db, farm_id, current_user)
    history = RiskEngine.get_history(db, farm_id, days)
    return [risk_history_to_response(h) for h in history]


@router.get("/farms/{farm_id}/summary", response_model=RiskSummaryResponse)
def get_risk_summary(
    farm_id: str,
    db: Session = Depends(get_db),
    current_user: Annotated[User | None, Depends(get_optional_user)] = None,
):
    farm = FarmService.get_farm(db, farm_id, current_user)
    RiskEngine.recalculate_farm(db, farm)
    db.commit()
    db.refresh(farm)
    return RiskEngine.get_summary(db, farm)


@router.get("/farms/{farm_id}/timeline", response_model=list[ScoreTimelineEvent])
def get_score_timeline(
    farm_id: str,
    days: int = Query(default=30, ge=1, le=90),
    db: Session = Depends(get_db),
    current_user: Annotated[User | None, Depends(get_optional_user)] = None,
):
    FarmService.get_farm(db, farm_id, current_user)
    return RiskEngine.get_score_timeline(db, farm_id, days)


@router.post("/farms/{farm_id}/recalculate", response_model=RiskSummaryResponse)
def recalculate_risk(
    farm_id: str,
    db: Session = Depends(get_db),
    current_user: Annotated[User | None, Depends(get_optional_user)] = None,
):
    farm = FarmService.get_farm(db, farm_id, current_user)
    RiskEngine.recalculate_farm(db, farm)
    db.commit()
    db.refresh(farm)
    return RiskEngine.get_summary(db, farm)

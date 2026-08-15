from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_optional_user, require_roles
from app.database.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.corrective_action import (
    ActionVerifyRequest,
    CorrectiveActionCreate,
    CorrectiveActionResponse,
    EvidenceAnalysisResponse,
    SubmittedEvidence,
)
from app.services.corrective_action_service import CorrectiveActionService
from app.services.file_service import save_upload_file
from app.utils.serializers import action_to_response, evidence_to_submitted

router = APIRouter(prefix="/corrective-actions", tags=["Corrective Actions"])


@router.get("/awaiting-verification", response_model=list[CorrectiveActionResponse])
def list_awaiting_verification(
    db: Session = Depends(get_db),
    current_user: Annotated[User | None, Depends(require_roles(UserRole.VETERINARIAN, UserRole.OFFICER))] = None,
):
    actions = CorrectiveActionService.list_awaiting_evidence(db, current_user)
    return [action_to_response(a, db, include_analysis=True) for a in actions]


@router.get("", response_model=list[CorrectiveActionResponse])
def list_actions(
    farm_id: str | None = Query(default=None, alias="farmId"),
    db: Session = Depends(get_db),
    current_user: Annotated[User | None, Depends(get_optional_user)] = None,
):
    actions = CorrectiveActionService.list_actions(db, farm_id, current_user)
    return [action_to_response(a, db) for a in actions]


@router.post("", response_model=CorrectiveActionResponse, status_code=201)
def create_action(
    payload: CorrectiveActionCreate,
    db: Session = Depends(get_db),
    current_user: Annotated[User | None, Depends(require_roles(UserRole.VETERINARIAN, UserRole.OFFICER))] = None,
):
    action = CorrectiveActionService.create_action(db, payload, current_user)
    return action_to_response(action, db)


@router.get("/{action_id}", response_model=CorrectiveActionResponse)
def get_action(
    action_id: str,
    db: Session = Depends(get_db),
    current_user: Annotated[User | None, Depends(get_optional_user)] = None,
):
    action = CorrectiveActionService.get_action(db, action_id, current_user)
    return action_to_response(action, db, include_analysis=True)


@router.get("/{action_id}/submitted-evidence", response_model=SubmittedEvidence)
def get_submitted_evidence(
    action_id: str,
    db: Session = Depends(get_db),
    current_user: Annotated[User | None, Depends(require_roles(UserRole.VETERINARIAN, UserRole.OFFICER, UserRole.FARMER))] = None,
):
    """Return only the farmer's Corrective Actions upload — never incident report media."""
    evidence = CorrectiveActionService.get_submitted_evidence(db, action_id, current_user)
    return evidence_to_submitted(evidence, db)


@router.post("/{action_id}/evidence", response_model=CorrectiveActionResponse)
async def submit_evidence(
    action_id: str,
    db: Session = Depends(get_db),
    current_user: Annotated[User | None, Depends(get_optional_user)] = None,
    file: UploadFile = File(...),
    notes: str = Form(default=""),
    location: str = Form(default=""),
):
    record = await save_upload_file(db, file)
    action = CorrectiveActionService.submit_evidence(
        db,
        action_id,
        record.file_url,
        record.file_name,
        notes,
        location,
        current_user,
    )
    return action_to_response(action, db, include_analysis=True)


@router.post("/{action_id}/evidence/json", response_model=CorrectiveActionResponse)
def submit_evidence_json(
    action_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: Annotated[User | None, Depends(get_optional_user)] = None,
):
    action = CorrectiveActionService.submit_evidence(
        db,
        action_id,
        payload.get("fileUrl", ""),
        payload.get("fileName", "evidence.jpg"),
        payload.get("notes", ""),
        payload.get("location", ""),
        current_user,
    )
    return action_to_response(action, db, include_analysis=True)


@router.get("/{action_id}/analyze-evidence", response_model=EvidenceAnalysisResponse)
def analyze_evidence(
    action_id: str,
    db: Session = Depends(get_db),
    current_user: Annotated[User | None, Depends(require_roles(UserRole.VETERINARIAN, UserRole.OFFICER))] = None,
):
    from app.core.exceptions import ValidationAppError
    from app.services.evidence_analysis_service import EvidenceAnalysisService

    action = CorrectiveActionService.get_action(db, action_id, current_user)
    if not action.evidence:
        raise ValidationAppError("No evidence submitted for this action.")
    result = EvidenceAnalysisService.analyze(db, action, action.evidence)
    return EvidenceAnalysisResponse(**result)


@router.post("/{action_id}/verify", response_model=CorrectiveActionResponse)
def verify_action(
    action_id: str,
    payload: ActionVerifyRequest,
    db: Session = Depends(get_db),
    current_user: Annotated[User | None, Depends(require_roles(UserRole.VETERINARIAN, UserRole.OFFICER))] = None,
):
    action = CorrectiveActionService.verify_action(db, action_id, payload, current_user)
    return action_to_response(action, db)

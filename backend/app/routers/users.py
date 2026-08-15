from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_roles
from app.database.session import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.auth import UserCreate, UserResponse
from app.services.auth_service import UserService, user_to_response

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    _: Annotated[User, Depends(require_roles(UserRole.OFFICER))] = None,
):
    return [user_to_response(u) for u in UserService.list_users(db)]


@router.post("", response_model=UserResponse, status_code=201)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _: Annotated[User, Depends(require_roles(UserRole.OFFICER))] = None,
):
    user = UserService.create_user(db, payload)
    return user_to_response(user)


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: Annotated[User, Depends(get_current_user)] = None,
):
    if str(current_user.id) != user_id and current_user.role != UserRole.OFFICER:
        from app.core.exceptions import ForbiddenError, raise_http_from_app_error
        raise raise_http_from_app_error(ForbiddenError())
    user = UserService.get_user(db, user_id)
    return user_to_response(user)

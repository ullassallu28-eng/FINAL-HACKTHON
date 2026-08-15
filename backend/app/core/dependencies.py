from collections.abc import Generator
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import ForbiddenError, UnauthorizedError, raise_http_from_app_error
from app.core.security import decode_token
from app.database.session import get_db
from app.models.enums import UserRole
from app.models.user import User

security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    if credentials is None or not credentials.credentials:
        raise raise_http_from_app_error(UnauthorizedError())
    try:
        payload = decode_token(credentials.credentials)
    except ValueError as exc:
        raise raise_http_from_app_error(UnauthorizedError(str(exc))) from exc
    if payload.get("type") != "access":
        raise raise_http_from_app_error(UnauthorizedError("Invalid token type."))
    user_id = payload.get("sub")
    if not user_id:
        raise raise_http_from_app_error(UnauthorizedError("Invalid token payload."))
    user = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
    if not user:
        raise raise_http_from_app_error(UnauthorizedError("User not found or inactive."))
    return user


def get_optional_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    db: Annotated[Session, Depends(get_db)],
) -> User | None:
    if credentials is None or not credentials.credentials:
        return None
    try:
        return get_current_user(credentials, db)
    except HTTPException:
        return None


def require_roles(*roles: UserRole):
    def dependency(current_user: Annotated[User | None, Depends(get_optional_user)]) -> User | None:
        if current_user is None:
            if settings.DEBUG:
                return None
            raise raise_http_from_app_error(UnauthorizedError())
        if current_user.role not in roles:
            raise raise_http_from_app_error(
                ForbiddenError(f"Requires one of roles: {', '.join(r.value for r in roles)}")
            )
        return current_user

    return dependency

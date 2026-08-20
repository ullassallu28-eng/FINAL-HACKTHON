"""
Auth service — handles email + password authentication for all three roles:

  FARMER           → Email + password flow
  VETERINARIAN     → Email + password flow
  GOVT_OFFICER     → Email + password flow

SECURITY NOTE:
  The role embedded in the JWT comes exclusively from the User.role database
  column — it is never accepted from a request body or URL parameter.

  The frontend may display a role selector for UX purposes, but the backend
  always ignores the frontend-supplied role. The portal a user accesses is
  determined solely by the role stored in the database.
"""

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError, UnauthorizedError, ValidationAppError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from app.models.enums import UserRole
from app.models.user import User, UserFarmAssignment
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    UserCreate,
    UserResponse,
)

from app.core.config import settings


# ---------------------------------------------------------------------------
# Helper: user → public response object
# ---------------------------------------------------------------------------

def user_to_response(user: User) -> UserResponse:
    farm_ids = [a.farm_id for a in user.farm_assignments]
    return UserResponse(
        id=str(user.id),
        full_name=user.full_name,
        email=user.email,
        role=user.role.value,
        farm_ids=farm_ids,
        district_id=user.district_id,
    )


# ---------------------------------------------------------------------------
# Auth service — email + password only
# ---------------------------------------------------------------------------

class AuthService:

    @staticmethod
    def login(db: Session, payload: LoginRequest) -> TokenResponse:
        """
        Authenticate a user with email + password.

        The role in the returned JWT is taken exclusively from the database
        record — the frontend role selector has no effect on which role is
        granted. If a user tries to log in on the wrong role tab, the frontend
        is responsible for comparing the returned role against the selected tab
        and showing an appropriate error; the backend simply returns whatever
        role the authenticated account actually holds.
        """
        user = db.query(User).filter(User.email == payload.email).first()
        if not user or not verify_password(payload.password, user.password_hash):
            raise UnauthorizedError("Invalid email or password.")
        if not user.is_active:
            raise UnauthorizedError("User account is inactive.")
        # Role comes ONLY from the database column — never from request payload.
        access = create_access_token({"sub": str(user.id), "role": user.role.value})
        refresh = create_refresh_token({"sub": str(user.id)})
        return TokenResponse(
            access_token=access,
            refresh_token=refresh,
            expires_in=settings.JWT_ACCESS_EXPIRE_MINUTES * 60,
            user=user_to_response(user),
        )

    @staticmethod
    def refresh(db: Session, refresh_token: str) -> TokenResponse:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise UnauthorizedError("Invalid refresh token.")
        user = db.query(User).filter(User.id == payload.get("sub")).first()
        if not user or not user.is_active:
            raise UnauthorizedError("User not found or inactive.")
        access = create_access_token({"sub": str(user.id), "role": user.role.value})
        refresh = create_refresh_token({"sub": str(user.id)})
        return TokenResponse(
            access_token=access,
            refresh_token=refresh,
            expires_in=settings.JWT_ACCESS_EXPIRE_MINUTES * 60,
            user=user_to_response(user),
        )

    @staticmethod
    def get_me(user: User) -> UserResponse:
        return user_to_response(user)


# ---------------------------------------------------------------------------
# User management service (officer-only admin operations)
# ---------------------------------------------------------------------------

class UserService:
    @staticmethod
    def list_users(db: Session) -> list[User]:
        return db.query(User).order_by(User.full_name).all()

    @staticmethod
    def create_user(db: Session, payload: UserCreate) -> User:
        if db.query(User).filter(User.email == payload.email).first():
            raise ConflictError("Email already registered.")
        user = User(
            email=payload.email,
            password_hash=get_password_hash(payload.password),
            full_name=payload.full_name,
            role=UserRole(payload.role),
            phone=payload.phone,
            district_id=payload.district_id,
        )
        db.add(user)
        db.flush()
        for farm_id in payload.farm_ids:
            db.add(UserFarmAssignment(user_id=user.id, farm_id=farm_id, is_owner=True))
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def get_user(db: Session, user_id: str) -> User:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise NotFoundError("User", user_id)
        return user

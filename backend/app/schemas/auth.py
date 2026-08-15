from pydantic import Field

from app.schemas.common import CamelModel


class LoginRequest(CamelModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=6)


class RegisterRequest(CamelModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=6)
    full_name: str
    role: str = "farmer"
    phone: str | None = None
    district_id: str | None = None


class TokenResponse(CamelModel):
    access_token: str = Field(serialization_alias="accessToken")
    refresh_token: str = Field(serialization_alias="refreshToken")
    expires_in: int = Field(serialization_alias="expiresIn")
    user: "UserResponse"


class RefreshRequest(CamelModel):
    refresh_token: str = Field(alias="refreshToken")


class UserResponse(CamelModel):
    id: str
    full_name: str = Field(serialization_alias="fullName")
    email: str
    role: str
    farm_ids: list[str] = Field(default_factory=list, serialization_alias="farmIds")
    district_id: str | None = Field(default=None, serialization_alias="districtId")


class UserCreate(CamelModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=6)
    full_name: str
    role: str
    phone: str | None = None
    district_id: str | None = None
    farm_ids: list[str] = Field(default_factory=list)


class UserUpdate(CamelModel):
    full_name: str | None = None
    phone: str | None = None
    is_active: bool | None = None

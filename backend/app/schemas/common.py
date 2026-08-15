from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True, serialize_by_alias=True)


class ErrorDetail(CamelModel):
    code: str
    message: str
    status: int


class ErrorResponse(CamelModel):
    error: ErrorDetail


class Coordinates(CamelModel):
    lat: float
    lng: float


class PaginationMeta(CamelModel):
    page: int
    limit: int
    total: int


class PaginatedResponse(CamelModel, Generic[T]):
    data: list[T]
    pagination: PaginationMeta | None = None

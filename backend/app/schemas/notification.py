from pydantic import Field

from app.schemas.common import CamelModel


class NotificationResponse(CamelModel):
    id: str
    title: str
    message: str
    timestamp: str
    type: str
    read: bool
    target_role: str | None = Field(default=None, serialization_alias="targetRole")
    action_url: str | None = Field(default=None, serialization_alias="actionUrl")

from pydantic import Field

from app.schemas.common import CamelModel


class RecommendedActionResponse(CamelModel):
    key: str
    title: str
    description: str
    priority: str
    evidence_required: bool = Field(serialization_alias="evidenceRequired")
    selected: bool = True


class ActionPlanItemRequest(CamelModel):
    title: str
    description: str
    priority: str = "medium"
    assigned_person: str | None = Field(default=None, alias="assignedPerson")
    deadline: str
    evidence_required: bool = Field(default=True, alias="evidenceRequired")
    veterinary_note: str | None = Field(default=None, alias="veterinaryNote")


class ActionPlanSendRequest(CamelModel):
    actions: list[ActionPlanItemRequest]


class ActionPlanSendResponse(CamelModel):
    incident_id: str = Field(serialization_alias="incidentId")
    actions_created: int = Field(serialization_alias="actionsCreated")
    action_ids: list[str] = Field(serialization_alias="actionIds")

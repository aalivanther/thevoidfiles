from typing import Any, Literal, Protocol

from pydantic import BaseModel

ProviderKindName = Literal["narrative", "speech"]
InteractionOutcomeName = Literal["succeeded", "failed"]


class AiInteractionRecord(BaseModel):
    interaction_identifier: str
    profile_identifier: str | None
    provider_kind_name: ProviderKindName
    provider_name: str
    provider_mode_name: Literal["synthetic", "real"]
    operation_name: str
    model_identifier: str | None
    purpose_name: str
    turn_identifier: str | None
    outcome_name: InteractionOutcomeName
    failure_name: str | None
    request_body: dict[str, Any]
    response_body: dict[str, Any]
    started_at_utc: str
    finished_at_utc: str
    duration_milliseconds: int


class AiInteractionRecorder(Protocol):
    def record_interaction(self, interaction_record: AiInteractionRecord) -> None: ...

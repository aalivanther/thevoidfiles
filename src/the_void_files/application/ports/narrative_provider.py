from typing import Any, Literal, Protocol

from pydantic import BaseModel, Field


class NarrativeContextBlock(BaseModel):
    authority_label_name: str
    content_text: str


class NarrativeGenerationRequest(BaseModel):
    profile_identifier: str | None = None
    purpose_name: str
    turn_identifier: str | None = None
    instruction_text: str
    context_blocks: list[NarrativeContextBlock] = Field(default_factory=list)
    response_schema_name: str | None = None
    response_json_schema: dict[str, Any] | None = None


class NarrativeGenerationResponse(BaseModel):
    provider_name: str
    model_identifier: str
    response_text: str
    structured_response: dict[str, Any] | None = None
    input_token_count: int | None = None
    output_token_count: int | None = None
    interaction_identifier: str | None = None


class NarrativeProvider(Protocol):
    provider_name: str
    provider_mode_name: Literal["synthetic", "real"]

    async def generate_narrative(
        self, generation_request: NarrativeGenerationRequest
    ) -> NarrativeGenerationResponse: ...

    async def close(self) -> None: ...

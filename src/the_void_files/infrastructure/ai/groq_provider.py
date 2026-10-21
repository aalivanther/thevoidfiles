from collections.abc import Awaitable, Callable

import httpx

from the_void_files.application.ports.access_key_vault import AccessKeyVault
from the_void_files.application.ports.narrative_provider import NarrativeGenerationRequest
from the_void_files.infrastructure.ai.openai_compatible_narrative_provider import (
    OpenAICompatibleNarrativeProvider,
    compatible_default_maximum_transport_attempt_count,
)

groq_base_address = "https://api.groq.com/openai/v1"
groq_default_model_identifier = "openai/gpt-oss-120b"
groq_maximum_completion_token_count = 4096


class GroqNarrativeProvider(OpenAICompatibleNarrativeProvider):
    def __init__(
        self,
        access_key_vault: AccessKeyVault,
        transport: httpx.AsyncBaseTransport | None = None,
        model_identifier: str = groq_default_model_identifier,
        maximum_transport_attempt_count: int = compatible_default_maximum_transport_attempt_count,
        pause_between_attempts: Callable[[float], Awaitable[None]] | None = None,
    ) -> None:
        super_arguments = {
            "access_key_vault": access_key_vault,
            "provider_name": "groq",
            "access_key_name": "groq",
            "base_address": groq_base_address,
            "model_identifier": model_identifier,
            "transport": transport,
            "maximum_transport_attempt_count": maximum_transport_attempt_count,
        }
        if pause_between_attempts is not None:
            super_arguments["pause_between_attempts"] = pause_between_attempts
        super().__init__(**super_arguments)

    def build_generation_body(self, generation_request: NarrativeGenerationRequest, response_json_schema: dict | None):
        generation_body = super().build_generation_body(generation_request, None)
        generation_body["max_tokens"] = groq_maximum_completion_token_count
        return generation_body

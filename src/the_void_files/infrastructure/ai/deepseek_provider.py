from collections.abc import Awaitable, Callable

import httpx

from the_void_files.application.ports.access_key_vault import AccessKeyVault
from the_void_files.infrastructure.ai.openai_compatible_narrative_provider import (
    OpenAICompatibleNarrativeProvider,
    compatible_default_maximum_transport_attempt_count,
)

deepseek_base_address = "https://api.deepseek.com"
deepseek_default_model_identifier = "deepseek-v4-pro"


class DeepSeekNarrativeProvider(OpenAICompatibleNarrativeProvider):
    def __init__(
        self,
        access_key_vault: AccessKeyVault,
        transport: httpx.AsyncBaseTransport | None = None,
        model_identifier: str = deepseek_default_model_identifier,
        maximum_transport_attempt_count: int = compatible_default_maximum_transport_attempt_count,
        pause_between_attempts: Callable[[float], Awaitable[None]] | None = None,
    ) -> None:
        super_arguments = {
            "access_key_vault": access_key_vault,
            "provider_name": "deepseek",
            "access_key_name": "deepseek",
            "base_address": deepseek_base_address,
            "model_identifier": model_identifier,
            "extra_generation_fields": {"thinking": {"type": "disabled"}},
            "transport": transport,
            "maximum_transport_attempt_count": maximum_transport_attempt_count,
        }
        if pause_between_attempts is not None:
            super_arguments["pause_between_attempts"] = pause_between_attempts
        super().__init__(**super_arguments)

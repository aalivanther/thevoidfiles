from the_void_files.application.ports.narrative_provider import NarrativeGenerationRequest, NarrativeGenerationResponse
from the_void_files.application.service_failures import NarrativeProviderNotConfiguredError


class UnconfiguredNarrativeProvider:
    provider_name = "unconfigured_narrative"
    provider_mode_name = "real"

    async def generate_narrative(self, generation_request: NarrativeGenerationRequest) -> NarrativeGenerationResponse:
        raise NarrativeProviderNotConfiguredError()

    async def close(self) -> None:
        return None

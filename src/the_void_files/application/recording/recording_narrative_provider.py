import asyncio

from the_void_files.application.ports.ai_interaction_recorder import AiInteractionRecord, AiInteractionRecorder
from the_void_files.application.ports.narrative_provider import (
    NarrativeGenerationRequest,
    NarrativeGenerationResponse,
    NarrativeProvider,
)
from the_void_files.application.recording.interaction_timing import (
    read_current_utc_timestamp,
    start_interaction_timing,
)
from the_void_files.application.service_failures import ServiceFailure

unexpected_provider_failure_name = "narrative_provider_raised_unexpected_error"
cancelled_provider_call_failure_name = "narrative_provider_call_cancelled"


class RecordingNarrativeProvider:
    def __init__(self, wrapped_provider: NarrativeProvider, interaction_recorder: AiInteractionRecorder) -> None:
        self.wrapped_provider = wrapped_provider
        self.interaction_recorder = interaction_recorder
        self.provider_name = wrapped_provider.provider_name
        self.provider_mode_name = wrapped_provider.provider_mode_name

    async def generate_narrative(self, generation_request: NarrativeGenerationRequest) -> NarrativeGenerationResponse:
        interaction_timing = start_interaction_timing()

        def record_outcome(model_identifier: str | None, failure_name: str | None, response_body: dict) -> None:
            self.interaction_recorder.record_interaction(
                AiInteractionRecord(
                    interaction_identifier=interaction_timing.interaction_identifier,
                    profile_identifier=generation_request.profile_identifier,
                    provider_kind_name="narrative",
                    provider_name=self.provider_name,
                    provider_mode_name=self.provider_mode_name,
                    operation_name="generate_narrative",
                    model_identifier=model_identifier,
                    purpose_name=generation_request.purpose_name,
                    turn_identifier=generation_request.turn_identifier,
                    outcome_name="succeeded" if failure_name is None else "failed",
                    failure_name=failure_name,
                    request_body=generation_request.model_dump(mode="json"),
                    response_body=response_body,
                    started_at_utc=interaction_timing.started_at_utc,
                    finished_at_utc=read_current_utc_timestamp(),
                    duration_milliseconds=interaction_timing.read_elapsed_milliseconds(),
                )
            )

        try:
            generation_response = await self.wrapped_provider.generate_narrative(generation_request)
        except ServiceFailure as service_failure:
            record_outcome(None, service_failure.failure_name, {"failure_name": service_failure.failure_name})
            raise
        except asyncio.CancelledError:
            record_outcome(
                None, cancelled_provider_call_failure_name, {"failure_name": cancelled_provider_call_failure_name}
            )
            raise
        except Exception as unexpected_error:
            record_outcome(
                None,
                unexpected_provider_failure_name,
                {"failure_name": unexpected_provider_failure_name, "error_type_name": type(unexpected_error).__name__},
            )
            raise
        recorded_response = generation_response.model_copy(
            update={"interaction_identifier": interaction_timing.interaction_identifier}
        )
        record_outcome(recorded_response.model_identifier, None, recorded_response.model_dump(mode="json"))
        return recorded_response

    async def close(self) -> None:
        await self.wrapped_provider.close()

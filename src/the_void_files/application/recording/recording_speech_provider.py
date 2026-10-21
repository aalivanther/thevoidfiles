from typing import Any

from the_void_files.application.content_hashing import compute_bytes_content_hash
from the_void_files.application.ports.ai_interaction_recorder import AiInteractionRecord, AiInteractionRecorder
from the_void_files.application.ports.speech_provider import (
    SpeechProvider,
    SpeechSynthesisRequest,
    SpeechSynthesisResponse,
    VoiceListingRequest,
    VoiceListingResponse,
)
from the_void_files.application.recording.interaction_timing import (
    StartedInteractionTiming,
    read_current_utc_timestamp,
    start_interaction_timing,
)
from the_void_files.application.service_failures import ServiceFailure

unexpected_provider_failure_name = "speech_provider_raised_unexpected_error"


class RecordingSpeechProvider:
    def __init__(self, wrapped_provider: SpeechProvider, interaction_recorder: AiInteractionRecorder) -> None:
        self.wrapped_provider = wrapped_provider
        self.interaction_recorder = interaction_recorder
        self.provider_name = wrapped_provider.provider_name
        self.provider_mode_name = wrapped_provider.provider_mode_name
        self.speech_model_identifier = wrapped_provider.speech_model_identifier

    def record_outcome(
        self,
        interaction_timing: StartedInteractionTiming,
        operation_name: str,
        purpose_name: str,
        profile_identifier: str | None,
        turn_identifier: str | None,
        request_body: dict[str, Any],
        failure_name: str | None,
        response_body: dict[str, Any],
    ) -> None:
        self.interaction_recorder.record_interaction(
            AiInteractionRecord(
                interaction_identifier=interaction_timing.interaction_identifier,
                profile_identifier=profile_identifier,
                provider_kind_name="speech",
                provider_name=self.provider_name,
                provider_mode_name=self.provider_mode_name,
                operation_name=operation_name,
                model_identifier=self.speech_model_identifier,
                purpose_name=purpose_name,
                turn_identifier=turn_identifier,
                outcome_name="succeeded" if failure_name is None else "failed",
                failure_name=failure_name,
                request_body=request_body,
                response_body=response_body,
                started_at_utc=interaction_timing.started_at_utc,
                finished_at_utc=read_current_utc_timestamp(),
                duration_milliseconds=interaction_timing.read_elapsed_milliseconds(),
            )
        )

    async def list_available_voices(self, listing_request: VoiceListingRequest) -> VoiceListingResponse:
        interaction_timing = start_interaction_timing()
        request_body = listing_request.model_dump(mode="json")

        def record_listing_outcome(failure_name: str | None, response_body: dict[str, Any]) -> None:
            self.record_outcome(
                interaction_timing,
                "list_available_voices",
                "voice_listing",
                listing_request.profile_identifier,
                None,
                request_body,
                failure_name,
                response_body,
            )

        try:
            listing_response = await self.wrapped_provider.list_available_voices(listing_request)
        except ServiceFailure as service_failure:
            record_listing_outcome(service_failure.failure_name, {"failure_name": service_failure.failure_name})
            raise
        except Exception as unexpected_error:
            record_listing_outcome(
                unexpected_provider_failure_name,
                {"failure_name": unexpected_provider_failure_name, "error_type_name": type(unexpected_error).__name__},
            )
            raise
        recorded_response = listing_response.model_copy(
            update={"interaction_identifier": interaction_timing.interaction_identifier}
        )
        record_listing_outcome(None, recorded_response.model_dump(mode="json"))
        return recorded_response

    async def synthesize_speech(self, synthesis_request: SpeechSynthesisRequest) -> SpeechSynthesisResponse:
        interaction_timing = start_interaction_timing()
        request_body = synthesis_request.model_dump(mode="json")

        def record_synthesis_outcome(failure_name: str | None, response_body: dict[str, Any]) -> None:
            self.record_outcome(
                interaction_timing,
                "synthesize_speech",
                "narration_speech",
                synthesis_request.profile_identifier,
                synthesis_request.turn_identifier,
                request_body,
                failure_name,
                response_body,
            )

        try:
            synthesis_response = await self.wrapped_provider.synthesize_speech(synthesis_request)
        except ServiceFailure as service_failure:
            record_synthesis_outcome(service_failure.failure_name, {"failure_name": service_failure.failure_name})
            raise
        except Exception as unexpected_error:
            record_synthesis_outcome(
                unexpected_provider_failure_name,
                {"failure_name": unexpected_provider_failure_name, "error_type_name": type(unexpected_error).__name__},
            )
            raise
        recorded_response = synthesis_response.model_copy(
            update={"interaction_identifier": interaction_timing.interaction_identifier}
        )
        response_body = recorded_response.model_dump(mode="json", exclude={"audio_bytes"})
        response_body["audio_byte_count"] = len(recorded_response.audio_bytes)
        response_body["audio_content_hash"] = compute_bytes_content_hash(recorded_response.audio_bytes)
        record_synthesis_outcome(None, response_body)
        return recorded_response

    async def close(self) -> None:
        await self.wrapped_provider.close()

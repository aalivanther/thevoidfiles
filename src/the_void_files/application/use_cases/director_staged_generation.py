from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

from the_void_files.application.ports.narrative_provider import NarrativeGenerationRequest, NarrativeProvider
from the_void_files.application.recording.interaction_timing import read_current_utc_timestamp
from the_void_files.application.service_failures import ServiceFailure
from the_void_files.application.use_cases.director_failures import (
    NarrativeProviderBusyError,
    NarrativeProviderTimedOutError,
    NarrativeProviderUnreachableError,
)
from the_void_files.application.use_cases.director_interaction_log_review import (
    DirectorGenerationAttemptRecord,
    DirectorRecordStore,
)
from the_void_files.narrative.tool_registry import (
    ContractValidationError,
    DirectorContractModel,
    validate_contract_structure,
)

maximum_director_generation_attempt_count = 3
retryable_provider_failure_types = (
    NarrativeProviderTimedOutError,
    NarrativeProviderBusyError,
    NarrativeProviderUnreachableError,
)

DirectorRequestBuilder = Callable[[int, list[ContractValidationError], str | None], NarrativeGenerationRequest]
DirectorContractReviewer = Callable[[DirectorContractModel], list[ContractValidationError]]


@dataclass(frozen=True)
class GenerationAttemptLinkage:
    simulation_run_identifier: str | None
    archive_case_identifier: str | None
    action_key: str | None
    turn_identifier: str | None


@dataclass
class StagedGenerationOutcome:
    purpose_name: str
    accepted_contract: DirectorContractModel | None = None
    attempts: list[dict[str, Any]] = field(default_factory=list)

    @property
    def interaction_identifiers(self) -> list[str]:
        return [attempt["interaction_identifier"] for attempt in self.attempts if attempt["interaction_identifier"]]


async def generate_validated_contract(
    narrative_provider: NarrativeProvider,
    director_record_store: DirectorRecordStore,
    purpose_name: str,
    response_schema_name: str,
    build_request: DirectorRequestBuilder,
    review_contract: DirectorContractReviewer,
    attempt_linkage: GenerationAttemptLinkage,
    injected_failure_mode_names: list[str],
    maximum_attempt_count: int = maximum_director_generation_attempt_count,
) -> StagedGenerationOutcome:
    staged_outcome = StagedGenerationOutcome(purpose_name=purpose_name)
    previous_validation_errors: list[ContractValidationError] = []
    for attempt_position in range(maximum_attempt_count):
        injected_failure_mode_name = (
            injected_failure_mode_names[attempt_position] if attempt_position < len(injected_failure_mode_names) else None
        )
        interaction_identifier: str | None = None
        failure_name: str | None = None
        accepted_contract: DirectorContractModel | None = None
        should_stop_after_failure = False
        try:
            generation_response = await narrative_provider.generate_narrative(
                build_request(attempt_position, previous_validation_errors, injected_failure_mode_name)
            )
        except ServiceFailure as provider_failure:
            failure_name = provider_failure.failure_name
            should_stop_after_failure = not isinstance(provider_failure, retryable_provider_failure_types)
            validation_errors: list[ContractValidationError] = []
        else:
            interaction_identifier = generation_response.interaction_identifier
            accepted_contract, validation_errors = validate_contract_structure(
                generation_response.structured_response, response_schema_name
            )
            if accepted_contract is not None:
                validation_errors = review_contract(accepted_contract)
                if validation_errors:
                    accepted_contract = None
        if failure_name is not None:
            outcome_name = "provider_failed"
        elif accepted_contract is not None:
            outcome_name = "accepted"
        else:
            outcome_name = "rejected"
        validation_error_records = [validation_error.model_dump(mode="json") for validation_error in validation_errors]
        director_record_store.record_generation_attempt(
            DirectorGenerationAttemptRecord(
                interaction_identifier=interaction_identifier,
                simulation_run_identifier=attempt_linkage.simulation_run_identifier,
                archive_case_identifier=attempt_linkage.archive_case_identifier,
                action_key=attempt_linkage.action_key,
                turn_identifier=attempt_linkage.turn_identifier,
                purpose_name=purpose_name,
                attempt_number=attempt_position + 1,
                outcome_name=outcome_name,
                failure_name=failure_name,
                validation_errors=validation_error_records,
                created_at_utc=read_current_utc_timestamp(),
            )
        )
        staged_outcome.attempts.append(
            {
                "attempt_number": attempt_position + 1,
                "interaction_identifier": interaction_identifier,
                "outcome_name": outcome_name,
                "failure_name": failure_name,
                "injected_failure_mode_name": injected_failure_mode_name,
                "validation_errors": validation_error_records,
            }
        )
        if accepted_contract is not None:
            staged_outcome.accepted_contract = accepted_contract
            return staged_outcome
        if should_stop_after_failure:
            return staged_outcome
        previous_validation_errors = validation_errors
    return staged_outcome

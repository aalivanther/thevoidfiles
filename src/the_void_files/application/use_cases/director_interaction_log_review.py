from collections import Counter
from datetime import datetime, timezone
from typing import Any, Literal, Protocol

from pydantic import BaseModel

from the_void_files.application.use_cases.director_failures import (
    AiInteractionBodyUnreadableError,
    AiInteractionNotFoundError,
    InteractionTimeRangeMalformedError,
)

default_listed_interaction_count = 100
maximum_listed_interaction_count = 500


class AiInteractionFilter(BaseModel):
    purpose_name: str | None = None
    provider_name: str | None = None
    provider_mode_name: Literal["synthetic", "real"] | None = None
    provider_kind_name: Literal["narrative", "speech"] | None = None
    are_failures_only: bool = False
    archive_case_identifier: str | None = None
    turn_identifier: str | None = None
    started_from_utc: str | None = None
    started_until_utc: str | None = None


class StoredAiInteraction(BaseModel):
    sequence_number: int
    interaction_identifier: str
    provider_kind_name: str
    provider_name: str
    provider_mode_name: str
    operation_name: str
    model_identifier: str | None
    purpose_name: str
    turn_identifier: str | None
    outcome_name: str
    failure_name: str | None
    request_body_file_name: str
    response_body_file_name: str
    started_at_utc: str
    finished_at_utc: str
    duration_milliseconds: int


class StoredGenerationAttempt(BaseModel):
    interaction_identifier: str | None
    purpose_name: str
    attempt_number: int
    outcome_name: str
    failure_name: str | None
    validation_errors: list[dict[str, Any]]
    archive_case_identifier: str | None
    action_key: str | None
    simulation_run_identifier: str | None


class DirectorGenerationAttemptRecord(BaseModel):
    interaction_identifier: str | None
    simulation_run_identifier: str | None
    archive_case_identifier: str | None
    action_key: str | None
    turn_identifier: str | None
    purpose_name: str
    attempt_number: int
    outcome_name: Literal["accepted", "rejected", "provider_failed"]
    failure_name: str | None
    validation_errors: list[dict[str, Any]]
    created_at_utc: str


class DirectorSimulationRunRecord(BaseModel):
    simulation_run_identifier: str
    scripted_path_identifier: str
    archive_case_identifier: str | None
    outcome_name: Literal["completed", "failed"]
    report: dict[str, Any]
    started_at_utc: str
    finished_at_utc: str


class AiInteractionBodies(BaseModel):
    request_body: dict[str, Any]
    response_body: dict[str, Any]


class DirectorRecordStore(Protocol):
    def record_generation_attempt(self, attempt_record: DirectorGenerationAttemptRecord) -> None: ...

    def save_simulation_run(self, simulation_run_record: DirectorSimulationRunRecord) -> None: ...

    def list_simulation_runs(self) -> list[DirectorSimulationRunRecord]: ...

    def count_interactions(self) -> int: ...

    def list_interactions(
        self, interaction_filter: AiInteractionFilter, maximum_count: int | None, skipped_count: int
    ) -> list[StoredAiInteraction]: ...

    def read_interaction(self, interaction_identifier: str) -> StoredAiInteraction | None: ...

    def list_generation_attempts(self, interaction_identifiers: list[str] | None) -> list[StoredGenerationAttempt]: ...

    def read_interaction_bodies(self, stored_interaction: StoredAiInteraction) -> AiInteractionBodies | None: ...


def normalize_time_boundary(candidate_text: str | None) -> str | None:
    if candidate_text is None:
        return None
    try:
        parsed_moment = datetime.fromisoformat(candidate_text.replace("Z", "+00:00"))
    except ValueError as malformed_moment_error:
        raise InteractionTimeRangeMalformedError() from malformed_moment_error
    if parsed_moment.tzinfo is None:
        parsed_moment = parsed_moment.replace(tzinfo=timezone.utc)
    return parsed_moment.astimezone(timezone.utc).isoformat(timespec="milliseconds")


def normalize_interaction_filter(interaction_filter: AiInteractionFilter) -> AiInteractionFilter:
    return interaction_filter.model_copy(
        update={
            "started_from_utc": normalize_time_boundary(interaction_filter.started_from_utc),
            "started_until_utc": normalize_time_boundary(interaction_filter.started_until_utc),
        }
    )


def build_public_interaction(
    stored_interaction: StoredAiInteraction, generation_attempts: list[StoredGenerationAttempt]
) -> dict[str, Any]:
    own_attempts = [
        generation_attempt
        for generation_attempt in generation_attempts
        if generation_attempt.interaction_identifier == stored_interaction.interaction_identifier
    ]
    public_interaction = stored_interaction.model_dump(
        mode="json", exclude={"request_body_file_name", "response_body_file_name"}
    )
    public_interaction["generation_attempts"] = [
        own_attempt.model_dump(mode="json", exclude={"interaction_identifier"}) for own_attempt in own_attempts
    ]
    public_interaction["was_answer_rejected_by_validation"] = any(
        own_attempt.outcome_name == "rejected" for own_attempt in own_attempts
    )
    return public_interaction


def list_public_interactions(
    director_record_store: DirectorRecordStore,
    interaction_filter: AiInteractionFilter,
    maximum_count: int,
    skipped_count: int,
) -> dict[str, Any]:
    stored_interactions = director_record_store.list_interactions(
        normalize_interaction_filter(interaction_filter), min(maximum_count, maximum_listed_interaction_count), skipped_count
    )
    generation_attempts = director_record_store.list_generation_attempts(
        [stored_interaction.interaction_identifier for stored_interaction in stored_interactions]
    )
    return {
        "stored_interaction_count": director_record_store.count_interactions(),
        "interactions": [
            build_public_interaction(stored_interaction, generation_attempts) for stored_interaction in stored_interactions
        ],
    }


def read_public_interaction(director_record_store: DirectorRecordStore, interaction_identifier: str) -> dict[str, Any]:
    stored_interaction = director_record_store.read_interaction(interaction_identifier)
    if stored_interaction is None:
        raise AiInteractionNotFoundError()
    interaction_bodies = director_record_store.read_interaction_bodies(stored_interaction)
    if interaction_bodies is None:
        raise AiInteractionBodyUnreadableError()
    public_interaction = build_public_interaction(
        stored_interaction, director_record_store.list_generation_attempts([interaction_identifier])
    )
    public_interaction["request_body"] = interaction_bodies.request_body
    public_interaction["response_body"] = interaction_bodies.response_body
    return public_interaction


def read_token_count(response_body: dict[str, Any], token_count_key_name: str) -> int:
    token_count = response_body.get(token_count_key_name)
    return token_count if isinstance(token_count, int) and not isinstance(token_count, bool) else 0


def summarize_interactions(
    director_record_store: DirectorRecordStore, interaction_filter: AiInteractionFilter
) -> dict[str, Any]:
    stored_interactions = director_record_store.list_interactions(
        normalize_interaction_filter(interaction_filter), None, 0
    )
    interaction_identifiers = [stored_interaction.interaction_identifier for stored_interaction in stored_interactions]
    generation_attempts = director_record_store.list_generation_attempts(interaction_identifiers)
    durations = sorted(stored_interaction.duration_milliseconds for stored_interaction in stored_interactions)
    input_token_count = 0
    output_token_count = 0
    unreadable_body_count = 0
    for stored_interaction in stored_interactions:
        interaction_bodies = director_record_store.read_interaction_bodies(stored_interaction)
        if interaction_bodies is None:
            unreadable_body_count += 1
            continue
        input_token_count += read_token_count(interaction_bodies.response_body, "input_token_count")
        output_token_count += read_token_count(interaction_bodies.response_body, "output_token_count")
    validation_error_names = Counter(
        str(validation_error.get("error_name"))
        for generation_attempt in generation_attempts
        for validation_error in generation_attempt.validation_errors
    )
    return {
        "interaction_count": len(stored_interactions),
        "succeeded_interaction_count": sum(
            1 for stored_interaction in stored_interactions if stored_interaction.outcome_name == "succeeded"
        ),
        "failed_interaction_count": sum(
            1 for stored_interaction in stored_interactions if stored_interaction.outcome_name == "failed"
        ),
        "interaction_counts_by_purpose_name": dict(
            Counter(stored_interaction.purpose_name for stored_interaction in stored_interactions)
        ),
        "interaction_counts_by_provider_name": dict(
            Counter(stored_interaction.provider_name for stored_interaction in stored_interactions)
        ),
        "interaction_counts_by_provider_mode_name": dict(
            Counter(stored_interaction.provider_mode_name for stored_interaction in stored_interactions)
        ),
        "failure_counts_by_failure_name": dict(
            Counter(
                stored_interaction.failure_name
                for stored_interaction in stored_interactions
                if stored_interaction.failure_name is not None
            )
        ),
        "rejected_answer_count": sum(
            1 for generation_attempt in generation_attempts if generation_attempt.outcome_name == "rejected"
        ),
        "repair_attempt_count": sum(1 for generation_attempt in generation_attempts if generation_attempt.attempt_number > 1),
        "validation_error_counts_by_error_name": dict(validation_error_names),
        "latency_milliseconds": {
            "total": sum(durations),
            "average": round(sum(durations) / len(durations)) if durations else 0,
            "median": durations[len(durations) // 2] if durations else 0,
            "highest": durations[-1] if durations else 0,
        },
        "input_token_count": input_token_count,
        "output_token_count": output_token_count,
        "unreadable_body_count": unreadable_body_count,
    }

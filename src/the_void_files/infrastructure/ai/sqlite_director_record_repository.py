import json
import sqlite3
from pathlib import Path
from typing import Any

from the_void_files.application.use_cases.director_interaction_log_review import (
    AiInteractionBodies,
    AiInteractionFilter,
    DirectorGenerationAttemptRecord,
    DirectorSimulationRunRecord,
    StoredAiInteraction,
    StoredGenerationAttempt,
)
from the_void_files.infrastructure.storage.profile_data_store import ProfileDataStore

interaction_column_names = (
    "sequence_number, interaction_identifier, provider_kind_name, provider_name, provider_mode_name, operation_name, "
    "model_identifier, purpose_name, turn_identifier, outcome_name, failure_name, request_body_file_name, "
    "response_body_file_name, started_at_utc, finished_at_utc, duration_milliseconds"
)
interactions_of_archive_case_condition = (
    "(interaction_identifier IN ("
    "SELECT interaction_identifier FROM director_generation_attempt WHERE archive_case_identifier = :archive_case_identifier"
    ") OR turn_identifier IN ("
    "SELECT confirmed_turn.turn_identifier FROM confirmed_turn "
    "JOIN archive_run ON archive_run.archive_run_identifier = confirmed_turn.archive_run_identifier "
    "WHERE archive_run.archive_case_identifier = :archive_case_identifier"
    ") OR interaction_identifier IN ("
    "SELECT case_generation_attempt.interaction_identifier FROM case_generation_attempt "
    "JOIN archive_case ON archive_case.opening_key = case_generation_attempt.opening_key "
    "WHERE archive_case.archive_case_identifier = :archive_case_identifier"
    ") OR interaction_identifier IN ("
    "SELECT whisper_offer_batch.generation_interaction_identifier FROM whisper_offer_batch "
    "JOIN archive_case ON archive_case.offer_batch_identifier = whisper_offer_batch.offer_batch_identifier "
    "WHERE archive_case.archive_case_identifier = :archive_case_identifier"
    "))"
)


def build_stored_interaction(interaction_row: sqlite3.Row) -> StoredAiInteraction:
    return StoredAiInteraction(**{column_name: interaction_row[column_name] for column_name in interaction_row.keys()})


def build_filter_conditions(interaction_filter: AiInteractionFilter) -> tuple[list[str], dict[str, Any]]:
    conditions: list[str] = []
    parameters: dict[str, Any] = {}
    for column_name, filter_value in (
        ("purpose_name", interaction_filter.purpose_name),
        ("provider_name", interaction_filter.provider_name),
        ("provider_mode_name", interaction_filter.provider_mode_name),
        ("provider_kind_name", interaction_filter.provider_kind_name),
        ("turn_identifier", interaction_filter.turn_identifier),
    ):
        if filter_value is not None:
            conditions.append(f"{column_name} = :{column_name}")
            parameters[column_name] = filter_value
    if interaction_filter.are_failures_only:
        conditions.append(
            "(outcome_name = 'failed' OR interaction_identifier IN ("
            "SELECT interaction_identifier FROM director_generation_attempt WHERE outcome_name != 'accepted'"
            ") OR interaction_identifier IN ("
            "SELECT interaction_identifier FROM case_generation_attempt WHERE outcome_name = 'rejected'))"
        )
    if interaction_filter.archive_case_identifier is not None:
        conditions.append(interactions_of_archive_case_condition)
        parameters["archive_case_identifier"] = interaction_filter.archive_case_identifier
    if interaction_filter.started_from_utc is not None:
        conditions.append("started_at_utc >= :started_from_utc")
        parameters["started_from_utc"] = interaction_filter.started_from_utc
    if interaction_filter.started_until_utc is not None:
        conditions.append("started_at_utc <= :started_until_utc")
        parameters["started_until_utc"] = interaction_filter.started_until_utc
    return conditions, parameters


class SqliteDirectorRecordRepository:
    def __init__(self, profile_data_store: ProfileDataStore) -> None:
        self.profile_data_store = profile_data_store
        self.transaction_manager = profile_data_store.transaction_manager

    def record_generation_attempt(self, attempt_record: DirectorGenerationAttemptRecord) -> None:
        with self.transaction_manager.open_write_transaction() as connection:
            connection.execute(
                "INSERT INTO director_generation_attempt (interaction_identifier, simulation_run_identifier, "
                "archive_case_identifier, action_key, turn_identifier, purpose_name, attempt_number, outcome_name, "
                "failure_name, validation_errors_json, created_at_utc) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    attempt_record.interaction_identifier,
                    attempt_record.simulation_run_identifier,
                    attempt_record.archive_case_identifier,
                    attempt_record.action_key,
                    attempt_record.turn_identifier,
                    attempt_record.purpose_name,
                    attempt_record.attempt_number,
                    attempt_record.outcome_name,
                    attempt_record.failure_name,
                    json.dumps(attempt_record.validation_errors, sort_keys=True),
                    attempt_record.created_at_utc,
                ),
            )

    def save_simulation_run(self, simulation_run_record: DirectorSimulationRunRecord) -> None:
        with self.transaction_manager.open_write_transaction() as connection:
            connection.execute(
                "INSERT INTO director_simulation_run (simulation_run_identifier, scripted_path_identifier, "
                "archive_case_identifier, outcome_name, report_json, started_at_utc, finished_at_utc) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    simulation_run_record.simulation_run_identifier,
                    simulation_run_record.scripted_path_identifier,
                    simulation_run_record.archive_case_identifier,
                    simulation_run_record.outcome_name,
                    json.dumps(simulation_run_record.report, sort_keys=True, ensure_ascii=False),
                    simulation_run_record.started_at_utc,
                    simulation_run_record.finished_at_utc,
                ),
            )

    def list_simulation_runs(self) -> list[DirectorSimulationRunRecord]:
        with self.transaction_manager.open_autocommit_connection() as connection:
            simulation_run_rows = connection.execute(
                "SELECT * FROM director_simulation_run ORDER BY started_at_utc ASC, rowid ASC"
            ).fetchall()
        return [
            DirectorSimulationRunRecord(
                simulation_run_identifier=simulation_run_row["simulation_run_identifier"],
                scripted_path_identifier=simulation_run_row["scripted_path_identifier"],
                archive_case_identifier=simulation_run_row["archive_case_identifier"],
                outcome_name=simulation_run_row["outcome_name"],
                report=json.loads(simulation_run_row["report_json"]),
                started_at_utc=simulation_run_row["started_at_utc"],
                finished_at_utc=simulation_run_row["finished_at_utc"],
            )
            for simulation_run_row in simulation_run_rows
        ]

    def count_interactions(self) -> int:
        with self.transaction_manager.open_autocommit_connection() as connection:
            return connection.execute("SELECT COUNT(*) AS interaction_count FROM ai_interaction").fetchone()[
                "interaction_count"
            ]

    def list_interactions(
        self, interaction_filter: AiInteractionFilter, maximum_count: int | None, skipped_count: int
    ) -> list[StoredAiInteraction]:
        conditions, parameters = build_filter_conditions(interaction_filter)
        query_text = f"SELECT {interaction_column_names} FROM ai_interaction"
        if conditions:
            query_text += " WHERE " + " AND ".join(conditions)
        query_text += " ORDER BY sequence_number ASC"
        if maximum_count is not None:
            query_text += " LIMIT :maximum_count OFFSET :skipped_count"
            parameters["maximum_count"] = maximum_count
            parameters["skipped_count"] = skipped_count
        with self.transaction_manager.open_autocommit_connection() as connection:
            interaction_rows = connection.execute(query_text, parameters).fetchall()
        return [build_stored_interaction(interaction_row) for interaction_row in interaction_rows]

    def read_interaction(self, interaction_identifier: str) -> StoredAiInteraction | None:
        with self.transaction_manager.open_autocommit_connection() as connection:
            interaction_row = connection.execute(
                f"SELECT {interaction_column_names} FROM ai_interaction WHERE interaction_identifier = ?",
                (interaction_identifier,),
            ).fetchone()
        return None if interaction_row is None else build_stored_interaction(interaction_row)

    def list_generation_attempts(self, interaction_identifiers: list[str] | None) -> list[StoredGenerationAttempt]:
        with self.transaction_manager.open_autocommit_connection() as connection:
            director_attempt_rows = connection.execute(
                "SELECT interaction_identifier, purpose_name, attempt_number, outcome_name, failure_name, "
                "validation_errors_json, archive_case_identifier, action_key, simulation_run_identifier "
                "FROM director_generation_attempt ORDER BY sequence_number ASC"
            ).fetchall()
            case_attempt_rows = connection.execute(
                "SELECT case_generation_attempt.interaction_identifier, attempt_number, outcome_name, "
                "validation_errors_json, archive_case.archive_case_identifier "
                "FROM case_generation_attempt LEFT JOIN archive_case "
                "ON archive_case.opening_key = case_generation_attempt.opening_key ORDER BY sequence_number ASC"
            ).fetchall()
        stored_attempts = [
            StoredGenerationAttempt(
                interaction_identifier=attempt_row["interaction_identifier"],
                purpose_name=attempt_row["purpose_name"],
                attempt_number=attempt_row["attempt_number"],
                outcome_name=attempt_row["outcome_name"],
                failure_name=attempt_row["failure_name"],
                validation_errors=json.loads(attempt_row["validation_errors_json"]),
                archive_case_identifier=attempt_row["archive_case_identifier"],
                action_key=attempt_row["action_key"],
                simulation_run_identifier=attempt_row["simulation_run_identifier"],
            )
            for attempt_row in director_attempt_rows
        ] + [
            StoredGenerationAttempt(
                interaction_identifier=attempt_row["interaction_identifier"],
                purpose_name="case_generation",
                attempt_number=attempt_row["attempt_number"],
                outcome_name=attempt_row["outcome_name"],
                failure_name=None,
                validation_errors=json.loads(attempt_row["validation_errors_json"]),
                archive_case_identifier=attempt_row["archive_case_identifier"],
                action_key=None,
                simulation_run_identifier=None,
            )
            for attempt_row in case_attempt_rows
        ]
        if interaction_identifiers is None:
            return stored_attempts
        wanted_interaction_identifiers = set(interaction_identifiers)
        return [
            stored_attempt
            for stored_attempt in stored_attempts
            if stored_attempt.interaction_identifier in wanted_interaction_identifiers
        ]

    def read_body_file(self, body_file_name: str) -> dict[str, Any] | None:
        body_path = self.profile_data_store.ai_interactions_directory / Path(body_file_name).name
        if not body_path.is_file():
            return None
        try:
            body_content = json.loads(body_path.read_text(encoding="utf-8"))
        except ValueError:
            return None
        return body_content if isinstance(body_content, dict) else None

    def read_interaction_bodies(self, stored_interaction: StoredAiInteraction) -> AiInteractionBodies | None:
        request_body = self.read_body_file(stored_interaction.request_body_file_name)
        response_body = self.read_body_file(stored_interaction.response_body_file_name)
        if request_body is None or response_body is None:
            return None
        return AiInteractionBodies(request_body=request_body, response_body=response_body)

import json

from the_void_files.application.content_hashing import compute_text_content_hash
from the_void_files.application.ports.ai_interaction_recorder import AiInteractionRecord
from the_void_files.infrastructure.storage.atomic_file_writing import write_file_atomically
from the_void_files.infrastructure.storage.profile_data_store import ProfileDataStoreLocator


def build_readable_json_text(content: dict) -> str:
    return json.dumps(content, sort_keys=True, indent=2, ensure_ascii=False)


class SqliteFileAiInteractionRecorder:
    def __init__(self, profile_data_store_locator: ProfileDataStoreLocator) -> None:
        self.profile_data_store_locator = profile_data_store_locator

    def record_interaction(self, interaction_record: AiInteractionRecord) -> None:
        profile_data_store = self.profile_data_store_locator.open_profile_data_store(
            interaction_record.profile_identifier
        )
        request_body_text = build_readable_json_text(interaction_record.request_body)
        response_body_text = build_readable_json_text(interaction_record.response_body)
        request_body_file_name = f"{interaction_record.interaction_identifier}_request.json"
        response_body_file_name = f"{interaction_record.interaction_identifier}_response.json"
        write_file_atomically(
            profile_data_store.ai_interactions_directory / request_body_file_name, request_body_text.encode("utf-8")
        )
        write_file_atomically(
            profile_data_store.ai_interactions_directory / response_body_file_name, response_body_text.encode("utf-8")
        )
        with profile_data_store.transaction_manager.open_write_transaction() as connection:
            connection.execute(
                "INSERT INTO ai_interaction ("
                "interaction_identifier, provider_kind_name, provider_name, provider_mode_name, operation_name, "
                "model_identifier, purpose_name, turn_identifier, outcome_name, failure_name, "
                "request_body_file_name, response_body_file_name, request_content_hash, response_content_hash, "
                "started_at_utc, finished_at_utc, duration_milliseconds"
                ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    interaction_record.interaction_identifier,
                    interaction_record.provider_kind_name,
                    interaction_record.provider_name,
                    interaction_record.provider_mode_name,
                    interaction_record.operation_name,
                    interaction_record.model_identifier,
                    interaction_record.purpose_name,
                    interaction_record.turn_identifier,
                    interaction_record.outcome_name,
                    interaction_record.failure_name,
                    request_body_file_name,
                    response_body_file_name,
                    compute_text_content_hash(request_body_text),
                    compute_text_content_hash(response_body_text),
                    interaction_record.started_at_utc,
                    interaction_record.finished_at_utc,
                    interaction_record.duration_milliseconds,
                ),
            )

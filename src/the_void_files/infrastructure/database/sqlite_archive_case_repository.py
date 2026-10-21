import json
import sqlite3
from typing import Any

from the_void_files.application.content_hashing import build_canonical_json_text, compute_text_content_hash
from the_void_files.application.recording.interaction_timing import read_current_utc_timestamp
from the_void_files.application.use_cases.case_start_abandon_archive import StoredArchiveAbandonment
from the_void_files.application.use_cases.case_start_public_opening import (
    apply_carried_investigator_attributes,
    apply_carried_investigator_resources,
)
from the_void_files.application.use_cases.case_start_archive_case_store import (
    ActiveArchiveRun,
    ArchiveCaseSummary,
    ArchiveOpeningToPersist,
    StoredArchiveOpening,
    WhisperOfferBatch,
)
from the_void_files.application.use_cases.case_start_reset_case_material import (
    CaseMaterialResetReceipt,
    build_chronicle_state_without_open_archive,
)
from the_void_files.application.use_cases.case_start_failures import (
    ArchiveAlreadyOpenError,
    OpeningKeyReusedForOtherWhisperError,
    WhisperNotOfferedError,
)
from the_void_files.infrastructure.database.sqlite_transaction_manager import SqliteTransactionManager

archive_case_summary_column_names = (
    "archive_case_identifier, opening_key, archive_number, whisper_identifier, offer_batch_identifier, "
    "archive_title, sanction_label, lifecycle_status_name, opened_at_utc, closed_at_utc"
)
initial_state_version = 1
first_run_number = 1
chronicle_snapshot_slot_number = 1


def read_carried_investigator_resources(
    connection: sqlite3.Connection,
) -> tuple[list[dict[str, Any]], int | None, dict[str, Any] | None]:
    snapshot_row = connection.execute(
        "SELECT chronicle_state_json FROM chronicle_snapshot WHERE snapshot_slot_number = ?",
        (chronicle_snapshot_slot_number,),
    ).fetchone()
    if snapshot_row is None:
        return [], None, None
    chronicle_state = json.loads(snapshot_row["chronicle_state_json"])
    if not isinstance(chronicle_state, dict):
        return [], None, None
    raw_attributes = chronicle_state.get("investigatorAttributes")
    carried_attributes = raw_attributes if isinstance(raw_attributes, dict) else None
    investigator = chronicle_state.get("investigator")
    if not isinstance(investigator, dict):
        return [], None, carried_attributes
    belonging_units = investigator.get("belongingUnits")
    carried_belonging_units: list[dict[str, Any]] = []
    if isinstance(belonging_units, dict):
        for belonging_identifier, unit_count in belonging_units.items():
            if isinstance(belonging_identifier, str) and isinstance(unit_count, int) and unit_count > 0:
                carried_belonging_units.append(
                    {"belonging_identifier": belonging_identifier, "units": unit_count}
                )
    operational_funds = investigator.get("operationalFunds")
    carried_operational_funds = operational_funds if isinstance(operational_funds, int) else None
    return carried_belonging_units, carried_operational_funds, carried_attributes


case_material_table_names = (
    "confirmed_effect",
    "relationship_change",
    "log_entry",
    "run_checkpoint",
    "confirmed_turn",
    "archive_case_abandonment",
    "director_generation_attempt",
    "director_simulation_run",
    "narration_audio",
    "case_generation_attempt",
    "case_specification",
    "archive_run",
    "offered_whisper",
    "archive_case",
    "whisper_offer_batch",
)


def build_archive_case_summary(archive_case_row: sqlite3.Row) -> ArchiveCaseSummary:
    return ArchiveCaseSummary(
        archive_case_identifier=archive_case_row["archive_case_identifier"],
        opening_key=archive_case_row["opening_key"],
        archive_number=archive_case_row["archive_number"],
        whisper_identifier=archive_case_row["whisper_identifier"],
        offer_batch_identifier=archive_case_row["offer_batch_identifier"],
        archive_title=archive_case_row["archive_title"],
        sanction_label=archive_case_row["sanction_label"],
        lifecycle_status_name=archive_case_row["lifecycle_status_name"],
        opened_at_utc=archive_case_row["opened_at_utc"],
        closed_at_utc=archive_case_row["closed_at_utc"],
    )


def build_stored_archive_opening(archive_case_row: sqlite3.Row | None) -> StoredArchiveOpening | None:
    if archive_case_row is None:
        return None
    return StoredArchiveOpening(
        archive_case_summary=build_archive_case_summary(archive_case_row),
        opening_public_payload=json.loads(archive_case_row["opening_public_payload_json"]),
    )


def read_whisper_offer_batch_with_connection(
    connection: sqlite3.Connection, offer_batch_identifier: str
) -> WhisperOfferBatch | None:
    offered_whisper_rows = connection.execute(
        "SELECT whisper_identifier, public_card_json, was_chosen, archive_case_identifier FROM offered_whisper "
        "WHERE offer_batch_identifier = ? ORDER BY ordinal_number",
        (offer_batch_identifier,),
    ).fetchall()
    if not offered_whisper_rows:
        return None
    chosen_whisper_identifiers = [
        offered_whisper_row["whisper_identifier"]
        for offered_whisper_row in offered_whisper_rows
        if offered_whisper_row["was_chosen"] == 1
    ]
    return WhisperOfferBatch(
        offer_batch_identifier=offer_batch_identifier,
        offered_whisper_cards=[
            json.loads(offered_whisper_row["public_card_json"]) for offered_whisper_row in offered_whisper_rows
        ],
        chosen_whisper_identifier=chosen_whisper_identifiers[0] if chosen_whisper_identifiers else None,
        archive_case_identifier=offered_whisper_rows[0]["archive_case_identifier"],
    )


def read_pending_whisper_offer_batch_with_connection(connection: sqlite3.Connection) -> WhisperOfferBatch | None:
    pending_batch_row = connection.execute(
        "SELECT offer_batch_identifier FROM whisper_offer_batch "
        "WHERE offer_batch_identifier NOT IN (SELECT offer_batch_identifier FROM archive_case) "
        "ORDER BY created_at_utc DESC, rowid DESC LIMIT 1"
    ).fetchone()
    if pending_batch_row is None:
        return None
    return read_whisper_offer_batch_with_connection(connection, pending_batch_row["offer_batch_identifier"])


class SqliteArchiveCaseRepository:
    def __init__(self, transaction_manager: SqliteTransactionManager) -> None:
        self.transaction_manager = transaction_manager

    def read_investigator_generation_context(self) -> dict[str, Any]:
        with self.transaction_manager.open_autocommit_connection() as connection:
            row = connection.execute(
                "SELECT chronicle_state_json FROM chronicle_snapshot WHERE snapshot_slot_number = ?",
                (chronicle_snapshot_slot_number,),
            ).fetchone()
        if row is None:
            return {}
        from the_void_files.narrative.investigator_context import build_investigator_generation_context
        return build_investigator_generation_context(json.loads(row["chronicle_state_json"]))

    def read_open_archive_opening(self) -> StoredArchiveOpening | None:
        with self.transaction_manager.open_autocommit_connection() as connection:
            return build_stored_archive_opening(
                connection.execute(
                    f"SELECT {archive_case_summary_column_names}, opening_public_payload_json FROM archive_case "
                    "WHERE lifecycle_status_name = 'open'"
                ).fetchone()
            )

    def read_archive_opening_by_identifier(self, archive_case_identifier: str) -> StoredArchiveOpening | None:
        with self.transaction_manager.open_autocommit_connection() as connection:
            return build_stored_archive_opening(connection.execute(
                f"SELECT {archive_case_summary_column_names}, opening_public_payload_json FROM archive_case "
                "WHERE archive_case_identifier = ?", (archive_case_identifier,),
            ).fetchone())

    def read_archive_opening_by_opening_key(self, opening_key: str) -> StoredArchiveOpening | None:
        with self.transaction_manager.open_autocommit_connection() as connection:
            return build_stored_archive_opening(
                connection.execute(
                    f"SELECT {archive_case_summary_column_names}, opening_public_payload_json FROM archive_case "
                    "WHERE opening_key = ?",
                    (opening_key,),
                ).fetchone()
            )

    def list_archive_case_summaries(self) -> list[ArchiveCaseSummary]:
        with self.transaction_manager.open_autocommit_connection() as connection:
            return [
                build_archive_case_summary(archive_case_row)
                for archive_case_row in connection.execute(
                    f"SELECT {archive_case_summary_column_names} FROM archive_case ORDER BY archive_number"
                )
            ]

    def read_pending_whisper_offer_batch(self) -> WhisperOfferBatch | None:
        with self.transaction_manager.open_autocommit_connection() as connection:
            return read_pending_whisper_offer_batch_with_connection(connection)

    def read_whisper_offer_batch(self, offer_batch_identifier: str) -> WhisperOfferBatch | None:
        with self.transaction_manager.open_autocommit_connection() as connection:
            return read_whisper_offer_batch_with_connection(connection, offer_batch_identifier)

    def read_whisper_offer_batch_provider_mode_name(self, offer_batch_identifier: str) -> str | None:
        with self.transaction_manager.open_autocommit_connection() as connection:
            provider_mode_row = connection.execute(
                "SELECT ai_interaction.provider_mode_name FROM whisper_offer_batch "
                "JOIN ai_interaction ON ai_interaction.interaction_identifier = "
                "whisper_offer_batch.generation_interaction_identifier "
                "WHERE whisper_offer_batch.offer_batch_identifier = ?",
                (offer_batch_identifier,),
            ).fetchone()
        return provider_mode_row["provider_mode_name"] if provider_mode_row is not None else None

    def save_whisper_offer_batch_unless_one_is_pending(
        self,
        offer_batch_identifier: str,
        generation_interaction_identifier: str,
        rules_version: str,
        offered_whisper_cards: list[dict[str, Any]],
        created_at_utc: str,
        superseded_offer_batch_identifier: str | None = None,
    ) -> WhisperOfferBatch:
        with self.transaction_manager.open_write_transaction() as connection:
            pending_offer_batch = read_pending_whisper_offer_batch_with_connection(connection)
            if (
                pending_offer_batch is not None
                and pending_offer_batch.offer_batch_identifier != superseded_offer_batch_identifier
            ):
                return pending_offer_batch
            connection.execute(
                "INSERT INTO whisper_offer_batch ("
                "offer_batch_identifier, generation_interaction_identifier, rules_version, created_at_utc"
                ") VALUES (?, ?, ?, ?)",
                (offer_batch_identifier, generation_interaction_identifier, rules_version, created_at_utc),
            )
            connection.executemany(
                "INSERT INTO offered_whisper (offer_batch_identifier, whisper_identifier, ordinal_number, public_card_json) "
                "VALUES (?, ?, ?, ?)",
                [
                    (
                        offer_batch_identifier,
                        offered_whisper_card["identifier"],
                        card_index + 1,
                        build_canonical_json_text(offered_whisper_card),
                    )
                    for card_index, offered_whisper_card in enumerate(offered_whisper_cards)
                ],
            )
        return WhisperOfferBatch(
            offer_batch_identifier=offer_batch_identifier,
            offered_whisper_cards=offered_whisper_cards,
            chosen_whisper_identifier=None,
            archive_case_identifier=None,
        )

    def record_case_generation_attempt(
        self,
        opening_key: str,
        whisper_identifier: str,
        attempt_number: int,
        interaction_identifier: str,
        validation_errors: list[dict[str, str]],
        created_at_utc: str,
    ) -> None:
        with self.transaction_manager.open_write_transaction() as connection:
            connection.execute(
                "INSERT INTO case_generation_attempt ("
                "opening_key, whisper_identifier, attempt_number, interaction_identifier, outcome_name, "
                "validation_errors_json, created_at_utc"
                ") VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    opening_key,
                    whisper_identifier,
                    attempt_number,
                    interaction_identifier,
                    "rejected" if validation_errors else "accepted",
                    build_canonical_json_text(validation_errors),
                    created_at_utc,
                ),
            )

    def persist_archive_opening(self, archive_opening: ArchiveOpeningToPersist) -> StoredArchiveOpening:
        investigator_context = self.read_investigator_generation_context()
        with self.transaction_manager.open_write_transaction() as connection:
            already_stored_opening = build_stored_archive_opening(
                connection.execute(
                    f"SELECT {archive_case_summary_column_names}, opening_public_payload_json FROM archive_case "
                    "WHERE opening_key = ?",
                    (archive_opening.opening_key,),
                ).fetchone()
            )
            if already_stored_opening is not None:
                if already_stored_opening.archive_case_summary.whisper_identifier != archive_opening.whisper_identifier:
                    raise OpeningKeyReusedForOtherWhisperError()
                return already_stored_opening
            if (
                connection.execute("SELECT 1 FROM archive_case WHERE lifecycle_status_name = 'open'").fetchone()
                is not None
            ):
                raise ArchiveAlreadyOpenError()
            offered_whisper_row = connection.execute(
                "SELECT archive_case_identifier FROM offered_whisper "
                "WHERE offer_batch_identifier = ? AND whisper_identifier = ?",
                (archive_opening.offer_batch_identifier, archive_opening.whisper_identifier),
            ).fetchone()
            if offered_whisper_row is None or offered_whisper_row["archive_case_identifier"] is not None:
                raise WhisperNotOfferedError()
            archive_number = connection.execute(
                "SELECT COALESCE(MAX(archive_number), 0) + 1 AS next_archive_number FROM archive_case"
            ).fetchone()["next_archive_number"]
            prepared_archive_opening = archive_opening.prepare_archive_opening(archive_number)
            carried_belonging_units, carried_operational_funds, carried_attributes = read_carried_investigator_resources(
                connection
            )
            apply_carried_investigator_resources(
                prepared_archive_opening.opening_public_payload,
                prepared_archive_opening.initial_run,
                carried_belonging_units,
                carried_operational_funds,
            )
            apply_carried_investigator_attributes(prepared_archive_opening.initial_run, carried_attributes)
            prepared_archive_opening.initial_run["public_state"]["investigator_profile"] = investigator_context
            opening_public_payload_json = build_canonical_json_text(prepared_archive_opening.opening_public_payload)
            initial_run_json = build_canonical_json_text(prepared_archive_opening.initial_run)
            accepted_case_generation = archive_opening.accepted_case_generation
            specification_json = build_canonical_json_text(accepted_case_generation.specification)
            connection.execute(
                "INSERT INTO archive_case ("
                "archive_case_identifier, opening_key, archive_number, whisper_identifier, offer_batch_identifier, "
                "archive_title, sanction_label, lifecycle_status_name, opening_public_payload_json, opened_at_utc"
                ") VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)",
                (
                    archive_opening.archive_case_identifier,
                    archive_opening.opening_key,
                    archive_number,
                    archive_opening.whisper_identifier,
                    archive_opening.offer_batch_identifier,
                    archive_opening.archive_title,
                    archive_opening.sanction_label,
                    opening_public_payload_json,
                    archive_opening.opened_at_utc,
                ),
            )
            connection.execute(
                "INSERT INTO case_specification ("
                "archive_case_identifier, specification_format_version, specification_json, specification_content_hash, "
                "generation_interaction_identifier, accepted_attempt_number, provider_name, provider_mode_name, "
                "model_identifier, rules_version, created_at_utc"
                ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    archive_opening.archive_case_identifier,
                    accepted_case_generation.specification_format_version,
                    specification_json,
                    compute_text_content_hash(specification_json),
                    accepted_case_generation.generation_interaction_identifier,
                    accepted_case_generation.accepted_attempt_number,
                    accepted_case_generation.provider_name,
                    accepted_case_generation.provider_mode_name,
                    accepted_case_generation.model_identifier,
                    accepted_case_generation.rules_version,
                    archive_opening.opened_at_utc,
                ),
            )
            connection.execute(
                "UPDATE offered_whisper SET archive_case_identifier = ?, "
                "was_chosen = CASE WHEN whisper_identifier = ? THEN 1 ELSE 0 END "
                "WHERE offer_batch_identifier = ?",
                (
                    archive_opening.archive_case_identifier,
                    archive_opening.whisper_identifier,
                    archive_opening.offer_batch_identifier,
                ),
            )
            connection.execute(
                "INSERT INTO archive_run ("
                "archive_run_identifier, archive_case_identifier, run_number, lifecycle_status_name, "
                "initial_run_json, current_run_json, state_version, started_at_utc, updated_at_utc"
                ") VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?)",
                (
                    archive_opening.archive_run_identifier,
                    archive_opening.archive_case_identifier,
                    first_run_number,
                    initial_run_json,
                    initial_run_json,
                    initial_state_version,
                    archive_opening.opened_at_utc,
                    archive_opening.opened_at_utc,
                ),
            )
            return build_stored_archive_opening(
                connection.execute(
                    f"SELECT {archive_case_summary_column_names}, opening_public_payload_json FROM archive_case "
                    "WHERE archive_case_identifier = ?",
                    (archive_opening.archive_case_identifier,),
                ).fetchone()
            )

    def read_active_archive_run(self, archive_case_identifier: str, include_ended: bool = False) -> ActiveArchiveRun | None:
        with self.transaction_manager.open_autocommit_connection() as connection:
            archive_run_row = connection.execute(
                "SELECT archive_run_identifier, run_number, state_version, current_run_json FROM archive_run "
                "WHERE archive_case_identifier = ? AND (lifecycle_status_name = 'active' OR ? = 1) "
                "ORDER BY run_number DESC LIMIT 1",
                (archive_case_identifier, int(include_ended)),
            ).fetchone()
        if archive_run_row is None:
            return None
        return ActiveArchiveRun(
            archive_run_identifier=archive_run_row["archive_run_identifier"],
            run_number=archive_run_row["run_number"],
            state_version=archive_run_row["state_version"],
            current_run=json.loads(archive_run_row["current_run_json"]),
        )

    def abandon_open_archive(self, abandon_key: str, abandoned_at_utc: str) -> StoredArchiveAbandonment:
        with self.transaction_manager.open_write_transaction() as connection:
            stored_abandonment_row = connection.execute(
                "SELECT abandon_key, archive_case_identifier, archive_run_identifier, state_version_at_abandonment, "
                "abandoned_at_utc FROM archive_case_abandonment WHERE abandon_key = ?",
                (abandon_key,),
            ).fetchone()
            if stored_abandonment_row is not None:
                return StoredArchiveAbandonment(
                    abandon_key=stored_abandonment_row["abandon_key"],
                    archive_case_identifier=stored_abandonment_row["archive_case_identifier"],
                    archive_run_identifier=stored_abandonment_row["archive_run_identifier"],
                    state_version_at_abandonment=stored_abandonment_row["state_version_at_abandonment"],
                    abandoned_at_utc=stored_abandonment_row["abandoned_at_utc"],
                )
            open_archive_case_row = connection.execute(
                "SELECT archive_case_identifier FROM archive_case WHERE lifecycle_status_name = 'open'"
            ).fetchone()
            archive_case_identifier = (
                open_archive_case_row["archive_case_identifier"] if open_archive_case_row is not None else None
            )
            active_archive_run_row = (
                connection.execute(
                    "SELECT archive_run_identifier, state_version FROM archive_run "
                    "WHERE archive_case_identifier = ? AND lifecycle_status_name = 'active'",
                    (archive_case_identifier,),
                ).fetchone()
                if archive_case_identifier is not None
                else None
            )
            stored_archive_abandonment = StoredArchiveAbandonment(
                abandon_key=abandon_key,
                archive_case_identifier=archive_case_identifier,
                archive_run_identifier=(
                    active_archive_run_row["archive_run_identifier"] if active_archive_run_row is not None else None
                ),
                state_version_at_abandonment=(
                    active_archive_run_row["state_version"] if active_archive_run_row is not None else None
                ),
                abandoned_at_utc=abandoned_at_utc,
            )
            connection.execute(
                "INSERT INTO archive_case_abandonment ("
                "abandon_key, archive_case_identifier, archive_run_identifier, state_version_at_abandonment, "
                "abandoned_at_utc) VALUES (?, ?, ?, ?, ?)",
                (
                    stored_archive_abandonment.abandon_key,
                    stored_archive_abandonment.archive_case_identifier,
                    stored_archive_abandonment.archive_run_identifier,
                    stored_archive_abandonment.state_version_at_abandonment,
                    stored_archive_abandonment.abandoned_at_utc,
                ),
            )
            if archive_case_identifier is not None:
                connection.execute(
                    "UPDATE archive_run SET lifecycle_status_name = 'ended', updated_at_utc = ? "
                    "WHERE archive_case_identifier = ? AND lifecycle_status_name = 'active'",
                    (abandoned_at_utc, archive_case_identifier),
                )
                connection.execute(
                    "UPDATE archive_case SET lifecycle_status_name = 'closed', closed_at_utc = ? "
                    "WHERE archive_case_identifier = ? AND lifecycle_status_name = 'open'",
                    (abandoned_at_utc, archive_case_identifier),
                )
            return stored_archive_abandonment

    def reset_case_material_keeping_investigator_identity(self) -> CaseMaterialResetReceipt:
        with self.transaction_manager.open_write_transaction_without_foreign_keys() as connection:
            cleared_archive_case_count = connection.execute("SELECT COUNT(*) FROM archive_case").fetchone()[0]
            cleared_whisper_offer_batch_count = connection.execute(
                "SELECT COUNT(*) FROM whisper_offer_batch"
            ).fetchone()[0]
            table_name_placeholders = ", ".join("?" for _ in case_material_table_names)
            trigger_rows = connection.execute(
                "SELECT name, sql FROM sqlite_master WHERE type = 'trigger' "
                f"AND tbl_name IN ({table_name_placeholders}) AND sql IS NOT NULL",
                case_material_table_names,
            ).fetchall()
            for trigger_row in trigger_rows:
                connection.execute(f'DROP TRIGGER IF EXISTS "{trigger_row["name"]}"')
            for table_name in case_material_table_names:
                connection.execute(f"DELETE FROM {table_name}")
            sqlite_sequence_row = connection.execute(
                "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'sqlite_sequence'"
            ).fetchone()
            if sqlite_sequence_row is not None:
                connection.execute(
                    f"DELETE FROM sqlite_sequence WHERE name IN ({table_name_placeholders})",
                    case_material_table_names,
                )
            for trigger_row in trigger_rows:
                connection.execute(trigger_row["sql"])
            snapshot_row = connection.execute(
                "SELECT state_version, storage_format_version, chronicle_state_json FROM chronicle_snapshot "
                "WHERE snapshot_slot_number = ?",
                (chronicle_snapshot_slot_number,),
            ).fetchone()
            if snapshot_row is None:
                return CaseMaterialResetReceipt(
                    cleared_archive_case_count=cleared_archive_case_count,
                    cleared_whisper_offer_batch_count=cleared_whisper_offer_batch_count,
                    was_chronicle_snapshot_stripped=False,
                    kept_investigator_full_name=None,
                    snapshot_state_version=None,
                )
            stripped_chronicle_state = build_chronicle_state_without_open_archive(
                json.loads(snapshot_row["chronicle_state_json"])
            )
            stripped_chronicle_state_text = build_canonical_json_text(stripped_chronicle_state)
            next_state_version = snapshot_row["state_version"] + 1
            investigator_registration = stripped_chronicle_state.get("investigatorRegistration")
            kept_investigator_full_name = (
                investigator_registration.get("fullName")
                if isinstance(investigator_registration, dict)
                and isinstance(investigator_registration.get("fullName"), str)
                else None
            )
            connection.execute(
                "UPDATE chronicle_snapshot SET state_version = ?, chronicle_state_json = ?, content_hash = ?, "
                "last_saved_at_utc = ? WHERE snapshot_slot_number = ?",
                (
                    next_state_version,
                    stripped_chronicle_state_text,
                    compute_text_content_hash(stripped_chronicle_state_text),
                    read_current_utc_timestamp(),
                    chronicle_snapshot_slot_number,
                ),
            )
            return CaseMaterialResetReceipt(
                cleared_archive_case_count=cleared_archive_case_count,
                cleared_whisper_offer_batch_count=cleared_whisper_offer_batch_count,
                was_chronicle_snapshot_stripped=True,
                kept_investigator_full_name=kept_investigator_full_name,
                snapshot_state_version=next_state_version,
            )

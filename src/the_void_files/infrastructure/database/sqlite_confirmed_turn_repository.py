import json
import sqlite3
import uuid
from typing import Any

from the_void_files.application.content_hashing import build_canonical_json_text, compute_text_content_hash
from the_void_files.application.use_cases.consequence_confirmed_turn_store import (
    ArchiveRunReference,
    ConfirmedTurnToPersist,
    OpenCaseResolutionMaterial,
    StoredConfirmedTurn,
    StoredLogEntry,
)
from the_void_files.application.use_cases.consequence_failures import (
    ActionKeyReusedForOtherRequestError,
    StateVersionConflictError,
)
from the_void_files.application.use_cases.director_speakable_narration import (
    build_placeholder_texts,
    read_neutral_wording,
)
from the_void_files.infrastructure.database.sqlite_transaction_manager import SqliteTransactionManager

stored_turn_column_names = (
    "turn_identifier, action_key, archive_run_identifier, turn_kind_name, disposition_name, state_version_before, "
    "state_version_after, request_content_hash, response_json, confirmed_at_utc"
)


def build_stored_confirmed_turn(confirmed_turn_row: sqlite3.Row | None) -> StoredConfirmedTurn | None:
    if confirmed_turn_row is None:
        return None
    return StoredConfirmedTurn(
        turn_identifier=confirmed_turn_row["turn_identifier"],
        action_key=confirmed_turn_row["action_key"],
        archive_run_identifier=confirmed_turn_row["archive_run_identifier"],
        turn_kind_name=confirmed_turn_row["turn_kind_name"],
        disposition_name=confirmed_turn_row["disposition_name"],
        state_version_before=confirmed_turn_row["state_version_before"],
        state_version_after=confirmed_turn_row["state_version_after"],
        request_content_hash=confirmed_turn_row["request_content_hash"],
        response_payload=json.loads(confirmed_turn_row["response_json"]),
        confirmed_at_utc=confirmed_turn_row["confirmed_at_utc"],
    )


def read_stored_turn_with_connection(connection: sqlite3.Connection, action_key: str) -> StoredConfirmedTurn | None:
    return build_stored_confirmed_turn(
        connection.execute(
            f"SELECT {stored_turn_column_names} FROM confirmed_turn WHERE action_key = ?", (action_key,)
        ).fetchone()
    )


def read_chronicle_state_from_connection(connection: sqlite3.Connection) -> dict[str, Any] | None:
    chronicle_snapshot_row = connection.execute(
        "SELECT chronicle_state_json FROM chronicle_snapshot WHERE snapshot_slot_number = 1"
    ).fetchone()
    if chronicle_snapshot_row is None:
        return None
    try:
        chronicle_state = json.loads(chronicle_snapshot_row["chronicle_state_json"])
    except ValueError:
        return None
    return chronicle_state if isinstance(chronicle_state, dict) else None


def read_has_relational_anchor_person(connection: sqlite3.Connection) -> bool:
    chronicle_state = read_chronicle_state_from_connection(connection)
    if chronicle_state is None:
        return False
    investigator_registration = chronicle_state.get("investigatorRegistration")
    relational_anchor = (
        investigator_registration.get("relationalAnchor") if isinstance(investigator_registration, dict) else None
    )
    if not isinstance(relational_anchor, dict) or relational_anchor.get("kind") != "person":
        return False
    person_name = relational_anchor.get("personName")
    return isinstance(person_name, str) and person_name.strip() != ""


class SqliteConfirmedTurnRepository:
    def __init__(self, transaction_manager: SqliteTransactionManager) -> None:
        self.transaction_manager = transaction_manager

    def read_stored_turn_by_action_key(self, action_key: str) -> StoredConfirmedTurn | None:
        with self.transaction_manager.open_autocommit_connection() as connection:
            return read_stored_turn_with_connection(connection, action_key)

    def read_open_case_resolution_material(self) -> OpenCaseResolutionMaterial | None:
        with self.transaction_manager.open_autocommit_connection() as connection:
            open_case_row = connection.execute(
                "SELECT archive_case.archive_case_identifier, archive_case.archive_number, "
                "archive_case.whisper_identifier, case_specification.specification_json "
                "FROM archive_case JOIN case_specification "
                "ON case_specification.archive_case_identifier = archive_case.archive_case_identifier "
                "WHERE archive_case.lifecycle_status_name = 'open'"
            ).fetchone()
            if open_case_row is None:
                return None
            chronicle_state = read_chronicle_state_from_connection(connection)
            placeholder_texts = build_placeholder_texts(chronicle_state, read_neutral_wording())
            active_run_row = connection.execute(
                "SELECT archive_run_identifier, run_number, state_version, current_run_json FROM archive_run "
                "WHERE archive_case_identifier = ? AND lifecycle_status_name = 'active'",
                (open_case_row["archive_case_identifier"],),
            ).fetchone()
            return OpenCaseResolutionMaterial(
                archive_case_identifier=open_case_row["archive_case_identifier"],
                archive_number=open_case_row["archive_number"],
                whisper_identifier=open_case_row["whisper_identifier"],
                specification=json.loads(open_case_row["specification_json"]),
                archive_run_identifier=active_run_row["archive_run_identifier"] if active_run_row is not None else None,
                run_number=active_run_row["run_number"] if active_run_row is not None else None,
                state_version=active_run_row["state_version"] if active_run_row is not None else None,
                current_run=json.loads(active_run_row["current_run_json"]) if active_run_row is not None else None,
                has_relational_anchor_person=read_has_relational_anchor_person(connection),
                placeholder_texts=placeholder_texts,
            )

    def persist_confirmed_turn(self, turn_to_persist: ConfirmedTurnToPersist) -> StoredConfirmedTurn:
        with self.transaction_manager.open_write_transaction() as connection:
            already_stored_turn = read_stored_turn_with_connection(connection, turn_to_persist.action_key)
            if already_stored_turn is not None:
                if already_stored_turn.request_content_hash != turn_to_persist.request_content_hash:
                    raise ActionKeyReusedForOtherRequestError()
                return already_stored_turn
            self.confirm_archive_run_state(connection, turn_to_persist)
            connection.execute(
                "INSERT INTO confirmed_turn ("
                "turn_identifier, action_key, archive_run_identifier, turn_kind_name, disposition_name, "
                "state_version_before, state_version_after, request_content_hash, request_json, response_json, "
                "confirmed_at_utc"
                ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    turn_to_persist.turn_identifier,
                    turn_to_persist.action_key,
                    turn_to_persist.archive_run_identifier,
                    turn_to_persist.turn_kind_name,
                    turn_to_persist.disposition_name,
                    turn_to_persist.state_version_before,
                    turn_to_persist.state_version_after,
                    turn_to_persist.request_content_hash,
                    build_canonical_json_text(turn_to_persist.request_record),
                    build_canonical_json_text(turn_to_persist.response_payload),
                    turn_to_persist.confirmed_at_utc,
                ),
            )
            connection.executemany(
                "INSERT INTO confirmed_effect (turn_identifier, ordinal_number, effect_kind_name, effect_json) "
                "VALUES (?, ?, ?, ?)",
                [
                    (
                        turn_to_persist.turn_identifier,
                        effect_index + 1,
                        confirmed_effect["kind"],
                        build_canonical_json_text(confirmed_effect),
                    )
                    for effect_index, confirmed_effect in enumerate(turn_to_persist.confirmed_effects)
                ],
            )
            connection.executemany(
                "INSERT INTO relationship_change ("
                "relationship_change_identifier, turn_identifier, archive_run_identifier, ordinal_number, "
                "person_identifier, direction_name, dimension_name, level_change, resulting_level, change_json"
                ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    (
                        relationship_change["identifier"],
                        turn_to_persist.turn_identifier,
                        turn_to_persist.archive_run_identifier,
                        change_index + 1,
                        relationship_change["person_identifier"],
                        relationship_change["direction_name"],
                        relationship_change["dimension_name"],
                        relationship_change["level_change"],
                        relationship_change["resulting_level"],
                        build_canonical_json_text(relationship_change),
                    )
                    for change_index, relationship_change in enumerate(turn_to_persist.relationship_changes)
                ],
            )
            connection.executemany(
                "INSERT INTO log_entry ("
                "log_entry_identifier, archive_run_identifier, turn_identifier, ordinal_number, voice_name, "
                "scene_identifier, world_clock_minutes, entry_json"
                ") VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    (
                        f"{turn_to_persist.turn_identifier}_entry_{entry_index + 1}",
                        turn_to_persist.archive_run_identifier,
                        turn_to_persist.turn_identifier,
                        entry_index + 1,
                        log_entry["content"]["voice"],
                        turn_to_persist.scene_identifier,
                        log_entry["world_clock_minutes"],
                        build_canonical_json_text(log_entry["content"]),
                    )
                    for entry_index, log_entry in enumerate(turn_to_persist.log_entries)
                ],
            )
            if turn_to_persist.disposition_name == "resolved" and turn_to_persist.next_run is not None:
                self.insert_run_checkpoint(connection, turn_to_persist, turn_to_persist.next_run)
            if turn_to_persist.does_turn_close_archive:
                connection.execute(
                    "UPDATE archive_run SET lifecycle_status_name = 'ended' WHERE archive_run_identifier = ?",
                    (turn_to_persist.archive_run_identifier,),
                )
                connection.execute(
                    "UPDATE archive_case SET lifecycle_status_name = 'closed', closed_at_utc = ? "
                    "WHERE archive_case_identifier = ? AND lifecycle_status_name = 'open'",
                    (turn_to_persist.confirmed_at_utc, turn_to_persist.archive_case_identifier),
                )
            stored_turn = read_stored_turn_with_connection(connection, turn_to_persist.action_key)
        if stored_turn is None:
            raise StateVersionConflictError()
        return stored_turn

    def insert_run_checkpoint(
        self, connection: sqlite3.Connection, turn_to_persist: ConfirmedTurnToPersist, next_run: dict[str, Any]
    ) -> None:
        parent_checkpoint_row = connection.execute(
            "SELECT checkpoint_identifier FROM run_checkpoint WHERE archive_run_identifier = ? "
            "ORDER BY state_version DESC LIMIT 1",
            (turn_to_persist.archive_run_identifier,),
        ).fetchone()
        public_state_json = build_canonical_json_text(next_run["public_state"])
        director_private_state_json = build_canonical_json_text(next_run["director_private_state"])
        connection.execute(
            "INSERT INTO run_checkpoint ("
            "checkpoint_identifier, parent_checkpoint_identifier, archive_run_identifier, turn_identifier, "
            "state_version, checkpoint_reason_name, public_state_json, director_private_state_json, "
            "public_state_content_hash, director_private_state_content_hash, created_at_utc"
            ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                f"checkpoint_{uuid.uuid4().hex}",
                parent_checkpoint_row["checkpoint_identifier"] if parent_checkpoint_row is not None else None,
                turn_to_persist.archive_run_identifier,
                turn_to_persist.turn_identifier,
                turn_to_persist.state_version_after,
                "archive_closure" if turn_to_persist.does_turn_close_archive else "confirmed_turn",
                public_state_json,
                director_private_state_json,
                compute_text_content_hash(public_state_json),
                compute_text_content_hash(director_private_state_json),
                turn_to_persist.confirmed_at_utc,
            ),
        )

    def confirm_archive_run_state(self, connection: sqlite3.Connection, turn_to_persist: ConfirmedTurnToPersist) -> None:
        if turn_to_persist.next_run is None:
            unchanged_run_row = connection.execute(
                "SELECT 1 FROM archive_run WHERE archive_run_identifier = ? AND state_version = ? "
                "AND lifecycle_status_name = 'active'",
                (turn_to_persist.archive_run_identifier, turn_to_persist.state_version_before),
            ).fetchone()
            if unchanged_run_row is None:
                raise StateVersionConflictError()
            return
        updated_run_cursor = connection.execute(
            "UPDATE archive_run SET current_run_json = ?, state_version = ?, updated_at_utc = ? "
            "WHERE archive_run_identifier = ? AND state_version = ? AND lifecycle_status_name = 'active'",
            (
                build_canonical_json_text(turn_to_persist.next_run),
                turn_to_persist.state_version_after,
                turn_to_persist.confirmed_at_utc,
                turn_to_persist.archive_run_identifier,
                turn_to_persist.state_version_before,
            ),
        )
        if updated_run_cursor.rowcount != 1:
            raise StateVersionConflictError()

    def read_archive_run_reference(self, archive_case_identifier: str | None) -> ArchiveRunReference | None:
        with self.transaction_manager.open_autocommit_connection() as connection:
            if archive_case_identifier is None:
                archive_run_row = connection.execute(
                    "SELECT archive_run.archive_case_identifier, archive_run_identifier, run_number, "
                    "archive_run.lifecycle_status_name, state_version FROM archive_run JOIN archive_case "
                    "ON archive_case.archive_case_identifier = archive_run.archive_case_identifier "
                    "WHERE archive_case.lifecycle_status_name = 'open' AND archive_run.lifecycle_status_name = 'active'"
                ).fetchone()
            else:
                archive_run_row = connection.execute(
                    "SELECT archive_case_identifier, archive_run_identifier, run_number, lifecycle_status_name, "
                    "state_version FROM archive_run WHERE archive_case_identifier = ? "
                    "ORDER BY run_number DESC LIMIT 1",
                    (archive_case_identifier,),
                ).fetchone()
        if archive_run_row is None:
            return None
        return ArchiveRunReference(
            archive_case_identifier=archive_run_row["archive_case_identifier"],
            archive_run_identifier=archive_run_row["archive_run_identifier"],
            run_number=archive_run_row["run_number"],
            lifecycle_status_name=archive_run_row["lifecycle_status_name"],
            state_version=archive_run_row["state_version"],
        )

    def list_stored_turns(self, archive_run_identifier: str) -> list[StoredConfirmedTurn]:
        with self.transaction_manager.open_autocommit_connection() as connection:
            return [
                stored_turn
                for stored_turn in (
                    build_stored_confirmed_turn(confirmed_turn_row)
                    for confirmed_turn_row in connection.execute(
                        f"SELECT {stored_turn_column_names} FROM confirmed_turn WHERE archive_run_identifier = ? "
                        "ORDER BY sequence_number",
                        (archive_run_identifier,),
                    )
                )
                if stored_turn is not None
            ]

    def list_stored_log_entries(self, archive_run_identifier: str) -> list[StoredLogEntry]:
        with self.transaction_manager.open_autocommit_connection() as connection:
            return [
                StoredLogEntry(
                    log_entry_identifier=log_entry_row["log_entry_identifier"],
                    turn_identifier=log_entry_row["turn_identifier"],
                    ordinal_number=log_entry_row["ordinal_number"],
                    scene_identifier=log_entry_row["scene_identifier"],
                    world_clock_minutes=log_entry_row["world_clock_minutes"],
                    entry_content=json.loads(log_entry_row["entry_json"]),
                )
                for log_entry_row in connection.execute(
                    "SELECT log_entry.log_entry_identifier, log_entry.turn_identifier, log_entry.ordinal_number, "
                    "log_entry.scene_identifier, log_entry.world_clock_minutes, log_entry.entry_json "
                    "FROM log_entry JOIN confirmed_turn ON confirmed_turn.turn_identifier = log_entry.turn_identifier "
                    "WHERE log_entry.archive_run_identifier = ? "
                    "ORDER BY confirmed_turn.sequence_number, log_entry.ordinal_number",
                    (archive_run_identifier,),
                )
            ]

import json
import sqlite3
from datetime import datetime, timezone

from the_void_files.application.use_cases.profiles_chronicle_snapshot_keeping import (
    ChronicleSnapshot,
    ChronicleSnapshotReceipt,
    ClosedChronicle,
    PreparedChronicleSnapshot,
)
from the_void_files.application.use_cases.profiles_failures import ChronicleSnapshotVersionConflictError
from the_void_files.infrastructure.database.sqlite_transaction_manager import SqliteTransactionManager

current_snapshot_slot_number = 1


def read_current_utc_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def save_closed_chronicle_within(
    connection: sqlite3.Connection, closure_identifier: str, closure_record_text: str, saved_at_utc: str
) -> None:
    connection.execute(
        "INSERT INTO closed_chronicle (closure_identifier, closure_record_json, first_saved_at_utc, last_saved_at_utc) "
        "VALUES (?, ?, ?, ?) "
        "ON CONFLICT (closure_identifier) DO UPDATE SET "
        "closure_record_json = excluded.closure_record_json, last_saved_at_utc = excluded.last_saved_at_utc",
        (closure_identifier, closure_record_text, saved_at_utc, saved_at_utc),
    )


class SqliteChronicleSnapshotRepository:
    def __init__(self, transaction_manager: SqliteTransactionManager) -> None:
        self.transaction_manager = transaction_manager

    def read_chronicle_snapshot(self) -> ChronicleSnapshot | None:
        with self.transaction_manager.open_autocommit_connection() as connection:
            snapshot_row = connection.execute(
                "SELECT state_version, storage_format_version, chronicle_state_json, content_hash, "
                "first_saved_at_utc, last_saved_at_utc FROM chronicle_snapshot WHERE snapshot_slot_number = ?",
                (current_snapshot_slot_number,),
            ).fetchone()
        if snapshot_row is None:
            return None
        return ChronicleSnapshot(
            state_version=snapshot_row["state_version"],
            storage_format_version=snapshot_row["storage_format_version"],
            chronicle_state=json.loads(snapshot_row["chronicle_state_json"]),
            content_hash=snapshot_row["content_hash"],
            first_saved_at_utc=snapshot_row["first_saved_at_utc"],
            last_saved_at_utc=snapshot_row["last_saved_at_utc"],
        )

    def save_chronicle_snapshot(self, prepared_snapshot: PreparedChronicleSnapshot) -> ChronicleSnapshotReceipt:
        saved_at_utc = read_current_utc_timestamp()
        with self.transaction_manager.open_write_transaction() as connection:
            stored_row = connection.execute(
                "SELECT state_version FROM chronicle_snapshot WHERE snapshot_slot_number = ?",
                (current_snapshot_slot_number,),
            ).fetchone()
            stored_state_version = 0 if stored_row is None else stored_row["state_version"]
            if stored_state_version != prepared_snapshot.expected_state_version:
                raise ChronicleSnapshotVersionConflictError()
            next_state_version = stored_state_version + 1
            connection.execute(
                "INSERT INTO chronicle_snapshot (snapshot_slot_number, state_version, storage_format_version, "
                "chronicle_state_json, content_hash, first_saved_at_utc, last_saved_at_utc) "
                "VALUES (?, ?, ?, ?, ?, ?, ?) "
                "ON CONFLICT (snapshot_slot_number) DO UPDATE SET "
                "state_version = excluded.state_version, "
                "storage_format_version = excluded.storage_format_version, "
                "chronicle_state_json = excluded.chronicle_state_json, "
                "content_hash = excluded.content_hash, "
                "last_saved_at_utc = excluded.last_saved_at_utc",
                (
                    current_snapshot_slot_number,
                    next_state_version,
                    prepared_snapshot.storage_format_version,
                    prepared_snapshot.chronicle_state_text,
                    prepared_snapshot.content_hash,
                    saved_at_utc,
                    saved_at_utc,
                ),
            )
            if prepared_snapshot.closure_identifier is not None and prepared_snapshot.closure_record_text is not None:
                save_closed_chronicle_within(
                    connection,
                    prepared_snapshot.closure_identifier,
                    prepared_snapshot.closure_record_text,
                    saved_at_utc,
                )
        return ChronicleSnapshotReceipt(
            state_version=next_state_version,
            storage_format_version=prepared_snapshot.storage_format_version,
            content_hash=prepared_snapshot.content_hash,
            last_saved_at_utc=saved_at_utc,
        )

    def list_closed_chronicles(self) -> list[ClosedChronicle]:
        with self.transaction_manager.open_autocommit_connection() as connection:
            closed_chronicle_rows = connection.execute(
                "SELECT closure_identifier, closure_record_json, first_saved_at_utc, last_saved_at_utc "
                "FROM closed_chronicle ORDER BY first_saved_at_utc ASC, rowid ASC"
            ).fetchall()
        return [
            ClosedChronicle(
                closure_identifier=closed_chronicle_row["closure_identifier"],
                closure_record=json.loads(closed_chronicle_row["closure_record_json"]),
                first_saved_at_utc=closed_chronicle_row["first_saved_at_utc"],
                last_saved_at_utc=closed_chronicle_row["last_saved_at_utc"],
            )
            for closed_chronicle_row in closed_chronicle_rows
        ]

    def save_closed_chronicle(self, closure_identifier: str, closure_record_text: str) -> None:
        with self.transaction_manager.open_write_transaction() as connection:
            save_closed_chronicle_within(connection, closure_identifier, closure_record_text, read_current_utc_timestamp())

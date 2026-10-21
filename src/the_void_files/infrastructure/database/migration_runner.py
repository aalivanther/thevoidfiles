import re
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from the_void_files.application.content_hashing import compute_text_content_hash

MigrationScopeName = Literal["catalogue", "profile"]

migration_file_name_pattern = re.compile(r"^(\d{4})_([a-z0-9_]+)\.sql$")
catalogue_scope_marker = "catalogue"


class MigrationFileNameMalformedError(Exception):
    pass


class MigrationNumberDuplicatedError(Exception):
    pass


class AppliedMigrationChangedError(Exception):
    pass


@dataclass(frozen=True)
class MigrationFile:
    migration_number: int
    migration_file_name: str
    migration_scope_name: MigrationScopeName
    sql_text: str

    @property
    def is_reserved_and_empty(self) -> bool:
        return not self.sql_text.strip()

    @property
    def content_hash(self) -> str:
        return compute_text_content_hash(self.sql_text)


def read_migration_files(migrations_directory: Path) -> list[MigrationFile]:
    migration_files: list[MigrationFile] = []
    seen_migration_numbers: set[int] = set()
    for migration_path in sorted(migrations_directory.glob("*.sql")):
        file_name_match = migration_file_name_pattern.fullmatch(migration_path.name)
        if file_name_match is None:
            raise MigrationFileNameMalformedError(migration_path.name)
        migration_number = int(file_name_match.group(1))
        if migration_number in seen_migration_numbers:
            raise MigrationNumberDuplicatedError(migration_path.name)
        seen_migration_numbers.add(migration_number)
        migration_files.append(
            MigrationFile(
                migration_number=migration_number,
                migration_file_name=migration_path.name,
                migration_scope_name="catalogue" if catalogue_scope_marker in file_name_match.group(2) else "profile",
                sql_text=migration_path.read_text(encoding="utf-8"),
            )
        )
    return migration_files


def apply_pending_migrations(
    connection: sqlite3.Connection, migrations_directory: Path, migration_scope_name: MigrationScopeName
) -> list[str]:
    connection.execute(
        "CREATE TABLE IF NOT EXISTS schema_migration ("
        "migration_number INTEGER PRIMARY KEY, "
        "migration_file_name TEXT NOT NULL, "
        "content_hash TEXT NOT NULL, "
        "applied_at_utc TEXT NOT NULL)"
    )
    applied_content_hashes = {
        applied_row["migration_number"]: applied_row["content_hash"]
        for applied_row in connection.execute("SELECT migration_number, content_hash FROM schema_migration")
    }
    newly_applied_file_names: list[str] = []
    for migration_file in read_migration_files(migrations_directory):
        if migration_file.migration_scope_name != migration_scope_name or migration_file.is_reserved_and_empty:
            continue
        applied_content_hash = applied_content_hashes.get(migration_file.migration_number)
        if applied_content_hash is not None:
            if applied_content_hash != migration_file.content_hash:
                raise AppliedMigrationChangedError(migration_file.migration_file_name)
            continue
        try:
            connection.executescript("BEGIN IMMEDIATE;\n" + migration_file.sql_text)
            connection.execute(
                "INSERT INTO schema_migration (migration_number, migration_file_name, content_hash, applied_at_utc) "
                "VALUES (?, ?, ?, ?)",
                (
                    migration_file.migration_number,
                    migration_file.migration_file_name,
                    migration_file.content_hash,
                    datetime.now(timezone.utc).isoformat(timespec="seconds"),
                ),
            )
            connection.execute("COMMIT")
        except BaseException:
            if connection.in_transaction:
                connection.execute("ROLLBACK")
            raise
        newly_applied_file_names.append(migration_file.migration_file_name)
    return newly_applied_file_names

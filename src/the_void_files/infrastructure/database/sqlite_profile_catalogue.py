import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from the_void_files.application.service_failures import (
    ProfileAlreadyRegisteredError,
    ProfileIdentifierMalformedError,
    ProfileNotFoundError,
)
from the_void_files.application.use_cases.profiles_catalogue_management import ProfileDescription
from the_void_files.infrastructure.database.migration_runner import apply_pending_migrations
from the_void_files.infrastructure.database.sqlite_transaction_manager import SqliteTransactionManager

profile_identifier_pattern = re.compile(r"^[a-z0-9][a-z0-9_]{0,63}$")
catalogue_database_file_name = "profile_catalogue.sqlite3"
profile_description_column_names = (
    "profile_identifier, display_name, created_at_utc, last_opened_at_utc, archived_at_utc"
)


def read_current_utc_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def build_profile_description(profile_row: sqlite3.Row) -> ProfileDescription:
    return ProfileDescription(
        profile_identifier=profile_row["profile_identifier"],
        display_name=profile_row["display_name"],
        created_at_utc=profile_row["created_at_utc"],
        last_opened_at_utc=profile_row["last_opened_at_utc"],
        archived_at_utc=profile_row["archived_at_utc"],
    )


def require_well_formed_profile_identifier(profile_identifier: str) -> str:
    if profile_identifier_pattern.fullmatch(profile_identifier) is None:
        raise ProfileIdentifierMalformedError()
    return profile_identifier


class SqliteProfileCatalogue:
    def __init__(self, data_directory: Path, migrations_directory: Path) -> None:
        self.transaction_manager = SqliteTransactionManager(data_directory / catalogue_database_file_name)
        self.migrations_directory = migrations_directory
        self.are_migrations_applied = False

    def apply_migrations_once(self) -> None:
        if self.are_migrations_applied:
            return
        with self.transaction_manager.open_autocommit_connection() as connection:
            apply_pending_migrations(connection, self.migrations_directory, "catalogue")
        self.are_migrations_applied = True

    def register_profile(self, profile_identifier: str, display_name: str) -> str:
        require_well_formed_profile_identifier(profile_identifier)
        self.apply_migrations_once()
        try:
            with self.transaction_manager.open_write_transaction() as connection:
                connection.execute(
                    "INSERT INTO profile (profile_identifier, display_name, data_folder_name, created_at_utc) "
                    "VALUES (?, ?, ?, ?)",
                    (
                        profile_identifier,
                        display_name,
                        profile_identifier,
                        datetime.now(timezone.utc).isoformat(timespec="seconds"),
                    ),
                )
        except sqlite3.IntegrityError as integrity_error:
            raise ProfileAlreadyRegisteredError() from integrity_error
        return profile_identifier

    def read_profile_data_folder_name(self, profile_identifier: str) -> str:
        require_well_formed_profile_identifier(profile_identifier)
        self.apply_migrations_once()
        with self.transaction_manager.open_autocommit_connection() as connection:
            profile_row = connection.execute(
                "SELECT data_folder_name FROM profile WHERE profile_identifier = ? AND archived_at_utc IS NULL",
                (profile_identifier,),
            ).fetchone()
        if profile_row is None:
            raise ProfileNotFoundError()
        return profile_row["data_folder_name"]

    def list_profile_descriptions(self, are_archived_profiles_included: bool) -> list[ProfileDescription]:
        self.apply_migrations_once()
        with self.transaction_manager.open_autocommit_connection() as connection:
            profile_rows = connection.execute(
                f"SELECT {profile_description_column_names} FROM profile "
                "WHERE archived_at_utc IS NULL OR ? "
                "ORDER BY COALESCE(last_opened_at_utc, created_at_utc) DESC, profile_identifier ASC",
                (1 if are_archived_profiles_included else 0,),
            ).fetchall()
        return [build_profile_description(profile_row) for profile_row in profile_rows]

    def read_profile_description(self, profile_identifier: str) -> ProfileDescription:
        require_well_formed_profile_identifier(profile_identifier)
        self.apply_migrations_once()
        with self.transaction_manager.open_autocommit_connection() as connection:
            return self.read_profile_description_within(connection, profile_identifier)

    def read_profile_description_within(
        self, connection: sqlite3.Connection, profile_identifier: str
    ) -> ProfileDescription:
        profile_row = connection.execute(
            f"SELECT {profile_description_column_names} FROM profile WHERE profile_identifier = ?",
            (profile_identifier,),
        ).fetchone()
        if profile_row is None:
            raise ProfileNotFoundError()
        return build_profile_description(profile_row)

    def change_active_profile(
        self, profile_identifier: str, column_assignment_sql: str, column_value: str
    ) -> ProfileDescription:
        require_well_formed_profile_identifier(profile_identifier)
        self.apply_migrations_once()
        with self.transaction_manager.open_write_transaction() as connection:
            changed_row_count = connection.execute(
                f"UPDATE profile SET {column_assignment_sql} WHERE profile_identifier = ? AND archived_at_utc IS NULL",
                (column_value, profile_identifier),
            ).rowcount
            if changed_row_count == 0:
                raise ProfileNotFoundError()
            return self.read_profile_description_within(connection, profile_identifier)

    def rename_profile(self, profile_identifier: str, display_name: str) -> ProfileDescription:
        return self.change_active_profile(profile_identifier, "display_name = ?", display_name)

    def mark_profile_opened(self, profile_identifier: str) -> ProfileDescription:
        return self.change_active_profile(profile_identifier, "last_opened_at_utc = ?", read_current_utc_timestamp())

    def archive_profile(self, profile_identifier: str) -> ProfileDescription:
        return self.change_active_profile(profile_identifier, "archived_at_utc = ?", read_current_utc_timestamp())

    def restore_archived_profile(self, profile_identifier: str) -> ProfileDescription:
        require_well_formed_profile_identifier(profile_identifier)
        self.apply_migrations_once()
        with self.transaction_manager.open_write_transaction() as connection:
            connection.execute(
                "UPDATE profile SET archived_at_utc = NULL WHERE profile_identifier = ?", (profile_identifier,)
            )
            return self.read_profile_description_within(connection, profile_identifier)

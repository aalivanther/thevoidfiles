import sqlite3

import pytest

from the_void_files.infrastructure.database.migration_runner import (
    AppliedMigrationChangedError,
    MigrationFileNameMalformedError,
    MigrationNumberDuplicatedError,
    apply_pending_migrations,
)
from the_void_files.infrastructure.database.sqlite_connection import open_sqlite_connection
from the_void_files.infrastructure.database.sqlite_transaction_manager import SqliteTransactionManager
from the_void_files.service_settings import project_root_directory

project_migrations_directory = project_root_directory / "database" / "migrations"


def read_table_names(connection):
    return {
        table_row["name"]
        for table_row in connection.execute("SELECT name FROM sqlite_master WHERE type = 'table'")
    }


@pytest.fixture
def migrations_directory(tmp_path):
    created_directory = tmp_path / "migrations"
    created_directory.mkdir()
    return created_directory


@pytest.fixture
def connection(tmp_path):
    opened_connection = open_sqlite_connection(tmp_path / "database" / "test.sqlite3")
    yield opened_connection
    opened_connection.close()


def test_connection_uses_write_ahead_log_and_foreign_keys(connection):
    assert connection.execute("PRAGMA journal_mode").fetchone()[0] == "wal"
    assert connection.execute("PRAGMA foreign_keys").fetchone()[0] == 1


def test_migrations_apply_once_by_scope(connection, migrations_directory):
    (migrations_directory / "0001_profile_catalogue.sql").write_text("CREATE TABLE profile (profile_identifier TEXT);")
    (migrations_directory / "0002_chronicle.sql").write_text("CREATE TABLE chronicle (chronicle_identifier TEXT);")
    assert apply_pending_migrations(connection, migrations_directory, "profile") == ["0002_chronicle.sql"]
    assert apply_pending_migrations(connection, migrations_directory, "profile") == []
    assert "chronicle" in read_table_names(connection)
    assert "profile" not in read_table_names(connection)


def test_reserved_empty_migration_is_applied_once_it_gains_content(connection, migrations_directory):
    (migrations_directory / "0002_chronicle.sql").write_text("")
    (migrations_directory / "0005_ai_log_and_audio.sql").write_text("CREATE TABLE later_table (name TEXT);")
    assert apply_pending_migrations(connection, migrations_directory, "profile") == ["0005_ai_log_and_audio.sql"]
    (migrations_directory / "0002_chronicle.sql").write_text("CREATE TABLE chronicle (chronicle_identifier TEXT);")
    assert apply_pending_migrations(connection, migrations_directory, "profile") == ["0002_chronicle.sql"]


def test_failing_migration_leaves_no_partial_schema(connection, migrations_directory):
    (migrations_directory / "0002_chronicle.sql").write_text(
        "CREATE TABLE chronicle (chronicle_identifier TEXT); CREATE TABLE chronicle (chronicle_identifier TEXT);"
    )
    with pytest.raises(sqlite3.OperationalError):
        apply_pending_migrations(connection, migrations_directory, "profile")
    assert "chronicle" not in read_table_names(connection)
    assert connection.execute("SELECT COUNT(*) FROM schema_migration").fetchone()[0] == 0


def test_changed_applied_migration_is_refused(connection, migrations_directory):
    migration_path = migrations_directory / "0002_chronicle.sql"
    migration_path.write_text("CREATE TABLE chronicle (chronicle_identifier TEXT);")
    apply_pending_migrations(connection, migrations_directory, "profile")
    migration_path.write_text("CREATE TABLE chronicle (chronicle_identifier TEXT, title TEXT);")
    with pytest.raises(AppliedMigrationChangedError):
        apply_pending_migrations(connection, migrations_directory, "profile")


def test_malformed_and_duplicated_file_names_are_refused(connection, migrations_directory):
    (migrations_directory / "chronicle.sql").write_text("")
    with pytest.raises(MigrationFileNameMalformedError):
        apply_pending_migrations(connection, migrations_directory, "profile")
    (migrations_directory / "chronicle.sql").unlink()
    (migrations_directory / "0002_chronicle.sql").write_text("")
    (migrations_directory / "0002_archive.sql").write_text("")
    with pytest.raises(MigrationNumberDuplicatedError):
        apply_pending_migrations(connection, migrations_directory, "profile")


def test_project_migrations_apply_to_both_scopes(tmp_path):
    catalogue_connection = open_sqlite_connection(tmp_path / "catalogue.sqlite3")
    profile_connection = open_sqlite_connection(tmp_path / "profile.sqlite3")
    try:
        apply_pending_migrations(catalogue_connection, project_migrations_directory, "catalogue")
        apply_pending_migrations(profile_connection, project_migrations_directory, "profile")
        assert "profile" in read_table_names(catalogue_connection)
        assert "ai_interaction" not in read_table_names(catalogue_connection)
        assert {"ai_interaction", "narration_audio"} <= read_table_names(profile_connection)
    finally:
        catalogue_connection.close()
        profile_connection.close()


def test_write_transaction_rolls_back_on_error(tmp_path):
    transaction_manager = SqliteTransactionManager(tmp_path / "transactions.sqlite3")
    with transaction_manager.open_write_transaction() as connection:
        connection.execute("CREATE TABLE note (note_text TEXT)")
    with pytest.raises(RuntimeError):
        with transaction_manager.open_write_transaction() as connection:
            connection.execute("INSERT INTO note (note_text) VALUES ('discarded')")
            raise RuntimeError()
    with transaction_manager.open_write_transaction() as connection:
        connection.execute("INSERT INTO note (note_text) VALUES ('kept')")
    with transaction_manager.open_autocommit_connection() as connection:
        assert [note_row["note_text"] for note_row in connection.execute("SELECT note_text FROM note")] == ["kept"]

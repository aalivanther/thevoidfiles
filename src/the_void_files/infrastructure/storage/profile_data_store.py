import threading
from dataclasses import dataclass
from pathlib import Path

from the_void_files.infrastructure.database.migration_runner import apply_pending_migrations
from the_void_files.infrastructure.database.sqlite_profile_catalogue import SqliteProfileCatalogue
from the_void_files.infrastructure.database.sqlite_transaction_manager import SqliteTransactionManager

profiles_folder_name = "profiles"
unassigned_records_folder_name = "unassigned_service_records"
profile_database_file_name = "chronicle.sqlite3"
ai_interactions_folder_name = "ai_interactions"
narration_audio_folder_name = "narration_audio"


@dataclass(frozen=True)
class ProfileDataStore:
    store_directory: Path
    transaction_manager: SqliteTransactionManager

    @property
    def ai_interactions_directory(self) -> Path:
        return self.store_directory / ai_interactions_folder_name

    @property
    def narration_audio_directory(self) -> Path:
        return self.store_directory / narration_audio_folder_name


class ProfileDataStoreLocator:
    def __init__(self, data_directory: Path, migrations_directory: Path, profile_catalogue: SqliteProfileCatalogue) -> None:
        self.data_directory = data_directory
        self.migrations_directory = migrations_directory
        self.profile_catalogue = profile_catalogue
        self.prepared_stores: dict[Path, ProfileDataStore] = {}
        self.preparation_lock = threading.Lock()

    def open_profile_data_store(self, profile_identifier: str | None) -> ProfileDataStore:
        if profile_identifier is None:
            store_directory = self.data_directory / unassigned_records_folder_name
        else:
            store_directory = (
                self.data_directory
                / profiles_folder_name
                / self.profile_catalogue.read_profile_data_folder_name(profile_identifier)
            )
        with self.preparation_lock:
            prepared_store = self.prepared_stores.get(store_directory)
            if prepared_store is not None:
                return prepared_store
            prepared_store = ProfileDataStore(
                store_directory=store_directory,
                transaction_manager=SqliteTransactionManager(store_directory / profile_database_file_name),
            )
            prepared_store.ai_interactions_directory.mkdir(parents=True, exist_ok=True)
            prepared_store.narration_audio_directory.mkdir(parents=True, exist_ok=True)
            with prepared_store.transaction_manager.open_autocommit_connection() as connection:
                apply_pending_migrations(connection, self.migrations_directory, "profile")
            self.prepared_stores[store_directory] = prepared_store
            return prepared_store

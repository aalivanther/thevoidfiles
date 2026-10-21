from datetime import datetime, timezone

from the_void_files.application.ports.narration_audio_library import NarrationAudioToStore, StoredNarrationAudio
from the_void_files.infrastructure.storage.atomic_file_writing import write_file_atomically
from the_void_files.infrastructure.storage.profile_data_store import ProfileDataStoreLocator

file_extensions_by_media_type_name = {"audio/mpeg": "mp3", "audio/wav": "wav"}
fallback_file_extension = "audio"


class SqliteFileNarrationAudioLibrary:
    def __init__(self, profile_data_store_locator: ProfileDataStoreLocator) -> None:
        self.profile_data_store_locator = profile_data_store_locator

    def find_stored_audio(self, profile_identifier: str | None, content_hash: str) -> StoredNarrationAudio | None:
        profile_data_store = self.profile_data_store_locator.open_profile_data_store(profile_identifier)
        with profile_data_store.transaction_manager.open_autocommit_connection() as connection:
            audio_row = connection.execute(
                "SELECT media_type_name, audio_file_name FROM narration_audio WHERE content_hash = ?", (content_hash,)
            ).fetchone()
        if audio_row is None:
            return None
        audio_path = profile_data_store.narration_audio_directory / audio_row["audio_file_name"]
        if not audio_path.is_file():
            return None
        return StoredNarrationAudio(
            content_hash=content_hash,
            media_type_name=audio_row["media_type_name"],
            audio_bytes=audio_path.read_bytes(),
            was_found_in_library=True,
        )

    def store_audio(self, narration_audio: NarrationAudioToStore) -> None:
        profile_data_store = self.profile_data_store_locator.open_profile_data_store(narration_audio.profile_identifier)
        file_extension = file_extensions_by_media_type_name.get(narration_audio.media_type_name, fallback_file_extension)
        audio_file_name = f"{narration_audio.content_hash}.{file_extension}"
        write_file_atomically(profile_data_store.narration_audio_directory / audio_file_name, narration_audio.audio_bytes)
        with profile_data_store.transaction_manager.open_write_transaction() as connection:
            connection.execute(
                "INSERT OR REPLACE INTO narration_audio ("
                "content_hash, provider_name, speech_model_identifier, voice_identifier, media_type_name, "
                "audio_file_name, audio_byte_count, text_character_count, interaction_identifier, created_at_utc"
                ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    narration_audio.content_hash,
                    narration_audio.provider_name,
                    narration_audio.speech_model_identifier,
                    narration_audio.voice_identifier,
                    narration_audio.media_type_name,
                    audio_file_name,
                    len(narration_audio.audio_bytes),
                    narration_audio.text_character_count,
                    narration_audio.interaction_identifier,
                    datetime.now(timezone.utc).isoformat(timespec="seconds"),
                ),
            )

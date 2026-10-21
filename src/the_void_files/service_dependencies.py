from dataclasses import dataclass

from the_void_files.application.ports.access_key_vault import AccessKeyVault
from the_void_files.application.ports.narration_audio_library import NarrationAudioLibrary
from the_void_files.application.recording.recording_narrative_provider import RecordingNarrativeProvider
from the_void_files.application.recording.recording_speech_provider import RecordingSpeechProvider
from the_void_files.infrastructure.database.sqlite_profile_catalogue import SqliteProfileCatalogue
from the_void_files.infrastructure.storage.profile_data_store import ProfileDataStoreLocator
from the_void_files.service_settings import ServiceSettings


@dataclass(frozen=True)
class ServiceDependencies:
    service_settings: ServiceSettings
    access_key_vault: AccessKeyVault
    profile_catalogue: SqliteProfileCatalogue
    profile_data_store_locator: ProfileDataStoreLocator
    narrative_provider: RecordingNarrativeProvider
    curated_case_material_provider: RecordingNarrativeProvider
    speech_provider: RecordingSpeechProvider
    narration_audio_library: NarrationAudioLibrary

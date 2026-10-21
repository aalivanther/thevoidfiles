import asyncio
import json
import sqlite3

import pytest

from the_void_files.application.ports.narrative_provider import NarrativeContextBlock, NarrativeGenerationRequest
from the_void_files.application.ports.speech_provider import SpeechSynthesisRequest
from the_void_files.application.recording.recording_narrative_provider import RecordingNarrativeProvider
from the_void_files.application.recording.recording_speech_provider import RecordingSpeechProvider
from the_void_files.application.service_failures import NarrativeProviderNotConfiguredError, ProfileNotFoundError
from the_void_files.application.use_cases.synthesize_narration_speech import (
    SpeechInteractionNotRecordedError,
    synthesize_narration_speech,
)
from the_void_files.infrastructure.ai.synthetic_narrative_provider import SyntheticNarrativeProvider
from the_void_files.infrastructure.ai.unconfigured_narrative_provider import UnconfiguredNarrativeProvider
from the_void_files.infrastructure.database.sqlite_profile_catalogue import SqliteProfileCatalogue
from the_void_files.infrastructure.speech.sqlite_file_narration_audio_library import SqliteFileNarrationAudioLibrary
from the_void_files.infrastructure.speech.synthetic_speech_provider import SyntheticSpeechProvider
from the_void_files.infrastructure.storage.profile_data_store import ProfileDataStoreLocator
from the_void_files.infrastructure.storage.sqlite_file_ai_interaction_recorder import SqliteFileAiInteractionRecorder
from the_void_files.service_settings import project_root_directory

migrations_directory = project_root_directory / "database" / "migrations"


class CountingSpeechProvider(SyntheticSpeechProvider):
    def __init__(self) -> None:
        self.synthesis_call_count = 0

    async def synthesize_speech(self, synthesis_request):
        self.synthesis_call_count += 1
        return await super().synthesize_speech(synthesis_request)


@pytest.fixture
def profile_data_store_locator(data_directory):
    profile_catalogue = SqliteProfileCatalogue(data_directory, migrations_directory)
    profile_catalogue.register_profile("first_profile", "First profile")
    return ProfileDataStoreLocator(data_directory, migrations_directory, profile_catalogue)


@pytest.fixture
def interaction_recorder(profile_data_store_locator):
    return SqliteFileAiInteractionRecorder(profile_data_store_locator)


def read_interaction_rows(profile_data_store_locator, profile_identifier):
    profile_data_store = profile_data_store_locator.open_profile_data_store(profile_identifier)
    with profile_data_store.transaction_manager.open_autocommit_connection() as connection:
        return connection.execute("SELECT * FROM ai_interaction ORDER BY sequence_number").fetchall()


def test_narrative_interaction_writes_row_and_body_files(profile_data_store_locator, interaction_recorder, data_directory):
    recording_provider = RecordingNarrativeProvider(SyntheticNarrativeProvider(), interaction_recorder)
    generation_request = NarrativeGenerationRequest(
        profile_identifier="first_profile",
        purpose_name="turn_adjudication",
        turn_identifier="turn_0001",
        instruction_text="Adjudicate the action.",
        context_blocks=[NarrativeContextBlock(authority_label_name="control", content_text="state_version=1")],
    )
    first_response = asyncio.run(recording_provider.generate_narrative(generation_request))
    second_response = asyncio.run(recording_provider.generate_narrative(generation_request))
    interaction_rows = read_interaction_rows(profile_data_store_locator, "first_profile")
    assert first_response.response_text == second_response.response_text
    assert [interaction_row["interaction_identifier"] for interaction_row in interaction_rows] == [
        first_response.interaction_identifier,
        second_response.interaction_identifier,
    ]
    first_row = interaction_rows[0]
    assert first_row["provider_kind_name"] == "narrative"
    assert first_row["provider_mode_name"] == "synthetic"
    assert first_row["outcome_name"] == "succeeded"
    assert first_row["turn_identifier"] == "turn_0001"
    interactions_directory = data_directory / "profiles" / "first_profile" / "ai_interactions"
    recorded_request_body = json.loads((interactions_directory / first_row["request_body_file_name"]).read_text())
    recorded_response_body = json.loads((interactions_directory / first_row["response_body_file_name"]).read_text())
    assert recorded_request_body["instruction_text"] == "Adjudicate the action."
    assert recorded_response_body["response_text"] == first_response.response_text


def test_failed_interaction_is_recorded_and_raised_again(profile_data_store_locator, interaction_recorder):
    recording_provider = RecordingNarrativeProvider(UnconfiguredNarrativeProvider(), interaction_recorder)
    with pytest.raises(NarrativeProviderNotConfiguredError):
        asyncio.run(
            recording_provider.generate_narrative(
                NarrativeGenerationRequest(purpose_name="case_generation", instruction_text="Generate a case.")
            )
        )
    interaction_rows = read_interaction_rows(profile_data_store_locator, None)
    assert [(interaction_row["outcome_name"], interaction_row["failure_name"]) for interaction_row in interaction_rows] == [
        ("failed", "narrative_provider_not_configured")
    ]


def test_interaction_log_is_append_only(profile_data_store_locator, interaction_recorder):
    recording_provider = RecordingNarrativeProvider(SyntheticNarrativeProvider(), interaction_recorder)
    asyncio.run(
        recording_provider.generate_narrative(
            NarrativeGenerationRequest(profile_identifier="first_profile", purpose_name="narration", instruction_text="Narrate.")
        )
    )
    profile_data_store = profile_data_store_locator.open_profile_data_store("first_profile")
    with profile_data_store.transaction_manager.open_autocommit_connection() as connection:
        with pytest.raises(sqlite3.IntegrityError):
            connection.execute("UPDATE ai_interaction SET outcome_name = 'failed', failure_name = 'rewritten'")
        with pytest.raises(sqlite3.IntegrityError):
            connection.execute("DELETE FROM ai_interaction")


def test_unknown_profile_is_refused_before_anything_is_written(interaction_recorder, data_directory):
    recording_provider = RecordingNarrativeProvider(SyntheticNarrativeProvider(), interaction_recorder)
    with pytest.raises(ProfileNotFoundError):
        asyncio.run(
            recording_provider.generate_narrative(
                NarrativeGenerationRequest(profile_identifier="absent_profile", purpose_name="narration", instruction_text="Narrate.")
            )
        )
    assert not (data_directory / "profiles" / "absent_profile").exists()


def test_speech_is_recorded_stored_and_served_from_library(profile_data_store_locator, interaction_recorder, data_directory):
    counting_provider = CountingSpeechProvider()
    recording_provider = RecordingSpeechProvider(counting_provider, interaction_recorder)
    narration_audio_library = SqliteFileNarrationAudioLibrary(profile_data_store_locator)
    synthesis_request = SpeechSynthesisRequest(
        profile_identifier="first_profile", text="  La lluvia no cesa.  ", voice_identifier="syntheticNarrator01"
    )
    first_audio = asyncio.run(synthesize_narration_speech(recording_provider, narration_audio_library, synthesis_request))
    second_audio = asyncio.run(synthesize_narration_speech(recording_provider, narration_audio_library, synthesis_request))
    interaction_rows = read_interaction_rows(profile_data_store_locator, "first_profile")
    assert first_audio.was_found_in_library is False
    assert second_audio.was_found_in_library is True
    assert first_audio.audio_bytes == second_audio.audio_bytes
    assert first_audio.audio_bytes[:4] == b"RIFF"
    assert counting_provider.synthesis_call_count == 1
    assert len(interaction_rows) == 1
    audio_directory = data_directory / "profiles" / "first_profile" / "narration_audio"
    assert [audio_path.name for audio_path in audio_directory.iterdir()] == [f"{first_audio.content_hash}.wav"]
    interactions_directory = data_directory / "profiles" / "first_profile" / "ai_interactions"
    recorded_response_body = json.loads(
        (interactions_directory / interaction_rows[0]["response_body_file_name"]).read_text()
    )
    assert recorded_response_body["audio_byte_count"] == len(first_audio.audio_bytes)
    assert "audio_bytes" not in recorded_response_body


def test_unrecorded_speech_provider_cannot_fill_the_library(profile_data_store_locator):
    narration_audio_library = SqliteFileNarrationAudioLibrary(profile_data_store_locator)
    with pytest.raises(SpeechInteractionNotRecordedError):
        asyncio.run(
            synthesize_narration_speech(
                SyntheticSpeechProvider(),
                narration_audio_library,
                SpeechSynthesisRequest(text="Texto", voice_identifier="syntheticNarrator01"),
            )
        )

import sqlite3

from fastapi.testclient import TestClient

from conftest import build_test_service_settings, service_base_address
from the_void_files.application.recording.recording_narrative_provider import RecordingNarrativeProvider
from the_void_files.application.recording.recording_speech_provider import RecordingSpeechProvider
from the_void_files.application_factory import create_application
from the_void_files.infrastructure.ai.deepseek_provider import DeepSeekNarrativeProvider
from the_void_files.infrastructure.ai.synthetic_narrative_provider import SyntheticNarrativeProvider
from the_void_files.infrastructure.secrets.in_memory_access_key_vault import InMemoryAccessKeyVault
from the_void_files.service_settings import ServiceSettings, project_root_directory, read_service_settings_from_environment


def test_environment_pairs_provider_mode_with_case_material_source(monkeypatch, tmp_path):
    monkeypatch.setenv("THE_VOID_FILES_DATA_DIRECTORY", str(tmp_path / "data"))
    monkeypatch.delenv("THE_VOID_FILES_CASE_MATERIAL_SOURCE", raising=False)
    monkeypatch.setenv("THE_VOID_FILES_PROVIDER_MODE", "synthetic")
    synthetic_settings = read_service_settings_from_environment()
    assert (synthetic_settings.provider_mode_name, synthetic_settings.case_material_source_name) == (
        "synthetic",
        "curated",
    )
    monkeypatch.setenv("THE_VOID_FILES_PROVIDER_MODE", "real")
    real_settings = read_service_settings_from_environment()
    assert (real_settings.provider_mode_name, real_settings.case_material_source_name) == ("real", "generated")
    assert real_settings.story_provider_name == "gemini"
    monkeypatch.setenv("THE_VOID_FILES_STORY_PROVIDER_NAME", "deepseek")
    deepseek_settings = read_service_settings_from_environment()
    assert deepseek_settings.story_provider_name == "deepseek"


def test_real_deepseek_story_provider_is_wired(data_directory):
    application = create_application(
        service_settings=ServiceSettings(
            data_directory=data_directory,
            migrations_directory=project_root_directory / "database" / "migrations",
            frontend_distribution_directory=data_directory / "absent_frontend_distribution",
            provider_mode_name="real",
            story_provider_name="deepseek",
            case_material_source_name="generated",
        ),
        access_key_vault=InMemoryAccessKeyVault(),
    )
    narrative_provider = application.state.service_dependencies.narrative_provider
    assert narrative_provider.provider_name == "deepseek"
    assert isinstance(narrative_provider.wrapped_provider, DeepSeekNarrativeProvider)


def test_health_reports_synthetic_mode(synthetic_mode_service_client):
    response = synthetic_mode_service_client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {
        "is_service_running": True,
        "provider_mode_name": "synthetic",
        "narrative_provider_name": "synthetic_narrative",
        "speech_provider_name": "synthetic_speech",
        "case_material_source_name": "curated",
        "turn_adjudication_switch_name": "on",
        "is_frontend_distribution_served": False,
    }


def test_every_provider_is_wrapped_by_a_recording_decorator(synthetic_mode_service_client):
    service_dependencies = synthetic_mode_service_client.app.state.service_dependencies
    assert isinstance(service_dependencies.narrative_provider, RecordingNarrativeProvider)
    assert isinstance(service_dependencies.speech_provider, RecordingSpeechProvider)


def test_injected_provider_is_wrapped_too(data_directory):
    application = create_application(
        service_settings=build_test_service_settings(data_directory, "real"),
        access_key_vault=InMemoryAccessKeyVault(),
        narrative_provider=SyntheticNarrativeProvider(),
    )
    narrative_provider = application.state.service_dependencies.narrative_provider
    assert isinstance(narrative_provider, RecordingNarrativeProvider)
    assert isinstance(narrative_provider.wrapped_provider, SyntheticNarrativeProvider)


def test_synthetic_speech_needs_no_key_and_is_recorded(synthetic_mode_service_client, data_directory):
    voices_response = synthetic_mode_service_client.get("/voices")
    speech_response = synthetic_mode_service_client.post(
        "/speech", json={"text": "La lluvia no cesa.", "voice_identifier": "syntheticNarrator01"}
    )
    assert voices_response.status_code == 200
    assert len(voices_response.json()["voices"]) == 2
    assert speech_response.status_code == 200
    assert speech_response.headers["content-type"] == "audio/wav"
    assert speech_response.content[:4] == b"RIFF"
    connection = sqlite3.connect(data_directory / "unassigned_service_records" / "chronicle.sqlite3")
    try:
        recorded_operation_names = [
            interaction_row[0]
            for interaction_row in connection.execute("SELECT operation_name FROM ai_interaction ORDER BY sequence_number")
        ]
    finally:
        connection.close()
    assert recorded_operation_names == ["list_available_voices", "synthesize_speech"]


def test_profile_header_routes_records_to_the_profile_folder(synthetic_mode_service_client, data_directory):
    synthetic_mode_service_client.app.state.service_dependencies.profile_catalogue.register_profile(
        "first_profile", "First profile"
    )
    speech_body = {"text": "Texto", "voice_identifier": "syntheticNarrator01"}
    known_profile_response = synthetic_mode_service_client.post(
        "/speech", json=speech_body, headers={"X-Profile-Identifier": "first_profile"}
    )
    absent_profile_response = synthetic_mode_service_client.post(
        "/speech", json=speech_body, headers={"X-Profile-Identifier": "absent_profile"}
    )
    malformed_profile_response = synthetic_mode_service_client.post(
        "/speech", json=speech_body, headers={"X-Profile-Identifier": "../escape"}
    )
    assert known_profile_response.status_code == 200
    assert len(list((data_directory / "profiles" / "first_profile" / "narration_audio").iterdir())) == 1
    assert absent_profile_response.json() == {"failure_name": "profile_not_found"}
    assert malformed_profile_response.json() == {"failure_name": "profile_identifier_malformed"}


def test_catalogue_database_is_created_at_startup(synthetic_mode_service_client, data_directory):
    assert (data_directory / "profile_catalogue.sqlite3").is_file()


def test_frontend_distribution_is_served_when_present(data_directory):
    service_settings = build_test_service_settings(data_directory, "synthetic")
    service_settings.frontend_distribution_directory.mkdir(parents=True)
    (service_settings.frontend_distribution_directory / "index.html").write_text("<!doctype html><title>The Void Files</title>")
    (service_settings.frontend_distribution_directory / "assets").mkdir()
    (service_settings.frontend_distribution_directory / "assets" / "app.js").write_text("window.app = true")
    application = create_application(service_settings=service_settings, access_key_vault=InMemoryAccessKeyVault())
    with TestClient(application, base_url=service_base_address) as test_client:
        index_response = test_client.get("/")
        asset_response = test_client.get("/assets/app.js")
        assert "The Void Files" in index_response.text
        assert index_response.headers["cache-control"] == "no-store"
        assert asset_response.status_code == 200
        assert "immutable" in asset_response.headers["cache-control"]
        assert test_client.get("/api/health").json()["is_frontend_distribution_served"] is True

from fastapi.testclient import TestClient

from conftest import build_test_service_settings, service_base_address, well_formed_access_key
from the_void_files.application_factory import create_application
from the_void_files.infrastructure.ai.openai_provider import OpenAINarrativeProvider
from the_void_files.service_settings import ServiceSettings, project_root_directory


def test_catalog_lists_the_live_story_providers(synthetic_mode_service_client):
    catalog = synthetic_mode_service_client.get("/api/director/story-provider-catalog").json()
    assert [provider["provider_name"] for provider in catalog["providers"]] == [
        "gemini",
        "deepseek",
        "openai",
        "groq",
    ]
    assert catalog["providers"][3]["default_model_identifier"] == "openai/gpt-oss-120b"


def test_synthetic_mode_rejects_a_live_story_provider_selection(synthetic_mode_service_client):
    answer = synthetic_mode_service_client.put(
        "/api/director/story-provider-selection",
        json={"provider_name": "deepseek", "model_identifier": "deepseek-v4-pro"},
    )
    assert (answer.status_code, answer.json()) == (422, {"failure_name": "story_provider_selection_rejected"})


def test_selection_requires_the_matching_access_key(data_directory, access_key_vault):
    application = create_application(
        service_settings=ServiceSettings(
            data_directory=data_directory,
            migrations_directory=project_root_directory / "database" / "migrations",
            frontend_distribution_directory=data_directory / "absent_frontend_distribution",
            provider_mode_name="real",
            story_provider_name="gemini",
            case_material_source_name="generated",
        ),
        access_key_vault=access_key_vault,
    )
    with TestClient(application, base_url=service_base_address) as test_client:
        answer = test_client.put(
            "/api/director/story-provider-selection",
            json={"provider_name": "openai", "model_identifier": "gpt-4o"},
        )
    assert (answer.status_code, answer.json()) == (422, {"failure_name": "story_provider_selection_rejected"})


def test_selection_switches_the_live_story_provider(data_directory, access_key_vault):
    access_key_vault.store_access_key("openai", well_formed_access_key)
    application = create_application(
        service_settings=build_test_service_settings(data_directory, "real"),
        access_key_vault=access_key_vault,
    )
    with TestClient(application, base_url=service_base_address) as test_client:
        saved_selection = test_client.put(
            "/api/director/story-provider-selection",
            json={"provider_name": "openai", "model_identifier": "gpt-4o"},
        ).json()
        provider_status = test_client.get("/api/director/provider-status").json()
        reported_selection = test_client.get("/api/director/story-provider-selection").json()
    assert saved_selection["provider_name"] == "openai"
    assert provider_status["story"]["provider_name"] == "openai"
    assert provider_status["story"]["model_identifier"] == "gpt-4o"
    assert reported_selection["model_identifier"] == "gpt-4o"
    assert isinstance(
        application.state.service_dependencies.narrative_provider.wrapped_provider, OpenAINarrativeProvider
    )

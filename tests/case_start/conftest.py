import copy
import json

import pytest
from fastapi.testclient import TestClient

from the_void_files.application.ports.narrative_provider import NarrativeGenerationRequest, NarrativeGenerationResponse
from the_void_files.application_factory import create_application
from the_void_files.narrative.case_generator import (
    case_generation_purpose_name,
    case_specification_response_schema_name,
    synthetic_cases_directory,
    whisper_offer_response_schema_name,
)
from the_void_files.service_settings import ServiceSettings, project_root_directory

service_base_address = "http://127.0.0.1:8765"
profile_identifier = "first_investigator"
profile_headers = {"X-Profile-Identifier": profile_identifier}
lighthouse_whisper_identifier = "lighthouse_counts_one_more"


def read_lighthouse_case_specification() -> dict:
    return json.loads(
        (synthetic_cases_directory / lighthouse_whisper_identifier / "case_specification.json").read_text(encoding="utf-8")
    )


def read_whisper_offer() -> dict:
    return json.loads((synthetic_cases_directory / "whisper_offers.json").read_text(encoding="utf-8"))


def build_broken_case_specification() -> dict:
    broken_specification = copy.deepcopy(read_lighthouse_case_specification())
    broken_specification["scenes"][0]["action_branches"][0]["default_outcome"]["next_scene_identifier"] = "absent_scene"
    broken_specification["interactive_pieces"][0]["private_solution"]["chosen_symbols"] = ["3", "1"]
    return broken_specification


class ScriptedNarrativeProvider:
    provider_name = "scripted_narrative"
    provider_mode_name = "synthetic"
    model_identifier = "scripted_director_for_tests"

    def __init__(self, case_specification_proposals: list) -> None:
        self.case_specification_proposals = list(case_specification_proposals)
        self.received_requests: list[NarrativeGenerationRequest] = []

    async def generate_narrative(self, generation_request: NarrativeGenerationRequest) -> NarrativeGenerationResponse:
        self.received_requests.append(generation_request)
        if generation_request.purpose_name == case_generation_purpose_name:
            structured_response = {case_specification_response_schema_name: self.case_specification_proposals.pop(0)}
        else:
            structured_response = {whisper_offer_response_schema_name: read_whisper_offer()}
        return NarrativeGenerationResponse(
            provider_name=self.provider_name,
            model_identifier=self.model_identifier,
            response_text="scripted",
            structured_response=structured_response,
        )

    async def close(self) -> None:
        return None


def open_service_client(data_directory, access_key_vault, narrative_provider=None):
    application = create_application(
        service_settings=ServiceSettings(
            data_directory=data_directory,
            migrations_directory=project_root_directory / "database" / "migrations",
            frontend_distribution_directory=data_directory / "absent_frontend_distribution",
            provider_mode_name="synthetic",
        ),
        access_key_vault=access_key_vault,
        narrative_provider=narrative_provider,
    )
    application.state.service_dependencies.profile_catalogue.register_profile(profile_identifier, "First investigator")
    return TestClient(application, base_url=service_base_address)


@pytest.fixture
def case_start_client(data_directory, access_key_vault):
    with open_service_client(data_directory, access_key_vault) as test_client:
        yield test_client


@pytest.fixture
def profile_database_path(data_directory):
    return data_directory / "profiles" / profile_identifier / "chronicle.sqlite3"

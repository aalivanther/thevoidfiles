import asyncio
import json

import httpx
import pytest
from fastapi.testclient import TestClient

from case_start.conftest import (
    profile_headers,
    profile_identifier,
    read_lighthouse_case_specification,
    read_whisper_offer,
)
from conftest import RecordedProviderTraffic, build_test_service_settings, service_base_address
from director.conftest import death_path_identifier, read_rows
from the_void_files.application.ports.narrative_provider import NarrativeGenerationRequest
from the_void_files.application.use_cases.director_failures import (
    NarrativeAccessKeyMissingError,
    NarrativeAccessKeyRejectedError,
    NarrativeProviderBusyError,
    NarrativeProviderTimedOutError,
    NarrativeResponseBlockedError,
)
from the_void_files.application_factory import create_application
from the_void_files.infrastructure.ai.gemini_provider import GeminiNarrativeProvider
from the_void_files.narrative.context_builder import build_connection_check_request

stored_gemini_access_key = "placeholder_gemini_access_key_for_tests_0002"


def build_gemini_answer(answer_text, finish_reason_name="STOP"):
    return httpx.Response(
        200,
        json={
            "candidates": [{"content": {"parts": [{"text": answer_text}]}, "finishReason": finish_reason_name}],
            "usageMetadata": {"promptTokenCount": 321, "candidatesTokenCount": 45},
            "modelVersion": "gemini-test-model",
        },
    )


async def skip_pause(pause_seconds):
    return None


@pytest.fixture
def gemini_vault(access_key_vault):
    access_key_vault.store_access_key("gemini", stored_gemini_access_key)
    return access_key_vault


def build_provider(access_key_vault, provider_traffic, **provider_options):
    return GeminiNarrativeProvider(
        access_key_vault,
        transport=httpx.MockTransport(provider_traffic.handle_request),
        pause_between_attempts=skip_pause,
        **provider_options,
    )


def test_structured_answer_is_parsed_with_token_counts(gemini_vault, provider_traffic):
    provider_traffic.response_builder = lambda request: build_gemini_answer('{"is_director_listening": true}')
    gemini_provider = build_provider(gemini_vault, provider_traffic)
    generation_response = asyncio.run(gemini_provider.generate_narrative(build_connection_check_request(None)))
    sent_request = provider_traffic.requests[0]
    sent_body = json.loads(sent_request.content)
    assert sent_request.url.path == "/v1beta/models/gemini-3.6-flash:generateContent"
    assert sent_request.headers["x-goog-api-key"] == stored_gemini_access_key
    assert stored_gemini_access_key not in str(sent_request.url)
    assert stored_gemini_access_key not in sent_request.content.decode("utf-8")
    assert sent_body["generationConfig"]["responseMimeType"] == "application/json"
    assert sent_body["generationConfig"]["responseJsonSchema"]["properties"]["is_director_listening"]
    assert "[OUTPUT_CONTRACT]" in sent_body["contents"][0]["parts"][0]["text"]
    assert generation_response.structured_response == {"connection_check_answer": {"is_director_listening": True}}
    assert (generation_response.input_token_count, generation_response.output_token_count) == (321, 45)
    assert generation_response.model_identifier == "gemini-test-model"
    assert asyncio.run(gemini_provider.check_connection()) is True


def test_missing_key_makes_no_request(access_key_vault, provider_traffic):
    gemini_provider = build_provider(access_key_vault, provider_traffic)
    with pytest.raises(NarrativeAccessKeyMissingError):
        asyncio.run(gemini_provider.generate_narrative(build_connection_check_request(None)))
    assert provider_traffic.requests == []


@pytest.mark.parametrize(
    ("provider_response", "expected_error_type"),
    [
        (httpx.Response(401, json={"error": {"status": "UNAUTHENTICATED"}}), NarrativeAccessKeyRejectedError),
        (httpx.Response(403, json={"error": {"status": "PERMISSION_DENIED"}}), NarrativeAccessKeyRejectedError),
        (
            httpx.Response(400, json={"error": {"details": [{"reason": "API_KEY_INVALID"}]}}),
            NarrativeAccessKeyRejectedError,
        ),
        (httpx.Response(429, json={"error": {"status": "RESOURCE_EXHAUSTED"}}), NarrativeProviderBusyError),
        (build_gemini_answer("", "SAFETY"), NarrativeResponseBlockedError),
    ],
)
def test_provider_errors_become_service_failures(gemini_vault, provider_traffic, provider_response, expected_error_type):
    provider_traffic.response_builder = lambda request: provider_response
    gemini_provider = build_provider(gemini_vault, provider_traffic, maximum_transport_attempt_count=1)
    with pytest.raises(expected_error_type):
        asyncio.run(gemini_provider.generate_narrative(build_connection_check_request(None)))
    assert len(provider_traffic.requests) == 1


def test_timeout_is_mapped_and_retries_are_bounded(gemini_vault, provider_traffic):
    def raise_timeout(request):
        raise httpx.ReadTimeout("timed out", request=request)

    provider_traffic.response_builder = raise_timeout
    single_attempt_provider = build_provider(gemini_vault, provider_traffic, maximum_transport_attempt_count=1)
    with pytest.raises(NarrativeProviderTimedOutError):
        asyncio.run(single_attempt_provider.generate_narrative(build_connection_check_request(None)))
    assert len(provider_traffic.requests) == 1
    retrying_provider = build_provider(gemini_vault, provider_traffic, maximum_transport_attempt_count=50)
    with pytest.raises(NarrativeProviderTimedOutError):
        asyncio.run(retrying_provider.generate_narrative(build_connection_check_request(None)))
    assert len(provider_traffic.requests) == 1 + 4


def test_busy_provider_is_retried_until_it_answers(gemini_vault, provider_traffic):
    planned_responses = [httpx.Response(429), httpx.Response(503), build_gemini_answer('{"is_director_listening": true}')]
    provider_traffic.response_builder = lambda request: planned_responses.pop(0)
    gemini_provider = build_provider(gemini_vault, provider_traffic, maximum_transport_attempt_count=3)
    assert asyncio.run(gemini_provider.check_connection()) is True
    assert len(provider_traffic.requests) == 3


def test_refused_schema_is_sent_again_inside_the_prompt(gemini_vault, provider_traffic):
    planned_responses = [
        httpx.Response(400, json={"error": {"status": "INVALID_ARGUMENT"}}),
        build_gemini_answer('{"is_director_listening": true}'),
    ]
    provider_traffic.response_builder = lambda request: planned_responses.pop(0)
    assert asyncio.run(build_provider(gemini_vault, provider_traffic).check_connection()) is True
    second_body = json.loads(provider_traffic.requests[1].content)
    assert "responseJsonSchema" not in second_body["generationConfig"]
    assert "is_director_listening" in second_body["contents"][0]["parts"][0]["text"]


def test_unparseable_answer_is_returned_for_the_repair_loop(gemini_vault, provider_traffic):
    provider_traffic.response_builder = lambda request: build_gemini_answer("Claro, aquí va: {")
    generation_response = asyncio.run(
        build_provider(gemini_vault, provider_traffic).generate_narrative(
            NarrativeGenerationRequest(purpose_name="narration", instruction_text="Narrate.", response_schema_name="narration_draft")
        )
    )
    assert generation_response.structured_response is None
    assert generation_response.response_text == "Claro, aquí va: {"


def read_prompt_blocks(request):
    prompt_text = json.loads(request.content)["contents"][0]["parts"][0]["text"]
    blocks = {}
    for rendered_block in prompt_text.split("\n\n["):
        label_text, separator, content_text = rendered_block.lstrip("[").partition("]\n")
        if separator:
            blocks[label_text.lower()] = content_text
    return blocks


class ScriptedGeminiDirector:
    def __init__(self) -> None:
        self.has_broken_narration_once = False

    def answer(self, request):
        blocks = read_prompt_blocks(request)
        control = json.loads(blocks["control"])
        purpose_name = control.get("purpose_name")
        if purpose_name is None:
            if "chosen_whisper" in blocks:
                return build_gemini_answer(json.dumps(read_lighthouse_case_specification()))
            return build_gemini_answer(json.dumps(read_whisper_offer()))
        if purpose_name == "adjudication":
            return build_gemini_answer(
                json.dumps(
                    {
                        "action_key": control["action_key"],
                        "expected_state_version": control["state_version"],
                        "disposition_name": "proposed",
                        "interpreted_intent_text": "Avanza.",
                        "feasibility_class_name": "plausible",
                        "concise_ruling_text": "Puede hacerlo.",
                        "effect_proposals": [],
                    }
                )
            )
        if purpose_name == "narration":
            if not self.has_broken_narration_once:
                self.has_broken_narration_once = True
                return build_gemini_answer('{"marked_paragraphs": ["sin cerrar')
            return build_gemini_answer(json.dumps({"marked_paragraphs": ["El faro sigue contando para {{nombre}}."]}))
        return build_gemini_answer(
            json.dumps({"summary_paragraphs": ["El archivo se cierra."], "open_thread_texts": []})
        )


def test_whole_case_runs_on_gemini_with_invalid_json_then_repair(data_directory, gemini_vault, provider_traffic):
    scripted_director = ScriptedGeminiDirector()
    provider_traffic.response_builder = scripted_director.answer
    application = create_application(
        service_settings=build_test_service_settings(data_directory, "synthetic"),
        access_key_vault=gemini_vault,
        narrative_provider=build_provider(gemini_vault, provider_traffic),
    )
    application.state.service_dependencies.profile_catalogue.register_profile(profile_identifier, "First investigator")
    with TestClient(application, base_url=service_base_address) as test_client:
        report = test_client.post(
            "/api/director/simulations", headers=profile_headers, json={"scripted_path_identifier": death_path_identifier}
        ).json()
        assert report["outcome_name"] == "completed"
        assert report["narrative_provider_name"] == "gemini"
        assert report["narrative_provider_mode_name"] == "real"
        first_narration = report["steps"][0]["generations"][1]
        assert [attempt["outcome_name"] for attempt in first_narration["attempts"]] == ["rejected", "accepted"]
        repair_blocks = [
            read_prompt_blocks(request)
            for request in provider_traffic.requests
            if "rejected_proposal_review" in read_prompt_blocks(request)
        ]
        assert "structured_response_missing" in repair_blocks[0]["rejected_proposal_review"]
        summary = test_client.get("/api/director/interactions/summary", headers=profile_headers).json()
        assert summary["interaction_counts_by_provider_name"]["gemini"] == len(provider_traffic.requests)
        assert summary["input_token_count"] == 321 * len(provider_traffic.requests)
        assert summary["repair_attempt_count"] == 1
        rejected_injection = test_client.post(
            "/api/director/simulations",
            headers=profile_headers,
            json={
                "scripted_path_identifier": death_path_identifier,
                "injected_failures": [
                    {"step_number": 1, "purpose_name": "narration", "failure_mode_name": "timeout"}
                ],
            },
        )
        assert rejected_injection.json() == {"failure_name": "failure_injection_needs_synthetic_provider"}
    profile_directory = data_directory / "profiles" / profile_identifier
    stored_files = [
        stored_path for stored_path in data_directory.rglob("*") if stored_path.is_file()
    ]
    assert len(list((profile_directory / "ai_interactions").glob("*.json"))) > 20
    for stored_path in stored_files:
        assert stored_gemini_access_key.encode("utf-8") not in stored_path.read_bytes(), stored_path
    assert read_rows(profile_directory / "chronicle.sqlite3", "SELECT 1 FROM ai_interaction WHERE provider_name = 'gemini'")

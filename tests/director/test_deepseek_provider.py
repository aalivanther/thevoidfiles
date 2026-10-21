import asyncio
import json

import httpx
import pytest

from the_void_files.application.use_cases.director_failures import (
    NarrativeAccessKeyMissingError,
    NarrativeAccessKeyRejectedError,
    NarrativeProviderBusyError,
    NarrativeQuotaExhaustedError,
)
from the_void_files.infrastructure.ai.deepseek_provider import DeepSeekNarrativeProvider
from the_void_files.narrative.context_builder import build_connection_check_request

stored_deepseek_access_key = "placeholder_deepseek_access_key_0002"


def build_deepseek_answer(answer_text, finish_reason_name="stop"):
    return httpx.Response(
        200,
        json={
            "choices": [{"message": {"role": "assistant", "content": answer_text}, "finish_reason": finish_reason_name}],
            "usage": {"prompt_tokens": 120, "completion_tokens": 18},
            "model": "deepseek-v4-pro",
        },
    )


async def skip_pause(pause_seconds):
    return None


@pytest.fixture
def deepseek_vault(access_key_vault):
    access_key_vault.store_access_key("deepseek", stored_deepseek_access_key)
    return access_key_vault


def build_provider(access_key_vault, provider_traffic, **provider_options):
    return DeepSeekNarrativeProvider(
        access_key_vault,
        transport=httpx.MockTransport(provider_traffic.handle_request),
        pause_between_attempts=skip_pause,
        **provider_options,
    )


def test_structured_answer_is_parsed_with_token_counts(deepseek_vault, provider_traffic):
    provider_traffic.response_builder = lambda request: build_deepseek_answer('{"is_director_listening": true}')
    deepseek_provider = build_provider(deepseek_vault, provider_traffic)
    generation_response = asyncio.run(deepseek_provider.generate_narrative(build_connection_check_request(None)))
    sent_request = provider_traffic.requests[0]
    sent_body = json.loads(sent_request.content)
    assert sent_request.url.path == "/chat/completions"
    assert sent_request.headers["authorization"] == f"Bearer {stored_deepseek_access_key}"
    assert stored_deepseek_access_key not in sent_request.content.decode("utf-8")
    assert sent_body["model"] == "deepseek-v4-pro"
    assert sent_body["response_format"] == {"type": "json_object"}
    assert sent_body["thinking"] == {"type": "disabled"}
    assert "json" in sent_body["messages"][0]["content"].lower()
    assert generation_response.structured_response == {"connection_check_answer": {"is_director_listening": True}}
    assert (generation_response.input_token_count, generation_response.output_token_count) == (120, 18)
    assert generation_response.model_identifier == "deepseek-v4-pro"
    assert asyncio.run(deepseek_provider.check_connection()) is True


def test_missing_key_makes_no_request(access_key_vault, provider_traffic):
    deepseek_provider = build_provider(access_key_vault, provider_traffic)
    with pytest.raises(NarrativeAccessKeyMissingError):
        asyncio.run(deepseek_provider.generate_narrative(build_connection_check_request(None)))
    assert provider_traffic.requests == []


def test_invalid_key_is_rejected(deepseek_vault, provider_traffic):
    provider_traffic.response_builder = lambda request: httpx.Response(
        401, json={"error": {"type": "authentication_error"}}
    )
    with pytest.raises(NarrativeAccessKeyRejectedError):
        asyncio.run(build_provider(deepseek_vault, provider_traffic, maximum_transport_attempt_count=1).generate_narrative(
            build_connection_check_request(None)
        ))


def test_busy_provider_is_retried_until_it_answers(deepseek_vault, provider_traffic):
    planned_responses = [httpx.Response(429), httpx.Response(503), build_deepseek_answer('{"is_director_listening": true}')]
    provider_traffic.response_builder = lambda request: planned_responses.pop(0)
    deepseek_provider = build_provider(deepseek_vault, provider_traffic, maximum_transport_attempt_count=3)
    assert asyncio.run(deepseek_provider.check_connection()) is True
    assert len(provider_traffic.requests) == 3


def test_insufficient_balance_becomes_quota_exhausted(deepseek_vault, provider_traffic):
    provider_traffic.response_builder = lambda request: httpx.Response(
        402, json={"error": {"message": "Insufficient Balance", "code": "invalid_request_error"}}
    )
    with pytest.raises(NarrativeQuotaExhaustedError):
        asyncio.run(
            build_provider(deepseek_vault, provider_traffic, maximum_transport_attempt_count=1).generate_narrative(
                build_connection_check_request(None)
            )
        )


def test_exhausted_busy_becomes_provider_busy(deepseek_vault, provider_traffic):
    provider_traffic.response_builder = lambda request: httpx.Response(429)
    with pytest.raises(NarrativeProviderBusyError):
        asyncio.run(
            build_provider(deepseek_vault, provider_traffic, maximum_transport_attempt_count=1).generate_narrative(
                build_connection_check_request(None)
            )
        )

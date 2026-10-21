import asyncio
import json

import httpx
import pytest

from the_void_files.application.use_cases.director_failures import (
    NarrativeAccessKeyMissingError,
    NarrativeRequestTooLargeError,
)
from the_void_files.infrastructure.ai.groq_provider import GroqNarrativeProvider
from the_void_files.narrative.context_builder import build_connection_check_request

stored_groq_access_key = "placeholder_groq_access_key_00000002"


def build_groq_answer(answer_text):
    return httpx.Response(
        200,
        json={
            "choices": [{"message": {"role": "assistant", "content": answer_text}, "finish_reason": "stop"}],
            "usage": {"prompt_tokens": 40, "completion_tokens": 8},
            "model": "openai/gpt-oss-120b",
        },
    )


async def skip_pause(pause_seconds):
    return None


@pytest.fixture
def groq_vault(access_key_vault):
    access_key_vault.store_access_key("groq", stored_groq_access_key)
    return access_key_vault


def test_structured_answer_uses_the_groq_chat_path(groq_vault, provider_traffic):
    provider_traffic.response_builder = lambda request: build_groq_answer('{"is_director_listening": true}')
    groq_provider = GroqNarrativeProvider(
        groq_vault,
        transport=httpx.MockTransport(provider_traffic.handle_request),
        pause_between_attempts=skip_pause,
    )
    generation_response = asyncio.run(groq_provider.generate_narrative(build_connection_check_request(None)))
    sent_request = provider_traffic.requests[0]
    sent_body = json.loads(sent_request.content)
    assert sent_request.url.path == "/openai/v1/chat/completions"
    assert sent_request.headers["authorization"] == f"Bearer {stored_groq_access_key}"
    assert sent_body["model"] == "openai/gpt-oss-120b"
    assert sent_body["max_tokens"] == 4096
    assert generation_response.structured_response == {"connection_check_answer": {"is_director_listening": True}}


def test_token_limit_becomes_request_too_large(groq_vault, provider_traffic):
    provider_traffic.response_builder = lambda request: httpx.Response(
        413,
        json={
            "error": {
                "message": "Request too large for model on tokens per minute (TPM): Limit 8000, Requested 13835",
                "type": "tokens",
                "code": "rate_limit_exceeded",
            }
        },
    )
    groq_provider = GroqNarrativeProvider(
        groq_vault,
        transport=httpx.MockTransport(provider_traffic.handle_request),
        pause_between_attempts=skip_pause,
        maximum_transport_attempt_count=1,
    )
    with pytest.raises(NarrativeRequestTooLargeError):
        asyncio.run(groq_provider.generate_narrative(build_connection_check_request(None)))


def test_missing_key_makes_no_request(access_key_vault, provider_traffic):
    groq_provider = GroqNarrativeProvider(
        access_key_vault,
        transport=httpx.MockTransport(provider_traffic.handle_request),
        pause_between_attempts=skip_pause,
    )
    with pytest.raises(NarrativeAccessKeyMissingError):
        asyncio.run(groq_provider.generate_narrative(build_connection_check_request(None)))
    assert provider_traffic.requests == []

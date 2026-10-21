import httpx
import keyring
import pytest

from conftest import allowed_origin, well_formed_access_key


def store_well_formed_access_key(service_client):
    return service_client.post("/access-key", json={"access_key": well_formed_access_key})


def test_status_reports_no_key_at_first(service_client):
    response = service_client.get("/service-status")
    assert response.status_code == 200
    assert response.json()["is_access_key_stored"] is False


def test_key_is_stored_in_keychain_and_never_returned(service_client, in_memory_keychain):
    store_response = store_well_formed_access_key(service_client)
    status_response = service_client.get("/service-status")
    assert store_response.status_code == 200
    assert list(in_memory_keychain.values()) == [well_formed_access_key]
    assert status_response.json()["is_access_key_stored"] is True
    assert well_formed_access_key not in store_response.text
    assert well_formed_access_key not in status_response.text


def test_malformed_key_is_rejected_without_echo(service_client, in_memory_keychain):
    response = service_client.post("/access-key", json={"access_key": "short key"})
    assert response.status_code == 422
    assert response.json() == {"failure_name": "access_key_malformed"}
    assert in_memory_keychain == {}


def test_validation_failure_never_echoes_submitted_body(service_client):
    response = service_client.post("/access-key", json={"access_key": {"nested": well_formed_access_key}})
    assert response.status_code == 422
    assert response.json() == {"failure_name": "request_invalid"}


def test_key_can_be_deleted_twice(service_client, in_memory_keychain):
    store_well_formed_access_key(service_client)
    assert service_client.delete("/access-key").json() == {"is_access_key_stored": False}
    assert service_client.delete("/access-key").status_code == 200
    assert in_memory_keychain == {}


def test_unavailable_keychain_is_reported(service_client, monkeypatch):
    def fail_to_read(service_name, account_name):
        raise keyring.errors.KeyringError()

    monkeypatch.setattr(keyring, "get_password", fail_to_read)
    response = service_client.get("/service-status")
    assert response.status_code == 503
    assert response.json() == {"failure_name": "access_key_vault_unavailable"}


def test_voices_require_stored_key(service_client, provider_traffic):
    response = service_client.get("/voices")
    assert response.status_code == 409
    assert response.json() == {"failure_name": "access_key_missing"}
    assert provider_traffic.requests == []


def test_voices_are_listed_with_spanish_first(service_client, provider_traffic):
    store_well_formed_access_key(service_client)
    provider_traffic.response_builder = lambda request: httpx.Response(
        200,
        json={
            "voices": [
                {"voice_id": "voiceEnglish01", "name": "Alder", "labels": {"language": "en"}},
                {"voice_id": "voiceSpanish01", "name": "Marisol", "verified_languages": [{"language": "es"}]},
                {"name": "Record without identifier"},
            ]
        },
    )
    response = service_client.get("/voices")
    assert response.status_code == 200
    assert response.json() == {
        "voices": [
            {"voice_identifier": "voiceSpanish01", "visible_name": "Marisol", "speaks_spanish": True},
            {"voice_identifier": "voiceEnglish01", "visible_name": "Alder", "speaks_spanish": False},
        ]
    }
    assert provider_traffic.requests[0].url.path == "/v2/voices"
    assert provider_traffic.requests[0].headers["xi-api-key"] == well_formed_access_key
    assert well_formed_access_key not in response.text


def test_speech_streams_audio(service_client, provider_traffic):
    store_well_formed_access_key(service_client)
    provider_traffic.response_builder = lambda request: httpx.Response(200, content=b"audio-bytes")
    response = service_client.post("/speech", json={"text": "  La lluvia no cesa.  ", "voice_identifier": "voiceSpanish01"})
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/mpeg"
    assert response.content == b"audio-bytes"
    provider_request = provider_traffic.requests[0]
    assert provider_request.url.path == "/v1/text-to-speech/voiceSpanish01/stream"
    assert b"La lluvia no cesa." in provider_request.content
    assert b"eleven_multilingual_v2" in provider_request.content


def test_speech_requires_stored_key(service_client, provider_traffic):
    response = service_client.post("/speech", json={"text": "Texto", "voice_identifier": "voiceSpanish01"})
    assert response.status_code == 409
    assert response.json() == {"failure_name": "access_key_missing"}
    assert provider_traffic.requests == []


@pytest.mark.parametrize(
    ("text", "voice_identifier", "expected_status_code", "expected_failure_name"),
    [
        ("   ", "voiceSpanish01", 422, "speech_text_empty"),
        ("a" * 2501, "voiceSpanish01", 413, "speech_text_too_long"),
        ("Texto", "../v1/user", 422, "voice_identifier_malformed"),
    ],
)
def test_speech_input_limits(service_client, provider_traffic, text, voice_identifier, expected_status_code, expected_failure_name):
    store_well_formed_access_key(service_client)
    response = service_client.post("/speech", json={"text": text, "voice_identifier": voice_identifier})
    assert response.status_code == expected_status_code
    assert response.json() == {"failure_name": expected_failure_name}
    assert provider_traffic.requests == []


@pytest.mark.parametrize(
    ("provider_status_code", "provider_status_name", "expected_status_code", "expected_failure_name"),
    [
        (401, "invalid_api_key", 401, "access_key_rejected"),
        (401, "quota_exceeded", 402, "speech_quota_exhausted"),
        (429, "too_many_concurrent_requests", 429, "speech_provider_busy"),
        (404, "voice_not_found", 404, "voice_not_found"),
        (500, "unexpected", 502, "speech_provider_failed"),
    ],
)
def test_provider_errors_are_mapped(
    service_client, provider_traffic, provider_status_code, provider_status_name, expected_status_code, expected_failure_name
):
    store_well_formed_access_key(service_client)
    provider_traffic.response_builder = lambda request: httpx.Response(
        provider_status_code, json={"detail": {"status": provider_status_name, "message": "provider words"}}
    )
    speech_response = service_client.post("/speech", json={"text": "Texto", "voice_identifier": "voiceSpanish01"})
    voices_response = service_client.get("/voices")
    for response in (speech_response, voices_response):
        assert response.status_code == expected_status_code
        assert response.json() == {"failure_name": expected_failure_name}


def test_network_failure_is_mapped(service_client, provider_traffic):
    store_well_formed_access_key(service_client)

    def fail_to_connect(request):
        raise httpx.ConnectError("unreachable", request=request)

    provider_traffic.response_builder = fail_to_connect
    response = service_client.post("/speech", json={"text": "Texto", "voice_identifier": "voiceSpanish01"})
    assert response.status_code == 504
    assert response.json() == {"failure_name": "speech_provider_unreachable"}


def test_foreign_origin_is_rejected(service_client, in_memory_keychain):
    response = service_client.post(
        "/access-key", json={"access_key": well_formed_access_key}, headers={"Origin": "https://example.com"}
    )
    assert response.status_code == 403
    assert in_memory_keychain == {}


def test_foreign_host_is_rejected(service_client):
    response = service_client.get("/service-status", headers={"Host": "attacker.example"})
    assert response.status_code == 400


def test_allowed_origin_receives_cors_header(service_client):
    response = service_client.get("/service-status", headers={"Origin": allowed_origin})
    assert response.headers["access-control-allow-origin"] == allowed_origin

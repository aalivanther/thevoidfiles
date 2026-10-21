import httpx
import pytest

from conftest import allowed_origin, well_formed_access_key


def store_well_formed_access_key(service_client):
    return service_client.post("/access-key", json={"access_key": well_formed_access_key})


def test_status_reports_no_key_at_first(real_mode_service_client):
    response = real_mode_service_client.get("/service-status")
    assert response.status_code == 200
    assert response.json()["is_access_key_stored"] is False
    assert response.json()["maximum_speech_text_length"] == 2500


def test_key_is_stored_in_vault_and_never_returned(real_mode_service_client, access_key_vault):
    store_response = store_well_formed_access_key(real_mode_service_client)
    status_response = real_mode_service_client.get("/service-status")
    assert store_response.status_code == 200
    assert access_key_vault.stored_access_keys == {"elevenlabs": well_formed_access_key}
    assert status_response.json()["is_access_key_stored"] is True
    assert well_formed_access_key not in store_response.text
    assert well_formed_access_key not in status_response.text


def test_malformed_key_is_rejected_without_echo(real_mode_service_client, access_key_vault):
    response = real_mode_service_client.post("/access-key", json={"access_key": "short key"})
    assert response.status_code == 422
    assert response.json() == {"failure_name": "access_key_malformed"}
    assert access_key_vault.stored_access_keys == {}


def test_validation_failure_never_echoes_submitted_body(real_mode_service_client):
    response = real_mode_service_client.post("/access-key", json={"access_key": {"nested": well_formed_access_key}})
    assert response.status_code == 422
    assert response.json() == {"failure_name": "request_invalid"}


def test_key_can_be_deleted_twice(real_mode_service_client, access_key_vault):
    store_well_formed_access_key(real_mode_service_client)
    assert real_mode_service_client.delete("/access-key").json() == {"is_access_key_stored": False}
    assert real_mode_service_client.delete("/access-key").status_code == 200
    assert access_key_vault.stored_access_keys == {}


def test_unavailable_vault_is_reported(real_mode_service_client, access_key_vault):
    access_key_vault.is_unavailable = True
    response = real_mode_service_client.get("/service-status")
    assert response.status_code == 503
    assert response.json() == {"failure_name": "access_key_vault_unavailable"}


def test_voices_require_stored_key(real_mode_service_client, provider_traffic):
    response = real_mode_service_client.get("/voices")
    assert response.status_code == 409
    assert response.json() == {"failure_name": "access_key_missing"}
    assert provider_traffic.requests == []


def test_voices_are_listed_with_spanish_first(real_mode_service_client, provider_traffic):
    store_well_formed_access_key(real_mode_service_client)
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
    response = real_mode_service_client.get("/voices")
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


def test_speech_returns_audio_and_repeats_from_library(real_mode_service_client, provider_traffic, data_directory):
    store_well_formed_access_key(real_mode_service_client)
    provider_traffic.response_builder = lambda request: httpx.Response(200, content=b"audio-bytes")
    speech_body = {"text": "  La lluvia no cesa.  ", "voice_identifier": "voiceSpanish01"}
    response = real_mode_service_client.post("/speech", json=speech_body)
    repeated_response = real_mode_service_client.post("/speech", json=speech_body)
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/mpeg"
    assert response.headers["cache-control"] == "no-store"
    assert response.content == b"audio-bytes"
    assert repeated_response.content == b"audio-bytes"
    assert len(provider_traffic.requests) == 1
    provider_request = provider_traffic.requests[0]
    assert provider_request.url.path == "/v1/text-to-speech/voiceSpanish01"
    assert b"La lluvia no cesa." in provider_request.content
    assert b"eleven_multilingual_v2" in provider_request.content
    stored_audio_paths = list((data_directory / "unassigned_service_records" / "narration_audio").iterdir())
    assert [stored_audio_path.suffix for stored_audio_path in stored_audio_paths] == [".mp3"]


def test_access_key_never_reaches_recorded_bodies(real_mode_service_client, provider_traffic, data_directory):
    store_well_formed_access_key(real_mode_service_client)
    provider_traffic.response_builder = lambda request: httpx.Response(200, content=b"audio-bytes")
    real_mode_service_client.post("/speech", json={"text": "Texto", "voice_identifier": "voiceSpanish01"})
    recorded_body_paths = list((data_directory / "unassigned_service_records" / "ai_interactions").iterdir())
    assert len(recorded_body_paths) == 2
    for recorded_body_path in recorded_body_paths:
        assert well_formed_access_key not in recorded_body_path.read_text()


def test_speech_requires_stored_key(real_mode_service_client, provider_traffic):
    response = real_mode_service_client.post("/speech", json={"text": "Texto", "voice_identifier": "voiceSpanish01"})
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
def test_speech_input_limits(
    real_mode_service_client, provider_traffic, text, voice_identifier, expected_status_code, expected_failure_name
):
    store_well_formed_access_key(real_mode_service_client)
    response = real_mode_service_client.post("/speech", json={"text": text, "voice_identifier": voice_identifier})
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
    real_mode_service_client,
    provider_traffic,
    provider_status_code,
    provider_status_name,
    expected_status_code,
    expected_failure_name,
):
    store_well_formed_access_key(real_mode_service_client)
    provider_traffic.response_builder = lambda request: httpx.Response(
        provider_status_code, json={"detail": {"status": provider_status_name, "message": "provider words"}}
    )
    speech_response = real_mode_service_client.post("/speech", json={"text": "Texto", "voice_identifier": "voiceSpanish01"})
    voices_response = real_mode_service_client.get("/voices")
    for response in (speech_response, voices_response):
        assert response.status_code == expected_status_code
        assert response.json() == {"failure_name": expected_failure_name}


def test_network_failure_is_mapped(real_mode_service_client, provider_traffic):
    store_well_formed_access_key(real_mode_service_client)

    def fail_to_connect(request):
        raise httpx.ConnectError("unreachable", request=request)

    provider_traffic.response_builder = fail_to_connect
    response = real_mode_service_client.post("/speech", json={"text": "Texto", "voice_identifier": "voiceSpanish01"})
    assert response.status_code == 504
    assert response.json() == {"failure_name": "speech_provider_unreachable"}


def test_foreign_origin_is_rejected(real_mode_service_client, access_key_vault):
    response = real_mode_service_client.post(
        "/access-key", json={"access_key": well_formed_access_key}, headers={"Origin": "https://example.com"}
    )
    assert response.status_code == 403
    assert access_key_vault.stored_access_keys == {}


def test_foreign_host_is_rejected(real_mode_service_client):
    response = real_mode_service_client.get("/service-status", headers={"Host": "attacker.example"})
    assert response.status_code == 400


def test_allowed_origin_receives_cors_header(real_mode_service_client):
    response = real_mode_service_client.get("/service-status", headers={"Origin": allowed_origin})
    assert response.headers["access-control-allow-origin"] == allowed_origin

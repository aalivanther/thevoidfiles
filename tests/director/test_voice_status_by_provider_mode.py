from conftest import well_formed_access_key


def test_synthetic_voice_never_asks_for_a_key_nor_reads_the_vault(synthetic_mode_service_client, access_key_vault):
    access_key_vault.is_unavailable = True
    status_answer = synthetic_mode_service_client.get("/service-status")
    assert status_answer.status_code == 200
    assert status_answer.json() == {
        "is_service_running": True,
        "is_access_key_required": False,
        "is_access_key_stored": True,
        "maximum_speech_text_length": 2500,
        "provider_mode_name": "synthetic",
        "speech_provider_name": "synthetic_speech",
    }
    assert synthetic_mode_service_client.get("/voices").status_code == 200


def test_real_voice_still_reports_the_stored_key(real_mode_service_client, access_key_vault):
    assert real_mode_service_client.get("/service-status").json()["is_access_key_stored"] is False
    access_key_vault.store_access_key("elevenlabs", well_formed_access_key)
    status = real_mode_service_client.get("/service-status").json()
    assert status["is_access_key_stored"] is True
    assert status["is_access_key_required"] is True
    assert status["speech_provider_name"] == "elevenlabs"

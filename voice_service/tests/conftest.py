import sys
from pathlib import Path

import httpx
import keyring
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from voice_service_application import create_voice_service_application

allowed_origin = "http://127.0.0.1:5173"
well_formed_access_key = "placeholder_access_key_for_tests_0001"


class RecordedProviderTraffic:
    def __init__(self) -> None:
        self.requests: list[httpx.Request] = []
        self.response_builder = lambda request: httpx.Response(500)

    def handle_request(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        return self.response_builder(request)


@pytest.fixture
def in_memory_keychain(monkeypatch):
    stored_passwords: dict[tuple[str, str], str] = {}

    def get_password(service_name, account_name):
        return stored_passwords.get((service_name, account_name))

    def set_password(service_name, account_name, password):
        stored_passwords[(service_name, account_name)] = password

    def delete_password(service_name, account_name):
        if (service_name, account_name) not in stored_passwords:
            raise keyring.errors.PasswordDeleteError()
        del stored_passwords[(service_name, account_name)]

    monkeypatch.setattr(keyring, "get_password", get_password)
    monkeypatch.setattr(keyring, "set_password", set_password)
    monkeypatch.setattr(keyring, "delete_password", delete_password)
    return stored_passwords


@pytest.fixture
def provider_traffic():
    return RecordedProviderTraffic()


@pytest.fixture
def service_client(in_memory_keychain, provider_traffic):
    application = create_voice_service_application(
        elevenlabs_transport=httpx.MockTransport(provider_traffic.handle_request)
    )
    with TestClient(application, base_url="http://127.0.0.1:8765") as test_client:
        yield test_client

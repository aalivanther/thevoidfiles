from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient

from the_void_files.application_factory import create_application
from the_void_files.infrastructure.secrets.in_memory_access_key_vault import InMemoryAccessKeyVault
from the_void_files.service_settings import ServiceSettings, project_root_directory

allowed_origin = "http://127.0.0.1:5173"
service_base_address = "http://127.0.0.1:8765"
well_formed_access_key = "placeholder_access_key_for_tests_0001"


class RecordedProviderTraffic:
    def __init__(self) -> None:
        self.requests: list[httpx.Request] = []
        self.response_builder = lambda request: httpx.Response(500)

    def handle_request(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        return self.response_builder(request)


def build_test_service_settings(data_directory: Path, provider_mode_name: str) -> ServiceSettings:
    return ServiceSettings(
        data_directory=data_directory,
        migrations_directory=project_root_directory / "database" / "migrations",
        frontend_distribution_directory=data_directory / "absent_frontend_distribution",
        provider_mode_name=provider_mode_name,
    )


@pytest.fixture
def data_directory(tmp_path):
    return tmp_path / "data"


@pytest.fixture
def access_key_vault():
    return InMemoryAccessKeyVault()


@pytest.fixture
def provider_traffic():
    return RecordedProviderTraffic()


@pytest.fixture
def real_mode_service_client(data_directory, access_key_vault, provider_traffic):
    application = create_application(
        service_settings=build_test_service_settings(data_directory, "real"),
        access_key_vault=access_key_vault,
        speech_transport=httpx.MockTransport(provider_traffic.handle_request),
    )
    with TestClient(application, base_url=service_base_address) as test_client:
        yield test_client


@pytest.fixture
def synthetic_mode_service_client(data_directory, access_key_vault):
    application = create_application(
        service_settings=build_test_service_settings(data_directory, "synthetic"),
        access_key_vault=access_key_vault,
    )
    with TestClient(application, base_url=service_base_address) as test_client:
        yield test_client

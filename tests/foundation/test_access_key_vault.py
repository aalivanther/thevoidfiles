import keyring
import pytest

from conftest import well_formed_access_key
from the_void_files.application.access_key_description import describe_stored_access_key
from the_void_files.application.service_failures import AccessKeyVaultUnavailableError
from the_void_files.infrastructure.secrets.in_memory_access_key_vault import InMemoryAccessKeyVault
from the_void_files.infrastructure.secrets.keyring_access_key_vault import KeyringAccessKeyVault


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


def test_description_exposes_only_the_ending():
    access_key_vault = InMemoryAccessKeyVault()
    assert describe_stored_access_key(access_key_vault, "gemini").model_dump() == {
        "access_key_name": "gemini",
        "is_access_key_stored": False,
        "visible_ending": None,
    }
    access_key_vault.store_access_key("gemini", well_formed_access_key)
    description = describe_stored_access_key(access_key_vault, "gemini")
    assert description.visible_ending == well_formed_access_key[-4:]
    assert well_formed_access_key not in description.model_dump_json()


def test_keyring_vault_keeps_the_voice_service_keychain_entry(in_memory_keychain):
    access_key_vault = KeyringAccessKeyVault()
    access_key_vault.store_access_key("elevenlabs", well_formed_access_key)
    access_key_vault.store_access_key("gemini", well_formed_access_key + "_gemini")
    assert in_memory_keychain[("the_void_files_voice_service", "elevenlabs_access_key")] == well_formed_access_key
    assert access_key_vault.read_access_key("gemini") == well_formed_access_key + "_gemini"
    access_key_vault.delete_access_key("elevenlabs")
    access_key_vault.delete_access_key("elevenlabs")
    assert access_key_vault.read_access_key("elevenlabs") is None


def test_keyring_failure_becomes_vault_unavailable(monkeypatch):
    def fail_to_read(service_name, account_name):
        raise keyring.errors.KeyringError()

    monkeypatch.setattr(keyring, "get_password", fail_to_read)
    with pytest.raises(AccessKeyVaultUnavailableError):
        KeyringAccessKeyVault().read_access_key("elevenlabs")


def test_access_key_routes_never_return_the_key(synthetic_mode_service_client, access_key_vault):
    save_response = synthetic_mode_service_client.put("/api/access-keys/gemini", json={"access_key": well_formed_access_key})
    listing_response = synthetic_mode_service_client.get("/api/access-keys")
    assert save_response.status_code == 200
    assert save_response.json()["visible_ending"] == well_formed_access_key[-4:]
    assert access_key_vault.stored_access_keys == {"gemini": well_formed_access_key}
    assert well_formed_access_key not in save_response.text
    assert well_formed_access_key not in listing_response.text
    assert synthetic_mode_service_client.delete("/api/access-keys/gemini").json()["is_access_key_stored"] is False
    assert synthetic_mode_service_client.put("/api/access-keys/unknown", json={"access_key": well_formed_access_key}).json() == {
        "failure_name": "access_key_name_unknown"
    }
    assert synthetic_mode_service_client.put("/api/access-keys/gemini", json={"access_key": "short key"}).json() == {
        "failure_name": "access_key_malformed"
    }

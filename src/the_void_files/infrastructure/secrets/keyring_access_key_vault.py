import keyring
from keyring.errors import KeyringError, PasswordDeleteError

from the_void_files.application.ports.access_key_vault import AccessKeyName
from the_void_files.application.service_failures import AccessKeyVaultUnavailableError

keychain_entries_by_access_key_name: dict[AccessKeyName, tuple[str, str]] = {
    "elevenlabs": ("the_void_files_voice_service", "elevenlabs_access_key"),
    "gemini": ("the_void_files_game_service", "gemini_access_key"),
    "deepseek": ("the_void_files_game_service", "deepseek_access_key"),
    "openai": ("the_void_files_game_service", "openai_access_key"),
    "groq": ("the_void_files_game_service", "groq_access_key"),
}


class KeyringAccessKeyVault:
    def read_access_key(self, access_key_name: AccessKeyName) -> str | None:
        keychain_service_name, keychain_account_name = keychain_entries_by_access_key_name[access_key_name]
        try:
            stored_access_key = keyring.get_password(keychain_service_name, keychain_account_name)
        except KeyringError as keyring_error:
            raise AccessKeyVaultUnavailableError() from keyring_error
        if not stored_access_key:
            return None
        return stored_access_key

    def store_access_key(self, access_key_name: AccessKeyName, access_key: str) -> None:
        keychain_service_name, keychain_account_name = keychain_entries_by_access_key_name[access_key_name]
        try:
            keyring.set_password(keychain_service_name, keychain_account_name, access_key)
        except KeyringError as keyring_error:
            raise AccessKeyVaultUnavailableError() from keyring_error

    def delete_access_key(self, access_key_name: AccessKeyName) -> None:
        keychain_service_name, keychain_account_name = keychain_entries_by_access_key_name[access_key_name]
        try:
            keyring.delete_password(keychain_service_name, keychain_account_name)
        except PasswordDeleteError:
            return
        except KeyringError as keyring_error:
            raise AccessKeyVaultUnavailableError() from keyring_error

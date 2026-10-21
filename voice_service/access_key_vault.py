import keyring
from keyring.errors import KeyringError, PasswordDeleteError

keychain_service_name = "the_void_files_voice_service"
keychain_account_name = "elevenlabs_access_key"


class AccessKeyVaultUnavailableError(Exception):
    pass


def read_stored_access_key() -> str | None:
    try:
        stored_access_key = keyring.get_password(keychain_service_name, keychain_account_name)
    except KeyringError as keyring_error:
        raise AccessKeyVaultUnavailableError() from keyring_error
    if not stored_access_key:
        return None
    return stored_access_key


def store_access_key(access_key: str) -> None:
    try:
        keyring.set_password(keychain_service_name, keychain_account_name, access_key)
    except KeyringError as keyring_error:
        raise AccessKeyVaultUnavailableError() from keyring_error


def delete_stored_access_key() -> None:
    try:
        keyring.delete_password(keychain_service_name, keychain_account_name)
    except PasswordDeleteError:
        return
    except KeyringError as keyring_error:
        raise AccessKeyVaultUnavailableError() from keyring_error

from the_void_files.application.ports.access_key_vault import AccessKeyName
from the_void_files.application.service_failures import AccessKeyVaultUnavailableError


class InMemoryAccessKeyVault:
    def __init__(self) -> None:
        self.stored_access_keys: dict[AccessKeyName, str] = {}
        self.is_unavailable = False

    def require_availability(self) -> None:
        if self.is_unavailable:
            raise AccessKeyVaultUnavailableError()

    def read_access_key(self, access_key_name: AccessKeyName) -> str | None:
        self.require_availability()
        return self.stored_access_keys.get(access_key_name)

    def store_access_key(self, access_key_name: AccessKeyName, access_key: str) -> None:
        self.require_availability()
        self.stored_access_keys[access_key_name] = access_key

    def delete_access_key(self, access_key_name: AccessKeyName) -> None:
        self.require_availability()
        self.stored_access_keys.pop(access_key_name, None)

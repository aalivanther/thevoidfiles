import re

from pydantic import BaseModel

from the_void_files.application.ports.access_key_vault import AccessKeyName, AccessKeyVault
from the_void_files.application.service_failures import AccessKeyMalformedError

minimum_access_key_length = 20
maximum_access_key_length = 200
visible_ending_length = 4
access_key_pattern = re.compile(r"^[\x21-\x7e]+$")


class StoredAccessKeyDescription(BaseModel):
    access_key_name: AccessKeyName
    is_access_key_stored: bool
    visible_ending: str | None


def normalize_submitted_access_key(submitted_access_key: str) -> str:
    normalized_access_key = submitted_access_key.strip()
    is_access_key_well_formed = (
        minimum_access_key_length <= len(normalized_access_key) <= maximum_access_key_length
        and access_key_pattern.fullmatch(normalized_access_key) is not None
    )
    if not is_access_key_well_formed:
        raise AccessKeyMalformedError()
    return normalized_access_key


def describe_stored_access_key(
    access_key_vault: AccessKeyVault, access_key_name: AccessKeyName
) -> StoredAccessKeyDescription:
    stored_access_key = access_key_vault.read_access_key(access_key_name)
    if stored_access_key is None:
        return StoredAccessKeyDescription(
            access_key_name=access_key_name, is_access_key_stored=False, visible_ending=None
        )
    return StoredAccessKeyDescription(
        access_key_name=access_key_name,
        is_access_key_stored=True,
        visible_ending=stored_access_key[-visible_ending_length:],
    )

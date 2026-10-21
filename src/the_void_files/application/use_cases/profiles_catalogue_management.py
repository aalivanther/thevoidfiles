import re
import unicodedata
from dataclasses import dataclass
from typing import Protocol

from the_void_files.application.service_failures import ProfileAlreadyRegisteredError
from the_void_files.application.use_cases.profiles_failures import (
    ProfileDisplayNameMalformedError,
    ProfileIdentifierUnavailableError,
)

maximum_display_name_length = 80
maximum_derived_identifier_length = 48
maximum_identifier_derivation_attempt_count = 200
fallback_profile_identifier = "profile"
unsupported_identifier_characters_pattern = re.compile(r"[^a-z0-9]+")


@dataclass(frozen=True)
class ProfileDescription:
    profile_identifier: str
    display_name: str
    created_at_utc: str
    last_opened_at_utc: str | None
    archived_at_utc: str | None

    @property
    def is_archived(self) -> bool:
        return self.archived_at_utc is not None


class ProfileCatalogue(Protocol):
    def register_profile(self, profile_identifier: str, display_name: str) -> str: ...

    def read_profile_description(self, profile_identifier: str) -> ProfileDescription: ...


def normalize_profile_display_name(submitted_display_name: str) -> str:
    normalized_display_name = " ".join(submitted_display_name.split())
    if not normalized_display_name or len(normalized_display_name) > maximum_display_name_length:
        raise ProfileDisplayNameMalformedError()
    if any(unicodedata.category(character).startswith("C") for character in normalized_display_name):
        raise ProfileDisplayNameMalformedError()
    return normalized_display_name


def derive_profile_identifier_from_display_name(display_name: str) -> str:
    decomposed_display_name = unicodedata.normalize("NFKD", display_name)
    unaccented_display_name = "".join(
        character for character in decomposed_display_name if not unicodedata.combining(character)
    )
    derived_identifier = unsupported_identifier_characters_pattern.sub("_", unaccented_display_name.lower()).strip("_")
    derived_identifier = derived_identifier[:maximum_derived_identifier_length].strip("_")
    return derived_identifier or fallback_profile_identifier


def create_profile(
    profile_catalogue: ProfileCatalogue, submitted_display_name: str, requested_profile_identifier: str | None
) -> ProfileDescription:
    display_name = normalize_profile_display_name(submitted_display_name)
    if requested_profile_identifier is not None:
        profile_catalogue.register_profile(requested_profile_identifier, display_name)
        return profile_catalogue.read_profile_description(requested_profile_identifier)
    derived_identifier = derive_profile_identifier_from_display_name(display_name)
    for attempt_number in range(1, maximum_identifier_derivation_attempt_count + 1):
        candidate_identifier = derived_identifier if attempt_number == 1 else f"{derived_identifier}_{attempt_number}"
        try:
            profile_catalogue.register_profile(candidate_identifier, display_name)
        except ProfileAlreadyRegisteredError:
            continue
        return profile_catalogue.read_profile_description(candidate_identifier)
    raise ProfileIdentifierUnavailableError()

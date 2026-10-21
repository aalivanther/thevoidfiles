from fastapi import Request

from the_void_files.infrastructure.database.sqlite_profile_catalogue import require_well_formed_profile_identifier
from the_void_files.service_dependencies import ServiceDependencies

profile_identifier_header_name = "X-Profile-Identifier"


def read_service_dependencies(request: Request) -> ServiceDependencies:
    return request.app.state.service_dependencies


def read_requested_profile_identifier(request: Request) -> str | None:
    requested_profile_identifier = request.headers.get(profile_identifier_header_name)
    if requested_profile_identifier is None:
        return None
    return require_well_formed_profile_identifier(requested_profile_identifier)

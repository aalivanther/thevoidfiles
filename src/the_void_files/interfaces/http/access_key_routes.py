from fastapi import APIRouter, Depends
from pydantic import BaseModel, SecretStr

from the_void_files.application.access_key_description import (
    describe_stored_access_key,
    normalize_submitted_access_key,
)
from the_void_files.application.ports.access_key_vault import AccessKeyName, known_access_key_names
from the_void_files.application.service_failures import AccessKeyNameUnknownError
from the_void_files.interfaces.http.request_context import read_service_dependencies
from the_void_files.service_dependencies import ServiceDependencies

access_key_router = APIRouter(prefix="/api/access-keys")


class AccessKeySubmission(BaseModel):
    access_key: SecretStr


def require_known_access_key_name(candidate_name: str) -> AccessKeyName:
    for known_access_key_name in known_access_key_names:
        if known_access_key_name == candidate_name:
            return known_access_key_name
    raise AccessKeyNameUnknownError()


@access_key_router.get("")
async def describe_access_keys(service_dependencies: ServiceDependencies = Depends(read_service_dependencies)):
    return {
        "access_keys": [
            describe_stored_access_key(service_dependencies.access_key_vault, known_access_key_name).model_dump()
            for known_access_key_name in known_access_key_names
        ]
    }


@access_key_router.put("/{access_key_name}")
async def save_access_key(
    access_key_name: str,
    access_key_submission: AccessKeySubmission,
    service_dependencies: ServiceDependencies = Depends(read_service_dependencies),
):
    known_access_key_name = require_known_access_key_name(access_key_name)
    service_dependencies.access_key_vault.store_access_key(
        known_access_key_name, normalize_submitted_access_key(access_key_submission.access_key.get_secret_value())
    )
    return describe_stored_access_key(service_dependencies.access_key_vault, known_access_key_name).model_dump()


@access_key_router.delete("/{access_key_name}")
async def remove_access_key(
    access_key_name: str, service_dependencies: ServiceDependencies = Depends(read_service_dependencies)
):
    known_access_key_name = require_known_access_key_name(access_key_name)
    service_dependencies.access_key_vault.delete_access_key(known_access_key_name)
    return describe_stored_access_key(service_dependencies.access_key_vault, known_access_key_name).model_dump()

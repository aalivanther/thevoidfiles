from the_void_files.application.service_failures import ServiceFailure


class ProfileDisplayNameMalformedError(ServiceFailure):
    failure_name = "profile_display_name_malformed"
    response_status_code = 422


class ProfileIdentifierUnavailableError(ServiceFailure):
    failure_name = "profile_identifier_unavailable"
    response_status_code = 409


class ChronicleStateUnusableError(ServiceFailure):
    failure_name = "chronicle_state_unusable"
    response_status_code = 422


class ChronicleStorageFormatVersionMismatchedError(ServiceFailure):
    failure_name = "chronicle_storage_format_version_mismatched"
    response_status_code = 422


class ChronicleSnapshotTooLargeError(ServiceFailure):
    failure_name = "chronicle_snapshot_too_large"
    response_status_code = 413


class ChronicleSnapshotVersionConflictError(ServiceFailure):
    failure_name = "chronicle_snapshot_version_conflict"
    response_status_code = 409


class ChronicleClosureRecordUnusableError(ServiceFailure):
    failure_name = "chronicle_closure_record_unusable"
    response_status_code = 422

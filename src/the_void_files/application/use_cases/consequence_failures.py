from the_void_files.application.service_failures import ServiceFailure


class ActionKeyMalformedError(ServiceFailure):
    failure_name = "action_key_malformed"
    response_status_code = 422


class ActionKeyReusedForOtherRequestError(ServiceFailure):
    failure_name = "action_key_reused_for_other_request"
    response_status_code = 409


class StateVersionConflictError(ServiceFailure):
    failure_name = "state_version_conflict"
    response_status_code = 409


class ArchiveNotOpenError(ServiceFailure):
    failure_name = "archive_not_open"
    response_status_code = 409


class ArchiveRunNotActiveError(ServiceFailure):
    failure_name = "archive_run_not_active"
    response_status_code = 409


class ArchiveRunAlreadyEndedError(ServiceFailure):
    failure_name = "archive_run_already_ended"
    response_status_code = 409


class StoredCaseSpecificationUnusableError(ServiceFailure):
    failure_name = "stored_case_specification_unusable"
    response_status_code = 500


class SceneIdentifierMismatchedError(ServiceFailure):
    failure_name = "scene_identifier_mismatched"
    response_status_code = 409


class InteractivePieceUnknownError(ServiceFailure):
    failure_name = "interactive_piece_unknown"
    response_status_code = 404


class InteractivePieceNotOpenToAttemptsError(ServiceFailure):
    failure_name = "interactive_piece_not_open_to_attempts"
    response_status_code = 409


class SubmittedValueUnusableError(ServiceFailure):
    failure_name = "submitted_value_unusable"
    response_status_code = 422


class AssistanceLevelUnavailableError(ServiceFailure):
    failure_name = "assistance_level_unavailable"
    response_status_code = 404


class DirectorCopyMissingError(ServiceFailure):
    failure_name = "director_copy_missing"
    response_status_code = 500

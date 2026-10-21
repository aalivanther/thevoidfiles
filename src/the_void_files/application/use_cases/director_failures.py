from the_void_files.application.service_failures import NarrativeProviderError, ServiceFailure


class StoryProviderSelectionRejectedError(ServiceFailure):
    failure_name = "story_provider_selection_rejected"
    response_status_code = 422


class NarrativeAccessKeyMissingError(NarrativeProviderError):
    failure_name = "narrative_access_key_missing"
    response_status_code = 409


class NarrativeAccessKeyRejectedError(NarrativeProviderError):
    failure_name = "narrative_access_key_rejected"
    response_status_code = 401


class NarrativeQuotaExhaustedError(NarrativeProviderError):
    failure_name = "narrative_quota_exhausted"
    response_status_code = 402


class NarrativeRequestTooLargeError(NarrativeProviderError):
    failure_name = "narrative_request_too_large"
    response_status_code = 413


class NarrativeProviderBusyError(NarrativeProviderError):
    failure_name = "narrative_provider_busy"
    response_status_code = 429


class NarrativeProviderTimedOutError(NarrativeProviderError):
    failure_name = "narrative_provider_timed_out"
    response_status_code = 504


class NarrativeProviderUnreachableError(NarrativeProviderError):
    failure_name = "narrative_provider_unreachable"
    response_status_code = 504


class NarrativeRequestRefusedError(NarrativeProviderError):
    failure_name = "narrative_request_refused"
    response_status_code = 502


class NarrativeModelNotFoundError(NarrativeProviderError):
    failure_name = "narrative_model_not_found"
    response_status_code = 502


class NarrativeResponseBlockedError(NarrativeProviderError):
    failure_name = "narrative_response_blocked"
    response_status_code = 502


class NarrativeResponseEmptyError(NarrativeProviderError):
    failure_name = "narrative_response_empty"
    response_status_code = 502


class SyntheticDirectorMaterialMissingError(ServiceFailure):
    failure_name = "synthetic_director_material_missing"
    response_status_code = 500


class ScriptedPathUnknownError(ServiceFailure):
    failure_name = "scripted_path_unknown"
    response_status_code = 404


class ScriptedPathUnusableError(ServiceFailure):
    failure_name = "scripted_path_unusable"
    response_status_code = 500


class SimulationNeedsClosedArchiveError(ServiceFailure):
    failure_name = "simulation_needs_closed_archive"
    response_status_code = 409


class FailureInjectionNeedsSyntheticProviderError(ServiceFailure):
    failure_name = "failure_injection_needs_synthetic_provider"
    response_status_code = 409


class SimulationRunNotFoundError(ServiceFailure):
    failure_name = "simulation_run_not_found"
    response_status_code = 404


class AiInteractionNotFoundError(ServiceFailure):
    failure_name = "ai_interaction_not_found"
    response_status_code = 404


class AiInteractionBodyUnreadableError(ServiceFailure):
    failure_name = "ai_interaction_body_unreadable"
    response_status_code = 500


class InteractionTimeRangeMalformedError(ServiceFailure):
    failure_name = "interaction_time_range_malformed"
    response_status_code = 422

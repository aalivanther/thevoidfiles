class ServiceFailure(Exception):
    failure_name = "service_failed"
    response_status_code = 500


class AccessKeyVaultUnavailableError(ServiceFailure):
    failure_name = "access_key_vault_unavailable"
    response_status_code = 503


class AccessKeyMissingError(ServiceFailure):
    failure_name = "access_key_missing"
    response_status_code = 409


class AccessKeyMalformedError(ServiceFailure):
    failure_name = "access_key_malformed"
    response_status_code = 422


class AccessKeyNameUnknownError(ServiceFailure):
    failure_name = "access_key_name_unknown"
    response_status_code = 404


class ProfileIdentifierMalformedError(ServiceFailure):
    failure_name = "profile_identifier_malformed"
    response_status_code = 422


class ProfileNotFoundError(ServiceFailure):
    failure_name = "profile_not_found"
    response_status_code = 404


class ProfileAlreadyRegisteredError(ServiceFailure):
    failure_name = "profile_already_registered"
    response_status_code = 409


class SpeechProviderError(ServiceFailure):
    failure_name = "speech_provider_failed"
    response_status_code = 502


class AccessKeyRejectedError(SpeechProviderError):
    failure_name = "access_key_rejected"
    response_status_code = 401


class SpeechQuotaExhaustedError(SpeechProviderError):
    failure_name = "speech_quota_exhausted"
    response_status_code = 402


class SpeechProviderBusyError(SpeechProviderError):
    failure_name = "speech_provider_busy"
    response_status_code = 429


class VoiceNotFoundError(SpeechProviderError):
    failure_name = "voice_not_found"
    response_status_code = 404


class SpeechProviderUnreachableError(SpeechProviderError):
    failure_name = "speech_provider_unreachable"
    response_status_code = 504


class SpeechTextEmptyError(ServiceFailure):
    failure_name = "speech_text_empty"
    response_status_code = 422


class SpeechTextTooLongError(ServiceFailure):
    failure_name = "speech_text_too_long"
    response_status_code = 413


class VoiceIdentifierMalformedError(ServiceFailure):
    failure_name = "voice_identifier_malformed"
    response_status_code = 422


class NarrativeProviderError(ServiceFailure):
    failure_name = "narrative_provider_failed"
    response_status_code = 502


class NarrativeProviderNotConfiguredError(NarrativeProviderError):
    failure_name = "narrative_provider_not_configured"
    response_status_code = 503

from the_void_files.application.service_failures import NarrativeProviderError, ServiceFailure


class ProfileIdentifierRequiredError(ServiceFailure):
    failure_name = "profile_identifier_required"
    response_status_code = 400


class OpeningKeyMalformedError(ServiceFailure):
    failure_name = "opening_key_malformed"
    response_status_code = 422


class OpeningKeyReusedForOtherWhisperError(ServiceFailure):
    failure_name = "opening_key_reused_for_other_whisper"
    response_status_code = 409


class ArchiveAlreadyOpenError(ServiceFailure):
    failure_name = "archive_already_open"
    response_status_code = 409


class WhisperNotOfferedError(ServiceFailure):
    failure_name = "whisper_not_offered"
    response_status_code = 409


class WhisperOfferGenerationRejectedError(NarrativeProviderError):
    failure_name = "whisper_offer_generation_rejected"
    response_status_code = 502


class CaseGenerationRejectedError(NarrativeProviderError):
    failure_name = "case_generation_rejected"
    response_status_code = 502


class CaseGenerationInteractionNotRecordedError(ServiceFailure):
    failure_name = "case_generation_interaction_not_recorded"
    response_status_code = 500


class SyntheticCaseMaterialMissingError(NarrativeProviderError):
    failure_name = "synthetic_case_material_missing"
    response_status_code = 409

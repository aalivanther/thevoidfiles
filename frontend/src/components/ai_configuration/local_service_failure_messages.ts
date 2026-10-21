import { aiConfigurationCopy } from '../../copy/ai_configuration_copy'

export type LocalServiceFailureMessageName = keyof typeof aiConfigurationCopy.localService.failures

const failureMessageNamesByFailureName: Record<string, LocalServiceFailureMessageName> = {
  narrative_access_key_missing: 'key_missing',
  access_key_missing: 'key_missing',
  narrative_access_key_rejected: 'key_rejected',
  access_key_rejected: 'key_rejected',
  access_key_malformed: 'key_malformed',
  request_invalid: 'key_malformed',
  narrative_provider_busy: 'quota_or_rate_limit',
  narrative_quota_exhausted: 'account_without_balance',
  narrative_request_too_large: 'request_too_large',
  speech_quota_exhausted: 'quota_or_rate_limit',
  speech_provider_busy: 'quota_or_rate_limit',
  narrative_provider_timed_out: 'timeout',
  narrative_provider_unreachable: 'timeout',
  speech_provider_unreachable: 'timeout',
  service_absent: 'service_absent',
  request_cancelled: 'service_absent',
  narrative_provider_not_configured: 'provider_not_configured',
  narrative_request_refused: 'provider_refused',
  narrative_model_not_found: 'provider_refused',
  narrative_response_blocked: 'provider_refused',
  narrative_response_empty: 'provider_refused',
  narrative_provider_failed: 'provider_refused',
  speech_provider_failed: 'provider_refused',
  access_key_vault_unavailable: 'vault_unavailable',
  profile_identifier_required: 'profile_missing',
  profile_not_found: 'profile_missing',
  story_provider_selection_rejected: 'selection_rejected',
}

export function readLocalServiceFailureMessage(failureName: string): string {
  return aiConfigurationCopy.localService.failures[failureMessageNamesByFailureName[failureName] ?? 'unknown']
}

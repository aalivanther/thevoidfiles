import { sendGameServiceRequest } from './game_service_client'
import type { GameServiceResult } from './game_service_client'

export type ProviderModeName = 'synthetic' | 'real'

export type ProviderRoleStatus = {
  providerName: string
  modelIdentifier: string | null
  providerModeName: ProviderModeName
  isAccessKeyRequired: boolean
  isAccessKeyStored: boolean
}

export type DirectorProviderStatus = {
  story: ProviderRoleStatus
  voice: ProviderRoleStatus
}

export type StoryConnectionCheckAnswer = {
  providerName: string
  providerModeName: ProviderModeName
  modelIdentifier: string | null
  isDirectorListening: boolean
}

const providerStatusTimeoutMilliseconds = 6000
const storyConnectionCheckTimeoutMilliseconds = 180000
const unexpectedServiceAnswer = {
  wasSuccessful: false,
  failureName: 'unexpected_service_answer',
  responseStatusCode: null,
} as const

function isRecord(candidate: unknown): candidate is Record<string, unknown> {
  return typeof candidate === 'object' && candidate !== null
}

function readProviderModeName(candidate: unknown): ProviderModeName | null {
  return candidate === 'synthetic' || candidate === 'real' ? candidate : null
}

function readProviderRoleStatus(candidate: unknown): ProviderRoleStatus | null {
  if (!isRecord(candidate)) {
    return null
  }
  const providerModeName = readProviderModeName(candidate.provider_mode_name)
  if (
    providerModeName === null ||
    typeof candidate.provider_name !== 'string' ||
    typeof candidate.is_access_key_required !== 'boolean' ||
    typeof candidate.is_access_key_stored !== 'boolean'
  ) {
    return null
  }
  return {
    providerName: candidate.provider_name,
    modelIdentifier: typeof candidate.model_identifier === 'string' ? candidate.model_identifier : null,
    providerModeName,
    isAccessKeyRequired: candidate.is_access_key_required,
    isAccessKeyStored: candidate.is_access_key_stored,
  }
}

export async function readDirectorProviderStatus(): Promise<GameServiceResult<DirectorProviderStatus>> {
  const result = await sendGameServiceRequest('/api/director/provider-status', {
    method: 'GET',
    timeoutMilliseconds: providerStatusTimeoutMilliseconds,
  })
  if (!result.wasSuccessful) {
    return result
  }
  if (!isRecord(result.value)) {
    return unexpectedServiceAnswer
  }
  const storyStatus = readProviderRoleStatus(result.value.story)
  const voiceStatus = readProviderRoleStatus(result.value.voice)
  if (storyStatus === null || voiceStatus === null) {
    return unexpectedServiceAnswer
  }
  return { wasSuccessful: true, value: { story: storyStatus, voice: voiceStatus } }
}

export async function checkStoryConnectionThroughGameService(
  profileIdentifier: string,
  cancellationSignal?: AbortSignal,
): Promise<GameServiceResult<StoryConnectionCheckAnswer>> {
  const result = await sendGameServiceRequest('/api/director/story-connection-check', {
    method: 'POST',
    profileIdentifier,
    timeoutMilliseconds: storyConnectionCheckTimeoutMilliseconds,
    cancellationSignal,
  })
  if (!result.wasSuccessful) {
    return result
  }
  if (!isRecord(result.value)) {
    return unexpectedServiceAnswer
  }
  const providerModeName = readProviderModeName(result.value.provider_mode_name)
  if (
    providerModeName === null ||
    typeof result.value.provider_name !== 'string' ||
    typeof result.value.is_director_listening !== 'boolean'
  ) {
    return unexpectedServiceAnswer
  }
  return {
    wasSuccessful: true,
    value: {
      providerName: result.value.provider_name,
      providerModeName,
      modelIdentifier: typeof result.value.model_identifier === 'string' ? result.value.model_identifier : null,
      isDirectorListening: result.value.is_director_listening,
    },
  }
}

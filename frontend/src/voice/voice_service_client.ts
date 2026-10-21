import { gameServiceProfileIdentifierHeaderName } from '../game_service/game_service_client'
import { readActiveProfileIdentifier } from '../game_service/game_service_presence'

export const voiceServiceBaseAddress = 'http://127.0.0.1:8765'

const voiceServiceQuickRequestTimeoutMilliseconds = 4000
const voiceServiceProviderRequestTimeoutMilliseconds = 30000

const knownVoiceServiceFailureNames = [
  'access_key_missing',
  'access_key_malformed',
  'access_key_rejected',
  'access_key_vault_unavailable',
  'speech_quota_exhausted',
  'speech_provider_busy',
  'speech_provider_unreachable',
  'speech_provider_failed',
  'speech_text_empty',
  'speech_text_too_long',
  'voice_not_found',
  'voice_identifier_malformed',
  'request_invalid',
  'origin_not_allowed',
] as const

export type VoiceServiceFailureName =
  | (typeof knownVoiceServiceFailureNames)[number]
  | 'service_absent'
  | 'request_cancelled'
  | 'unexpected_service_answer'

export type VoiceServiceResult<ResultValue> =
  | { wasSuccessful: true; value: ResultValue }
  | { wasSuccessful: false; failureName: VoiceServiceFailureName }

export type VoiceServiceStatus = {
  isAccessKeyStored: boolean
  maximumSpeechTextLength: number
}

export type AvailableNarrationVoice = {
  voiceIdentifier: string
  visibleName: string
  speaksSpanish: boolean
}

function isRecord(candidate: unknown): candidate is Record<string, unknown> {
  return typeof candidate === 'object' && candidate !== null
}

async function readFailureName(response: Response): Promise<VoiceServiceFailureName> {
  try {
    const parsedBody: unknown = await response.json()
    if (isRecord(parsedBody)) {
      const matchingFailureName = knownVoiceServiceFailureNames.find(
        (knownFailureName) => knownFailureName === parsedBody.failure_name,
      )
      if (matchingFailureName) {
        return matchingFailureName
      }
    }
    return 'unexpected_service_answer'
  } catch {
    return 'unexpected_service_answer'
  }
}

async function sendVoiceServiceRequest(
  path: string,
  requestOptions: { method: 'GET' | 'POST' | 'DELETE'; jsonBody?: unknown; timeoutMilliseconds: number; cancellationSignal?: AbortSignal },
): Promise<VoiceServiceResult<Response>> {
  const timeoutAbortController = new AbortController()
  const timeoutIdentifier = window.setTimeout(() => timeoutAbortController.abort(), requestOptions.timeoutMilliseconds)
  const cancelFromOutside = () => timeoutAbortController.abort()
  requestOptions.cancellationSignal?.addEventListener('abort', cancelFromOutside)
  try {
    if (requestOptions.cancellationSignal?.aborted) {
      return { wasSuccessful: false, failureName: 'request_cancelled' }
    }
    const requestHeaders: Record<string, string> = {}
    if (requestOptions.jsonBody !== undefined) {
      requestHeaders['Content-Type'] = 'application/json'
    }
    const activeProfileIdentifier = readActiveProfileIdentifier()
    if (activeProfileIdentifier !== null) {
      requestHeaders[gameServiceProfileIdentifierHeaderName] = activeProfileIdentifier
    }
    const response = await fetch(`${voiceServiceBaseAddress}${path}`, {
      method: requestOptions.method,
      headers: requestHeaders,
      body: requestOptions.jsonBody === undefined ? undefined : JSON.stringify(requestOptions.jsonBody),
      signal: timeoutAbortController.signal,
      cache: 'no-store',
      credentials: 'omit',
    })
    if (!response.ok) {
      return { wasSuccessful: false, failureName: await readFailureName(response) }
    }
    return { wasSuccessful: true, value: response }
  } catch {
    return {
      wasSuccessful: false,
      failureName: requestOptions.cancellationSignal?.aborted ? 'request_cancelled' : 'service_absent',
    }
  } finally {
    window.clearTimeout(timeoutIdentifier)
    requestOptions.cancellationSignal?.removeEventListener('abort', cancelFromOutside)
  }
}

async function readJsonRecord(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const parsedBody: unknown = await response.json()
    return isRecord(parsedBody) ? parsedBody : null
  } catch {
    return null
  }
}

export async function readVoiceServiceStatus(): Promise<VoiceServiceResult<VoiceServiceStatus>> {
  const result = await sendVoiceServiceRequest('/service-status', {
    method: 'GET',
    timeoutMilliseconds: voiceServiceQuickRequestTimeoutMilliseconds,
  })
  if (!result.wasSuccessful) {
    return result
  }
  const statusRecord = await readJsonRecord(result.value)
  if (
    !statusRecord ||
    typeof statusRecord.is_access_key_stored !== 'boolean' ||
    typeof statusRecord.maximum_speech_text_length !== 'number'
  ) {
    return { wasSuccessful: false, failureName: 'unexpected_service_answer' }
  }
  return {
    wasSuccessful: true,
    value: {
      isAccessKeyStored: statusRecord.is_access_key_stored,
      maximumSpeechTextLength: statusRecord.maximum_speech_text_length,
    },
  }
}

export async function storeVoiceAccessKey(accessKey: string): Promise<VoiceServiceResult<null>> {
  const result = await sendVoiceServiceRequest('/access-key', {
    method: 'POST',
    jsonBody: { access_key: accessKey },
    timeoutMilliseconds: voiceServiceQuickRequestTimeoutMilliseconds,
  })
  return result.wasSuccessful ? { wasSuccessful: true, value: null } : result
}

export async function deleteVoiceAccessKey(): Promise<VoiceServiceResult<null>> {
  const result = await sendVoiceServiceRequest('/access-key', {
    method: 'DELETE',
    timeoutMilliseconds: voiceServiceQuickRequestTimeoutMilliseconds,
  })
  return result.wasSuccessful ? { wasSuccessful: true, value: null } : result
}

export async function listAvailableNarrationVoices(): Promise<VoiceServiceResult<AvailableNarrationVoice[]>> {
  const result = await sendVoiceServiceRequest('/voices', {
    method: 'GET',
    timeoutMilliseconds: voiceServiceProviderRequestTimeoutMilliseconds,
  })
  if (!result.wasSuccessful) {
    return result
  }
  const voicesRecord = await readJsonRecord(result.value)
  if (!voicesRecord || !Array.isArray(voicesRecord.voices)) {
    return { wasSuccessful: false, failureName: 'unexpected_service_answer' }
  }
  const availableVoices: AvailableNarrationVoice[] = []
  for (const voiceCandidate of voicesRecord.voices as unknown[]) {
    if (
      isRecord(voiceCandidate) &&
      typeof voiceCandidate.voice_identifier === 'string' &&
      typeof voiceCandidate.visible_name === 'string'
    ) {
      availableVoices.push({
        voiceIdentifier: voiceCandidate.voice_identifier,
        visibleName: voiceCandidate.visible_name,
        speaksSpanish: voiceCandidate.speaks_spanish === true,
      })
    }
  }
  return { wasSuccessful: true, value: availableVoices }
}

export async function requestSpeechAudio(
  text: string,
  voiceIdentifier: string,
  cancellationSignal: AbortSignal,
): Promise<VoiceServiceResult<Blob>> {
  const result = await sendVoiceServiceRequest('/speech', {
    method: 'POST',
    jsonBody: { text, voice_identifier: voiceIdentifier },
    timeoutMilliseconds: voiceServiceProviderRequestTimeoutMilliseconds,
    cancellationSignal,
  })
  if (!result.wasSuccessful) {
    return result
  }
  try {
    const audioBlob = await result.value.blob()
    if (audioBlob.size === 0) {
      return { wasSuccessful: false, failureName: 'unexpected_service_answer' }
    }
    return { wasSuccessful: true, value: audioBlob }
  } catch {
    return {
      wasSuccessful: false,
      failureName: cancellationSignal.aborted ? 'request_cancelled' : 'service_absent',
    }
  }
}

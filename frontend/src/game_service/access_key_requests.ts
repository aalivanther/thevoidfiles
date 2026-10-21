import { sendGameServiceRequest } from './game_service_client'
import type { GameServiceResult } from './game_service_client'

export type AccessKeyName = 'gemini' | 'deepseek' | 'openai' | 'groq' | 'elevenlabs'

export type StoredAccessKeyDescription = {
  accessKeyName: AccessKeyName
  isAccessKeyStored: boolean
  visibleEnding: string | null
}

const accessKeyRequestTimeoutMilliseconds = 6000
const knownAccessKeyNames: readonly AccessKeyName[] = ['gemini', 'deepseek', 'openai', 'groq', 'elevenlabs']

function isRecord(candidate: unknown): candidate is Record<string, unknown> {
  return typeof candidate === 'object' && candidate !== null
}

function readStoredAccessKeyDescription(candidate: unknown): StoredAccessKeyDescription | null {
  if (!isRecord(candidate) || typeof candidate.is_access_key_stored !== 'boolean') {
    return null
  }
  const accessKeyName = knownAccessKeyNames.find((knownAccessKeyName) => knownAccessKeyName === candidate.access_key_name)
  if (!accessKeyName) {
    return null
  }
  return {
    accessKeyName,
    isAccessKeyStored: candidate.is_access_key_stored,
    visibleEnding: typeof candidate.visible_ending === 'string' ? candidate.visible_ending : null,
  }
}

function readSingleDescriptionResult(result: GameServiceResult<unknown>): GameServiceResult<StoredAccessKeyDescription> {
  if (!result.wasSuccessful) {
    return result
  }
  const storedAccessKeyDescription = readStoredAccessKeyDescription(result.value)
  return storedAccessKeyDescription
    ? { wasSuccessful: true, value: storedAccessKeyDescription }
    : { wasSuccessful: false, failureName: 'unexpected_service_answer', responseStatusCode: null }
}

export async function readStoredAccessKeyDescriptions(): Promise<GameServiceResult<StoredAccessKeyDescription[]>> {
  const result = await sendGameServiceRequest('/api/access-keys', {
    method: 'GET',
    timeoutMilliseconds: accessKeyRequestTimeoutMilliseconds,
  })
  if (!result.wasSuccessful) {
    return result
  }
  if (!isRecord(result.value) || !Array.isArray(result.value.access_keys)) {
    return { wasSuccessful: false, failureName: 'unexpected_service_answer', responseStatusCode: null }
  }
  const storedAccessKeyDescriptions: StoredAccessKeyDescription[] = []
  for (const descriptionCandidate of result.value.access_keys as unknown[]) {
    const storedAccessKeyDescription = readStoredAccessKeyDescription(descriptionCandidate)
    if (storedAccessKeyDescription) {
      storedAccessKeyDescriptions.push(storedAccessKeyDescription)
    }
  }
  return { wasSuccessful: true, value: storedAccessKeyDescriptions }
}

export async function saveAccessKeyThroughGameService(
  accessKeyName: AccessKeyName,
  accessKey: string,
): Promise<GameServiceResult<StoredAccessKeyDescription>> {
  return readSingleDescriptionResult(
    await sendGameServiceRequest(`/api/access-keys/${accessKeyName}`, {
      method: 'PUT',
      jsonBody: { access_key: accessKey },
      timeoutMilliseconds: accessKeyRequestTimeoutMilliseconds,
    }),
  )
}

export async function removeAccessKeyThroughGameService(
  accessKeyName: AccessKeyName,
): Promise<GameServiceResult<StoredAccessKeyDescription>> {
  return readSingleDescriptionResult(
    await sendGameServiceRequest(`/api/access-keys/${accessKeyName}`, {
      method: 'DELETE',
      timeoutMilliseconds: accessKeyRequestTimeoutMilliseconds,
    }),
  )
}

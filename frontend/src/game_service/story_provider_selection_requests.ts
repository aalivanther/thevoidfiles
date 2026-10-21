import { sendGameServiceRequest } from './game_service_client'
import type { GameServiceResult } from './game_service_client'

export type StoryProviderName = 'gemini' | 'deepseek' | 'openai' | 'groq'

export type StoryProviderCatalogEntry = {
  providerName: StoryProviderName
  modelIdentifiers: string[]
  defaultModelIdentifier: string
}

export type StoryProviderSelection = {
  providerName: StoryProviderName
  modelIdentifier: string
  defaultModelIdentifier: string
}

const knownStoryProviderNames: readonly StoryProviderName[] = ['gemini', 'deepseek', 'openai', 'groq']
const catalogTimeoutMilliseconds = 6000
const selectionTimeoutMilliseconds = 8000
const unexpectedServiceAnswer = {
  wasSuccessful: false,
  failureName: 'unexpected_service_answer',
  responseStatusCode: null,
} as const

function isRecord(candidate: unknown): candidate is Record<string, unknown> {
  return typeof candidate === 'object' && candidate !== null
}

function readStoryProviderName(candidate: unknown): StoryProviderName | null {
  return knownStoryProviderNames.find((knownStoryProviderName) => knownStoryProviderName === candidate) ?? null
}

function readCatalogEntry(candidate: unknown): StoryProviderCatalogEntry | null {
  if (!isRecord(candidate) || !Array.isArray(candidate.model_identifiers) || typeof candidate.default_model_identifier !== 'string') {
    return null
  }
  const providerName = readStoryProviderName(candidate.provider_name)
  if (providerName === null) {
    return null
  }
  const modelIdentifiers = candidate.model_identifiers.filter((modelIdentifier) => typeof modelIdentifier === 'string')
  if (modelIdentifiers.length === 0) {
    return null
  }
  return {
    providerName,
    modelIdentifiers,
    defaultModelIdentifier: candidate.default_model_identifier,
  }
}

function readSelection(candidate: unknown): StoryProviderSelection | null {
  if (!isRecord(candidate) || typeof candidate.model_identifier !== 'string' || typeof candidate.default_model_identifier !== 'string') {
    return null
  }
  const providerName = readStoryProviderName(candidate.provider_name)
  if (providerName === null) {
    return null
  }
  return {
    providerName,
    modelIdentifier: candidate.model_identifier,
    defaultModelIdentifier: candidate.default_model_identifier,
  }
}

export async function readStoryProviderCatalog(): Promise<GameServiceResult<StoryProviderCatalogEntry[]>> {
  const result = await sendGameServiceRequest('/api/director/story-provider-catalog', {
    method: 'GET',
    timeoutMilliseconds: catalogTimeoutMilliseconds,
  })
  if (!result.wasSuccessful) {
    return result
  }
  if (!isRecord(result.value) || !Array.isArray(result.value.providers)) {
    return unexpectedServiceAnswer
  }
  const catalogEntries: StoryProviderCatalogEntry[] = []
  for (const providerCandidate of result.value.providers) {
    const catalogEntry = readCatalogEntry(providerCandidate)
    if (catalogEntry) {
      catalogEntries.push(catalogEntry)
    }
  }
  return catalogEntries.length > 0
    ? { wasSuccessful: true, value: catalogEntries }
    : unexpectedServiceAnswer
}

export async function readStoryProviderSelection(): Promise<GameServiceResult<StoryProviderSelection>> {
  const result = await sendGameServiceRequest('/api/director/story-provider-selection', {
    method: 'GET',
    timeoutMilliseconds: selectionTimeoutMilliseconds,
  })
  if (!result.wasSuccessful) {
    return result
  }
  const storyProviderSelection = readSelection(result.value)
  return storyProviderSelection
    ? { wasSuccessful: true, value: storyProviderSelection }
    : unexpectedServiceAnswer
}

export async function saveStoryProviderSelectionThroughGameService(
  providerName: StoryProviderName,
  modelIdentifier: string,
): Promise<GameServiceResult<StoryProviderSelection>> {
  const result = await sendGameServiceRequest('/api/director/story-provider-selection', {
    method: 'PUT',
    jsonBody: { provider_name: providerName, model_identifier: modelIdentifier },
    timeoutMilliseconds: selectionTimeoutMilliseconds,
  })
  if (!result.wasSuccessful) {
    return result
  }
  const storyProviderSelection = readSelection(result.value)
  return storyProviderSelection
    ? { wasSuccessful: true, value: storyProviderSelection }
    : unexpectedServiceAnswer
}

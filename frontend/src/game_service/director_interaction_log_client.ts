import { sendGameServiceRequest } from './game_service_client'
import type { GameServiceFailure, GameServiceResult } from './game_service_client'

export type DirectorInteractionFilter = {
  purposeName?: string
  providerName?: string
  providerModeName?: 'synthetic' | 'real'
  providerKindName?: 'narrative' | 'speech'
  areFailuresOnly?: boolean
  archiveCaseIdentifier?: string
  turnIdentifier?: string
  startedFromUtc?: string
  startedUntilUtc?: string
}

export type DirectorGenerationAttempt = {
  purposeName: string
  attemptNumber: number
  outcomeName: string
  failureName: string | null
  validationErrors: { errorName: string; locationText: string }[]
}

export type DirectorRecordedInteraction = {
  sequenceNumber: number
  interactionIdentifier: string
  providerKindName: string
  providerName: string
  providerModeName: string
  operationName: string
  modelIdentifier: string | null
  purposeName: string
  turnIdentifier: string | null
  outcomeName: string
  failureName: string | null
  startedAtUtc: string
  finishedAtUtc: string
  durationMilliseconds: number
  wasAnswerRejectedByValidation: boolean
  generationAttempts: DirectorGenerationAttempt[]
}

export type DirectorRecordedInteractionWithBodies = DirectorRecordedInteraction & {
  requestBody: Record<string, unknown>
  responseBody: Record<string, unknown>
}

export type DirectorInteractionSummary = {
  interactionCount: number
  succeededInteractionCount: number
  failedInteractionCount: number
  interactionCountsByPurposeName: Record<string, number>
  interactionCountsByProviderName: Record<string, number>
  interactionCountsByProviderModeName: Record<string, number>
  failureCountsByFailureName: Record<string, number>
  rejectedAnswerCount: number
  repairAttemptCount: number
  validationErrorCountsByErrorName: Record<string, number>
  latencyMilliseconds: { total: number; average: number; median: number; highest: number }
  inputTokenCount: number
  outputTokenCount: number
  unreadableBodyCount: number
}

const unexpectedInteractionLogAnswer: GameServiceFailure = {
  wasSuccessful: false,
  failureName: 'unexpected_service_answer',
  responseStatusCode: null,
}

function isServiceAnswerRecord(candidate: unknown): candidate is Record<string, unknown> {
  return typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate)
}

function readOptionalText(candidate: unknown): string | null {
  return typeof candidate === 'string' ? candidate : null
}

function readWholeNumber(candidate: unknown): number {
  return typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : 0
}

function readCountsByName(candidate: unknown): Record<string, number> {
  const countsByName: Record<string, number> = {}
  if (isServiceAnswerRecord(candidate)) {
    for (const [countedName, countCandidate] of Object.entries(candidate)) {
      if (typeof countCandidate === 'number') {
        countsByName[countedName] = countCandidate
      }
    }
  }
  return countsByName
}

function buildFilterQueryText(interactionFilter: DirectorInteractionFilter): string {
  const queryParameters = new URLSearchParams()
  const filterEntries: [string, string | undefined][] = [
    ['purpose_name', interactionFilter.purposeName],
    ['provider_name', interactionFilter.providerName],
    ['provider_mode_name', interactionFilter.providerModeName],
    ['provider_kind_name', interactionFilter.providerKindName],
    ['archive_case_identifier', interactionFilter.archiveCaseIdentifier],
    ['turn_identifier', interactionFilter.turnIdentifier],
    ['started_from_utc', interactionFilter.startedFromUtc],
    ['started_until_utc', interactionFilter.startedUntilUtc],
  ]
  for (const [parameterName, parameterValue] of filterEntries) {
    if (parameterValue !== undefined) {
      queryParameters.set(parameterName, parameterValue)
    }
  }
  if (interactionFilter.areFailuresOnly) {
    queryParameters.set('are_failures_only', 'true')
  }
  return queryParameters.toString()
}

function readGenerationAttempts(candidate: unknown): DirectorGenerationAttempt[] {
  if (!Array.isArray(candidate)) {
    return []
  }
  const generationAttempts: DirectorGenerationAttempt[] = []
  for (const attemptCandidate of candidate as unknown[]) {
    if (
      !isServiceAnswerRecord(attemptCandidate) ||
      typeof attemptCandidate.purpose_name !== 'string' ||
      typeof attemptCandidate.attempt_number !== 'number' ||
      typeof attemptCandidate.outcome_name !== 'string'
    ) {
      continue
    }
    const validationErrors: { errorName: string; locationText: string }[] = []
    if (Array.isArray(attemptCandidate.validation_errors)) {
      for (const errorCandidate of attemptCandidate.validation_errors as unknown[]) {
        if (isServiceAnswerRecord(errorCandidate)) {
          validationErrors.push({
            errorName: readOptionalText(errorCandidate.error_name) ?? readOptionalText(errorCandidate.error_type_name) ?? '',
            locationText: readOptionalText(errorCandidate.location_text) ?? '',
          })
        }
      }
    }
    generationAttempts.push({
      purposeName: attemptCandidate.purpose_name,
      attemptNumber: attemptCandidate.attempt_number,
      outcomeName: attemptCandidate.outcome_name,
      failureName: readOptionalText(attemptCandidate.failure_name),
      validationErrors,
    })
  }
  return generationAttempts
}

function readRecordedInteraction(candidate: unknown): DirectorRecordedInteraction | null {
  if (
    !isServiceAnswerRecord(candidate) ||
    typeof candidate.sequence_number !== 'number' ||
    typeof candidate.interaction_identifier !== 'string' ||
    typeof candidate.provider_kind_name !== 'string' ||
    typeof candidate.provider_name !== 'string' ||
    typeof candidate.provider_mode_name !== 'string' ||
    typeof candidate.operation_name !== 'string' ||
    typeof candidate.purpose_name !== 'string' ||
    typeof candidate.outcome_name !== 'string' ||
    typeof candidate.started_at_utc !== 'string' ||
    typeof candidate.finished_at_utc !== 'string' ||
    typeof candidate.duration_milliseconds !== 'number'
  ) {
    return null
  }
  return {
    sequenceNumber: candidate.sequence_number,
    interactionIdentifier: candidate.interaction_identifier,
    providerKindName: candidate.provider_kind_name,
    providerName: candidate.provider_name,
    providerModeName: candidate.provider_mode_name,
    operationName: candidate.operation_name,
    modelIdentifier: readOptionalText(candidate.model_identifier),
    purposeName: candidate.purpose_name,
    turnIdentifier: readOptionalText(candidate.turn_identifier),
    outcomeName: candidate.outcome_name,
    failureName: readOptionalText(candidate.failure_name),
    startedAtUtc: candidate.started_at_utc,
    finishedAtUtc: candidate.finished_at_utc,
    durationMilliseconds: candidate.duration_milliseconds,
    wasAnswerRejectedByValidation: candidate.was_answer_rejected_by_validation === true,
    generationAttempts: readGenerationAttempts(candidate.generation_attempts),
  }
}

export async function listDirectorInteractions(
  profileIdentifier: string | null,
  interactionFilter: DirectorInteractionFilter = {},
  maximumCount = 100,
  skippedCount = 0,
): Promise<GameServiceResult<{ storedInteractionCount: number; interactions: DirectorRecordedInteraction[] }>> {
  const filterQueryText = buildFilterQueryText(interactionFilter)
  const result = await sendGameServiceRequest(
    `/api/director/interactions?maximum_count=${maximumCount}&skipped_count=${skippedCount}${filterQueryText ? `&${filterQueryText}` : ''}`,
    { method: 'GET', profileIdentifier },
  )
  if (!result.wasSuccessful) {
    return result
  }
  if (!isServiceAnswerRecord(result.value) || !Array.isArray(result.value.interactions)) {
    return unexpectedInteractionLogAnswer
  }
  const recordedInteractions: DirectorRecordedInteraction[] = []
  for (const interactionCandidate of result.value.interactions as unknown[]) {
    const recordedInteraction = readRecordedInteraction(interactionCandidate)
    if (recordedInteraction === null) {
      return unexpectedInteractionLogAnswer
    }
    recordedInteractions.push(recordedInteraction)
  }
  return {
    wasSuccessful: true,
    value: {
      storedInteractionCount: readWholeNumber(result.value.stored_interaction_count),
      interactions: recordedInteractions,
    },
  }
}

export async function readDirectorInteraction(
  profileIdentifier: string | null,
  interactionIdentifier: string,
): Promise<GameServiceResult<DirectorRecordedInteractionWithBodies>> {
  const result = await sendGameServiceRequest(`/api/director/interactions/${encodeURIComponent(interactionIdentifier)}`, {
    method: 'GET',
    profileIdentifier,
  })
  if (!result.wasSuccessful) {
    return result
  }
  const recordedInteraction = readRecordedInteraction(result.value)
  if (
    recordedInteraction === null ||
    !isServiceAnswerRecord(result.value) ||
    !isServiceAnswerRecord(result.value.request_body) ||
    !isServiceAnswerRecord(result.value.response_body)
  ) {
    return unexpectedInteractionLogAnswer
  }
  return {
    wasSuccessful: true,
    value: {
      ...recordedInteraction,
      requestBody: result.value.request_body,
      responseBody: result.value.response_body,
    },
  }
}

export async function readDirectorInteractionSummary(
  profileIdentifier: string | null,
  interactionFilter: DirectorInteractionFilter = {},
): Promise<GameServiceResult<DirectorInteractionSummary>> {
  const filterQueryText = buildFilterQueryText(interactionFilter)
  const result = await sendGameServiceRequest(
    `/api/director/interactions/summary${filterQueryText ? `?${filterQueryText}` : ''}`,
    { method: 'GET', profileIdentifier },
  )
  if (!result.wasSuccessful) {
    return result
  }
  const summaryRecord = result.value
  if (!isServiceAnswerRecord(summaryRecord) || typeof summaryRecord.interaction_count !== 'number') {
    return unexpectedInteractionLogAnswer
  }
  const latencyRecord = isServiceAnswerRecord(summaryRecord.latency_milliseconds) ? summaryRecord.latency_milliseconds : {}
  return {
    wasSuccessful: true,
    value: {
      interactionCount: summaryRecord.interaction_count,
      succeededInteractionCount: readWholeNumber(summaryRecord.succeeded_interaction_count),
      failedInteractionCount: readWholeNumber(summaryRecord.failed_interaction_count),
      interactionCountsByPurposeName: readCountsByName(summaryRecord.interaction_counts_by_purpose_name),
      interactionCountsByProviderName: readCountsByName(summaryRecord.interaction_counts_by_provider_name),
      interactionCountsByProviderModeName: readCountsByName(summaryRecord.interaction_counts_by_provider_mode_name),
      failureCountsByFailureName: readCountsByName(summaryRecord.failure_counts_by_failure_name),
      rejectedAnswerCount: readWholeNumber(summaryRecord.rejected_answer_count),
      repairAttemptCount: readWholeNumber(summaryRecord.repair_attempt_count),
      validationErrorCountsByErrorName: readCountsByName(summaryRecord.validation_error_counts_by_error_name),
      latencyMilliseconds: {
        total: readWholeNumber(latencyRecord.total),
        average: readWholeNumber(latencyRecord.average),
        median: readWholeNumber(latencyRecord.median),
        highest: readWholeNumber(latencyRecord.highest),
      },
      inputTokenCount: readWholeNumber(summaryRecord.input_token_count),
      outputTokenCount: readWholeNumber(summaryRecord.output_token_count),
      unreadableBodyCount: readWholeNumber(summaryRecord.unreadable_body_count),
    },
  }
}

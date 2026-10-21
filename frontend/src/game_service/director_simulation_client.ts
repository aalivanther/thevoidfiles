import { sendGameServiceRequest } from './game_service_client'
import type { GameServiceFailure, GameServiceResult } from './game_service_client'

const directorSimulationTimeoutMilliseconds = 600000
const directorConnectionCheckTimeoutMilliseconds = 130000

export type DirectorSimulatedPurposeName = 'adjudication' | 'narration' | 'piece_assistance' | 'chapter_summary'

export type DirectorInjectedFailureModeName = 'invalid_json' | 'impossible_effect' | 'timeout' | 'stale_state_version'

export type DirectorInjectedFailure = {
  stepNumber: number
  purposeName: DirectorSimulatedPurposeName
  failureModeName: DirectorInjectedFailureModeName
  failingAttemptCount?: number
}

export type DirectorSimulationRequest = {
  scriptedPathIdentifier: string
  voiceIdentifier?: string
  isSpeechEnabled?: boolean
  injectedFailures?: DirectorInjectedFailure[]
}

export type DirectorScriptedPathDescription = {
  scriptedPathIdentifier: string
  whisperIdentifier: string
  expectedArchiveOutcomeKindName: string
  stepCount: number
}

export type DirectorSimulationFailure = {
  stepNumber: number | null
  stageName: string
  failureName: string
}

export type DirectorSimulationReport = {
  simulationRunIdentifier: string
  scriptedPathIdentifier: string
  outcomeName: 'completed' | 'failed'
  narrativeProviderName: string
  narrativeProviderModeName: 'synthetic' | 'real'
  speechProviderName: string
  speechProviderModeName: 'synthetic' | 'real'
  playedStepCount: number
  scriptedStepCount: number
  stateVersions: number[]
  reachedArchiveOutcomeKindName: string | null
  isArchiveClosed: boolean
  recordedInteractionCount: number
  generatedAudioCount: number
  cachedAudioCount: number
  failures: DirectorSimulationFailure[]
  wholeReport: Record<string, unknown>
}

export type DirectorRoleStatus = {
  providerName: string
  providerModeName: 'synthetic' | 'real'
  isAccessKeyRequired: boolean
  isAccessKeyStored: boolean
}

export type DirectorProviderStatus = { story: DirectorRoleStatus; voice: DirectorRoleStatus }

export type DirectorStoryConnectionCheck = {
  providerName: string
  providerModeName: 'synthetic' | 'real'
  modelIdentifier: string
  interactionIdentifier: string | null
  isDirectorListening: boolean
}

const unexpectedDirectorServiceAnswer: GameServiceFailure = {
  wasSuccessful: false,
  failureName: 'unexpected_service_answer',
  responseStatusCode: null,
}

function isServiceAnswerRecord(candidate: unknown): candidate is Record<string, unknown> {
  return typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate)
}

function isProviderModeName(candidate: unknown): candidate is 'synthetic' | 'real' {
  return candidate === 'synthetic' || candidate === 'real'
}

function readSimulationFailures(candidate: unknown): DirectorSimulationFailure[] | null {
  if (!Array.isArray(candidate)) {
    return null
  }
  const simulationFailures: DirectorSimulationFailure[] = []
  for (const failureCandidate of candidate as unknown[]) {
    if (
      !isServiceAnswerRecord(failureCandidate) ||
      typeof failureCandidate.stage_name !== 'string' ||
      typeof failureCandidate.failure_name !== 'string' ||
      (failureCandidate.step_number !== null && typeof failureCandidate.step_number !== 'number')
    ) {
      return null
    }
    simulationFailures.push({
      stepNumber: failureCandidate.step_number,
      stageName: failureCandidate.stage_name,
      failureName: failureCandidate.failure_name,
    })
  }
  return simulationFailures
}

function readSimulationReport(candidate: unknown): DirectorSimulationReport | null {
  if (!isServiceAnswerRecord(candidate)) {
    return null
  }
  const simulationFailures = readSimulationFailures(candidate.failures)
  if (
    simulationFailures === null ||
    typeof candidate.simulation_run_identifier !== 'string' ||
    typeof candidate.scripted_path_identifier !== 'string' ||
    (candidate.outcome_name !== 'completed' && candidate.outcome_name !== 'failed') ||
    typeof candidate.narrative_provider_name !== 'string' ||
    !isProviderModeName(candidate.narrative_provider_mode_name) ||
    typeof candidate.speech_provider_name !== 'string' ||
    !isProviderModeName(candidate.speech_provider_mode_name) ||
    typeof candidate.played_step_count !== 'number' ||
    typeof candidate.scripted_step_count !== 'number' ||
    !Array.isArray(candidate.state_versions) ||
    typeof candidate.is_archive_closed !== 'boolean' ||
    typeof candidate.recorded_interaction_count !== 'number' ||
    typeof candidate.generated_audio_count !== 'number' ||
    typeof candidate.cached_audio_count !== 'number'
  ) {
    return null
  }
  return {
    simulationRunIdentifier: candidate.simulation_run_identifier,
    scriptedPathIdentifier: candidate.scripted_path_identifier,
    outcomeName: candidate.outcome_name,
    narrativeProviderName: candidate.narrative_provider_name,
    narrativeProviderModeName: candidate.narrative_provider_mode_name,
    speechProviderName: candidate.speech_provider_name,
    speechProviderModeName: candidate.speech_provider_mode_name,
    playedStepCount: candidate.played_step_count,
    scriptedStepCount: candidate.scripted_step_count,
    stateVersions: (candidate.state_versions as unknown[]).filter(
      (stateVersion): stateVersion is number => typeof stateVersion === 'number',
    ),
    reachedArchiveOutcomeKindName:
      typeof candidate.reached_archive_outcome_kind_name === 'string' ? candidate.reached_archive_outcome_kind_name : null,
    isArchiveClosed: candidate.is_archive_closed,
    recordedInteractionCount: candidate.recorded_interaction_count,
    generatedAudioCount: candidate.generated_audio_count,
    cachedAudioCount: candidate.cached_audio_count,
    failures: simulationFailures,
    wholeReport: candidate,
  }
}

function readSimulationReportResult(result: GameServiceResult<unknown>): GameServiceResult<DirectorSimulationReport> {
  if (!result.wasSuccessful) {
    return result
  }
  const simulationReport = readSimulationReport(result.value)
  return simulationReport === null ? unexpectedDirectorServiceAnswer : { wasSuccessful: true, value: simulationReport }
}

export async function listDirectorScriptedPaths(): Promise<
  GameServiceResult<{ defaultVoiceIdentifier: string; scriptedPaths: DirectorScriptedPathDescription[] }>
> {
  const result = await sendGameServiceRequest('/api/director/scripted-paths', { method: 'GET' })
  if (!result.wasSuccessful) {
    return result
  }
  if (
    !isServiceAnswerRecord(result.value) ||
    typeof result.value.default_voice_identifier !== 'string' ||
    !Array.isArray(result.value.scripted_paths)
  ) {
    return unexpectedDirectorServiceAnswer
  }
  const scriptedPaths: DirectorScriptedPathDescription[] = []
  for (const pathCandidate of result.value.scripted_paths as unknown[]) {
    if (
      !isServiceAnswerRecord(pathCandidate) ||
      typeof pathCandidate.scripted_path_identifier !== 'string' ||
      typeof pathCandidate.whisper_identifier !== 'string' ||
      typeof pathCandidate.expected_archive_outcome_kind_name !== 'string' ||
      typeof pathCandidate.step_count !== 'number'
    ) {
      return unexpectedDirectorServiceAnswer
    }
    scriptedPaths.push({
      scriptedPathIdentifier: pathCandidate.scripted_path_identifier,
      whisperIdentifier: pathCandidate.whisper_identifier,
      expectedArchiveOutcomeKindName: pathCandidate.expected_archive_outcome_kind_name,
      stepCount: pathCandidate.step_count,
    })
  }
  return {
    wasSuccessful: true,
    value: { defaultVoiceIdentifier: result.value.default_voice_identifier, scriptedPaths },
  }
}

export async function runDirectorSimulation(
  profileIdentifier: string,
  simulationRequest: DirectorSimulationRequest,
  cancellationSignal?: AbortSignal,
): Promise<GameServiceResult<DirectorSimulationReport>> {
  return readSimulationReportResult(
    await sendGameServiceRequest('/api/director/simulations', {
      method: 'POST',
      profileIdentifier,
      timeoutMilliseconds: directorSimulationTimeoutMilliseconds,
      cancellationSignal,
      jsonBody: {
        scripted_path_identifier: simulationRequest.scriptedPathIdentifier,
        voice_identifier: simulationRequest.voiceIdentifier ?? null,
        is_speech_enabled: simulationRequest.isSpeechEnabled ?? true,
        injected_failures: (simulationRequest.injectedFailures ?? []).map((injectedFailure) => ({
          step_number: injectedFailure.stepNumber,
          purpose_name: injectedFailure.purposeName,
          failure_mode_name: injectedFailure.failureModeName,
          failing_attempt_count: injectedFailure.failingAttemptCount ?? 1,
        })),
      },
    }),
  )
}

export async function readDirectorSimulation(
  profileIdentifier: string,
  simulationRunIdentifier: string,
): Promise<GameServiceResult<DirectorSimulationReport>> {
  return readSimulationReportResult(
    await sendGameServiceRequest(`/api/director/simulations/${encodeURIComponent(simulationRunIdentifier)}`, {
      method: 'GET',
      profileIdentifier,
    }),
  )
}

function readRoleStatus(candidate: unknown): DirectorRoleStatus | null {
  if (
    !isServiceAnswerRecord(candidate) ||
    typeof candidate.provider_name !== 'string' ||
    !isProviderModeName(candidate.provider_mode_name) ||
    typeof candidate.is_access_key_required !== 'boolean' ||
    typeof candidate.is_access_key_stored !== 'boolean'
  ) {
    return null
  }
  return {
    providerName: candidate.provider_name,
    providerModeName: candidate.provider_mode_name,
    isAccessKeyRequired: candidate.is_access_key_required,
    isAccessKeyStored: candidate.is_access_key_stored,
  }
}

export async function readDirectorProviderStatus(): Promise<GameServiceResult<DirectorProviderStatus>> {
  const result = await sendGameServiceRequest('/api/director/provider-status', { method: 'GET' })
  if (!result.wasSuccessful) {
    return result
  }
  if (!isServiceAnswerRecord(result.value)) {
    return unexpectedDirectorServiceAnswer
  }
  const storyStatus = readRoleStatus(result.value.story)
  const voiceStatus = readRoleStatus(result.value.voice)
  if (storyStatus === null || voiceStatus === null) {
    return unexpectedDirectorServiceAnswer
  }
  return { wasSuccessful: true, value: { story: storyStatus, voice: voiceStatus } }
}

export async function checkDirectorStoryConnection(
  profileIdentifier: string | null,
): Promise<GameServiceResult<DirectorStoryConnectionCheck>> {
  const result = await sendGameServiceRequest('/api/director/story-connection-check', {
    method: 'POST',
    profileIdentifier,
    timeoutMilliseconds: directorConnectionCheckTimeoutMilliseconds,
  })
  if (!result.wasSuccessful) {
    return result
  }
  const checkRecord = result.value
  if (
    !isServiceAnswerRecord(checkRecord) ||
    typeof checkRecord.provider_name !== 'string' ||
    !isProviderModeName(checkRecord.provider_mode_name) ||
    typeof checkRecord.model_identifier !== 'string' ||
    typeof checkRecord.is_director_listening !== 'boolean'
  ) {
    return unexpectedDirectorServiceAnswer
  }
  return {
    wasSuccessful: true,
    value: {
      providerName: checkRecord.provider_name,
      providerModeName: checkRecord.provider_mode_name,
      modelIdentifier: checkRecord.model_identifier,
      interactionIdentifier:
        typeof checkRecord.interaction_identifier === 'string' ? checkRecord.interaction_identifier : null,
      isDirectorListening: checkRecord.is_director_listening,
    },
  }
}

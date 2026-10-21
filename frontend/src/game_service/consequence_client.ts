import type {
  ArchiveLogEntry,
  ConfirmedArchiveTurn,
  DirectorQuestionEntryContent,
  InteractivePieceAssistanceRecord,
  InteractivePieceAssistanceRequest,
  InteractivePieceAttemptRequest,
  InteractivePieceAttemptResolution,
  InvestigatorActionRequest,
  InvestigatorEntryContent,
} from '../game_state/archive_turn_contract'
import { sendGameServiceRequest } from './game_service_client'
import type { GameServiceFailure, GameServiceResult } from './game_service_client'

export const consequenceTurnTimeoutMilliseconds = 390000

export type ConsequenceTurnResolution =
  | {
      dispositionName: 'question_asked'
      investigatorEntry: InvestigatorEntryContent
      questionEntry: DirectorQuestionEntryContent
    }
  | { dispositionName: 'resolved'; confirmedTurn: ConfirmedArchiveTurn }

export type ConsequenceAssistanceRequest = InteractivePieceAssistanceRequest & {
  actionKey: string
  expectedStateVersion: number
}

export type ConsequenceAssistanceResolution = {
  interactivePieceIdentifier: string
  assistanceRecord: InteractivePieceAssistanceRecord
  wasAlreadyGiven: boolean
  stateVersion: number
}

export type ConsequenceArchiveRunReference = {
  archiveCaseIdentifier: string
  archiveRunIdentifier: string
  runNumber: number
  lifecycleStatusName: 'active' | 'superseded' | 'ended'
  stateVersion: number
}

export type ConsequenceTurnKindName = 'investigator_action' | 'interactive_piece_attempt' | 'interactive_piece_assistance'
export type ConsequenceTurnDispositionName = 'resolved' | 'question_asked' | 'assistance_given'

export type ConsequenceStoredTurn = {
  turnIdentifier: string
  actionKey: string
  turnKindName: ConsequenceTurnKindName
  dispositionName: ConsequenceTurnDispositionName
  stateVersionBefore: number
  stateVersionAfter: number
  confirmedAtUtc: string
  resolution: ConsequenceTurnResolution | InteractivePieceAttemptResolution | ConsequenceAssistanceResolution
}

export type ConsequenceTurnHistory = {
  archiveRun: ConsequenceArchiveRunReference | null
  turns: ConsequenceStoredTurn[]
}

export type ConsequenceLogHistory = {
  archiveRun: ConsequenceArchiveRunReference | null
  logEntries: ArchiveLogEntry[]
}

const unexpectedAnswerFailure: GameServiceFailure = {
  wasSuccessful: false,
  failureName: 'unexpected_service_answer',
  responseStatusCode: null,
}

function isRecord(candidate: unknown): candidate is Record<string, unknown> {
  return typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate)
}

function convertKeyToCamelCase(serviceKey: string): string {
  return serviceKey.replace(/_([a-z0-9])/g, (_matchedText, followingCharacter: string) => followingCharacter.toUpperCase())
}

function convertKeyToSnakeCase(clientKey: string): string {
  return clientKey.replace(/[A-Z]/g, (upperCaseCharacter) => `_${upperCaseCharacter.toLowerCase()}`)
}

function convertKeys(originalValue: unknown, convertKey: (originalKey: string) => string): unknown {
  if (Array.isArray(originalValue)) {
    return originalValue.map((nestedValue) => convertKeys(nestedValue, convertKey))
  }
  if (isRecord(originalValue)) {
    return Object.fromEntries(
      Object.entries(originalValue).map(([originalKey, nestedValue]) => [convertKey(originalKey), convertKeys(nestedValue, convertKey)]),
    )
  }
  return originalValue
}

function isConfirmedTurn(candidate: unknown): candidate is ConfirmedArchiveTurn {
  return (
    isRecord(candidate) &&
    typeof candidate.turnIdentifier === 'string' &&
    typeof candidate.actionKey === 'string' &&
    typeof candidate.resultingStateVersion === 'number' &&
    isRecord(candidate.investigatorEntry) &&
    Array.isArray(candidate.witnessedOriginIdentifiers) &&
    Array.isArray(candidate.directorEntries) &&
    Array.isArray(candidate.planStepDispositions) &&
    Array.isArray(candidate.resourceCosts) &&
    Array.isArray(candidate.confirmedEffects) &&
    Array.isArray(candidate.relationshipChanges) &&
    Array.isArray(candidate.stagingEvents) &&
    Array.isArray(candidate.presentedInteractivePieces) &&
    Array.isArray(candidate.interactivePieceStatusChanges) &&
    Array.isArray(candidate.grantedLivedExperienceFlagNames) &&
    (candidate.planContinuationQuestion === null || isRecord(candidate.planContinuationQuestion)) &&
    (candidate.nextScenePresentation === null || isRecord(candidate.nextScenePresentation)) &&
    (candidate.archiveOutcome === null || isRecord(candidate.archiveOutcome))
  )
}

function isTurnResolution(candidate: unknown): candidate is ConsequenceTurnResolution {
  if (!isRecord(candidate)) {
    return false
  }
  if (candidate.dispositionName === 'resolved') {
    return isConfirmedTurn(candidate.confirmedTurn)
  }
  return (
    candidate.dispositionName === 'question_asked' &&
    isRecord(candidate.investigatorEntry) &&
    isRecord(candidate.questionEntry) &&
    Array.isArray(candidate.questionEntry.answerOptions)
  )
}

function isAttemptResolution(candidate: unknown): candidate is InteractivePieceAttemptResolution {
  return (
    isRecord(candidate) &&
    typeof candidate.interactivePieceIdentifier === 'string' &&
    isRecord(candidate.attemptRecord) &&
    typeof candidate.attemptRecord.attemptIdentifier === 'string' &&
    typeof candidate.attemptRecord.wasAccepted === 'boolean' &&
    Array.isArray(candidate.attemptRecord.violatedVisibleRuleTexts) &&
    isConfirmedTurn(candidate.confirmedTurn)
  )
}

function isAssistanceResolution(candidate: unknown): candidate is ConsequenceAssistanceResolution {
  return (
    isRecord(candidate) &&
    typeof candidate.interactivePieceIdentifier === 'string' &&
    isRecord(candidate.assistanceRecord) &&
    typeof candidate.assistanceRecord.levelName === 'string' &&
    typeof candidate.assistanceRecord.publicHintText === 'string' &&
    typeof candidate.wasAlreadyGiven === 'boolean' &&
    typeof candidate.stateVersion === 'number'
  )
}

function isArchiveRunReference(candidate: unknown): candidate is ConsequenceArchiveRunReference {
  return (
    isRecord(candidate) &&
    typeof candidate.archiveCaseIdentifier === 'string' &&
    typeof candidate.archiveRunIdentifier === 'string' &&
    typeof candidate.runNumber === 'number' &&
    typeof candidate.lifecycleStatusName === 'string' &&
    typeof candidate.stateVersion === 'number'
  )
}

function isStoredTurn(candidate: unknown): candidate is ConsequenceStoredTurn {
  return (
    isRecord(candidate) &&
    typeof candidate.turnIdentifier === 'string' &&
    typeof candidate.actionKey === 'string' &&
    typeof candidate.turnKindName === 'string' &&
    typeof candidate.dispositionName === 'string' &&
    typeof candidate.stateVersionBefore === 'number' &&
    typeof candidate.stateVersionAfter === 'number' &&
    typeof candidate.confirmedAtUtc === 'string' &&
    (isTurnResolution(candidate.resolution) ||
      isAttemptResolution(candidate.resolution) ||
      isAssistanceResolution(candidate.resolution))
  )
}

function isLogEntry(candidate: unknown): candidate is ArchiveLogEntry {
  return (
    isRecord(candidate) &&
    typeof candidate.identifier === 'string' &&
    typeof candidate.voice === 'string' &&
    typeof candidate.sceneIdentifier === 'string' &&
    typeof candidate.worldClockMinutes === 'number'
  )
}

async function sendConsequenceTurn<TurnAnswer>(
  path: string,
  profileIdentifier: string,
  turnRequest: unknown,
  isExpectedAnswer: (candidate: unknown) => candidate is TurnAnswer,
  cancellationSignal?: AbortSignal,
): Promise<GameServiceResult<TurnAnswer>> {
  const result = await sendGameServiceRequest(path, {
    method: 'POST',
    profileIdentifier,
    jsonBody: convertKeys(turnRequest, convertKeyToSnakeCase),
    timeoutMilliseconds: consequenceTurnTimeoutMilliseconds,
    cancellationSignal,
  })
  if (!result.wasSuccessful) {
    return result
  }
  const answer = convertKeys(result.value, convertKeyToCamelCase)
  return isExpectedAnswer(answer) ? { wasSuccessful: true, value: answer } : unexpectedAnswerFailure
}

export function resolveInvestigatorActionThroughGameService(
  profileIdentifier: string,
  actionRequest: InvestigatorActionRequest,
  cancellationSignal?: AbortSignal,
): Promise<GameServiceResult<ConsequenceTurnResolution>> {
  return sendConsequenceTurn(
    '/api/consequences/investigator-actions',
    profileIdentifier,
    actionRequest,
    isTurnResolution,
    cancellationSignal,
  )
}

export function attemptInteractivePieceThroughGameService(
  profileIdentifier: string,
  attemptRequest: InteractivePieceAttemptRequest,
  cancellationSignal?: AbortSignal,
): Promise<GameServiceResult<InteractivePieceAttemptResolution>> {
  return sendConsequenceTurn(
    '/api/consequences/interactive-piece-attempts',
    profileIdentifier,
    attemptRequest,
    isAttemptResolution,
    cancellationSignal,
  )
}

export function requestInteractivePieceAssistanceThroughGameService(
  profileIdentifier: string,
  assistanceRequest: ConsequenceAssistanceRequest,
  cancellationSignal?: AbortSignal,
): Promise<GameServiceResult<ConsequenceAssistanceResolution>> {
  return sendConsequenceTurn(
    '/api/consequences/interactive-piece-assistance',
    profileIdentifier,
    assistanceRequest,
    isAssistanceResolution,
    cancellationSignal,
  )
}

function buildHistoryPath(basePath: string, archiveCaseIdentifier: string | null): string {
  return archiveCaseIdentifier === null
    ? basePath
    : `${basePath}?archive_case_identifier=${encodeURIComponent(archiveCaseIdentifier)}`
}

export async function readConfirmedTurnHistoryFromGameService(
  profileIdentifier: string,
  archiveCaseIdentifier: string | null = null,
  cancellationSignal?: AbortSignal,
): Promise<GameServiceResult<ConsequenceTurnHistory>> {
  const result = await sendGameServiceRequest(buildHistoryPath('/api/consequences/turns', archiveCaseIdentifier), {
    method: 'GET',
    profileIdentifier,
    cancellationSignal,
  })
  if (!result.wasSuccessful) {
    return result
  }
  const answer = convertKeys(result.value, convertKeyToCamelCase)
  if (
    !isRecord(answer) ||
    !(answer.archiveRun === null || isArchiveRunReference(answer.archiveRun)) ||
    !Array.isArray(answer.turns) ||
    !answer.turns.every(isStoredTurn)
  ) {
    return unexpectedAnswerFailure
  }
  return { wasSuccessful: true, value: { archiveRun: answer.archiveRun, turns: answer.turns } }
}

export async function readArchiveLogEntriesFromGameService(
  profileIdentifier: string,
  archiveCaseIdentifier: string | null = null,
  cancellationSignal?: AbortSignal,
): Promise<GameServiceResult<ConsequenceLogHistory>> {
  const result = await sendGameServiceRequest(buildHistoryPath('/api/consequences/log-entries', archiveCaseIdentifier), {
    method: 'GET',
    profileIdentifier,
    cancellationSignal,
  })
  if (!result.wasSuccessful) {
    return result
  }
  const answer = convertKeys(result.value, convertKeyToCamelCase)
  if (
    !isRecord(answer) ||
    !(answer.archiveRun === null || isArchiveRunReference(answer.archiveRun)) ||
    !Array.isArray(answer.logEntries) ||
    !answer.logEntries.every(isLogEntry)
  ) {
    return unexpectedAnswerFailure
  }
  return { wasSuccessful: true, value: { archiveRun: answer.archiveRun, logEntries: answer.logEntries } }
}

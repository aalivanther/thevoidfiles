import type { BelongingDefinition, BelongingIdentifier, WhisperCardContent } from '../demonstration/demonstration_case_script'
import type { ArchiveOpeningResolution, ArchiveScenePresentation } from '../game_state/archive_turn_contract'
import { decodeGeneratedMarkupText } from './generated_markup_text'
import { sendGameServiceRequest } from './game_service_client'
import type { GameServiceFailure, GameServiceResult } from './game_service_client'

const caseGenerationTimeoutMilliseconds = 720000

export type CaseStartWhisperOffer = {
  offerBatchIdentifier: string
  offeredWhispers: WhisperCardContent[]
  chosenWhisperIdentifier: string | null
  archiveCaseIdentifier: string | null
}

export type CaseStartArchiveSummary = {
  archiveCaseIdentifier: string
  archiveNumber: number
  archiveNumberLabel: string
  archiveTitle: string
  sanctionLabel: string
  whisperIdentifier: string
  openedAtUtc: string
}

export type CaseStartListedArchive = CaseStartArchiveSummary & {
  lifecycleStatusName: 'open' | 'closed'
  closedAtUtc: string | null
}

export type CaseStartArchiveRunReference = {
  archiveRunIdentifier: string
  runNumber: number
  stateVersion: number
}

export type CaseStartInvestigatorResources = {
  placeName: string
  worldClockMinutes: number
  operationalFunds: number
  belongingUnits: Array<{ belongingIdentifier: BelongingIdentifier; units: number }>
  seriousWoundCount: number
}

export type CaseStartArchiveOpening = {
  archive: CaseStartArchiveSummary
  archiveRun: CaseStartArchiveRunReference
  openingResolution: ArchiveOpeningResolution
  investigatorResources: CaseStartInvestigatorResources
  belongingDefinitions: BelongingDefinition[]
}

export type CaseStartCurrentArchive = {
  archive: CaseStartListedArchive
  opening: CaseStartArchiveOpening
  archiveRun: (CaseStartArchiveRunReference & { publicState: Record<string, unknown> }) | null
}

export type CaseStartArchiveAbandonment = {
  wasAnythingAbandoned: boolean
  abandonKey: string
  archiveCaseIdentifier: string | null
  archiveRunIdentifier: string | null
  stateVersionAtAbandonment: number | null
  abandonedAtUtc: string
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

function convertKeysToCamelCase(serviceValue: unknown): unknown {
  if (Array.isArray(serviceValue)) {
    return serviceValue.map(convertKeysToCamelCase)
  }
  if (isRecord(serviceValue)) {
    return Object.fromEntries(
      Object.entries(serviceValue).map(([serviceKey, nestedValue]) => [
        convertKeyToCamelCase(serviceKey),
        convertKeysToCamelCase(nestedValue),
      ]),
    )
  }
  return serviceValue
}

function hasTextFields(candidate: Record<string, unknown>, fieldNames: string[]): boolean {
  return fieldNames.every((fieldName) => typeof candidate[fieldName] === 'string')
}

function hasNumberFields(candidate: Record<string, unknown>, fieldNames: string[]): boolean {
  return fieldNames.every((fieldName) => typeof candidate[fieldName] === 'number')
}

function isArrayOfRecords(candidate: unknown): candidate is Array<Record<string, unknown>> {
  return Array.isArray(candidate) && candidate.every(isRecord)
}

function parseWhisperCard(candidate: unknown): WhisperCardContent | null {
  if (
    !isRecord(candidate) ||
    !hasTextFields(candidate, [
      'identifier',
      'ordinalLabel',
      'headline',
      'sourceLabel',
      'rumorText',
      'distanceText',
      'sphereText',
      'toneText',
      'threatText',
      'rewardText',
    ]) ||
    typeof candidate.isEncoded !== 'boolean' ||
    typeof candidate.isCaseMaterialAvailable !== 'boolean'
  ) {
    return null
  }
  return {
    identifier: candidate.identifier as string,
    ordinalLabel: decodeGeneratedMarkupText(candidate.ordinalLabel as string),
    headline: decodeGeneratedMarkupText(candidate.headline as string),
    sourceLabel: decodeGeneratedMarkupText(candidate.sourceLabel as string),
    rumorText: decodeGeneratedMarkupText(candidate.rumorText as string),
    distanceText: decodeGeneratedMarkupText(candidate.distanceText as string),
    sphereText: decodeGeneratedMarkupText(candidate.sphereText as string),
    toneText: decodeGeneratedMarkupText(candidate.toneText as string),
    threatText: decodeGeneratedMarkupText(candidate.threatText as string),
    rewardText: decodeGeneratedMarkupText(candidate.rewardText as string),
    isEncoded: candidate.isEncoded,
    isPlayableInDemonstration: candidate.isCaseMaterialAvailable,
  }
}

function parseWhisperOffer(serviceValue: unknown): CaseStartWhisperOffer | null {
  const candidate = convertKeysToCamelCase(serviceValue)
  if (!isRecord(candidate) || typeof candidate.offerBatchIdentifier !== 'string' || !Array.isArray(candidate.offeredWhispers)) {
    return null
  }
  const offeredWhispers: WhisperCardContent[] = []
  for (const offeredWhisperCandidate of candidate.offeredWhispers) {
    const whisperCard = parseWhisperCard(offeredWhisperCandidate)
    if (!whisperCard) {
      return null
    }
    offeredWhispers.push(whisperCard)
  }
  return {
    offerBatchIdentifier: candidate.offerBatchIdentifier,
    offeredWhispers,
    chosenWhisperIdentifier: typeof candidate.chosenWhisperIdentifier === 'string' ? candidate.chosenWhisperIdentifier : null,
    archiveCaseIdentifier: typeof candidate.archiveCaseIdentifier === 'string' ? candidate.archiveCaseIdentifier : null,
  }
}

function isArchiveSummary(candidate: unknown): candidate is CaseStartArchiveSummary {
  return (
    isRecord(candidate) &&
    hasTextFields(candidate, [
      'archiveCaseIdentifier',
      'archiveNumberLabel',
      'archiveTitle',
      'sanctionLabel',
      'whisperIdentifier',
      'openedAtUtc',
    ]) &&
    hasNumberFields(candidate, ['archiveNumber'])
  )
}

function isListedArchive(candidate: unknown): candidate is CaseStartListedArchive {
  return (
    isRecord(candidate) &&
    (candidate.lifecycleStatusName === 'open' || candidate.lifecycleStatusName === 'closed') &&
    (candidate.closedAtUtc === null || typeof candidate.closedAtUtc === 'string') &&
    isArchiveSummary(candidate)
  )
}

function isArchiveRunReference(candidate: unknown): candidate is CaseStartArchiveRunReference {
  return (
    isRecord(candidate) &&
    typeof candidate.archiveRunIdentifier === 'string' &&
    hasNumberFields(candidate, ['runNumber', 'stateVersion'])
  )
}

function isScenePresentation(candidate: unknown): candidate is ArchiveScenePresentation {
  return (
    isRecord(candidate) &&
    hasTextFields(candidate, ['sceneIdentifier', 'placeName', 'tensionTierName']) &&
    isArrayOfRecords(candidate.presentPersons) &&
    isArrayOfRecords(candidate.perceivedPointsOfInterest) &&
    isArrayOfRecords(candidate.suggestedActions) &&
    candidate.suggestedActions.every((suggestedAction) => hasTextFields(suggestedAction, ['identifier', 'visibleText'])) &&
    Array.isArray(candidate.openInteractivePieceIdentifiers)
  )
}

function isOpeningResolution(candidate: unknown): candidate is ArchiveOpeningResolution {
  return (
    isRecord(candidate) &&
    isArrayOfRecords(candidate.openingEntries) &&
    candidate.openingEntries.every(
      (openingEntry) => typeof openingEntry.voice === 'string' && Array.isArray(openingEntry.markedParagraphs),
    ) &&
    isScenePresentation(candidate.firstScenePresentation) &&
    isArrayOfRecords(candidate.initialRelationshipLevels) &&
    candidate.initialRelationshipLevels.every(
      (relationshipLevel) =>
        hasTextFields(relationshipLevel, ['identifier', 'personIdentifier', 'personVisibleName', 'directionName']) &&
        hasNumberFields(relationshipLevel, ['levelChange', 'resultingLevel']),
    )
  )
}

function isInvestigatorResources(candidate: unknown): candidate is CaseStartInvestigatorResources {
  return (
    isRecord(candidate) &&
    typeof candidate.placeName === 'string' &&
    hasNumberFields(candidate, ['worldClockMinutes', 'operationalFunds', 'seriousWoundCount']) &&
    isArrayOfRecords(candidate.belongingUnits) &&
    candidate.belongingUnits.every(
      (belongingUnits) => typeof belongingUnits.belongingIdentifier === 'string' && typeof belongingUnits.units === 'number',
    )
  )
}

function isArchiveOpening(candidate: unknown): candidate is CaseStartArchiveOpening {
  return (
    isRecord(candidate) &&
    isArchiveSummary(candidate.archive) &&
    isArchiveRunReference(candidate.archiveRun) &&
    isOpeningResolution(candidate.openingResolution) &&
    isInvestigatorResources(candidate.investigatorResources) &&
    isArrayOfRecords(candidate.belongingDefinitions) &&
    candidate.belongingDefinitions.every((belongingDefinition) =>
      hasTextFields(belongingDefinition, ['identifier', 'visibleName', 'visibleUnitDescription']),
    )
  )
}

function parseCurrentArchive(candidate: unknown): CaseStartCurrentArchive | null {
  if (!isRecord(candidate) || !isListedArchive(candidate.archive) || !isArchiveOpening(candidate.opening)) {
    return null
  }
  if (candidate.archiveRun === null) {
    return { archive: candidate.archive, opening: candidate.opening, archiveRun: null }
  }
  const archiveRunCandidate = candidate.archiveRun
  if (!isRecord(archiveRunCandidate) || !isRecord(archiveRunCandidate.publicState)) {
    return null
  }
  const publicState = archiveRunCandidate.publicState
  if (!isArchiveRunReference(archiveRunCandidate)) {
    return null
  }
  return {
    archive: candidate.archive,
    opening: candidate.opening,
    archiveRun: {
      archiveRunIdentifier: archiveRunCandidate.archiveRunIdentifier,
      runNumber: archiveRunCandidate.runNumber,
      stateVersion: archiveRunCandidate.stateVersion,
      publicState,
    },
  }
}

export function createArchiveOpeningKey(): string {
  return `opening_${crypto.randomUUID().replace(/-/g, '')}`
}

export async function readOfferedWhispersFromGameService(
  profileIdentifier: string,
  cancellationSignal?: AbortSignal,
): Promise<GameServiceResult<CaseStartWhisperOffer>> {
  const result = await sendGameServiceRequest('/api/case-start/whispers', {
    method: 'GET',
    profileIdentifier,
    timeoutMilliseconds: caseGenerationTimeoutMilliseconds,
    cancellationSignal,
  })
  if (!result.wasSuccessful) {
    return result
  }
  const whisperOffer = parseWhisperOffer(result.value)
  return whisperOffer ? { wasSuccessful: true, value: whisperOffer } : unexpectedAnswerFailure
}

export async function openArchiveThroughGameService(
  profileIdentifier: string,
  openingKey: string,
  whisperIdentifier: string,
  cancellationSignal?: AbortSignal,
): Promise<GameServiceResult<CaseStartArchiveOpening>> {
  const result = await sendGameServiceRequest('/api/case-start/archives', {
    method: 'POST',
    profileIdentifier,
    jsonBody: { opening_key: openingKey, whisper_identifier: whisperIdentifier },
    timeoutMilliseconds: caseGenerationTimeoutMilliseconds,
    cancellationSignal,
  })
  if (!result.wasSuccessful) {
    return result
  }
  const archiveOpening = convertKeysToCamelCase(result.value)
  return isArchiveOpening(archiveOpening) ? { wasSuccessful: true, value: archiveOpening } : unexpectedAnswerFailure
}

export async function readCurrentArchiveFromGameService(
  profileIdentifier: string,
  cancellationSignal?: AbortSignal,
  archiveCaseIdentifier?: string,
): Promise<GameServiceResult<CaseStartCurrentArchive | null>> {
  const result = await sendGameServiceRequest(archiveCaseIdentifier ? `/api/case-start/archives/${encodeURIComponent(archiveCaseIdentifier)}/recovery` : '/api/case-start/archives/current', {
    method: 'GET',
    profileIdentifier,
    cancellationSignal,
  })
  if (!result.wasSuccessful) {
    return result
  }
  const answer = convertKeysToCamelCase(result.value)
  if (!isRecord(answer) || !('currentArchive' in answer)) {
    return unexpectedAnswerFailure
  }
  if (answer.currentArchive === null) {
    return { wasSuccessful: true, value: null }
  }
  const currentArchive = parseCurrentArchive(answer.currentArchive)
  return currentArchive ? { wasSuccessful: true, value: currentArchive } : unexpectedAnswerFailure
}

export async function listArchivesFromGameService(
  profileIdentifier: string,
  cancellationSignal?: AbortSignal,
): Promise<GameServiceResult<CaseStartListedArchive[]>> {
  const result = await sendGameServiceRequest('/api/case-start/archives', {
    method: 'GET',
    profileIdentifier,
    cancellationSignal,
  })
  if (!result.wasSuccessful) {
    return result
  }
  const answer = convertKeysToCamelCase(result.value)
  if (!isRecord(answer) || !Array.isArray(answer.archives) || !answer.archives.every(isListedArchive)) {
    return unexpectedAnswerFailure
  }
  return { wasSuccessful: true, value: answer.archives }
}

function isArchiveAbandonment(candidate: unknown): candidate is CaseStartArchiveAbandonment {
  return (
    isRecord(candidate) &&
    typeof candidate.wasAnythingAbandoned === 'boolean' &&
    hasTextFields(candidate, ['abandonKey', 'abandonedAtUtc']) &&
    (candidate.archiveCaseIdentifier === null || typeof candidate.archiveCaseIdentifier === 'string') &&
    (candidate.archiveRunIdentifier === null || typeof candidate.archiveRunIdentifier === 'string') &&
    (candidate.stateVersionAtAbandonment === null || typeof candidate.stateVersionAtAbandonment === 'number')
  )
}

export function createArchiveAbandonKey(): string {
  return `abandon_${crypto.randomUUID().replace(/-/g, '')}`
}

export async function abandonCurrentArchiveThroughGameService(
  profileIdentifier: string,
  abandonKey: string,
  cancellationSignal?: AbortSignal,
): Promise<GameServiceResult<CaseStartArchiveAbandonment>> {
  const result = await sendGameServiceRequest('/api/case-start/archives/current/abandon', {
    method: 'POST',
    profileIdentifier,
    jsonBody: { abandon_key: abandonKey },
    cancellationSignal,
  })
  if (!result.wasSuccessful) {
    return result
  }
  const archiveAbandonment = convertKeysToCamelCase(result.value)
  return isArchiveAbandonment(archiveAbandonment) ? { wasSuccessful: true, value: archiveAbandonment } : unexpectedAnswerFailure
}

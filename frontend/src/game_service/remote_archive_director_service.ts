import { lighthouseCaseDirectorCopy } from '../demonstration/lighthouse_case/lighthouse_case_director_copy'
import type {
  ArchiveDirectorService,
  ArchiveOpeningResolution,
  ConfirmedArchiveTurn,
  DirectorTurnResolution,
  ReportDirectorTurnPhase,
} from '../game_state/archive_turn_contract'
import { personalizeNarrativeText, readLatestChronicleState } from '../game_state/chronicle_state'
import { readArchiveDirectorRunNote, writeArchiveDirectorRunNote } from './archive_director_run_note'
import {
  abandonCurrentArchiveThroughGameService,
  createArchiveAbandonKey,
  createArchiveOpeningKey,
  openArchiveThroughGameService,
  readCurrentArchiveFromGameService,
  readOfferedWhispersFromGameService,
} from './case_start_client'
import type { CaseStartArchiveOpening } from './case_start_client'
import {
  readConfirmedTurnHistoryFromGameService,
  attemptInteractivePieceThroughGameService,
  requestInteractivePieceAssistanceThroughGameService,
  resolveInvestigatorActionThroughGameService,
} from './consequence_client'
import type { GameServiceFailure, GameServiceResult } from './game_service_client'
import { readGameServicePresence } from './game_service_presence'
import type { GameServicePresence } from './game_service_presence'
import { rebuildArchiveFromConfirmedHistory } from './archive_recovery'

const shortestWeighingMilliseconds = 900
const longestWeighingMilliseconds = 1600
const shortestNarratingMilliseconds = 600
const longestNarratingMilliseconds = 1100
const syntheticArchiveOpeningTimeoutMilliseconds = 10000
const lostVoiceMark = '{{voz_perdida}}'
const archiveAlreadyOpenFailureName = 'archive_already_open'
const remoteArchiveOpeningUnavailableMessage = 'remote_archive_opening_unavailable'
const remoteInteractivePieceRequestFailedMessage = 'remote_interactive_piece_request_failed'

export type ArchiveOpeningFallbackReasonName =
  | 'access_key_missing'
  | 'provider_rejected'
  | 'provider_unavailable'
  | 'whisper_material_missing'
  | 'whisper_absent_from_service_offer'
  | 'case_rejected_by_reviewer'
  | 'service_unavailable'

export class RemoteDirectorTurnUnavailableError extends Error {
  readonly failureName: string

  constructor(failureName: string) {
    super(failureName)
    this.name = 'RemoteDirectorTurnUnavailableError'
    this.failureName = failureName
  }
}

export class RemoteArchiveOpeningUnavailableError extends Error {
  readonly fallbackReasonName: ArchiveOpeningFallbackReasonName
  readonly failureName: string | null

  constructor(fallbackReasonName: ArchiveOpeningFallbackReasonName, failureName: string | null = null) {
    super(remoteArchiveOpeningUnavailableMessage)
    this.fallbackReasonName = fallbackReasonName
    this.failureName = failureName
  }
}

const fallbackReasonNamesByFailureName: Record<string, ArchiveOpeningFallbackReasonName> = {
  narrative_access_key_missing: 'access_key_missing',
  narrative_access_key_rejected: 'provider_rejected',
  narrative_request_refused: 'provider_rejected',
  narrative_model_not_found: 'provider_rejected',
  narrative_response_blocked: 'provider_rejected',
  narrative_response_empty: 'provider_rejected',
  director_answer_rejected: 'provider_rejected',
  whisper_offer_generation_rejected: 'provider_rejected',
  narrative_provider_busy: 'provider_unavailable',
  narrative_provider_timed_out: 'provider_unavailable',
  narrative_provider_unreachable: 'provider_unavailable',
  narrative_provider_not_configured: 'provider_unavailable',
  narrative_provider_failed: 'provider_unavailable',
  narrative_request_too_large: 'provider_unavailable',
  narrative_quota_exhausted: 'provider_unavailable',
  whisper_not_offered: 'whisper_absent_from_service_offer',
  synthetic_case_material_missing: 'whisper_material_missing',
  synthetic_director_material_missing: 'whisper_material_missing',
  case_generation_rejected: 'case_rejected_by_reviewer',
}

function buildOpeningUnavailableError(serviceFailure: GameServiceFailure | null): RemoteArchiveOpeningUnavailableError {
  if (serviceFailure === null) {
    return new RemoteArchiveOpeningUnavailableError('whisper_absent_from_service_offer', 'whisper_not_offered')
  }
  return new RemoteArchiveOpeningUnavailableError(
    fallbackReasonNamesByFailureName[serviceFailure.failureName] ?? 'service_unavailable',
    serviceFailure.failureName,
  )
}

function waitForMilliseconds(durationMilliseconds: number): Promise<void> {
  return new Promise((resolveWaiting) => window.setTimeout(resolveWaiting, durationMilliseconds))
}

function chooseDurationBetween(shortestMilliseconds: number, longestMilliseconds: number): number {
  return shortestMilliseconds + Math.random() * (longestMilliseconds - shortestMilliseconds)
}

function readLostVoiceText(): string {
  const relationalAnchor = readLatestChronicleState().investigatorRegistration?.relationalAnchor
  return relationalAnchor?.kind === 'person' && relationalAnchor.personName.trim() !== ''
    ? lighthouseCaseDirectorCopy.lostVoiceOfAnchorPerson
    : lighthouseCaseDirectorCopy.lostVoiceOfUprootedInvestigator
}

function replaceLostVoiceMarks<ServiceAnswer>(serviceAnswer: ServiceAnswer, lostVoiceText: string): ServiceAnswer {
  const replaceWithin = (answerPart: unknown): unknown => {
    if (typeof answerPart === 'string') {
      return answerPart.includes(lostVoiceMark) ? answerPart.replaceAll(lostVoiceMark, lostVoiceText) : answerPart
    }
    if (Array.isArray(answerPart)) {
      return answerPart.map(replaceWithin)
    }
    if (typeof answerPart === 'object' && answerPart !== null) {
      return Object.fromEntries(
        Object.entries(answerPart).map(([partName, nestedPart]) => [partName, replaceWithin(nestedPart)]),
      )
    }
    return answerPart
  }
  return replaceWithin(serviceAnswer) as ServiceAnswer
}

function adaptConfirmedTurn(confirmedTurn: ConfirmedArchiveTurn, stateVersionOffset: number): ConfirmedArchiveTurn {
  return {
    ...replaceLostVoiceMarks(confirmedTurn, readLostVoiceText()),
    resultingStateVersion: confirmedTurn.resultingStateVersion - stateVersionOffset,
  }
}

async function waitThroughDirectorPhases<ServiceAnswer>(
  pendingServiceAnswer: Promise<GameServiceResult<ServiceAnswer>>,
  reportDirectorTurnPhase: ReportDirectorTurnPhase,
): Promise<GameServiceResult<ServiceAnswer>> {
  reportDirectorTurnPhase('weighing_action')
  await waitForMilliseconds(chooseDurationBetween(shortestWeighingMilliseconds, longestWeighingMilliseconds))
  reportDirectorTurnPhase('narrating')
  const [serviceAnswer] = await Promise.all([
    pendingServiceAnswer,
    waitForMilliseconds(chooseDurationBetween(shortestNarratingMilliseconds, longestNarratingMilliseconds)),
  ])
  reportDirectorTurnPhase('idle')
  return serviceAnswer
}

export async function recoverRemoteArchiveState() {
  const localState = readLatestChronicleState()
  const note = readArchiveDirectorRunNote()
  if (localState.chosenWhisperIdentifier === null || note?.directorKindName === 'demonstration') {
    return null
  }
  const presence = await readGameServicePresence()
  const profileIdentifier = presence.activeProfileIdentifier
  if (!profileIdentifier) {
    throw new RemoteDirectorTurnUnavailableError('service_absent')
  }
  const archiveIdentifier = localState.archiveRun.archiveCaseIdentifier ??
    (note?.directorKindName === 'game_service' && note.profileIdentifier === profileIdentifier ? note.archiveCaseIdentifier : undefined)
  const result = await readCurrentArchiveFromGameService(profileIdentifier, undefined, archiveIdentifier)
  if (!result.wasSuccessful) {
    throw new RemoteDirectorTurnUnavailableError(result.failureName)
  }
  if (!result.value || result.value.archive.whisperIdentifier !== localState.chosenWhisperIdentifier) {
    throw new RemoteDirectorTurnUnavailableError('archive_recovery_conflict')
  }
  const history = await readConfirmedTurnHistoryFromGameService(profileIdentifier, result.value.archive.archiveCaseIdentifier)
  if (!history.wasSuccessful) {
    throw new RemoteDirectorTurnUnavailableError(history.failureName)
  }
  const recovered = rebuildArchiveFromConfirmedHistory(result.value, history.value, localState.investigator,
    (text) => personalizeNarrativeText(replaceLostVoiceMarks(text, readLostVoiceText()), localState.investigatorRegistration), localState.archiveRun.stateVersion)
  writeArchiveDirectorRunNote({
    directorKindName: 'game_service', profileIdentifier,
    whisperIdentifier: result.value.archive.whisperIdentifier,
    archiveCaseIdentifier: result.value.archive.archiveCaseIdentifier,
    stateVersionOffset: result.value.opening.archiveRun.stateVersion,
  })
  return { ...recovered, confirmedActionKeys: history.value.turns.map((turn) => turn.actionKey) }
}

export async function recoverRemoteArchiveRunInProgress(
  profileIdentifier: string,
  chosenWhisperIdentifier: string,
): Promise<boolean> {
  const currentArchiveResult = await readCurrentArchiveFromGameService(profileIdentifier)
  if (!currentArchiveResult.wasSuccessful || currentArchiveResult.value === null) {
    return false
  }
  const currentArchive = currentArchiveResult.value
  if (currentArchive.archive.whisperIdentifier !== chosenWhisperIdentifier || currentArchive.archiveRun === null) {
    return false
  }
  const stateVersionOffset = currentArchive.opening.archiveRun.stateVersion
  writeArchiveDirectorRunNote({
    directorKindName: 'game_service',
    profileIdentifier,
    whisperIdentifier: chosenWhisperIdentifier,
    archiveCaseIdentifier: currentArchive.archive.archiveCaseIdentifier,
    stateVersionOffset,
  })
  return true
}

function isServerArchiveStillPlayedByInterface(serverArchiveCaseIdentifier: string): boolean {
  const archiveDirectorRunNote = readArchiveDirectorRunNote()
  return (
    readLatestChronicleState().chosenWhisperIdentifier !== null &&
    archiveDirectorRunNote?.directorKindName === 'game_service' &&
    archiveDirectorRunNote.archiveCaseIdentifier === serverArchiveCaseIdentifier
  )
}

export function createRemoteArchiveDirectorService(gameServicePresence: GameServicePresence): ArchiveDirectorService {
  const readRemoteRunReference = () => {
    const archiveDirectorRunNote = readArchiveDirectorRunNote()
    return archiveDirectorRunNote?.directorKindName === 'game_service' ? archiveDirectorRunNote : null
  }

  const acceptArchiveOpening = (
    profileIdentifier: string,
    whisperIdentifier: string,
    archiveOpening: CaseStartArchiveOpening,
  ): ArchiveOpeningResolution => {
    writeArchiveDirectorRunNote({
      directorKindName: 'game_service',
      profileIdentifier,
      whisperIdentifier,
      archiveCaseIdentifier: archiveOpening.archive.archiveCaseIdentifier,
      stateVersionOffset: archiveOpening.archiveRun.stateVersion,
    })
    return {
      ...replaceLostVoiceMarks(archiveOpening.openingResolution, readLostVoiceText()),
      archiveCaseIdentifier: archiveOpening.archive.archiveCaseIdentifier,
      archiveTitle: archiveOpening.archive.archiveTitle,
      archiveNumberLabel: archiveOpening.archive.archiveNumberLabel,
      worldClockMinutes: archiveOpening.investigatorResources.worldClockMinutes,
      operationalFunds: archiveOpening.investigatorResources.operationalFunds,
      belongingUnits: Object.fromEntries(archiveOpening.investigatorResources.belongingUnits.map((item) => [item.belongingIdentifier, item.units])),
      seriousWoundCount: archiveOpening.investigatorResources.seriousWoundCount,
      belongingDefinitions: archiveOpening.belongingDefinitions,
    }
  }

  return {
    async openArchive(whisperIdentifier) {
      const profileIdentifier = gameServicePresence.activeProfileIdentifier
      if (profileIdentifier === null) {
        throw new RemoteArchiveOpeningUnavailableError('service_unavailable', 'service_absent')
      }
      const openingAbortController = new AbortController()
      const openingTimeoutIdentifier =
        gameServicePresence.providerModeName === 'synthetic'
          ? window.setTimeout(() => openingAbortController.abort(), syntheticArchiveOpeningTimeoutMilliseconds)
          : null
      try {
        const whisperOfferResult = await readOfferedWhispersFromGameService(profileIdentifier, openingAbortController.signal)
        const hasWhisperServerMaterial =
          whisperOfferResult.wasSuccessful &&
          whisperOfferResult.value.offeredWhispers.some(
            (offeredWhisper) => offeredWhisper.identifier === whisperIdentifier,
          )
        if (!hasWhisperServerMaterial) {
          throw buildOpeningUnavailableError(whisperOfferResult.wasSuccessful ? null : whisperOfferResult)
        }
        const archiveOpeningResult = await openArchiveThroughGameService(
          profileIdentifier,
          createArchiveOpeningKey(),
          whisperIdentifier,
          openingAbortController.signal,
        )
        if (archiveOpeningResult.wasSuccessful) {
          return acceptArchiveOpening(profileIdentifier, whisperIdentifier, archiveOpeningResult.value)
        }
        if (archiveOpeningResult.failureName !== archiveAlreadyOpenFailureName) {
          throw buildOpeningUnavailableError(archiveOpeningResult)
        }
        const currentArchiveResult = await readCurrentArchiveFromGameService(profileIdentifier, openingAbortController.signal)
        if (!currentArchiveResult.wasSuccessful || currentArchiveResult.value === null) {
          throw new RemoteArchiveOpeningUnavailableError('service_unavailable', 'service_absent')
        }
        const currentArchive = currentArchiveResult.value
        if (
          currentArchive.archive.whisperIdentifier === whisperIdentifier &&
          currentArchive.archiveRun !== null &&
          currentArchive.archiveRun.stateVersion === currentArchive.opening.archiveRun.stateVersion
        ) {
          return acceptArchiveOpening(profileIdentifier, whisperIdentifier, currentArchive.opening)
        }
        if (isServerArchiveStillPlayedByInterface(currentArchive.archive.archiveCaseIdentifier)) {
          throw new RemoteArchiveOpeningUnavailableError('service_unavailable', 'service_absent')
        }
        const archiveAbandonmentResult = await abandonCurrentArchiveThroughGameService(
          profileIdentifier,
          createArchiveAbandonKey(),
          openingAbortController.signal,
        )
        if (!archiveAbandonmentResult.wasSuccessful) {
          throw new RemoteArchiveOpeningUnavailableError('service_unavailable', 'service_absent')
        }
        const renewedWhisperOfferResult = await readOfferedWhispersFromGameService(
          profileIdentifier,
          openingAbortController.signal,
        )
        if (
          !renewedWhisperOfferResult.wasSuccessful ||
          !renewedWhisperOfferResult.value.offeredWhispers.some(
            (offeredWhisper) => offeredWhisper.identifier === whisperIdentifier,
          )
        ) {
          throw new RemoteArchiveOpeningUnavailableError('service_unavailable', 'service_absent')
        }
        const retriedArchiveOpeningResult = await openArchiveThroughGameService(
          profileIdentifier,
          createArchiveOpeningKey(),
          whisperIdentifier,
          openingAbortController.signal,
        )
        if (!retriedArchiveOpeningResult.wasSuccessful) {
          throw buildOpeningUnavailableError(retriedArchiveOpeningResult)
        }
        return acceptArchiveOpening(profileIdentifier, whisperIdentifier, retriedArchiveOpeningResult.value)
      } finally {
        if (openingTimeoutIdentifier !== null) {
          window.clearTimeout(openingTimeoutIdentifier)
        }
      }
    },
    async resolveInvestigatorAction(actionRequest, reportDirectorTurnPhase): Promise<DirectorTurnResolution> {
      const remoteRunReference = readRemoteRunReference()
      if (remoteRunReference === null) {
        return { dispositionName: 'service_failed', isRetryPossible: false }
      }
      const serviceAnswer = await waitThroughDirectorPhases(
        resolveInvestigatorActionThroughGameService(remoteRunReference.profileIdentifier, {
          ...actionRequest,
          expectedStateVersion: actionRequest.expectedStateVersion + remoteRunReference.stateVersionOffset,
        }),
        reportDirectorTurnPhase,
      )
      if (!serviceAnswer.wasSuccessful) {
        throw new RemoteDirectorTurnUnavailableError(serviceAnswer.failureName)
      }
      const lostVoiceText = readLostVoiceText()
      if (serviceAnswer.value.dispositionName === 'question_asked') {
        return {
          dispositionName: 'question_asked',
          investigatorEntry: serviceAnswer.value.investigatorEntry,
          questionEntry: replaceLostVoiceMarks(serviceAnswer.value.questionEntry, lostVoiceText),
        }
      }
      return {
        dispositionName: 'resolved',
        confirmedTurn: adaptConfirmedTurn(
          serviceAnswer.value.confirmedTurn,
          remoteRunReference.stateVersionOffset,
        ),
      }
    },
    async attemptInteractivePiece(attemptRequest, reportDirectorTurnPhase) {
      const remoteRunReference = readRemoteRunReference()
      if (remoteRunReference === null) {
        throw new Error(remoteInteractivePieceRequestFailedMessage)
      }
      const serviceAnswer = await waitThroughDirectorPhases(
        attemptInteractivePieceThroughGameService(remoteRunReference.profileIdentifier, {
          ...attemptRequest,
          expectedStateVersion: attemptRequest.expectedStateVersion + remoteRunReference.stateVersionOffset,
        }),
        reportDirectorTurnPhase,
      )
      if (!serviceAnswer.wasSuccessful) {
        throw new RemoteDirectorTurnUnavailableError(serviceAnswer.failureName)
      }
      return {
        ...serviceAnswer.value,
        confirmedTurn: adaptConfirmedTurn(serviceAnswer.value.confirmedTurn, remoteRunReference.stateVersionOffset),
      }
    },
    async requestInteractivePieceAssistance(assistanceRequest) {
      const remoteRunReference = readRemoteRunReference()
      if (remoteRunReference === null) {
        throw new Error(remoteInteractivePieceRequestFailedMessage)
      }
      const serviceAnswer = await requestInteractivePieceAssistanceThroughGameService(remoteRunReference.profileIdentifier, {
        ...assistanceRequest,
        actionKey: assistanceRequest.actionKey,
        expectedStateVersion: assistanceRequest.expectedStateVersion + remoteRunReference.stateVersionOffset,
      })
      if (!serviceAnswer.wasSuccessful) {
        throw new RemoteDirectorTurnUnavailableError(serviceAnswer.failureName)
      }
      return replaceLostVoiceMarks(serviceAnswer.value.assistanceRecord, readLostVoiceText())
    },
  }
}

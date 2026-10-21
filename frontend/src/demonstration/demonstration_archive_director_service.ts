import { personalizeNarrativeText, readLatestChronicleState } from '../game_state/chronicle_state'
import type {
  ArchiveDirectorService,
  DirectorTurnResolution,
  InteractivePieceAttemptResolution,
  ReportDirectorTurnPhase,
} from '../game_state/archive_turn_contract'
import {
  createLighthouseArchiveOpening,
  readLighthouseInteractivePieceAssistance,
  resolveInteractivePieceAttemptAgainstLighthouseCase,
  resolveInvestigatorActionAgainstLighthouseCase,
} from './lighthouse_case/lighthouse_case_turn_resolution'
import type { DirectorCaseSnapshot } from './lighthouse_case/lighthouse_case_turn_resolution'

const shortestWeighingMilliseconds = 900
const longestWeighingMilliseconds = 1600
const shortestNarratingMilliseconds = 600
const longestNarratingMilliseconds = 1100
const assistanceDelayMilliseconds = 500
const simulatedServiceFailureStorageKey = 'the_void_files_demonstration_director_failure'
const rejectedAttemptMessage = 'El Director de demostración no pudo adjudicar ese intento'
const unavailableAssistanceMessage = 'El Director de demostración no tiene ayudas para esa pieza'

function waitForMilliseconds(durationMilliseconds: number): Promise<void> {
  return new Promise((resolveWaiting) => window.setTimeout(resolveWaiting, durationMilliseconds))
}

function chooseDurationBetween(shortestMilliseconds: number, longestMilliseconds: number): number {
  return shortestMilliseconds + Math.random() * (longestMilliseconds - shortestMilliseconds)
}

function readDirectorCaseSnapshot(): DirectorCaseSnapshot {
  const chronicleState = readLatestChronicleState()
  const relationalAnchor = chronicleState.investigatorRegistration?.relationalAnchor
  return {
    archiveRun: chronicleState.archiveRun,
    investigator: chronicleState.investigator,
    relationalAnchorPersonName:
      relationalAnchor?.kind === 'person' && relationalAnchor.personName.trim() !== '' ? relationalAnchor.personName : null,
    personalizeText: (narrativeText) => personalizeNarrativeText(narrativeText, chronicleState.investigatorRegistration),
  }
}

function consumeSimulatedServiceFailureRequest(): boolean {
  try {
    if (window.sessionStorage.getItem(simulatedServiceFailureStorageKey) !== 'once') {
      return false
    }
    window.sessionStorage.removeItem(simulatedServiceFailureStorageKey)
    return true
  } catch {
    return false
  }
}

export function createDemonstrationArchiveDirectorService(): ArchiveDirectorService {
  const turnResolutionByActionKey = new Map<string, DirectorTurnResolution>()
  const attemptResolutionByActionKey = new Map<string, InteractivePieceAttemptResolution>()

  const waitThroughDirectorPhases = async (reportDirectorTurnPhase: ReportDirectorTurnPhase) => {
    reportDirectorTurnPhase('weighing_action')
    await waitForMilliseconds(chooseDurationBetween(shortestWeighingMilliseconds, longestWeighingMilliseconds))
    reportDirectorTurnPhase('narrating')
    await waitForMilliseconds(chooseDurationBetween(shortestNarratingMilliseconds, longestNarratingMilliseconds))
  }

  return {
    async openArchive() {
      return createLighthouseArchiveOpening(readDirectorCaseSnapshot())
    },
    async resolveInvestigatorAction(actionRequest, reportDirectorTurnPhase) {
      const alreadyResolved = turnResolutionByActionKey.get(actionRequest.actionKey)
      if (alreadyResolved) {
        return alreadyResolved
      }
      await waitThroughDirectorPhases(reportDirectorTurnPhase)
      if (consumeSimulatedServiceFailureRequest()) {
        reportDirectorTurnPhase('idle')
        return { dispositionName: 'service_failed', isRetryPossible: true }
      }
      const directorTurnResolution = resolveInvestigatorActionAgainstLighthouseCase(actionRequest, readDirectorCaseSnapshot())
      if (directorTurnResolution.dispositionName !== 'service_failed') {
        turnResolutionByActionKey.set(actionRequest.actionKey, directorTurnResolution)
      }
      reportDirectorTurnPhase('idle')
      return directorTurnResolution
    },
    async attemptInteractivePiece(attemptRequest, reportDirectorTurnPhase) {
      const alreadyResolved = attemptResolutionByActionKey.get(attemptRequest.actionKey)
      if (alreadyResolved) {
        return alreadyResolved
      }
      await waitThroughDirectorPhases(reportDirectorTurnPhase)
      const attemptResolution = resolveInteractivePieceAttemptAgainstLighthouseCase(attemptRequest, readDirectorCaseSnapshot())
      reportDirectorTurnPhase('idle')
      if (!attemptResolution) {
        throw new Error(rejectedAttemptMessage)
      }
      attemptResolutionByActionKey.set(attemptRequest.actionKey, attemptResolution)
      return attemptResolution
    },
    async requestInteractivePieceAssistance(assistanceRequest) {
      await waitForMilliseconds(assistanceDelayMilliseconds)
      const assistanceRecord = readLighthouseInteractivePieceAssistance(
        assistanceRequest.interactivePieceIdentifier,
        assistanceRequest.requestedLevelName,
      )
      if (!assistanceRecord) {
        throw new Error(unavailableAssistanceMessage)
      }
      return assistanceRecord
    },
  }
}

import { portfolioDemoCopy } from '../copy/portfolio_demo_copy'
import { writeArchiveDirectorRunNote } from '../game_service/archive_director_run_note'
import type {
  ArchiveDirectorService,
  DirectorTurnResolution,
  InteractivePieceAttemptResolution,
  ReportDirectorTurnPhase,
} from '../game_state/archive_turn_contract'
import { personalizeNarrativeText, readLatestChronicleState } from '../game_state/chronicle_state'
import {
  createDemoScenePresentation,
  openDemoArchive,
  readDemoInteractivePieceAssistance,
  resolveDemoInteractivePieceAttempt,
  resolveDemoInvestigatorAction,
} from './decision_tree/demo_decision_tree_engine'
import type { DemoEngineContext, DemoRunState } from './decision_tree/demo_decision_tree_engine'
import { indexDemoDecisionTree } from './decision_tree/demo_decision_tree_progression'
import type { DemoDecisionTree } from './decision_tree/demo_decision_tree_types'

export const demoDirectorLedgerStorageKey = 'the_void_files_portfolio_demo_director_ledger'

const ledgerFormatVersion = 1
const weighingActionMilliseconds = 900
const narratingMilliseconds = 700
const assistanceDelayMilliseconds = 450

type DemoDirectorLedger = {
  ledgerFormatVersion: typeof ledgerFormatVersion
  treeContentVersion: string
  archiveCaseIdentifier: string
  runStateByStateVersion: Record<string, DemoRunState>
  turnResolutionByActionKey: Record<string, DirectorTurnResolution>
  attemptResolutionByActionKey: Record<string, InteractivePieceAttemptResolution>
}

export class DemoDirectorRefusalError extends Error {
  readonly refusalName: string

  constructor(refusalName: string, visibleMessage: string) {
    super(visibleMessage)
    this.name = 'DemoDirectorRefusalError'
    this.refusalName = refusalName
  }
}

function isLedgerUsable(candidate: unknown, tree: DemoDecisionTree): candidate is DemoDirectorLedger {
  if (typeof candidate !== 'object' || candidate === null) {
    return false
  }
  const possibleLedger = candidate as Partial<DemoDirectorLedger>
  return (
    possibleLedger.ledgerFormatVersion === ledgerFormatVersion &&
    possibleLedger.treeContentVersion === tree.treeContentVersion &&
    possibleLedger.archiveCaseIdentifier === tree.archiveCaseIdentifier &&
    typeof possibleLedger.runStateByStateVersion === 'object' &&
    typeof possibleLedger.turnResolutionByActionKey === 'object' &&
    typeof possibleLedger.attemptResolutionByActionKey === 'object'
  )
}

function waitForMilliseconds(durationMilliseconds: number): Promise<void> {
  return new Promise((resolveWaiting) => window.setTimeout(resolveWaiting, durationMilliseconds))
}

async function waitThroughDirectorPhases(reportDirectorTurnPhase: ReportDirectorTurnPhase) {
  reportDirectorTurnPhase('weighing_action')
  await waitForMilliseconds(weighingActionMilliseconds)
  reportDirectorTurnPhase('narrating')
  await waitForMilliseconds(narratingMilliseconds)
}

export function createDemoArchiveDirectorService(tree: DemoDecisionTree): ArchiveDirectorService {
  const context: DemoEngineContext = {
    index: indexDemoDecisionTree(tree),
    personalizeVisibleText: (visibleText) =>
      personalizeNarrativeText(visibleText, readLatestChronicleState().investigatorRegistration),
  }
  let ledgerKeptInMemory: DemoDirectorLedger | null = null

  const readLedger = (): DemoDirectorLedger | null => {
    if (ledgerKeptInMemory) {
      return ledgerKeptInMemory
    }
    try {
      const storedText = window.sessionStorage.getItem(demoDirectorLedgerStorageKey)
      const parsedCandidate: unknown = storedText ? JSON.parse(storedText) : null
      ledgerKeptInMemory = isLedgerUsable(parsedCandidate, tree) ? parsedCandidate : null
    } catch (storageError) {
      console.warn('portfolio demo ledger could not be read from session storage', storageError)
      ledgerKeptInMemory = null
    }
    return ledgerKeptInMemory
  }

  const writeLedger = (ledger: DemoDirectorLedger) => {
    ledgerKeptInMemory = ledger
    try {
      window.sessionStorage.setItem(demoDirectorLedgerStorageKey, JSON.stringify(ledger))
    } catch (storageError) {
      console.warn('portfolio demo ledger kept only in memory', storageError)
    }
  }

  const readRunStateAt = (stateVersion: number): DemoRunState | null =>
    readLedger()?.runStateByStateVersion[String(stateVersion)] ?? null

  const recordRunState = (ledger: DemoDirectorLedger, runState: DemoRunState): DemoDirectorLedger => ({
    ...ledger,
    runStateByStateVersion: { ...ledger.runStateByStateVersion, [String(runState.stateVersion)]: runState },
  })

  return {
    async openArchive(whisperIdentifier) {
      if (whisperIdentifier !== tree.whisperIdentifier) {
        throw new DemoDirectorRefusalError('whisper_not_offered', portfolioDemoCopy.openingUnavailableMessage)
      }
      const { openingResolution, runState } = openDemoArchive(context)
      writeLedger({
        ledgerFormatVersion,
        treeContentVersion: tree.treeContentVersion,
        archiveCaseIdentifier: tree.archiveCaseIdentifier,
        runStateByStateVersion: { [String(runState.stateVersion)]: runState },
        turnResolutionByActionKey: {},
        attemptResolutionByActionKey: {},
      })
      writeArchiveDirectorRunNote({ directorKindName: 'demonstration' })
      return {
        ...openingResolution,
        firstScenePresentation: createDemoScenePresentation(context, runState),
      }
    },
    async resolveInvestigatorAction(actionRequest, reportDirectorTurnPhase) {
      const alreadyResolved = readLedger()?.turnResolutionByActionKey[actionRequest.actionKey]
      if (alreadyResolved) {
        return alreadyResolved
      }
      await waitThroughDirectorPhases(reportDirectorTurnPhase)
      const ledger = readLedger()
      const runState = readRunStateAt(actionRequest.expectedStateVersion)
      if (!ledger || !runState) {
        reportDirectorTurnPhase('idle')
        return { dispositionName: 'service_failed', isRetryPossible: false }
      }
      const turnResult = resolveDemoInvestigatorAction(context, runState, actionRequest)
      if (turnResult.resolution.dispositionName !== 'service_failed') {
        writeLedger({
          ...recordRunState(ledger, turnResult.runState),
          turnResolutionByActionKey: { ...ledger.turnResolutionByActionKey, [actionRequest.actionKey]: turnResult.resolution },
        })
      }
      reportDirectorTurnPhase('idle')
      return turnResult.resolution
    },
    async attemptInteractivePiece(attemptRequest, reportDirectorTurnPhase) {
      const alreadyResolved = readLedger()?.attemptResolutionByActionKey[attemptRequest.actionKey]
      if (alreadyResolved) {
        return alreadyResolved
      }
      await waitThroughDirectorPhases(reportDirectorTurnPhase)
      const ledger = readLedger()
      const runState = readRunStateAt(attemptRequest.expectedStateVersion)
      reportDirectorTurnPhase('idle')
      if (!ledger || !runState) {
        throw new DemoDirectorRefusalError('state_version_conflict', portfolioDemoCopy.directorUnavailableMessage)
      }
      const attemptResult = resolveDemoInteractivePieceAttempt(context, runState, attemptRequest)
      if (!attemptResult.wasAdjudicated) {
        throw new DemoDirectorRefusalError(attemptResult.rejectionReasonName, portfolioDemoCopy.directorUnavailableMessage)
      }
      writeLedger({
        ...recordRunState(ledger, attemptResult.runState),
        attemptResolutionByActionKey: { ...ledger.attemptResolutionByActionKey, [attemptRequest.actionKey]: attemptResult.resolution },
      })
      return attemptResult.resolution
    },
    async requestInteractivePieceAssistance(assistanceRequest) {
      await waitForMilliseconds(assistanceDelayMilliseconds)
      const runState = readRunStateAt(assistanceRequest.expectedStateVersion)
      const assistanceRecord = runState ? readDemoInteractivePieceAssistance(context, runState, assistanceRequest) : null
      if (!assistanceRecord) {
        throw new DemoDirectorRefusalError('assistance_unavailable', portfolioDemoCopy.assistanceUnavailableMessage)
      }
      return assistanceRecord
    },
  }
}

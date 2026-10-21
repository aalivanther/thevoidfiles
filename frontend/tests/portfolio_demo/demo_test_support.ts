import { readFileSync } from 'node:fs'
import path from 'node:path'
import type {
  ConfirmedArchiveTurn,
  InteractivePieceAttemptResolution,
  InteractivePieceSubmittedValue,
  InvestigatorActionRequest,
  PlannedActionStep,
} from '../../src/game_state/archive_turn_contract'
import { personalizeNarrativeText, reduceChronicleState } from '../../src/game_state/chronicle_state'
import type { ChronicleState } from '../../src/game_state/chronicle_state'
import {
  openDemoArchive,
  resolveDemoInteractivePieceAttempt,
  resolveDemoInvestigatorAction,
} from '../../src/portfolio_demo/decision_tree/demo_decision_tree_engine'
import type { DemoEngineContext, DemoRunState } from '../../src/portfolio_demo/decision_tree/demo_decision_tree_engine'
import { indexDemoDecisionTree } from '../../src/portfolio_demo/decision_tree/demo_decision_tree_progression'
import type { DemoRouteStep } from '../../src/portfolio_demo/decision_tree/demo_decision_tree_routes'
import type { DemoDecisionTree } from '../../src/portfolio_demo/decision_tree/demo_decision_tree_types'
import { lighthouseDemoDecisionTree } from '../../src/portfolio_demo/decision_tree/lighthouse_demo_decision_tree'
import {
  composePortfolioDemoChronicleState,
  portfolioDemoInvestigatorRegistration,
} from '../../src/portfolio_demo/portfolio_demo_chronicle_seed'

export const projectRootDirectory = `${path.resolve(import.meta.dirname, '../../..')}/`

export function readProjectTextFile(relativePath: string): string {
  return readFileSync(`${projectRootDirectory}${relativePath}`, 'utf-8')
}

export function cloneDemoTree(): DemoDecisionTree {
  return structuredClone(lighthouseDemoDecisionTree)
}

export function createDemoEngineContext(tree: DemoDecisionTree = lighthouseDemoDecisionTree): DemoEngineContext {
  return {
    index: indexDemoDecisionTree(tree),
    personalizeVisibleText: (visibleText) => personalizeNarrativeText(visibleText, portfolioDemoInvestigatorRegistration),
  }
}

export type PlayedArchive = {
  context: DemoEngineContext
  runState: DemoRunState
  chronicleState: ChronicleState
  confirmedTurns: ConfirmedArchiveTurn[]
}

export function openPlayedArchive(tree: DemoDecisionTree = lighthouseDemoDecisionTree): PlayedArchive {
  const context = createDemoEngineContext(tree)
  const { openingResolution, runState } = openDemoArchive(context)
  const chronicleState = reduceChronicleState(composePortfolioDemoChronicleState(), {
    kind: 'archive_opened',
    whisperIdentifier: tree.whisperIdentifier,
    archiveOpeningResolution: openingResolution,
  })
  return { context, runState, chronicleState, confirmedTurns: [] }
}

let actionKeySequence = 0

export function createActionKey(): string {
  actionKeySequence += 1
  return `portfolio_demo_test_action_${String(actionKeySequence).padStart(6, '0')}`
}

export function createSuggestedPlanStep(actionIdentifier: string, visibleText: string): PlannedActionStep {
  return {
    stepIdentifier: `plan_step_${actionIdentifier}`,
    actionText: visibleText,
    conditionText: null,
    originSuggestedActionIdentifier: actionIdentifier,
    wasTextEditedByPlayer: false,
    declaredResourceCost: null,
  }
}

export function createActionRequest(stateVersion: number, sceneIdentifier: string, planSteps: PlannedActionStep[]): InvestigatorActionRequest {
  return {
    actionKey: createActionKey(),
    expectedStateVersion: stateVersion,
    sceneIdentifier,
    remainingPlanSteps: planSteps,
    declaredPlanStepCount: planSteps.length,
    alreadyExecutedStepCount: 0,
    isPlayerInsistingAfterDirectorVeto: false,
    referencedInteractivePieceIdentifier: null,
  }
}

export function createAttemptRequest(stateVersion: number, interactivePieceIdentifier: string, submittedValue: InteractivePieceSubmittedValue) {
  return {
    actionKey: createActionKey(),
    expectedStateVersion: stateVersion,
    interactivePieceIdentifier,
    submittedValue,
  }
}

export class DemoTestPlaybackError extends Error {
  constructor(problemDescription: string) {
    super(problemDescription)
    this.name = 'DemoTestPlaybackError'
  }
}

export function applyConfirmedTurnToChronicle(
  playedArchive: PlayedArchive,
  change:
    | { kind: 'archive_turn_confirmed'; confirmedTurn: ConfirmedArchiveTurn }
    | { kind: 'interactive_piece_attempt_confirmed'; attemptResolution: InteractivePieceAttemptResolution },
  nextRunState: DemoRunState,
): PlayedArchive {
  const nextChronicleState = reduceChronicleState(playedArchive.chronicleState, change)
  if (nextChronicleState.confirmedTurnCount !== playedArchive.chronicleState.confirmedTurnCount + 1) {
    throw new DemoTestPlaybackError(`frontend_reducer_rejected_turn:${nextRunState.stateVersion}`)
  }
  const confirmedTurn = change.kind === 'archive_turn_confirmed' ? change.confirmedTurn : change.attemptResolution.confirmedTurn
  return {
    ...playedArchive,
    runState: nextRunState,
    chronicleState: nextChronicleState,
    confirmedTurns: [...playedArchive.confirmedTurns, confirmedTurn],
  }
}

export function playActionThroughEngine(playedArchive: PlayedArchive, planSteps: PlannedActionStep[]): PlayedArchive {
  const sceneIdentifier = playedArchive.chronicleState.archiveRun.currentScenePresentation?.sceneIdentifier ?? ''
  const turnResult = resolveDemoInvestigatorAction(
    playedArchive.context,
    playedArchive.runState,
    createActionRequest(playedArchive.runState.stateVersion, sceneIdentifier, planSteps),
  )
  if (turnResult.resolution.dispositionName !== 'resolved') {
    throw new DemoTestPlaybackError(`action_not_resolved:${turnResult.resolution.dispositionName}`)
  }
  return applyConfirmedTurnToChronicle(
    playedArchive,
    { kind: 'archive_turn_confirmed', confirmedTurn: turnResult.resolution.confirmedTurn },
    turnResult.runState,
  )
}

export function playAttemptThroughEngine(
  playedArchive: PlayedArchive,
  interactivePieceIdentifier: string,
  submittedValue: InteractivePieceSubmittedValue,
): PlayedArchive {
  const attemptResult = resolveDemoInteractivePieceAttempt(
    playedArchive.context,
    playedArchive.runState,
    createAttemptRequest(playedArchive.runState.stateVersion, interactivePieceIdentifier, submittedValue),
  )
  if (!attemptResult.wasAdjudicated) {
    throw new DemoTestPlaybackError(`attempt_not_adjudicated:${attemptResult.rejectionReasonName}`)
  }
  return applyConfirmedTurnToChronicle(
    playedArchive,
    { kind: 'interactive_piece_attempt_confirmed', attemptResolution: attemptResult.resolution },
    attemptResult.runState,
  )
}

export function playRouteStepThroughEngine(playedArchive: PlayedArchive, routeStep: DemoRouteStep): PlayedArchive {
  return routeStep.kind === 'action'
    ? playActionThroughEngine(playedArchive, [createSuggestedPlanStep(routeStep.actionIdentifier, routeStep.visibleText)])
    : playAttemptThroughEngine(playedArchive, routeStep.interactivePieceIdentifier, routeStep.acceptedValue)
}

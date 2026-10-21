import type { InteractivePieceSubmittedValue } from '../../game_state/archive_turn_contract'
import {
  advanceProgression,
  createInitialProgressionState,
  indexDemoDecisionTree,
  listProgressionOptions,
} from './demo_decision_tree_progression'
import type { DemoProgressionOption, DemoProgressionState } from './demo_decision_tree_progression'
import type { DemoDecisionTree } from './demo_decision_tree_types'

export type DemoRouteStep =
  | { kind: 'action'; actionIdentifier: string; visibleText: string; nodeIdentifier: string }
  | {
      kind: 'interactive_piece'
      interactivePieceIdentifier: string
      acceptedValue: InteractivePieceSubmittedValue
      nodeIdentifier: string
    }

export type DemoDecisionRoute = {
  routeIdentifier: string
  endingIdentifier: string
  isDeathEnding: boolean
  visitedNodeIdentifiers: string[]
  steps: DemoRouteStep[]
}

const maximumRouteStepCount = 80

function collectReferencedFlagNames(tree: DemoDecisionTree): Set<string> {
  return new Set(
    tree.actions.flatMap((action) => [
      ...action.visibilityRequiredFlagNames,
      ...action.visibilityForbiddenFlagNames,
      ...action.conditionalOutcomes.flatMap((conditionalOutcome) => [
        ...conditionalOutcome.requiredLivedExperienceFlagNames,
        ...conditionalOutcome.forbiddenLivedExperienceFlagNames,
      ]),
    ]),
  )
}

function readOptionKey(option: DemoProgressionOption): string {
  return option.kind === 'action'
    ? `action:${option.action.actionIdentifier}`
    : `interactive_piece:${option.piece.publicDefinition.interactivePieceIdentifier}`
}

function convertOptionToStep(option: DemoProgressionOption, nodeIdentifier: string): DemoRouteStep {
  return option.kind === 'action'
    ? { kind: 'action', actionIdentifier: option.action.actionIdentifier, visibleText: option.action.visibleText, nodeIdentifier }
    : {
        kind: 'interactive_piece',
        interactivePieceIdentifier: option.piece.publicDefinition.interactivePieceIdentifier,
        acceptedValue: option.piece.privateSolution,
        nodeIdentifier,
      }
}

function applyOption(state: DemoProgressionState, option: DemoProgressionOption): DemoProgressionState {
  return advanceProgression(
    state,
    option.kind === 'action'
      ? { kind: 'action', actionIdentifier: option.action.actionIdentifier }
      : { kind: 'interactive_piece', interactivePieceIdentifier: option.piece.publicDefinition.interactivePieceIdentifier },
    option.outcome,
  )
}

export function enumerateDemoDecisionRoutes(tree: DemoDecisionTree): DemoDecisionRoute[] {
  const index = indexDemoDecisionTree(tree)
  const referencedFlagNames = collectReferencedFlagNames(tree)
  const coveredOptionKeys = new Set<string>()
  const routes: DemoDecisionRoute[] = []

  const isUnlockingOption = (option: DemoProgressionOption) =>
    option.kind === 'interactive_piece' ||
    option.outcome.presentedInteractivePieceIdentifiers.length > 0 ||
    option.outcome.grantedLivedExperienceFlagNames.some((flagName) => referencedFlagNames.has(flagName))

  const takeInNodeOptions = (startState: DemoProgressionState, startSteps: DemoRouteStep[]) => {
    let state = startState
    const steps = [...startSteps]
    let nextOption: DemoProgressionOption | undefined
    do {
      nextOption = listProgressionOptions(index, state).find(
        (option) =>
          option.outcome.destination.kind === 'stay_in_node' &&
          (isUnlockingOption(option) || !coveredOptionKeys.has(readOptionKey(option))),
      )
      if (nextOption) {
        coveredOptionKeys.add(readOptionKey(nextOption))
        steps.push(convertOptionToStep(nextOption, state.nodeIdentifier))
        state = applyOption(state, nextOption)
      }
    } while (nextOption && steps.length < maximumRouteStepCount)
    return { state, steps }
  }

  const exploreDecisions = (startState: DemoProgressionState, startSteps: DemoRouteStep[], visitedNodeIdentifiers: string[]) => {
    const { state, steps } = takeInNodeOptions(startState, startSteps)
    const decisionOptions = listProgressionOptions(index, state).filter(
      (option) => option.outcome.destination.kind !== 'stay_in_node',
    )
    if (decisionOptions.length === 0 || steps.length >= maximumRouteStepCount) {
      throw new Error(`demo_route_without_decision:${state.nodeIdentifier}:${steps.length}`)
    }
    for (const decisionOption of decisionOptions) {
      coveredOptionKeys.add(readOptionKey(decisionOption))
      const routeSteps = [...steps, convertOptionToStep(decisionOption, state.nodeIdentifier)]
      const successorState = applyOption(state, decisionOption)
      if (successorState.closedWithEndingIdentifier !== null) {
        const endingIdentifier = successorState.closedWithEndingIdentifier
        routes.push({
          routeIdentifier: `route_${String(routes.length + 1).padStart(2, '0')}_${endingIdentifier}`,
          endingIdentifier,
          isDeathEnding: index.endingByIdentifier.get(endingIdentifier)?.deathOutcome !== null,
          visitedNodeIdentifiers,
          steps: routeSteps,
        })
        continue
      }
      exploreDecisions(successorState, routeSteps, [...visitedNodeIdentifiers, successorState.nodeIdentifier])
    }
  }

  const initialState = createInitialProgressionState(tree)
  exploreDecisions(initialState, [], [initialState.nodeIdentifier])
  return routes
}

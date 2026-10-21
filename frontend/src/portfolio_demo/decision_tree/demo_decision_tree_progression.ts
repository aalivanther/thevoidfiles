import type {
  DemoActionDefinition,
  DemoDecisionTree,
  DemoEndingDefinition,
  DemoInteractivePieceDefinition,
  DemoNodeDefinition,
  DemoOutcome,
} from './demo_decision_tree_types'

export type DemoDecisionTreeIndex = {
  tree: DemoDecisionTree
  actionByIdentifier: ReadonlyMap<string, DemoActionDefinition>
  nodeByIdentifier: ReadonlyMap<string, DemoNodeDefinition>
  pieceByIdentifier: ReadonlyMap<string, DemoInteractivePieceDefinition>
  endingByIdentifier: ReadonlyMap<string, DemoEndingDefinition>
}

export type DemoProgressionState = {
  nodeIdentifier: string
  takenActionIdentifiers: string[]
  presentedPieceIdentifiers: string[]
  solvedPieceIdentifiers: string[]
  livedExperienceFlagNames: string[]
  closedWithEndingIdentifier: string | null
}

export type DemoProgressionOrigin =
  | { kind: 'action'; actionIdentifier: string }
  | { kind: 'interactive_piece'; interactivePieceIdentifier: string }

export type DemoProgressionOption =
  | { kind: 'action'; action: DemoActionDefinition; outcome: DemoOutcome }
  | { kind: 'interactive_piece'; piece: DemoInteractivePieceDefinition; outcome: DemoOutcome }

export class DemoDecisionTreeIntegrityError extends Error {
  constructor(problemDescription: string) {
    super(problemDescription)
    this.name = 'DemoDecisionTreeIntegrityError'
  }
}

export function indexDemoDecisionTree(tree: DemoDecisionTree): DemoDecisionTreeIndex {
  return {
    tree,
    actionByIdentifier: new Map(tree.actions.map((action) => [action.actionIdentifier, action])),
    nodeByIdentifier: new Map(tree.nodes.map((node) => [node.nodeIdentifier, node])),
    pieceByIdentifier: new Map(
      tree.interactivePieces.map((piece) => [piece.publicDefinition.interactivePieceIdentifier, piece]),
    ),
    endingByIdentifier: new Map(tree.endings.map((ending) => [ending.endingIdentifier, ending])),
  }
}

export function createInitialProgressionState(tree: DemoDecisionTree): DemoProgressionState {
  return {
    nodeIdentifier: tree.initialState.firstNodeIdentifier,
    takenActionIdentifiers: [],
    presentedPieceIdentifiers: [],
    solvedPieceIdentifiers: [],
    livedExperienceFlagNames: [],
    closedWithEndingIdentifier: null,
  }
}

export function readProgressionNode(index: DemoDecisionTreeIndex, state: DemoProgressionState): DemoNodeDefinition {
  const node = index.nodeByIdentifier.get(state.nodeIdentifier)
  if (!node) {
    throw new DemoDecisionTreeIntegrityError(`node_not_found:${state.nodeIdentifier}`)
  }
  return node
}

function areFlagsSatisfied(
  livedExperienceFlagNames: readonly string[],
  requiredFlagNames: readonly string[],
  forbiddenFlagNames: readonly string[],
): boolean {
  return (
    requiredFlagNames.every((flagName) => livedExperienceFlagNames.includes(flagName)) &&
    forbiddenFlagNames.every((flagName) => !livedExperienceFlagNames.includes(flagName))
  )
}

export function listVisibleActions(index: DemoDecisionTreeIndex, state: DemoProgressionState): DemoActionDefinition[] {
  if (state.closedWithEndingIdentifier !== null) {
    return []
  }
  return readProgressionNode(index, state).actionIdentifiers.flatMap((actionIdentifier) => {
    const action = index.actionByIdentifier.get(actionIdentifier)
    if (!action) {
      throw new DemoDecisionTreeIntegrityError(`action_not_found:${actionIdentifier}`)
    }
    const isVisible =
      !state.takenActionIdentifiers.includes(actionIdentifier) &&
      areFlagsSatisfied(state.livedExperienceFlagNames, action.visibilityRequiredFlagNames, action.visibilityForbiddenFlagNames)
    return isVisible ? [action] : []
  })
}

export function listAttemptablePieceIdentifiers(index: DemoDecisionTreeIndex, state: DemoProgressionState): string[] {
  if (state.closedWithEndingIdentifier !== null) {
    return []
  }
  return readProgressionNode(index, state)
    .pieceSolvedOutcomes.map((pieceSolvedOutcome) => pieceSolvedOutcome.interactivePieceIdentifier)
    .filter(
      (pieceIdentifier) =>
        state.presentedPieceIdentifiers.includes(pieceIdentifier) && !state.solvedPieceIdentifiers.includes(pieceIdentifier),
    )
}

export function chooseActionOutcome(action: DemoActionDefinition, state: DemoProgressionState): DemoOutcome {
  const matchingConditionalOutcome = action.conditionalOutcomes.find((conditionalOutcome) =>
    areFlagsSatisfied(
      state.livedExperienceFlagNames,
      conditionalOutcome.requiredLivedExperienceFlagNames,
      conditionalOutcome.forbiddenLivedExperienceFlagNames,
    ),
  )
  return matchingConditionalOutcome?.outcome ?? action.outcome
}

export function readPieceSolvedOutcome(
  index: DemoDecisionTreeIndex,
  state: DemoProgressionState,
  interactivePieceIdentifier: string,
): DemoOutcome | null {
  return (
    readProgressionNode(index, state).pieceSolvedOutcomes.find(
      (pieceSolvedOutcome) => pieceSolvedOutcome.interactivePieceIdentifier === interactivePieceIdentifier,
    )?.outcome ?? null
  )
}

export function listProgressionOptions(index: DemoDecisionTreeIndex, state: DemoProgressionState): DemoProgressionOption[] {
  const actionOptions: DemoProgressionOption[] = listVisibleActions(index, state).map((action) => ({
    kind: 'action',
    action,
    outcome: chooseActionOutcome(action, state),
  }))
  const pieceOptions: DemoProgressionOption[] = listAttemptablePieceIdentifiers(index, state).flatMap((pieceIdentifier) => {
    const piece = index.pieceByIdentifier.get(pieceIdentifier)
    const outcome = readPieceSolvedOutcome(index, state, pieceIdentifier)
    if (!piece || !outcome) {
      throw new DemoDecisionTreeIntegrityError(`piece_option_incomplete:${pieceIdentifier}`)
    }
    return [{ kind: 'interactive_piece', piece, outcome }]
  })
  return [...actionOptions, ...pieceOptions]
}

function appendMissing(existingValues: readonly string[], addedValues: readonly string[]): string[] {
  const combinedValues = [...existingValues]
  for (const addedValue of addedValues) {
    if (!combinedValues.includes(addedValue)) {
      combinedValues.push(addedValue)
    }
  }
  return combinedValues
}

export function advanceProgression(
  state: DemoProgressionState,
  origin: DemoProgressionOrigin,
  outcome: DemoOutcome,
): DemoProgressionState {
  const destination = outcome.destination
  return {
    nodeIdentifier: destination.kind === 'move_to_node' ? destination.nodeIdentifier : state.nodeIdentifier,
    takenActionIdentifiers:
      origin.kind === 'action' ? appendMissing(state.takenActionIdentifiers, [origin.actionIdentifier]) : state.takenActionIdentifiers,
    presentedPieceIdentifiers: appendMissing(state.presentedPieceIdentifiers, outcome.presentedInteractivePieceIdentifiers),
    solvedPieceIdentifiers:
      origin.kind === 'interactive_piece'
        ? appendMissing(state.solvedPieceIdentifiers, [origin.interactivePieceIdentifier])
        : state.solvedPieceIdentifiers,
    livedExperienceFlagNames: appendMissing(state.livedExperienceFlagNames, outcome.grantedLivedExperienceFlagNames),
    closedWithEndingIdentifier: destination.kind === 'close_archive' ? destination.endingIdentifier : null,
  }
}

export function describeProgressionStateKey(state: DemoProgressionState): string {
  return JSON.stringify([
    state.nodeIdentifier,
    [...state.takenActionIdentifiers].sort(),
    [...state.presentedPieceIdentifiers].sort(),
    [...state.solvedPieceIdentifiers].sort(),
    [...state.livedExperienceFlagNames].sort(),
    state.closedWithEndingIdentifier,
  ])
}

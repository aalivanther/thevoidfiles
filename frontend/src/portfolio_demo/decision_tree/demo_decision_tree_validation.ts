import {
  advanceProgression,
  createInitialProgressionState,
  describeProgressionStateKey,
  indexDemoDecisionTree,
  listProgressionOptions,
} from './demo_decision_tree_progression'
import type { DemoProgressionOption, DemoProgressionState } from './demo_decision_tree_progression'
import type {
  DemoDecisionTree,
  DemoInteractivePieceDefinition,
  DemoOutcome,
  DemoScriptedEntry,
} from './demo_decision_tree_types'
import { supportedDemoDecisionTreeFormatVersion } from './demo_decision_tree_types'
import { findViolatedVisibleRuleTexts, isSubmittedValueUsable } from './demo_interactive_piece_judgement'

export const requiredInteractivePieceWidgetKindNames = ['combination_dials', 'cipher_wheel', 'ordered_positions'] as const
export const allowedNarrativePlaceholderNames = ['nombre', 'nombre_completo', 'voz_perdida'] as const

const maximumExploredStateCount = 50000
const maximumSeriousWoundCount = 5
const placeholderPattern = /\{\{([^{}]*)\}\}/g

export type DemoTreeValidationReport = {
  problems: string[]
  exploredStateCount: number
  reachableNodeIdentifiers: string[]
  reachableEndingIdentifiers: string[]
  aliveEndingIdentifiers: string[]
  deathEndingIdentifiers: string[]
}

type OutcomeLocation = { locationDescription: string; outcome: DemoOutcome }

function findDuplicates(identifiers: readonly string[]): string[] {
  return identifiers.filter((identifier, identifierIndex) => identifiers.indexOf(identifier) !== identifierIndex)
}

function listOutcomeLocations(tree: DemoDecisionTree): OutcomeLocation[] {
  const actionOutcomeLocations = tree.actions.flatMap((action) => [
    { locationDescription: `action:${action.actionIdentifier}`, outcome: action.outcome },
    ...action.conditionalOutcomes.map((conditionalOutcome, conditionalIndex) => ({
      locationDescription: `action:${action.actionIdentifier}:conditional_${conditionalIndex}`,
      outcome: conditionalOutcome.outcome,
    })),
  ])
  const pieceOutcomeLocations = tree.nodes.flatMap((node) =>
    node.pieceSolvedOutcomes.map((pieceSolvedOutcome) => ({
      locationDescription: `node:${node.nodeIdentifier}:solved:${pieceSolvedOutcome.interactivePieceIdentifier}`,
      outcome: pieceSolvedOutcome.outcome,
    })),
  )
  return [...actionOutcomeLocations, ...pieceOutcomeLocations]
}

function listScriptedEntries(tree: DemoDecisionTree): Array<{ locationDescription: string; entry: DemoScriptedEntry }> {
  return [
    ...listOutcomeLocations(tree).flatMap(({ locationDescription, outcome }) =>
      outcome.directorEntries.map((entry) => ({ locationDescription, entry })),
    ),
    ...tree.nodes.flatMap((node) =>
      node.arrivalEntries.map((entry) => ({ locationDescription: `node:${node.nodeIdentifier}:arrival`, entry })),
    ),
    ...tree.endings.flatMap((ending) =>
      ending.closingEntries.map((entry) => ({ locationDescription: `ending:${ending.endingIdentifier}`, entry })),
    ),
    ...tree.aliveClosingEpilogue.entries.map((entry) => ({ locationDescription: 'alive_closing_epilogue', entry })),
    ...tree.aliveEndingClosingEntries.map((conditionalEntry) => ({
      locationDescription: 'alive_ending_closing_entries',
      entry: conditionalEntry.entry,
    })),
  ]
}

export function listNarrativeTexts(tree: DemoDecisionTree): Array<{ locationDescription: string; text: string }> {
  const entryTexts = listScriptedEntries(tree).flatMap(({ locationDescription, entry }) =>
    entry.markedParagraphs.map((text) => ({ locationDescription, text })),
  )
  const outcomeTexts = listOutcomeLocations(tree).flatMap(({ locationDescription, outcome }) => [
    ...outcome.relationshipChanges.map((relationshipChange) => ({ locationDescription, text: relationshipChange.perceptibleCauseText })),
    ...[outcome.seriousWoundCauseText, outcome.criticalFailureCauseText, outcome.perceptionClarificationText]
      .filter((text): text is string => text !== null)
      .map((text) => ({ locationDescription, text })),
    ...outcome.conditionsGained.flatMap((condition) =>
      [condition.visibleName, condition.originText, condition.effectText, condition.exitText].map((text) => ({
        locationDescription,
        text,
      })),
    ),
  ])
  return [
    ...tree.openingNarrationParagraphs.map((text) => ({ locationDescription: 'opening', text })),
    ...entryTexts,
    ...outcomeTexts,
    ...tree.actions.map((action) => ({ locationDescription: `action:${action.actionIdentifier}:visible_text`, text: action.visibleText })),
    ...tree.nodes.flatMap((node) =>
      node.presentPersons.map((presentPerson) => ({
        locationDescription: `node:${node.nodeIdentifier}:presence`,
        text: presentPerson.presenceText,
      })),
    ),
    ...tree.interactivePieces.flatMap((piece) => [
      ...piece.failedAttemptNarrationParagraphs.map((text) => ({
        locationDescription: `piece:${piece.publicDefinition.interactivePieceIdentifier}:failed`,
        text,
      })),
      ...Object.values(piece.assistanceHintTextByLevelName).map((text) => ({
        locationDescription: `piece:${piece.publicDefinition.interactivePieceIdentifier}:assistance`,
        text,
      })),
    ]),
    ...tree.endings.flatMap((ending) =>
      ending.deathOutcome
        ? [ending.deathOutcome.perceptibleCauseText, ending.deathOutcome.epitaphRewriteText, ending.deathOutcome.intrusiveOptionText]
            .filter((text): text is string => text !== null)
            .map((text) => ({ locationDescription: `ending:${ending.endingIdentifier}:death`, text }))
        : [],
    ),
    ...tree.entropySignals.map((entropySignal) => ({
      locationDescription: `entropy:${entropySignal.signalFlagName}`,
      text: entropySignal.markedParagraph,
    })),
    { locationDescription: 'lost_voice_text', text: tree.lostVoiceText },
  ]
}

function validatePiece(piece: DemoInteractivePieceDefinition, report: (problem: string) => void) {
  const pieceIdentifier = piece.publicDefinition.interactivePieceIdentifier
  if (piece.privateSolution.widgetKindName !== piece.publicDefinition.publicState.widgetKindName) {
    report(`piece_solution_widget_mismatch:${pieceIdentifier}`)
    return
  }
  if (!isSubmittedValueUsable(piece, piece.privateSolution)) {
    report(`piece_solution_unusable:${pieceIdentifier}`)
  }
  const violatedBySolution = findViolatedVisibleRuleTexts(piece, piece.privateSolution)
  if (violatedBySolution.length > 0) {
    report(`piece_solution_violates_rules:${pieceIdentifier}:${violatedBySolution.join(' | ')}`)
  }
  if (piece.privateRuleChecks.length === 0) {
    report(`piece_without_rule_checks:${pieceIdentifier}`)
  }
  for (const ruleCheck of piece.privateRuleChecks) {
    if (!piece.publicDefinition.visibleRuleTexts.includes(ruleCheck.visibleRuleText)) {
      report(`piece_rule_check_not_visible:${pieceIdentifier}:${ruleCheck.visibleRuleText}`)
    }
  }
  if (piece.failedAttemptNarrationParagraphs.length === 0) {
    report(`piece_without_failed_narration:${pieceIdentifier}`)
  }
  for (const levelName of ['gentle', 'medium', 'direct'] as const) {
    if (piece.assistanceHintTextByLevelName[levelName].trim() === '') {
      report(`piece_assistance_missing:${pieceIdentifier}:${levelName}`)
    }
  }
}

function describeOptionIdentifier(option: DemoProgressionOption): string {
  return option.kind === 'action'
    ? `action:${option.action.actionIdentifier}`
    : `interactive_piece:${option.piece.publicDefinition.interactivePieceIdentifier}`
}

export function validateDemoDecisionTree(tree: DemoDecisionTree): DemoTreeValidationReport {
  const problems: string[] = []
  const report = (problem: string) => problems.push(problem)
  const index = indexDemoDecisionTree(tree)
  const deathEndingIdentifiers = tree.endings.filter((ending) => ending.deathOutcome !== null).map((ending) => ending.endingIdentifier)
  const aliveEndingIdentifiers = tree.endings.filter((ending) => ending.deathOutcome === null).map((ending) => ending.endingIdentifier)
  const emptyReport = (): DemoTreeValidationReport => ({
    problems,
    exploredStateCount: 0,
    reachableNodeIdentifiers: [],
    reachableEndingIdentifiers: [],
    aliveEndingIdentifiers,
    deathEndingIdentifiers,
  })

  if (tree.treeFormatVersion !== supportedDemoDecisionTreeFormatVersion) {
    report(`tree_format_version_unsupported:${String(tree.treeFormatVersion)}`)
  }
  const identifierGroups: Array<[string, string[]]> = [
    ['action', tree.actions.map((action) => action.actionIdentifier)],
    ['node', tree.nodes.map((node) => node.nodeIdentifier)],
    ['piece', tree.interactivePieces.map((piece) => piece.publicDefinition.interactivePieceIdentifier)],
    ['ending', tree.endings.map((ending) => ending.endingIdentifier)],
    ['person', tree.persons.map((person) => person.personIdentifier)],
  ]
  for (const [groupName, identifiers] of identifierGroups) {
    for (const duplicatedIdentifier of findDuplicates(identifiers)) {
      report(`duplicated_${groupName}_identifier:${duplicatedIdentifier}`)
    }
  }
  const personIdentifiers = new Set(tree.persons.map((person) => person.personIdentifier))
  const belongingIdentifiers = new Set(tree.belongingDefinitions.map((belongingDefinition) => belongingDefinition.identifier))
  if (!index.nodeByIdentifier.has(tree.initialState.firstNodeIdentifier)) {
    report(`first_node_missing:${tree.initialState.firstNodeIdentifier}`)
  }
  for (const belongingIdentifier of Object.keys(tree.initialState.belongingUnits)) {
    if (!belongingIdentifiers.has(belongingIdentifier)) {
      report(`initial_belonging_undefined:${belongingIdentifier}`)
    }
  }
  for (const node of tree.nodes) {
    if (node.actionIdentifiers.length === 0 && node.pieceSolvedOutcomes.length === 0) {
      report(`node_without_options:${node.nodeIdentifier}`)
    }
    for (const actionIdentifier of node.actionIdentifiers) {
      if (!index.actionByIdentifier.has(actionIdentifier)) {
        report(`node_lists_unknown_action:${node.nodeIdentifier}:${actionIdentifier}`)
      }
    }
    for (const presentPerson of node.presentPersons) {
      if (!personIdentifiers.has(presentPerson.personIdentifier)) {
        report(`node_presents_unknown_person:${node.nodeIdentifier}:${presentPerson.personIdentifier}`)
      }
    }
    for (const pieceSolvedOutcome of node.pieceSolvedOutcomes) {
      if (!index.pieceByIdentifier.has(pieceSolvedOutcome.interactivePieceIdentifier)) {
        report(`node_solves_unknown_piece:${node.nodeIdentifier}:${pieceSolvedOutcome.interactivePieceIdentifier}`)
      }
    }
  }
  const listedActionIdentifiers = new Set(tree.nodes.flatMap((node) => node.actionIdentifiers))
  for (const action of tree.actions) {
    if (!listedActionIdentifiers.has(action.actionIdentifier)) {
      report(`action_never_listed:${action.actionIdentifier}`)
    }
    const resourceCost = action.resourceCost
    if (resourceCost?.kind === 'belonging' && !belongingIdentifiers.has(resourceCost.belongingIdentifier)) {
      report(`action_costs_unknown_belonging:${action.actionIdentifier}:${resourceCost.belongingIdentifier}`)
    }
    const destinationKinds = new Set([action.outcome, ...action.conditionalOutcomes.map((item) => item.outcome)].map((outcome) => JSON.stringify(outcome.destination)))
    if (destinationKinds.size > 1) {
      report(`action_conditional_destination_differs:${action.actionIdentifier}`)
    }
    for (const patternSource of action.freeTextIntentPatternSources) {
      try {
        new RegExp(patternSource, 'i').test('')
      } catch (patternError) {
        report(`action_pattern_invalid:${action.actionIdentifier}:${patternSource}:${String(patternError)}`)
      }
    }
  }
  for (const { locationDescription, outcome } of listOutcomeLocations(tree)) {
    const { destination } = outcome
    if (destination.kind === 'move_to_node' && !index.nodeByIdentifier.has(destination.nodeIdentifier)) {
      report(`dangling_destination_node:${locationDescription}:${destination.nodeIdentifier}`)
    }
    if (destination.kind === 'close_archive' && !index.endingByIdentifier.has(destination.endingIdentifier)) {
      report(`dangling_destination_ending:${locationDescription}:${destination.endingIdentifier}`)
    }
    for (const presentedPieceIdentifier of outcome.presentedInteractivePieceIdentifiers) {
      if (!index.pieceByIdentifier.has(presentedPieceIdentifier)) {
        report(`outcome_presents_unknown_piece:${locationDescription}:${presentedPieceIdentifier}`)
      }
    }
    const referencedPersonIdentifiers = [
      ...outcome.personIdentifiersBecomingKnown,
      ...outcome.relationshipChanges.map((relationshipChange) => relationshipChange.personIdentifier),
    ]
    for (const personIdentifier of referencedPersonIdentifiers) {
      if (!personIdentifiers.has(personIdentifier)) {
        report(`outcome_references_unknown_person:${locationDescription}:${personIdentifier}`)
      }
    }
    for (const stagingEvent of outcome.stagingEvents) {
      const anchoredEntry = outcome.directorEntries[stagingEvent.anchorDirectorEntryIndex]
      if (!anchoredEntry || anchoredEntry.markedParagraphs[stagingEvent.anchorParagraphIndex] === undefined) {
        report(`staging_anchor_out_of_range:${locationDescription}:${stagingEvent.kind}`)
      }
    }
  }
  for (const { locationDescription, entry } of listScriptedEntries(tree)) {
    if (entry.voice === 'character_dialogue' && !personIdentifiers.has(entry.speakerPersonIdentifier)) {
      report(`dialogue_speaker_unknown:${locationDescription}:${entry.speakerPersonIdentifier}`)
    }
    if (entry.markedParagraphs.length === 0) {
      report(`entry_without_paragraphs:${locationDescription}`)
    }
  }
  for (const { locationDescription, text } of listNarrativeTexts(tree)) {
    for (const placeholderMatch of text.matchAll(placeholderPattern)) {
      if (!(allowedNarrativePlaceholderNames as readonly string[]).includes(placeholderMatch[1])) {
        report(`unknown_placeholder:${locationDescription}:${placeholderMatch[0]}`)
      }
    }
  }
  for (const piece of tree.interactivePieces) {
    validatePiece(piece, report)
  }
  for (const widgetKindName of requiredInteractivePieceWidgetKindNames) {
    if (!tree.interactivePieces.some((piece) => piece.publicDefinition.publicState.widgetKindName === widgetKindName)) {
      report(`widget_kind_not_covered:${widgetKindName}`)
    }
  }
  if (aliveEndingIdentifiers.length === 0) {
    report('no_alive_ending')
  }
  if (deathEndingIdentifiers.length === 0) {
    report('no_death_ending')
  }
  const totalSpentByResource = new Map<string, number>()
  for (const action of tree.actions) {
    if (!action.resourceCost) {
      continue
    }
    const resourceKey =
      action.resourceCost.kind === 'operational_funds' ? 'operational_funds' : `belonging:${action.resourceCost.belongingIdentifier}`
    const spentAmount = action.resourceCost.kind === 'operational_funds' ? action.resourceCost.amount : action.resourceCost.units
    totalSpentByResource.set(resourceKey, (totalSpentByResource.get(resourceKey) ?? 0) + spentAmount)
  }
  for (const [resourceKey, totalSpent] of totalSpentByResource) {
    const availableAmount =
      resourceKey === 'operational_funds'
        ? tree.initialState.operationalFunds
        : (tree.initialState.belongingUnits[resourceKey.replace('belonging:', '')] ?? 0)
    if (totalSpent > availableAmount) {
      report(`resource_may_run_out:${resourceKey}:${totalSpent}>${availableAmount}`)
    }
  }
  const woundingOutcomeCount = listOutcomeLocations(tree).filter(({ outcome }) => outcome.seriousWoundCauseText !== null).length
  if (woundingOutcomeCount >= maximumSeriousWoundCount) {
    report(`serious_wounds_may_force_unscripted_death:${woundingOutcomeCount}`)
  }
  if (problems.length > 0) {
    return emptyReport()
  }

  const initialState = createInitialProgressionState(tree)
  const stateByKey = new Map<string, DemoProgressionState>([[describeProgressionStateKey(initialState), initialState]])
  const successorKeysByKey = new Map<string, string[]>()
  const pendingKeys = [describeProgressionStateKey(initialState)]
  const reachableNodeIdentifiers = new Set<string>()
  const reachableEndingIdentifiers = new Set<string>()
  const visibleOptionIdentifiersByNode = new Map<string, Set<string>>()
  const chosenOutcomes = new Set<DemoOutcome>()
  while (pendingKeys.length > 0) {
    const stateKey = pendingKeys.pop() as string
    const state = stateByKey.get(stateKey) as DemoProgressionState
    if (state.closedWithEndingIdentifier !== null) {
      reachableEndingIdentifiers.add(state.closedWithEndingIdentifier)
      successorKeysByKey.set(stateKey, [])
      continue
    }
    reachableNodeIdentifiers.add(state.nodeIdentifier)
    const options = listProgressionOptions(index, state)
    if (options.length === 0) {
      report(`dead_end_state:${stateKey}`)
    }
    const visibleOptionIdentifiers = visibleOptionIdentifiersByNode.get(state.nodeIdentifier) ?? new Set<string>()
    const successorKeys: string[] = []
    for (const option of options) {
      visibleOptionIdentifiers.add(describeOptionIdentifier(option))
      chosenOutcomes.add(option.outcome)
      const successorState = advanceProgression(
        state,
        option.kind === 'action'
          ? { kind: 'action', actionIdentifier: option.action.actionIdentifier }
          : { kind: 'interactive_piece', interactivePieceIdentifier: option.piece.publicDefinition.interactivePieceIdentifier },
        option.outcome,
      )
      const successorKey = describeProgressionStateKey(successorState)
      successorKeys.push(successorKey)
      if (!stateByKey.has(successorKey)) {
        stateByKey.set(successorKey, successorState)
        pendingKeys.push(successorKey)
      }
    }
    visibleOptionIdentifiersByNode.set(state.nodeIdentifier, visibleOptionIdentifiers)
    successorKeysByKey.set(stateKey, successorKeys)
    if (stateByKey.size > maximumExploredStateCount) {
      report(`state_space_exceeds_limit:${maximumExploredStateCount}`)
      return emptyReport()
    }
  }

  const keysReachingAnEnding = new Set(
    [...stateByKey.entries()].filter(([, state]) => state.closedWithEndingIdentifier !== null).map(([stateKey]) => stateKey),
  )
  let hasFoundNewKey = true
  while (hasFoundNewKey) {
    hasFoundNewKey = false
    for (const [stateKey, successorKeys] of successorKeysByKey) {
      if (!keysReachingAnEnding.has(stateKey) && successorKeys.some((successorKey) => keysReachingAnEnding.has(successorKey))) {
        keysReachingAnEnding.add(stateKey)
        hasFoundNewKey = true
      }
    }
  }
  for (const stateKey of stateByKey.keys()) {
    if (!keysReachingAnEnding.has(stateKey)) {
      report(`state_cannot_reach_any_ending:${stateKey}`)
    }
  }
  for (const node of tree.nodes) {
    if (!reachableNodeIdentifiers.has(node.nodeIdentifier)) {
      report(`unreachable_node:${node.nodeIdentifier}`)
      continue
    }
    const visibleOptionIdentifiers = visibleOptionIdentifiersByNode.get(node.nodeIdentifier) ?? new Set<string>()
    for (const actionIdentifier of node.actionIdentifiers) {
      if (!visibleOptionIdentifiers.has(`action:${actionIdentifier}`)) {
        report(`action_never_available_in_node:${node.nodeIdentifier}:${actionIdentifier}`)
      }
    }
    for (const pieceSolvedOutcome of node.pieceSolvedOutcomes) {
      if (!visibleOptionIdentifiers.has(`interactive_piece:${pieceSolvedOutcome.interactivePieceIdentifier}`)) {
        report(`piece_never_attemptable_in_node:${node.nodeIdentifier}:${pieceSolvedOutcome.interactivePieceIdentifier}`)
      }
    }
  }
  for (const { locationDescription, outcome } of listOutcomeLocations(tree)) {
    if (!chosenOutcomes.has(outcome)) {
      report(`outcome_never_chosen:${locationDescription}`)
    }
  }
  for (const ending of tree.endings) {
    if (!reachableEndingIdentifiers.has(ending.endingIdentifier)) {
      report(`unreachable_ending:${ending.endingIdentifier}`)
    }
  }
  return {
    problems,
    exploredStateCount: stateByKey.size,
    reachableNodeIdentifiers: [...reachableNodeIdentifiers].sort(),
    reachableEndingIdentifiers: [...reachableEndingIdentifiers].sort(),
    aliveEndingIdentifiers,
    deathEndingIdentifiers,
  }
}

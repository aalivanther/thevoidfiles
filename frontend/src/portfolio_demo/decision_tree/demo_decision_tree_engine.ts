import { portfolioDemoCopy } from '../../copy/portfolio_demo_copy'
import {
  findBestMatchingIntent,
  sanitizeQuotedPlayerText,
} from '../../demonstration/demonstration_free_text_intent_matcher'
import { lighthouseCaseDirectorCopy } from '../../demonstration/lighthouse_case/lighthouse_case_director_copy'
import { maximumPlanStepsExecutedPerDirectorBatch } from '../../game_state/archive_turn_contract'
import type {
  ArchiveEndedAliveOutcome,
  ArchiveOpeningResolution,
  ArchiveOutcome,
  ArchiveScenePresentation,
  ConfirmedArchiveTurn,
  ConfirmedEffect,
  ConfirmedRelationshipChange,
  DirectorQuestionEntryContent,
  DirectorSpokenEntryContent,
  DirectorTurnResolution,
  InteractivePieceAssistanceRecord,
  InteractivePieceAssistanceRequest,
  InteractivePieceAttemptRequest,
  InteractivePieceAttemptResolution,
  InteractivePiecePublicDefinition,
  InteractivePieceStatusChange,
  InteractivePieceSubmittedValue,
  InvestigatorActionRequest,
  InvestigatorCondition,
  InvestigatorEntryContent,
  InvestigatorEntryStep,
  PlanStepDisposition,
  PlannedActionStep,
  RelationshipDirectionName,
  ResourceCost,
  RevealedFact,
  ServiceStagingEvent,
} from '../../game_state/archive_turn_contract'
import { readHeardLineSentences } from '../../game_state/heard_lines'
import {
  DemoDecisionTreeIntegrityError,
  advanceProgression,
  chooseActionOutcome,
  createInitialProgressionState,
  listAttemptablePieceIdentifiers,
  listVisibleActions,
  readPieceSolvedOutcome,
  readProgressionNode,
} from './demo_decision_tree_progression'
import type { DemoDecisionTreeIndex, DemoProgressionOrigin, DemoProgressionState } from './demo_decision_tree_progression'
import type {
  DemoActionDefinition,
  DemoEndingDefinition,
  DemoInteractivePieceDefinition,
  DemoOutcome,
  DemoPersonDefinition,
  DemoScriptedEntry,
} from './demo_decision_tree_types'
import { findViolatedVisibleRuleTexts, isSubmittedValueUsable } from './demo_interactive_piece_judgement'

const lostVoicePlaceholder = '{{voz_perdida}}'
const maximumSeriousWoundCount = 5
const sentenceStartPattern = /[.!?…»«¡¿:—]$/

export type DemoRunState = DemoProgressionState & {
  stateVersion: number
  worldClockMinutes: number
  placeName: string
  operationalFunds: number
  belongingUnits: Record<string, number>
  seriousWoundCount: number
  lastSeriousWoundCauseText: string | null
  knownPersonIdentifiers: string[]
  relationshipLevelByKey: Record<string, number>
  activeConditions: InvestigatorCondition[]
  witnessedOriginIdentifiers: string[]
  visitedPlaceNames: string[]
  revealedFacts: RevealedFact[]
  failedAttemptCountByPieceIdentifier: Record<string, number>
  issuedRelationshipChangeCount: number
}

export type DemoEngineContext = {
  index: DemoDecisionTreeIndex
  personalizeVisibleText: (visibleText: string) => string
}

export type DemoTurnResult = { resolution: DirectorTurnResolution; runState: DemoRunState }

export type DemoAttemptResult =
  | { wasAdjudicated: true; resolution: InteractivePieceAttemptResolution; runState: DemoRunState }
  | { wasAdjudicated: false; rejectionReasonName: DemoAttemptRejectionReasonName }

export type DemoAttemptRejectionReasonName =
  | 'archive_already_closed'
  | 'state_version_mismatch'
  | 'piece_unknown'
  | 'piece_not_open_to_attempts'
  | 'submitted_value_unusable'

type TurnDraft = {
  directorEntries: DirectorSpokenEntryContent[]
  orderedEffects: ConfirmedEffect[]
  elapsedMinutes: number
  resourceCosts: ResourceCost[]
  relationshipChanges: ConfirmedRelationshipChange[]
  stagingEvents: ServiceStagingEvent[]
  presentedInteractivePieces: InteractivePiecePublicDefinition[]
  interactivePieceStatusChanges: InteractivePieceStatusChange[]
  grantedLivedExperienceFlagNames: string[]
  witnessedOriginIdentifiers: string[]
  shouldUpdateJournal: boolean
  hasSceneChanged: boolean
  archiveOutcome: ArchiveOutcome | null
}

function createTurnDraft(): TurnDraft {
  return {
    directorEntries: [],
    orderedEffects: [],
    elapsedMinutes: 0,
    resourceCosts: [],
    relationshipChanges: [],
    stagingEvents: [],
    presentedInteractivePieces: [],
    interactivePieceStatusChanges: [],
    grantedLivedExperienceFlagNames: [],
    witnessedOriginIdentifiers: [],
    shouldUpdateJournal: false,
    hasSceneChanged: false,
    archiveOutcome: null,
  }
}

function createRelationshipLevelKey(personIdentifier: string, directionName: RelationshipDirectionName): string {
  return `${personIdentifier}:${directionName}`
}

function readPersonDefinition(context: DemoEngineContext, personIdentifier: string): DemoPersonDefinition {
  const personDefinition = context.index.tree.persons.find((person) => person.personIdentifier === personIdentifier)
  if (!personDefinition) {
    throw new DemoDecisionTreeIntegrityError(`person_not_found:${personIdentifier}`)
  }
  return personDefinition
}

function readPersonVisibleName(context: DemoEngineContext, runState: DemoRunState, personIdentifier: string): string {
  const personDefinition = readPersonDefinition(context, personIdentifier)
  return runState.knownPersonIdentifiers.includes(personIdentifier)
    ? personDefinition.knownName
    : personDefinition.aliasBeforeNameIsKnown
}

function escapeForRegularExpression(literalText: string): string {
  return literalText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function concealUnknownNames(context: DemoEngineContext, runState: DemoRunState, narrativeText: string): string {
  let concealedText = narrativeText
  for (const personDefinition of context.index.tree.persons) {
    const concealment = personDefinition.nameConcealment
    if (!concealment || runState.knownPersonIdentifiers.includes(personDefinition.personIdentifier)) {
      continue
    }
    const concealedNamePattern = new RegExp(
      [...concealment.concealedNameTexts]
        .sort((firstName, secondName) => secondName.length - firstName.length)
        .map(escapeForRegularExpression)
        .join('|'),
      'g',
    )
    const textBeforeConcealment = concealedText
    concealedText = textBeforeConcealment.replace(concealedNamePattern, (_matchedName, matchIndex: number) => {
      const precedingText = textBeforeConcealment.slice(0, matchIndex).trimEnd()
      return precedingText.length === 0 || sentenceStartPattern.test(precedingText)
        ? concealment.replacementAtSentenceStart
        : concealment.replacementInsideSentence
    })
  }
  return concealedText
}

function prepareScriptedText(context: DemoEngineContext, runState: DemoRunState, scriptedText: string): string {
  return concealUnknownNames(context, runState, scriptedText.replaceAll(lostVoicePlaceholder, context.index.tree.lostVoiceText))
}

function createDirectorSpokenEntry(
  context: DemoEngineContext,
  runState: DemoRunState,
  scriptedEntry: DemoScriptedEntry,
): DirectorSpokenEntryContent {
  const markedParagraphs = scriptedEntry.markedParagraphs.map((markedParagraph) =>
    prepareScriptedText(context, runState, markedParagraph),
  )
  if (scriptedEntry.voice === 'character_dialogue') {
    return {
      voice: 'character_dialogue',
      speakerPersonIdentifier: scriptedEntry.speakerPersonIdentifier,
      speakerVisibleName: readPersonVisibleName(context, runState, scriptedEntry.speakerPersonIdentifier),
      speakerSilhouetteName: readPersonDefinition(context, scriptedEntry.speakerPersonIdentifier).silhouetteName,
      deliveryName: scriptedEntry.deliveryName,
      markedParagraphs,
    }
  }
  if (scriptedEntry.voice === 'inner_thought') {
    return { voice: 'inner_thought', thoughtOriginName: scriptedEntry.thoughtOriginName, markedParagraphs }
  }
  return { voice: 'director_narration', markedParagraphs }
}

function appendNarrationParagraph(turnDraft: TurnDraft, markedParagraph: string) {
  turnDraft.directorEntries.push({ voice: 'director_narration', markedParagraphs: [markedParagraph] })
}

function appendDemonstrationNotice(turnDraft: TurnDraft, plainParagraph: string) {
  turnDraft.directorEntries.push({
    voice: 'system_notice',
    noticeKindName: 'demonstration_limit',
    plainParagraphs: [plainParagraph],
  })
}

function appendMissing(existingValues: string[], addedValue: string): boolean {
  if (existingValues.includes(addedValue)) {
    return false
  }
  existingValues.push(addedValue)
  return true
}

function readProgressionState(runState: DemoRunState): DemoProgressionState {
  return {
    nodeIdentifier: runState.nodeIdentifier,
    takenActionIdentifiers: runState.takenActionIdentifiers,
    presentedPieceIdentifiers: runState.presentedPieceIdentifiers,
    solvedPieceIdentifiers: runState.solvedPieceIdentifiers,
    livedExperienceFlagNames: runState.livedExperienceFlagNames,
    closedWithEndingIdentifier: runState.closedWithEndingIdentifier,
  }
}

function canAffordResourceCost(runState: DemoRunState, resourceCost: ResourceCost | null): boolean {
  if (!resourceCost) {
    return true
  }
  return resourceCost.kind === 'operational_funds'
    ? runState.operationalFunds >= resourceCost.amount
    : (runState.belongingUnits[resourceCost.belongingIdentifier] ?? 0) >= resourceCost.units
}

function applyResourceCost(workingState: DemoRunState, turnDraft: TurnDraft, resourceCost: ResourceCost) {
  turnDraft.resourceCosts.push(resourceCost)
  if (resourceCost.kind === 'operational_funds') {
    workingState.operationalFunds -= resourceCost.amount
    turnDraft.orderedEffects.push({
      kind: 'operational_funds_spent',
      amount: resourceCost.amount,
      resultingAmount: workingState.operationalFunds,
    })
    return
  }
  const resultingUnits = (workingState.belongingUnits[resourceCost.belongingIdentifier] ?? 0) - resourceCost.units
  workingState.belongingUnits[resourceCost.belongingIdentifier] = resultingUnits
  turnDraft.orderedEffects.push({
    kind: 'belonging_units_consumed',
    belongingIdentifier: resourceCost.belongingIdentifier,
    units: resourceCost.units,
    resultingUnits,
  })
}

function rememberVisitedPlace(workingState: DemoRunState) {
  appendMissing(workingState.visitedPlaceNames, workingState.placeName)
}

function evaluateObjectiveResults(context: DemoEngineContext, livedExperienceFlagNames: readonly string[]) {
  return context.index.tree.objectives.map((objective) => ({
    visibleText: objective.visibleText,
    wasAchieved:
      objective.requiredLivedExperienceFlagNames.every((flagName) => livedExperienceFlagNames.includes(flagName)) &&
      objective.forbiddenLivedExperienceFlagNames.every((flagName) => !livedExperienceFlagNames.includes(flagName)),
  }))
}

function ratePerformance(achievedObjectiveCount: number, objectiveCount: number): ArchiveEndedAliveOutcome['performanceRatingName'] {
  if (achievedObjectiveCount >= objectiveCount) {
    return 'excellent'
  }
  return achievedObjectiveCount * 2 >= objectiveCount ? 'satisfactory' : 'disappointing'
}

function readCompletedObjectiveTexts(context: DemoEngineContext, livedExperienceFlagNames: readonly string[]): string[] {
  return context.index.tree.objectives
    .filter(
      (objective) =>
        objective.requiredLivedExperienceFlagNames.length > 0 &&
        objective.requiredLivedExperienceFlagNames.every((flagName) => livedExperienceFlagNames.includes(flagName)) &&
        objective.forbiddenLivedExperienceFlagNames.every((flagName) => !livedExperienceFlagNames.includes(flagName)),
    )
    .map((objective) => objective.visibleText)
}

function advanceWorldClock(workingState: DemoRunState, turnDraft: TurnDraft, elapsedMinutes: number) {
  workingState.worldClockMinutes += elapsedMinutes
  turnDraft.elapsedMinutes += elapsedMinutes
}

function applyArchiveEnding(
  context: DemoEngineContext,
  workingState: DemoRunState,
  turnDraft: TurnDraft,
  ending: DemoEndingDefinition,
) {
  if (ending.deathOutcome) {
    for (const closingEntry of ending.closingEntries) {
      turnDraft.directorEntries.push(createDirectorSpokenEntry(context, workingState, closingEntry))
    }
    turnDraft.archiveOutcome = ending.deathOutcome
    return
  }
  const { aliveClosingEpilogue } = context.index.tree
  if (workingState.placeName !== aliveClosingEpilogue.placeName) {
    workingState.placeName = aliveClosingEpilogue.placeName
    turnDraft.stagingEvents.push({ kind: 'scene_changed', resultingPlaceName: aliveClosingEpilogue.placeName })
    rememberVisitedPlace(workingState)
  }
  advanceWorldClock(
    workingState,
    turnDraft,
    Math.max(0, aliveClosingEpilogue.dawnWorldClockMinutes - workingState.worldClockMinutes) +
      aliveClosingEpilogue.reportElapsedMinutes,
  )
  for (const epilogueEntry of aliveClosingEpilogue.entries) {
    turnDraft.directorEntries.push(createDirectorSpokenEntry(context, workingState, epilogueEntry))
  }
  for (const closingEntry of ending.closingEntries) {
    turnDraft.directorEntries.push(createDirectorSpokenEntry(context, workingState, closingEntry))
  }
  const conditionalClosingEntry = context.index.tree.aliveEndingClosingEntries.find((candidateEntry) =>
    candidateEntry.requiredLivedExperienceFlagNames.every((flagName) => workingState.livedExperienceFlagNames.includes(flagName)),
  )
  if (conditionalClosingEntry) {
    turnDraft.directorEntries.push(createDirectorSpokenEntry(context, workingState, conditionalClosingEntry.entry))
  }
  if (workingState.seriousWoundCount >= maximumSeriousWoundCount) {
    turnDraft.archiveOutcome = {
      kind: 'chronicle_closed_by_death',
      deathNatureName: 'physical',
      deathCauseName: 'fifth_serious_wound',
      perceptibleCauseText: workingState.lastSeriousWoundCauseText ?? '',
      epitaphRewriteText: null,
      intrusiveOptionText: null,
    }
    return
  }
  const objectiveResults = evaluateObjectiveResults(context, workingState.livedExperienceFlagNames)
  turnDraft.archiveOutcome = {
    kind: 'archive_ended_alive',
    endingIdentifier: ending.endingIdentifier,
    performanceRatingName: ratePerformance(
      objectiveResults.filter((objectiveResult) => objectiveResult.wasAchieved).length,
      objectiveResults.length,
    ),
    objectiveResults,
    countsAsSanctionedClosure: true,
    closureRegister: {
      placeName: workingState.placeName,
      visitedPlaceNames: [...workingState.visitedPlaceNames],
      seriousWoundCount: workingState.seriousWoundCount,
      woundCauseText: workingState.lastSeriousWoundCauseText,
      solvedPieceNames: workingState.revealedFacts.map((revealedFact) => revealedFact.visibleName),
    },
  }
}

function applyOutcome(
  context: DemoEngineContext,
  workingState: DemoRunState,
  turnDraft: TurnDraft,
  origin: DemoProgressionOrigin,
  outcome: DemoOutcome,
) {
  const nodeBeforeOutcome = readProgressionNode(context.index, readProgressionState(workingState))
  for (const personIdentifier of outcome.personIdentifiersBecomingKnown) {
    if (appendMissing(workingState.knownPersonIdentifiers, personIdentifier)) {
      turnDraft.orderedEffects.push({
        kind: 'person_became_known',
        personIdentifier,
        visibleName: readPersonDefinition(context, personIdentifier).knownName,
      })
    }
  }
  const firstEntryIndexOfOutcome = turnDraft.directorEntries.length
  for (const scriptedEntry of outcome.directorEntries) {
    turnDraft.directorEntries.push(createDirectorSpokenEntry(context, workingState, scriptedEntry))
  }
  advanceWorldClock(workingState, turnDraft, outcome.elapsedMinutes)
  if (outcome.seriousWoundCauseText) {
    workingState.seriousWoundCount = Math.min(maximumSeriousWoundCount, workingState.seriousWoundCount + 1)
    workingState.lastSeriousWoundCauseText = outcome.seriousWoundCauseText
    turnDraft.orderedEffects.push({
      kind: 'serious_wound_suffered',
      perceptibleCauseText: outcome.seriousWoundCauseText,
      resultingSeriousWoundCount: workingState.seriousWoundCount,
    })
  }
  if (outcome.criticalFailureCauseText) {
    turnDraft.orderedEffects.push({ kind: 'critical_failure_recorded', perceptibleCauseText: outcome.criticalFailureCauseText })
  }
  if (outcome.perceptionClarificationText) {
    turnDraft.orderedEffects.push({ kind: 'perception_was_altered', clarificationText: outcome.perceptionClarificationText })
  }
  for (const gainedCondition of outcome.conditionsGained) {
    if (!workingState.activeConditions.some((activeCondition) => activeCondition.conditionIdentifier === gainedCondition.conditionIdentifier)) {
      workingState.activeConditions.push(gainedCondition)
      turnDraft.orderedEffects.push({ kind: 'condition_gained', condition: gainedCondition })
    }
  }
  for (const endedConditionIdentifier of outcome.conditionIdentifiersEnded) {
    const endedCondition = workingState.activeConditions.find(
      (activeCondition) => activeCondition.conditionIdentifier === endedConditionIdentifier,
    )
    if (endedCondition) {
      workingState.activeConditions = workingState.activeConditions.filter((activeCondition) => activeCondition !== endedCondition)
      turnDraft.orderedEffects.push({
        kind: 'condition_ended',
        conditionIdentifier: endedConditionIdentifier,
        visibleName: endedCondition.visibleName,
      })
    }
  }
  for (const scriptedChange of outcome.relationshipChanges) {
    const levelKey = createRelationshipLevelKey(scriptedChange.personIdentifier, scriptedChange.directionName)
    const resultingLevel = Math.max(0, (workingState.relationshipLevelByKey[levelKey] ?? 0) + scriptedChange.levelChange)
    workingState.relationshipLevelByKey[levelKey] = resultingLevel
    workingState.issuedRelationshipChangeCount += 1
    turnDraft.relationshipChanges.push({
      identifier: `portfolio_demo_relationship_change_${workingState.issuedRelationshipChangeCount}`,
      personIdentifier: scriptedChange.personIdentifier,
      personVisibleName: readPersonVisibleName(context, workingState, scriptedChange.personIdentifier),
      personSilhouetteName: readPersonDefinition(context, scriptedChange.personIdentifier).silhouetteName,
      directionName: scriptedChange.directionName,
      dimensionName: scriptedChange.dimensionName,
      levelChange: scriptedChange.levelChange,
      resultingLevel,
      perceptibleCauseText: prepareScriptedText(context, workingState, scriptedChange.perceptibleCauseText),
      fictionalDateLabel: context.index.tree.fictionalDateLabel,
    })
  }
  for (const scriptedStagingEvent of outcome.stagingEvents) {
    turnDraft.stagingEvents.push({
      ...scriptedStagingEvent,
      anchorDirectorEntryIndex: firstEntryIndexOfOutcome + scriptedStagingEvent.anchorDirectorEntryIndex,
    })
  }
  for (const grantedFlagName of outcome.grantedLivedExperienceFlagNames) {
    if (!workingState.livedExperienceFlagNames.includes(grantedFlagName)) {
      turnDraft.grantedLivedExperienceFlagNames.push(grantedFlagName)
    }
  }
  for (const presentedPieceIdentifier of outcome.presentedInteractivePieceIdentifiers) {
    const presentedPiece = context.index.pieceByIdentifier.get(presentedPieceIdentifier)
    if (!presentedPiece) {
      throw new DemoDecisionTreeIntegrityError(`piece_not_found:${presentedPieceIdentifier}`)
    }
    if (!workingState.presentedPieceIdentifiers.includes(presentedPieceIdentifier)) {
      turnDraft.presentedInteractivePieces.push(presentedPiece.publicDefinition)
    }
  }
  if (outcome.shouldUpdateJournal) {
    turnDraft.shouldUpdateJournal = true
  }
  const originIdentifier =
    origin.kind === 'action' ? origin.actionIdentifier : `interactive_piece_solved_${origin.interactivePieceIdentifier}`
  for (const witnessedOriginIdentifier of [originIdentifier, ...outcome.additionalWitnessedOriginIdentifiers]) {
    if (appendMissing(workingState.witnessedOriginIdentifiers, witnessedOriginIdentifier)) {
      turnDraft.witnessedOriginIdentifiers.push(witnessedOriginIdentifier)
    }
  }

  Object.assign(workingState, advanceProgression(readProgressionState(workingState), origin, outcome))

  const { destination } = outcome
  if (destination.kind === 'move_to_node') {
    const destinationNode = readProgressionNode(context.index, readProgressionState(workingState))
    if (destinationNode.sceneIdentifier !== nodeBeforeOutcome.sceneIdentifier) {
      workingState.placeName = destinationNode.placeName
      turnDraft.hasSceneChanged = true
      turnDraft.stagingEvents.push({ kind: 'scene_changed', resultingPlaceName: destinationNode.placeName })
      rememberVisitedPlace(workingState)
      for (const arrivalEntry of destinationNode.arrivalEntries) {
        turnDraft.directorEntries.push(createDirectorSpokenEntry(context, workingState, arrivalEntry))
      }
    }
  }
  if (destination.kind === 'close_archive') {
    const ending = context.index.endingByIdentifier.get(destination.endingIdentifier)
    if (!ending) {
      throw new DemoDecisionTreeIntegrityError(`ending_not_found:${destination.endingIdentifier}`)
    }
    applyArchiveEnding(context, workingState, turnDraft, ending)
  }
}

export function createDemoScenePresentation(context: DemoEngineContext, runState: DemoRunState): ArchiveScenePresentation {
  const progressionState = readProgressionState(runState)
  const node = readProgressionNode(context.index, progressionState)
  const prepareVisibleText = (visibleText: string) =>
    context.personalizeVisibleText(concealUnknownNames(context, runState, visibleText))
  return {
    sceneIdentifier: node.sceneIdentifier,
    placeName: node.placeName,
    tensionTierName: node.tensionTierName,
    presentPersons: node.presentPersons.map((presentPerson) => ({
      personIdentifier: presentPerson.personIdentifier,
      visibleName: readPersonVisibleName(context, runState, presentPerson.personIdentifier),
      isNameKnown: runState.knownPersonIdentifiers.includes(presentPerson.personIdentifier),
      silhouetteName: readPersonDefinition(context, presentPerson.personIdentifier).silhouetteName,
      presenceText: prepareVisibleText(presentPerson.presenceText),
    })),
    perceivedPointsOfInterest: node.perceivedPointsOfInterest.map((pointOfInterest) => ({ ...pointOfInterest })),
    suggestedActions: listVisibleActions(context.index, progressionState).map((action) => ({
      identifier: action.actionIdentifier,
      visibleText: prepareVisibleText(action.visibleText),
      resourceCost: action.resourceCost,
      actionGroupName: action.actionGroupName,
      hasBeenAttemptedBefore: runState.witnessedOriginIdentifiers.includes(action.actionIdentifier),
    })),
    openInteractivePieceIdentifiers: listAttemptablePieceIdentifiers(context.index, progressionState),
  }
}

function composeConfirmedEffects(startState: DemoRunState, workingState: DemoRunState, turnDraft: TurnDraft): ConfirmedEffect[] {
  const confirmedEffects: ConfirmedEffect[] = []
  if (turnDraft.elapsedMinutes > 0) {
    confirmedEffects.push({
      kind: 'world_clock_advanced',
      elapsedMinutes: turnDraft.elapsedMinutes,
      resultingWorldClockMinutes: workingState.worldClockMinutes,
    })
  }
  if (workingState.placeName !== startState.placeName) {
    confirmedEffects.push({ kind: 'place_changed', resultingPlaceName: workingState.placeName })
  }
  confirmedEffects.push(...turnDraft.orderedEffects)
  if (turnDraft.shouldUpdateJournal) {
    confirmedEffects.push({ kind: 'journal_updated' })
  }
  return confirmedEffects
}

function appendEntropySignalIfDue(
  context: DemoEngineContext,
  workingState: DemoRunState,
  turnDraft: TurnDraft,
  resultingStateVersion: number,
) {
  if (turnDraft.archiveOutcome) {
    return
  }
  const dueSignal = context.index.tree.entropySignals.find(
    (entropySignal) =>
      resultingStateVersion >= entropySignal.minimumStateVersion &&
      !workingState.livedExperienceFlagNames.includes(entropySignal.signalFlagName),
  )
  if (!dueSignal) {
    return
  }
  appendNarrationParagraph(turnDraft, prepareScriptedText(context, workingState, dueSignal.markedParagraph))
  workingState.livedExperienceFlagNames = [...workingState.livedExperienceFlagNames, dueSignal.signalFlagName]
  turnDraft.grantedLivedExperienceFlagNames.push(dueSignal.signalFlagName)
}

function composeConfirmedTurn(
  context: DemoEngineContext,
  startState: DemoRunState,
  workingState: DemoRunState,
  turnDraft: TurnDraft,
  turnFrame: {
    actionKey: string
    investigatorEntry: InvestigatorEntryContent
    planStepDispositions: PlanStepDisposition[]
    planContinuationQuestion: DirectorQuestionEntryContent | null
  },
): ConfirmedArchiveTurn {
  const resultingStateVersion = startState.stateVersion + 1
  appendEntropySignalIfDue(context, workingState, turnDraft, resultingStateVersion)
  workingState.stateVersion = resultingStateVersion
  return {
    turnIdentifier: `portfolio_demo_turn_${resultingStateVersion}`,
    actionKey: turnFrame.actionKey,
    resultingStateVersion,
    witnessedOriginIdentifiers: turnDraft.witnessedOriginIdentifiers,
    investigatorEntry: turnFrame.investigatorEntry,
    directorEntries: turnDraft.directorEntries,
    heardLines: readHeardLineSentences(turnDraft.directorEntries, workingState.placeName, workingState.worldClockMinutes).map(
      (heardLine) => context.personalizeVisibleText(heardLine),
    ),
    planStepDispositions: turnFrame.planStepDispositions,
    planContinuationQuestion: turnDraft.archiveOutcome ? null : turnFrame.planContinuationQuestion,
    resourceCosts: turnDraft.resourceCosts,
    confirmedEffects: composeConfirmedEffects(startState, workingState, turnDraft),
    relationshipChanges: turnDraft.relationshipChanges,
    stagingEvents: turnDraft.stagingEvents,
    presentedInteractivePieces: turnDraft.presentedInteractivePieces,
    interactivePieceStatusChanges: turnDraft.interactivePieceStatusChanges,
    grantedLivedExperienceFlagNames: turnDraft.grantedLivedExperienceFlagNames,
    completedObjectiveTexts: readCompletedObjectiveTexts(context, workingState.livedExperienceFlagNames),
    nextScenePresentation: turnDraft.archiveOutcome ? null : createDemoScenePresentation(context, workingState),
    archiveOutcome: turnDraft.archiveOutcome,
  }
}

function cloneRunState(runState: DemoRunState): DemoRunState {
  return structuredClone(runState)
}

export function openDemoArchive(context: DemoEngineContext): {
  openingResolution: ArchiveOpeningResolution
  runState: DemoRunState
} {
  const { tree } = context.index
  const progressionState = createInitialProgressionState(tree)
  const firstNode = readProgressionNode(context.index, progressionState)
  const relationshipLevelByKey: Record<string, number> = {}
  for (const person of tree.persons) {
    relationshipLevelByKey[createRelationshipLevelKey(person.personIdentifier, 'from_investigator')] =
      person.initialLevelFromInvestigator
    relationshipLevelByKey[createRelationshipLevelKey(person.personIdentifier, 'toward_investigator_as_perceived')] =
      person.initialLevelTowardInvestigator
  }
  const runState: DemoRunState = {
    ...progressionState,
    stateVersion: 0,
    worldClockMinutes: tree.initialState.worldClockMinutes,
    placeName: firstNode.placeName,
    operationalFunds: tree.initialState.operationalFunds,
    belongingUnits: { ...tree.initialState.belongingUnits },
    seriousWoundCount: 0,
    lastSeriousWoundCauseText: null,
    knownPersonIdentifiers: [],
    relationshipLevelByKey,
    activeConditions: [],
    witnessedOriginIdentifiers: [],
    visitedPlaceNames: [firstNode.placeName],
    revealedFacts: [],
    failedAttemptCountByPieceIdentifier: {},
    issuedRelationshipChangeCount: 0,
  }
  const directionNames: RelationshipDirectionName[] = ['from_investigator', 'toward_investigator_as_perceived']
  const initialRelationshipLevels: ConfirmedRelationshipChange[] = tree.persons
    .filter((person) => person.isRelationshipEstablishedAtOpening)
    .flatMap((person) =>
      directionNames.map((directionName) => ({
        identifier: `portfolio_demo_initial_relationship_${person.personIdentifier}_${directionName}`,
        personIdentifier: person.personIdentifier,
        personVisibleName: person.aliasBeforeNameIsKnown,
        personSilhouetteName: person.silhouetteName,
        directionName,
        dimensionName: null,
        levelChange: 0,
        resultingLevel: relationshipLevelByKey[createRelationshipLevelKey(person.personIdentifier, directionName)],
        perceptibleCauseText: person.openingRelationshipCauseText ?? '',
        fictionalDateLabel: tree.fictionalDateLabel,
      })),
    )
  return {
    runState,
    openingResolution: {
      archiveCaseIdentifier: tree.archiveCaseIdentifier,
      openingEntries: [{ voice: 'director_narration', markedParagraphs: [...tree.openingNarrationParagraphs] }],
      firstScenePresentation: createDemoScenePresentation(context, runState),
      initialRelationshipLevels,
      archiveTitle: tree.archiveTitle,
      archiveNumberLabel: tree.archiveNumberLabel,
      worldClockMinutes: runState.worldClockMinutes,
      operationalFunds: runState.operationalFunds,
      belongingUnits: { ...runState.belongingUnits },
      seriousWoundCount: runState.seriousWoundCount,
      belongingDefinitions: tree.belongingDefinitions.map((belongingDefinition) => ({ ...belongingDefinition })),
    },
  }
}

function findActionForPlanStep(
  context: DemoEngineContext,
  runState: DemoRunState,
  planStep: PlannedActionStep,
): DemoActionDefinition | null {
  const visibleActions = listVisibleActions(context.index, readProgressionState(runState))
  const actionByOrigin = visibleActions.find((action) => action.actionIdentifier === planStep.originSuggestedActionIdentifier)
  if (actionByOrigin) {
    return actionByOrigin
  }
  const matchedActionIdentifier = findBestMatchingIntent(
    planStep.actionText,
    visibleActions.map((action) => ({
      candidateIdentifier: action.actionIdentifier,
      patternSources: action.freeTextIntentPatternSources,
    })),
  )
  return visibleActions.find((action) => action.actionIdentifier === matchedActionIdentifier) ?? null
}

function readCompositionOriginName(planStep: PlannedActionStep): InvestigatorEntryStep['compositionOriginName'] {
  if (planStep.originSuggestedActionIdentifier === null) {
    return 'own_words'
  }
  return planStep.wasTextEditedByPlayer ? 'edited_suggestion' : 'suggested_action'
}

function createSingleAnswerQuestion(
  questionKindName: DirectorQuestionEntryContent['questionKindName'],
  plainParagraphs: string[],
  answerOptions: DirectorQuestionEntryContent['answerOptions'],
): DirectorQuestionEntryContent {
  return { voice: 'director_question', questionKindName, plainParagraphs, answerOptions, answeredOptionIdentifier: null }
}

export function resolveDemoInvestigatorAction(
  context: DemoEngineContext,
  runState: DemoRunState,
  actionRequest: InvestigatorActionRequest,
): DemoTurnResult {
  if (
    runState.closedWithEndingIdentifier !== null ||
    actionRequest.expectedStateVersion !== runState.stateVersion ||
    actionRequest.remainingPlanSteps.length === 0
  ) {
    return { resolution: { dispositionName: 'service_failed', isRetryPossible: false }, runState }
  }
  const createEntryStep = (planStep: PlannedActionStep, planStepIndex: number): InvestigatorEntryStep => ({
    stepNumber: actionRequest.alreadyExecutedStepCount + planStepIndex + 1,
    actionText: planStep.actionText,
    conditionText: planStep.conditionText,
    compositionOriginName: readCompositionOriginName(planStep),
  })
  const declaredPlanStepCount = Math.max(actionRequest.declaredPlanStepCount, actionRequest.remainingPlanSteps.length)
  const firstPlanStep = actionRequest.remainingPlanSteps[0]
  if (findActionForPlanStep(context, runState, firstPlanStep) === null) {
    return {
      runState,
      resolution: {
        dispositionName: 'question_asked',
        investigatorEntry: {
          voice: 'investigator_entry',
          attemptedSteps: [createEntryStep(firstPlanStep, 0)],
          declaredPlanStepCount: declaredPlanStepCount > 1 ? declaredPlanStepCount : null,
        },
        questionEntry: createSingleAnswerQuestion('method_clarification', [...portfolioDemoCopy.actionOutsideTreeParagraphs], [
          {
            identifier: 'return_to_reply_desk',
            visibleText: portfolioDemoCopy.returnToReplyDeskAnswer,
            answerEffectName: 'return_to_reply_desk',
          },
        ]),
      },
    }
  }

  const workingState = cloneRunState(runState)
  const turnDraft = createTurnDraft()
  const dispositionNames: PlanStepDisposition['dispositionName'][] = actionRequest.remainingPlanSteps.map(() => 'left_pending')
  let executedStepCount = 0
  for (let planStepIndex = 0; planStepIndex < actionRequest.remainingPlanSteps.length; planStepIndex += 1) {
    const isBatchClosed =
      executedStepCount >= maximumPlanStepsExecutedPerDirectorBatch ||
      turnDraft.hasSceneChanged ||
      turnDraft.archiveOutcome !== null
    if (isBatchClosed) {
      break
    }
    const planStep = actionRequest.remainingPlanSteps[planStepIndex]
    const matchedAction = findActionForPlanStep(context, workingState, planStep)
    if (!matchedAction) {
      break
    }
    const quotedActionText = sanitizeQuotedPlayerText(planStep.actionText)
    if (!canAffordResourceCost(workingState, matchedAction.resourceCost)) {
      appendNarrationParagraph(turnDraft, lighthouseCaseDirectorCopy.unaffordableCostParagraph(quotedActionText))
      dispositionNames[planStepIndex] = 'skipped_because_condition_was_unmet'
      continue
    }
    if (planStep.conditionText !== null && planStep.conditionText.trim() !== '') {
      appendNarrationParagraph(
        turnDraft,
        lighthouseCaseDirectorCopy.unrecognizedConditionParagraph(sanitizeQuotedPlayerText(planStep.conditionText)),
      )
    }
    if (planStep.wasTextEditedByPlayer) {
      appendDemonstrationNotice(turnDraft, lighthouseCaseDirectorCopy.editedSuggestionNotice)
    }
    if (matchedAction.resourceCost) {
      applyResourceCost(workingState, turnDraft, matchedAction.resourceCost)
    }
    applyOutcome(
      context,
      workingState,
      turnDraft,
      { kind: 'action', actionIdentifier: matchedAction.actionIdentifier },
      chooseActionOutcome(matchedAction, readProgressionState(workingState)),
    )
    dispositionNames[planStepIndex] = 'executed'
    executedStepCount += 1
  }

  const planStepDispositions: PlanStepDisposition[] = actionRequest.remainingPlanSteps.map((planStep, planStepIndex) => ({
    stepIdentifier: planStep.stepIdentifier,
    dispositionName: dispositionNames[planStepIndex],
  }))
  const pendingPlanSteps = actionRequest.remainingPlanSteps.filter(
    (_planStep, planStepIndex) => dispositionNames[planStepIndex] === 'left_pending',
  )
  const planContinuationQuestion =
    pendingPlanSteps.length > 0
      ? createSingleAnswerQuestion(
          'plan_continuation',
          lighthouseCaseDirectorCopy.planContinuationParagraphs(
            dispositionNames.filter((dispositionName) => dispositionName === 'executed').length,
            dispositionNames.filter((dispositionName) => dispositionName === 'skipped_because_condition_was_unmet').length,
            pendingPlanSteps.length,
            sanitizeQuotedPlayerText(pendingPlanSteps[0].actionText),
          ),
          [
            {
              identifier: 'continue_pending_plan',
              visibleText: lighthouseCaseDirectorCopy.continuePlanAnswer,
              answerEffectName: 'continue_pending_plan',
            },
            {
              identifier: 'modify_pending_plan',
              visibleText: lighthouseCaseDirectorCopy.modifyPlanAnswer,
              answerEffectName: 'modify_pending_plan',
            },
            {
              identifier: 'discard_pending_plan',
              visibleText: lighthouseCaseDirectorCopy.discardPlanAnswer,
              answerEffectName: 'discard_pending_plan',
            },
          ],
        )
      : null
  const attemptedSteps = actionRequest.remainingPlanSteps
    .map((planStep, planStepIndex) => ({ planStep, planStepIndex }))
    .filter(({ planStepIndex }) => dispositionNames[planStepIndex] !== 'left_pending')
    .map(({ planStep, planStepIndex }) => createEntryStep(planStep, planStepIndex))
  const confirmedTurn = composeConfirmedTurn(context, runState, workingState, turnDraft, {
    actionKey: actionRequest.actionKey,
    investigatorEntry: {
      voice: 'investigator_entry',
      attemptedSteps,
      declaredPlanStepCount: declaredPlanStepCount > 1 ? declaredPlanStepCount : null,
    },
    planStepDispositions,
    planContinuationQuestion,
  })
  return { resolution: { dispositionName: 'resolved', confirmedTurn }, runState: workingState }
}

function describeSubmittedValue(piece: DemoInteractivePieceDefinition, submittedValue: InteractivePieceSubmittedValue): string {
  const attemptCopy = lighthouseCaseDirectorCopy.attemptActionTextByWidgetKindName
  if (submittedValue.widgetKindName === 'combination_dials') {
    return attemptCopy.combination_dials(submittedValue.chosenSymbols)
  }
  if (submittedValue.widgetKindName === 'cipher_wheel') {
    return attemptCopy.cipher_wheel(submittedValue.shiftPositions)
  }
  const { publicState } = piece.publicDefinition
  const visibleNameByPieceIdentifier = new Map(
    publicState.widgetKindName === 'ordered_positions'
      ? publicState.pieces.map((orderedPiece) => [orderedPiece.pieceIdentifier, orderedPiece.visibleName])
      : [],
  )
  return attemptCopy.ordered_positions(
    submittedValue.orderedPieceIdentifiers.map((pieceIdentifier) => visibleNameByPieceIdentifier.get(pieceIdentifier) ?? pieceIdentifier),
  )
}

export function resolveDemoInteractivePieceAttempt(
  context: DemoEngineContext,
  runState: DemoRunState,
  attemptRequest: InteractivePieceAttemptRequest,
): DemoAttemptResult {
  if (runState.closedWithEndingIdentifier !== null) {
    return { wasAdjudicated: false, rejectionReasonName: 'archive_already_closed' }
  }
  if (attemptRequest.expectedStateVersion !== runState.stateVersion) {
    return { wasAdjudicated: false, rejectionReasonName: 'state_version_mismatch' }
  }
  const piece = context.index.pieceByIdentifier.get(attemptRequest.interactivePieceIdentifier)
  if (!piece) {
    return { wasAdjudicated: false, rejectionReasonName: 'piece_unknown' }
  }
  if (
    !runState.presentedPieceIdentifiers.includes(attemptRequest.interactivePieceIdentifier) ||
    runState.solvedPieceIdentifiers.includes(attemptRequest.interactivePieceIdentifier)
  ) {
    return { wasAdjudicated: false, rejectionReasonName: 'piece_not_open_to_attempts' }
  }
  if (!isSubmittedValueUsable(piece, attemptRequest.submittedValue)) {
    return { wasAdjudicated: false, rejectionReasonName: 'submitted_value_unusable' }
  }
  const workingState = cloneRunState(runState)
  const turnDraft = createTurnDraft()
  const solvedOutcome = readPieceSolvedOutcome(context.index, readProgressionState(workingState), attemptRequest.interactivePieceIdentifier)
  const violatedVisibleRuleTexts = solvedOutcome
    ? findViolatedVisibleRuleTexts(piece, attemptRequest.submittedValue)
    : [lighthouseCaseDirectorCopy.pieceOutOfReachRuleText]
  const wasAccepted = violatedVisibleRuleTexts.length === 0
  if (solvedOutcome) {
    advanceWorldClock(workingState, turnDraft, piece.publicDefinition.attemptElapsedMinutes)
  }
  if (wasAccepted && solvedOutcome) {
    const revealedFact: RevealedFact = {
      factIdentifier:
        solvedOutcome.grantedLivedExperienceFlagNames[0] ?? `piece_${attemptRequest.interactivePieceIdentifier}_resolved`,
      visibleName: piece.publicDefinition.visibleTitle,
      sourcePieceIdentifier: attemptRequest.interactivePieceIdentifier,
    }
    if (!workingState.revealedFacts.some((knownFact) => knownFact.factIdentifier === revealedFact.factIdentifier)) {
      workingState.revealedFacts.push(revealedFact)
      turnDraft.orderedEffects.push({ kind: 'knowledge_gained', ...revealedFact })
    }
    turnDraft.interactivePieceStatusChanges.push({
      interactivePieceIdentifier: attemptRequest.interactivePieceIdentifier,
      resultingLifecycleStatusName: 'resolved',
      brokenReasonPublicText: null,
    })
    applyOutcome(
      context,
      workingState,
      turnDraft,
      { kind: 'interactive_piece', interactivePieceIdentifier: attemptRequest.interactivePieceIdentifier },
      solvedOutcome,
    )
  } else if (solvedOutcome) {
    const failedAttemptCount = workingState.failedAttemptCountByPieceIdentifier[attemptRequest.interactivePieceIdentifier] ?? 0
    const failedNarrations = piece.failedAttemptNarrationParagraphs
    appendNarrationParagraph(
      turnDraft,
      prepareScriptedText(context, workingState, failedNarrations[failedAttemptCount % failedNarrations.length]),
    )
    workingState.failedAttemptCountByPieceIdentifier[attemptRequest.interactivePieceIdentifier] = failedAttemptCount + 1
  } else {
    appendNarrationParagraph(turnDraft, lighthouseCaseDirectorCopy.pieceOutOfReachParagraph)
  }
  const confirmedTurn = composeConfirmedTurn(context, runState, workingState, turnDraft, {
    actionKey: attemptRequest.actionKey,
    investigatorEntry: {
      voice: 'investigator_entry',
      attemptedSteps: [
        {
          stepNumber: 1,
          actionText: describeSubmittedValue(piece, attemptRequest.submittedValue),
          conditionText: null,
          compositionOriginName: 'interactive_piece_attempt',
        },
      ],
      declaredPlanStepCount: null,
    },
    planStepDispositions: [],
    planContinuationQuestion: null,
  })
  return {
    wasAdjudicated: true,
    runState: workingState,
    resolution: {
      interactivePieceIdentifier: attemptRequest.interactivePieceIdentifier,
      attemptRecord: {
        attemptIdentifier: `portfolio_demo_attempt_${confirmedTurn.resultingStateVersion}`,
        turnIdentifier: confirmedTurn.turnIdentifier,
        submittedValue: attemptRequest.submittedValue,
        wasAccepted,
        violatedVisibleRuleTexts,
      },
      confirmedTurn,
    },
  }
}

export function readDemoInteractivePieceAssistance(
  context: DemoEngineContext,
  runState: DemoRunState,
  assistanceRequest: InteractivePieceAssistanceRequest,
): InteractivePieceAssistanceRecord | null {
  const piece = context.index.pieceByIdentifier.get(assistanceRequest.interactivePieceIdentifier)
  if (
    !piece ||
    runState.closedWithEndingIdentifier !== null ||
    !runState.presentedPieceIdentifiers.includes(assistanceRequest.interactivePieceIdentifier) ||
    runState.solvedPieceIdentifiers.includes(assistanceRequest.interactivePieceIdentifier)
  ) {
    return null
  }
  return {
    levelName: assistanceRequest.requestedLevelName,
    publicHintText: piece.assistanceHintTextByLevelName[assistanceRequest.requestedLevelName],
  }
}

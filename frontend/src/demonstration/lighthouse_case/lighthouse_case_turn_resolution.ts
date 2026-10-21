import type { ArchiveRunState } from '../../game_state/archive_run_state'
import { readHeardLineSentences } from '../../game_state/heard_lines'
import { maximumPlanStepsExecutedPerDirectorBatch } from '../../game_state/archive_turn_contract'
import type {
  ArchiveOpeningResolution,
  ArchiveOutcome,
  ArchiveScenePresentation,
  AssistanceLevelName,
  BelongingIdentifier,
  ConfirmedArchiveTurn,
  ConfirmedEffect,
  ConfirmedRelationshipChange,
  DirectorQuestionEntryContent,
  DirectorSpokenEntryContent,
  DirectorTurnResolution,
  InteractivePieceAssistanceRecord,
  InteractivePieceAttemptRequest,
  InteractivePieceAttemptResolution,
  InteractivePieceLifecycleStatusName,
  InteractivePiecePublicDefinition,
  InteractivePieceStatusChange,
  InteractivePieceSubmittedValue,
  InvestigatorActionRequest,
  InvestigatorCompositionOriginName,
  InvestigatorEntryContent,
  InvestigatorEntryStep,
  PlanStepDisposition,
  PlannedActionStep,
  ResourceCost,
  ServiceStagingEvent,
} from '../../game_state/archive_turn_contract'
import type { InvestigatorState } from '../../game_state/chronicle_state'
import { demonstrationArchive } from '../demonstration_case_script'
import {
  classifyPlanCondition,
  doesFreeTextMatchAnyPattern,
  findBestMatchingIntent,
  findMentionOfObjectNeverCarried,
  isActionTextWithoutMethod,
  isPreparationText,
  sanitizeQuotedPlayerText,
  splitFreeTextIntoPlanSegments,
} from '../demonstration_free_text_intent_matcher'
import { lighthouseCaseDirectorCopy } from './lighthouse_case_director_copy'
import {
  chooseDawnEndingIdentifier,
  createLighthouseArchiveEndedAliveOutcome,
  createOriginClosingEntry,
  lighthouseCaseEndings,
} from './lighthouse_case_endings'
import { lighthouseCaseInteractivePieces } from './lighthouse_case_interactive_pieces'
import {
  boatmanPersonIdentifier,
  lighthouseCaseFictionalDateLabel,
  lighthouseCaseFlagNames,
  lighthouseCasePersons,
  lighthouseCaseSceneIdentifiers,
  renataPersonIdentifier,
} from './lighthouse_case_persons'
import {
  assistanceTextsByPieceIdentifier,
  failedAttemptNarrationByPieceIdentifier,
  findViolatedVisibleRuleTexts,
  proseSolutionPatternSourcesByPieceIdentifier,
} from './lighthouse_case_private_solutions'
import { dawnArchiveEndingRequestIdentifier } from './lighthouse_case_scene_dawn'
import {
  createSolvedInteractivePieceOriginIdentifier,
  interactivePieceLifecycleStatusNamesOpenToAttempts,
  lighthouseCaseDawnWorldClockMinutes,
  lighthouseCaseEntropySignalStateVersions,
  lighthouseCaseFirstSceneIdentifier,
  lighthouseCaseLastSpareTimeWorldClockMinutes,
  lighthouseCaseScenes,
  readActionBranchesOfScene,
  resolutionFlagNames,
} from './lighthouse_case_script'
import type {
  BranchCondition,
  CaseActionBranch,
  CaseBranchOutcome,
  CaseSceneDefinition,
  ScriptedDirectorEntry,
} from './lighthouse_case_script_types'

export type DirectorCaseSnapshot = {
  archiveRun: ArchiveRunState
  investigator: InvestigatorState
  relationalAnchorPersonName: string | null
  personalizeText: (narrativeText: string) => string
}

type WorkingCaseState = {
  sceneIdentifier: string
  placeName: string
  worldClockMinutes: number
  operationalFunds: number
  belongingUnits: Record<BelongingIdentifier, number>
  seriousWoundCount: number
  livedExperienceFlagNames: Set<string>
  activeConditionIdentifiers: Set<string>
  knownPersonIdentifiers: Set<string>
  witnessedOriginIdentifiers: Set<string>
  interactivePieceStatusByIdentifier: Map<string, InteractivePieceLifecycleStatusName>
  relationshipLevelByKey: Map<string, number>
}

type TurnDraft = {
  directorEntries: DirectorSpokenEntryContent[]
  elapsedMinutes: number
  resourceCosts: ResourceCost[]
  orderedEffects: ConfirmedEffect[]
  shouldUpdateJournal: boolean
  relationshipChanges: ConfirmedRelationshipChange[]
  stagingEvents: ServiceStagingEvent[]
  presentedInteractivePieces: InteractivePiecePublicDefinition[]
  interactivePieceStatusChanges: InteractivePieceStatusChange[]
  grantedLivedExperienceFlagNames: string[]
  witnessedOriginIdentifiers: string[]
  archiveOutcome: ArchiveOutcome | null
  hasSceneChanged: boolean
}

type ExecutableUnit = {
  planStepIndex: number
  actionText: string
  conditionText: string | null
  branchIdentifier: string | null
  compositionOriginName: InvestigatorCompositionOriginName
  wasSuggestionEditedByPlayer: boolean
}

type UnitDispositionName = 'executed' | 'skipped' | 'pending'

function createRelationshipLevelKey(personIdentifier: string, directionName: ConfirmedRelationshipChange['directionName']): string {
  return `${personIdentifier}:${directionName}`
}

function createWorkingCaseState(caseSnapshot: DirectorCaseSnapshot): WorkingCaseState {
  const { archiveRun, investigator } = caseSnapshot
  const relationshipLevelByKey = new Map<string, number>()
  for (const relationshipChange of archiveRun.relationshipChanges) {
    relationshipLevelByKey.set(
      createRelationshipLevelKey(relationshipChange.personIdentifier, relationshipChange.directionName),
      relationshipChange.resultingLevel,
    )
  }
  return {
    sceneIdentifier: archiveRun.currentScenePresentation?.sceneIdentifier ?? lighthouseCaseFirstSceneIdentifier,
    placeName: investigator.placeName,
    worldClockMinutes: investigator.worldClockMinutes,
    operationalFunds: investigator.operationalFunds,
    belongingUnits: { ...investigator.belongingUnits },
    seriousWoundCount: investigator.seriousWoundsSuffered,
    livedExperienceFlagNames: new Set(archiveRun.livedExperienceFlagNames),
    activeConditionIdentifiers: new Set(archiveRun.activeConditions.map((activeCondition) => activeCondition.conditionIdentifier)),
    knownPersonIdentifiers: new Set(archiveRun.knownPersonIdentifiers),
    witnessedOriginIdentifiers: new Set(archiveRun.witnessedOrigins.map((witnessedOrigin) => witnessedOrigin.originIdentifier)),
    interactivePieceStatusByIdentifier: new Map(
      Object.values(archiveRun.interactivePieceRuntimeStates).map((runtimeState) => [
        runtimeState.interactivePieceIdentifier,
        runtimeState.lifecycleStatusName,
      ]),
    ),
    relationshipLevelByKey,
  }
}

function createTurnDraft(): TurnDraft {
  return {
    directorEntries: [],
    elapsedMinutes: 0,
    resourceCosts: [],
    orderedEffects: [],
    shouldUpdateJournal: false,
    relationshipChanges: [],
    stagingEvents: [],
    presentedInteractivePieces: [],
    interactivePieceStatusChanges: [],
    grantedLivedExperienceFlagNames: [],
    witnessedOriginIdentifiers: [],
    archiveOutcome: null,
    hasSceneChanged: false,
  }
}

function readRelationshipLevel(
  workingState: WorkingCaseState,
  personIdentifier: string,
  directionName: ConfirmedRelationshipChange['directionName'],
): number {
  const recordedLevel = workingState.relationshipLevelByKey.get(createRelationshipLevelKey(personIdentifier, directionName))
  if (recordedLevel !== undefined) {
    return recordedLevel
  }
  const personDefinition = lighthouseCasePersons[personIdentifier]
  if (!personDefinition) {
    return 0
  }
  return directionName === 'from_investigator'
    ? personDefinition.initialLevelFromInvestigator
    : personDefinition.initialLevelTowardInvestigator
}

function isBranchConditionMet(branchCondition: BranchCondition | null, workingState: WorkingCaseState): boolean {
  if (!branchCondition) {
    return true
  }
  return (
    branchCondition.requiredLivedExperienceFlagNames.every((flagName) => workingState.livedExperienceFlagNames.has(flagName)) &&
    branchCondition.forbiddenLivedExperienceFlagNames.every((flagName) => !workingState.livedExperienceFlagNames.has(flagName)) &&
    branchCondition.requiredInteractivePieceStatuses.every(
      (requiredStatus) =>
        workingState.interactivePieceStatusByIdentifier.get(requiredStatus.interactivePieceIdentifier) ===
        requiredStatus.lifecycleStatusName,
    ) &&
    branchCondition.minimumRelationshipLevels.every(
      (minimumRelationshipLevel) =>
        readRelationshipLevel(workingState, minimumRelationshipLevel.personIdentifier, minimumRelationshipLevel.directionName) >=
        minimumRelationshipLevel.minimumLevel,
    ) &&
    branchCondition.requiredActiveConditionIdentifiers.every((conditionIdentifier) =>
      workingState.activeConditionIdentifiers.has(conditionIdentifier),
    ) &&
    workingState.seriousWoundCount >= branchCondition.minimumSeriousWoundCount
  )
}

function readCurrentScene(workingState: WorkingCaseState): CaseSceneDefinition {
  return lighthouseCaseScenes[workingState.sceneIdentifier] ?? lighthouseCaseScenes[lighthouseCaseFirstSceneIdentifier]
}

function hasArchiveReachedResolution(workingState: WorkingCaseState): boolean {
  return resolutionFlagNames.some((flagName) => workingState.livedExperienceFlagNames.has(flagName))
}

function readReachableBranches(workingState: WorkingCaseState): CaseActionBranch[] {
  return readActionBranchesOfScene(readCurrentScene(workingState)).filter((actionBranch) =>
    isBranchConditionMet(actionBranch.visibilityCondition, workingState),
  )
}

const suggestedActionGroupNamesInOfferOrder: readonly CaseActionBranch['actionGroupName'][] = [
  'speak',
  'examine',
  'use_or_spend',
  'move',
  'withdraw',
]

function readSuggestedBranches(workingState: WorkingCaseState): CaseActionBranch[] {
  return readReachableBranches(workingState)
    .filter(
      (actionBranch) => actionBranch.isRepeatable || !workingState.witnessedOriginIdentifiers.has(actionBranch.branchIdentifier),
    )
    .map((actionBranch, branchIndex) => ({ actionBranch, branchIndex }))
    .sort(
      (firstBranch, secondBranch) =>
        suggestedActionGroupNamesInOfferOrder.indexOf(firstBranch.actionBranch.actionGroupName) -
          suggestedActionGroupNamesInOfferOrder.indexOf(secondBranch.actionBranch.actionGroupName) ||
        firstBranch.branchIndex - secondBranch.branchIndex,
    )
    .map((orderedBranch) => orderedBranch.actionBranch)
}

function concealUnknownRenataName(narrativeText: string, workingState: WorkingCaseState): string {
  if (workingState.knownPersonIdentifiers.has(renataPersonIdentifier)) {
    return narrativeText
  }
  return narrativeText.replace(/Renata Oquendo|Renata/g, (_matchedName, matchIndex: number) => {
    const precedingText = narrativeText.slice(0, matchIndex).trimEnd()
    const isAtSentenceStart = precedingText.length === 0 || /[.!?…»«¡¿:]$/.test(precedingText)
    return isAtSentenceStart
      ? lighthouseCaseDirectorCopy.unknownRenataNameAtSentenceStart
      : lighthouseCaseDirectorCopy.unknownRenataNameInsideSentence
  })
}

function prepareScriptedText(scriptedText: string, workingState: WorkingCaseState, caseSnapshot: DirectorCaseSnapshot): string {
  const lostVoiceText =
    caseSnapshot.relationalAnchorPersonName !== null
      ? lighthouseCaseDirectorCopy.lostVoiceOfAnchorPerson
      : lighthouseCaseDirectorCopy.lostVoiceOfUprootedInvestigator
  return concealUnknownRenataName(scriptedText.replaceAll('{{voz_perdida}}', lostVoiceText), workingState)
}

function readPersonVisibleName(personIdentifier: string, workingState: WorkingCaseState): string {
  const personDefinition = lighthouseCasePersons[personIdentifier]
  if (!personDefinition) {
    return ''
  }
  return workingState.knownPersonIdentifiers.has(personIdentifier)
    ? personDefinition.knownName
    : personDefinition.aliasBeforeNameIsKnown
}

function createDirectorSpokenEntry(
  scriptedEntry: ScriptedDirectorEntry,
  workingState: WorkingCaseState,
  caseSnapshot: DirectorCaseSnapshot,
): DirectorSpokenEntryContent {
  const markedParagraphs = scriptedEntry.markedParagraphs.map((markedParagraph) =>
    prepareScriptedText(markedParagraph, workingState, caseSnapshot),
  )
  if (scriptedEntry.voice === 'character_dialogue') {
    return {
      voice: 'character_dialogue',
      speakerPersonIdentifier: scriptedEntry.speakerPersonIdentifier,
      speakerVisibleName: readPersonVisibleName(scriptedEntry.speakerPersonIdentifier, workingState),
      speakerSilhouetteName: lighthouseCasePersons[scriptedEntry.speakerPersonIdentifier]?.silhouetteName ?? 'close_figure',
      deliveryName: scriptedEntry.deliveryName,
      markedParagraphs,
    }
  }
  if (scriptedEntry.voice === 'inner_thought') {
    return { voice: 'inner_thought', thoughtOriginName: scriptedEntry.thoughtOriginName, markedParagraphs }
  }
  return { voice: 'director_narration', markedParagraphs }
}

function appendNarrationParagraph(turnDraft: TurnDraft, narrationParagraph: string) {
  turnDraft.directorEntries.push({ voice: 'director_narration', markedParagraphs: [narrationParagraph] })
}

function canAffordResourceCost(resourceCost: ResourceCost | null, workingState: WorkingCaseState): boolean {
  if (!resourceCost) {
    return true
  }
  return resourceCost.kind === 'operational_funds'
    ? workingState.operationalFunds >= resourceCost.amount
    : workingState.belongingUnits[resourceCost.belongingIdentifier] >= resourceCost.units
}

function applyResourceCost(resourceCost: ResourceCost, workingState: WorkingCaseState, turnDraft: TurnDraft) {
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
  workingState.belongingUnits[resourceCost.belongingIdentifier] -= resourceCost.units
  turnDraft.orderedEffects.push({
    kind: 'belonging_units_consumed',
    belongingIdentifier: resourceCost.belongingIdentifier,
    units: resourceCost.units,
    resultingUnits: workingState.belongingUnits[resourceCost.belongingIdentifier],
  })
}

function applyOutcome(
  outcome: CaseBranchOutcome,
  originIdentifier: string | null,
  workingState: WorkingCaseState,
  turnDraft: TurnDraft,
  caseSnapshot: DirectorCaseSnapshot,
) {
  for (const personIdentifier of outcome.personIdentifiersBecomingKnown) {
    if (!workingState.knownPersonIdentifiers.has(personIdentifier)) {
      workingState.knownPersonIdentifiers.add(personIdentifier)
      turnDraft.orderedEffects.push({
        kind: 'person_became_known',
        personIdentifier,
        visibleName: lighthouseCasePersons[personIdentifier]?.knownName ?? '',
      })
    }
  }
  const firstEntryIndexOfOutcome = turnDraft.directorEntries.length
  for (const scriptedEntry of outcome.directorEntries) {
    turnDraft.directorEntries.push(createDirectorSpokenEntry(scriptedEntry, workingState, caseSnapshot))
  }
  let elapsedMinutes = outcome.elapsedMinutes
  if (outcome.nextSceneIdentifier === lighthouseCaseSceneIdentifiers.dawnPier) {
    elapsedMinutes = Math.max(elapsedMinutes, lighthouseCaseDawnWorldClockMinutes - workingState.worldClockMinutes)
  }
  workingState.worldClockMinutes += elapsedMinutes
  turnDraft.elapsedMinutes += elapsedMinutes
  if (outcome.newPlaceName) {
    workingState.placeName = outcome.newPlaceName
  }
  if (outcome.seriousWoundCauseText) {
    workingState.seriousWoundCount = Math.min(5, workingState.seriousWoundCount + 1)
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
    workingState.activeConditionIdentifiers.add(gainedCondition.conditionIdentifier)
    turnDraft.orderedEffects.push({ kind: 'condition_gained', condition: gainedCondition })
  }
  for (const endedConditionIdentifier of outcome.conditionIdentifiersEnded) {
    if (workingState.activeConditionIdentifiers.delete(endedConditionIdentifier)) {
      const endedCondition = caseSnapshot.archiveRun.activeConditions.find(
        (activeCondition) => activeCondition.conditionIdentifier === endedConditionIdentifier,
      )
      turnDraft.orderedEffects.push({
        kind: 'condition_ended',
        conditionIdentifier: endedConditionIdentifier,
        visibleName: endedCondition?.visibleName ?? '',
      })
    }
  }
  for (const scriptedChange of outcome.relationshipChanges) {
    const personDefinition = lighthouseCasePersons[scriptedChange.personIdentifier]
    if (!personDefinition) {
      continue
    }
    const resultingLevel = Math.max(
      0,
      readRelationshipLevel(workingState, scriptedChange.personIdentifier, scriptedChange.directionName) + scriptedChange.levelChange,
    )
    workingState.relationshipLevelByKey.set(
      createRelationshipLevelKey(scriptedChange.personIdentifier, scriptedChange.directionName),
      resultingLevel,
    )
    turnDraft.relationshipChanges.push({
      identifier: `relationship_change_${caseSnapshot.archiveRun.relationshipChanges.length + turnDraft.relationshipChanges.length + 1}`,
      personIdentifier: scriptedChange.personIdentifier,
      personVisibleName: readPersonVisibleName(scriptedChange.personIdentifier, workingState),
      personSilhouetteName: personDefinition.silhouetteName,
      directionName: scriptedChange.directionName,
      dimensionName: scriptedChange.dimensionName,
      levelChange: scriptedChange.levelChange,
      resultingLevel,
      perceptibleCauseText: concealUnknownRenataName(scriptedChange.perceptibleCauseText, workingState),
      fictionalDateLabel: lighthouseCaseFictionalDateLabel,
    })
  }
  for (const scriptedStagingEvent of outcome.stagingEvents) {
    const anchorDirectorEntryIndex = firstEntryIndexOfOutcome + scriptedStagingEvent.anchorEntryIndex
    if (scriptedStagingEvent.kind === 'mental_attack') {
      turnDraft.stagingEvents.push({
        kind: 'mental_attack',
        anchorDirectorEntryIndex,
        anchorParagraphIndex: scriptedStagingEvent.anchorParagraphIndex,
        falsifiedStatusReading: scriptedStagingEvent.falsifiedStatusReading,
        rewrittenPastPhrase: scriptedStagingEvent.rewrittenPastPhrase,
      })
    } else if (scriptedStagingEvent.kind === 'attack_received') {
      turnDraft.stagingEvents.push({
        kind: 'attack_received',
        anchorDirectorEntryIndex,
        anchorParagraphIndex: scriptedStagingEvent.anchorParagraphIndex,
        causedSeriousWound: outcome.seriousWoundCauseText !== null,
      })
    } else {
      turnDraft.stagingEvents.push({
        kind: scriptedStagingEvent.kind,
        anchorDirectorEntryIndex,
        anchorParagraphIndex: scriptedStagingEvent.anchorParagraphIndex,
      })
    }
  }
  for (const grantedFlagName of outcome.grantedLivedExperienceFlagNames) {
    if (!workingState.livedExperienceFlagNames.has(grantedFlagName)) {
      workingState.livedExperienceFlagNames.add(grantedFlagName)
      turnDraft.grantedLivedExperienceFlagNames.push(grantedFlagName)
    }
  }
  for (const presentedPieceIdentifier of outcome.presentedInteractivePieceIdentifiers) {
    const publicDefinition = lighthouseCaseInteractivePieces[presentedPieceIdentifier]
    if (publicDefinition && !workingState.interactivePieceStatusByIdentifier.has(presentedPieceIdentifier)) {
      workingState.interactivePieceStatusByIdentifier.set(presentedPieceIdentifier, 'presented')
      turnDraft.presentedInteractivePieces.push(publicDefinition)
    }
  }
  for (const statusChange of outcome.interactivePieceStatusChanges) {
    if (workingState.interactivePieceStatusByIdentifier.has(statusChange.interactivePieceIdentifier)) {
      workingState.interactivePieceStatusByIdentifier.set(
        statusChange.interactivePieceIdentifier,
        statusChange.resultingLifecycleStatusName,
      )
      turnDraft.interactivePieceStatusChanges.push(statusChange)
    }
  }
  if (outcome.shouldUpdateJournal) {
    turnDraft.shouldUpdateJournal = true
  }
  const newlyWitnessedOriginIdentifiers = [
    ...(originIdentifier ? [originIdentifier] : []),
    ...outcome.additionalWitnessedOriginIdentifiers,
  ]
  for (const witnessedOriginIdentifier of newlyWitnessedOriginIdentifiers) {
    if (!workingState.witnessedOriginIdentifiers.has(witnessedOriginIdentifier)) {
      workingState.witnessedOriginIdentifiers.add(witnessedOriginIdentifier)
      turnDraft.witnessedOriginIdentifiers.push(witnessedOriginIdentifier)
    }
  }
  if (outcome.nextSceneIdentifier && outcome.nextSceneIdentifier !== workingState.sceneIdentifier) {
    workingState.sceneIdentifier = outcome.nextSceneIdentifier
    turnDraft.hasSceneChanged = true
    turnDraft.stagingEvents.push({ kind: 'scene_changed', resultingPlaceName: workingState.placeName })
    for (const arrivalEntry of readCurrentScene(workingState).arrivalEntries) {
      turnDraft.directorEntries.push(createDirectorSpokenEntry(arrivalEntry, workingState, caseSnapshot))
    }
  }
  if (outcome.archiveEndingIdentifier) {
    const endingIdentifier =
      outcome.archiveEndingIdentifier === dawnArchiveEndingRequestIdentifier
        ? chooseDawnEndingIdentifier([...workingState.livedExperienceFlagNames])
        : outcome.archiveEndingIdentifier
    const endingDefinition = lighthouseCaseEndings[endingIdentifier]
    if (endingDefinition) {
      for (const closingEntry of endingDefinition.closingEntries) {
        turnDraft.directorEntries.push(createDirectorSpokenEntry(closingEntry, workingState, caseSnapshot))
      }
      if (endingDefinition.deathOutcome) {
        turnDraft.archiveOutcome = endingDefinition.deathOutcome
      } else {
        turnDraft.directorEntries.push(
          createDirectorSpokenEntry(createOriginClosingEntry([...workingState.livedExperienceFlagNames]), workingState, caseSnapshot),
        )
        turnDraft.archiveOutcome = createLighthouseArchiveEndedAliveOutcome(endingIdentifier, [
          ...workingState.livedExperienceFlagNames,
        ])
      }
    }
  }
}

function chooseBranchOutcome(actionBranch: CaseActionBranch, workingState: WorkingCaseState): CaseBranchOutcome {
  const matchingConditionalOutcome = actionBranch.conditionalOutcomes.find((conditionalOutcome) =>
    isBranchConditionMet(conditionalOutcome.condition, workingState),
  )
  return matchingConditionalOutcome?.outcome ?? actionBranch.defaultOutcome
}

function createScenePresentation(workingState: WorkingCaseState, caseSnapshot: DirectorCaseSnapshot): ArchiveScenePresentation {
  const sceneDefinition = readCurrentScene(workingState)
  const prepareVisibleText = (visibleText: string) =>
    caseSnapshot.personalizeText(concealUnknownRenataName(visibleText, workingState))
  return {
    sceneIdentifier: sceneDefinition.sceneIdentifier,
    placeName: sceneDefinition.placeName,
    tensionTierName: sceneDefinition.tensionTierName,
    presentPersons: sceneDefinition.presentPersons
      .filter((presentPerson) => isBranchConditionMet(presentPerson.presenceCondition, workingState))
      .map((presentPerson) => ({
        personIdentifier: presentPerson.personIdentifier,
        visibleName: readPersonVisibleName(presentPerson.personIdentifier, workingState),
        isNameKnown: workingState.knownPersonIdentifiers.has(presentPerson.personIdentifier),
        silhouetteName: lighthouseCasePersons[presentPerson.personIdentifier]?.silhouetteName ?? 'close_figure',
        presenceText: prepareVisibleText(presentPerson.presenceText),
      })),
    perceivedPointsOfInterest: sceneDefinition.perceivedPointsOfInterest,
    suggestedActions: readSuggestedBranches(workingState).map((actionBranch) => ({
      identifier: actionBranch.branchIdentifier,
      visibleText: prepareVisibleText(actionBranch.visibleText),
      resourceCost: actionBranch.resourceCost,
      actionGroupName: actionBranch.actionGroupName,
      hasBeenAttemptedBefore: workingState.witnessedOriginIdentifiers.has(actionBranch.branchIdentifier),
    })),
    openInteractivePieceIdentifiers: Object.keys(sceneDefinition.interactivePieceSolvedOutcomes).filter((pieceIdentifier) => {
      const lifecycleStatusName = workingState.interactivePieceStatusByIdentifier.get(pieceIdentifier)
      return lifecycleStatusName !== undefined && interactivePieceLifecycleStatusNamesOpenToAttempts.includes(lifecycleStatusName)
    }),
  }
}

function isPlanConditionMet(conditionText: string, workingState: WorkingCaseState): { isMet: boolean; reasonText: string; wasRecognized: boolean } {
  const classifiedCondition = classifyPlanCondition(conditionText)
  const reasonTexts = lighthouseCaseDirectorCopy.unmetConditionReasonByKindName
  const sceneDefinition = readCurrentScene(workingState)
  let isPlainConditionTrue = true
  let reasonWhenFalse = ''
  let reasonWhenNegatedFalse = ''
  switch (classifiedCondition.kindName) {
    case 'time_remains':
      isPlainConditionTrue = workingState.worldClockMinutes < lighthouseCaseLastSpareTimeWorldClockMinutes
      reasonWhenFalse = reasonTexts.time_remains
      reasonWhenNegatedFalse = reasonTexts.time_remains
      break
    case 'renata_is_present':
      isPlainConditionTrue = sceneDefinition.presentPersons.some(
        (presentPerson) =>
          presentPerson.personIdentifier === renataPersonIdentifier &&
          isBranchConditionMet(presentPerson.presenceCondition, workingState),
      )
      reasonWhenFalse = reasonTexts.renata_is_present
      reasonWhenNegatedFalse = reasonTexts.renata_is_absent
      break
    case 'boatman_waits':
      isPlainConditionTrue =
        workingState.livedExperienceFlagNames.has(lighthouseCaseFlagNames.boatmanWasPaid) ||
        readRelationshipLevel(workingState, boatmanPersonIdentifier, 'toward_investigator_as_perceived') >= 4
      reasonWhenFalse = reasonTexts.boatman_waits
      reasonWhenNegatedFalse = reasonTexts.boatman_waits
      break
    case 'investigator_is_wounded':
      isPlainConditionTrue = workingState.seriousWoundCount > 0
      reasonWhenFalse = reasonTexts.investigator_is_wounded
      reasonWhenNegatedFalse = reasonTexts.investigator_is_unharmed
      break
    case 'scene_is_not_dangerous':
      isPlainConditionTrue = sceneDefinition.tensionTierName === 'calm' || sceneDefinition.tensionTierName === 'uneasy'
      reasonWhenFalse = reasonTexts.scene_is_not_dangerous
      reasonWhenNegatedFalse = reasonTexts.scene_is_not_dangerous
      break
    case 'unrecognized':
      return { isMet: true, reasonText: '', wasRecognized: false }
  }
  const isMet = classifiedCondition.isNegated ? !isPlainConditionTrue : isPlainConditionTrue
  return { isMet, reasonText: classifiedCondition.isNegated ? reasonWhenNegatedFalse : reasonWhenFalse, wasRecognized: true }
}

function readCompositionOriginName(planStep: PlannedActionStep): InvestigatorCompositionOriginName {
  if (planStep.originSuggestedActionIdentifier === null) {
    return 'own_words'
  }
  return planStep.wasTextEditedByPlayer ? 'edited_suggestion' : 'suggested_action'
}

const mechanismValueMentionPatternSources = ['candado', 'combinacion', 'dial(es)?', 'clave', 'codigo', 'cifras?', 'disco', 'corona']

function expandPlanStepsIntoUnits(
  planSteps: PlannedActionStep[],
  suggestedBranches: CaseActionBranch[],
  referencedInteractivePieceIdentifier: string | null,
  caseSnapshot: DirectorCaseSnapshot,
  workingState: WorkingCaseState,
): ExecutableUnit[] {
  const executableUnits: ExecutableUnit[] = []
  planSteps.forEach((planStep, planStepIndex) => {
    if (planStep.originSuggestedActionIdentifier !== null) {
      executableUnits.push({
        planStepIndex,
        actionText: planStep.actionText,
        conditionText: planStep.conditionText,
        branchIdentifier: planStep.originSuggestedActionIdentifier,
        compositionOriginName: readCompositionOriginName(planStep),
        wasSuggestionEditedByPlayer: planStep.wasTextEditedByPlayer,
      })
      return
    }
    const doesTextCarryMechanismValue =
      referencedInteractivePieceIdentifier !== null ||
      doesFreeTextMatchAnyPattern(planStep.actionText, mechanismValueMentionPatternSources)
    const planSegments = doesTextCarryMechanismValue
      ? []
      : splitFreeTextIntoPlanSegments(planStep.actionText, suggestedBranches.length)
    const hasSuggestionReference = planSegments.some((planSegment) => planSegment.kind === 'suggestion_reference')
    if (planSegments.length <= 1 && !hasSuggestionReference) {
      const onlySegment = planSegments[0]
      executableUnits.push({
        planStepIndex,
        actionText: planStep.actionText,
        conditionText: planStep.conditionText ?? onlySegment?.conditionText ?? null,
        branchIdentifier: null,
        compositionOriginName: 'own_words',
        wasSuggestionEditedByPlayer: false,
      })
      return
    }
    for (const planSegment of planSegments) {
      if (planSegment.kind === 'suggestion_reference') {
        const referencedBranch = suggestedBranches[planSegment.suggestionNumber - 1]
        executableUnits.push({
          planStepIndex,
          actionText: caseSnapshot.personalizeText(concealUnknownRenataName(referencedBranch.visibleText, workingState)),
          conditionText: planSegment.conditionText ?? planStep.conditionText,
          branchIdentifier: referencedBranch.branchIdentifier,
          compositionOriginName: 'suggested_action',
          wasSuggestionEditedByPlayer: false,
        })
      } else {
        executableUnits.push({
          planStepIndex,
          actionText: planSegment.actionText,
          conditionText: planSegment.conditionText ?? planStep.conditionText,
          branchIdentifier: null,
          compositionOriginName: 'own_words',
          wasSuggestionEditedByPlayer: false,
        })
      }
    }
  })
  return executableUnits
}

function findProseSolvedInteractivePieceIdentifier(
  actionText: string,
  referencedInteractivePieceIdentifier: string | null,
  workingState: WorkingCaseState,
): string | null {
  const sceneDefinition = readCurrentScene(workingState)
  for (const pieceIdentifier of Object.keys(sceneDefinition.interactivePieceSolvedOutcomes)) {
    const lifecycleStatusName = workingState.interactivePieceStatusByIdentifier.get(pieceIdentifier)
    if (!lifecycleStatusName || !interactivePieceLifecycleStatusNamesOpenToAttempts.includes(lifecycleStatusName)) {
      continue
    }
    if (referencedInteractivePieceIdentifier !== null && referencedInteractivePieceIdentifier !== pieceIdentifier) {
      continue
    }
    const mentionsMechanism =
      referencedInteractivePieceIdentifier === pieceIdentifier ||
      doesFreeTextMatchAnyPattern(actionText, ['candado', 'dial(es)?', 'combinacion', 'disco', 'corona', 'gir\\w*', 'descifr\\w*', 'placas?', 'ranuras?'])
    if (mentionsMechanism && doesFreeTextMatchAnyPattern(actionText, proseSolutionPatternSourcesByPieceIdentifier[pieceIdentifier] ?? [])) {
      return pieceIdentifier
    }
  }
  return null
}

function resolveSolvedInteractivePiece(
  pieceIdentifier: string,
  workingState: WorkingCaseState,
  turnDraft: TurnDraft,
  caseSnapshot: DirectorCaseSnapshot,
) {
  const solvedOutcome = readCurrentScene(workingState).interactivePieceSolvedOutcomes[pieceIdentifier]
  if (!solvedOutcome) {
    return
  }
  applyOutcome(
    {
      ...solvedOutcome,
      interactivePieceStatusChanges: [
        ...solvedOutcome.interactivePieceStatusChanges,
        { interactivePieceIdentifier: pieceIdentifier, resultingLifecycleStatusName: 'resolved', brokenReasonPublicText: null },
      ],
    },
    createSolvedInteractivePieceOriginIdentifier(pieceIdentifier),
    workingState,
    turnDraft,
    caseSnapshot,
  )
}

function executeUnit(
  executableUnit: ExecutableUnit,
  actionRequest: InvestigatorActionRequest,
  workingState: WorkingCaseState,
  turnDraft: TurnDraft,
  caseSnapshot: DirectorCaseSnapshot,
): UnitDispositionName {
  const quotedActionText = sanitizeQuotedPlayerText(executableUnit.actionText)
  if (executableUnit.conditionText) {
    const quotedConditionText = sanitizeQuotedPlayerText(executableUnit.conditionText)
    const conditionVerdict = isPlanConditionMet(executableUnit.conditionText, workingState)
    if (!conditionVerdict.isMet) {
      appendNarrationParagraph(
        turnDraft,
        lighthouseCaseDirectorCopy.conditionWasUnmetParagraph(quotedActionText, quotedConditionText, conditionVerdict.reasonText),
      )
      return 'skipped'
    }
    appendNarrationParagraph(
      turnDraft,
      conditionVerdict.wasRecognized
        ? lighthouseCaseDirectorCopy.conditionWasMetParagraph(quotedActionText, quotedConditionText)
        : lighthouseCaseDirectorCopy.unrecognizedConditionParagraph(quotedConditionText),
    )
  }

  const reachableBranches = readReachableBranches(workingState)
  let chosenBranch: CaseActionBranch | null = null
  if (executableUnit.branchIdentifier !== null) {
    chosenBranch = reachableBranches.find((actionBranch) => actionBranch.branchIdentifier === executableUnit.branchIdentifier) ?? null
    if (!chosenBranch) {
      appendNarrationParagraph(turnDraft, lighthouseCaseDirectorCopy.actionOutOfReachParagraph(quotedActionText))
      return 'skipped'
    }
  } else {
    const proseSolvedPieceIdentifier = findProseSolvedInteractivePieceIdentifier(
      executableUnit.actionText,
      actionRequest.referencedInteractivePieceIdentifier,
      workingState,
    )
    if (proseSolvedPieceIdentifier) {
      appendNarrationParagraph(turnDraft, lighthouseCaseDirectorCopy.pieceSolvedInProseParagraph)
      const pieceDefinition = lighthouseCaseInteractivePieces[proseSolvedPieceIdentifier]
      workingState.worldClockMinutes += pieceDefinition.attemptElapsedMinutes
      turnDraft.elapsedMinutes += pieceDefinition.attemptElapsedMinutes
      resolveSolvedInteractivePiece(proseSolvedPieceIdentifier, workingState, turnDraft, caseSnapshot)
      return 'executed'
    }
    if (isActionTextWithoutMethod(executableUnit.actionText)) {
      appendNarrationParagraph(turnDraft, lighthouseCaseDirectorCopy.actionWithoutMethodInsidePlanParagraph(quotedActionText))
      return 'skipped'
    }
    const mentionedImpossibleObject = findMentionOfObjectNeverCarried(executableUnit.actionText)
    if (mentionedImpossibleObject) {
      appendNarrationParagraph(turnDraft, lighthouseCaseDirectorCopy.insistedImpossibleActionParagraph(mentionedImpossibleObject))
      workingState.worldClockMinutes += 1
      turnDraft.elapsedMinutes += 1
      return 'executed'
    }
    const matchedBranchIdentifier = findBestMatchingIntent(
      executableUnit.actionText,
      reachableBranches.map((actionBranch) => ({
        candidateIdentifier: actionBranch.branchIdentifier,
        patternSources: actionBranch.freeTextIntentPatternSources,
      })),
    )
    chosenBranch = reachableBranches.find((actionBranch) => actionBranch.branchIdentifier === matchedBranchIdentifier) ?? null
    if (!chosenBranch) {
      if (isPreparationText(executableUnit.actionText)) {
        appendNarrationParagraph(turnDraft, lighthouseCaseDirectorCopy.preparationParagraph)
        workingState.worldClockMinutes += 3
        turnDraft.elapsedMinutes += 3
        return 'executed'
      }
      applyOutcome(readCurrentScene(workingState).freeTextFallbackOutcome, null, workingState, turnDraft, caseSnapshot)
      return 'executed'
    }
  }

  const wasBranchAlreadyWitnessed = workingState.witnessedOriginIdentifiers.has(chosenBranch.branchIdentifier)
  if (wasBranchAlreadyWitnessed && !chosenBranch.isRepeatable) {
    if (chosenBranch.repeatedOutcome) {
      applyOutcome(chosenBranch.repeatedOutcome, null, workingState, turnDraft, caseSnapshot)
      return 'executed'
    }
    appendNarrationParagraph(turnDraft, lighthouseCaseDirectorCopy.actionAlreadyDoneParagraph(quotedActionText))
    return 'skipped'
  }
  if (!canAffordResourceCost(chosenBranch.resourceCost, workingState)) {
    appendNarrationParagraph(turnDraft, lighthouseCaseDirectorCopy.unaffordableCostParagraph(quotedActionText))
    return 'skipped'
  }
  if (executableUnit.wasSuggestionEditedByPlayer) {
    turnDraft.directorEntries.push({
      voice: 'system_notice',
      noticeKindName: 'demonstration_limit',
      plainParagraphs: [lighthouseCaseDirectorCopy.editedSuggestionNotice],
    })
  }
  if (chosenBranch.resourceCost) {
    applyResourceCost(chosenBranch.resourceCost, workingState, turnDraft)
  }
  applyOutcome(chooseBranchOutcome(chosenBranch, workingState), chosenBranch.branchIdentifier, workingState, turnDraft, caseSnapshot)
  return 'executed'
}

const markedSpanPattern = /\[\[([^[\]]{1,160})\]\]/g
const movingEffectTagNames = ['temblor', 'latido', 'interferencia', 'tinta', 'reescrito']
const maximumMarkedSpansPerTurn = 6
const maximumMovingEffectsPerTurn = 2
const maximumInterferenceEffectsPerTurn = 1
const maximumPausesPerTurn = 3

function readPlainTextOfMarkedSpan(spanContent: string): string {
  const separatorIndex = spanContent.indexOf(':')
  if (separatorIndex < 0) {
    return spanContent
  }
  const tagNames = spanContent.slice(0, separatorIndex).toLowerCase().split('+')
  if (tagNames.includes('pausa') || tagNames.includes('censura')) {
    return ''
  }
  const spanText = spanContent.slice(separatorIndex + 1)
  return tagNames.includes('reescrito') ? (spanText.split('|')[1] ?? spanText) : spanText
}

function enforceNarrativeMarkupBudget(directorEntries: DirectorSpokenEntryContent[]): DirectorSpokenEntryContent[] {
  let markedSpanCount = 0
  let movingEffectCount = 0
  let interferenceEffectCount = 0
  let pauseCount = 0
  const enforceOnParagraph = (markedParagraph: string) =>
    markedParagraph.replace(markedSpanPattern, (wholeSpan, spanContent: string) => {
      const separatorIndex = spanContent.indexOf(':')
      const tagNames = separatorIndex < 0 ? [] : spanContent.slice(0, separatorIndex).toLowerCase().split('+')
      if (tagNames.includes('pausa')) {
        pauseCount += 1
        return pauseCount > maximumPausesPerTurn ? '' : wholeSpan
      }
      const isMovingEffect = tagNames.some((tagName) => movingEffectTagNames.includes(tagName))
      const isInterference = tagNames.includes('interferencia')
      if (
        markedSpanCount >= maximumMarkedSpansPerTurn ||
        (isMovingEffect && movingEffectCount >= maximumMovingEffectsPerTurn) ||
        (isInterference && interferenceEffectCount >= maximumInterferenceEffectsPerTurn)
      ) {
        return readPlainTextOfMarkedSpan(spanContent)
      }
      markedSpanCount += 1
      movingEffectCount += isMovingEffect ? 1 : 0
      interferenceEffectCount += isInterference ? 1 : 0
      return wholeSpan
    })
  return directorEntries.map((directorEntry) =>
    directorEntry.voice === 'system_notice'
      ? directorEntry
      : { ...directorEntry, markedParagraphs: directorEntry.markedParagraphs.map(enforceOnParagraph) },
  )
}

function appendEntropySignalIfDue(workingState: WorkingCaseState, turnDraft: TurnDraft, resultingStateVersion: number) {
  if (
    turnDraft.archiveOutcome ||
    hasArchiveReachedResolution(workingState) ||
    workingState.sceneIdentifier === lighthouseCaseSceneIdentifiers.dawnPier
  ) {
    return
  }
  const entropySignals = [
    {
      stateVersion: lighthouseCaseEntropySignalStateVersions.second,
      flagName: lighthouseCaseFlagNames.secondEntropySignalWasGiven,
      paragraph: lighthouseCaseDirectorCopy.secondEntropySignalParagraph,
    },
    {
      stateVersion: lighthouseCaseEntropySignalStateVersions.first,
      flagName: lighthouseCaseFlagNames.firstEntropySignalWasGiven,
      paragraph: lighthouseCaseDirectorCopy.firstEntropySignalParagraph,
    },
  ]
  const dueSignal = entropySignals.find(
    (entropySignal) =>
      resultingStateVersion >= entropySignal.stateVersion && !workingState.livedExperienceFlagNames.has(entropySignal.flagName),
  )
  if (dueSignal) {
    appendNarrationParagraph(turnDraft, dueSignal.paragraph)
    workingState.livedExperienceFlagNames.add(dueSignal.flagName)
    turnDraft.grantedLivedExperienceFlagNames.push(dueSignal.flagName)
    if (dueSignal.flagName === lighthouseCaseFlagNames.secondEntropySignalWasGiven) {
      workingState.livedExperienceFlagNames.add(lighthouseCaseFlagNames.firstEntropySignalWasGiven)
      turnDraft.grantedLivedExperienceFlagNames.push(lighthouseCaseFlagNames.firstEntropySignalWasGiven)
    }
  }
}

function composeConfirmedEffects(
  caseSnapshot: DirectorCaseSnapshot,
  workingState: WorkingCaseState,
  turnDraft: TurnDraft,
): ConfirmedEffect[] {
  const confirmedEffects: ConfirmedEffect[] = []
  if (turnDraft.elapsedMinutes > 0) {
    confirmedEffects.push({
      kind: 'world_clock_advanced',
      elapsedMinutes: turnDraft.elapsedMinutes,
      resultingWorldClockMinutes: caseSnapshot.investigator.worldClockMinutes + turnDraft.elapsedMinutes,
    })
  }
  if (workingState.placeName !== caseSnapshot.investigator.placeName) {
    confirmedEffects.push({ kind: 'place_changed', resultingPlaceName: workingState.placeName })
  }
  confirmedEffects.push(...turnDraft.orderedEffects)
  if (turnDraft.shouldUpdateJournal) {
    confirmedEffects.push({ kind: 'journal_updated' })
  }
  return confirmedEffects
}

function composeConfirmedTurn(
  actionKey: string,
  expectedStateVersion: number,
  investigatorEntry: InvestigatorEntryContent,
  planStepDispositions: PlanStepDisposition[],
  planContinuationQuestion: DirectorQuestionEntryContent | null,
  caseSnapshot: DirectorCaseSnapshot,
  workingState: WorkingCaseState,
  turnDraft: TurnDraft,
): ConfirmedArchiveTurn {
  const resultingStateVersion = expectedStateVersion + 1
  appendEntropySignalIfDue(workingState, turnDraft, resultingStateVersion)
  const directorEntries = enforceNarrativeMarkupBudget(turnDraft.directorEntries)
  const hasInvestigatorDied =
    turnDraft.archiveOutcome?.kind === 'chronicle_closed_by_death' || workingState.seriousWoundCount >= 5
  return {
    turnIdentifier: `lighthouse_turn_${resultingStateVersion}`,
    actionKey,
    resultingStateVersion,
    witnessedOriginIdentifiers: turnDraft.witnessedOriginIdentifiers,
    investigatorEntry,
    directorEntries,
    heardLines: readHeardLineSentences(directorEntries, workingState.placeName, workingState.worldClockMinutes),
    planStepDispositions,
    planContinuationQuestion: hasInvestigatorDied || turnDraft.archiveOutcome ? null : planContinuationQuestion,
    resourceCosts: turnDraft.resourceCosts,
    confirmedEffects: composeConfirmedEffects(caseSnapshot, workingState, turnDraft),
    relationshipChanges: turnDraft.relationshipChanges,
    stagingEvents: turnDraft.stagingEvents,
    presentedInteractivePieces: turnDraft.presentedInteractivePieces,
    interactivePieceStatusChanges: turnDraft.interactivePieceStatusChanges,
    grantedLivedExperienceFlagNames: turnDraft.grantedLivedExperienceFlagNames,
    nextScenePresentation: turnDraft.archiveOutcome ? null : createScenePresentation(workingState, caseSnapshot),
    archiveOutcome: turnDraft.archiveOutcome,
  }
}

function createSingleAnswerQuestion(
  questionKindName: DirectorQuestionEntryContent['questionKindName'],
  plainParagraphs: string[],
  answerOptions: DirectorQuestionEntryContent['answerOptions'],
): DirectorQuestionEntryContent {
  return { voice: 'director_question', questionKindName, plainParagraphs, answerOptions, answeredOptionIdentifier: null }
}

export function resolveInvestigatorActionAgainstLighthouseCase(
  actionRequest: InvestigatorActionRequest,
  caseSnapshot: DirectorCaseSnapshot,
): DirectorTurnResolution {
  const { archiveRun } = caseSnapshot
  if (
    actionRequest.remainingPlanSteps.length === 0 ||
    actionRequest.expectedStateVersion !== archiveRun.stateVersion ||
    archiveRun.currentScenePresentation === null ||
    archiveRun.archiveOutcome !== null
  ) {
    return { dispositionName: 'service_failed', isRetryPossible: false }
  }
  const workingState = createWorkingCaseState(caseSnapshot)
  const turnDraft = createTurnDraft()
  const suggestedBranchesAtDeclaration = archiveRun.currentScenePresentation.suggestedActions
    .map((suggestedAction) =>
      readActionBranchesOfScene(readCurrentScene(workingState)).find(
        (actionBranch) => actionBranch.branchIdentifier === suggestedAction.identifier,
      ),
    )
    .filter((actionBranch): actionBranch is CaseActionBranch => actionBranch !== undefined)
  const executableUnits = expandPlanStepsIntoUnits(
    actionRequest.remainingPlanSteps,
    suggestedBranchesAtDeclaration,
    actionRequest.referencedInteractivePieceIdentifier,
    caseSnapshot,
    workingState,
  )
  const createEntryStep = (executableUnit: ExecutableUnit, unitIndex: number): InvestigatorEntryStep => ({
    stepNumber: actionRequest.alreadyExecutedStepCount + unitIndex + 1,
    actionText: executableUnit.actionText,
    conditionText: executableUnit.conditionText,
    compositionOriginName: executableUnit.compositionOriginName,
  })
  const declaredPlanStepCount = Math.max(actionRequest.declaredPlanStepCount, executableUnits.length)

  const firstUnit = executableUnits[0]
  if (firstUnit && firstUnit.branchIdentifier === null && !actionRequest.isPlayerInsistingAfterDirectorVeto) {
    const questionInvestigatorEntry: InvestigatorEntryContent = {
      voice: 'investigator_entry',
      attemptedSteps: [createEntryStep(firstUnit, 0)],
      declaredPlanStepCount: declaredPlanStepCount > 1 ? declaredPlanStepCount : null,
    }
    const isSolvingPieceInProse =
      findProseSolvedInteractivePieceIdentifier(firstUnit.actionText, actionRequest.referencedInteractivePieceIdentifier, workingState) !== null
    if (!isSolvingPieceInProse && isActionTextWithoutMethod(firstUnit.actionText)) {
      return {
        dispositionName: 'question_asked',
        investigatorEntry: questionInvestigatorEntry,
        questionEntry: createSingleAnswerQuestion('method_clarification', lighthouseCaseDirectorCopy.methodClarificationParagraphs, [
          {
            identifier: 'return_to_reply_desk',
            visibleText: lighthouseCaseDirectorCopy.describeMethodAnswer,
            answerEffectName: 'return_to_reply_desk',
          },
        ]),
      }
    }
    const mentionedImpossibleObject = findMentionOfObjectNeverCarried(firstUnit.actionText)
    if (mentionedImpossibleObject) {
      return {
        dispositionName: 'question_asked',
        investigatorEntry: questionInvestigatorEntry,
        questionEntry: createSingleAnswerQuestion(
          'illogical_action_veto',
          lighthouseCaseDirectorCopy.illogicalActionVetoParagraphs(mentionedImpossibleObject),
          [
            {
              identifier: 'return_to_reply_desk',
              visibleText: lighthouseCaseDirectorCopy.rethinkActionAnswer,
              answerEffectName: 'return_to_reply_desk',
            },
            {
              identifier: 'proceed_with_pending_action',
              visibleText: lighthouseCaseDirectorCopy.insistOnActionAnswer,
              answerEffectName: 'proceed_with_pending_action',
            },
          ],
        ),
      }
    }
  }

  const unitDispositionNames: UnitDispositionName[] = executableUnits.map(() => 'pending')
  let executedUnitCount = 0
  for (let unitIndex = 0; unitIndex < executableUnits.length; unitIndex += 1) {
    const isBatchClosed =
      executedUnitCount >= maximumPlanStepsExecutedPerDirectorBatch ||
      turnDraft.hasSceneChanged ||
      turnDraft.archiveOutcome !== null ||
      workingState.seriousWoundCount >= 5
    if (isBatchClosed) {
      break
    }
    const unitDispositionName = executeUnit(executableUnits[unitIndex], actionRequest, workingState, turnDraft, caseSnapshot)
    unitDispositionNames[unitIndex] = unitDispositionName
    executedUnitCount += unitDispositionName === 'executed' ? 1 : 0
  }

  const planStepDispositions: PlanStepDisposition[] = actionRequest.remainingPlanSteps.map((planStep, planStepIndex) => {
    const dispositionNamesOfStep = unitDispositionNames.filter(
      (_dispositionName, unitIndex) => executableUnits[unitIndex].planStepIndex === planStepIndex,
    )
    if (dispositionNamesOfStep.length === 0 || dispositionNamesOfStep.every((dispositionName) => dispositionName === 'pending')) {
      return { stepIdentifier: planStep.stepIdentifier, dispositionName: 'left_pending' }
    }
    return {
      stepIdentifier: planStep.stepIdentifier,
      dispositionName: dispositionNamesOfStep.some((dispositionName) => dispositionName === 'executed')
        ? 'executed'
        : 'skipped_because_condition_was_unmet',
    }
  })

  const isArchiveStillOpen = turnDraft.archiveOutcome === null && workingState.seriousWoundCount < 5
  const leftoverUnitsInsideHandledSteps = executableUnits.filter(
    (executableUnit, unitIndex) =>
      unitDispositionNames[unitIndex] === 'pending' &&
      planStepDispositions[executableUnit.planStepIndex].dispositionName !== 'left_pending',
  )
  if (isArchiveStillOpen && leftoverUnitsInsideHandledSteps.length > 0) {
    if (turnDraft.hasSceneChanged) {
      appendNarrationParagraph(turnDraft, lighthouseCaseDirectorCopy.sceneChangedMidPlanParagraph)
    }
    appendNarrationParagraph(
      turnDraft,
      lighthouseCaseDirectorCopy.leftoverStepsParagraph(
        leftoverUnitsInsideHandledSteps.map((leftoverUnit) => sanitizeQuotedPlayerText(leftoverUnit.actionText)),
      ),
    )
  }

  const pendingPlanSteps = actionRequest.remainingPlanSteps.filter(
    (_planStep, planStepIndex) => planStepDispositions[planStepIndex].dispositionName === 'left_pending',
  )
  const planContinuationQuestion =
    pendingPlanSteps.length > 0
      ? createSingleAnswerQuestion(
          'plan_continuation',
          lighthouseCaseDirectorCopy.planContinuationParagraphs(
            planStepDispositions.filter((planStepDisposition) => planStepDisposition.dispositionName === 'executed').length,
            planStepDispositions.filter(
              (planStepDisposition) => planStepDisposition.dispositionName === 'skipped_because_condition_was_unmet',
            ).length,
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

  const attemptedSteps = executableUnits
    .map((executableUnit, unitIndex) => ({ executableUnit, unitIndex }))
    .filter(({ unitIndex }) => unitDispositionNames[unitIndex] !== 'pending')
    .map(({ executableUnit, unitIndex }) => createEntryStep(executableUnit, unitIndex))
  const investigatorEntry: InvestigatorEntryContent = {
    voice: 'investigator_entry',
    attemptedSteps: attemptedSteps.length > 0 ? attemptedSteps : [createEntryStep(executableUnits[0], 0)],
    declaredPlanStepCount: declaredPlanStepCount > 1 ? declaredPlanStepCount : null,
  }

  return {
    dispositionName: 'resolved',
    confirmedTurn: composeConfirmedTurn(
      actionRequest.actionKey,
      actionRequest.expectedStateVersion,
      investigatorEntry,
      planStepDispositions,
      planContinuationQuestion,
      caseSnapshot,
      workingState,
      turnDraft,
    ),
  }
}

function describeSubmittedValue(
  publicDefinition: InteractivePiecePublicDefinition,
  submittedValue: InteractivePieceSubmittedValue,
): string {
  const attemptCopy = lighthouseCaseDirectorCopy.attemptActionTextByWidgetKindName
  if (submittedValue.widgetKindName === 'combination_dials') {
    return attemptCopy.combination_dials(submittedValue.chosenSymbols)
  }
  if (submittedValue.widgetKindName === 'cipher_wheel') {
    return attemptCopy.cipher_wheel(submittedValue.shiftPositions)
  }
  const visibleNameByPieceIdentifier = new Map(
    publicDefinition.publicState.widgetKindName === 'ordered_positions'
      ? publicDefinition.publicState.pieces.map((orderedPiece) => [orderedPiece.pieceIdentifier, orderedPiece.visibleName])
      : [],
  )
  return attemptCopy.ordered_positions(
    submittedValue.orderedPieceIdentifiers.map((pieceIdentifier) => visibleNameByPieceIdentifier.get(pieceIdentifier) ?? ''),
  )
}

export function resolveInteractivePieceAttemptAgainstLighthouseCase(
  attemptRequest: InteractivePieceAttemptRequest,
  caseSnapshot: DirectorCaseSnapshot,
): InteractivePieceAttemptResolution | null {
  const { archiveRun } = caseSnapshot
  const publicDefinition = lighthouseCaseInteractivePieces[attemptRequest.interactivePieceIdentifier]
  const runtimeState = archiveRun.interactivePieceRuntimeStates[attemptRequest.interactivePieceIdentifier]
  if (
    !publicDefinition ||
    !runtimeState ||
    !interactivePieceLifecycleStatusNamesOpenToAttempts.includes(runtimeState.lifecycleStatusName) ||
    attemptRequest.expectedStateVersion !== archiveRun.stateVersion ||
    archiveRun.archiveOutcome !== null ||
    publicDefinition.publicState.widgetKindName !== attemptRequest.submittedValue.widgetKindName
  ) {
    return null
  }
  const workingState = createWorkingCaseState(caseSnapshot)
  const turnDraft = createTurnDraft()
  const isMechanismWithinReach =
    readCurrentScene(workingState).interactivePieceSolvedOutcomes[attemptRequest.interactivePieceIdentifier] !== undefined
  const violatedVisibleRuleTexts = isMechanismWithinReach
    ? findViolatedVisibleRuleTexts(attemptRequest.interactivePieceIdentifier, attemptRequest.submittedValue)
    : [lighthouseCaseDirectorCopy.pieceOutOfReachRuleText]
  const wasAccepted = violatedVisibleRuleTexts.length === 0
  if (isMechanismWithinReach) {
    workingState.worldClockMinutes += publicDefinition.attemptElapsedMinutes
    turnDraft.elapsedMinutes += publicDefinition.attemptElapsedMinutes
  }
  if (wasAccepted) {
    resolveSolvedInteractivePiece(attemptRequest.interactivePieceIdentifier, workingState, turnDraft, caseSnapshot)
  } else if (isMechanismWithinReach) {
    const failedNarrations = failedAttemptNarrationByPieceIdentifier[attemptRequest.interactivePieceIdentifier] ?? []
    const failedNarration = failedNarrations[runtimeState.attempts.length % Math.max(1, failedNarrations.length)]
    if (failedNarration) {
      appendNarrationParagraph(turnDraft, failedNarration)
    }
  } else {
    appendNarrationParagraph(turnDraft, lighthouseCaseDirectorCopy.pieceOutOfReachParagraph)
  }
  const resultingStateVersion = attemptRequest.expectedStateVersion + 1
  const turnIdentifier = `lighthouse_turn_${resultingStateVersion}`
  const investigatorEntry: InvestigatorEntryContent = {
    voice: 'investigator_entry',
    attemptedSteps: [
      {
        stepNumber: 1,
        actionText: describeSubmittedValue(publicDefinition, attemptRequest.submittedValue),
        conditionText: null,
        compositionOriginName: 'interactive_piece_attempt',
      },
    ],
    declaredPlanStepCount: null,
  }
  return {
    interactivePieceIdentifier: attemptRequest.interactivePieceIdentifier,
    attemptRecord: {
      attemptIdentifier: `interactive_piece_attempt_${resultingStateVersion}`,
      turnIdentifier,
      submittedValue: attemptRequest.submittedValue,
      wasAccepted,
      violatedVisibleRuleTexts,
    },
    confirmedTurn: composeConfirmedTurn(
      attemptRequest.actionKey,
      attemptRequest.expectedStateVersion,
      investigatorEntry,
      [],
      null,
      caseSnapshot,
      workingState,
      turnDraft,
    ),
  }
}

export function readLighthouseInteractivePieceAssistance(
  interactivePieceIdentifier: string,
  requestedLevelName: AssistanceLevelName,
): InteractivePieceAssistanceRecord | null {
  const publicHintText = assistanceTextsByPieceIdentifier[interactivePieceIdentifier]?.[requestedLevelName]
  return publicHintText ? { levelName: requestedLevelName, publicHintText } : null
}

export function createLighthouseArchiveOpening(caseSnapshot: DirectorCaseSnapshot): ArchiveOpeningResolution {
  const openingWorkingState: WorkingCaseState = {
    ...createWorkingCaseState(caseSnapshot),
    sceneIdentifier: lighthouseCaseFirstSceneIdentifier,
    livedExperienceFlagNames: new Set(),
    activeConditionIdentifiers: new Set(),
    knownPersonIdentifiers: new Set(),
    witnessedOriginIdentifiers: new Set(),
    interactivePieceStatusByIdentifier: new Map(),
    relationshipLevelByKey: new Map(),
  }
  const initialRelationshipLevels: ConfirmedRelationshipChange[] = [renataPersonIdentifier, boatmanPersonIdentifier].flatMap(
    (personIdentifier) => {
      const personDefinition = lighthouseCasePersons[personIdentifier]
      const directionNames: Array<ConfirmedRelationshipChange['directionName']> = ['from_investigator', 'toward_investigator_as_perceived']
      return directionNames.map((directionName) => ({
        identifier: `initial_relationship_${personIdentifier}_${directionName}`,
        personIdentifier,
        personVisibleName: personDefinition.aliasBeforeNameIsKnown,
        personSilhouetteName: personDefinition.silhouetteName,
        directionName,
        dimensionName: null,
        levelChange: 0,
        resultingLevel:
          directionName === 'from_investigator'
            ? personDefinition.initialLevelFromInvestigator
            : personDefinition.initialLevelTowardInvestigator,
        perceptibleCauseText: lighthouseCaseDirectorCopy.openingRelationshipCauseByPersonIdentifier[personIdentifier] ?? '',
        fictionalDateLabel: lighthouseCaseFictionalDateLabel,
      }))
    },
  )
  return {
    openingEntries: [{ voice: 'director_narration', markedParagraphs: demonstrationArchive.openingNarrationParagraphs }],
    firstScenePresentation: createScenePresentation(openingWorkingState, caseSnapshot),
    initialRelationshipLevels,
    archiveTitle: demonstrationArchive.archiveTitle,
    archiveNumberLabel: demonstrationArchive.archiveNumberLabel,
  }
}

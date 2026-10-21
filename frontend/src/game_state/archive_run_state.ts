import type {
  ArchiveLogEntry,
  ArchiveLogEntryCommonFields,
  ArchiveBelongingDefinition,
  ArchiveOpeningResolution,
  ArchiveOutcome,
  RevealedFact,
  ArchiveScenePresentation,
  ChronicleClosedByDeathOutcome,
  ConfirmedArchiveTurn,
  ConfirmedEffect,
  ConfirmedRelationshipChange,
  DirectorQuestionEntryContent,
  DirectorSpokenEntryContent,
  InteractivePieceAssistanceRecord,
  InteractivePieceAttemptResolution,
  InteractivePiecePublicDefinition,
  InteractivePieceRuntimeState,
  InteractivePieceSubmittedValue,
  InvestigatorCondition,
  InvestigatorEntryContent,
  PendingActionPlan,
  PlanStepDispositionName,
  RelationshipPulse,
  RelationshipQualitativeBandName,
  RelationshipTendencyName,
  ResourceCost,
  StagingEvent,
  WitnessedOriginRecord,
} from './archive_turn_contract'
import type { InvestigatorState } from './chronicle_state'

export type ArchiveRunState = {
  archiveCaseIdentifier: string | null
  archiveTitle: string | null
  archiveNumberLabel: string | null
  stateVersion: number
  lastConfirmedActionKey: string | null
  logEntries: ArchiveLogEntry[]
  createdLogEntryCount: number
  currentScenePresentation: ArchiveScenePresentation | null
  visitedSceneIdentifiers: string[]
  visitedPlaces: VisitedPlace[]
  witnessedOrigins: WitnessedOriginRecord[]
  livedExperienceFlagNames: string[]
  relationshipChanges: ConfirmedRelationshipChange[]
  relationshipPulses: RelationshipPulse[]
  activeConditions: InvestigatorCondition[]
  interactivePiecePublicDefinitions: Record<string, InteractivePiecePublicDefinition>
  interactivePieceRuntimeStates: Record<string, InteractivePieceRuntimeState>
  pendingActionPlan: PendingActionPlan | null
  unansweredDirectorQuestionEntryIdentifier: string | null
  journalUpdateCount: number
  knownPersonIdentifiers: string[]
  knownPersons: KnownJournalPerson[]
  belongingDefinitions: Record<string, Pick<ArchiveBelongingDefinition, 'visibleName' | 'visibleUnitDescription'>>
  lastSeriousWoundCauseText: string | null
  revealedFacts: RevealedFact[]
  heardLines: string[]
  threatLines: string[]
  completedObjectiveTexts: string[]
  effortRemaining: number
  archiveOutcome: ArchiveOutcome | null
}

export type ArchiveRunStateChange =
  | { kind: 'archive_opened'; whisperIdentifier: string; archiveOpeningResolution: ArchiveOpeningResolution }
  | { kind: 'archive_turn_confirmed'; confirmedTurn: ConfirmedArchiveTurn }
  | {
      kind: 'director_question_recorded'
      investigatorEntry: InvestigatorEntryContent
      questionEntry: DirectorQuestionEntryContent
    }
  | { kind: 'director_question_answered'; questionEntryIdentifier: string; answerOptionIdentifier: string }
  | { kind: 'action_plan_stored'; pendingActionPlan: PendingActionPlan | null }
  | {
      kind: 'interactive_piece_working_value_changed'
      interactivePieceIdentifier: string
      workingValue: InteractivePieceSubmittedValue
    }
  | { kind: 'interactive_piece_attempt_confirmed'; attemptResolution: InteractivePieceAttemptResolution }
  | {
      kind: 'interactive_piece_assistance_confirmed'
      interactivePieceIdentifier: string
      assistanceRecord: InteractivePieceAssistanceRecord
    }
  | { kind: 'interactive_piece_set_aside'; interactivePieceIdentifier: string }

export const archiveRunStateChangeKindNames: ReadonlyArray<ArchiveRunStateChange['kind']> = [
  'archive_opened',
  'archive_turn_confirmed',
  'director_question_recorded',
  'director_question_answered',
  'action_plan_stored',
  'interactive_piece_working_value_changed',
  'interactive_piece_attempt_confirmed',
  'interactive_piece_assistance_confirmed',
  'interactive_piece_set_aside',
]

export type ArchiveRunReductionInput = {
  archiveRun: ArchiveRunState
  investigator: InvestigatorState
  personalizeDirectorText: (directorText: string) => string
}

export type ArchiveRunReductionResult = {
  archiveRun: ArchiveRunState
  investigator: InvestigatorState
  wasTurnConfirmed: boolean
}

export type VisitedPlace = {
  sceneIdentifier: string
  placeName: string
}

export type KnownJournalPerson = {
  personIdentifier: string
  visibleName: string
}

export function rememberKnownPerson(
  knownPersons: KnownJournalPerson[],
  personIdentifier: string,
  visibleName: string,
): KnownJournalPerson[] {
  const cleanedName = visibleName.trim()
  if (personIdentifier.trim() === '' || cleanedName === '') {
    return knownPersons
  }
  const existingPerson = knownPersons.find((knownPerson) => knownPerson.personIdentifier === personIdentifier)
  if (!existingPerson) {
    return [...knownPersons, { personIdentifier, visibleName: cleanedName }]
  }
  if (existingPerson.visibleName === cleanedName) {
    return knownPersons
  }
  return knownPersons.map((knownPerson) =>
    knownPerson.personIdentifier === personIdentifier ? { personIdentifier, visibleName: cleanedName } : knownPerson,
  )
}

function readKnownPersons(candidate: unknown): KnownJournalPerson[] {
  if (!Array.isArray(candidate)) {
    return []
  }
  return candidate.reduce<KnownJournalPerson[]>((knownPersons, possiblePerson) => {
    if (typeof possiblePerson !== 'object' || possiblePerson === null) {
      return knownPersons
    }
    const personIdentifier = 'personIdentifier' in possiblePerson ? possiblePerson.personIdentifier : null
    const visibleName = 'visibleName' in possiblePerson ? possiblePerson.visibleName : null
    if (typeof personIdentifier !== 'string' || typeof visibleName !== 'string') {
      return knownPersons
    }
    return rememberKnownPerson(knownPersons, personIdentifier, visibleName)
  }, [])
}

export function rememberVisitedPlace(
  visitedPlaces: VisitedPlace[],
  sceneIdentifier: string,
  placeName: string,
): VisitedPlace[] {
  const visiblePlaceName = placeName.trim()
  if (sceneIdentifier.trim() === '' || visiblePlaceName === '') {
    return visitedPlaces
  }
  const existingPlace = visitedPlaces.find((visitedPlace) => visitedPlace.sceneIdentifier === sceneIdentifier)
  if (!existingPlace) {
    return [...visitedPlaces, { sceneIdentifier, placeName: visiblePlaceName }]
  }
  if (existingPlace.placeName === visiblePlaceName) {
    return visitedPlaces
  }
  return visitedPlaces.map((visitedPlace) =>
    visitedPlace.sceneIdentifier === sceneIdentifier ? { sceneIdentifier, placeName: visiblePlaceName } : visitedPlace,
  )
}

function readVisitedPlaces(candidate: unknown): VisitedPlace[] {
  if (!Array.isArray(candidate)) {
    return []
  }
  const seenSceneIdentifiers = new Set<string>()
  const visitedPlaces: VisitedPlace[] = []
  for (const possiblePlace of candidate) {
    if (typeof possiblePlace !== 'object' || possiblePlace === null) {
      continue
    }
    const sceneIdentifier = 'sceneIdentifier' in possiblePlace ? possiblePlace.sceneIdentifier : null
    const placeName = 'placeName' in possiblePlace ? possiblePlace.placeName : null
    if (typeof sceneIdentifier !== 'string' || typeof placeName !== 'string' || placeName.trim() === '') {
      continue
    }
    if (seenSceneIdentifiers.has(sceneIdentifier)) {
      continue
    }
    seenSceneIdentifiers.add(sceneIdentifier)
    visitedPlaces.push({ sceneIdentifier, placeName: placeName.trim() })
  }
  return visitedPlaces
}

export const maximumSeriousWoundCount = 5
export const maximumCaseEffort = 6

function readCompletedObjectiveTexts(candidate: unknown): string[] {
  if (!Array.isArray(candidate)) {
    return []
  }
  const completedObjectiveTexts: string[] = []
  for (const possibleText of candidate) {
    if (typeof possibleText !== 'string') {
      continue
    }
    const cleanedText = possibleText.trim()
    if (cleanedText === '' || cleanedText.includes('_') || completedObjectiveTexts.includes(cleanedText)) {
      continue
    }
    completedObjectiveTexts.push(cleanedText)
  }
  return completedObjectiveTexts
}

function replaceCompletedObjectiveTexts(currentTexts: string[], incomingTexts: string[] | undefined): string[] {
  if (!Array.isArray(incomingTexts)) {
    return currentTexts
  }
  return readCompletedObjectiveTexts(incomingTexts)
}

function appendHeardLines(currentLines: string[] | undefined, incomingLines: string[] | undefined): string[] {
  const nextLines = Array.isArray(currentLines) ? [...currentLines] : []
  for (const incomingLine of incomingLines ?? []) {
    if (typeof incomingLine !== 'string' || incomingLine.trim() === '' || nextLines.includes(incomingLine)) {
      continue
    }
    nextLines.push(incomingLine)
  }
  return nextLines
}

function readBoundedEffortRemaining(candidate: unknown): number {
  if (typeof candidate !== 'number' || !Number.isInteger(candidate)) {
    return maximumCaseEffort
  }
  return Math.min(maximumCaseEffort, Math.max(0, candidate))
}

export function completeArchiveRunState(archiveRun: ArchiveRunState): ArchiveRunState {
  return {
    ...createInitialArchiveRunState(),
    ...archiveRun,
    revealedFacts: Array.isArray(archiveRun.revealedFacts) ? archiveRun.revealedFacts : [],
    heardLines: Array.isArray(archiveRun.heardLines)
      ? archiveRun.heardLines.filter((heardLine) => typeof heardLine === 'string' && heardLine.trim() !== '')
      : [],
    threatLines: Array.isArray(archiveRun.threatLines)
      ? archiveRun.threatLines.filter((threatLine) => typeof threatLine === 'string' && threatLine.trim() !== '')
      : [],
    completedObjectiveTexts: readCompletedObjectiveTexts(archiveRun.completedObjectiveTexts),
    visitedPlaces: readVisitedPlaces(archiveRun.visitedPlaces),
    knownPersons: readKnownPersons(archiveRun.knownPersons),
    effortRemaining: readBoundedEffortRemaining(archiveRun.effortRemaining),
  }
}

export function createInitialArchiveRunState(): ArchiveRunState {
  return {
    archiveCaseIdentifier: null,
    archiveTitle: null,
    archiveNumberLabel: null,
    stateVersion: 0,
    lastConfirmedActionKey: null,
    logEntries: [],
    createdLogEntryCount: 0,
    currentScenePresentation: null,
    visitedSceneIdentifiers: [],
    visitedPlaces: [],
    witnessedOrigins: [],
    livedExperienceFlagNames: [],
    relationshipChanges: [],
    relationshipPulses: [],
    activeConditions: [],
    interactivePiecePublicDefinitions: {},
    interactivePieceRuntimeStates: {},
    pendingActionPlan: null,
    unansweredDirectorQuestionEntryIdentifier: null,
    journalUpdateCount: 0,
    knownPersonIdentifiers: [],
    knownPersons: [],
    belongingDefinitions: {},
    lastSeriousWoundCauseText: null,
    revealedFacts: [],
    heardLines: [],
    threatLines: [],
    completedObjectiveTexts: [],
    effortRemaining: maximumCaseEffort,
    archiveOutcome: null,
  }
}

export function readRelationshipQualitativeBandName(relationshipLevel: number): RelationshipQualitativeBandName {
  if (relationshipLevel >= 16) {
    return 'unconditional'
  }
  if (relationshipLevel >= 12) {
    return 'close_ally'
  }
  if (relationshipLevel >= 6) {
    return 'trusted'
  }
  if (relationshipLevel >= 3) {
    return 'acquainted'
  }
  return 'barely_known'
}

function readRelationshipTendencyName(levelChange: number): RelationshipTendencyName {
  if (levelChange > 0) {
    return 'strengthens'
  }
  return levelChange < 0 ? 'cools' : 'unchanged'
}

export function createRelationshipPulse(relationshipChange: ConfirmedRelationshipChange): RelationshipPulse {
  return {
    identifier: relationshipChange.identifier,
    personIdentifier: relationshipChange.personIdentifier,
    personVisibleName: relationshipChange.personVisibleName,
    personSilhouetteName: relationshipChange.personSilhouetteName,
    directionName: relationshipChange.directionName,
    dimensionName: relationshipChange.dimensionName,
    tendencyName: readRelationshipTendencyName(relationshipChange.levelChange),
    resultingQualitativeBandName: readRelationshipQualitativeBandName(relationshipChange.resultingLevel),
    perceptibleCauseText: relationshipChange.perceptibleCauseText,
    fictionalDateLabel: relationshipChange.fictionalDateLabel,
  }
}

type LogEntryContent = ArchiveLogEntry extends infer EntryShape
  ? EntryShape extends ArchiveLogEntry
    ? Omit<EntryShape, keyof ArchiveLogEntryCommonFields>
    : never
  : never

function appendLogEntries(
  archiveRun: ArchiveRunState,
  entryContents: LogEntryContent[],
  commonFields: Omit<ArchiveLogEntryCommonFields, 'identifier'>,
): ArchiveRunState {
  const identifiedEntries = entryContents.map(
    (entryContent, entryIndex) =>
      ({
        ...entryContent,
        ...commonFields,
        identifier: `archive_log_entry_${archiveRun.createdLogEntryCount + entryIndex + 1}`,
      }) as ArchiveLogEntry,
  )
  return {
    ...archiveRun,
    logEntries: [...archiveRun.logEntries, ...identifiedEntries],
    createdLogEntryCount: archiveRun.createdLogEntryCount + entryContents.length,
  }
}

function personalizeDirectorSpokenEntry(
  directorEntry: DirectorSpokenEntryContent,
  personalizeDirectorText: (directorText: string) => string,
): DirectorSpokenEntryContent {
  if (directorEntry.voice === 'system_notice') {
    return { ...directorEntry, plainParagraphs: directorEntry.plainParagraphs.map(personalizeDirectorText) }
  }
  return { ...directorEntry, markedParagraphs: directorEntry.markedParagraphs.map(personalizeDirectorText) }
}

function personalizeDirectorQuestion(
  questionEntry: DirectorQuestionEntryContent,
  personalizeDirectorText: (directorText: string) => string,
): DirectorQuestionEntryContent {
  return {
    ...questionEntry,
    plainParagraphs: questionEntry.plainParagraphs.map(personalizeDirectorText),
    answeredOptionIdentifier: null,
  }
}

function personalizeConfirmedEffect(
  confirmedEffect: ConfirmedEffect,
  personalizeDirectorText: (directorText: string) => string,
): ConfirmedEffect {
  switch (confirmedEffect.kind) {
    case 'serious_wound_suffered':
    case 'critical_failure_recorded':
      return { ...confirmedEffect, perceptibleCauseText: personalizeDirectorText(confirmedEffect.perceptibleCauseText) }
    case 'perception_was_altered':
      return { ...confirmedEffect, clarificationText: personalizeDirectorText(confirmedEffect.clarificationText) }
    case 'condition_gained':
      return {
        ...confirmedEffect,
        condition: {
          ...confirmedEffect.condition,
          originText: personalizeDirectorText(confirmedEffect.condition.originText),
          effectText: personalizeDirectorText(confirmedEffect.condition.effectText),
          exitText: personalizeDirectorText(confirmedEffect.condition.exitText),
        },
      }
    default:
      return confirmedEffect
  }
}

function personalizeArchiveOutcome(
  archiveOutcome: ArchiveOutcome,
  personalizeDirectorText: (directorText: string) => string,
): ArchiveOutcome {
  if (archiveOutcome.kind === 'archive_ended_alive') {
    return {
      ...archiveOutcome,
      objectiveResults: archiveOutcome.objectiveResults.map((objectiveResult) => ({
        ...objectiveResult,
        visibleText: personalizeDirectorText(objectiveResult.visibleText),
      })),
    }
  }
  return {
    ...archiveOutcome,
    perceptibleCauseText: personalizeDirectorText(archiveOutcome.perceptibleCauseText),
    epitaphRewriteText: archiveOutcome.epitaphRewriteText ? personalizeDirectorText(archiveOutcome.epitaphRewriteText) : null,
  }
}

function canInvestigatorAffordEveryResourceCost(investigator: InvestigatorState, resourceCosts: ResourceCost[]): boolean {
  let remainingOperationalFunds = investigator.operationalFunds
  const remainingBelongingUnits = { ...investigator.belongingUnits }
  for (const resourceCost of resourceCosts) {
    if (resourceCost.kind === 'operational_funds') {
      remainingOperationalFunds -= resourceCost.amount
    } else {
      remainingBelongingUnits[resourceCost.belongingIdentifier] -= resourceCost.units
    }
  }
  return remainingOperationalFunds >= 0 && Object.values(remainingBelongingUnits).every((units) => units >= 0)
}

function doConfirmedEffectsCoverResourceCosts(confirmedEffects: ConfirmedEffect[], resourceCosts: ResourceCost[]): boolean {
  let uncoveredOperationalFunds = 0
  const uncoveredBelongingUnits = new Map<string, number>()
  for (const resourceCost of resourceCosts) {
    if (resourceCost.kind === 'operational_funds') {
      uncoveredOperationalFunds += resourceCost.amount
    } else {
      uncoveredBelongingUnits.set(
        resourceCost.belongingIdentifier,
        (uncoveredBelongingUnits.get(resourceCost.belongingIdentifier) ?? 0) + resourceCost.units,
      )
    }
  }
  for (const confirmedEffect of confirmedEffects) {
    if (confirmedEffect.kind === 'operational_funds_spent') {
      uncoveredOperationalFunds -= confirmedEffect.amount
    }
    if (confirmedEffect.kind === 'belonging_units_consumed') {
      uncoveredBelongingUnits.set(
        confirmedEffect.belongingIdentifier,
        (uncoveredBelongingUnits.get(confirmedEffect.belongingIdentifier) ?? 0) - confirmedEffect.units,
      )
    }
  }
  return uncoveredOperationalFunds <= 0 && [...uncoveredBelongingUnits.values()].every((units) => units <= 0)
}

type AppliedEffects = {
  investigator: InvestigatorState
  activeConditions: InvestigatorCondition[]
  knownPersonIdentifiers: string[]
  knownPersons: KnownJournalPerson[]
  journalUpdateCount: number
  lastSeriousWoundCauseText: string | null
  revealedFacts: RevealedFact[]
  effortRemaining: number
}

function applyConfirmedEffects(
  investigator: InvestigatorState,
  archiveRun: ArchiveRunState,
  confirmedEffects: ConfirmedEffect[],
): AppliedEffects | null {
  let nextInvestigator = investigator
  let activeConditions = archiveRun.activeConditions
  let knownPersonIdentifiers = archiveRun.knownPersonIdentifiers
  let knownPersons = archiveRun.knownPersons
  let journalUpdateCount = archiveRun.journalUpdateCount
  let lastSeriousWoundCauseText: string | null = null
  let revealedFacts = archiveRun.revealedFacts
  let effortRemaining = archiveRun.effortRemaining
  for (const confirmedEffect of confirmedEffects) {
    switch (confirmedEffect.kind) {
      case 'world_clock_advanced': {
        if (confirmedEffect.elapsedMinutes < 0 || confirmedEffect.resultingWorldClockMinutes < 0) {
          return null
        }
        nextInvestigator = { ...nextInvestigator, worldClockMinutes: confirmedEffect.resultingWorldClockMinutes }
        break
      }
      case 'place_changed':
        nextInvestigator = { ...nextInvestigator, placeName: confirmedEffect.resultingPlaceName }
        break
      case 'operational_funds_spent': {
        const resultingAmount = nextInvestigator.operationalFunds - confirmedEffect.amount
        if (confirmedEffect.amount < 0 || resultingAmount < 0 || resultingAmount !== confirmedEffect.resultingAmount) {
          return null
        }
        nextInvestigator = { ...nextInvestigator, operationalFunds: resultingAmount }
        break
      }
      case 'belonging_units_consumed': {
        const resultingUnits =
          (nextInvestigator.belongingUnits[confirmedEffect.belongingIdentifier] ?? 0) - confirmedEffect.units
        if (confirmedEffect.units < 0 || resultingUnits < 0 || resultingUnits !== confirmedEffect.resultingUnits) {
          return null
        }
        nextInvestigator = {
          ...nextInvestigator,
          belongingUnits: { ...nextInvestigator.belongingUnits, [confirmedEffect.belongingIdentifier]: resultingUnits },
        }
        break
      }
      case 'belonging_units_gained': {
        const resultingUnits =
          (nextInvestigator.belongingUnits[confirmedEffect.belongingIdentifier] ?? 0) + confirmedEffect.units
        if (confirmedEffect.units < 0 || resultingUnits !== confirmedEffect.resultingUnits) {
          return null
        }
        nextInvestigator = {
          ...nextInvestigator,
          belongingUnits: { ...nextInvestigator.belongingUnits, [confirmedEffect.belongingIdentifier]: resultingUnits },
        }
        break
      }
      case 'personal_funds_spent': {
        if (confirmedEffect.amount < 0 || confirmedEffect.amount > nextInvestigator.personalFunds) {
          return null
        }
        nextInvestigator = {
          ...nextInvestigator,
          personalFunds: nextInvestigator.personalFunds - confirmedEffect.amount,
        }
        break
      }
      case 'serious_wound_suffered': {
        const resultingSeriousWoundCount = Math.min(maximumSeriousWoundCount, nextInvestigator.seriousWoundsSuffered + 1)
        if (resultingSeriousWoundCount !== confirmedEffect.resultingSeriousWoundCount) {
          return null
        }
        nextInvestigator = { ...nextInvestigator, seriousWoundsSuffered: resultingSeriousWoundCount }
        lastSeriousWoundCauseText = confirmedEffect.perceptibleCauseText
        break
      }
      case 'condition_gained':
        activeConditions = [
          ...activeConditions.filter(
            (activeCondition) => activeCondition.conditionIdentifier !== confirmedEffect.condition.conditionIdentifier,
          ),
          confirmedEffect.condition,
        ]
        break
      case 'condition_ended':
        activeConditions = activeConditions.filter(
          (activeCondition) => activeCondition.conditionIdentifier !== confirmedEffect.conditionIdentifier,
        )
        break
      case 'person_became_known':
        if (!knownPersonIdentifiers.includes(confirmedEffect.personIdentifier)) {
          knownPersonIdentifiers = [...knownPersonIdentifiers, confirmedEffect.personIdentifier]
        }
        knownPersons = rememberKnownPerson(knownPersons, confirmedEffect.personIdentifier, confirmedEffect.visibleName)
        break
      case 'journal_updated':
        journalUpdateCount += 1
        break
      case 'effort_spent': {
        if (
          !Number.isInteger(confirmedEffect.amount) ||
          confirmedEffect.amount < 0 ||
          !Number.isInteger(confirmedEffect.resultingEffort) ||
          confirmedEffect.resultingEffort < 0 ||
          confirmedEffect.resultingEffort > maximumCaseEffort
        ) {
          return null
        }
        effortRemaining = confirmedEffect.resultingEffort
        break
      }
      case 'knowledge_gained':
        if (!revealedFacts.some((revealedFact) => revealedFact.factIdentifier === confirmedEffect.factIdentifier)) {
          revealedFacts = [
            ...revealedFacts,
            {
              factIdentifier: confirmedEffect.factIdentifier,
              visibleName: confirmedEffect.visibleName,
              sourcePieceIdentifier: confirmedEffect.sourcePieceIdentifier,
            },
          ]
        }
        break
      case 'perception_was_altered':
      case 'critical_failure_recorded':
        break
    }
  }
  return {
    investigator: nextInvestigator,
    activeConditions,
    knownPersonIdentifiers,
    knownPersons,
    journalUpdateCount,
    lastSeriousWoundCauseText,
    revealedFacts,
    effortRemaining,
  }
}

export function advancePendingActionPlan(
  pendingActionPlan: PendingActionPlan | null,
  confirmedTurn: ConfirmedArchiveTurn,
): PendingActionPlan | null {
  if (!pendingActionPlan || confirmedTurn.archiveOutcome) {
    return null
  }
  if (confirmedTurn.planStepDispositions.length === 0) {
    const isInteractivePieceAttempt = confirmedTurn.investigatorEntry.attemptedSteps.some(
      (attemptedStep) => attemptedStep.compositionOriginName === 'interactive_piece_attempt',
    )
    return isInteractivePieceAttempt ? pendingActionPlan : null
  }
  const dispositionNameByStepIdentifier = new Map<string, PlanStepDispositionName>()
  for (const planStepDisposition of confirmedTurn.planStepDispositions) {
    if (!dispositionNameByStepIdentifier.has(planStepDisposition.stepIdentifier)) {
      dispositionNameByStepIdentifier.set(planStepDisposition.stepIdentifier, planStepDisposition.dispositionName)
    }
  }
  let executedStepCount = pendingActionPlan.executedStepCount
  while (executedStepCount < pendingActionPlan.steps.length) {
    const dispositionName = dispositionNameByStepIdentifier.get(pendingActionPlan.steps[executedStepCount].stepIdentifier)
    if (dispositionName === 'left_pending') {
      break
    }
    executedStepCount += 1
  }
  return executedStepCount >= pendingActionPlan.steps.length
    ? null
    : { ...pendingActionPlan, executedStepCount }
}

function applyConfirmedTurn(
  reductionInput: ArchiveRunReductionInput,
  confirmedTurn: ConfirmedArchiveTurn,
): ArchiveRunReductionResult {
  const { archiveRun, investigator, personalizeDirectorText } = reductionInput
  const rejectedResult: ArchiveRunReductionResult = { archiveRun, investigator, wasTurnConfirmed: false }
  if (
    archiveRun.archiveOutcome !== null ||
    archiveRun.currentScenePresentation === null ||
    confirmedTurn.actionKey === archiveRun.lastConfirmedActionKey ||
    confirmedTurn.resultingStateVersion !== archiveRun.stateVersion + 1
  ) {
    return rejectedResult
  }
  if (
    !canInvestigatorAffordEveryResourceCost(investigator, confirmedTurn.resourceCosts) ||
    !doConfirmedEffectsCoverResourceCosts(confirmedTurn.confirmedEffects, confirmedTurn.resourceCosts)
  ) {
    return rejectedResult
  }
  const personalizedEffects = confirmedTurn.confirmedEffects.map((confirmedEffect) =>
    personalizeConfirmedEffect(confirmedEffect, personalizeDirectorText),
  )
  const appliedEffects = applyConfirmedEffects(investigator, archiveRun, personalizedEffects)
  if (!appliedEffects) {
    return rejectedResult
  }

  const personalizedRelationshipChanges = confirmedTurn.relationshipChanges.map((relationshipChange) => ({
    ...relationshipChange,
    perceptibleCauseText: personalizeDirectorText(relationshipChange.perceptibleCauseText),
  }))
  const relationshipPulses = personalizedRelationshipChanges.map(createRelationshipPulse)
  const sceneIdentifier = archiveRun.currentScenePresentation.sceneIdentifier

  let nextArchiveRun = appendLogEntries(archiveRun, [confirmedTurn.investigatorEntry], {
    turnIdentifier: confirmedTurn.turnIdentifier,
    sceneIdentifier,
    worldClockMinutes: investigator.worldClockMinutes,
  })
  const entriesAfterInvestigator: LogEntryContent[] = [
    ...confirmedTurn.directorEntries.map((directorEntry) =>
      personalizeDirectorSpokenEntry(directorEntry, personalizeDirectorText),
    ),
  ]
  if (personalizedEffects.length > 0) {
    entriesAfterInvestigator.push({ voice: 'consequence_receipt', confirmedEffects: personalizedEffects })
  }
  for (const relationshipPulse of relationshipPulses) {
    entriesAfterInvestigator.push({ voice: 'relationship_pulse', relationshipPulse })
  }
  for (const presentedInteractivePiece of confirmedTurn.presentedInteractivePieces) {
    entriesAfterInvestigator.push({
      voice: 'interactive_piece_anchor',
      interactivePieceIdentifier: presentedInteractivePiece.interactivePieceIdentifier,
    })
  }
  nextArchiveRun = appendLogEntries(nextArchiveRun, entriesAfterInvestigator, {
    turnIdentifier: confirmedTurn.turnIdentifier,
    sceneIdentifier,
    worldClockMinutes: appliedEffects.investigator.worldClockMinutes,
  })

  let archiveOutcome: ArchiveOutcome | null = confirmedTurn.archiveOutcome
    ? personalizeArchiveOutcome(confirmedTurn.archiveOutcome, personalizeDirectorText)
    : null
  const hasReachedFinalSeriousWound = appliedEffects.investigator.seriousWoundsSuffered >= maximumSeriousWoundCount
  if (hasReachedFinalSeriousWound && archiveOutcome?.kind !== 'chronicle_closed_by_death') {
    const fabricatedDeathOutcome: ChronicleClosedByDeathOutcome = {
      kind: 'chronicle_closed_by_death',
      deathNatureName: 'physical',
      deathCauseName: 'fifth_serious_wound',
      perceptibleCauseText: appliedEffects.lastSeriousWoundCauseText ?? '',
      epitaphRewriteText: null,
      intrusiveOptionText: null,
    }
    archiveOutcome = fabricatedDeathOutcome
  }

  const pendingActionPlan = archiveOutcome ? null : advancePendingActionPlan(archiveRun.pendingActionPlan, confirmedTurn)
  let unansweredDirectorQuestionEntryIdentifier: string | null = null
  if (confirmedTurn.planContinuationQuestion && pendingActionPlan) {
    nextArchiveRun = appendLogEntries(
      nextArchiveRun,
      [personalizeDirectorQuestion(confirmedTurn.planContinuationQuestion, personalizeDirectorText)],
      {
        turnIdentifier: confirmedTurn.turnIdentifier,
        sceneIdentifier,
        worldClockMinutes: appliedEffects.investigator.worldClockMinutes,
      },
    )
    unansweredDirectorQuestionEntryIdentifier = nextArchiveRun.logEntries[nextArchiveRun.logEntries.length - 1].identifier
  }

  const interactivePiecePublicDefinitions = { ...archiveRun.interactivePiecePublicDefinitions }
  const interactivePieceRuntimeStates = { ...archiveRun.interactivePieceRuntimeStates }
  for (const presentedInteractivePiece of confirmedTurn.presentedInteractivePieces) {
    const { interactivePieceIdentifier } = presentedInteractivePiece
    interactivePiecePublicDefinitions[interactivePieceIdentifier] = presentedInteractivePiece
    interactivePieceRuntimeStates[interactivePieceIdentifier] ??= {
      interactivePieceIdentifier,
      lifecycleStatusName: 'presented',
      workingValue: null,
      attempts: [],
      assistanceGiven: [],
      brokenReasonPublicText: null,
    }
  }
  for (const statusChange of confirmedTurn.interactivePieceStatusChanges) {
    const previousRuntimeState = interactivePieceRuntimeStates[statusChange.interactivePieceIdentifier]
    if (previousRuntimeState) {
      interactivePieceRuntimeStates[statusChange.interactivePieceIdentifier] = {
        ...previousRuntimeState,
        lifecycleStatusName: statusChange.resultingLifecycleStatusName,
        brokenReasonPublicText: statusChange.brokenReasonPublicText,
      }
    }
  }

  const nextScenePresentation = confirmedTurn.nextScenePresentation
  const visitedSceneIdentifiers =
    nextScenePresentation && !archiveRun.visitedSceneIdentifiers.includes(nextScenePresentation.sceneIdentifier)
      ? [...archiveRun.visitedSceneIdentifiers, nextScenePresentation.sceneIdentifier]
      : archiveRun.visitedSceneIdentifiers

  return {
    wasTurnConfirmed: true,
    investigator: appliedEffects.investigator,
    archiveRun: {
      ...nextArchiveRun,
      stateVersion: confirmedTurn.resultingStateVersion,
      lastConfirmedActionKey: confirmedTurn.actionKey,
      currentScenePresentation: nextScenePresentation ?? archiveRun.currentScenePresentation,
      visitedSceneIdentifiers,
      visitedPlaces: rememberVisitedPlace(
        archiveRun.visitedPlaces,
        (nextScenePresentation ?? archiveRun.currentScenePresentation)?.sceneIdentifier ?? '',
        appliedEffects.investigator.placeName ||
          (nextScenePresentation ?? archiveRun.currentScenePresentation)?.placeName ||
          '',
      ),
      witnessedOrigins: [
        ...archiveRun.witnessedOrigins,
        ...confirmedTurn.witnessedOriginIdentifiers.map((originIdentifier) => ({
          originIdentifier,
          placeName: appliedEffects.investigator.placeName,
          worldClockMinutes: appliedEffects.investigator.worldClockMinutes,
        })),
      ],
      livedExperienceFlagNames: [
        ...archiveRun.livedExperienceFlagNames,
        ...confirmedTurn.grantedLivedExperienceFlagNames.filter(
          (flagName) => !archiveRun.livedExperienceFlagNames.includes(flagName),
        ),
      ],
      relationshipChanges: [...archiveRun.relationshipChanges, ...personalizedRelationshipChanges],
      relationshipPulses: [...archiveRun.relationshipPulses, ...relationshipPulses],
      activeConditions: appliedEffects.activeConditions,
      knownPersonIdentifiers: appliedEffects.knownPersonIdentifiers,
      knownPersons: appliedEffects.knownPersons,
      lastSeriousWoundCauseText:
        appliedEffects.lastSeriousWoundCauseText ?? archiveRun.lastSeriousWoundCauseText,
      revealedFacts: appliedEffects.revealedFacts,
      heardLines: appendHeardLines(archiveRun.heardLines, confirmedTurn.heardLines),
      threatLines: appendHeardLines(archiveRun.threatLines, confirmedTurn.threatLines),
      completedObjectiveTexts: replaceCompletedObjectiveTexts(
        archiveRun.completedObjectiveTexts,
        confirmedTurn.completedObjectiveTexts,
      ),
      effortRemaining: appliedEffects.effortRemaining,
      belongingDefinitions: {
        ...archiveRun.belongingDefinitions,
        ...Object.fromEntries(
          personalizedEffects.flatMap((confirmedEffect) =>
            confirmedEffect.kind === 'belonging_units_gained' && confirmedEffect.visibleName
              ? [
                  [
                    confirmedEffect.belongingIdentifier,
                    { visibleName: confirmedEffect.visibleName },
                  ] as const,
                ]
              : [],
          ),
        ),
      },
      journalUpdateCount: appliedEffects.journalUpdateCount,
      interactivePiecePublicDefinitions,
      interactivePieceRuntimeStates,
      pendingActionPlan,
      unansweredDirectorQuestionEntryIdentifier,
      archiveOutcome,
    },
  }
}

function changeInteractivePieceRuntimeState(
  archiveRun: ArchiveRunState,
  interactivePieceIdentifier: string,
  changeRuntimeState: (runtimeState: InteractivePieceRuntimeState) => InteractivePieceRuntimeState,
): ArchiveRunState {
  const previousRuntimeState = archiveRun.interactivePieceRuntimeStates[interactivePieceIdentifier]
  if (
    !previousRuntimeState ||
    previousRuntimeState.lifecycleStatusName === 'resolved' ||
    previousRuntimeState.lifecycleStatusName === 'broken'
  ) {
    return archiveRun
  }
  return {
    ...archiveRun,
    interactivePieceRuntimeStates: {
      ...archiveRun.interactivePieceRuntimeStates,
      [interactivePieceIdentifier]: changeRuntimeState(previousRuntimeState),
    },
  }
}

export function reduceArchiveRunState(
  reductionInput: ArchiveRunReductionInput,
  stateChange: ArchiveRunStateChange,
): ArchiveRunReductionResult {
  const { archiveRun, investigator, personalizeDirectorText } = reductionInput
  const unchangedResult: ArchiveRunReductionResult = { archiveRun, investigator, wasTurnConfirmed: false }
  switch (stateChange.kind) {
    case 'archive_opened': {
      const {
        firstScenePresentation,
        openingEntries,
        initialRelationshipLevels,
        archiveTitle,
        archiveNumberLabel,
        belongingDefinitions,
      } = stateChange.archiveOpeningResolution
      const openedArchiveRun = appendLogEntries(
        {
          ...createInitialArchiveRunState(),
          archiveCaseIdentifier: stateChange.archiveOpeningResolution.archiveCaseIdentifier ?? null,
          archiveTitle,
          archiveNumberLabel,
          belongingDefinitions: Object.fromEntries(
            (belongingDefinitions ?? []).map((belongingDefinition) => [
              belongingDefinition.identifier,
              {
                visibleName: belongingDefinition.visibleName,
                visibleUnitDescription: belongingDefinition.visibleUnitDescription,
              },
            ]),
          ),
          currentScenePresentation: firstScenePresentation,
          visitedSceneIdentifiers: [firstScenePresentation.sceneIdentifier],
          visitedPlaces: rememberVisitedPlace(
            [],
            firstScenePresentation.sceneIdentifier,
            firstScenePresentation.placeName,
          ),
          relationshipChanges: initialRelationshipLevels,
        },
        openingEntries.map((openingEntry) => personalizeDirectorSpokenEntry(openingEntry, personalizeDirectorText)),
        {
          turnIdentifier: null,
          sceneIdentifier: firstScenePresentation.sceneIdentifier,
          worldClockMinutes: investigator.worldClockMinutes,
        },
      )
      return { archiveRun: openedArchiveRun, investigator, wasTurnConfirmed: false }
    }
    case 'archive_turn_confirmed':
      return applyConfirmedTurn(reductionInput, stateChange.confirmedTurn)
    case 'director_question_recorded': {
      if (archiveRun.archiveOutcome !== null || archiveRun.currentScenePresentation === null) {
        return unchangedResult
      }
      const archiveRunWithQuestion = appendLogEntries(
        archiveRun,
        [stateChange.investigatorEntry, personalizeDirectorQuestion(stateChange.questionEntry, personalizeDirectorText)],
        {
          turnIdentifier: null,
          sceneIdentifier: archiveRun.currentScenePresentation.sceneIdentifier,
          worldClockMinutes: investigator.worldClockMinutes,
        },
      )
      return {
        ...unchangedResult,
        archiveRun: {
          ...archiveRunWithQuestion,
          unansweredDirectorQuestionEntryIdentifier:
            archiveRunWithQuestion.logEntries[archiveRunWithQuestion.logEntries.length - 1].identifier,
        },
      }
    }
    case 'director_question_answered': {
      const answeredQuestionEntry = archiveRun.logEntries.find(
        (logEntry) => logEntry.identifier === stateChange.questionEntryIdentifier,
      )
      if (
        !answeredQuestionEntry ||
        answeredQuestionEntry.voice !== 'director_question' ||
        answeredQuestionEntry.answeredOptionIdentifier !== null
      ) {
        return unchangedResult
      }
      const chosenAnswerOption = answeredQuestionEntry.answerOptions.find(
        (answerOption) => answerOption.identifier === stateChange.answerOptionIdentifier,
      )
      if (!chosenAnswerOption) {
        return unchangedResult
      }
      return {
        ...unchangedResult,
        archiveRun: {
          ...archiveRun,
          logEntries: archiveRun.logEntries.map((logEntry) =>
            logEntry.identifier === answeredQuestionEntry.identifier && logEntry.voice === 'director_question'
              ? { ...logEntry, answeredOptionIdentifier: chosenAnswerOption.identifier }
              : logEntry,
          ),
          unansweredDirectorQuestionEntryIdentifier:
            archiveRun.unansweredDirectorQuestionEntryIdentifier === answeredQuestionEntry.identifier
              ? null
              : archiveRun.unansweredDirectorQuestionEntryIdentifier,
          pendingActionPlan:
            chosenAnswerOption.answerEffectName === 'discard_pending_plan' ? null : archiveRun.pendingActionPlan,
        },
      }
    }
    case 'action_plan_stored':
      return { ...unchangedResult, archiveRun: { ...archiveRun, pendingActionPlan: stateChange.pendingActionPlan } }
    case 'interactive_piece_working_value_changed':
      return {
        ...unchangedResult,
        archiveRun: changeInteractivePieceRuntimeState(
          archiveRun,
          stateChange.interactivePieceIdentifier,
          (runtimeState) => ({
            ...runtimeState,
            workingValue: stateChange.workingValue,
            lifecycleStatusName: 'in_progress',
          }),
        ),
      }
    case 'interactive_piece_attempt_confirmed': {
      const { attemptRecord, confirmedTurn } = stateChange.attemptResolution
      const turnResult = applyConfirmedTurn(reductionInput, confirmedTurn)
      if (!turnResult.wasTurnConfirmed) {
        return turnResult
      }
      const attemptedInteractivePieceIdentifier = stateChange.attemptResolution.interactivePieceIdentifier
      const runtimeStateReceivingAttempt = turnResult.archiveRun.interactivePieceRuntimeStates[attemptedInteractivePieceIdentifier]
      if (!runtimeStateReceivingAttempt || attemptRecord.countsAsAttempt === false) {
        return turnResult
      }
      return {
        ...turnResult,
        archiveRun: {
          ...turnResult.archiveRun,
          interactivePieceRuntimeStates: {
            ...turnResult.archiveRun.interactivePieceRuntimeStates,
            [attemptedInteractivePieceIdentifier]: {
              ...runtimeStateReceivingAttempt,
              attempts: [...runtimeStateReceivingAttempt.attempts, attemptRecord],
              lifecycleStatusName:
                runtimeStateReceivingAttempt.lifecycleStatusName === 'presented' ||
                runtimeStateReceivingAttempt.lifecycleStatusName === 'set_aside'
                  ? 'in_progress'
                  : runtimeStateReceivingAttempt.lifecycleStatusName,
            },
          },
        },
      }
    }
    case 'interactive_piece_assistance_confirmed':
      return {
        ...unchangedResult,
        archiveRun: changeInteractivePieceRuntimeState(
          archiveRun,
          stateChange.interactivePieceIdentifier,
          (runtimeState) => ({
            ...runtimeState,
            assistanceGiven: [...runtimeState.assistanceGiven.filter((record) => record.levelName !== stateChange.assistanceRecord.levelName), stateChange.assistanceRecord],
          }),
        ),
      }
    case 'interactive_piece_set_aside':
      return {
        ...unchangedResult,
        archiveRun: changeInteractivePieceRuntimeState(
          archiveRun,
          stateChange.interactivePieceIdentifier,
          (runtimeState) => ({ ...runtimeState, lifecycleStatusName: 'set_aside' }),
        ),
      }
  }
}

export function resolveStagingEventsOfConfirmedTurn(
  logEntries: readonly ArchiveLogEntry[],
  confirmedTurn: ConfirmedArchiveTurn,
): StagingEvent[] {
  const directorSpokenEntryIdentifiers = logEntries
    .filter(
      (logEntry) =>
        logEntry.turnIdentifier === confirmedTurn.turnIdentifier &&
        (logEntry.voice === 'director_narration' ||
          logEntry.voice === 'character_dialogue' ||
          logEntry.voice === 'inner_thought' ||
          logEntry.voice === 'system_notice'),
    )
    .map((logEntry) => logEntry.identifier)
  const resolvedStagingEvents: StagingEvent[] = []
  for (const serviceStagingEvent of confirmedTurn.stagingEvents) {
    if (serviceStagingEvent.kind === 'scene_changed') {
      resolvedStagingEvents.push(serviceStagingEvent)
      continue
    }
    const { anchorDirectorEntryIndex, ...remainingEventFields } = serviceStagingEvent
    const anchorLogEntryIdentifier = directorSpokenEntryIdentifiers[anchorDirectorEntryIndex]
    if (anchorLogEntryIdentifier) {
      resolvedStagingEvents.push({ ...remainingEventFields, anchorLogEntryIdentifier })
    }
  }
  return resolvedStagingEvents
}

export type TransitionalNarrationEntry = {
  identifier: string
  kind: 'director' | 'investigator' | 'notice' | 'clarification'
  paragraphs: string[]
}

export function projectTransitionalNarrationEntries(logEntries: readonly ArchiveLogEntry[]): TransitionalNarrationEntry[] {
  const projectedEntries: TransitionalNarrationEntry[] = []
  let openDirectorEntry: TransitionalNarrationEntry | null = null
  let openDirectorTurnIdentifier: string | null = null
  for (const logEntry of logEntries) {
    if (
      logEntry.voice === 'director_narration' ||
      logEntry.voice === 'character_dialogue' ||
      logEntry.voice === 'inner_thought'
    ) {
      if (openDirectorEntry && openDirectorTurnIdentifier === logEntry.turnIdentifier) {
        openDirectorEntry.paragraphs.push(...logEntry.markedParagraphs)
        continue
      }
      openDirectorEntry = { identifier: logEntry.identifier, kind: 'director', paragraphs: [...logEntry.markedParagraphs] }
      openDirectorTurnIdentifier = logEntry.turnIdentifier
      projectedEntries.push(openDirectorEntry)
      continue
    }
    if (logEntry.voice === 'consequence_receipt' || logEntry.voice === 'relationship_pulse' || logEntry.voice === 'interactive_piece_anchor') {
      continue
    }
    openDirectorEntry = null
    openDirectorTurnIdentifier = null
    if (logEntry.voice === 'investigator_entry') {
      projectedEntries.push({
        identifier: logEntry.identifier,
        kind: 'investigator',
        paragraphs: logEntry.attemptedSteps.map((attemptedStep) => attemptedStep.actionText),
      })
    } else if (logEntry.voice === 'system_notice') {
      projectedEntries.push({ identifier: logEntry.identifier, kind: 'notice', paragraphs: logEntry.plainParagraphs })
    } else {
      projectedEntries.push({ identifier: logEntry.identifier, kind: 'clarification', paragraphs: logEntry.plainParagraphs })
    }
  }
  return projectedEntries
}

import type {
  CharacterDialogueDeliveryName,
  ChronicleClosedByDeathOutcome,
  ConfirmedRelationshipChange,
  FalsifiableStatusFieldName,
  InnerThoughtOriginName,
  InteractivePieceLifecycleStatusName,
  InteractivePieceStatusChange,
  InvestigatorCondition,
  PerceivedPointOfInterest,
  PersonSilhouetteName,
  RelationshipDimensionName,
  ResourceCost,
  SceneTensionTierName,
  SuggestedActionGroupName,
} from '../../game_state/archive_turn_contract'

export type BranchCondition = {
  requiredLivedExperienceFlagNames: string[]
  forbiddenLivedExperienceFlagNames: string[]
  requiredInteractivePieceStatuses: Array<{
    interactivePieceIdentifier: string
    lifecycleStatusName: InteractivePieceLifecycleStatusName
  }>
  minimumRelationshipLevels: Array<{
    personIdentifier: string
    directionName: ConfirmedRelationshipChange['directionName']
    minimumLevel: number
  }>
  requiredActiveConditionIdentifiers: string[]
  minimumSeriousWoundCount: number
}

export type ScriptedDirectorEntry =
  | { voice: 'director_narration'; markedParagraphs: string[] }
  | {
      voice: 'character_dialogue'
      speakerPersonIdentifier: string
      deliveryName: CharacterDialogueDeliveryName
      markedParagraphs: string[]
    }
  | { voice: 'inner_thought'; thoughtOriginName: InnerThoughtOriginName; markedParagraphs: string[] }

export type ScriptedRelationshipChange = {
  personIdentifier: string
  directionName: ConfirmedRelationshipChange['directionName']
  dimensionName: RelationshipDimensionName | null
  levelChange: number
  perceptibleCauseText: string
}

export type ScriptedStagingEvent =
  | {
      kind: 'attack_received' | 'attack_delivered' | 'critical_failure' | 'anomaly_manifested'
      anchorEntryIndex: number
      anchorParagraphIndex: number
    }
  | {
      kind: 'mental_attack'
      anchorEntryIndex: number
      anchorParagraphIndex: number
      falsifiedStatusReading: { statusFieldName: FalsifiableStatusFieldName; falseVisibleText: string } | null
      rewrittenPastPhrase: { originalPhraseText: string; falsePhraseText: string } | null
    }

export type CaseBranchOutcome = {
  directorEntries: ScriptedDirectorEntry[]
  elapsedMinutes: number
  newPlaceName: string | null
  seriousWoundCauseText: string | null
  criticalFailureCauseText: string | null
  perceptionClarificationText: string | null
  conditionsGained: InvestigatorCondition[]
  conditionIdentifiersEnded: string[]
  personIdentifiersBecomingKnown: string[]
  relationshipChanges: ScriptedRelationshipChange[]
  stagingEvents: ScriptedStagingEvent[]
  grantedLivedExperienceFlagNames: string[]
  presentedInteractivePieceIdentifiers: string[]
  interactivePieceStatusChanges: InteractivePieceStatusChange[]
  shouldUpdateJournal: boolean
  additionalWitnessedOriginIdentifiers: string[]
  nextSceneIdentifier: string | null
  archiveEndingIdentifier: string | null
}

export type CaseActionBranch = {
  branchIdentifier: string
  visibleText: string
  actionGroupName: SuggestedActionGroupName
  resourceCost: ResourceCost | null
  visibilityCondition: BranchCondition | null
  isRepeatable: boolean
  freeTextIntentPatternSources: string[]
  conditionalOutcomes: Array<{ condition: BranchCondition; outcome: CaseBranchOutcome }>
  defaultOutcome: CaseBranchOutcome
  repeatedOutcome: CaseBranchOutcome | null
}

export type ScenePresentPersonDefinition = {
  personIdentifier: string
  presenceText: string
  presenceCondition: BranchCondition | null
}

export type CaseSceneDefinition = {
  sceneIdentifier: string
  placeName: string
  tensionTierName: SceneTensionTierName
  presentPersons: ScenePresentPersonDefinition[]
  perceivedPointsOfInterest: PerceivedPointOfInterest[]
  arrivalEntries: ScriptedDirectorEntry[]
  actionBranches: CaseActionBranch[]
  freeTextFallbackOutcome: CaseBranchOutcome
  interactivePieceSolvedOutcomes: Record<string, CaseBranchOutcome>
}

export type CasePersonDefinition = {
  personIdentifier: string
  knownName: string
  aliasBeforeNameIsKnown: string
  silhouetteName: PersonSilhouetteName
  initialLevelFromInvestigator: number
  initialLevelTowardInvestigator: number
}

export type CaseEndingDefinition = {
  endingIdentifier: string
  closingEntries: ScriptedDirectorEntry[]
  deathOutcome: ChronicleClosedByDeathOutcome | null
}

export function createBranchCondition(partialCondition: Partial<BranchCondition>): BranchCondition {
  return {
    requiredLivedExperienceFlagNames: [],
    forbiddenLivedExperienceFlagNames: [],
    requiredInteractivePieceStatuses: [],
    minimumRelationshipLevels: [],
    requiredActiveConditionIdentifiers: [],
    minimumSeriousWoundCount: 0,
    ...partialCondition,
  }
}

export function createCaseBranchOutcome(
  partialOutcome: Partial<CaseBranchOutcome> & Pick<CaseBranchOutcome, 'directorEntries' | 'elapsedMinutes'>,
): CaseBranchOutcome {
  return {
    newPlaceName: null,
    seriousWoundCauseText: null,
    criticalFailureCauseText: null,
    perceptionClarificationText: null,
    conditionsGained: [],
    conditionIdentifiersEnded: [],
    personIdentifiersBecomingKnown: [],
    relationshipChanges: [],
    stagingEvents: [],
    grantedLivedExperienceFlagNames: [],
    presentedInteractivePieceIdentifiers: [],
    interactivePieceStatusChanges: [],
    shouldUpdateJournal: true,
    additionalWitnessedOriginIdentifiers: [],
    nextSceneIdentifier: null,
    archiveEndingIdentifier: null,
    ...partialOutcome,
  }
}

export function createCaseActionBranch(
  partialBranch: Partial<CaseActionBranch> &
    Pick<CaseActionBranch, 'branchIdentifier' | 'visibleText' | 'actionGroupName' | 'freeTextIntentPatternSources' | 'defaultOutcome'>,
): CaseActionBranch {
  return {
    resourceCost: null,
    visibilityCondition: null,
    isRepeatable: false,
    conditionalOutcomes: [],
    repeatedOutcome: null,
    ...partialBranch,
  }
}

export function createNarrationEntry(...markedParagraphs: string[]): ScriptedDirectorEntry {
  return { voice: 'director_narration', markedParagraphs }
}

export function createDialogueEntry(
  speakerPersonIdentifier: string,
  deliveryName: CharacterDialogueDeliveryName,
  ...markedParagraphs: string[]
): ScriptedDirectorEntry {
  return { voice: 'character_dialogue', speakerPersonIdentifier, deliveryName, markedParagraphs }
}

export function createThoughtEntry(thoughtOriginName: InnerThoughtOriginName, ...markedParagraphs: string[]): ScriptedDirectorEntry {
  return { voice: 'inner_thought', thoughtOriginName, markedParagraphs }
}

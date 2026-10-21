import type {
  ArchiveBelongingDefinition,
  AssistanceLevelName,
  CharacterDialogueDeliveryName,
  ChronicleClosedByDeathOutcome,
  InnerThoughtOriginName,
  InteractivePiecePublicDefinition,
  InteractivePieceSubmittedValue,
  InvestigatorCondition,
  PerceivedPointOfInterest,
  PersonSilhouetteName,
  RelationshipDimensionName,
  RelationshipDirectionName,
  ResourceCost,
  SceneTensionTierName,
  ServiceStagingEvent,
  SuggestedActionGroupName,
} from '../../game_state/archive_turn_contract'

export const supportedDemoDecisionTreeFormatVersion = 1

export type DemoScriptedEntry =
  | { voice: 'director_narration'; markedParagraphs: string[] }
  | {
      voice: 'character_dialogue'
      speakerPersonIdentifier: string
      deliveryName: CharacterDialogueDeliveryName
      markedParagraphs: string[]
    }
  | { voice: 'inner_thought'; thoughtOriginName: InnerThoughtOriginName; markedParagraphs: string[] }

export type DemoNameConcealment = {
  concealedNameTexts: string[]
  replacementAtSentenceStart: string
  replacementInsideSentence: string
}

export type DemoPersonDefinition = {
  personIdentifier: string
  knownName: string
  aliasBeforeNameIsKnown: string
  silhouetteName: PersonSilhouetteName
  initialLevelFromInvestigator: number
  initialLevelTowardInvestigator: number
  isRelationshipEstablishedAtOpening: boolean
  openingRelationshipCauseText: string | null
  nameConcealment: DemoNameConcealment | null
}

export type DemoRelationshipChange = {
  personIdentifier: string
  directionName: RelationshipDirectionName
  dimensionName: RelationshipDimensionName | null
  levelChange: number
  perceptibleCauseText: string
}

export type DemoScriptedStagingEvent = Exclude<ServiceStagingEvent, { kind: 'scene_changed' }>

export type DemoOutcomeDestination =
  | { kind: 'stay_in_node' }
  | { kind: 'move_to_node'; nodeIdentifier: string }
  | { kind: 'close_archive'; endingIdentifier: string }

export type DemoOutcome = {
  directorEntries: DemoScriptedEntry[]
  elapsedMinutes: number
  grantedLivedExperienceFlagNames: string[]
  personIdentifiersBecomingKnown: string[]
  relationshipChanges: DemoRelationshipChange[]
  stagingEvents: DemoScriptedStagingEvent[]
  conditionsGained: InvestigatorCondition[]
  conditionIdentifiersEnded: string[]
  additionalWitnessedOriginIdentifiers: string[]
  perceptionClarificationText: string | null
  seriousWoundCauseText: string | null
  criticalFailureCauseText: string | null
  presentedInteractivePieceIdentifiers: string[]
  shouldUpdateJournal: boolean
  destination: DemoOutcomeDestination
}

export type DemoConditionalOutcome = {
  requiredLivedExperienceFlagNames: string[]
  forbiddenLivedExperienceFlagNames: string[]
  outcome: DemoOutcome
}

export type DemoActionDefinition = {
  actionIdentifier: string
  visibleText: string
  actionGroupName: SuggestedActionGroupName
  resourceCost: ResourceCost | null
  freeTextIntentPatternSources: string[]
  visibilityRequiredFlagNames: string[]
  visibilityForbiddenFlagNames: string[]
  outcome: DemoOutcome
  conditionalOutcomes: DemoConditionalOutcome[]
}

export type DemoPresentPersonDefinition = {
  personIdentifier: string
  presenceText: string
}

export type DemoPieceSolvedOutcome = {
  interactivePieceIdentifier: string
  outcome: DemoOutcome
}

export type DemoNodeDefinition = {
  nodeIdentifier: string
  sceneIdentifier: string
  placeName: string
  tensionTierName: SceneTensionTierName
  presentPersons: DemoPresentPersonDefinition[]
  perceivedPointsOfInterest: PerceivedPointOfInterest[]
  arrivalEntries: DemoScriptedEntry[]
  actionIdentifiers: string[]
  pieceSolvedOutcomes: DemoPieceSolvedOutcome[]
}

export type DemoPrivateRuleCheck =
  | { ruleKindName: 'exact_combination'; visibleRuleText: string }
  | { ruleKindName: 'exact_shift'; visibleRuleText: string }
  | { ruleKindName: 'piece_at_position'; pieceIdentifier: string; positionIndex: number; visibleRuleText: string }
  | { ruleKindName: 'piece_immediately_before'; pieceIdentifier: string; otherPieceIdentifier: string; visibleRuleText: string }
  | { ruleKindName: 'pieces_not_adjacent'; pieceIdentifier: string; otherPieceIdentifier: string; visibleRuleText: string }
  | { ruleKindName: 'piece_after'; pieceIdentifier: string; otherPieceIdentifier: string; visibleRuleText: string }

export type DemoInteractivePieceDefinition = {
  publicDefinition: InteractivePiecePublicDefinition
  privateSolution: InteractivePieceSubmittedValue
  privateRuleChecks: DemoPrivateRuleCheck[]
  failedAttemptNarrationParagraphs: string[]
  assistanceHintTextByLevelName: Record<AssistanceLevelName, string>
}

export type DemoEndingDefinition = {
  endingIdentifier: string
  closingEntries: DemoScriptedEntry[]
  deathOutcome: ChronicleClosedByDeathOutcome | null
}

export type DemoObjectiveDefinition = {
  objectiveIdentifier: string
  visibleText: string
  requiredLivedExperienceFlagNames: string[]
  forbiddenLivedExperienceFlagNames: string[]
}

export type DemoConditionalClosingEntry = {
  requiredLivedExperienceFlagNames: string[]
  entry: DemoScriptedEntry
}

export type DemoAliveClosingEpilogue = {
  placeName: string
  dawnWorldClockMinutes: number
  reportElapsedMinutes: number
  entries: DemoScriptedEntry[]
}

export type DemoEntropySignal = {
  signalFlagName: string
  minimumStateVersion: number
  markedParagraph: string
}

export type DemoDecisionTree = {
  treeFormatVersion: typeof supportedDemoDecisionTreeFormatVersion
  treeContentVersion: string
  sourceSpecificationPath: string
  whisperIdentifier: string
  archiveCaseIdentifier: string
  archiveTitle: string
  archiveNumberLabel: string
  fictionalDateLabel: string
  lostVoiceText: string
  openingNarrationParagraphs: string[]
  initialState: {
    firstNodeIdentifier: string
    worldClockMinutes: number
    operationalFunds: number
    belongingUnits: Record<string, number>
  }
  belongingDefinitions: ArchiveBelongingDefinition[]
  persons: DemoPersonDefinition[]
  actions: DemoActionDefinition[]
  nodes: DemoNodeDefinition[]
  interactivePieces: DemoInteractivePieceDefinition[]
  endings: DemoEndingDefinition[]
  objectives: DemoObjectiveDefinition[]
  aliveClosingEpilogue: DemoAliveClosingEpilogue
  entropySignals: DemoEntropySignal[]
  aliveEndingClosingEntries: DemoConditionalClosingEntry[]
}

import type { BelongingIdentifier, ResourceCost } from '../demonstration/demonstration_case_script'

export type { BelongingIdentifier, ResourceCost }

export const maximumPlanStepsExecutedPerDirectorBatch = 3

export type DirectorTurnPhaseName = 'idle' | 'weighing_action' | 'narrating'
export type DirectorWaitStageName = 'normal' | 'extended' | 'complicated' | 'retry_offered'
export type SceneTensionTierName = 'calm' | 'uneasy' | 'threatening' | 'lethal'
export type RelationshipDimensionName = 'kinship' | 'employment' | 'debt' | 'affection'
export type PersonSilhouetteName = 'close_figure' | 'seated_figure' | 'long_coat_figure' | 'capped_figure'

export type ArchiveLogVoiceName =
  | 'director_narration'
  | 'character_dialogue'
  | 'inner_thought'
  | 'system_notice'
  | 'director_question'
  | 'investigator_entry'
  | 'consequence_receipt'
  | 'interactive_piece_anchor'
  | 'relationship_pulse'

export type ArchiveLogEntryCommonFields = {
  identifier: string
  turnIdentifier: string | null
  sceneIdentifier: string
  worldClockMinutes: number
}

export type DirectorNarrationEntry = ArchiveLogEntryCommonFields & {
  voice: 'director_narration'
  markedParagraphs: string[]
}

export type CharacterDialogueDeliveryName = 'spoken' | 'whispered' | 'shouted' | 'heard_from_afar'

export type CharacterDialogueEntry = ArchiveLogEntryCommonFields & {
  voice: 'character_dialogue'
  speakerPersonIdentifier: string
  speakerVisibleName: string
  speakerSilhouetteName: PersonSilhouetteName
  deliveryName: CharacterDialogueDeliveryName
  markedParagraphs: string[]
}

export type InnerThoughtOriginName = 'own_reasoning' | 'legitimate_memory' | 'intrusive_perception'

export type InnerThoughtEntry = ArchiveLogEntryCommonFields & {
  voice: 'inner_thought'
  thoughtOriginName: InnerThoughtOriginName
  markedParagraphs: string[]
}

export type SystemNoticeKindName = 'demonstration_limit' | 'rule_reminder' | 'service_failure'

export type SystemNoticeEntry = ArchiveLogEntryCommonFields & {
  voice: 'system_notice'
  noticeKindName: SystemNoticeKindName
  plainParagraphs: string[]
}

export type DirectorQuestionKindName = 'method_clarification' | 'plan_continuation' | 'illogical_action_veto'

export type DirectorQuestionAnswerEffectName =
  | 'proceed_with_pending_action'
  | 'return_to_reply_desk'
  | 'continue_pending_plan'
  | 'modify_pending_plan'
  | 'discard_pending_plan'

export type DirectorQuestionAnswerOption = {
  identifier: string
  visibleText: string
  answerEffectName: DirectorQuestionAnswerEffectName
}

export type DirectorQuestionEntry = ArchiveLogEntryCommonFields & {
  voice: 'director_question'
  questionKindName: DirectorQuestionKindName
  plainParagraphs: string[]
  answerOptions: DirectorQuestionAnswerOption[]
  answeredOptionIdentifier: string | null
}

export type InvestigatorCompositionOriginName =
  | 'suggested_action'
  | 'edited_suggestion'
  | 'own_words'
  | 'interactive_piece_attempt'
  | 'director_question_answer'

export type InvestigatorEntryStep = {
  stepNumber: number
  actionText: string
  conditionText: string | null
  compositionOriginName: InvestigatorCompositionOriginName
}

export type InvestigatorEntry = ArchiveLogEntryCommonFields & {
  voice: 'investigator_entry'
  attemptedSteps: InvestigatorEntryStep[]
  declaredPlanStepCount: number | null
}

export type InvestigatorCondition = {
  conditionIdentifier: string
  visibleName: string
  originText: string
  effectText: string
  exitText: string
}

export type ConfirmedEffect =
  | { kind: 'world_clock_advanced'; elapsedMinutes: number; resultingWorldClockMinutes: number }
  | { kind: 'place_changed'; resultingPlaceName: string }
  | { kind: 'operational_funds_spent'; amount: number; resultingAmount: number }
  | { kind: 'belonging_units_consumed'; belongingIdentifier: BelongingIdentifier; units: number; resultingUnits: number }
  | {
      kind: 'belonging_units_gained'
      belongingIdentifier: BelongingIdentifier
      visibleName: string
      units: number
      resultingUnits: number
    }
  | { kind: 'personal_funds_spent'; amount: number }
  | { kind: 'serious_wound_suffered'; perceptibleCauseText: string; resultingSeriousWoundCount: number }
  | { kind: 'condition_gained'; condition: InvestigatorCondition }
  | { kind: 'condition_ended'; conditionIdentifier: string; visibleName: string }
  | { kind: 'person_became_known'; personIdentifier: string; visibleName: string }
  | { kind: 'journal_updated' }
  | { kind: 'knowledge_gained'; factIdentifier: string; visibleName: string; sourcePieceIdentifier: string }
  | { kind: 'effort_spent'; amount: number; resultingEffort: number }
  | { kind: 'perception_was_altered'; clarificationText: string }
  | { kind: 'critical_failure_recorded'; perceptibleCauseText: string }

export type ConsequenceReceiptEntry = ArchiveLogEntryCommonFields & {
  voice: 'consequence_receipt'
  confirmedEffects: ConfirmedEffect[]
}

export type RelationshipDirectionName = 'from_investigator' | 'toward_investigator_as_perceived'
export type RelationshipTendencyName = 'strengthens' | 'cools' | 'unchanged'
export type RelationshipQualitativeBandName = 'barely_known' | 'acquainted' | 'trusted' | 'close_ally' | 'unconditional'

export type ConfirmedRelationshipChange = {
  identifier: string
  personIdentifier: string
  personVisibleName: string
  personSilhouetteName: PersonSilhouetteName
  directionName: RelationshipDirectionName
  dimensionName: RelationshipDimensionName | null
  levelChange: number
  resultingLevel: number
  perceptibleCauseText: string
  fictionalDateLabel: string
}

export type RelationshipPulse = {
  identifier: string
  personIdentifier: string
  personVisibleName: string
  personSilhouetteName: PersonSilhouetteName
  directionName: RelationshipDirectionName
  dimensionName: RelationshipDimensionName | null
  tendencyName: RelationshipTendencyName
  resultingQualitativeBandName: RelationshipQualitativeBandName
  perceptibleCauseText: string
  fictionalDateLabel: string
}

export type RelationshipPulseEntry = ArchiveLogEntryCommonFields & {
  voice: 'relationship_pulse'
  relationshipPulse: RelationshipPulse
}

export type InteractivePieceAnchorEntry = ArchiveLogEntryCommonFields & {
  voice: 'interactive_piece_anchor'
  interactivePieceIdentifier: string
}

export type ArchiveLogEntry =
  | DirectorNarrationEntry
  | CharacterDialogueEntry
  | InnerThoughtEntry
  | SystemNoticeEntry
  | DirectorQuestionEntry
  | InvestigatorEntry
  | ConsequenceReceiptEntry
  | RelationshipPulseEntry
  | InteractivePieceAnchorEntry

export type DirectorSpokenEntry = DirectorNarrationEntry | CharacterDialogueEntry | InnerThoughtEntry | SystemNoticeEntry

type WithoutCommonFields<EntryShape> = EntryShape extends unknown
  ? Omit<EntryShape, keyof ArchiveLogEntryCommonFields>
  : never

export type DirectorSpokenEntryContent = WithoutCommonFields<DirectorSpokenEntry>
export type InvestigatorEntryContent = WithoutCommonFields<InvestigatorEntry>
export type DirectorQuestionEntryContent = WithoutCommonFields<DirectorQuestionEntry>

export type FalsifiableStatusFieldName = 'world_clock' | 'place_name'

export type FalsifiedStatusReading = { statusFieldName: FalsifiableStatusFieldName; falseVisibleText: string }

export type StagingEvent =
  | { kind: 'attack_received'; anchorLogEntryIdentifier: string; anchorParagraphIndex: number; causedSeriousWound: boolean }
  | { kind: 'attack_delivered'; anchorLogEntryIdentifier: string; anchorParagraphIndex: number }
  | { kind: 'critical_failure'; anchorLogEntryIdentifier: string; anchorParagraphIndex: number }
  | {
      kind: 'mental_attack'
      anchorLogEntryIdentifier: string
      anchorParagraphIndex: number
      falsifiedStatusReading: FalsifiedStatusReading | null
      rewrittenPastPhrase: { originalPhraseText: string; falsePhraseText: string } | null
    }
  | { kind: 'anomaly_manifested'; anchorLogEntryIdentifier: string; anchorParagraphIndex: number }
  | { kind: 'scene_changed'; resultingPlaceName: string }

export type ServiceStagingEvent =
  | { kind: 'attack_received'; anchorDirectorEntryIndex: number; anchorParagraphIndex: number; causedSeriousWound: boolean }
  | { kind: 'attack_delivered'; anchorDirectorEntryIndex: number; anchorParagraphIndex: number }
  | { kind: 'critical_failure'; anchorDirectorEntryIndex: number; anchorParagraphIndex: number }
  | {
      kind: 'mental_attack'
      anchorDirectorEntryIndex: number
      anchorParagraphIndex: number
      falsifiedStatusReading: FalsifiedStatusReading | null
      rewrittenPastPhrase: { originalPhraseText: string; falsePhraseText: string } | null
    }
  | { kind: 'anomaly_manifested'; anchorDirectorEntryIndex: number; anchorParagraphIndex: number }
  | { kind: 'scene_changed'; resultingPlaceName: string }

export type ScenePresentPerson = {
  personIdentifier: string
  visibleName: string
  isNameKnown: boolean
  silhouetteName: PersonSilhouetteName
  presenceText: string
}

export type PerceivedPointOfInterest = { identifier: string; visibleName: string }

export type SuggestedActionGroupName = 'speak' | 'examine' | 'use_or_spend' | 'move' | 'withdraw'

export type SuggestedInvestigatorAction = {
  identifier: string
  visibleText: string
  resourceCost: ResourceCost | null
  actionGroupName?: SuggestedActionGroupName
  hasBeenAttemptedBefore?: boolean
}

export type ArchiveScenePresentation = {
  sceneIdentifier: string
  placeName: string
  tensionTierName: SceneTensionTierName
  presentPersons: ScenePresentPerson[]
  perceivedPointsOfInterest: PerceivedPointOfInterest[]
  suggestedActions: SuggestedInvestigatorAction[]
  openInteractivePieceIdentifiers: string[]
}

export type InteractivePieceFamilyName =
  | 'logic'
  | 'fictional_cryptography'
  | 'spatial_mechanical'
  | 'temporal'
  | 'investigative'
  | 'social'
  | 'ritual'

export type InteractivePieceLifecycleStatusName = 'presented' | 'in_progress' | 'resolved' | 'set_aside' | 'broken'
export type AssistanceLevelName = 'gentle' | 'medium' | 'direct'

export type CipherWheelPublicState = {
  widgetKindName: 'cipher_wheel'
  alphabetLetters: string[]
  cipheredText: string
  wheelInscriptionText: string
}

export type OrderedPositionsPublicState = {
  widgetKindName: 'ordered_positions'
  pieces: Array<{ pieceIdentifier: string; visibleName: string; symbolName: string }>
  initialOrderPieceIdentifiers: string[]
  positionLabels: string[]
}

export type CombinationDialsPublicState = {
  widgetKindName: 'combination_dials'
  dials: Array<{ dialIdentifier: string; visibleLabel: string; symbols: string[] }>
}

export type InteractivePiecePublicState = CipherWheelPublicState | OrderedPositionsPublicState | CombinationDialsPublicState
export type InteractivePieceWidgetKindName = InteractivePiecePublicState['widgetKindName']

export type InteractivePiecePublicDefinition = {
  interactivePieceIdentifier: string
  familyName: InteractivePieceFamilyName
  visibleTitle: string
  diegeticPurposeText: string
  visibleRuleTexts: string[]
  publicState: InteractivePiecePublicState
  attemptElapsedMinutes: number
  isFreeTextAnswerAllowed: true
}

export type InteractivePieceSubmittedValue =
  | { widgetKindName: 'cipher_wheel'; shiftPositions: number }
  | { widgetKindName: 'ordered_positions'; orderedPieceIdentifiers: string[] }
  | { widgetKindName: 'combination_dials'; chosenSymbols: string[] }

export type InteractivePieceAttemptRecord = {
  attemptIdentifier: string
  turnIdentifier: string
  submittedValue: InteractivePieceSubmittedValue
  wasAccepted: boolean
  violatedVisibleRuleTexts: string[]
  countsAsAttempt?: boolean
}

export type InteractivePieceAssistanceRecord = {
  levelName: AssistanceLevelName
  publicHintText: string
}

export type InteractivePieceRuntimeState = {
  interactivePieceIdentifier: string
  lifecycleStatusName: InteractivePieceLifecycleStatusName
  workingValue: InteractivePieceSubmittedValue | null
  attempts: InteractivePieceAttemptRecord[]
  assistanceGiven: InteractivePieceAssistanceRecord[]
  brokenReasonPublicText: string | null
}

export type InteractivePieceStatusChange = {
  interactivePieceIdentifier: string
  resultingLifecycleStatusName: InteractivePieceLifecycleStatusName
  brokenReasonPublicText: string | null
}

export type ArchiveObjectiveResult = { visibleText: string; wasAchieved: boolean }
export type ArchivePerformanceRatingName = 'excellent' | 'satisfactory' | 'disappointing'
export type ChronicleDeathNatureName = 'physical' | 'psychological'
export type ChronicleDeathCauseName = 'critical_failure' | 'fifth_serious_wound'

export type ClosureRegister = {
  placeName: string
  visitedPlaceNames: string[]
  seriousWoundCount: number
  woundCauseText: string | null
  solvedPieceNames: string[]
}

export type ArchiveEndedAliveOutcome = {
  kind: 'archive_ended_alive'
  endingIdentifier: string
  performanceRatingName: ArchivePerformanceRatingName
  objectiveResults: ArchiveObjectiveResult[]
  countsAsSanctionedClosure: boolean
  closureRegister?: ClosureRegister
}

export type ChronicleClosedByDeathOutcome = {
  kind: 'chronicle_closed_by_death'
  deathNatureName: ChronicleDeathNatureName
  deathCauseName: ChronicleDeathCauseName
  perceptibleCauseText: string
  epitaphRewriteText: string | null
  intrusiveOptionText: string | null
}

export type ArchiveOutcome = ArchiveEndedAliveOutcome | ChronicleClosedByDeathOutcome

export type PlannedActionStep = {
  stepIdentifier: string
  actionText: string
  conditionText: string | null
  originSuggestedActionIdentifier: string | null
  wasTextEditedByPlayer: boolean
  declaredResourceCost: ResourceCost | null
}

export type PendingActionPlan = {
  steps: PlannedActionStep[]
  executedStepCount: number
}

export type PlanStepDispositionName = 'executed' | 'skipped_because_condition_was_unmet' | 'left_pending'

export type PlanStepDisposition = {
  stepIdentifier: string
  dispositionName: PlanStepDispositionName
}

export type InvestigatorActionRequest = {
  actionKey: string
  expectedStateVersion: number
  sceneIdentifier: string
  remainingPlanSteps: PlannedActionStep[]
  declaredPlanStepCount: number
  alreadyExecutedStepCount: number
  isPlayerInsistingAfterDirectorVeto: boolean
  referencedInteractivePieceIdentifier: string | null
}

export type RevealedFact = {
  factIdentifier: string
  visibleName: string
  sourcePieceIdentifier: string
}

export type WitnessedOriginRecord = {
  originIdentifier: string
  placeName: string
  worldClockMinutes: number
}

export type ConfirmedArchiveTurn = {
  turnIdentifier: string
  actionKey: string
  resultingStateVersion: number
  witnessedOriginIdentifiers: string[]
  investigatorEntry: InvestigatorEntryContent
  directorEntries: DirectorSpokenEntryContent[]
  planStepDispositions: PlanStepDisposition[]
  planContinuationQuestion: DirectorQuestionEntryContent | null
  resourceCosts: ResourceCost[]
  confirmedEffects: ConfirmedEffect[]
  relationshipChanges: ConfirmedRelationshipChange[]
  stagingEvents: ServiceStagingEvent[]
  presentedInteractivePieces: InteractivePiecePublicDefinition[]
  interactivePieceStatusChanges: InteractivePieceStatusChange[]
  grantedLivedExperienceFlagNames: string[]
  heardLines?: string[]
  threatLines?: string[]
  completedObjectiveTexts?: string[]
  nextScenePresentation: ArchiveScenePresentation | null
  archiveOutcome: ArchiveOutcome | null
}

export type DirectorTurnResolution =
  | {
      dispositionName: 'question_asked'
      investigatorEntry: InvestigatorEntryContent
      questionEntry: DirectorQuestionEntryContent
    }
  | { dispositionName: 'resolved'; confirmedTurn: ConfirmedArchiveTurn }
  | { dispositionName: 'service_failed'; isRetryPossible: boolean }

export type InteractivePieceAttemptRequest = {
  actionKey: string
  expectedStateVersion: number
  interactivePieceIdentifier: string
  submittedValue: InteractivePieceSubmittedValue
}

export type InteractivePieceAttemptResolution = {
  interactivePieceIdentifier: string
  attemptRecord: InteractivePieceAttemptRecord
  confirmedTurn: ConfirmedArchiveTurn
}

export type InteractivePieceAssistanceRequest = {
  actionKey: string
  expectedStateVersion: number
  interactivePieceIdentifier: string
  requestedLevelName: AssistanceLevelName
  isScopeLimitedToThisPieceConfirmed: true
}

export type ArchiveBelongingDefinition = {
  identifier: string
  visibleName: string
  visibleUnitDescription?: string
}

export type ArchiveOpeningResolution = {
  archiveCaseIdentifier?: string
  openingEntries: DirectorSpokenEntryContent[]
  firstScenePresentation: ArchiveScenePresentation
  initialRelationshipLevels: ConfirmedRelationshipChange[]
  archiveTitle: string
  archiveNumberLabel: string
  worldClockMinutes?: number
  operationalFunds?: number
  belongingUnits?: Record<string, number>
  seriousWoundCount?: number
  belongingDefinitions?: ArchiveBelongingDefinition[]
}

export type ReportDirectorTurnPhase = (directorTurnPhaseName: DirectorTurnPhaseName) => void

export interface ArchiveDirectorService {
  openArchive(whisperIdentifier: string): Promise<ArchiveOpeningResolution>
  resolveInvestigatorAction(
    actionRequest: InvestigatorActionRequest,
    reportDirectorTurnPhase: ReportDirectorTurnPhase,
  ): Promise<DirectorTurnResolution>
  attemptInteractivePiece(
    attemptRequest: InteractivePieceAttemptRequest,
    reportDirectorTurnPhase: ReportDirectorTurnPhase,
  ): Promise<InteractivePieceAttemptResolution>
  requestInteractivePieceAssistance(
    assistanceRequest: InteractivePieceAssistanceRequest,
  ): Promise<InteractivePieceAssistanceRecord>
}

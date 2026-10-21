import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { Dispatch, ReactNode } from 'react'
import { demonstrationArchive, initialInvestigatorState } from '../demonstration/demonstration_case_script'
import type { BelongingIdentifier, ResourceCost } from '../demonstration/demonstration_case_script'
import {
  archiveRunStateChangeKindNames,
  completeArchiveRunState,
  createInitialArchiveRunState,
  projectTransitionalNarrationEntries,
  reduceArchiveRunState,
} from './archive_run_state'
import type { ArchiveRunState, ArchiveRunStateChange, TransitionalNarrationEntry } from './archive_run_state'
import type { ArchivePerformanceRatingName } from './archive_turn_contract'
import { decodeGeneratedMarkupText } from '../game_service/generated_markup_text'
import { createChronicleSnapshotSynchroniser } from '../game_service/chronicle_snapshot_synchronisation'
import type { ChronicleSnapshotSynchroniser } from '../game_service/chronicle_snapshot_synchronisation'
import { refreshClosedChroniclesFromGameService, saveClosedChronicleInArchive } from './closed_chronicle_archive_storage'
import type { ChronicleClosureRecord } from './closed_chronicle_archive_storage'
import type { ChronicleChapter } from '../demonstration/chronicle_history_data'
import { retainClosedArchiveChapter } from './archive_chapters'

export type { ArchiveRunState, ArchiveRunStateChange } from './archive_run_state'
export type { ChronicleClosureRecord } from './closed_chronicle_archive_storage'

export type NarrationEntryKind = TransitionalNarrationEntry['kind']

export type NarrationEntry = TransitionalNarrationEntry

export type InvestigatorState = {
  investigatorName: string
  level: number
  seriousWoundsSuffered: number
  operationalFunds: number
  personalFunds: number
  belongingUnits: Record<BelongingIdentifier, number>
  placeName: string
  worldClockMinutes: number
}

export type InvestigatorGender = 'feminine' | 'masculine' | 'non_binary' | 'undisclosed'

export type RelationalAnchor =
  | { kind: 'person'; personName: string; bondDescription: string }
  | { kind: 'uprooted' }

export type InvestigatorRegistration = {
  fullName: string
  gender: InvestigatorGender
  birthDate: { day: number; month: number; year: number }
  originPlace: string
  residencePlace: string
  relationalAnchor: RelationalAnchor
}

export type OicnauStance = 'sanctioned_operative' | 'independent_ally' | 'refused_offer'

export type InvestigatorAttributeName = 'im' | 'if' | 'c' | 'o' | 'co' | 'm' | 's'

export type InvestigatorAttributes = Record<InvestigatorAttributeName, number>

export type InvestigatorProgression = {
  level: number
  unspentExperiencePoints: number
  lifetimeExperiencePoints: number
  resolvedArchiveCount: number
  personalFunds: number
  attributeImprovementCounts: Partial<Record<InvestigatorAttributeName, number>>
  investigatedWhisperIdentifiers: string[]
}

export type ChronicleModuleName =
  | 'character_dossier'
  | 'case_journal'
  | 'world_atlas'
  | 'sanctuary_home'
  | 'organizations_allies'

export type ChronicleState = {
  archiveChapters?: ChronicleChapter[]
  storageFormatVersion: number
  hasAiConfigurationBeenHandled: boolean
  aiConfiguration: unknown
  investigatorProgression: InvestigatorProgression
  moduleRecords: Partial<Record<ChronicleModuleName, unknown>>
  investigatorRegistration: InvestigatorRegistration | null
  investigatorAttributes: InvestigatorAttributes | null
  hasOriginNarrationBeenWitnessed: boolean
  hasThresholdNarrationBeenWitnessed: boolean
  oicnauStance: OicnauStance | null
  hasOicnauContactBeenConcluded: boolean
  chosenWhisperIdentifier: string | null
  confirmedTurnCount: number
  archiveRun: ArchiveRunState
  chronicleClosure: ChronicleClosureRecord | null
  narrationEntries: NarrationEntry[]
  investigator: InvestigatorState
  haveImprovementsBeenConfirmed: boolean
}

export type ChronicleStateChange =
  | ArchiveRunStateChange
  | { kind: 'archive_recovered'; recovery: Pick<ChronicleState, 'archiveRun' | 'investigator' | 'confirmedTurnCount'> }
  | { kind: 'chronicle_closure_sequence_witnessed' }
  | { kind: 'successor_chronicle_started' }
  | { kind: 'improvements_confirmed'; improvedAttributeNames: InvestigatorAttributeName[] }
  | { kind: 'ai_configuration_handled'; aiConfiguration: unknown }
  | { kind: 'personal_funds_spent'; amount: number }
  | { kind: 'module_record_saved'; moduleName: ChronicleModuleName; moduleRecord: unknown }
  | { kind: 'demonstration_restarted' }
  | { kind: 'archive_abandoned_for_new_whispers' }
  | { kind: 'registration_completed'; investigatorRegistration: InvestigatorRegistration }
  | { kind: 'evaluation_completed'; investigatorAttributes: InvestigatorAttributes }
  | { kind: 'evaluation_discarded' }
  | { kind: 'threshold_narration_witnessed' }
  | { kind: 'origin_narration_witnessed' }
  | { kind: 'oicnau_stance_chosen'; oicnauStance: OicnauStance }
  | { kind: 'oicnau_contact_concluded' }
  | { kind: 'chronicle_restored_from_game_service'; restoredChronicleState: ChronicleState }

export const chronicleStorageKey = 'the_void_files_demonstration_chronicle'
const lastActiveProfileIdentifierStorageKey = 'the_void_files_last_active_profile_identifier'
const currentStorageFormatVersion = 5

export const experienceGainedByPerformanceRatingName: Record<ArchivePerformanceRatingName, number> = {
  excellent: 30,
  satisfactory: 15,
  disappointing: 5,
}

export const personalRewardBaseByPerformanceRatingName: Record<ArchivePerformanceRatingName, number> = {
  excellent: 2000,
  satisfactory: 1000,
  disappointing: 100,
}

export function calculatePersonalRewardForClosedArchive(
  performanceRatingName: ArchivePerformanceRatingName,
  previouslyResolvedArchiveCount: number,
): number {
  return ((1 + previouslyResolvedArchiveCount) / 2) * personalRewardBaseByPerformanceRatingName[performanceRatingName]
}

export function calculateExperienceRequiredForNextLevel(level: number, resolvedArchiveCount: number): number {
  return (level + 10 + resolvedArchiveCount) * 2
}

export const operationalFundsByOicnauStance: Record<OicnauStance, number> = {
  sanctioned_operative: 1800,
  independent_ally: 900,
  refused_offer: 0,
}

export function createInitialChronicleState(): ChronicleState {
  return {
    storageFormatVersion: currentStorageFormatVersion,
    hasAiConfigurationBeenHandled: false,
    aiConfiguration: null,
    investigatorProgression: {
      level: 1,
      unspentExperiencePoints: 0,
      lifetimeExperiencePoints: 0,
      resolvedArchiveCount: 0,
      personalFunds: initialInvestigatorState.personalFunds,
      attributeImprovementCounts: {},
      investigatedWhisperIdentifiers: [],
    },
    moduleRecords: {},
    investigatorRegistration: null,
    investigatorAttributes: null,
    hasOriginNarrationBeenWitnessed: false,
    hasThresholdNarrationBeenWitnessed: false,
    oicnauStance: null,
    hasOicnauContactBeenConcluded: false,
    chosenWhisperIdentifier: null,
    confirmedTurnCount: 0,
    archiveRun: createInitialArchiveRunState(),
    chronicleClosure: null,
    narrationEntries: [],
    investigator: {
      ...initialInvestigatorState,
      belongingUnits: { ...initialInvestigatorState.belongingUnits },
    },
    haveImprovementsBeenConfirmed: false,
  }
}

function createChronicleStateKeepingInvestigatorIdentity(chronicleState: ChronicleState): ChronicleState {
  return {
    ...createInitialChronicleState(),
    hasAiConfigurationBeenHandled: chronicleState.hasAiConfigurationBeenHandled,
    aiConfiguration: chronicleState.aiConfiguration,
    investigatorProgression: chronicleState.investigatorProgression,
    moduleRecords: chronicleState.moduleRecords,
    archiveChapters: retainClosedArchiveChapter(chronicleState).archiveChapters,
    investigator: {
      ...initialInvestigatorState,
      belongingUnits: { ...chronicleState.investigator.belongingUnits },
      seriousWoundsSuffered: chronicleState.investigator.seriousWoundsSuffered,
      investigatorName: readInvestigatorShortName(chronicleState.investigatorRegistration),
    },
    investigatorRegistration: chronicleState.investigatorRegistration,
    investigatorAttributes: chronicleState.investigatorAttributes,
    hasOriginNarrationBeenWitnessed: chronicleState.hasOriginNarrationBeenWitnessed,
    hasThresholdNarrationBeenWitnessed: chronicleState.hasThresholdNarrationBeenWitnessed,
    oicnauStance: chronicleState.oicnauStance,
    hasOicnauContactBeenConcluded: chronicleState.hasOicnauContactBeenConcluded,
  }
}

function calculateAgeInYears(birthDate: InvestigatorRegistration['birthDate']): number {
  const today = new Date()
  const hasBirthdayPassedThisYear =
    today.getMonth() + 1 > birthDate.month || (today.getMonth() + 1 === birthDate.month && today.getDate() >= birthDate.day)
  return today.getFullYear() - birthDate.year - (hasBirthdayPassedThisYear ? 0 : 1)
}

const spanishMonthNames = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

export function readInvestigatorShortName(investigatorRegistration: InvestigatorRegistration | null): string {
  const firstWordOfName = investigatorRegistration?.fullName.trim().split(/\s+/)[0]
  return firstWordOfName && firstWordOfName.length > 0 ? firstWordOfName : initialInvestigatorState.investigatorName
}

export function personalizeNarrativeText(
  narrativeText: string,
  investigatorRegistration: InvestigatorRegistration | null,
): string {
  const fullName = investigatorRegistration?.fullName.trim() || initialInvestigatorState.investigatorName
  return decodeGeneratedMarkupText(narrativeText)
    .replaceAll('{{nombre_completo}}', fullName)
    .replaceAll('{{nombre}}', readInvestigatorShortName(investigatorRegistration))
    .replaceAll('{{residencia}}', investigatorRegistration?.residencePlace.trim() || 'una ciudad cualquiera')
    .replaceAll('{{origen}}', investigatorRegistration?.originPlace.trim() || 'un lugar sin importancia')
    .replaceAll('{{edad}}', investigatorRegistration ? String(calculateAgeInYears(investigatorRegistration.birthDate)) : 'treinta')
    .replaceAll(
      '{{fecha_nacimiento}}',
      investigatorRegistration
        ? `${investigatorRegistration.birthDate.day} de ${spanishMonthNames[investigatorRegistration.birthDate.month - 1]} de ${investigatorRegistration.birthDate.year}`
        : 'día cualquiera',
    )
    .replaceAll(
      '{{ancla_nombre}}',
      investigatorRegistration?.relationalAnchor.kind === 'person' ? investigatorRegistration.relationalAnchor.personName : '',
    )
    .replaceAll(
      '{{ancla_vinculo}}',
      investigatorRegistration?.relationalAnchor.kind === 'person'
        ? investigatorRegistration.relationalAnchor.bondDescription
        : '',
    )
}

export function canInvestigatorAffordResourceCost(
  investigator: InvestigatorState,
  resourceCost: ResourceCost | null | undefined,
): boolean {
  if (!resourceCost) {
    return true
  }
  if (resourceCost.kind === 'operational_funds') {
    return investigator.operationalFunds >= resourceCost.amount
  }
  return investigator.belongingUnits[resourceCost.belongingIdentifier] >= resourceCost.units
}

function isArchiveRunStateChange(stateChange: ChronicleStateChange): stateChange is ArchiveRunStateChange {
  return (archiveRunStateChangeKindNames as readonly string[]).includes(stateChange.kind)
}

function createChronicleClosureRecord(chronicleState: ChronicleState): ChronicleClosureRecord | null {
  const { archiveOutcome } = chronicleState.archiveRun
  if (archiveOutcome?.kind !== 'chronicle_closed_by_death') {
    return null
  }
  const investigatorFullName =
    chronicleState.investigatorRegistration?.fullName.trim() || chronicleState.investigator.investigatorName
  return {
    closureIdentifier: [
      investigatorFullName,
      chronicleState.investigatorProgression.resolvedArchiveCount,
      chronicleState.archiveRun.stateVersion,
      chronicleState.investigator.worldClockMinutes,
    ].join('_'),
    deathNatureName: archiveOutcome.deathNatureName,
    deathCauseName: archiveOutcome.deathCauseName,
    perceptibleCauseText: archiveOutcome.perceptibleCauseText,
    epitaphRewriteText: archiveOutcome.epitaphRewriteText,
    intrusiveOptionText: archiveOutcome.intrusiveOptionText,
    investigatorFullName,
    level: chronicleState.investigatorProgression.level,
    resolvedArchiveCount: chronicleState.investigatorProgression.resolvedArchiveCount,
    investigatedWhisperCount: chronicleState.investigatorProgression.investigatedWhisperIdentifiers.length,
    archiveNumberLabel: chronicleState.archiveRun.archiveNumberLabel ?? demonstrationArchive.archiveNumberLabel,
    archiveTitle: chronicleState.archiveRun.archiveTitle ?? demonstrationArchive.archiveTitle,
    placeName: chronicleState.investigator.placeName,
    worldClockMinutes: chronicleState.investigator.worldClockMinutes,
    seriousWoundsSuffered: chronicleState.investigator.seriousWoundsSuffered,
    confirmedTurnCountInLastArchive: chronicleState.confirmedTurnCount,
    conservedClueCount: chronicleState.archiveRun.journalUpdateCount,
    conservedKnownPersonCount: chronicleState.archiveRun.knownPersonIdentifiers.length,
    hasClosureSequenceBeenWitnessed: false,
  }
}

function reduceArchiveRunWithinChronicle(
  chronicleState: ChronicleState,
  stateChange: ArchiveRunStateChange,
): ChronicleState {
  let startingChronicleState = chronicleState
  if (stateChange.kind === 'archive_opened') {
    const identityPreservingState = createChronicleStateKeepingInvestigatorIdentity(chronicleState)
    startingChronicleState = {
      ...identityPreservingState,
      chosenWhisperIdentifier: stateChange.whisperIdentifier,
      investigator: {
        ...identityPreservingState.investigator,
        belongingUnits: stateChange.archiveOpeningResolution.belongingUnits ?? identityPreservingState.investigator.belongingUnits,
        seriousWoundsSuffered: stateChange.archiveOpeningResolution.seriousWoundCount ?? identityPreservingState.investigator.seriousWoundsSuffered,
        level: chronicleState.investigatorProgression.level,
        personalFunds: chronicleState.investigatorProgression.personalFunds,
        operationalFunds:
          stateChange.archiveOpeningResolution.operationalFunds ??
          operationalFundsByOicnauStance[chronicleState.oicnauStance ?? 'sanctioned_operative'],
        placeName: stateChange.archiveOpeningResolution.firstScenePresentation.placeName,
        worldClockMinutes:
          stateChange.archiveOpeningResolution.worldClockMinutes ?? identityPreservingState.investigator.worldClockMinutes,
      },
    }
  } else if (chronicleState.chosenWhisperIdentifier === null) {
    return chronicleState
  }
  const reductionResult = reduceArchiveRunState(
    {
      archiveRun: startingChronicleState.archiveRun,
      investigator: startingChronicleState.investigator,
      personalizeDirectorText: (directorText) =>
        personalizeNarrativeText(directorText, startingChronicleState.investigatorRegistration),
    },
    stateChange,
  )
  if (
    reductionResult.archiveRun === startingChronicleState.archiveRun &&
    reductionResult.investigator === startingChronicleState.investigator &&
    startingChronicleState === chronicleState
  ) {
    return chronicleState
  }
  const chronicleStateAfterArchiveChange: ChronicleState = {
    ...startingChronicleState,
    archiveRun: reductionResult.archiveRun,
    investigator: reductionResult.investigator,
    confirmedTurnCount: startingChronicleState.confirmedTurnCount + (reductionResult.wasTurnConfirmed ? 1 : 0),
    narrationEntries:
      reductionResult.archiveRun.logEntries === startingChronicleState.archiveRun.logEntries
        ? startingChronicleState.narrationEntries
        : projectTransitionalNarrationEntries(reductionResult.archiveRun.logEntries),
  }
  return retainClosedArchiveChapter({
    ...chronicleStateAfterArchiveChange,
    chronicleClosure: createChronicleClosureRecord(chronicleStateAfterArchiveChange),
  })
}

export function reduceChronicleState(
  chronicleState: ChronicleState,
  stateChange: ChronicleStateChange,
): ChronicleState {
  if (stateChange.kind === 'archive_recovered') {
    const recovered = { ...chronicleState, ...stateChange.recovery }
    return retainClosedArchiveChapter({ ...recovered, narrationEntries: projectTransitionalNarrationEntries(recovered.archiveRun.logEntries), chronicleClosure: chronicleState.chronicleClosure ?? createChronicleClosureRecord(recovered) })
  }
  if (stateChange.kind === 'chronicle_restored_from_game_service') {
    return {
      ...stateChange.restoredChronicleState,
      archiveRun: completeArchiveRunState(stateChange.restoredChronicleState.archiveRun),
    }
  }
  if (chronicleState.chronicleClosure !== null) {
    if (stateChange.kind === 'chronicle_closure_sequence_witnessed') {
      return {
        ...chronicleState,
        chronicleClosure: { ...chronicleState.chronicleClosure, hasClosureSequenceBeenWitnessed: true },
      }
    }
    if (stateChange.kind === 'successor_chronicle_started') {
      return {
        ...createInitialChronicleState(),
        hasAiConfigurationBeenHandled: chronicleState.hasAiConfigurationBeenHandled,
        aiConfiguration: chronicleState.aiConfiguration,
      }
    }
    return stateChange.kind === 'demonstration_restarted' ? createInitialChronicleState() : chronicleState
  }
  if (isArchiveRunStateChange(stateChange)) {
    return reduceArchiveRunWithinChronicle(chronicleState, stateChange)
  }
  switch (stateChange.kind) {
    case 'chronicle_closure_sequence_witnessed':
    case 'successor_chronicle_started':
      return chronicleState
    case 'improvements_confirmed': {
      const { archiveOutcome } = chronicleState.archiveRun
      if (chronicleState.haveImprovementsBeenConfirmed || archiveOutcome?.kind !== 'archive_ended_alive') {
        return chronicleState
      }
      const previousProgression = chronicleState.investigatorProgression
      const experienceGained = experienceGainedByPerformanceRatingName[archiveOutcome.performanceRatingName]
      const resolvedArchiveCountAfterClosure =
        previousProgression.resolvedArchiveCount + (archiveOutcome.countsAsSanctionedClosure ? 1 : 0)
      const experienceRequired = calculateExperienceRequiredForNextLevel(
        previousProgression.level,
        resolvedArchiveCountAfterClosure,
      )
      const experienceAfterReward = previousProgression.unspentExperiencePoints + experienceGained
      const hasReachedNextLevel = experienceAfterReward >= experienceRequired
      const attributeImprovementCounts = { ...previousProgression.attributeImprovementCounts }
      const improvedAttributes = chronicleState.investigatorAttributes
        ? { ...chronicleState.investigatorAttributes }
        : null
      if (hasReachedNextLevel) {
        for (const improvedAttributeName of stateChange.improvedAttributeNames) {
          attributeImprovementCounts[improvedAttributeName] =
            (attributeImprovementCounts[improvedAttributeName] ?? 0) + 1
          if (improvedAttributes) {
            improvedAttributes[improvedAttributeName] = Math.min(50, improvedAttributes[improvedAttributeName] + 1)
          }
        }
      }
      return {
        ...chronicleState,
        haveImprovementsBeenConfirmed: true,
        investigatorAttributes: improvedAttributes,
        investigatorProgression: {
          level: previousProgression.level + (hasReachedNextLevel ? 1 : 0),
          unspentExperiencePoints: hasReachedNextLevel ? experienceAfterReward - experienceRequired : experienceAfterReward,
          lifetimeExperiencePoints: previousProgression.lifetimeExperiencePoints + experienceGained,
          resolvedArchiveCount: resolvedArchiveCountAfterClosure,
          personalFunds:
            chronicleState.investigator.personalFunds +
            (archiveOutcome.countsAsSanctionedClosure
              ? calculatePersonalRewardForClosedArchive(
                  archiveOutcome.performanceRatingName,
                  previousProgression.resolvedArchiveCount,
                )
              : 0),
          attributeImprovementCounts,
          investigatedWhisperIdentifiers: chronicleState.chosenWhisperIdentifier
            ? [...previousProgression.investigatedWhisperIdentifiers, chronicleState.chosenWhisperIdentifier]
            : previousProgression.investigatedWhisperIdentifiers,
        },
      }
    }
    case 'personal_funds_spent':
      if (
        !Number.isFinite(stateChange.amount) ||
        stateChange.amount <= 0 ||
        stateChange.amount > chronicleState.investigatorProgression.personalFunds ||
        chronicleState.chosenWhisperIdentifier !== null
      ) {
        return chronicleState
      }
      return {
        ...chronicleState,
        investigatorProgression: {
          ...chronicleState.investigatorProgression,
          personalFunds: chronicleState.investigatorProgression.personalFunds - stateChange.amount,
        },
      }
    case 'ai_configuration_handled':
      return { ...chronicleState, hasAiConfigurationBeenHandled: true, aiConfiguration: stateChange.aiConfiguration }
    case 'module_record_saved':
      return {
        ...chronicleState,
        moduleRecords: { ...chronicleState.moduleRecords, [stateChange.moduleName]: stateChange.moduleRecord },
      }
    case 'demonstration_restarted':
      return createInitialChronicleState()
    case 'archive_abandoned_for_new_whispers':
      return createChronicleStateKeepingInvestigatorIdentity(chronicleState)
    case 'registration_completed':
      return { ...chronicleState, investigatorRegistration: stateChange.investigatorRegistration }
    case 'evaluation_completed':
      return { ...chronicleState, investigatorAttributes: stateChange.investigatorAttributes }
    case 'evaluation_discarded':
      return { ...chronicleState, investigatorAttributes: null }
    case 'threshold_narration_witnessed':
      return { ...chronicleState, hasThresholdNarrationBeenWitnessed: true }
    case 'origin_narration_witnessed':
      return { ...chronicleState, hasOriginNarrationBeenWitnessed: true }
    case 'oicnau_stance_chosen':
      return { ...chronicleState, oicnauStance: stateChange.oicnauStance }
    case 'oicnau_contact_concluded':
      return { ...chronicleState, hasOicnauContactBeenConcluded: true }
  }
}

export function isStoredChronicleStateUsable(candidate: unknown): candidate is ChronicleState {
  if (typeof candidate !== 'object' || candidate === null) {
    return false
  }
  const possibleChronicleState = candidate as Partial<ChronicleState>
  return (
    possibleChronicleState.storageFormatVersion === currentStorageFormatVersion &&
    Array.isArray(possibleChronicleState.narrationEntries) &&
    typeof possibleChronicleState.archiveRun === 'object' &&
    possibleChronicleState.archiveRun !== null &&
    Array.isArray(possibleChronicleState.archiveRun.logEntries) &&
    typeof possibleChronicleState.investigator === 'object' &&
    possibleChronicleState.investigator !== null &&
    typeof possibleChronicleState.investigatorProgression === 'object' &&
    possibleChronicleState.investigatorProgression !== null
  )
}

function buildChronicleStorageKey(activeProfileIdentifier: string | null): string {
  return activeProfileIdentifier === null ? chronicleStorageKey : `${chronicleStorageKey}_${activeProfileIdentifier}`
}

function readLastActiveProfileIdentifier(): string | null {
  try {
    return window.sessionStorage.getItem(lastActiveProfileIdentifierStorageKey) || null
  } catch {
    return null
  }
}

function rememberLastActiveProfileIdentifier(activeProfileIdentifier: string | null) {
  try {
    if (activeProfileIdentifier === null) {
      window.sessionStorage.removeItem(lastActiveProfileIdentifierStorageKey)
    } else {
      window.sessionStorage.setItem(lastActiveProfileIdentifierStorageKey, activeProfileIdentifier)
    }
  } catch {
    return
  }
}

function readStoredChronicleState(): ChronicleState {
  try {
    const storedText =
      window.sessionStorage.getItem(buildChronicleStorageKey(readLastActiveProfileIdentifier())) ??
      window.sessionStorage.getItem(chronicleStorageKey)
    if (!storedText) {
      return createInitialChronicleState()
    }
    const parsedCandidate: unknown = JSON.parse(storedText)
    return isStoredChronicleStateUsable(parsedCandidate)
      ? { ...parsedCandidate, archiveRun: completeArchiveRunState(parsedCandidate.archiveRun) }
      : createInitialChronicleState()
  } catch {
    return createInitialChronicleState()
  }
}

type ChronicleStateContextValue = {
  chronicleState: ChronicleState
  changeChronicleState: Dispatch<ChronicleStateChange>
  isDemonstrationArchiveFinished: boolean
}

const ChronicleStateContext = createContext<ChronicleStateContextValue | null>(null)

let latestChronicleState: ChronicleState | null = null

export function readLatestChronicleState(): ChronicleState {
  latestChronicleState ??= readStoredChronicleState()
  return latestChronicleState
}

export function ChronicleStateProvider({ children }: { children: ReactNode }) {
  const [chronicleState, changeChronicleState] = useReducer(
    reduceChronicleState,
    undefined,
    readStoredChronicleState,
  )

  const [activeChronicleStorageKey, setActiveChronicleStorageKey] = useState(() =>
    buildChronicleStorageKey(readLastActiveProfileIdentifier()),
  )
  const chronicleSnapshotSynchroniser = useRef<ChronicleSnapshotSynchroniser<ChronicleState> | null>(null)

  useEffect(() => {
    latestChronicleState = chronicleState
    chronicleSnapshotSynchroniser.current?.noteChronicleStateChanged(chronicleState)
    try {
      window.sessionStorage.setItem(activeChronicleStorageKey, JSON.stringify(chronicleState))
    } catch {
      return
    }
  }, [chronicleState, activeChronicleStorageKey])

  useEffect(() => {
    const startedSynchroniser = createChronicleSnapshotSynchroniser<ChronicleState>({
      initialChronicleState: readLatestChronicleState(),
      readLatestChronicleState,
      isChronicleStateUsable: isStoredChronicleStateUsable,
      whenActiveProfileIsResolved: (activeProfileIdentifier) => {
        rememberLastActiveProfileIdentifier(activeProfileIdentifier)
        setActiveChronicleStorageKey(buildChronicleStorageKey(activeProfileIdentifier))
        if (activeProfileIdentifier !== null) {
          void refreshClosedChroniclesFromGameService(activeProfileIdentifier)
        }
      },
      restoreChronicleState: (restoredChronicleState) =>
        changeChronicleState({ kind: 'chronicle_restored_from_game_service', restoredChronicleState }),
      whenSnapshotWasSaved: (activeProfileIdentifier, savedChronicleState) => {
        if (savedChronicleState.chronicleClosure !== null) {
          void refreshClosedChroniclesFromGameService(activeProfileIdentifier)
        }
      },
    })
    chronicleSnapshotSynchroniser.current = startedSynchroniser
    startedSynchroniser.start()
    return () => {
      startedSynchroniser.stop()
      chronicleSnapshotSynchroniser.current = null
    }
  }, [])

  useEffect(() => {
    if (chronicleState.chronicleClosure) {
      saveClosedChronicleInArchive(chronicleState.chronicleClosure)
    }
  }, [chronicleState.chronicleClosure])

  const contextValue = useMemo(
    () => ({
      chronicleState,
      changeChronicleState,
      isDemonstrationArchiveFinished:
        chronicleState.chosenWhisperIdentifier !== null &&
        chronicleState.archiveRun.archiveOutcome?.kind === 'archive_ended_alive',
    }),
    [chronicleState],
  )

  return <ChronicleStateContext.Provider value={contextValue}>{children}</ChronicleStateContext.Provider>
}

export function useChronicleState(): ChronicleStateContextValue {
  const contextValue = useContext(ChronicleStateContext)
  if (!contextValue) {
    throw new Error('useChronicleState requires ChronicleStateProvider')
  }
  return contextValue
}

export function formatWorldClock(worldClockMinutes: number): string {
  const minutesInDay = 24 * 60
  const normalizedMinutes = ((worldClockMinutes % minutesInDay) + minutesInDay) % minutesInDay
  const hours = Math.floor(normalizedMinutes / 60)
  const minutes = normalizedMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

const amountFormatter = new Intl.NumberFormat('es-419', { maximumFractionDigits: 0 })

export function formatAmount(amount: number): string {
  return amountFormatter.format(amount).replace(/,/g, '\u00a0')
}

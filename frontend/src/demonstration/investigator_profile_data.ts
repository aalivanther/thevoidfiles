import type { ChronicleClosureRecord, ChronicleState } from '../game_state/chronicle_state'

export type ProfileConnectionIdentifier = 'narrative_intelligence' | 'voice_intelligence'

export type ProfileConnectionStateName = 'connected' | 'demonstration' | 'not_configured' | 'unavailable'

export type ProfileConnection = {
  connectionIdentifier: ProfileConnectionIdentifier
  providerName: string | null
  optionName: string | null
  maskedAccessKeyEnding: string | null
  connectionStateName: ProfileConnectionStateName
}

export type LocalServiceIdentifier =
  | 'chronicle_storage'
  | 'director_engine'
  | 'browser_speech'
  | 'sound_library'

export type LocalServiceDefinition = {
  serviceIdentifier: LocalServiceIdentifier
  demonstrationStateName: ProfileConnectionStateName
  isVerifiedAgainstThisDevice: boolean
}

export const localServiceDefinitions: readonly LocalServiceDefinition[] = [
  { serviceIdentifier: 'chronicle_storage', demonstrationStateName: 'connected', isVerifiedAgainstThisDevice: true },
  { serviceIdentifier: 'director_engine', demonstrationStateName: 'demonstration', isVerifiedAgainstThisDevice: false },
  { serviceIdentifier: 'browser_speech', demonstrationStateName: 'connected', isVerifiedAgainstThisDevice: true },
  { serviceIdentifier: 'sound_library', demonstrationStateName: 'connected', isVerifiedAgainstThisDevice: false },
]

export const shortestSimulatedConnectionCheckMilliseconds = 1100
export const longestSimulatedConnectionCheckMilliseconds = 2300

export const demonstrationNarrativeConnection: ProfileConnection = {
  connectionIdentifier: 'narrative_intelligence',
  providerName: null,
  optionName: null,
  maskedAccessKeyEnding: null,
  connectionStateName: 'demonstration',
}

export const demonstrationVoiceConnection: ProfileConnection = {
  connectionIdentifier: 'voice_intelligence',
  providerName: null,
  optionName: null,
  maskedAccessKeyEnding: null,
  connectionStateName: 'not_configured',
}

export type SavedChronicleKindName = 'automatic' | 'manual' | 'archive_closure'

export type ProfileSavedChronicle = {
  saveIdentifier: string
  saveKindName: SavedChronicleKindName
  archiveNumberLabel: string | null
  archiveTitle: string | null
  placeName: string
  worldClockMinutes: number
  savedAtTimestamp: string
  confirmedTurnCount: number
}

export type ProfileInvestigatorConditionName = 'active' | 'fallen'

export type ProfileInvestigator = {
  investigatorIdentifier: string
  fullName: string
  conditionName: ProfileInvestigatorConditionName
  isCurrentInvestigator: boolean
  originLine: string | null
  level: number
  resolvedArchiveCount: number
  investigatedWhisperCount: number
  seriousWoundsSuffered: number
  chronicleThreadIdentifier: string
  savedChronicles: ProfileSavedChronicle[]
}

export type ChronicleThreadStateName = 'in_progress' | 'closed'

export type ProfileChronicleThread = {
  threadIdentifier: string
  threadTitle: string
  threadStateName: ChronicleThreadStateName
  isCurrentThread: boolean
  synopsis: string | null
  lastPlayedAtTimestamp: string | null
  resolvedArchiveCount: number
  investigatedWhisperCount: number
  investigatorIdentifiers: string[]
}

export type InvestigatorProfileLedger = {
  investigators: ProfileInvestigator[]
  chronicleThreads: ProfileChronicleThread[]
}

export const currentChronicleThreadIdentifier = 'current_chronicle_thread'
export const currentInvestigatorIdentifier = 'current_investigator'
export const currentAutomaticSaveIdentifier = 'current_automatic_save'

const demonstrationInvestigators: ProfileInvestigator[] = [
  {
    investigatorIdentifier: 'demonstration_investigator_ines_corvalan',
    fullName: 'Inés Corvalán Ruiz',
    conditionName: 'active',
    isCurrentInvestigator: false,
    originLine: 'Valparaíso. Antes llevaba el archivo de una naviera.',
    level: 4,
    resolvedArchiveCount: 6,
    investigatedWhisperCount: 9,
    seriousWoundsSuffered: 1,
    chronicleThreadIdentifier: 'demonstration_thread_salt_ledger',
    savedChronicles: [
      {
        saveIdentifier: 'demonstration_save_ines_automatic',
        saveKindName: 'automatic',
        archiveNumberLabel: 'Archivo 07',
        archiveTitle: 'Los que cuentan olas',
        placeName: 'Muelle Prat, Valparaíso',
        worldClockMinutes: 1305,
        savedAtTimestamp: '2026-09-14T23:41:00',
        confirmedTurnCount: 17,
      },
      {
        saveIdentifier: 'demonstration_save_ines_manual',
        saveKindName: 'manual',
        archiveNumberLabel: 'Archivo 07',
        archiveTitle: 'Los que cuentan olas',
        placeName: 'Pensión de la calle Serrano',
        worldClockMinutes: 1130,
        savedAtTimestamp: '2026-09-14T22:58:00',
        confirmedTurnCount: 9,
      },
      {
        saveIdentifier: 'demonstration_save_ines_closure',
        saveKindName: 'archive_closure',
        archiveNumberLabel: 'Archivo 06',
        archiveTitle: 'El inventario de la bodega nueve',
        placeName: 'Santuario',
        worldClockMinutes: 480,
        savedAtTimestamp: '2026-09-09T19:12:00',
        confirmedTurnCount: 31,
      },
    ],
  },
  {
    investigatorIdentifier: 'demonstration_investigator_mateo_arriaga',
    fullName: 'Mateo Arriaga Luján',
    conditionName: 'active',
    isCurrentInvestigator: false,
    originLine: 'Ciudad de México. Dejó el periodismo de nota roja.',
    level: 2,
    resolvedArchiveCount: 2,
    investigatedWhisperCount: 3,
    seriousWoundsSuffered: 0,
    chronicleThreadIdentifier: 'demonstration_thread_salt_ledger',
    savedChronicles: [
      {
        saveIdentifier: 'demonstration_save_mateo_closure',
        saveKindName: 'archive_closure',
        archiveNumberLabel: 'Archivo 02',
        archiveTitle: 'La línea que nadie contesta',
        placeName: 'Santuario',
        worldClockMinutes: 1390,
        savedAtTimestamp: '2026-08-30T01:07:00',
        confirmedTurnCount: 24,
      },
    ],
  },
  {
    investigatorIdentifier: 'demonstration_investigator_abril_quiroga',
    fullName: 'Abril Quiroga Senn',
    conditionName: 'active',
    isCurrentInvestigator: false,
    originLine: 'Rosario. Restauraba mapas para un museo provincial.',
    level: 3,
    resolvedArchiveCount: 4,
    investigatedWhisperCount: 5,
    seriousWoundsSuffered: 2,
    chronicleThreadIdentifier: 'demonstration_thread_paper_meridian',
    savedChronicles: [
      {
        saveIdentifier: 'demonstration_save_abril_automatic',
        saveKindName: 'automatic',
        archiveNumberLabel: 'Archivo 05',
        archiveTitle: 'El meridiano que no figura',
        placeName: 'Depósito del museo, Rosario',
        worldClockMinutes: 215,
        savedAtTimestamp: '2026-09-02T21:20:00',
        confirmedTurnCount: 12,
      },
      {
        saveIdentifier: 'demonstration_save_abril_manual',
        saveKindName: 'manual',
        archiveNumberLabel: 'Archivo 05',
        archiveTitle: 'El meridiano que no figura',
        placeName: 'Estación Rosario Norte',
        worldClockMinutes: 1260,
        savedAtTimestamp: '2026-09-01T20:03:00',
        confirmedTurnCount: 4,
      },
    ],
  },
  {
    investigatorIdentifier: 'demonstration_investigator_tobias_meller',
    fullName: 'Tobías Meller Ocampo',
    conditionName: 'fallen',
    isCurrentInvestigator: false,
    originLine: null,
    level: 5,
    resolvedArchiveCount: 8,
    investigatedWhisperCount: 11,
    seriousWoundsSuffered: 5,
    chronicleThreadIdentifier: 'demonstration_thread_salt_ledger',
    savedChronicles: [],
  },
  {
    investigatorIdentifier: 'demonstration_investigator_renata_ibarguren',
    fullName: 'Renata Ibargüren Paz',
    conditionName: 'fallen',
    isCurrentInvestigator: false,
    originLine: null,
    level: 3,
    resolvedArchiveCount: 3,
    investigatedWhisperCount: 4,
    seriousWoundsSuffered: 3,
    chronicleThreadIdentifier: 'demonstration_thread_winter_switchboard',
    savedChronicles: [],
  },
]

const demonstrationChronicleThreads: ProfileChronicleThread[] = [
  {
    threadIdentifier: 'demonstration_thread_salt_ledger',
    threadTitle: 'El libro de la sal',
    threadStateName: 'in_progress',
    isCurrentThread: false,
    synopsis:
      'Una naviera que lleva décadas sin barcos sigue pagando sueldos. Tobías Meller abrió el hilo y no volvió; Inés Corvalán y Mateo Arriaga lo siguen desde dos puertos distintos.',
    lastPlayedAtTimestamp: '2026-09-14T23:41:00',
    resolvedArchiveCount: 16,
    investigatedWhisperCount: 23,
    investigatorIdentifiers: [
      'demonstration_investigator_ines_corvalan',
      'demonstration_investigator_mateo_arriaga',
      'demonstration_investigator_tobias_meller',
    ],
  },
  {
    threadIdentifier: 'demonstration_thread_paper_meridian',
    threadTitle: 'El meridiano de papel',
    threadStateName: 'in_progress',
    isCurrentThread: false,
    synopsis:
      'Mapas de tres siglos distintos coinciden en dibujar una misma calle que ninguna ciudad reconoce. Abril Quiroga la busca sola.',
    lastPlayedAtTimestamp: '2026-09-02T21:20:00',
    resolvedArchiveCount: 4,
    investigatedWhisperCount: 5,
    investigatorIdentifiers: ['demonstration_investigator_abril_quiroga'],
  },
  {
    threadIdentifier: 'demonstration_thread_winter_switchboard',
    threadTitle: 'La centralita de invierno',
    threadStateName: 'closed',
    isCurrentThread: false,
    synopsis: null,
    lastPlayedAtTimestamp: '2026-07-21T00:32:00',
    resolvedArchiveCount: 3,
    investigatedWhisperCount: 4,
    investigatorIdentifiers: ['demonstration_investigator_renata_ibarguren'],
  },
]

function buildCurrentInvestigator(chronicleState: ChronicleState, currentMomentTimestamp: string): ProfileInvestigator | null {
  if (chronicleState.investigatorRegistration === null || chronicleState.chronicleClosure !== null) {
    return null
  }
  const investigatorRegistration = chronicleState.investigatorRegistration
  return {
    investigatorIdentifier: currentInvestigatorIdentifier,
    fullName: investigatorRegistration.fullName,
    conditionName: 'active',
    isCurrentInvestigator: true,
    originLine: investigatorRegistration.originPlace,
    level: chronicleState.investigatorProgression.level,
    resolvedArchiveCount: chronicleState.investigatorProgression.resolvedArchiveCount,
    investigatedWhisperCount: chronicleState.investigatorProgression.investigatedWhisperIdentifiers.length,
    seriousWoundsSuffered: chronicleState.investigator.seriousWoundsSuffered,
    chronicleThreadIdentifier: currentChronicleThreadIdentifier,
    savedChronicles: [
      {
        saveIdentifier: currentAutomaticSaveIdentifier,
        saveKindName: 'automatic',
        archiveNumberLabel: null,
        archiveTitle: null,
        placeName: chronicleState.investigator.placeName,
        worldClockMinutes: chronicleState.investigator.worldClockMinutes,
        savedAtTimestamp: currentMomentTimestamp,
        confirmedTurnCount: chronicleState.confirmedTurnCount,
      },
    ],
  }
}

function buildFallenInvestigatorFromClosure(chronicleClosureRecord: ChronicleClosureRecord): ProfileInvestigator {
  return {
    investigatorIdentifier: `fallen_investigator_${chronicleClosureRecord.closureIdentifier}`,
    fullName: chronicleClosureRecord.investigatorFullName,
    conditionName: 'fallen',
    isCurrentInvestigator: false,
    originLine: null,
    level: chronicleClosureRecord.level,
    resolvedArchiveCount: chronicleClosureRecord.resolvedArchiveCount,
    investigatedWhisperCount: chronicleClosureRecord.investigatedWhisperCount,
    seriousWoundsSuffered: chronicleClosureRecord.seriousWoundsSuffered,
    chronicleThreadIdentifier: `closed_thread_${chronicleClosureRecord.closureIdentifier}`,
    savedChronicles: [],
  }
}

export function buildInvestigatorProfileLedger(
  chronicleState: ChronicleState,
  closedChronicleArchive: readonly ChronicleClosureRecord[],
  currentMomentTimestamp: string,
  writeCurrentThreadTitle: (investigatorFullName: string) => string,
  writeClosedThreadTitle: (investigatorFullName: string) => string,
): InvestigatorProfileLedger {
  const currentInvestigator = buildCurrentInvestigator(chronicleState, currentMomentTimestamp)
  const fallenInvestigatorsOfThisDevice = closedChronicleArchive.map(buildFallenInvestigatorFromClosure)

  const currentThreads: ProfileChronicleThread[] = currentInvestigator
    ? [
        {
          threadIdentifier: currentChronicleThreadIdentifier,
          threadTitle: writeCurrentThreadTitle(currentInvestigator.fullName),
          threadStateName: 'in_progress',
          isCurrentThread: true,
          synopsis: null,
          lastPlayedAtTimestamp: currentMomentTimestamp,
          resolvedArchiveCount: currentInvestigator.resolvedArchiveCount,
          investigatedWhisperCount: currentInvestigator.investigatedWhisperCount,
          investigatorIdentifiers: [currentInvestigator.investigatorIdentifier],
        },
      ]
    : []

  const closedThreadsOfThisDevice: ProfileChronicleThread[] = fallenInvestigatorsOfThisDevice.map((fallenInvestigator) => ({
    threadIdentifier: fallenInvestigator.chronicleThreadIdentifier,
    threadTitle: writeClosedThreadTitle(fallenInvestigator.fullName),
    threadStateName: 'closed',
    isCurrentThread: false,
    synopsis: null,
    lastPlayedAtTimestamp: null,
    resolvedArchiveCount: fallenInvestigator.resolvedArchiveCount,
    investigatedWhisperCount: fallenInvestigator.investigatedWhisperCount,
    investigatorIdentifiers: [fallenInvestigator.investigatorIdentifier],
  }))

  return {
    investigators: [
      ...(currentInvestigator ? [currentInvestigator] : []),
      ...demonstrationInvestigators,
      ...fallenInvestigatorsOfThisDevice,
    ],
    chronicleThreads: [...currentThreads, ...demonstrationChronicleThreads, ...closedThreadsOfThisDevice],
  }
}

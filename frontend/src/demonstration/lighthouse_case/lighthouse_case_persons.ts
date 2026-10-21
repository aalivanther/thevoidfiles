import type { CasePersonDefinition } from './lighthouse_case_script_types'

export const renataPersonIdentifier = 'renata_oquendo'
export const boatmanPersonIdentifier = 'punta_animas_boatman'
export const brotherPersonIdentifier = 'renata_brother'
export const staircaseVoicePersonIdentifier = 'voice_on_the_staircase'

export const lighthouseCasePersons: Record<string, CasePersonDefinition> = {
  [renataPersonIdentifier]: {
    personIdentifier: renataPersonIdentifier,
    knownName: 'Renata Oquendo',
    aliasBeforeNameIsKnown: 'La mujer de la libreta',
    silhouetteName: 'long_coat_figure',
    initialLevelFromInvestigator: 2,
    initialLevelTowardInvestigator: 2,
  },
  [boatmanPersonIdentifier]: {
    personIdentifier: boatmanPersonIdentifier,
    knownName: 'El lanchero',
    aliasBeforeNameIsKnown: 'El lanchero',
    silhouetteName: 'capped_figure',
    initialLevelFromInvestigator: 1,
    initialLevelTowardInvestigator: 1,
  },
  [brotherPersonIdentifier]: {
    personIdentifier: brotherPersonIdentifier,
    knownName: 'Tomás Oquendo',
    aliasBeforeNameIsKnown: 'El hombre descalzo de la escalera',
    silhouetteName: 'close_figure',
    initialLevelFromInvestigator: 1,
    initialLevelTowardInvestigator: 1,
  },
  [staircaseVoicePersonIdentifier]: {
    personIdentifier: staircaseVoicePersonIdentifier,
    knownName: 'La voz de la escalera',
    aliasBeforeNameIsKnown: 'La voz de la escalera',
    silhouetteName: 'close_figure',
    initialLevelFromInvestigator: 0,
    initialLevelTowardInvestigator: 0,
  },
}

export const lighthouseCaseFictionalDateLabel = 'Archivo 01 · noche en Punta Ánimas'

export const lighthouseCaseFlagNames = {
  spokeWithRenata: 'spoke_with_renata',
  askedAboutBrother: 'asked_about_brother',
  renataConsentedToName: 'renata_consented_to_name',
  renataWalksAlong: 'renata_walks_along',
  boatmanWasHeard: 'boatman_was_heard',
  boatmanWasPaid: 'boatman_was_paid',
  boatmanClosedForTonight: 'boatman_closed_for_tonight',
  essentialConclusionByTestimony: 'essential_conclusion_by_testimony',
  essentialConclusionByDocument: 'essential_conclusion_by_document',
  essentialConclusionByObservation: 'essential_conclusion_by_observation',
  knowsMissingName: 'knows_missing_name',
  sawKeyMarks: 'saw_key_marks',
  readWatchRegister: 'read_watch_register',
  readKeeperLogbook: 'read_keeper_logbook',
  carriesKeeperLogbook: 'carries_keeper_logbook',
  hasShutterPlates: 'has_shutter_plates',
  staircaseWasAwakened: 'staircase_was_awakened',
  machineRoomIsOpen: 'machine_room_is_open',
  voiceHasChanged: 'voice_has_changed',
  calledBrotherByName: 'called_brother_by_name',
  railingIsBent: 'railing_is_bent',
  tarpaulinsWereLost: 'tarpaulins_were_lost',
  houseWasTaken: 'house_was_taken',
  brotherWasFreed: 'brother_was_freed',
  bayWitnessedTheLight: 'bay_witnessed_the_light',
  resolutionByRepair: 'resolution_by_repair',
  resolutionByOwnName: 'resolution_by_own_name',
  resolutionByForeignLight: 'resolution_by_foreign_light',
  resolutionByContainment: 'resolution_by_containment',
  resolutionByRetreat: 'resolution_by_retreat',
  firstEntropySignalWasGiven: 'first_entropy_signal_was_given',
  secondEntropySignalWasGiven: 'second_entropy_signal_was_given',
} as const

export const essentialConclusionFlagNames: readonly string[] = [
  lighthouseCaseFlagNames.essentialConclusionByTestimony,
  lighthouseCaseFlagNames.essentialConclusionByDocument,
  lighthouseCaseFlagNames.essentialConclusionByObservation,
]

export const lighthouseCaseSceneIdentifiers = {
  oldPier: 'pier_arrival',
  towerFoot: 'tower_foot',
  machineRoom: 'machine_room',
  keeperRoom: 'keeper_room',
  innerStaircase: 'inner_staircase',
  lanternRoom: 'lantern_room',
  outerGallery: 'outer_gallery',
  dawnPier: 'dawn_pier',
} as const

export const lighthouseCaseInteractivePieceIdentifiers = {
  serviceDoorLock: 'interactive_piece_0001',
  keeperCipherWheel: 'interactive_piece_0002',
  shutterPlateFrame: 'interactive_piece_0003',
} as const

export const disorientationConditionIdentifier = 'tower_disorientation'

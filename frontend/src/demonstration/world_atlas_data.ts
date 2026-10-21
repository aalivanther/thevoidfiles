export type WorldAtlasMapPoint = { horizontal: number; vertical: number }

export type WorldAtlasPlaceIdentifier =
  | 'residence'
  | 'punta_animas'
  | 'cabral_harbor'
  | 'las_cruces_junction'
  | 'fourth_floor_facility'
  | 'arch_street'
  | 'uncharted_mark'

export type WorldAtlasPlaceKnowledge = 'lived' | 'visited' | 'passed_through' | 'hearsay' | 'unexplained'

export type WorldAtlasPlace = {
  identifier: WorldAtlasPlaceIdentifier
  mapPoint: WorldAtlasMapPoint
  distanceKilometers: number | null
  relatedWhisperIdentifier: string | null
  requiresVisitedLighthouse: boolean
}

export const worldAtlasMapDimensions = { width: 1600, height: 1100 }
export const worldAtlasMapUnitsPerKilometer = 0.26
export const worldAtlasResidenceMapPoint: WorldAtlasMapPoint = { horizontal: 800, vertical: 560 }
export const lighthouseWhisperIdentifier = 'lighthouse_counts_one_more'

export const worldAtlasPlaces: WorldAtlasPlace[] = [
  {
    identifier: 'residence',
    mapPoint: worldAtlasResidenceMapPoint,
    distanceKilometers: 0,
    relatedWhisperIdentifier: null,
    requiresVisitedLighthouse: false,
  },
  {
    identifier: 'punta_animas',
    mapPoint: { horizontal: 738, vertical: 623 },
    distanceKilometers: 340,
    relatedWhisperIdentifier: lighthouseWhisperIdentifier,
    requiresVisitedLighthouse: false,
  },
  {
    identifier: 'cabral_harbor',
    mapPoint: { horizontal: 725, vertical: 570 },
    distanceKilometers: 290,
    relatedWhisperIdentifier: null,
    requiresVisitedLighthouse: true,
  },
  {
    identifier: 'las_cruces_junction',
    mapPoint: { horizontal: 790, vertical: 452 },
    distanceKilometers: 420,
    relatedWhisperIdentifier: null,
    requiresVisitedLighthouse: false,
  },
  {
    identifier: 'fourth_floor_facility',
    mapPoint: { horizontal: 950, vertical: 452 },
    distanceKilometers: 710,
    relatedWhisperIdentifier: 'night_shift_fourth_floor',
    requiresVisitedLighthouse: false,
  },
  {
    identifier: 'arch_street',
    mapPoint: { horizontal: 930, vertical: 762 },
    distanceKilometers: 925,
    relatedWhisperIdentifier: 'procession_nobody_called',
    requiresVisitedLighthouse: false,
  },
  {
    identifier: 'uncharted_mark',
    mapPoint: { horizontal: 548, vertical: 468 },
    distanceKilometers: null,
    relatedWhisperIdentifier: null,
    requiresVisitedLighthouse: false,
  },
]

export const worldAtlasCoastlinePath =
  'M 600 0 C 650 110 570 210 640 320 C 690 400 722 470 702 545 C 692 590 764 600 730 630 C 700 655 640 680 660 770 C 680 870 600 960 650 1100'

export const worldAtlasSeaAreaPath = `${worldAtlasCoastlinePath} L 0 1100 L 0 0 Z`

export const worldAtlasRiverPaths = [
  'M 1180 60 C 1120 180 1010 240 960 330 C 920 400 860 430 790 452 C 770 480 740 520 706 548',
  'M 1420 640 C 1300 660 1180 720 1060 730 C 980 738 900 800 800 812 C 740 820 700 790 664 772',
]

export const worldAtlasRoadPaths = [
  'M 800 560 L 765 566 L 725 570',
  'M 725 570 L 742 598 L 738 623',
  'M 800 560 L 806 500 L 790 452',
  'M 790 452 L 886 440 L 950 452',
  'M 800 560 L 852 640 L 900 710 L 930 762',
  'M 950 452 L 1080 400 L 1240 380 L 1600 300',
  'M 930 762 L 1020 880 L 1100 1100',
]

export const worldAtlasRailwayPath = 'M 760 0 L 790 200 L 790 452 L 800 560 L 830 800 L 800 1100'

export const worldAtlasMountainRidgePoints: WorldAtlasMapPoint[] = [
  { horizontal: 1090, vertical: 520 },
  { horizontal: 1130, vertical: 560 },
  { horizontal: 1175, vertical: 535 },
  { horizontal: 1215, vertical: 590 },
  { horizontal: 1260, vertical: 565 },
  { horizontal: 1300, vertical: 620 },
  { horizontal: 1150, vertical: 610 },
  { horizontal: 1240, vertical: 650 },
]

export const worldAtlasSierraRegionOutlinePoints: WorldAtlasMapPoint[] = [
  { horizontal: 1050, vertical: 500 },
  { horizontal: 1170, vertical: 478 },
  { horizontal: 1290, vertical: 520 },
  { horizontal: 1352, vertical: 610 },
  { horizontal: 1300, vertical: 688 },
  { horizontal: 1160, vertical: 676 },
  { horizontal: 1070, vertical: 610 },
]

export const worldAtlasPlainRegionOutlinePoints: WorldAtlasMapPoint[] = [
  { horizontal: 880, vertical: 150 },
  { horizontal: 1080, vertical: 120 },
  { horizontal: 1330, vertical: 170 },
  { horizontal: 1380, vertical: 280 },
  { horizontal: 1190, vertical: 330 },
  { horizontal: 960, vertical: 300 },
]

export const worldAtlasSketchSeed = 4127

export const worldAtlasGridColumnLetters = 'ABCDEFGHIJKLMNOP'.split('')
export const worldAtlasGridSpacing = 100

export type SearchRadiusReach = { kind: 'limited'; kilometers: number } | { kind: 'global' }

export function calculateSearchRadiusReach(resolvedArchiveCount: number): SearchRadiusReach {
  const upcomingArchiveNumber = resolvedArchiveCount + 1
  if (upcomingArchiveNumber >= 50) {
    return { kind: 'global' }
  }
  if (upcomingArchiveNumber <= 3) {
    return { kind: 'limited', kilometers: 1000 }
  }
  return { kind: 'limited', kilometers: 1000 + 800 * (upcomingArchiveNumber - 3) }
}

export type TravelEstimate = { travelHours: number; operationalFundsCost: number }

const demonstrationAverageKilometersPerHour = 68
const demonstrationCostPerKilometer = 0.42
const demonstrationFixedTravelCost = 25

export function estimateDemonstrationTravel(distanceKilometers: number): TravelEstimate {
  return {
    travelHours: Math.max(1, Math.round(distanceKilometers / demonstrationAverageKilometersPerHour)),
    operationalFundsCost:
      Math.round((demonstrationFixedTravelCost + distanceKilometers * demonstrationCostPerKilometer) / 5) * 5,
  }
}

export const worldAtlasCalendarStart = { year: 2026, monthIndex: 9, day: 14 }

export type EpochClimateStageName = 'local_threat' | 'regional_unrest' | 'widespread_alarm' | 'paradigm_crisis'

export function resolveEpochClimateStageName(resolvedArchiveCount: number): EpochClimateStageName {
  if (resolvedArchiveCount >= 74) {
    return 'paradigm_crisis'
  }
  if (resolvedArchiveCount >= 49) {
    return 'widespread_alarm'
  }
  if (resolvedArchiveCount >= 24) {
    return 'regional_unrest'
  }
  return 'local_threat'
}

export type WorldNewsClippingIdentifier =
  | 'ferry_schedule_cut'
  | 'pharmaceutical_expansion'
  | 'short_wave_interference'
  | 'parish_restoration'
  | 'fishing_ban_extension'
  | 'lighthouse_press_note'

export type WorldNewsClippingDefinition = {
  identifier: WorldNewsClippingIdentifier
  daysAgo: number
  requiresResolvedLighthouse: boolean
}

export const worldNewsClippingDefinitions: WorldNewsClippingDefinition[] = [
  { identifier: 'lighthouse_press_note', daysAgo: 0, requiresResolvedLighthouse: true },
  { identifier: 'ferry_schedule_cut', daysAgo: 1, requiresResolvedLighthouse: false },
  { identifier: 'short_wave_interference', daysAgo: 2, requiresResolvedLighthouse: false },
  { identifier: 'pharmaceutical_expansion', daysAgo: 3, requiresResolvedLighthouse: false },
  { identifier: 'parish_restoration', daysAgo: 5, requiresResolvedLighthouse: false },
  { identifier: 'fishing_ban_extension', daysAgo: 6, requiresResolvedLighthouse: false },
]

export const whisperClippingDaysAgoByWhisperIdentifier: Record<string, number> = {
  lighthouse_counts_one_more: 1,
  night_shift_fourth_floor: 2,
  procession_nobody_called: 4,
  encoded_whisper: 0,
}

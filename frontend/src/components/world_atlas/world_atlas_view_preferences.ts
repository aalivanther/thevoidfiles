import { worldAtlasResidenceMapPoint } from '../../demonstration/world_atlas_data'

export const worldAtlasFilterNames = [
  'whispers',
  'visitedPlaces',
  'knownPlaces',
  'unexplainedMarks',
  'searchRadius',
] as const

export type WorldAtlasFilterName = (typeof worldAtlasFilterNames)[number]

export type WorldAtlasViewPreferences = {
  visibilityByFilterName: Record<WorldAtlasFilterName, boolean>
  zoomLevel: number
  centerHorizontal: number
  centerVertical: number
  isListViewPreferred: boolean
}

export const minimumZoomLevel = 1
export const maximumZoomLevel = 6
export const initialZoomLevel = 1.6

export const initialWorldAtlasViewPreferences: WorldAtlasViewPreferences = {
  visibilityByFilterName: {
    whispers: true,
    visitedPlaces: true,
    knownPlaces: true,
    unexplainedMarks: true,
    searchRadius: true,
  },
  zoomLevel: initialZoomLevel,
  centerHorizontal: worldAtlasResidenceMapPoint.horizontal,
  centerVertical: worldAtlasResidenceMapPoint.vertical,
  isListViewPreferred: false,
}

function isFiniteNumber(candidateValue: unknown): candidateValue is number {
  return typeof candidateValue === 'number' && Number.isFinite(candidateValue)
}

export function readWorldAtlasViewPreferences(moduleRecord: unknown): WorldAtlasViewPreferences {
  if (typeof moduleRecord !== 'object' || moduleRecord === null) {
    return initialWorldAtlasViewPreferences
  }
  const candidateRecord = moduleRecord as Record<string, unknown>
  const candidateVisibility =
    typeof candidateRecord.visibilityByFilterName === 'object' && candidateRecord.visibilityByFilterName !== null
      ? (candidateRecord.visibilityByFilterName as Record<string, unknown>)
      : {}
  const visibilityByFilterName = { ...initialWorldAtlasViewPreferences.visibilityByFilterName }
  for (const filterName of worldAtlasFilterNames) {
    const candidateFlag = candidateVisibility[filterName]
    if (typeof candidateFlag === 'boolean') {
      visibilityByFilterName[filterName] = candidateFlag
    }
  }
  return {
    visibilityByFilterName,
    zoomLevel: isFiniteNumber(candidateRecord.zoomLevel)
      ? Math.min(maximumZoomLevel, Math.max(minimumZoomLevel, candidateRecord.zoomLevel))
      : initialWorldAtlasViewPreferences.zoomLevel,
    centerHorizontal: isFiniteNumber(candidateRecord.centerHorizontal)
      ? candidateRecord.centerHorizontal
      : initialWorldAtlasViewPreferences.centerHorizontal,
    centerVertical: isFiniteNumber(candidateRecord.centerVertical)
      ? candidateRecord.centerVertical
      : initialWorldAtlasViewPreferences.centerVertical,
    isListViewPreferred:
      typeof candidateRecord.isListViewPreferred === 'boolean'
        ? candidateRecord.isListViewPreferred
        : initialWorldAtlasViewPreferences.isListViewPreferred,
  }
}

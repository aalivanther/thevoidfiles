import { worldAtlasCopy } from '../../copy/world_atlas_copy'
import { whisperCards } from '../../demonstration/demonstration_case_script'
import type { WhisperCardContent } from '../../demonstration/demonstration_case_script'
import { lighthouseWhisperIdentifier, worldAtlasPlaces } from '../../demonstration/world_atlas_data'
import type {
  WorldAtlasMapPoint,
  WorldAtlasPlaceIdentifier,
  WorldAtlasPlaceKnowledge,
} from '../../demonstration/world_atlas_data'
import type { ChronicleState } from '../../game_state/chronicle_state'
import type { WorldAtlasFilterName } from './world_atlas_view_preferences'

export type WorldAtlasMarkerKind =
  | 'residence'
  | 'whisper'
  | 'visited_place'
  | 'known_place'
  | 'unexplained_mark'
  | 'unlocated_signal'

export type WorldAtlasMarker = {
  identifier: string
  placeIdentifier: WorldAtlasPlaceIdentifier | null
  kind: WorldAtlasMarkerKind
  filterName: WorldAtlasFilterName | null
  markerName: string
  regionName: string
  accessDescription: string | null
  knownFacts: string
  knowledge: WorldAtlasPlaceKnowledge
  mapPoint: WorldAtlasMapPoint | null
  distanceKilometers: number | null
  distanceText: string | null
  lastVisitText: string
  whisperCard: WhisperCardContent | null
  isWhisperAlreadyInvestigated: boolean
}

const filterNameByMarkerKind: Record<WorldAtlasMarkerKind, WorldAtlasFilterName | null> = {
  residence: null,
  whisper: 'whispers',
  visited_place: 'visitedPlaces',
  known_place: 'knownPlaces',
  unexplained_mark: 'unexplainedMarks',
  unlocated_signal: 'whispers',
}

export const unlocatedSignalMarkerIdentifier = 'unlocated_signal'

export function hasInvestigatorVisitedLighthouse(chronicleState: ChronicleState): boolean {
  return (
    chronicleState.chosenWhisperIdentifier === lighthouseWhisperIdentifier ||
    chronicleState.investigatorProgression.investigatedWhisperIdentifiers.includes(lighthouseWhisperIdentifier)
  )
}

export function hasInvestigatorResolvedLighthouse(chronicleState: ChronicleState): boolean {
  return chronicleState.investigatorProgression.investigatedWhisperIdentifiers.includes(lighthouseWhisperIdentifier)
}

function foldPlaceName(placeName: string): string {
  return placeName.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es').trim()
}

function foldedPlaceNameParts(placeName: string): string[] {
  return placeName.split('·').map((placePart) => foldPlaceName(placePart))
}

function placeNamesMeet(leftPlaceName: string, rightPlaceName: string): boolean {
  const foldedLeftPlaceName = foldPlaceName(leftPlaceName)
  const foldedRightPlaceName = foldPlaceName(rightPlaceName)
  if (foldedLeftPlaceName.length < 4 || foldedRightPlaceName.length < 4) {
    return false
  }
  return (
    foldedLeftPlaceName === foldedRightPlaceName ||
    foldedPlaceNameParts(leftPlaceName).includes(foldedRightPlaceName) ||
    foldedPlaceNameParts(rightPlaceName).includes(foldedLeftPlaceName)
  )
}

export function buildWorldAtlasMarkers(chronicleState: ChronicleState, residenceName: string): WorldAtlasMarker[] {
  const detailCopy = worldAtlasCopy.detail
  const investigatedWhisperIdentifiers = chronicleState.investigatorProgression.investigatedWhisperIdentifiers
  const visitedPlaces = chronicleState.archiveRun.visitedPlaces ?? []
  const isCaseOpen = chronicleState.chosenWhisperIdentifier !== null
  const isHereNow = (placeName: string) => isCaseOpen && placeNamesMeet(chronicleState.investigator.placeName, placeName)
  const markers: WorldAtlasMarker[] = []

  for (const place of worldAtlasPlaces) {
    const placeCopy = worldAtlasCopy.placeCopyByIdentifier[place.identifier]
    const wasWalked = visitedPlaces.some((visitedPlace) =>
      placeNamesMeet(visitedPlace.placeName, placeCopy.placeName),
    )
    if (place.identifier !== 'residence' && !wasWalked) {
      continue
    }
    const whisperCard = whisperCards.find((card) => card.identifier === place.relatedWhisperIdentifier) ?? null
    const kind: WorldAtlasMarkerKind = place.identifier === 'residence' ? 'residence' : 'visited_place'
    const knowledge: WorldAtlasPlaceKnowledge = place.identifier === 'residence' ? 'lived' : 'visited'
    const lastVisitText =
      place.identifier === 'residence'
        ? detailCopy.livesHere
        : isHereNow(placeCopy.placeName)
          ? detailCopy.visitHereNow
          : detailCopy.visitRecorded
    markers.push({
      identifier: place.identifier,
      placeIdentifier: place.identifier,
      kind,
      filterName: filterNameByMarkerKind[kind],
      markerName: place.identifier === 'residence' ? residenceName : placeCopy.placeName,
      regionName: placeCopy.regionName,
      accessDescription: placeCopy.accessDescription,
      knownFacts: placeCopy.knownFacts,
      knowledge,
      mapPoint: place.mapPoint,
      distanceKilometers: place.distanceKilometers,
      distanceText:
        place.distanceKilometers === null || place.distanceKilometers === 0
          ? null
          : (whisperCard?.distanceText ?? `${place.distanceKilometers} km`),
      lastVisitText,
      whisperCard: place.identifier === 'residence' ? null : whisperCard,
      isWhisperAlreadyInvestigated:
        place.identifier !== 'residence' &&
        whisperCard !== null &&
        investigatedWhisperIdentifiers.includes(whisperCard.identifier),
    })
  }

  let walkedPlaceOrder = 0
  for (const visitedPlace of visitedPlaces) {
    const alreadyOnPaper = markers.some((marker) => {
      if (marker.placeIdentifier === null || marker.placeIdentifier === 'residence') {
        return false
      }
      return placeNamesMeet(
        visitedPlace.placeName,
        worldAtlasCopy.placeCopyByIdentifier[marker.placeIdentifier].placeName,
      )
    })
    if (
      alreadyOnPaper ||
      markers.some((marker) => marker.kind === 'visited_place' && placeNamesMeet(marker.markerName, visitedPlace.placeName))
    ) {
      continue
    }
    markers.push({
      identifier: `case-walked-place-${walkedPlaceOrder}`,
      placeIdentifier: null,
      kind: 'visited_place',
      filterName: filterNameByMarkerKind.visited_place,
      markerName: visitedPlace.placeName,
      regionName: detailCopy.unmappedPlaceRegion,
      accessDescription: detailCopy.unmappedPlaceAccess,
      knownFacts: detailCopy.unmappedPlaceFacts,
      knowledge: 'visited',
      mapPoint: null,
      distanceKilometers: null,
      distanceText: null,
      lastVisitText: isHereNow(visitedPlace.placeName) ? detailCopy.visitHereNow : detailCopy.visitRecorded,
      whisperCard: null,
      isWhisperAlreadyInvestigated: false,
    })
    walkedPlaceOrder += 1
  }

  return markers
}

export function isMarkerVisibleWithFilters(
  marker: WorldAtlasMarker,
  visibilityByFilterName: Record<WorldAtlasFilterName, boolean>,
): boolean {
  return marker.filterName === null || visibilityByFilterName[marker.filterName]
}

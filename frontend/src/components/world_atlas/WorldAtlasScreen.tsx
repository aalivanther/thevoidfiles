import {
  Check,
  Circle,
  CompassTool,
  Diamond,
  EyeSlash,
  ListBullets,
  MapPinLine,
  MapTrifold,
  WaveSine,
  X,
} from '@phosphor-icons/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { chooseAnimationVariantName, randomNumberBetween } from '../../animation/animation_variety'
import { useInteractionFeedback } from '../../audio/interaction_feedback'
import { worldAtlasCopy } from '../../copy/world_atlas_copy'
import { whisperCards } from '../../demonstration/demonstration_case_script'
import {
  calculateSearchRadiusReach,
  estimateDemonstrationTravel,
  resolveEpochClimateStageName,
  whisperClippingDaysAgoByWhisperIdentifier,
  worldAtlasCalendarStart,
  worldAtlasMapDimensions,
  worldAtlasMapUnitsPerKilometer,
  worldAtlasPlaces,
  worldAtlasResidenceMapPoint,
  worldNewsClippingDefinitions,
} from '../../demonstration/world_atlas_data'
import { useChronicleState } from '../../game_state/chronicle_state'
import { PresentationTitleCard } from '../PresentationTitleCard'
import { WorldAtlasMap } from './WorldAtlasMap'
import type { WorldAtlasMapView } from './WorldAtlasMap'
import {
  buildWorldAtlasMarkers,
  hasInvestigatorResolvedLighthouse,
  isMarkerVisibleWithFilters,
} from './world_atlas_markers'
import type { WorldAtlasMarker, WorldAtlasMarkerKind } from './world_atlas_markers'
import {
  initialWorldAtlasViewPreferences,
  readWorldAtlasViewPreferences,
  worldAtlasFilterNames,
} from './world_atlas_view_preferences'
import type { WorldAtlasFilterName, WorldAtlasViewPreferences } from './world_atlas_view_preferences'

const dateStampVariantNames = ['tilted_left_stamp', 'tilted_right_stamp', 'double_strike_stamp'] as const
const clippingSlideVariantNames = ['slide_from_left', 'slide_from_right', 'drop_from_above'] as const
const preferenceSavingDelayMilliseconds = 700
const minutesPerDay = 24 * 60

type WorldClippingEntry = {
  identifier: string
  kindLabel: string
  headline: string
  sourceLabel: string
  bodyText: string
  daysAgo: number
  relatedMarkerIdentifier: string | null
  isEncoded: boolean
}

const filterIconByFilterName: Record<WorldAtlasFilterName, ReactNode> = {
  whispers: <WaveSine size={16} weight="bold" aria-hidden="true" />,
  visitedPlaces: <MapPinLine size={16} weight="bold" aria-hidden="true" />,
  knownPlaces: <Circle size={16} weight="bold" aria-hidden="true" />,
  unexplainedMarks: <Diamond size={16} weight="bold" aria-hidden="true" />,
  searchRadius: <CompassTool size={16} weight="bold" aria-hidden="true" />,
}

const markerIconByMarkerKind: Record<WorldAtlasMarkerKind, ReactNode> = {
  residence: <MapTrifold size={18} weight="bold" aria-hidden="true" />,
  whisper: <WaveSine size={18} weight="bold" aria-hidden="true" />,
  visited_place: <MapPinLine size={18} weight="bold" aria-hidden="true" />,
  known_place: <Circle size={18} weight="bold" aria-hidden="true" />,
  unexplained_mark: <Diamond size={18} weight="bold" aria-hidden="true" />,
  unlocated_signal: <WaveSine size={18} weight="bold" aria-hidden="true" />,
}

export function WorldAtlasScreen() {
  const { chronicleState, changeChronicleState } = useChronicleState()
  const playInteractionFeedback = useInteractionFeedback()
  const [isPresentationVisible, setIsPresentationVisible] = useState(true)
  const [viewPreferences, setViewPreferences] = useState<WorldAtlasViewPreferences>(() =>
    readWorldAtlasViewPreferences(chronicleState.moduleRecords.world_atlas),
  )
  const [selectedMarkerIdentifier, setSelectedMarkerIdentifier] = useState<string | null>(null)
  const [dateStampVariantName] = useState(() =>
    chooseAnimationVariantName('world_atlas_date_stamp', dateStampVariantNames),
  )
  const [clippingPresentationByOrder] = useState(() =>
    Array.from({ length: 16 }, () => ({
      variantName: chooseAnimationVariantName('world_atlas_clipping_slide', clippingSlideVariantNames),
      tiltDegrees: randomNumberBetween(-1.6, 1.6),
    })),
  )
  const hasPreferenceChangedSinceMount = useRef(false)
  const mapSectionElement = useRef<HTMLElement>(null)
  const detailPanelElement = useRef<HTMLElement>(null)

  const residenceName =
    chronicleState.investigatorRegistration?.residencePlace.trim() || worldAtlasCopy.unknownResidenceName
  const resolvedArchiveCount = chronicleState.investigatorProgression.resolvedArchiveCount
  const searchRadiusReach = calculateSearchRadiusReach(resolvedArchiveCount)
  const hasResolvedLighthouse = hasInvestigatorResolvedLighthouse(chronicleState)

  const markers = useMemo(() => buildWorldAtlasMarkers(chronicleState, residenceName), [chronicleState, residenceName])
  const visibleMarkers = markers.filter((marker) =>
    isMarkerVisibleWithFilters(marker, viewPreferences.visibilityByFilterName),
  )
  const locatedVisibleMarkers = visibleMarkers.filter((marker) => marker.mapPoint !== null)
  const unlocatedSignalMarker = visibleMarkers.find((marker) => marker.kind === 'unlocated_signal') ?? null
  const selectedMarker = visibleMarkers.find((marker) => marker.identifier === selectedMarkerIdentifier) ?? null

  useEffect(() => {
    if (!hasPreferenceChangedSinceMount.current) {
      return
    }
    const savingTimeoutIdentifier = window.setTimeout(() => {
      changeChronicleState({ kind: 'module_record_saved', moduleName: 'world_atlas', moduleRecord: viewPreferences })
    }, preferenceSavingDelayMilliseconds)
    return () => window.clearTimeout(savingTimeoutIdentifier)
  }, [viewPreferences, changeChronicleState])

  const changeViewPreferences = useCallback(
    (createNextPreferences: (previousPreferences: WorldAtlasViewPreferences) => WorldAtlasViewPreferences) => {
      hasPreferenceChangedSinceMount.current = true
      setViewPreferences(createNextPreferences)
    },
    [],
  )

  const handleMapViewChanged = useCallback(
    (nextMapView: WorldAtlasMapView) => {
      changeViewPreferences((previousPreferences) => ({ ...previousPreferences, ...nextMapView }))
    },
    [changeViewPreferences],
  )

  const recenterMap = () => {
    changeViewPreferences((previousPreferences) => ({
      ...previousPreferences,
      zoomLevel: initialWorldAtlasViewPreferences.zoomLevel,
      centerHorizontal: worldAtlasResidenceMapPoint.horizontal,
      centerVertical: worldAtlasResidenceMapPoint.vertical,
    }))
  }

  const chooseMarker = (markerIdentifier: string) => {
    if (selectedMarkerIdentifier === markerIdentifier) {
      playInteractionFeedback('panel_close')
      setSelectedMarkerIdentifier(null)
      return
    }
    const chosenMarker = markers.find((marker) => marker.identifier === markerIdentifier)
    const isAnomalousMarker = chosenMarker?.kind === 'unexplained_mark' || chosenMarker?.kind === 'unlocated_signal'
    playInteractionFeedback(isAnomalousMarker ? 'anomaly_glitch' : 'panel_open')
    setSelectedMarkerIdentifier(markerIdentifier)
  }

  const releaseSelectedMarker = () => {
    playInteractionFeedback('panel_close')
    setSelectedMarkerIdentifier(null)
  }

  const showMarkerOnMap = (markerIdentifier: string) => {
    const targetMarker = markers.find((marker) => marker.identifier === markerIdentifier)
    if (!targetMarker) {
      playInteractionFeedback('rejection')
      return
    }
    playInteractionFeedback('rising_whoosh')
    changeViewPreferences((previousPreferences) => ({
      ...previousPreferences,
      isListViewPreferred: false,
      visibilityByFilterName: targetMarker.filterName
        ? { ...previousPreferences.visibilityByFilterName, [targetMarker.filterName]: true }
        : previousPreferences.visibilityByFilterName,
      zoomLevel: Math.max(previousPreferences.zoomLevel, 3),
      centerHorizontal: targetMarker.mapPoint?.horizontal ?? previousPreferences.centerHorizontal,
      centerVertical: targetMarker.mapPoint?.vertical ?? previousPreferences.centerVertical,
    }))
    setSelectedMarkerIdentifier(markerIdentifier)
    mapSectionElement.current?.scrollIntoView({ block: 'start' })
    mapSectionElement.current?.focus()
  }

  const toggleFilter = (filterName: WorldAtlasFilterName) => {
    playInteractionFeedback('option_click')
    changeViewPreferences((previousPreferences) => ({
      ...previousPreferences,
      visibilityByFilterName: {
        ...previousPreferences.visibilityByFilterName,
        [filterName]: !previousPreferences.visibilityByFilterName[filterName],
      },
    }))
  }

  const changePreferredView = (isListViewPreferred: boolean) => {
    if (viewPreferences.isListViewPreferred === isListViewPreferred) {
      return
    }
    playInteractionFeedback(isListViewPreferred ? 'panel_open' : 'panel_close')
    changeViewPreferences((previousPreferences) => ({ ...previousPreferences, isListViewPreferred }))
  }

  const worldClockMinutes = chronicleState.investigator.worldClockMinutes
  const elapsedDayCount = Math.floor(worldClockMinutes / minutesPerDay)
  const worldDate = new Date(
    worldAtlasCalendarStart.year,
    worldAtlasCalendarStart.monthIndex,
    worldAtlasCalendarStart.day + elapsedDayCount,
  )
  const worldDateText = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' }).format(worldDate)
  const worldClockText = `${String(Math.floor((worldClockMinutes % minutesPerDay) / 60)).padStart(2, '0')}:${String(
    worldClockMinutes % 60,
  ).padStart(2, '0')}`

  const clippingEntries: WorldClippingEntry[] = [
    ...whisperCards.map((whisperCard) => ({
      identifier: whisperCard.identifier,
      kindLabel: worldAtlasCopy.worldAdvances.whisperClippingKind,
      headline: whisperCard.headline,
      sourceLabel: whisperCard.sourceLabel,
      bodyText: whisperCard.rumorText,
      daysAgo: whisperClippingDaysAgoByWhisperIdentifier[whisperCard.identifier] ?? 0,
      relatedMarkerIdentifier:
        markers.find((marker) => marker.whisperCard?.identifier === whisperCard.identifier)?.identifier ?? null,
      isEncoded: whisperCard.isEncoded,
    })),
    ...worldNewsClippingDefinitions
      .filter((clippingDefinition) => !clippingDefinition.requiresResolvedLighthouse || hasResolvedLighthouse)
      .map((clippingDefinition) => {
        const clippingCopy = worldAtlasCopy.clippingCopyByIdentifier[clippingDefinition.identifier]
        return {
          identifier: clippingDefinition.identifier,
          kindLabel: worldAtlasCopy.worldAdvances.pressClippingKind,
          headline: clippingCopy.headline,
          sourceLabel: clippingCopy.sourceLabel,
          bodyText: clippingCopy.bodyText,
          daysAgo: clippingDefinition.daysAgo,
          relatedMarkerIdentifier: null,
          isEncoded: false,
        }
      }),
  ].sort((firstEntry, secondEntry) => firstEntry.daysAgo - secondEntry.daysAgo)

  const epochClimateCopy = worldAtlasCopy.epochClimateCopyByStageName[resolveEpochClimateStageName(resolvedArchiveCount)]
  const knownPlaceMarkers = markers.filter(
    (marker) => marker.kind === 'visited_place' || (marker.placeIdentifier !== null && marker.kind !== 'unexplained_mark'),
  )
  const isSearchRadiusBeyondPaper =
    searchRadiusReach.kind === 'limited' &&
    searchRadiusReach.kilometers * worldAtlasMapUnitsPerKilometer > worldAtlasMapDimensions.height / 2
  const mapView: WorldAtlasMapView = {
    zoomLevel: viewPreferences.zoomLevel,
    centerHorizontal: viewPreferences.centerHorizontal,
    centerVertical: viewPreferences.centerVertical,
  }

  return (
    <>
      {isPresentationVisible ? (
        <PresentationTitleCard
          chapterLabel={worldAtlasCopy.presentationLabel}
          chapterTitle={worldAtlasCopy.presentationTitle}
          detailLine={worldAtlasCopy.presentationDetail}
          onPresentationFinished={() => setIsPresentationVisible(false)}
        />
      ) : null}
      <main id="main-content" className="world-atlas-screen mx-auto w-full max-w-7xl px-4 pt-8 pb-20 sm:px-8">
        <header className="world-atlas-header entrance-from-left">
          <div className="min-w-0">
            <p className="dossier-label">{worldAtlasCopy.presentationLabel}</p>
            <h1 className="display-title text-4xl sm:text-5xl">{worldAtlasCopy.screenTitle}</h1>
            <p className="world-atlas-header-lead">{worldAtlasCopy.headerLead}</p>
          </div>
          <div className={`world-atlas-date-stamp world-atlas-date-stamp-${dateStampVariantName}`}>
            <span className="world-atlas-date-stamp-label">{worldAtlasCopy.worldDateLabel}</span>
            <span className="world-atlas-date-stamp-date">{worldDateText}</span>
            <span className="world-atlas-date-stamp-clock">
              {worldAtlasCopy.worldClockLabel} {worldClockText}
            </span>
            <span className="world-atlas-date-stamp-elapsed">{worldAtlasCopy.daysElapsedDescription(elapsedDayCount)}</span>
          </div>
        </header>

        <section
          ref={mapSectionElement}
          tabIndex={-1}
          className="world-atlas-map-section"
          aria-labelledby="world-atlas-map-title"
        >
          <div className="world-atlas-map-toolbar">
            <h2 id="world-atlas-map-title" className="display-title text-2xl">
              {worldAtlasCopy.map.sectionTitle}
            </h2>
            <div className="world-atlas-view-switch" role="group" aria-label={worldAtlasCopy.map.viewSwitchLabel}>
              <button
                type="button"
                className="world-atlas-toggle-chip"
                aria-pressed={!viewPreferences.isListViewPreferred}
                onClick={() => changePreferredView(false)}
              >
                <MapTrifold size={16} weight="bold" aria-hidden="true" />
                {worldAtlasCopy.map.mapViewLabel}
              </button>
              <button
                type="button"
                className="world-atlas-toggle-chip"
                aria-pressed={viewPreferences.isListViewPreferred}
                onClick={() => changePreferredView(true)}
              >
                <ListBullets size={16} weight="bold" aria-hidden="true" />
                {worldAtlasCopy.map.listViewLabel}
              </button>
            </div>
          </div>

          <div className="world-atlas-filter-row" role="group" aria-label={worldAtlasCopy.filters.groupLabel}>
            {worldAtlasFilterNames.map((filterName) => {
              const isShown = viewPreferences.visibilityByFilterName[filterName]
              return (
                <button
                  key={filterName}
                  type="button"
                  className="world-atlas-toggle-chip"
                  aria-pressed={isShown}
                  onClick={() => toggleFilter(filterName)}
                  onPointerEnter={(pointerEvent) => {
                    if (pointerEvent.pointerType === 'mouse') {
                      playInteractionFeedback('option_hover')
                    }
                  }}
                >
                  {filterIconByFilterName[filterName]}
                  <span>{worldAtlasCopy.filters[filterName]}</span>
                  {isShown ? <Check size={14} weight="bold" aria-hidden="true" /> : <EyeSlash size={14} weight="bold" aria-hidden="true" />}
                  <span className="visually-hidden-text">
                    {isShown ? worldAtlasCopy.filters.shownState : worldAtlasCopy.filters.hiddenState}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="world-atlas-workbench">
            <div className="min-w-0">
              {viewPreferences.isListViewPreferred ? (
                <div className="world-atlas-marker-list-sheet aged-paper-document">
                  <h3 className="world-atlas-paper-heading">{worldAtlasCopy.list.sectionTitle}</h3>
                  <p className="world-atlas-paper-note">{worldAtlasCopy.list.columnDescription}</p>
                  {visibleMarkers.length === 0 ? (
                    <p className="world-atlas-paper-note">{worldAtlasCopy.list.hiddenByFilters}</p>
                  ) : (
                    <ul className="world-atlas-marker-list">
                      {visibleMarkers.map((marker) => {
                        const isSelected = marker.identifier === selectedMarkerIdentifier
                        return (
                          <li key={marker.identifier}>
                            <button
                              type="button"
                              className="world-atlas-marker-list-entry"
                              aria-pressed={isSelected}
                              onClick={() => chooseMarker(marker.identifier)}
                            >
                              <span className="world-atlas-marker-list-icon">{markerIconByMarkerKind[marker.kind]}</span>
                              <span className="min-w-0 flex-1">
                                <span className="world-atlas-marker-list-kind">
                                  {worldAtlasCopy.markerKindLabels[marker.kind]}
                                  {isSelected ? ` · ${worldAtlasCopy.list.selectedState}` : ''}
                                </span>
                                <span className="world-atlas-marker-list-name">{marker.markerName}</span>
                                <span className="world-atlas-marker-list-region">{marker.regionName}</span>
                              </span>
                              <span className="world-atlas-marker-list-distance">
                                {marker.distanceText ?? (marker.kind === 'residence' ? '' : worldAtlasCopy.detail.unknownDistance)}
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              ) : (
                <>
                  <WorldAtlasMap
                    markers={locatedVisibleMarkers}
                    unlocatedSignalMarker={unlocatedSignalMarker}
                    selectedMarkerIdentifier={selectedMarker?.identifier ?? null}
                    mapView={mapView}
                    searchRadiusReach={searchRadiusReach}
                    isSearchRadiusVisible={viewPreferences.visibilityByFilterName.searchRadius}
                    onMarkerChosen={chooseMarker}
                    onMapViewChanged={handleMapViewChanged}
                    onRecenterRequested={recenterMap}
                  />
                  <p className="world-atlas-keyboard-hint">{worldAtlasCopy.map.keyboardHint}</p>
                </>
              )}
            </div>

            <aside
              ref={detailPanelElement}
              className="world-atlas-detail-panel comic-panel"
              aria-label={worldAtlasCopy.detail.panelTitle}
              aria-live="polite"
            >
              {selectedMarker ? (
                <MarkerDetail key={selectedMarker.identifier} marker={selectedMarker} onReleaseRequested={releaseSelectedMarker} />
              ) : (
                <div className="world-atlas-detail-empty">
                  <p className="dossier-label">{worldAtlasCopy.detail.panelTitle}</p>
                  <p className="world-atlas-detail-empty-title">{worldAtlasCopy.detail.emptyTitle}</p>
                  <p className="world-atlas-detail-text">{worldAtlasCopy.detail.emptyDescription}</p>
                </div>
              )}
              <div className="world-atlas-radius-note">
                <p className="dossier-label">
                  <CompassTool size={14} weight="bold" aria-hidden="true" className="mr-1 inline-block align-[-2px]" />
                  {worldAtlasCopy.searchRadius.title}
                </p>
                <p className="world-atlas-detail-text">
                  {searchRadiusReach.kind === 'limited'
                    ? worldAtlasCopy.searchRadius.limitedDescription(searchRadiusReach.kilometers, resolvedArchiveCount + 1)
                    : worldAtlasCopy.searchRadius.globalDescription}
                </p>
                {isSearchRadiusBeyondPaper ? (
                  <p className="world-atlas-detail-text">{worldAtlasCopy.searchRadius.beyondPaperNotice}</p>
                ) : null}
              </div>
            </aside>
          </div>
        </section>

        <section className="world-atlas-section" aria-labelledby="world-atlas-advances-title">
          <h2 id="world-atlas-advances-title" className="display-title text-2xl">
            {worldAtlasCopy.worldAdvances.sectionTitle}
          </h2>
          <p className="world-atlas-section-lead">{worldAtlasCopy.worldAdvances.sectionLead}</p>
          <ul className="world-atlas-clipping-board">
            {clippingEntries.map((clippingEntry, clippingOrder) => {
              const clippingPresentation = clippingPresentationByOrder[clippingOrder % clippingPresentationByOrder.length]
              return (
                <li
                  key={clippingEntry.identifier}
                  className={`world-atlas-clipping world-atlas-clipping-${clippingPresentation.variantName} ${
                    clippingEntry.isEncoded ? 'world-atlas-clipping-encoded' : ''
                  }`}
                  style={
                    {
                      '--clipping-tilt': `${clippingPresentation.tiltDegrees.toFixed(2)}deg`,
                      '--entrance-order': clippingOrder,
                    } as CSSProperties
                  }
                >
                  <p className="world-atlas-clipping-meta">
                    <span>{clippingEntry.kindLabel}</span>
                    <span>{worldAtlasCopy.worldAdvances.daysAgoLabel(clippingEntry.daysAgo)}</span>
                  </p>
                  <h3 className="world-atlas-clipping-headline">{clippingEntry.headline}</h3>
                  <p className="world-atlas-clipping-source">{clippingEntry.sourceLabel}</p>
                  <p className="world-atlas-clipping-body">{clippingEntry.bodyText}</p>
                  {clippingEntry.relatedMarkerIdentifier ? (
                    <button
                      type="button"
                      className="world-atlas-paper-button"
                      onClick={() => showMarkerOnMap(clippingEntry.relatedMarkerIdentifier ?? '')}
                    >
                      <MapPinLine size={16} weight="bold" aria-hidden="true" />
                      {worldAtlasCopy.worldAdvances.showOnMapLabel}
                    </button>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </section>

        <section className="world-atlas-section" aria-labelledby="world-atlas-places-title">
          <h2 id="world-atlas-places-title" className="display-title text-2xl">
            {worldAtlasCopy.knownPlaces.sectionTitle}
          </h2>
          <p className="world-atlas-section-lead">{worldAtlasCopy.knownPlaces.sectionLead}</p>
          <ul className="world-atlas-place-grid">
            {knownPlaceMarkers.map((marker, placeOrder) => {
              const placeCopy = marker.placeIdentifier ? worldAtlasCopy.placeCopyByIdentifier[marker.placeIdentifier] : null
              const placeDefinition = worldAtlasPlaces.find((place) => place.identifier === marker.placeIdentifier)
              return (
                <li
                  key={marker.identifier}
                  className="world-atlas-place-card comic-panel comic-panel-cut-corner entrance-from-below"
                  style={{ '--entrance-order': placeOrder } as CSSProperties}
                >
                  <p className="dossier-label">{worldAtlasCopy.knowledgeLabelByKnowledge[marker.knowledge]}</p>
                  <h3 className="world-atlas-place-name">
                    {marker.kind === 'residence' ? residenceName : (placeCopy?.placeName ?? marker.markerName)}
                  </h3>
                  <dl className="world-atlas-fact-list">
                    <div>
                      <dt>{worldAtlasCopy.detail.regionLabel}</dt>
                      <dd>{placeCopy?.regionName ?? marker.regionName}</dd>
                    </div>
                    <div>
                      <dt>{worldAtlasCopy.detail.accessLabel}</dt>
                      <dd>{marker.accessDescription}</dd>
                    </div>
                    <div>
                      <dt>{worldAtlasCopy.detail.knownFactsLabel}</dt>
                      <dd>{marker.knownFacts}</dd>
                    </div>
                    <div>
                      <dt>{worldAtlasCopy.detail.lastVisitLabel}</dt>
                      <dd>{marker.lastVisitText}</dd>
                    </div>
                  </dl>
                  {placeDefinition ? (
                    <button type="button" className="quiet-action-button mt-3" onClick={() => showMarkerOnMap(marker.identifier)}>
                      <MapPinLine size={16} weight="bold" aria-hidden="true" />
                      {worldAtlasCopy.knownPlaces.showOnMapLabel}
                    </button>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </section>

        <section className="world-atlas-section" aria-labelledby="world-atlas-climate-title">
          <h2 id="world-atlas-climate-title" className="display-title text-2xl">
            {worldAtlasCopy.epochClimate.sectionTitle}
          </h2>
          <p className="world-atlas-section-lead">{worldAtlasCopy.epochClimate.sectionLead}</p>
          <div className="world-atlas-climate-front-page aged-paper-document">
            <p className="world-atlas-climate-name">{epochClimateCopy.climateName}</p>
            <p className="world-atlas-climate-tone">{epochClimateCopy.toneDescription}</p>
            <p className="world-atlas-clipping-meta">
              <span>{worldAtlasCopy.epochClimate.headlinesLabel}</span>
            </p>
            <ul className="world-atlas-climate-headlines">
              {epochClimateCopy.headlines.map((headline) => (
                <li key={headline}>{headline}</li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </>
  )
}

type MarkerDetailProperties = {
  marker: WorldAtlasMarker
  onReleaseRequested: () => void
}

function MarkerDetail({ marker, onReleaseRequested }: MarkerDetailProperties) {
  const detailCopy = worldAtlasCopy.detail
  const isReachable =
    marker.distanceKilometers !== null && marker.distanceKilometers > 0 && marker.kind !== 'unexplained_mark'
  const travelEstimate = isReachable ? estimateDemonstrationTravel(marker.distanceKilometers ?? 0) : null
  const isAnomalous = marker.kind === 'unexplained_mark' || marker.kind === 'unlocated_signal'
  const whisperCard =
    marker.kind === 'whisper' || marker.kind === 'unlocated_signal' || marker.kind === 'visited_place'
      ? marker.whisperCard
      : null

  return (
    <div className={`world-atlas-detail-content ${isAnomalous ? 'world-atlas-detail-content-anomalous' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="dossier-label flex min-w-0 items-center gap-1.5">
          {markerIconByMarkerKind[marker.kind]}
          {worldAtlasCopy.markerKindLabels[marker.kind]}
        </p>
        <button type="button" className="world-atlas-release-button" aria-label={detailCopy.closeLabel} onClick={onReleaseRequested}>
          <X size={18} weight="bold" aria-hidden="true" />
        </button>
      </div>
      <h3 className="world-atlas-detail-name">{marker.markerName}</h3>
      <dl className="world-atlas-fact-list">
        <div>
          <dt>{detailCopy.regionLabel}</dt>
          <dd>{marker.regionName}</dd>
        </div>
        {marker.kind !== 'residence' ? (
          <div>
            <dt>{detailCopy.distanceLabel}</dt>
            <dd>{marker.distanceText ?? detailCopy.unknownDistance}</dd>
          </div>
        ) : null}
        {whisperCard ? (
          <>
            <div>
              <dt>{detailCopy.whisperSourceLabel}</dt>
              <dd>{whisperCard.sourceLabel}</dd>
            </div>
            <div>
              <dt>{detailCopy.whisperRumorLabel}</dt>
              <dd>{whisperCard.rumorText}</dd>
            </div>
            <div>
              <dt>{detailCopy.whisperSphereLabel}</dt>
              <dd>{whisperCard.sphereText}</dd>
            </div>
            <div>
              <dt>{detailCopy.whisperToneLabel}</dt>
              <dd>{whisperCard.toneText}</dd>
            </div>
            <div>
              <dt>{detailCopy.whisperThreatLabel}</dt>
              <dd>{whisperCard.threatText}</dd>
            </div>
          </>
        ) : null}
        {marker.accessDescription ? (
          <div>
            <dt>{detailCopy.accessLabel}</dt>
            <dd>{marker.accessDescription}</dd>
          </div>
        ) : null}
        <div>
          <dt>{detailCopy.knownFactsLabel}</dt>
          <dd>{marker.knownFacts}</dd>
        </div>
        <div>
          <dt>{detailCopy.knowledgeLabel}</dt>
          <dd>{worldAtlasCopy.knowledgeLabelByKnowledge[marker.knowledge]}</dd>
        </div>
        <div>
          <dt>{detailCopy.lastVisitLabel}</dt>
          <dd>{marker.lastVisitText}</dd>
        </div>
      </dl>
      {marker.isWhisperAlreadyInvestigated && marker.kind === 'whisper' ? (
        <p className="world-atlas-detail-text">{detailCopy.whisperAlreadyInvestigated}</p>
      ) : null}
      {marker.kind !== 'residence' ? (
        <div className="world-atlas-travel-estimate">
          <p className="dossier-label">{detailCopy.travelTitle}</p>
          {travelEstimate ? (
            <dl className="world-atlas-travel-figures">
              <div>
                <dt>{detailCopy.travelDurationLabel}</dt>
                <dd>{detailCopy.travelDuration(travelEstimate.travelHours)}</dd>
              </div>
              <div>
                <dt>{detailCopy.travelCostLabel}</dt>
                <dd>{detailCopy.travelCost(travelEstimate.operationalFundsCost)}</dd>
              </div>
            </dl>
          ) : (
            <p className="world-atlas-detail-text">{detailCopy.noRouteKnown}</p>
          )}
          <p className="world-atlas-travel-disclaimer">{detailCopy.travelDisclaimer}</p>
        </div>
      ) : null}
    </div>
  )
}

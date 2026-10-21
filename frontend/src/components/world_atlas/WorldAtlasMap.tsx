import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Crosshair,
  Minus,
  Plus,
  WaveSine,
} from '@phosphor-icons/react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { CSSProperties, FocusEvent as ReactFocusEvent, KeyboardEvent as ReactKeyboardEvent } from 'react'
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch'
import type { ReactZoomPanPinchContentRef, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch'
import { chooseAnimationVariantName, randomNumberBetween } from '../../animation/animation_variety'
import { useInteractionFeedback } from '../../audio/interaction_feedback'
import { worldAtlasCopy } from '../../copy/world_atlas_copy'
import {
  estimateDemonstrationTravel,
  worldAtlasMapDimensions,
  worldAtlasMapUnitsPerKilometer,
  worldAtlasPlaces,
  worldAtlasResidenceMapPoint,
} from '../../demonstration/world_atlas_data'
import type { SearchRadiusReach } from '../../demonstration/world_atlas_data'
import { usePlayerSettings } from '../../settings/player_settings'
import { WorldAtlasSketchLayer } from './WorldAtlasSketchLayer'
import type { WorldAtlasMarker } from './world_atlas_markers'
import {
  drawWorldAtlasDestinationStamp,
  drawWorldAtlasLocationRing,
  drawWorldAtlasRouteSketch,
  drawWorldAtlasSearchRadiusCircle,
  locatePointAlongRoute,
} from './world_atlas_sketch_drawing'
import { initialWorldAtlasViewPreferences, maximumZoomLevel, minimumZoomLevel } from './world_atlas_view_preferences'

export type WorldAtlasMapView = { zoomLevel: number; centerHorizontal: number; centerVertical: number }

type WorldAtlasMapProperties = {
  markers: WorldAtlasMarker[]
  unlocatedSignalMarker: WorldAtlasMarker | null
  selectedMarkerIdentifier: string | null
  mapView: WorldAtlasMapView
  searchRadiusReach: SearchRadiusReach
  isSearchRadiusVisible: boolean
  onMarkerChosen: (markerIdentifier: string) => void
  onMapViewChanged: (nextMapView: WorldAtlasMapView) => void
  onRecenterRequested: () => void
}

type FrameSize = { width: number; height: number }

const mapEntranceVariantNames = ['ink_draw', 'paper_unfold', 'drawer_slide'] as const
const pinDropVariantNames = ['straight_drop', 'swinging_drop', 'bouncing_drop'] as const
const compassTraceVariantNames = ['clockwise_sweep', 'counterclockwise_sweep', 'double_sweep'] as const
const routeAdvanceVariantNames = ['steady_dots', 'dash_pairs', 'footsteps'] as const
const pinStampVariantNames = ['heavy_slam', 'twisting_slam', 'double_strike'] as const
const compassNeedleVariantNames = ['wide_swing', 'short_shiver', 'full_turn'] as const
const unexplainedFlickerVariantNames = ['slow_breath', 'double_blink', 'long_silence'] as const

const zoomStepFactor = 1.35
const keyboardPanFraction = 0.18
const dragThresholdPixels = 6
const routeAdvanceIntervalMilliseconds = 45
const routeAdvanceDurationMilliseconds = 1100
const routeMarkSpacingMapUnits = 15
const labelVisibilityMinimumScale = 1 / 1.5
const viewMovementDurationMilliseconds = 260
const viewMovementSafetyMarginMilliseconds = 90
const viewReportDelayMilliseconds = 220
const entranceSafetyDurationMilliseconds = 2800
const minimumInkScale = 1
const maximumInkScale = 4
const inkScaleReferenceFactor = 0.8
const markerFocusMarginPixels = 40
const wheelZoomLevelPerDeltaUnit = 0.004
const doubleClickZoomLevelIncrement = 1.2

function clampMapView(mapView: WorldAtlasMapView, viewportAspectRatio: number): WorldAtlasMapView {
  const zoomLevel = Math.min(maximumZoomLevel, Math.max(minimumZoomLevel, mapView.zoomLevel))
  const visibleWidth = worldAtlasMapDimensions.width / zoomLevel
  const visibleHeight = visibleWidth / viewportAspectRatio
  const clampAlongAxis = (centerValue: number, visibleLength: number, worldLength: number) =>
    visibleLength >= worldLength
      ? worldLength / 2
      : Math.min(worldLength - visibleLength / 2, Math.max(visibleLength / 2, centerValue))
  return {
    zoomLevel,
    centerHorizontal: clampAlongAxis(mapView.centerHorizontal, visibleWidth, worldAtlasMapDimensions.width),
    centerVertical: clampAlongAxis(mapView.centerVertical, visibleHeight, worldAtlasMapDimensions.height),
  }
}

function convertMapViewToTransform(mapView: WorldAtlasMapView, frameSize: FrameSize) {
  const scale = (mapView.zoomLevel * frameSize.width) / worldAtlasMapDimensions.width
  return {
    scale,
    positionHorizontal: frameSize.width / 2 - mapView.centerHorizontal * scale,
    positionVertical: frameSize.height / 2 - mapView.centerVertical * scale,
  }
}

function convertTransformToMapView(
  transformState: { scale: number; positionX: number; positionY: number },
  frameSize: FrameSize,
): WorldAtlasMapView {
  const safeScale = Math.max(transformState.scale, 0.0001)
  return {
    zoomLevel: (safeScale * worldAtlasMapDimensions.width) / frameSize.width,
    centerHorizontal: (frameSize.width / 2 - transformState.positionX) / safeScale,
    centerVertical: (frameSize.height / 2 - transformState.positionY) / safeScale,
  }
}

function areMapViewsEquivalent(firstMapView: WorldAtlasMapView, secondMapView: WorldAtlasMapView): boolean {
  return (
    Math.abs(firstMapView.zoomLevel - secondMapView.zoomLevel) < 0.002 &&
    Math.abs(firstMapView.centerHorizontal - secondMapView.centerHorizontal) < 0.6 &&
    Math.abs(firstMapView.centerVertical - secondMapView.centerVertical) < 0.6
  )
}

export function WorldAtlasMap({
  markers,
  unlocatedSignalMarker,
  selectedMarkerIdentifier,
  mapView,
  searchRadiusReach,
  isSearchRadiusVisible,
  onMarkerChosen,
  onMapViewChanged,
  onRecenterRequested,
}: WorldAtlasMapProperties) {
  const mapCopy = worldAtlasCopy.map
  const detailCopy = worldAtlasCopy.detail
  const { shouldReduceMotion } = usePlayerSettings()
  const playInteractionFeedback = useInteractionFeedback()
  const descriptionElementIdentifier = useId()
  const frameElement = useRef<HTMLDivElement>(null)
  const transformControls = useRef<ReactZoomPanPinchContentRef>(null)
  const [frameSize, setFrameSize] = useState<FrameSize>({ width: 960, height: 600 })
  const [zoomAnnouncement, setZoomAnnouncement] = useState('')
  const [areLabelsVisible, setAreLabelsVisible] = useState(true)
  const [isEntrancePlaying, setIsEntrancePlaying] = useState(true)
  const [animatedRouteDestinationKey, setAnimatedRouteDestinationKey] = useState<string | null>(null)
  const [routeProgressFraction, setRouteProgressFraction] = useState(1)
  const [routeAdvanceVariantName, setRouteAdvanceVariantName] = useState<(typeof routeAdvanceVariantNames)[number]>(
    'steady_dots',
  )
  const [pinStampVariantName, setPinStampVariantName] = useState<(typeof pinStampVariantNames)[number]>('heavy_slam')
  const [travelTagTiltDegrees, setTravelTagTiltDegrees] = useState(-3)
  const [compassNeedleMovement, setCompassNeedleMovement] = useState<{
    movementCount: number
    variantName: (typeof compassNeedleVariantNames)[number]
  }>({ movementCount: 0, variantName: 'wide_swing' })
  const [mapEntranceVariantName] = useState(() =>
    chooseAnimationVariantName('world_atlas_map_entrance', mapEntranceVariantNames),
  )
  const [compassTraceVariantName] = useState(() =>
    chooseAnimationVariantName('world_atlas_compass_trace', compassTraceVariantNames),
  )
  const [unexplainedFlickerVariantName] = useState(() =>
    chooseAnimationVariantName('world_atlas_unexplained_flicker', unexplainedFlickerVariantNames),
  )
  const [pinDropStyleByMarkerIdentifier] = useState(
    () =>
      new Map(
        worldAtlasPlaces.map((place, placeOrder) => [
          place.identifier as string,
          {
            variantName: chooseAnimationVariantName('world_atlas_pin_drop', pinDropVariantNames),
            delay: Math.round(900 + placeOrder * 130 + randomNumberBetween(0, 120)),
          },
        ]),
      ),
  )
  const latestMapView = useRef(mapView)
  const lastReportedMapView = useRef(mapView)
  const latestFrameSize = useRef(frameSize)
  const latestViewChangeCallback = useRef(onMapViewChanged)
  const latestLabelVisibility = useRef(true)
  const latestInkScaleText = useRef('')
  const viewReportTimeoutIdentifier = useRef<number | null>(null)
  const viewMovementSafetyTimeoutIdentifier = useRef<number | null>(null)
  const panningStartPosition = useRef({ horizontal: 0, vertical: 0 })
  const hasDraggedSincePointerDown = useRef(false)

  useEffect(() => {
    latestViewChangeCallback.current = onMapViewChanged
  }, [onMapViewChanged])

  const cancelViewMovementSafety = useCallback(() => {
    if (viewMovementSafetyTimeoutIdentifier.current !== null) {
      window.clearTimeout(viewMovementSafetyTimeoutIdentifier.current)
      viewMovementSafetyTimeoutIdentifier.current = null
    }
  }, [])

  const reportLatestMapView = useCallback(() => {
    if (viewReportTimeoutIdentifier.current !== null) {
      window.clearTimeout(viewReportTimeoutIdentifier.current)
      viewReportTimeoutIdentifier.current = null
    }
    if (areMapViewsEquivalent(lastReportedMapView.current, latestMapView.current)) {
      return
    }
    lastReportedMapView.current = latestMapView.current
    latestViewChangeCallback.current(latestMapView.current)
  }, [])

  const moveViewTo = useCallback(
    (requestedMapView: WorldAtlasMapView, isMovementAnimated: boolean) => {
      const currentFrameSize = latestFrameSize.current
      const clampedMapView = clampMapView(requestedMapView, currentFrameSize.width / currentFrameSize.height)
      const targetTransform = convertMapViewToTransform(clampedMapView, currentFrameSize)
      latestMapView.current = clampedMapView
      cancelViewMovementSafety()
      const controls = transformControls.current
      if (!controls) {
        return clampedMapView
      }
      if (!isMovementAnimated) {
        void controls.setTransform(targetTransform.positionHorizontal, targetTransform.positionVertical, targetTransform.scale, 0)
        return clampedMapView
      }
      void controls.setTransform(
        targetTransform.positionHorizontal,
        targetTransform.positionVertical,
        targetTransform.scale,
        viewMovementDurationMilliseconds,
        'easeOutCubic',
      )
      viewMovementSafetyTimeoutIdentifier.current = window.setTimeout(() => {
        viewMovementSafetyTimeoutIdentifier.current = null
        void transformControls.current?.setTransform(
          targetTransform.positionHorizontal,
          targetTransform.positionVertical,
          targetTransform.scale,
          0,
        )
      }, viewMovementDurationMilliseconds + viewMovementSafetyMarginMilliseconds)
      return clampedMapView
    },
    [cancelViewMovementSafety],
  )

  useEffect(() => {
    const observedFrameElement = frameElement.current
    if (!observedFrameElement) {
      return
    }
    const measureFrame = () => {
      const frameBounds = observedFrameElement.getBoundingClientRect()
      if (frameBounds.width > 0 && frameBounds.height > 0) {
        setFrameSize((previousFrameSize) =>
          Math.abs(previousFrameSize.width - frameBounds.width) < 0.5 &&
          Math.abs(previousFrameSize.height - frameBounds.height) < 0.5
            ? previousFrameSize
            : { width: frameBounds.width, height: frameBounds.height },
        )
      }
    }
    measureFrame()
    const frameResizeObserver = new ResizeObserver(measureFrame)
    frameResizeObserver.observe(observedFrameElement)
    return () => frameResizeObserver.disconnect()
  }, [])

  useEffect(() => {
    latestFrameSize.current = frameSize
    moveViewTo(latestMapView.current, false)
  }, [frameSize, moveViewTo])

  useEffect(() => {
    const requestedMapView: WorldAtlasMapView = {
      zoomLevel: mapView.zoomLevel,
      centerHorizontal: mapView.centerHorizontal,
      centerVertical: mapView.centerVertical,
    }
    if (areMapViewsEquivalent(requestedMapView, lastReportedMapView.current)) {
      return
    }
    if (viewReportTimeoutIdentifier.current !== null) {
      window.clearTimeout(viewReportTimeoutIdentifier.current)
      viewReportTimeoutIdentifier.current = null
    }
    lastReportedMapView.current = requestedMapView
    moveViewTo(requestedMapView, !shouldReduceMotion)
  }, [mapView.zoomLevel, mapView.centerHorizontal, mapView.centerVertical, moveViewTo, shouldReduceMotion])

  useEffect(() => {
    const entranceTimeoutIdentifier = window.setTimeout(() => setIsEntrancePlaying(false), entranceSafetyDurationMilliseconds)
    return () => {
      window.clearTimeout(entranceTimeoutIdentifier)
      if (viewReportTimeoutIdentifier.current !== null) {
        window.clearTimeout(viewReportTimeoutIdentifier.current)
      }
      if (viewMovementSafetyTimeoutIdentifier.current !== null) {
        window.clearTimeout(viewMovementSafetyTimeoutIdentifier.current)
      }
    }
  }, [])

  const handleTransformed = (
    _transformReference: ReactZoomPanPinchRef,
    transformState: { scale: number; positionX: number; positionY: number },
  ) => {
    const currentFrameSize = latestFrameSize.current
    latestMapView.current = convertTransformToMapView(transformState, currentFrameSize)
    const safeScale = Math.max(transformState.scale, 0.0001)
    const inkScaleText = Math.min(maximumInkScale, Math.max(minimumInkScale, inkScaleReferenceFactor / safeScale)).toFixed(1)
    const framedElement = frameElement.current
    if (framedElement) {
      framedElement.style.setProperty('--world-atlas-inverse-scale', (1 / safeScale).toFixed(4))
      if (inkScaleText !== latestInkScaleText.current) {
        latestInkScaleText.current = inkScaleText
        framedElement.style.setProperty('--world-atlas-ink-scale', inkScaleText)
      }
    }
    const shouldLabelsBeVisible = safeScale >= labelVisibilityMinimumScale
    if (shouldLabelsBeVisible !== latestLabelVisibility.current) {
      latestLabelVisibility.current = shouldLabelsBeVisible
      setAreLabelsVisible(shouldLabelsBeVisible)
    }
    if (viewReportTimeoutIdentifier.current !== null) {
      window.clearTimeout(viewReportTimeoutIdentifier.current)
    }
    viewReportTimeoutIdentifier.current = window.setTimeout(reportLatestMapView, viewReportDelayMilliseconds)
  }

  const handleGestureStarted = (transformReference: ReactZoomPanPinchRef) => {
    cancelViewMovementSafety()
    hasDraggedSincePointerDown.current = false
    panningStartPosition.current = {
      horizontal: transformReference.state.positionX,
      vertical: transformReference.state.positionY,
    }
    const framedElement = frameElement.current
    if (framedElement && !framedElement.contains(document.activeElement)) {
      framedElement.focus({ preventScroll: true })
    }
  }

  const handlePanningAdvanced = (transformReference: ReactZoomPanPinchRef) => {
    const travelledPixels = Math.hypot(
      transformReference.state.positionX - panningStartPosition.current.horizontal,
      transformReference.state.positionY - panningStartPosition.current.vertical,
    )
    if (travelledPixels >= dragThresholdPixels) {
      hasDraggedSincePointerDown.current = true
    }
  }

  const announceCurrentZoom = () => {
    setZoomAnnouncement(mapCopy.zoomAnnouncement(Math.round(latestMapView.current.zoomLevel * 100)))
  }

  const stirCompassNeedle = () => {
    const variantName = chooseAnimationVariantName('world_atlas_compass_needle', compassNeedleVariantNames)
    setCompassNeedleMovement((previousMovement) => ({ movementCount: previousMovement.movementCount + 1, variantName }))
  }

  const zoomWithControl = (zoomFactor: number) => {
    const currentMapView = latestMapView.current
    const nextZoomLevel = Math.min(maximumZoomLevel, Math.max(minimumZoomLevel, currentMapView.zoomLevel * zoomFactor))
    if (Math.abs(nextZoomLevel - currentMapView.zoomLevel) < 0.001) {
      playInteractionFeedback('rejection')
      return
    }
    playInteractionFeedback('option_click')
    moveViewTo({ ...currentMapView, zoomLevel: nextZoomLevel }, !shouldReduceMotion)
    setZoomAnnouncement(mapCopy.zoomAnnouncement(Math.round(nextZoomLevel * 100)))
  }

  const panWithControl = (horizontalDirection: number, verticalDirection: number) => {
    const currentMapView = latestMapView.current
    const currentFrameSize = latestFrameSize.current
    const currentVisibleWidth = worldAtlasMapDimensions.width / currentMapView.zoomLevel
    const currentVisibleHeight = (currentVisibleWidth * currentFrameSize.height) / currentFrameSize.width
    playInteractionFeedback('option_click')
    moveViewTo(
      {
        ...currentMapView,
        centerHorizontal: currentMapView.centerHorizontal + horizontalDirection * currentVisibleWidth * keyboardPanFraction,
        centerVertical: currentMapView.centerVertical + verticalDirection * currentVisibleHeight * keyboardPanFraction,
      },
      !shouldReduceMotion,
    )
  }

  const requestRecenter = () => {
    playInteractionFeedback('falling_whoosh')
    stirCompassNeedle()
    if (viewReportTimeoutIdentifier.current !== null) {
      window.clearTimeout(viewReportTimeoutIdentifier.current)
      viewReportTimeoutIdentifier.current = null
    }
    lastReportedMapView.current = moveViewTo(
      {
        zoomLevel: initialWorldAtlasViewPreferences.zoomLevel,
        centerHorizontal: worldAtlasResidenceMapPoint.horizontal,
        centerVertical: worldAtlasResidenceMapPoint.vertical,
      },
      !shouldReduceMotion,
    )
    onRecenterRequested()
  }

  const handleFrameKeyDown = (keyboardEvent: ReactKeyboardEvent<HTMLDivElement>) => {
    const targetElement = keyboardEvent.target as HTMLElement
    if (targetElement.tagName === 'BUTTON') {
      return
    }
    const panDirectionByKey: Record<string, [number, number]> = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
    }
    const panDirection = panDirectionByKey[keyboardEvent.key]
    if (panDirection) {
      keyboardEvent.preventDefault()
      panWithControl(panDirection[0], panDirection[1])
      return
    }
    if (keyboardEvent.key === '+' || keyboardEvent.key === '=') {
      keyboardEvent.preventDefault()
      zoomWithControl(zoomStepFactor)
      return
    }
    if (keyboardEvent.key === '-' || keyboardEvent.key === '_') {
      keyboardEvent.preventDefault()
      zoomWithControl(1 / zoomStepFactor)
      return
    }
    if (keyboardEvent.key === '0') {
      keyboardEvent.preventDefault()
      requestRecenter()
    }
  }

  const chooseMarker = (markerIdentifier: string) => {
    if (hasDraggedSincePointerDown.current) {
      hasDraggedSincePointerDown.current = false
      return
    }
    onMarkerChosen(markerIdentifier)
  }

  const bringFocusedMarkerIntoView = (focusEvent: ReactFocusEvent<HTMLButtonElement>, marker: WorldAtlasMarker) => {
    const wrapperElement = transformControls.current?.instance.wrapperComponent
    wrapperElement?.scrollTo(0, 0)
    if (!marker.mapPoint || !focusEvent.currentTarget.matches(':focus-visible')) {
      return
    }
    const currentFrameSize = latestFrameSize.current
    const currentTransform = convertMapViewToTransform(latestMapView.current, currentFrameSize)
    const framedHorizontal = marker.mapPoint.horizontal * currentTransform.scale + currentTransform.positionHorizontal
    const framedVertical = marker.mapPoint.vertical * currentTransform.scale + currentTransform.positionVertical
    const isInsideFrame =
      framedHorizontal >= markerFocusMarginPixels &&
      framedHorizontal <= currentFrameSize.width - markerFocusMarginPixels &&
      framedVertical >= markerFocusMarginPixels &&
      framedVertical <= currentFrameSize.height - markerFocusMarginPixels
    if (!isInsideFrame) {
      moveViewTo(
        {
          ...latestMapView.current,
          centerHorizontal: marker.mapPoint.horizontal,
          centerVertical: marker.mapPoint.vertical,
        },
        !shouldReduceMotion,
      )
    }
  }

  const selectedMarker = markers.find((marker) => marker.identifier === selectedMarkerIdentifier) ?? null
  const routeDestinationMarker =
    selectedMarker &&
    selectedMarker.mapPoint !== null &&
    selectedMarker.kind !== 'residence' &&
    selectedMarker.kind !== 'unexplained_mark'
      ? selectedMarker
      : null
  const routeDestinationKey = routeDestinationMarker?.identifier ?? null

  useEffect(() => {
    if (routeDestinationKey === null) {
      return
    }
    const startingTimeoutIdentifier = window.setTimeout(() => {
      setRouteAdvanceVariantName(chooseAnimationVariantName('world_atlas_route_advance', routeAdvanceVariantNames))
      setPinStampVariantName(chooseAnimationVariantName('world_atlas_pin_stamp', pinStampVariantNames))
      setTravelTagTiltDegrees(randomNumberBetween(-5, 5))
      setCompassNeedleMovement((previousMovement) => ({
        movementCount: previousMovement.movementCount + 1,
        variantName: chooseAnimationVariantName('world_atlas_compass_needle', compassNeedleVariantNames),
      }))
      setRouteProgressFraction(shouldReduceMotion ? 1 : 0)
      setAnimatedRouteDestinationKey(routeDestinationKey)
    }, 0)
    if (shouldReduceMotion) {
      return () => window.clearTimeout(startingTimeoutIdentifier)
    }
    const startedTimestamp = Date.now()
    const advanceIntervalIdentifier = window.setInterval(() => {
      const elapsedFraction = Math.min(1, (Date.now() - startedTimestamp) / routeAdvanceDurationMilliseconds)
      setRouteProgressFraction(elapsedFraction)
      if (elapsedFraction >= 1) {
        window.clearInterval(advanceIntervalIdentifier)
        playInteractionFeedback('stamp_impact')
      }
    }, routeAdvanceIntervalMilliseconds)
    return () => {
      window.clearTimeout(startingTimeoutIdentifier)
      window.clearInterval(advanceIntervalIdentifier)
    }
  }, [routeDestinationKey, shouldReduceMotion, playInteractionFeedback])

  const routeSketch = useMemo(
    () =>
      routeDestinationMarker && routeDestinationMarker.mapPoint
        ? drawWorldAtlasRouteSketch(routeDestinationMarker.identifier, routeDestinationMarker.mapPoint)
        : null,
    [routeDestinationMarker],
  )

  const routeMarks = useMemo(() => {
    if (!routeSketch) {
      return []
    }
    const markCount = Math.max(3, Math.floor(routeSketch.routeLength / routeMarkSpacingMapUnits))
    return Array.from({ length: markCount }, (_, markIndex) => {
      const markFraction = (markIndex + 1) / (markCount + 1)
      return {
        ...locatePointAlongRoute(routeSketch, markFraction),
        markFraction,
        sideSign: markIndex % 2 === 0 ? 1 : -1,
      }
    })
  }, [routeSketch])

  const shownRouteProgressFraction = shouldReduceMotion
    ? 1
    : animatedRouteDestinationKey === routeDestinationKey
      ? routeProgressFraction
      : 0
  const isRouteComplete = routeDestinationMarker !== null && shownRouteProgressFraction >= 1
  const travelEstimate =
    routeDestinationMarker && routeDestinationMarker.distanceKilometers !== null && routeDestinationMarker.distanceKilometers > 0
      ? estimateDemonstrationTravel(routeDestinationMarker.distanceKilometers)
      : null
  const travelTagPoint = routeSketch ? locatePointAlongRoute(routeSketch, 0.5) : null

  const searchRadiusMapUnits =
    searchRadiusReach.kind === 'limited' ? searchRadiusReach.kilometers * worldAtlasMapUnitsPerKilometer : null
  const searchRadiusPathData = useMemo(
    () => (searchRadiusMapUnits === null ? null : drawWorldAtlasSearchRadiusCircle(searchRadiusMapUnits)),
    [searchRadiusMapUnits],
  )

  const minimumScale = (minimumZoomLevel * frameSize.width) / worldAtlasMapDimensions.width
  const maximumScale = (maximumZoomLevel * frameSize.width) / worldAtlasMapDimensions.width
  const initialTransform = convertMapViewToTransform(
    clampMapView(mapView, frameSize.width / frameSize.height),
    frameSize,
  )

  return (
    <div
      ref={frameElement}
      className={`world-atlas-map-frame ${isEntrancePlaying ? `world-atlas-map-entrance-${mapEntranceVariantName}` : ''} ${
        isRouteComplete ? 'world-atlas-map-frame-impact' : ''
      }`}
      tabIndex={0}
      role="group"
      aria-label={mapCopy.sectionTitle}
      aria-describedby={descriptionElementIdentifier}
      onKeyDown={handleFrameKeyDown}
    >
      <p id={descriptionElementIdentifier} className="visually-hidden-text">
        {mapCopy.mapDescription(markers.find((marker) => marker.kind === 'residence')?.markerName ?? '')}
      </p>
      <p className="visually-hidden-text" aria-live="polite">
        {zoomAnnouncement}
      </p>
      <TransformWrapper
        ref={transformControls}
        initialScale={initialTransform.scale}
        initialPositionX={initialTransform.positionHorizontal}
        initialPositionY={initialTransform.positionVertical}
        minScale={minimumScale}
        maxScale={maximumScale}
        limitToBounds
        centerZoomedOut
        centerOnInit={false}
        disablePadding
        smooth
        wheel={{
          step: minimumScale * wheelZoomLevelPerDeltaUnit,
          activationKeys: (pressedKeys) =>
            pressedKeys.includes('Control') ||
            pressedKeys.includes('Meta') ||
            (frameElement.current?.contains(document.activeElement) ?? false),
        }}
        pinch={{ step: 5 }}
        doubleClick={{
          mode: 'zoomIn',
          step: minimumScale * doubleClickZoomLevelIncrement,
          animationTime: shouldReduceMotion ? 0 : 240,
          excluded: ['world-atlas-marker-button'],
        }}
        velocityAnimation={{ disabled: shouldReduceMotion }}
        zoomAnimation={{ disabled: shouldReduceMotion }}
        autoAlignment={{ disabled: shouldReduceMotion }}
        keyboard={{ disabled: true }}
        onInit={() => {
          moveViewTo(latestMapView.current, false)
        }}
        onTransform={handleTransformed}
        onPanningStart={handleGestureStarted}
        onPanning={handlePanningAdvanced}
        onPinchStart={handleGestureStarted}
        onWheelStart={cancelViewMovementSafety}
        onWheelStop={announceCurrentZoom}
        onPinchStop={announceCurrentZoom}
      >
        <TransformComponent
          wrapperClass="world-atlas-map-viewport"
          contentClass="world-atlas-map-sheet"
          wrapperStyle={{ width: '100%', height: '100%' }}
          contentStyle={{ width: worldAtlasMapDimensions.width, height: worldAtlasMapDimensions.height }}
        >
          <WorldAtlasSketchLayer />
          <svg
            className="world-atlas-annotation-layer"
            width={worldAtlasMapDimensions.width}
            height={worldAtlasMapDimensions.height}
            viewBox={`0 0 ${worldAtlasMapDimensions.width} ${worldAtlasMapDimensions.height}`}
            aria-hidden="true"
            focusable="false"
          >
            {markers
              .filter((marker) => marker.mapPoint !== null && marker.kind !== 'unexplained_mark')
              .map((marker) => (
                <path
                  key={marker.identifier}
                  d={drawWorldAtlasLocationRing(marker.identifier, marker.mapPoint ?? worldAtlasResidenceMapPoint)}
                  className="world-atlas-location-ring"
                />
              ))}
            {isSearchRadiusVisible && searchRadiusPathData !== null && searchRadiusMapUnits !== null ? (
              <g className={`world-atlas-search-radius world-atlas-search-radius-${compassTraceVariantName}`}>
                <path d={searchRadiusPathData} pathLength={1} className="world-atlas-search-radius-circle" />
                <g transform={`translate(${worldAtlasResidenceMapPoint.horizontal} ${worldAtlasResidenceMapPoint.vertical})`}>
                  <line x1={0} y1={0} x2={searchRadiusMapUnits} y2={0} className="world-atlas-compass-arm" />
                </g>
              </g>
            ) : null}
            {routeSketch ? (
              <g>
                <path
                  d={routeSketch.pencilPathData}
                  pathLength={1}
                  className="world-atlas-route-pencil-line"
                  style={{ strokeDasharray: 1, strokeDashoffset: 1 - shownRouteProgressFraction }}
                />
                {routeMarks
                  .filter((routeMark) => routeMark.markFraction <= shownRouteProgressFraction)
                  .map((routeMark) => (
                    <g
                      key={routeMark.markFraction}
                      transform={`translate(${routeMark.horizontal} ${routeMark.vertical}) rotate(${routeMark.angleDegrees})`}
                    >
                      <g className="world-atlas-route-mark-scaler">
                        {routeAdvanceVariantName === 'steady_dots' ? <circle r={2.3} className="world-atlas-route-mark" /> : null}
                        {routeAdvanceVariantName === 'dash_pairs' ? (
                          <rect x={-3.5} y={-1.3} width={7} height={2.6} className="world-atlas-route-mark" />
                        ) : null}
                        {routeAdvanceVariantName === 'footsteps' ? (
                          <ellipse cy={routeMark.sideSign * 3.4} rx={3} ry={1.7} className="world-atlas-route-mark" />
                        ) : null}
                      </g>
                    </g>
                  ))}
                {isRouteComplete && routeDestinationMarker?.mapPoint ? (
                  <path
                    d={drawWorldAtlasDestinationStamp(routeDestinationMarker.identifier, routeDestinationMarker.mapPoint)}
                    pathLength={1}
                    className="world-atlas-destination-stamp-ring"
                  />
                ) : null}
              </g>
            ) : null}
          </svg>

          {isSearchRadiusVisible && searchRadiusMapUnits !== null && searchRadiusReach.kind === 'limited' ? (
            <span
              className="world-atlas-search-radius-label"
              style={{
                left: worldAtlasResidenceMapPoint.horizontal,
                top: worldAtlasResidenceMapPoint.vertical - searchRadiusMapUnits,
              }}
              aria-hidden="true"
            >
              {mapCopy.searchRadiusLabel(searchRadiusReach.kilometers)}
            </span>
          ) : null}

          {markers
            .filter((marker) => marker.mapPoint !== null)
            .map((marker) => {
              const markerPoint = marker.mapPoint ?? worldAtlasResidenceMapPoint
              const isSelected = marker.identifier === selectedMarkerIdentifier
              const isStamped = isSelected && isRouteComplete && routeDestinationKey === marker.identifier
              const pinDropStyle = pinDropStyleByMarkerIdentifier.get(marker.identifier) ?? {
                variantName: pinDropVariantNames[0],
                delay: 900,
              }
              const kindLabel = worldAtlasCopy.markerKindLabels[marker.kind]
              const isLabelShown = areLabelsVisible || isSelected || marker.kind === 'residence'
              const isLabelOnLeft = markerPoint.horizontal < worldAtlasResidenceMapPoint.horizontal
              return (
                <button
                  key={marker.identifier}
                  type="button"
                  className={`world-atlas-marker world-atlas-marker-button world-atlas-marker-${marker.kind} ${
                    isSelected ? 'world-atlas-marker-selected' : ''
                  }`}
                  style={{ left: markerPoint.horizontal, top: markerPoint.vertical }}
                  aria-pressed={isSelected}
                  aria-label={worldAtlasCopy.markerAccessibleName(kindLabel, marker.markerName, marker.distanceText)}
                  onClick={() => chooseMarker(marker.identifier)}
                  onFocus={(focusEvent) => bringFocusedMarkerIntoView(focusEvent, marker)}
                  onPointerEnter={(pointerEvent) => {
                    if (pointerEvent.pointerType === 'mouse') {
                      playInteractionFeedback('option_hover')
                    }
                  }}
                >
                  <span className={`world-atlas-marker-pin-frame ${isStamped ? `world-atlas-pin-stamp-${pinStampVariantName}` : ''}`}>
                    <svg className="world-atlas-marker-pin-drawing" width={48} height={48} viewBox="-24 -36 48 48" aria-hidden="true" focusable="false">
                      <circle r={19} cy={-9} className="world-atlas-marker-focus-ring" />
                      {isSelected ? <circle r={15} cy={-9} className="world-atlas-marker-selection-ring" /> : null}
                      <g
                        className={`world-atlas-pin ${isEntrancePlaying ? `world-atlas-pin-${pinDropStyle.variantName}` : ''} ${
                          marker.kind === 'unexplained_mark' ? `world-atlas-unexplained-${unexplainedFlickerVariantName}` : ''
                        }`}
                        style={isEntrancePlaying ? { animationDelay: `${pinDropStyle.delay}ms` } : undefined}
                      >
                        {marker.kind === 'unexplained_mark' ? (
                          <>
                            <circle r={9} className="world-atlas-unexplained-halo" />
                            <path d="M 0 -6 L 6 0 L 0 6 L -6 0 Z" className="world-atlas-unexplained-shape" />
                            <circle r={1.6} className="world-atlas-unexplained-core" />
                          </>
                        ) : (
                          <>
                            <ellipse cx={3} cy={1} rx={6} ry={2} className="world-atlas-pin-shadow" />
                            <line x1={0} y1={0} x2={0} y2={-13} className="world-atlas-pin-needle" />
                            {marker.kind === 'residence' ? (
                              <path d="M -8 -12 L 0 -25 L 8 -12 L 8 -11 L -8 -11 Z M -6 -11 L 6 -11" className="world-atlas-pin-head-residence" />
                            ) : null}
                            {marker.kind === 'whisper' ? (
                              <>
                                <circle cy={-18} r={6.5} className="world-atlas-pin-head-whisper" />
                                <path d="M -11 -23 A 9 9 0 0 0 -11 -13 M 11 -23 A 9 9 0 0 1 11 -13" className="world-atlas-pin-wave" />
                              </>
                            ) : null}
                            {marker.kind === 'visited_place' ? (
                              <>
                                <circle cy={-18} r={7} className="world-atlas-pin-head-visited" />
                                <path d="M -3.4 -18 L -0.8 -15.2 L 3.8 -20.8" className="world-atlas-pin-check" />
                              </>
                            ) : null}
                            {marker.kind === 'known_place' ? <circle cy={-17} r={5.5} className="world-atlas-pin-head-known" /> : null}
                          </>
                        )}
                      </g>
                    </svg>
                  </span>
                  {isLabelShown ? (
                    <span
                      className={`world-atlas-marker-label-plate ${isLabelOnLeft ? 'world-atlas-marker-label-plate-left' : ''}`}
                      aria-hidden="true"
                    >
                      <span className="world-atlas-marker-label">{marker.markerName}</span>
                      {marker.distanceText ? <span className="world-atlas-marker-distance-label">{marker.distanceText}</span> : null}
                    </span>
                  ) : null}
                </button>
              )
            })}

          {isRouteComplete && travelEstimate && travelTagPoint ? (
            <span
              key={routeDestinationKey}
              className="world-atlas-travel-tag"
              style={
                {
                  left: travelTagPoint.horizontal,
                  top: travelTagPoint.vertical,
                  '--world-atlas-travel-tag-tilt': `${travelTagTiltDegrees.toFixed(2)}deg`,
                } as CSSProperties
              }
              aria-hidden="true"
            >
              <span className="world-atlas-travel-tag-title">{detailCopy.travelTitle}</span>
              <span className="world-atlas-travel-tag-line">{detailCopy.travelDuration(travelEstimate.travelHours)}</span>
              <span className="world-atlas-travel-tag-line world-atlas-travel-tag-cost">
                {detailCopy.travelCost(travelEstimate.operationalFundsCost)}
              </span>
            </span>
          ) : null}
        </TransformComponent>
      </TransformWrapper>

      <svg className="world-atlas-compass-rose" width={92} height={100} viewBox="-46 -48 92 100" aria-hidden="true" focusable="false">
        <circle r={30} className="world-atlas-compass-rose-plate" />
        <circle r={22} className="world-atlas-compass-rose-ring" />
        <g
          key={compassNeedleMovement.movementCount}
          className={
            compassNeedleMovement.movementCount > 0
              ? `world-atlas-compass-needle-group world-atlas-compass-needle-${compassNeedleMovement.variantName}`
              : 'world-atlas-compass-needle-group'
          }
        >
          <path d="M 0 -27 L 6 0 L 0 27 L -6 0 Z" className="world-atlas-compass-rose-needle" />
          <path d="M -27 0 L 0 -6 L 27 0 L 0 6 Z" className="world-atlas-compass-rose-cross-needle" />
          <path d="M 0 -27 L 6 0 L -6 0 Z" className="world-atlas-compass-rose-north" />
        </g>
        <text y={-33} textAnchor="middle" className="world-atlas-compass-rose-letter">{mapCopy.compassNorthLetter}</text>
        <text y={43} textAnchor="middle" className="world-atlas-compass-rose-letter">{mapCopy.compassSouthLetter}</text>
        <text x={38} y={4} textAnchor="middle" className="world-atlas-compass-rose-letter">{mapCopy.compassEastLetter}</text>
        <text x={-38} y={4} textAnchor="middle" className="world-atlas-compass-rose-letter">{mapCopy.compassWestLetter}</text>
      </svg>

      <div className="world-atlas-zoom-controls">
        <button type="button" className="world-atlas-map-control" aria-label={mapCopy.zoomInLabel} onClick={() => zoomWithControl(zoomStepFactor)}>
          <Plus size={20} weight="bold" aria-hidden="true" />
        </button>
        <button type="button" className="world-atlas-map-control" aria-label={mapCopy.zoomOutLabel} onClick={() => zoomWithControl(1 / zoomStepFactor)}>
          <Minus size={20} weight="bold" aria-hidden="true" />
        </button>
        <button type="button" className="world-atlas-map-control" aria-label={mapCopy.recenterLabel} onClick={requestRecenter}>
          <Crosshair size={20} weight="bold" aria-hidden="true" />
        </button>
      </div>

      <div className="world-atlas-pan-controls">
        <button type="button" className="world-atlas-map-control world-atlas-pan-north" aria-label={mapCopy.panNorthLabel} onClick={() => panWithControl(0, -1)}>
          <ArrowUp size={18} weight="bold" aria-hidden="true" />
        </button>
        <button type="button" className="world-atlas-map-control world-atlas-pan-west" aria-label={mapCopy.panWestLabel} onClick={() => panWithControl(-1, 0)}>
          <ArrowLeft size={18} weight="bold" aria-hidden="true" />
        </button>
        <button type="button" className="world-atlas-map-control world-atlas-pan-east" aria-label={mapCopy.panEastLabel} onClick={() => panWithControl(1, 0)}>
          <ArrowRight size={18} weight="bold" aria-hidden="true" />
        </button>
        <button type="button" className="world-atlas-map-control world-atlas-pan-south" aria-label={mapCopy.panSouthLabel} onClick={() => panWithControl(0, 1)}>
          <ArrowDown size={18} weight="bold" aria-hidden="true" />
        </button>
      </div>

      {unlocatedSignalMarker ? (
        <button
          type="button"
          className={`world-atlas-unlocated-signal ${
            selectedMarkerIdentifier === unlocatedSignalMarker.identifier ? 'world-atlas-unlocated-signal-selected' : ''
          }`}
          aria-pressed={selectedMarkerIdentifier === unlocatedSignalMarker.identifier}
          onClick={() => onMarkerChosen(unlocatedSignalMarker.identifier)}
          onPointerEnter={(pointerEvent) => {
            if (pointerEvent.pointerType === 'mouse') {
              playInteractionFeedback('option_hover')
            }
          }}
        >
          <WaveSine size={20} weight="bold" aria-hidden="true" />
          <span className="min-w-0">
            <span className="world-atlas-unlocated-signal-name">{mapCopy.unlocatedSignalLabel}</span>
            <span className="world-atlas-unlocated-signal-hint">{mapCopy.unlocatedSignalHint}</span>
          </span>
        </button>
      ) : null}
    </div>
  )
}

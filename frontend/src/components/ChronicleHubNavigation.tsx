import {
  ArrowBendUpLeft,
  BookBookmark,
  Buildings,
  GlobeHemisphereWest,
  HouseLine,
  IdentificationCard,
  Radio,
  BookOpenText,
  UserCircleGear,
} from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { chooseAnimationVariantName } from '../animation/animation_variety'
import { useInteractionFeedback } from '../audio/interaction_feedback'
import { prefetchScreenModule } from '../loading/lazily_loaded_screens'
import type { ScreenName } from '../navigation/screen_navigation'
import { spanishInterfaceCopy } from '../spanish_interface_copy'

type ActiveIndicatorPlacement = { horizontalOffset: number; width: number }

type ScrollEdgeState = { canScrollBackward: boolean; canScrollForward: boolean }

const indicatorTravelVariantNames = ['travel_snap', 'travel_stretch', 'travel_overshoot'] as const
const pressedInkVariantNames = ['ink_flash_from_left', 'ink_flash_from_center', 'ink_flash_from_below'] as const
const pressHapticMilliseconds = 10

let lastKnownIndicatorPlacement: ActiveIndicatorPlacement | null = null

function vibrateBriefly() {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(pressHapticMilliseconds)
  }
}

type ChronicleHubNavigationProperties = {
  currentScreenName: ScreenName
  hasOpenArchive: boolean
  onScreenRequested: (screenName: ScreenName) => void
}

export function ChronicleHubNavigation({
  currentScreenName,
  hasOpenArchive,
  onScreenRequested,
}: ChronicleHubNavigationProperties) {
  const hubCopy = spanishInterfaceCopy.chronicleHub
  const playInteractionFeedback = useInteractionFeedback()
  const navigationScroller = useRef<HTMLDivElement>(null)
  const [indicatorPlacement, setIndicatorPlacement] = useState<ActiveIndicatorPlacement | null>(
    () => lastKnownIndicatorPlacement,
  )
  const [indicatorTravelVariantName, setIndicatorTravelVariantName] = useState(() =>
    chooseAnimationVariantName('chronicle_hub_indicator_travel', indicatorTravelVariantNames),
  )
  const [pressedInkVariantName, setPressedInkVariantName] = useState<string>(pressedInkVariantNames[0])
  const [scrollEdgeState, setScrollEdgeState] = useState<ScrollEdgeState>({
    canScrollBackward: false,
    canScrollForward: false,
  })

  useEffect(() => {
    const scrollerElement = navigationScroller.current
    if (!scrollerElement) {
      return
    }
    const currentEntryElement = scrollerElement.querySelector<HTMLElement>('[aria-current="page"]')
    currentEntryElement?.scrollIntoView({ block: 'nearest', inline: 'center' })

    const measureNavigation = () => {
      const measuredEntryElement = scrollerElement.querySelector<HTMLElement>('[aria-current="page"]')
      const measuredPlacement = measuredEntryElement
        ? { horizontalOffset: measuredEntryElement.offsetLeft, width: measuredEntryElement.offsetWidth }
        : null
      lastKnownIndicatorPlacement = measuredPlacement
      setIndicatorPlacement((previousPlacement) =>
        previousPlacement?.horizontalOffset === measuredPlacement?.horizontalOffset &&
        previousPlacement?.width === measuredPlacement?.width
          ? previousPlacement
          : measuredPlacement,
      )
    }
    const measureScrollEdges = () => {
      const canScrollBackward = scrollerElement.scrollLeft > 2
      const canScrollForward = scrollerElement.scrollLeft + scrollerElement.clientWidth < scrollerElement.scrollWidth - 2
      setScrollEdgeState((previousState) =>
        previousState.canScrollBackward === canScrollBackward && previousState.canScrollForward === canScrollForward
          ? previousState
          : { canScrollBackward, canScrollForward },
      )
    }
    const navigationResizeObserver = new ResizeObserver(() => {
      measureNavigation()
      measureScrollEdges()
    })
    navigationResizeObserver.observe(scrollerElement)
    if (currentEntryElement) {
      navigationResizeObserver.observe(currentEntryElement)
    }
    scrollerElement.addEventListener('scroll', measureScrollEdges, { passive: true })
    return () => {
      navigationResizeObserver.disconnect()
      scrollerElement.removeEventListener('scroll', measureScrollEdges)
    }
  }, [currentScreenName, hasOpenArchive])

  const hubEntries: Array<{ screenName: ScreenName; label: string; icon: ReactNode }> = [
    { screenName: 'whisper_selection', label: hubCopy.whispers, icon: <Radio size={18} weight="fill" aria-hidden="true" /> },
    { screenName: 'world_atlas', label: hubCopy.world, icon: <GlobeHemisphereWest size={18} weight="fill" aria-hidden="true" /> },
    { screenName: 'sanctuary_home', label: hubCopy.home, icon: <HouseLine size={18} weight="fill" aria-hidden="true" /> },
    {
      screenName: 'organizations_allies',
      label: hubCopy.organizations,
      icon: <Buildings size={18} weight="fill" aria-hidden="true" />,
    },
    {
      screenName: 'character_dossier',
      label: hubCopy.dossier,
      icon: <IdentificationCard size={18} weight="fill" aria-hidden="true" />,
    },
    { screenName: 'case_journal', label: hubCopy.journal, icon: <BookBookmark size={18} weight="fill" aria-hidden="true" /> },
    {
      screenName: 'chronicle_history',
      label: hubCopy.history,
      icon: <BookOpenText size={18} weight="fill" aria-hidden="true" />,
    },
    {
      screenName: 'investigator_profile',
      label: hubCopy.profile,
      icon: <UserCircleGear size={18} weight="fill" aria-hidden="true" />,
    },
  ]
  return (
    <nav className="chronicle-hub-navigation" aria-label={hubCopy.navigationLabel}>
      <div
        ref={navigationScroller}
        className="chronicle-hub-navigation-scroller"
        data-can-scroll-backward={scrollEdgeState.canScrollBackward}
        data-can-scroll-forward={scrollEdgeState.canScrollForward}
        data-is-indicator-placed={indicatorPlacement !== null}
      >
      {indicatorPlacement !== null ? (
        <span
          className="chronicle-hub-navigation-indicator"
          data-travel-variant={indicatorTravelVariantName}
          aria-hidden="true"
          style={
            {
              '--indicator-horizontal-offset': `${indicatorPlacement.horizontalOffset}px`,
              '--indicator-width': `${indicatorPlacement.width}px`,
            } as CSSProperties
          }
        />
      ) : null}
      {hasOpenArchive ? (
        <button
          type="button"
          className="chronicle-hub-navigation-entry"
          data-returns-to-archive="true"
          data-pressed-ink-variant={pressedInkVariantName}
          onFocus={() => prefetchScreenModule('archive_play')}
          onPointerDown={() => prefetchScreenModule('archive_play')}
          onPointerEnter={(pointerEvent) => {
            prefetchScreenModule('archive_play')
            if (pointerEvent.pointerType === 'mouse') {
              playInteractionFeedback('option_hover')
            }
          }}
          onClick={() => {
            playInteractionFeedback('option_click')
            vibrateBriefly()
            onScreenRequested('archive_play')
          }}
        >
          <ArrowBendUpLeft size={18} weight="bold" aria-hidden="true" />
          <span className="chronicle-hub-navigation-label">{hubCopy.returnToArchive}</span>
        </button>
      ) : null}
      {hubEntries
        .filter((hubEntry) => !hasOpenArchive || hubEntry.screenName !== 'whisper_selection')
        .map((hubEntry) => (
          <button
            key={hubEntry.screenName}
            type="button"
            className="chronicle-hub-navigation-entry"
            aria-current={hubEntry.screenName === currentScreenName ? 'page' : undefined}
            aria-label={hubEntry.label}
            title={hubEntry.label}
            data-pressed-ink-variant={pressedInkVariantName}
            onFocus={() => prefetchScreenModule(hubEntry.screenName)}
            onPointerDown={() => {
              prefetchScreenModule(hubEntry.screenName)
              setPressedInkVariantName(chooseAnimationVariantName('chronicle_hub_pressed_ink', pressedInkVariantNames))
            }}
            onPointerEnter={(pointerEvent) => {
              prefetchScreenModule(hubEntry.screenName)
              if (pointerEvent.pointerType === 'mouse' && hubEntry.screenName !== currentScreenName) {
                playInteractionFeedback('option_hover')
              }
            }}
            onClick={() => {
              if (hubEntry.screenName !== currentScreenName) {
                playInteractionFeedback('option_click')
                vibrateBriefly()
                setIndicatorTravelVariantName(
                  chooseAnimationVariantName('chronicle_hub_indicator_travel', indicatorTravelVariantNames),
                )
                onScreenRequested(hubEntry.screenName)
              }
            }}
          >
            <span className="chronicle-hub-navigation-icon">{hubEntry.icon}</span>
            <span className="chronicle-hub-navigation-label">{hubEntry.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}

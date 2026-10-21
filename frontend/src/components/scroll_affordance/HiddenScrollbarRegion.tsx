import { CaretDoubleDown, CaretDoubleUp } from '@phosphor-icons/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode, Ref } from 'react'
import { chooseAnimationVariantName } from '../../animation/animation_variety'
import { useInteractionFeedback } from '../../audio/interaction_feedback'
import { readingLogCopy } from '../../copy/archive_chat_engine/reading_log_copy'
import { usePlayerSettings } from '../../settings/player_settings'

export type HiddenScrollbarRegionProperties = {
  regionLabel: string
  children: ReactNode
  className?: string
  scrollContainerReference?: Ref<HTMLDivElement>
}

type ScrollPositionReading = {
  isTooShortForCues: boolean
  isMoreContentAbove: boolean
  isMoreContentBelow: boolean
  scrolledFraction: number
}

const edgeToleranceInPixels = 6
const minimumHeightForEdgeCuesInPixels = 110
const positionThreadVisibleMilliseconds = 900
const pageScrollVisibleHeightFraction = 0.82
const scrollCueVariantNames = ['chevron_nudge', 'chevron_blink', 'ink_underline'] as const

const restingScrollPositionReading: ScrollPositionReading = {
  isTooShortForCues: false,
  isMoreContentAbove: false,
  isMoreContentBelow: false,
  scrolledFraction: 0,
}

function assignReference<ReferencedElement>(reference: Ref<ReferencedElement> | undefined, referencedElement: ReferencedElement | null) {
  if (typeof reference === 'function') {
    reference(referencedElement)
    return
  }
  if (reference) {
    reference.current = referencedElement
  }
}

export function HiddenScrollbarRegion({
  regionLabel,
  children,
  className,
  scrollContainerReference,
}: HiddenScrollbarRegionProperties) {
  const playInteractionFeedback = useInteractionFeedback()
  const { shouldReduceMotion } = usePlayerSettings()
  const scrollContainerElement = useRef<HTMLDivElement | null>(null)
  const scrollContentElement = useRef<HTMLDivElement | null>(null)
  const positionThreadTimeoutIdentifier = useRef<number | null>(null)
  const [scrollPositionReading, setScrollPositionReading] = useState(restingScrollPositionReading)
  const [isPositionThreadVisible, setIsPositionThreadVisible] = useState(false)
  const [scrollCueVariantName] = useState(() => chooseAnimationVariantName('hidden_scrollbar_region_cue', scrollCueVariantNames))

  const attachScrollContainer = useCallback(
    (attachedElement: HTMLDivElement | null) => {
      scrollContainerElement.current = attachedElement
      assignReference(scrollContainerReference, attachedElement)
    },
    [scrollContainerReference],
  )

  const readScrollPosition = useCallback(() => {
    const scrollContainer = scrollContainerElement.current
    if (!scrollContainer) {
      return
    }
    const hiddenHeight = scrollContainer.scrollHeight - scrollContainer.clientHeight
    const nextReading: ScrollPositionReading = {
      isTooShortForCues: scrollContainer.clientHeight < minimumHeightForEdgeCuesInPixels,
      isMoreContentAbove: scrollContainer.scrollTop > edgeToleranceInPixels,
      isMoreContentBelow: hiddenHeight - scrollContainer.scrollTop > edgeToleranceInPixels,
      scrolledFraction: hiddenHeight > 0 ? Math.min(1, Math.max(0, scrollContainer.scrollTop / hiddenHeight)) : 0,
    }
    setScrollPositionReading((previousReading) =>
      previousReading.isTooShortForCues === nextReading.isTooShortForCues &&
      previousReading.isMoreContentAbove === nextReading.isMoreContentAbove &&
      previousReading.isMoreContentBelow === nextReading.isMoreContentBelow &&
      Math.abs(previousReading.scrolledFraction - nextReading.scrolledFraction) < 0.004
        ? previousReading
        : nextReading,
    )
  }, [])

  useEffect(() => {
    const scrollContainer = scrollContainerElement.current
    const scrollContent = scrollContentElement.current
    if (!scrollContainer || !scrollContent) {
      return
    }
    const showPositionThreadBriefly = () => {
      setIsPositionThreadVisible(true)
      if (positionThreadTimeoutIdentifier.current !== null) {
        window.clearTimeout(positionThreadTimeoutIdentifier.current)
      }
      positionThreadTimeoutIdentifier.current = window.setTimeout(() => {
        positionThreadTimeoutIdentifier.current = null
        setIsPositionThreadVisible(false)
      }, positionThreadVisibleMilliseconds)
    }
    const handleScroll = () => {
      readScrollPosition()
      showPositionThreadBriefly()
    }
    const initialReadingTimeoutIdentifier = window.setTimeout(readScrollPosition, 0)
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
    const sizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(readScrollPosition)
    sizeObserver?.observe(scrollContainer)
    sizeObserver?.observe(scrollContent)
    return () => {
      window.clearTimeout(initialReadingTimeoutIdentifier)
      scrollContainer.removeEventListener('scroll', handleScroll)
      sizeObserver?.disconnect()
      if (positionThreadTimeoutIdentifier.current !== null) {
        window.clearTimeout(positionThreadTimeoutIdentifier.current)
        positionThreadTimeoutIdentifier.current = null
      }
    }
  }, [readScrollPosition])

  const scrollByOnePage = (pageDirection: 1 | -1) => {
    const scrollContainer = scrollContainerElement.current
    if (!scrollContainer) {
      return
    }
    playInteractionFeedback('option_click')
    scrollContainer.scrollBy({
      top: pageDirection * scrollContainer.clientHeight * pageScrollVisibleHeightFraction,
      behavior: shouldReduceMotion ? 'auto' : 'smooth',
    })
  }

  const isRegionScrollable = scrollPositionReading.isMoreContentAbove || scrollPositionReading.isMoreContentBelow
  const positionThreadStyle = {
    '--scrolled-fraction': scrollPositionReading.scrolledFraction.toFixed(3),
  } as CSSProperties

  return (
    <div
      className={`hidden-scrollbar-region ${className ?? ''}`}
      data-is-scrollable={isRegionScrollable}
      data-is-too-short-for-cues={scrollPositionReading.isTooShortForCues}
      data-cue-variant={scrollCueVariantName}
    >
      <div
        ref={attachScrollContainer}
        role="region"
        aria-label={regionLabel || readingLogCopy.scrollRegionFallbackLabel}
        tabIndex={0}
        className="hidden-scrollbar-region-scroller"
      >
        <div ref={scrollContentElement} className="hidden-scrollbar-region-content">
          {children}
        </div>
      </div>
      {scrollPositionReading.isMoreContentAbove ? (
        <div className="hidden-scrollbar-region-edge" data-edge-side="top">
          <button
            type="button"
            className="hidden-scrollbar-region-page-button"
            data-scroll-page-button="true"
            aria-label={readingLogCopy.scrollAffordance.moreContentAboveButtonLabel(regionLabel)}
            onClick={() => scrollByOnePage(-1)}
          >
            <CaretDoubleUp size={16} weight="bold" aria-hidden="true" />
            <span className="hidden-scrollbar-region-page-button-text">{readingLogCopy.scrollAffordance.moreContentAboveCue}</span>
          </button>
        </div>
      ) : null}
      {scrollPositionReading.isMoreContentBelow ? (
        <div className="hidden-scrollbar-region-edge" data-edge-side="bottom">
          <button
            type="button"
            className="hidden-scrollbar-region-page-button"
            data-scroll-page-button="true"
            aria-label={readingLogCopy.scrollAffordance.moreContentBelowButtonLabel(regionLabel)}
            onClick={() => scrollByOnePage(1)}
          >
            <CaretDoubleDown size={16} weight="bold" aria-hidden="true" />
            <span className="hidden-scrollbar-region-page-button-text">{readingLogCopy.scrollAffordance.moreContentBelowCue}</span>
          </button>
        </div>
      ) : null}
      {isRegionScrollable ? (
        <span
          className="hidden-scrollbar-region-position-thread"
          data-is-visible={isPositionThreadVisible}
          style={positionThreadStyle}
          aria-hidden="true"
        />
      ) : null}
    </div>
  )
}

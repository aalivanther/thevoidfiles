import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { ArchiveLogEntry } from '../../../game_state/archive_turn_contract'

export const pendingInvestigatorDeclarationAnchorIdentifier = 'pending_investigator_declaration'

const readingLinePositionFraction = 0.14
const followTriggerPositionFraction = 0.72
const followRestPositionFraction = 0.6
const minimumReadingRunwayHeightInPixels = 24
const readerProgressKeptOnCompletionFraction = 0.5
const presentVisibilityToleranceInPixels = 8
const readerIntentEvaluationDelayMilliseconds = 160
const layoutSettleDelayMilliseconds = 60
const smoothMovementSafetyMilliseconds = 650
const scrollingKeyNames = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '])

export type ReadingLineScrollInput = {
  scrollContainerReference: RefObject<HTMLDivElement | null>
  readingColumnReference: RefObject<HTMLDivElement | null>
  presentMarkerReference: RefObject<HTMLDivElement | null>
  readingRunwayReference: RefObject<HTMLDivElement | null>
  logEntries: readonly ArchiveLogEntry[]
  logEntryIdentifierBeingRevealed: string | null
  isImmediateCompletionRequested: boolean
  pendingDeclarationKey: string | null
  isDirectorBusy: boolean
  shouldReduceMotion: boolean
}

export type ReadingLineScrollControls = {
  isReturnToPresentOffered: boolean
  newEntryCountBelow: number
  followRevealProgress: () => void
  returnToPresent: () => void
}

function readOffsetTopInsideScrollContainer(measuredElement: HTMLElement, scrollContainer: HTMLElement): number {
  let accumulatedOffsetTop = 0
  let currentElement: HTMLElement | null = measuredElement
  while (currentElement && currentElement !== scrollContainer) {
    accumulatedOffsetTop += currentElement.offsetTop
    currentElement = currentElement.offsetParent instanceof HTMLElement ? currentElement.offsetParent : null
  }
  return accumulatedOffsetTop
}

function isEditableElement(eventTarget: EventTarget | null): boolean {
  return (
    eventTarget instanceof HTMLElement &&
    (eventTarget.tagName === 'TEXTAREA' || eventTarget.tagName === 'INPUT' || eventTarget.isContentEditable)
  )
}

export function useReadingLineScroll({
  scrollContainerReference,
  readingColumnReference,
  presentMarkerReference,
  readingRunwayReference,
  logEntries,
  logEntryIdentifierBeingRevealed,
  isImmediateCompletionRequested,
  pendingDeclarationKey,
  isDirectorBusy,
  shouldReduceMotion,
}: ReadingLineScrollInput): ReadingLineScrollControls {
  const [isFollowingPresent, setIsFollowingPresent] = useState(true)
  const [isPresentBelowView, setIsPresentBelowView] = useState(false)
  const [logEntryCountWhenFollowingWasReleased, setLogEntryCountWhenFollowingWasReleased] = useState(logEntries.length)

  const isFollowingPresentNow = useRef(true)
  const anchorLogEntryIdentifier = useRef<string | null>(null)
  const knownLogEntryIdentifiers = useRef<Set<string> | null>(null)
  const latestLogEntryCount = useRef(logEntries.length)
  const latestRevealedEntryIdentifier = useRef(logEntryIdentifierBeingRevealed)
  const shouldReduceMotionNow = useRef(shouldReduceMotion)
  const scheduledTimeoutIdentifiers = useRef(new Set<number>())
  const programmaticMoveSequenceNumber = useRef(0)

  useEffect(() => {
    latestLogEntryCount.current = logEntries.length
    latestRevealedEntryIdentifier.current = logEntryIdentifierBeingRevealed
    shouldReduceMotionNow.current = shouldReduceMotion
  }, [logEntries.length, logEntryIdentifierBeingRevealed, shouldReduceMotion])

  const scheduleTimeout = useCallback((timeoutCallback: () => void, delayMilliseconds: number) => {
    const timeoutIdentifier = window.setTimeout(() => {
      scheduledTimeoutIdentifiers.current.delete(timeoutIdentifier)
      timeoutCallback()
    }, delayMilliseconds)
    scheduledTimeoutIdentifiers.current.add(timeoutIdentifier)
  }, [])

  useEffect(() => {
    const timeoutIdentifiers = scheduledTimeoutIdentifiers.current
    return () => {
      timeoutIdentifiers.forEach((timeoutIdentifier) => window.clearTimeout(timeoutIdentifier))
      timeoutIdentifiers.clear()
    }
  }, [])

  const findAnchorElement = useCallback((): HTMLElement | null => {
    const scrollContainer = scrollContainerReference.current
    if (!scrollContainer || anchorLogEntryIdentifier.current === null) {
      return null
    }
    return scrollContainer.querySelector<HTMLElement>(
      `[data-log-entry-identifier="${CSS.escape(anchorLogEntryIdentifier.current)}"]`,
    )
  }, [scrollContainerReference])

  const moveScrollPosition = useCallback(
    (targetScrollTop: number, shouldMoveInstantly: boolean) => {
      const scrollContainer = scrollContainerReference.current
      if (!scrollContainer) {
        return
      }
      const boundedScrollTop = Math.max(0, Math.min(targetScrollTop, scrollContainer.scrollHeight - scrollContainer.clientHeight))
      if (Math.abs(boundedScrollTop - scrollContainer.scrollTop) < 2) {
        return
      }
      programmaticMoveSequenceNumber.current += 1
      const moveSequenceNumber = programmaticMoveSequenceNumber.current
      const shouldSkipSmoothMovement = shouldMoveInstantly || shouldReduceMotionNow.current || document.hidden
      scrollContainer.scrollTo({ top: boundedScrollTop, behavior: shouldSkipSmoothMovement ? 'auto' : 'smooth' })
      if (shouldSkipSmoothMovement) {
        return
      }
      scheduleTimeout(() => {
        const settledScrollContainer = scrollContainerReference.current
        if (
          settledScrollContainer &&
          moveSequenceNumber === programmaticMoveSequenceNumber.current &&
          Math.abs(settledScrollContainer.scrollTop - boundedScrollTop) > 2
        ) {
          settledScrollContainer.scrollTo({ top: boundedScrollTop, behavior: 'auto' })
        }
      }, smoothMovementSafetyMilliseconds)
    },
    [scheduleTimeout, scrollContainerReference],
  )

  const resizeReadingRunway = useCallback(() => {
    const scrollContainer = scrollContainerReference.current
    const readingRunway = readingRunwayReference.current
    if (!scrollContainer || !readingRunway) {
      return
    }
    const anchorElement = findAnchorElement()
    const heightFromAnchorToRunway = anchorElement
      ? readOffsetTopInsideScrollContainer(readingRunway, scrollContainer) -
        readOffsetTopInsideScrollContainer(anchorElement, scrollContainer)
      : Number.POSITIVE_INFINITY
    const neededRunwayHeight = Math.max(
      minimumReadingRunwayHeightInPixels,
      Math.ceil(scrollContainer.clientHeight * (1 - readingLinePositionFraction) - heightFromAnchorToRunway),
    )
    const runwayHeightText = `${Number.isFinite(neededRunwayHeight) ? neededRunwayHeight : minimumReadingRunwayHeightInPixels}px`
    if (readingRunway.style.height !== runwayHeightText) {
      readingRunway.style.setProperty('height', runwayHeightText)
    }
  }, [findAnchorElement, readingRunwayReference, scrollContainerReference])

  const evaluatePresentVisibility = useCallback(() => {
    const scrollContainer = scrollContainerReference.current
    const presentMarker = presentMarkerReference.current
    if (!scrollContainer || !presentMarker) {
      return false
    }
    const isPresentBelow =
      presentMarker.getBoundingClientRect().top >
      scrollContainer.getBoundingClientRect().bottom + presentVisibilityToleranceInPixels
    setIsPresentBelowView(isPresentBelow)
    return isPresentBelow
  }, [presentMarkerReference, scrollContainerReference])

  const resumeFollowingPresent = useCallback(() => {
    isFollowingPresentNow.current = true
    setIsFollowingPresent(true)
    setLogEntryCountWhenFollowingWasReleased(latestLogEntryCount.current)
  }, [])

  const placeAnchorAtReadingLine = useCallback(
    (shouldMoveInstantly: boolean) => {
      const scrollContainer = scrollContainerReference.current
      resizeReadingRunway()
      const anchorElement = findAnchorElement()
      if (!scrollContainer || !anchorElement) {
        return false
      }
      moveScrollPosition(
        readOffsetTopInsideScrollContainer(anchorElement, scrollContainer) -
          scrollContainer.clientHeight * readingLinePositionFraction,
        shouldMoveInstantly,
      )
      return true
    },
    [findAnchorElement, moveScrollPosition, resizeReadingRunway, scrollContainerReference],
  )

  const bringElementBottomToRestPosition = useCallback(
    (followedElement: Element, shouldOnlyMoveBeyondTrigger: boolean) => {
      const scrollContainer = scrollContainerReference.current
      if (!scrollContainer) {
        return
      }
      const followedOffsetInsideView = followedElement.getBoundingClientRect().bottom - scrollContainer.getBoundingClientRect().top
      if (shouldOnlyMoveBeyondTrigger && followedOffsetInsideView <= scrollContainer.clientHeight * followTriggerPositionFraction) {
        return
      }
      moveScrollPosition(
        scrollContainer.scrollTop + followedOffsetInsideView - scrollContainer.clientHeight * followRestPositionFraction,
        false,
      )
    },
    [moveScrollPosition, scrollContainerReference],
  )

  const findRevealFrontElement = useCallback((): Element | null => {
    const scrollContainer = scrollContainerReference.current
    const revealedEntryIdentifier = latestRevealedEntryIdentifier.current
    if (!scrollContainer || revealedEntryIdentifier === null) {
      return null
    }
    const revealedEntryElement = scrollContainer.querySelector(
      `[data-log-entry-identifier="${CSS.escape(revealedEntryIdentifier)}"]`,
    )
    return revealedEntryElement?.querySelector('.typewriter-caret') ?? revealedEntryElement
  }, [scrollContainerReference])

  const followRevealProgress = useCallback(() => {
    if (!isFollowingPresentNow.current) {
      return
    }
    const revealFrontElement = findRevealFrontElement()
    if (revealFrontElement) {
      bringElementBottomToRestPosition(revealFrontElement, true)
    }
  }, [bringElementBottomToRestPosition, findRevealFrontElement])

  const returnToPresent = useCallback(() => {
    resumeFollowingPresent()
    const scrollContainer = scrollContainerReference.current
    const presentMarker = presentMarkerReference.current
    const revealFrontElement = findRevealFrontElement()
    if (revealFrontElement) {
      bringElementBottomToRestPosition(revealFrontElement, false)
    } else if (scrollContainer && presentMarker) {
      const anchorElement = findAnchorElement()
      const doesCurrentTurnFitBelowReadingLine =
        anchorElement !== null &&
        presentMarker.getBoundingClientRect().bottom - anchorElement.getBoundingClientRect().top <=
          scrollContainer.clientHeight * (1 - readingLinePositionFraction)
      if (!doesCurrentTurnFitBelowReadingLine || !placeAnchorAtReadingLine(false)) {
        moveScrollPosition(
          scrollContainer.scrollTop +
            presentMarker.getBoundingClientRect().bottom -
            scrollContainer.getBoundingClientRect().bottom,
          false,
        )
      }
    }
    scheduleTimeout(evaluatePresentVisibility, readerIntentEvaluationDelayMilliseconds * 3)
  }, [
    bringElementBottomToRestPosition,
    evaluatePresentVisibility,
    findAnchorElement,
    findRevealFrontElement,
    moveScrollPosition,
    placeAnchorAtReadingLine,
    presentMarkerReference,
    resumeFollowingPresent,
    scheduleTimeout,
    scrollContainerReference,
  ])

  useEffect(() => {
    const scrollContainer = scrollContainerReference.current
    const scrollRegion = scrollContainer?.parentElement
    if (!scrollContainer) {
      return
    }
    const releaseFollowingByReaderIntent = () => {
      programmaticMoveSequenceNumber.current += 1
      if (isFollowingPresentNow.current) {
        isFollowingPresentNow.current = false
        setIsFollowingPresent(false)
        setLogEntryCountWhenFollowingWasReleased(latestLogEntryCount.current)
      }
      scheduleTimeout(() => {
        if (!evaluatePresentVisibility() && !isFollowingPresentNow.current) {
          resumeFollowingPresent()
        }
      }, readerIntentEvaluationDelayMilliseconds)
    }
    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (scrollingKeyNames.has(keyboardEvent.key) && !isEditableElement(keyboardEvent.target)) {
        releaseFollowingByReaderIntent()
      }
    }
    const handleRegionClick = (clickEvent: MouseEvent) => {
      if (clickEvent.target instanceof Element && clickEvent.target.closest('[data-scroll-page-button]')) {
        releaseFollowingByReaderIntent()
      }
    }
    const handleScroll = () => {
      const isPresentBelow = evaluatePresentVisibility()
      if (!isPresentBelow && !isFollowingPresentNow.current) {
        resumeFollowingPresent()
      }
    }
    scrollContainer.addEventListener('wheel', releaseFollowingByReaderIntent, { passive: true })
    scrollContainer.addEventListener('touchmove', releaseFollowingByReaderIntent, { passive: true })
    scrollContainer.addEventListener('keydown', handleKeyDown)
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
    scrollRegion?.addEventListener('click', handleRegionClick)
    return () => {
      scrollContainer.removeEventListener('wheel', releaseFollowingByReaderIntent)
      scrollContainer.removeEventListener('touchmove', releaseFollowingByReaderIntent)
      scrollContainer.removeEventListener('keydown', handleKeyDown)
      scrollContainer.removeEventListener('scroll', handleScroll)
      scrollRegion?.removeEventListener('click', handleRegionClick)
    }
  }, [evaluatePresentVisibility, resumeFollowingPresent, scheduleTimeout, scrollContainerReference])

  useEffect(() => {
    const scrollContainer = scrollContainerReference.current
    const readingColumn = readingColumnReference.current
    if (!scrollContainer || !readingColumn || typeof ResizeObserver === 'undefined') {
      return
    }
    const sizeObserver = new ResizeObserver(() => {
      resizeReadingRunway()
      evaluatePresentVisibility()
    })
    sizeObserver.observe(scrollContainer)
    sizeObserver.observe(readingColumn)
    return () => sizeObserver.disconnect()
  }, [evaluatePresentVisibility, readingColumnReference, resizeReadingRunway, scrollContainerReference])

  useEffect(() => {
    const scrollContainer = scrollContainerReference.current
    if (!scrollContainer) {
      return
    }
    if (knownLogEntryIdentifiers.current === null) {
      knownLogEntryIdentifiers.current = new Set(logEntries.map((logEntry) => logEntry.identifier))
      if (latestRevealedEntryIdentifier.current !== null) {
        anchorLogEntryIdentifier.current = logEntries[0]?.identifier ?? null
        placeAnchorAtReadingLine(true)
      } else {
        resizeReadingRunway()
        scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'auto' })
      }
      scheduleTimeout(evaluatePresentVisibility, layoutSettleDelayMilliseconds)
      return
    }
    const knownIdentifiers = knownLogEntryIdentifiers.current
    const firstNewLogEntry = logEntries.find((logEntry) => !knownIdentifiers.has(logEntry.identifier))
    logEntries.forEach((logEntry) => knownIdentifiers.add(logEntry.identifier))
    if (!firstNewLogEntry) {
      return
    }
    if (isFollowingPresentNow.current) {
      anchorLogEntryIdentifier.current = firstNewLogEntry.identifier
      placeAnchorAtReadingLine(false)
      scheduleTimeout(() => {
        if (isFollowingPresentNow.current) {
          placeAnchorAtReadingLine(false)
        }
      }, layoutSettleDelayMilliseconds)
    }
    scheduleTimeout(evaluatePresentVisibility, layoutSettleDelayMilliseconds * 2)
  }, [evaluatePresentVisibility, logEntries, placeAnchorAtReadingLine, resizeReadingRunway, scheduleTimeout, scrollContainerReference])

  useEffect(() => {
    if (!isDirectorBusy) {
      return
    }
    resumeFollowingPresent()
    if (pendingDeclarationKey !== null) {
      anchorLogEntryIdentifier.current = pendingInvestigatorDeclarationAnchorIdentifier
      placeAnchorAtReadingLine(false)
      return
    }
    const presentMarker = presentMarkerReference.current
    if (presentMarker) {
      bringElementBottomToRestPosition(presentMarker, true)
    }
  }, [
    bringElementBottomToRestPosition,
    isDirectorBusy,
    pendingDeclarationKey,
    placeAnchorAtReadingLine,
    presentMarkerReference,
    resumeFollowingPresent,
  ])

  useEffect(() => {
    if (!isImmediateCompletionRequested) {
      return
    }
    scheduleTimeout(() => {
      const scrollContainer = scrollContainerReference.current
      const anchorElement = findAnchorElement()
      if (!isFollowingPresentNow.current || !scrollContainer || !anchorElement) {
        return
      }
      const anchorOffsetInsideView = anchorElement.getBoundingClientRect().top - scrollContainer.getBoundingClientRect().top
      if (anchorOffsetInsideView >= -scrollContainer.clientHeight * readerProgressKeptOnCompletionFraction) {
        placeAnchorAtReadingLine(false)
      }
    }, layoutSettleDelayMilliseconds)
  }, [findAnchorElement, isImmediateCompletionRequested, placeAnchorAtReadingLine, scheduleTimeout, scrollContainerReference])

  return {
    isReturnToPresentOffered: !isFollowingPresent && isPresentBelowView,
    newEntryCountBelow: Math.max(0, logEntries.length - logEntryCountWhenFollowingWasReleased),
    followRevealProgress,
    returnToPresent,
  }
}

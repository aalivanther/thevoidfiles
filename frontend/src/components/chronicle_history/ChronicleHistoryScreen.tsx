import { CaretLeft, CaretRight, ListBullets } from '@phosphor-icons/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { chooseAnimationVariantName, randomNumberBetween } from '../../animation/animation_variety'
import { useScenePlaybackOccupation } from '../../animation/scene_playback_clock'
import { useInteractionFeedback } from '../../audio/interaction_feedback'
import { chronicleHistoryCopy } from '../../copy/chronicle_history_copy'
import { completeWorkArchiveCount } from '../../demonstration/chronicle_history_data'
import { readArchiveChapters } from '../../game_state/archive_chapters'
import { personalizeNarrativeText, useChronicleState } from '../../game_state/chronicle_state'
import { usePlayerSettings } from '../../settings/player_settings'
import { PresentationTitleCard } from '../PresentationTitleCard'
import { buildChronicleBookPages, indexPagePosition, readChronicleBookPageName } from './chronicle_book_pages'
import { ChronicleBookPageContent } from './ChronicleBookPageContent'
import { CompleteWorkProgressMark } from './CompleteWorkProgressMark'

const pageTurnVariantNames = [
  'leaf_swings_from_spine',
  'leaf_corner_peels',
  'leaf_slides_away',
  'leaf_quick_flick',
] as const
const sealRefusalVariantNames = ['seal_shakes', 'seal_tilts', 'seal_sinks'] as const

const pageTurnDurationInMilliseconds = 520
const sealRefusalDurationInMilliseconds = 520
const minimumSwipeDistanceInPixels = 56

type PageTurn = {
  turnIdentifier: number
  leafPageIndex: number
  basePageIndex: number
  directionName: 'forward' | 'backward'
  variantName: (typeof pageTurnVariantNames)[number]
  leafTiltInDegrees: number
}

function isKeyboardEventInsideEditableOrDialog(keyboardEvent: KeyboardEvent): boolean {
  const eventTarget = keyboardEvent.target
  if (!(eventTarget instanceof HTMLElement)) {
    return false
  }
  return (
    eventTarget.isContentEditable ||
    eventTarget.closest('input, textarea, select, [role="dialog"], [role="slider"], [role="tablist"]') !== null
  )
}

export function ChronicleHistoryScreen() {
  const { chronicleState } = useChronicleState()
  const { shouldReduceMotion } = usePlayerSettings()
  const playInteractionFeedback = useInteractionFeedback()
  const [isPresentationVisible, setIsPresentationVisible] = useState(true)
  const [displayedPageIndex, setDisplayedPageIndex] = useState(0)
  const [pageTurn, setPageTurn] = useState<PageTurn | null>(null)
  const [sealRefusalVariantName, setSealRefusalVariantName] = useState<string | null>(null)
  const [hasSealBeenRefused, setHasSealBeenRefused] = useState(false)
  const latestDisplayedPageIndex = useRef(0)
  const turnCount = useRef(0)
  const pageTurnTimeoutIdentifier = useRef<number | null>(null)
  const sealRefusalTimeoutIdentifier = useRef<number | null>(null)
  const shouldFocusPageAfterTurn = useRef(false)
  const pageElement = useRef<HTMLElement>(null)
  const swipeStartPosition = useRef<{ horizontal: number; vertical: number } | null>(null)

  useScenePlaybackOccupation('chronicle-history-page-turn', 'signature', pageTurn !== null, pageTurnDurationInMilliseconds)

  const chronicleChapters = useMemo(() => readArchiveChapters(chronicleState), [chronicleState])
  const chronicleBookPages = useMemo(() => buildChronicleBookPages(chronicleChapters), [chronicleChapters])
  const lastPageIndex = chronicleBookPages.length - 1
  const writtenChapterCount = chronicleChapters.filter(
    (chronicleChapter) => chronicleChapter.writingStateName === 'written',
  ).length

  const personalizeChronicleText = useCallback(
    (chronicleText: string) => personalizeNarrativeText(chronicleText, chronicleState.investigatorRegistration),
    [chronicleState.investigatorRegistration],
  )
  const investigatorFullName = personalizeChronicleText('{{nombre_completo}}')

  const turnToPage = useCallback(
    (requestedPageIndex: number, shouldFocusPage: boolean) => {
      const targetPageIndex = Math.min(lastPageIndex, Math.max(0, requestedPageIndex))
      const departingPageIndex = latestDisplayedPageIndex.current
      if (targetPageIndex === departingPageIndex || pageTurnTimeoutIdentifier.current !== null) {
        return
      }
      const directionName = targetPageIndex > departingPageIndex ? 'forward' : 'backward'
      playInteractionFeedback(directionName === 'forward' ? 'panel_open' : 'panel_close')
      latestDisplayedPageIndex.current = targetPageIndex
      shouldFocusPageAfterTurn.current = shouldFocusPage
      turnCount.current += 1
      if (pageTurnTimeoutIdentifier.current !== null) {
        window.clearTimeout(pageTurnTimeoutIdentifier.current)
        pageTurnTimeoutIdentifier.current = null
      }
      setHasSealBeenRefused(false)
      setDisplayedPageIndex(targetPageIndex)
      if (shouldReduceMotion) {
        setPageTurn(null)
        return
      }
      setPageTurn({
        turnIdentifier: turnCount.current,
        leafPageIndex: directionName === 'forward' ? departingPageIndex : targetPageIndex,
        basePageIndex: directionName === 'forward' ? targetPageIndex : departingPageIndex,
        directionName,
        variantName: chooseAnimationVariantName('history_page_turn', pageTurnVariantNames),
        leafTiltInDegrees: randomNumberBetween(-2.5, 2.5),
      })
      pageTurnTimeoutIdentifier.current = window.setTimeout(() => {
        pageTurnTimeoutIdentifier.current = null
        setPageTurn(null)
      }, pageTurnDurationInMilliseconds)
    },
    [lastPageIndex, playInteractionFeedback, shouldReduceMotion],
  )

  useEffect(
    () => () => {
      if (pageTurnTimeoutIdentifier.current !== null) {
        window.clearTimeout(pageTurnTimeoutIdentifier.current)
      }
      if (sealRefusalTimeoutIdentifier.current !== null) {
        window.clearTimeout(sealRefusalTimeoutIdentifier.current)
      }
    },
    [],
  )

  useEffect(() => {
    if (isPresentationVisible) {
      return
    }
    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (
        keyboardEvent.defaultPrevented ||
        keyboardEvent.altKey ||
        keyboardEvent.ctrlKey ||
        keyboardEvent.metaKey ||
        isKeyboardEventInsideEditableOrDialog(keyboardEvent) ||
        document.querySelector('[role="dialog"]') !== null
      ) {
        return
      }
      const targetPageIndexByKey: Record<string, number> = {
        ArrowRight: latestDisplayedPageIndex.current + 1,
        ArrowLeft: latestDisplayedPageIndex.current - 1,
        PageDown: latestDisplayedPageIndex.current + 1,
        PageUp: latestDisplayedPageIndex.current - 1,
        Home: 0,
        End: lastPageIndex,
      }
      const targetPageIndex = targetPageIndexByKey[keyboardEvent.key]
      if (targetPageIndex === undefined) {
        return
      }
      keyboardEvent.preventDefault()
      turnToPage(targetPageIndex, false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPresentationVisible, lastPageIndex, turnToPage])

  useEffect(() => {
    if (shouldFocusPageAfterTurn.current) {
      shouldFocusPageAfterTurn.current = false
      pageElement.current?.focus({ preventScroll: false })
    }
  }, [displayedPageIndex])

  const refuseToBreakSeal = () => {
    playInteractionFeedback('rejection')
    setHasSealBeenRefused(true)
    if (sealRefusalTimeoutIdentifier.current !== null) {
      window.clearTimeout(sealRefusalTimeoutIdentifier.current)
    }
    setSealRefusalVariantName(chooseAnimationVariantName('history_seal_refusal', sealRefusalVariantNames))
    sealRefusalTimeoutIdentifier.current = window.setTimeout(() => {
      sealRefusalTimeoutIdentifier.current = null
      setSealRefusalVariantName(null)
    }, sealRefusalDurationInMilliseconds)
  }

  const handleBookPointerDown = (pointerEvent: ReactPointerEvent<HTMLDivElement>) => {
    swipeStartPosition.current =
      pointerEvent.pointerType === 'mouse' ? null : { horizontal: pointerEvent.clientX, vertical: pointerEvent.clientY }
  }

  const handleBookPointerUp = (pointerEvent: ReactPointerEvent<HTMLDivElement>) => {
    const startPosition = swipeStartPosition.current
    swipeStartPosition.current = null
    if (!startPosition) {
      return
    }
    const horizontalDistance = pointerEvent.clientX - startPosition.horizontal
    const verticalDistance = pointerEvent.clientY - startPosition.vertical
    if (
      Math.abs(horizontalDistance) < minimumSwipeDistanceInPixels ||
      Math.abs(horizontalDistance) < Math.abs(verticalDistance) * 1.5
    ) {
      return
    }
    turnToPage(latestDisplayedPageIndex.current + (horizontalDistance < 0 ? 1 : -1), false)
  }

  if (isPresentationVisible) {
    return (
      <PresentationTitleCard
        chapterLabel={chronicleHistoryCopy.presentation.chapterLabel}
        chapterTitle={chronicleHistoryCopy.presentation.chapterTitle}
        detailLine={chronicleHistoryCopy.presentation.detailLine(writtenChapterCount, completeWorkArchiveCount)}
        onPresentationFinished={() => setIsPresentationVisible(false)}
      />
    )
  }

  const safeDisplayedPageIndex = Math.min(displayedPageIndex, lastPageIndex)
  const basePageIndex = pageTurn ? Math.min(pageTurn.basePageIndex, lastPageIndex) : safeDisplayedPageIndex
  const navigationCopy = chronicleHistoryCopy.pageNavigation
  const sharedPageContentProperties = {
    chronicleChapters,
    investigatorFullName,
    personalizeChronicleText,
    sealRefusalVariantName,
    hasSealBeenRefused,
    onChapterRequested: (chapterIdentifier: string) => {
      const chapterPageIndex = chronicleBookPages.findIndex(
        (chronicleBookPage) => chronicleBookPage.pageIdentifier === chapterIdentifier,
      )
      if (chapterPageIndex >= 0) {
        turnToPage(chapterPageIndex, true)
      }
    },
    onCompleteWorkRequested: () => turnToPage(lastPageIndex, true),
    onBookOpened: () => turnToPage(indexPagePosition, true),
    onSealPressed: refuseToBreakSeal,
    onEntryHovered: () => playInteractionFeedback('option_hover'),
  }

  return (
    <main id="main-content" className="chronicle-history-screen mx-auto w-full max-w-6xl px-4 pt-6 pb-20 sm:px-8">
      <header className="chronicle-history-header entrance-from-left">
        <p className="dossier-label">{chronicleHistoryCopy.header.bookLabel}</p>
        <h1 className="display-title text-[clamp(2rem,6vw,3.5rem)]">{chronicleHistoryCopy.header.screenTitle}</h1>
        <p className="mt-2 max-w-[68ch] text-sm text-paper-muted">{chronicleHistoryCopy.header.honestyNotice}</p>
      </header>

      <div className="chronicle-history-layout mt-6">
        <div className="history-book-column entrance-from-below">
          <div className="history-book-stage">
            <div
              className="history-book"
              role="group"
              aria-label={navigationCopy.bookRegionLabel}
              onPointerDown={handleBookPointerDown}
              onPointerUp={handleBookPointerUp}
              onPointerCancel={() => {
                swipeStartPosition.current = null
              }}
            >
              <span className="history-book-spine" aria-hidden="true" />
              <span className="history-book-page-edges" aria-hidden="true" />
              <article
                ref={pageElement}
                tabIndex={-1}
                className="history-page"
                aria-labelledby="history-page-heading"
                data-page-parity={basePageIndex % 2 === 0 ? 'even' : 'odd'}
              >
                <ChronicleBookPageContent
                  {...sharedPageContentProperties}
                  chronicleBookPage={chronicleBookPages[basePageIndex]}
                  pageNumber={basePageIndex + 1}
                  isDecorativeCopy={false}
                />
              </article>
              {pageTurn ? (
                <div
                  key={pageTurn.turnIdentifier}
                  className="history-page history-turning-leaf"
                  data-turn-variant={pageTurn.variantName}
                  data-turn-direction={pageTurn.directionName}
                  style={{ '--leaf-tilt': `${pageTurn.leafTiltInDegrees.toFixed(2)}deg` } as CSSProperties}
                  aria-hidden="true"
                  inert
                >
                  <ChronicleBookPageContent
                    {...sharedPageContentProperties}
                    chronicleBookPage={chronicleBookPages[Math.min(pageTurn.leafPageIndex, lastPageIndex)]}
                    pageNumber={Math.min(pageTurn.leafPageIndex, lastPageIndex) + 1}
                    isDecorativeCopy
                  />
                </div>
              ) : null}
              <span className="history-book-ribbon" aria-hidden="true" />
            </div>
          </div>

          <nav className="history-page-navigation" aria-label={navigationCopy.navigationLabel}>
            <button
              type="button"
              className="history-page-navigation-button"
              disabled={safeDisplayedPageIndex === 0}
              aria-label={navigationCopy.previousPageButton}
              title={navigationCopy.previousPageButton}
              onClick={() => turnToPage(latestDisplayedPageIndex.current - 1, false)}
            >
              <CaretLeft size={22} weight="bold" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="history-page-navigation-button history-page-navigation-index"
              disabled={safeDisplayedPageIndex === indexPagePosition}
              onClick={() => turnToPage(indexPagePosition, true)}
            >
              <ListBullets size={20} weight="bold" aria-hidden="true" />
              {navigationCopy.indexButton}
            </button>
            <p className="history-page-position">
              {navigationCopy.pagePosition(safeDisplayedPageIndex + 1, chronicleBookPages.length)}
            </p>
            <button
              type="button"
              className="history-page-navigation-button"
              disabled={safeDisplayedPageIndex === lastPageIndex}
              aria-label={navigationCopy.nextPageButton}
              title={navigationCopy.nextPageButton}
              onClick={() => turnToPage(latestDisplayedPageIndex.current + 1, false)}
            >
              <CaretRight size={22} weight="bold" aria-hidden="true" />
            </button>
          </nav>
          <p className="history-keyboard-hint">{navigationCopy.keyboardHint}</p>
          <p className="sr-only" aria-live="polite">
            {navigationCopy.pageAnnouncement(
              readChronicleBookPageName(chronicleBookPages[safeDisplayedPageIndex]),
              safeDisplayedPageIndex + 1,
              chronicleBookPages.length,
            )}
          </p>
        </div>

        <CompleteWorkProgressMark
          writtenChapterCount={writtenChapterCount}
          hasChapterInProgress={chronicleChapters.some((chapter) => chapter.writingStateName === 'in_progress')}
          onCompleteWorkRequested={() => turnToPage(lastPageIndex, true)}
          onEntryHovered={() => playInteractionFeedback('option_hover')}
        />
      </div>
    </main>
  )
}

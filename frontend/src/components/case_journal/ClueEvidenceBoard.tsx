import { DndContext, KeyboardSensor, MouseSensor, TouchSensor, useDraggable, useSensor, useSensors } from '@dnd-kit/core'
import type { Announcements, DragEndEvent, Modifier, UniqueIdentifier } from '@dnd-kit/core'
import { NotePencil, PushPin } from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { chooseAnimationVariantName, randomNumberBetween } from '../../animation/animation_variety'
import { useInteractionFeedback } from '../../audio/interaction_feedback'
import { caseJournalCopy } from '../../copy/case_journal_copy'
import type { PerceivedClue } from '../../demonstration/case_journal_data'
import { clampBoardFraction } from './case_journal_record'
import type { ClueThreadLink, EvidenceBoardPosition } from './case_journal_record'
import { ClueSupportIcon } from './clue_support_presentation'
import { createHandDrawnThreadPaths } from './hand_drawn_thread'
import type { BoardPoint } from './hand_drawn_thread'
import { calculateStableTiltDegrees } from './journal_paper_layout'

const pinStrikeVariantNames = ['pin_strike_straight', 'pin_strike_twisted', 'pin_strike_double_tap'] as const
const threadTensionVariantNames = ['thread_drawn_from_pin', 'thread_snapped_taut', 'thread_swinging_loose'] as const
const narrowBoardWidthLimit = 420
const touchPressDelayMilliseconds = 220
const touchPressToleranceDistance = 8
const mouseActivationDistance = 6
const clickSuppressionMilliseconds = 60

type EvidenceBoardMeasurements = {
  boardWidth: number
  boardHeight: number
  cardWidth: number
  cardHeight: number
  columnCount: number
  rowCount: number
}

function calculateBoardMeasurements(boardWidth: number, clueCount: number): EvidenceBoardMeasurements {
  const isNarrowBoard = boardWidth < narrowBoardWidthLimit
  const cardWidth = isNarrowBoard ? 124 : 168
  const cardHeight = isNarrowBoard ? 128 : 136
  const columnGap = isNarrowBoard ? 10 : 28
  const columnCount = Math.max(1, Math.floor((boardWidth + columnGap) / (cardWidth + columnGap)))
  const rowCount = Math.max(1, Math.ceil(clueCount / columnCount))
  return {
    boardWidth,
    boardHeight: Math.max(320, rowCount * (cardHeight + 44) + 36),
    cardWidth,
    cardHeight,
    columnCount,
    rowCount,
  }
}

function calculateDefaultBoardPosition(
  clueIdentifier: string,
  clueIndex: number,
  measurements: EvidenceBoardMeasurements,
): EvidenceBoardPosition {
  const columnIndex = clueIndex % measurements.columnCount
  const rowIndex = Math.floor(clueIndex / measurements.columnCount)
  const horizontalBase = measurements.columnCount === 1 ? 0.5 : 0.03 + (columnIndex / (measurements.columnCount - 1)) * 0.94
  const verticalBase = measurements.rowCount === 1 ? 0.3 : 0.07 + (rowIndex / (measurements.rowCount - 1)) * 0.86
  return {
    horizontalFraction: clampBoardFraction(horizontalBase + calculateStableTiltDegrees(`${clueIdentifier}-horizontal`, 0.025)),
    verticalFraction: clampBoardFraction(verticalBase + calculateStableTiltDegrees(`${clueIdentifier}-vertical`, 0.035)),
  }
}

function calculateCardCorner(boardPosition: EvidenceBoardPosition, measurements: EvidenceBoardMeasurements): BoardPoint {
  return {
    horizontal: boardPosition.horizontalFraction * Math.max(0, measurements.boardWidth - measurements.cardWidth),
    vertical: boardPosition.verticalFraction * Math.max(0, measurements.boardHeight - measurements.cardHeight),
  }
}

function describeBoardZone(boardPosition: EvidenceBoardPosition): string {
  const boardCopy = caseJournalCopy.evidenceBoard
  const verticalZoneName =
    boardPosition.verticalFraction < 0.34 ? boardCopy.zoneUpper : boardPosition.verticalFraction > 0.66 ? boardCopy.zoneLower : boardCopy.zoneMiddle
  const horizontalZoneName =
    boardPosition.horizontalFraction < 0.34
      ? boardCopy.zoneLeft
      : boardPosition.horizontalFraction > 0.66
        ? boardCopy.zoneRight
        : boardCopy.zoneCenter
  return boardCopy.zoneDescription(verticalZoneName, horizontalZoneName)
}

type EvidenceThreadProperties = {
  threadKey: string
  startPoint: BoardPoint
  endPoint: BoardPoint
  isDetached: boolean
}

function EvidenceThread({ threadKey, startPoint, endPoint, isDetached }: EvidenceThreadProperties) {
  const [threadTensionVariantName] = useState(() =>
    chooseAnimationVariantName('journal_evidence_thread_tension', threadTensionVariantNames),
  )
  const threadPaths = useMemo(
    () => createHandDrawnThreadPaths(startPoint, endPoint, false, threadKey),
    [startPoint, endPoint, threadKey],
  )
  return (
    <g className="journal-evidence-thread" data-is-detached={isDetached}>
      {threadPaths.map((threadPath, threadPathIndex) => (
        <path key={`shadow-${threadPathIndex}`} className="journal-board-thread-shadow" d={threadPath} />
      ))}
      {threadPaths.map((threadPath, threadPathIndex) => (
        <path
          key={`thread-${threadPathIndex}`}
          className="journal-board-thread"
          data-thread-tension-variant={threadTensionVariantName}
          d={threadPath}
          pathLength={1}
        />
      ))}
    </g>
  )
}

type EvidenceCardProperties = {
  perceivedClue: PerceivedClue
  cardCorner: BoardPoint
  measurements: EvidenceBoardMeasurements
  entranceOrder: number
  pinEntranceVariantName: string
  pinStrikeVariantName: string
  pinStrikeCount: number
  isOpen: boolean
  isThreadOrigin: boolean
  isAwaitingThreadEnd: boolean
  hasOwnAnalysis: boolean
  perceivedText: string
  wasJustDragged: () => boolean
  onChosen: () => void
}

function EvidenceCard({
  perceivedClue,
  cardCorner,
  measurements,
  entranceOrder,
  pinEntranceVariantName,
  pinStrikeVariantName,
  pinStrikeCount,
  isOpen,
  isThreadOrigin,
  isAwaitingThreadEnd,
  hasOwnAnalysis,
  perceivedText,
  wasJustDragged,
  onChosen,
}: EvidenceCardProperties) {
  const boardCopy = caseJournalCopy.evidenceBoard
  const playInteractionFeedback = useInteractionFeedback()
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useDraggable({
    id: perceivedClue.identifier,
    attributes: { roleDescription: boardCopy.cardRoleDescription },
  })
  const holderStyle = {
    left: `${cardCorner.horizontal.toFixed(1)}px`,
    top: `${cardCorner.vertical.toFixed(1)}px`,
    width: `${measurements.cardWidth}px`,
    height: `${measurements.cardHeight}px`,
    transform: transform ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)` : undefined,
  } as CSSProperties
  const cardStyle = {
    '--paper-tilt': `${calculateStableTiltDegrees(perceivedClue.identifier, 2.4)}deg`,
    '--entrance-order': Math.min(entranceOrder, 10),
  } as CSSProperties
  return (
    <li ref={setNodeRef} className="journal-evidence-card-holder" data-is-being-dragged={isDragging} style={holderStyle}>
      <button
        type="button"
        ref={setActivatorNodeRef}
        className="journal-evidence-card"
        data-pin-entrance-variant={pinEntranceVariantName}
        data-support-kind={perceivedClue.supportKind}
        data-is-open={isOpen}
        data-is-thread-origin={isThreadOrigin}
        data-is-awaiting-thread-end={isAwaitingThreadEnd}
        style={cardStyle}
        {...attributes}
        {...listeners}
        aria-label={boardCopy.cardSpokenLabel(
          perceivedClue.chronologicalOrder,
          caseJournalCopy.supportKinds[perceivedClue.supportKind],
          perceivedText,
        )}
        aria-pressed={undefined}
        aria-expanded={isOpen}
        onClick={() => {
          if (!wasJustDragged()) {
            onChosen()
          }
        }}
        onPointerEnter={(pointerEvent) => {
          if (pointerEvent.pointerType === 'mouse' && !isDragging) {
            playInteractionFeedback('option_hover')
          }
        }}
      >
        <span
          key={pinStrikeCount}
          className="journal-pin-head"
          data-pin-tone="clue"
          data-pin-strike-variant={pinStrikeCount > 0 ? pinStrikeVariantName : 'none'}
          aria-hidden="true"
        >
          <PushPin size={12} weight="fill" />
        </span>
        <span className="journal-evidence-card-meta" aria-hidden="true">
          <span className="journal-clue-card-order">{String(perceivedClue.chronologicalOrder).padStart(2, '0')}</span>
          <ClueSupportIcon supportKind={perceivedClue.supportKind} size={14} />
          {hasOwnAnalysis ? <NotePencil size={14} weight="fill" /> : null}
        </span>
        <span className="journal-evidence-card-text" aria-hidden="true">
          {perceivedText}
        </span>
      </button>
    </li>
  )
}

type ClueEvidenceBoardProperties = {
  everyClue: PerceivedClue[]
  shownClues: PerceivedClue[]
  evidenceBoardPositionByClueIdentifier: Record<string, EvidenceBoardPosition>
  clueThreadLinks: ClueThreadLink[]
  clueIdentifiersWithOwnAnalysis: ReadonlySet<string>
  openClueIdentifier: string | null
  threadOriginClueIdentifier: string | null
  pinEntranceVariantName: string
  personalizeJournalText: (journalText: string) => string
  onClueChosen: (clueIdentifier: string) => void
  onCluePinnedAt: (clueIdentifier: string, boardPosition: EvidenceBoardPosition) => void
  onThreadTyingCancelled: () => void
}

export function ClueEvidenceBoard({
  everyClue,
  shownClues,
  evidenceBoardPositionByClueIdentifier,
  clueThreadLinks,
  clueIdentifiersWithOwnAnalysis,
  openClueIdentifier,
  threadOriginClueIdentifier,
  pinEntranceVariantName,
  personalizeJournalText,
  onClueChosen,
  onCluePinnedAt,
  onThreadTyingCancelled,
}: ClueEvidenceBoardProperties) {
  const boardCopy = caseJournalCopy.evidenceBoard
  const playInteractionFeedback = useInteractionFeedback()
  const boardSurfaceElement = useRef<HTMLUListElement>(null)
  const [boardWidth, setBoardWidth] = useState(0)
  const [draggedClueIdentifier, setDraggedClueIdentifier] = useState<string | null>(null)
  const [pinStrikeCountByClueIdentifier, setPinStrikeCountByClueIdentifier] = useState<Record<string, number>>({})
  const [pinStrikeVariantName, setPinStrikeVariantName] = useState<string>(pinStrikeVariantNames[0])
  const isClickSuppressed = useRef(false)
  const latestDragChange = useRef<BoardPoint>({ horizontal: 0, vertical: 0 })
  const clickSuppressionTimeoutIdentifier = useRef<number | null>(null)

  useEffect(() => {
    const currentSurfaceElement = boardSurfaceElement.current
    if (!currentSurfaceElement) {
      return
    }
    const measureBoardWidth = () => setBoardWidth(currentSurfaceElement.clientWidth)
    measureBoardWidth()
    const surfaceResizeObserver = new ResizeObserver(measureBoardWidth)
    surfaceResizeObserver.observe(currentSurfaceElement)
    return () => surfaceResizeObserver.disconnect()
  }, [])

  useEffect(
    () => () => {
      if (clickSuppressionTimeoutIdentifier.current !== null) {
        window.clearTimeout(clickSuppressionTimeoutIdentifier.current)
      }
    },
    [],
  )

  const measurements = useMemo(() => calculateBoardMeasurements(boardWidth, everyClue.length), [boardWidth, everyClue.length])

  const boardPositionByClueIdentifier = useMemo(() => {
    const resolvedPositionByClueIdentifier: Record<string, EvidenceBoardPosition> = {}
    everyClue.forEach((perceivedClue, clueIndex) => {
      resolvedPositionByClueIdentifier[perceivedClue.identifier] =
        evidenceBoardPositionByClueIdentifier[perceivedClue.identifier] ??
        calculateDefaultBoardPosition(perceivedClue.identifier, clueIndex, measurements)
    })
    return resolvedPositionByClueIdentifier
  }, [everyClue, evidenceBoardPositionByClueIdentifier, measurements])

  const cardCornerByClueIdentifier = useMemo(() => {
    const cornerByClueIdentifier: Record<string, BoardPoint> = {}
    Object.entries(boardPositionByClueIdentifier).forEach(([clueIdentifier, boardPosition]) => {
      cornerByClueIdentifier[clueIdentifier] = calculateCardCorner(boardPosition, measurements)
    })
    return cornerByClueIdentifier
  }, [boardPositionByClueIdentifier, measurements])

  const drawnThreads = useMemo(() => {
    const shownClueIdentifiers = new Set(shownClues.map((perceivedClue) => perceivedClue.identifier))
    return clueThreadLinks
      .filter(
        (clueThreadLink) =>
          shownClueIdentifiers.has(clueThreadLink.firstClueIdentifier) &&
          shownClueIdentifiers.has(clueThreadLink.secondClueIdentifier),
      )
      .map((clueThreadLink) => {
        const firstCorner = cardCornerByClueIdentifier[clueThreadLink.firstClueIdentifier]
        const secondCorner = cardCornerByClueIdentifier[clueThreadLink.secondClueIdentifier]
        return {
          threadKey: `${clueThreadLink.firstClueIdentifier}__${clueThreadLink.secondClueIdentifier}`,
          clueThreadLink,
          startPoint: { horizontal: firstCorner.horizontal + measurements.cardWidth / 2, vertical: firstCorner.vertical + 1 },
          endPoint: { horizontal: secondCorner.horizontal + measurements.cardWidth / 2, vertical: secondCorner.vertical + 1 },
        }
      })
  }, [shownClues, clueThreadLinks, cardCornerByClueIdentifier, measurements.cardWidth])

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: mouseActivationDistance } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: touchPressDelayMilliseconds, tolerance: touchPressToleranceDistance },
    }),
    useSensor(KeyboardSensor, {
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] },
    }),
  )

  const keepCardInsideBoard: Modifier = ({ transform, draggingNodeRect }) => {
    const surfaceRectangle = boardSurfaceElement.current?.getBoundingClientRect()
    if (!surfaceRectangle || !draggingNodeRect) {
      return transform
    }
    return {
      ...transform,
      x: Math.min(
        Math.max(transform.x, surfaceRectangle.left - draggingNodeRect.left),
        surfaceRectangle.right - draggingNodeRect.right,
      ),
      y: Math.min(
        Math.max(transform.y, surfaceRectangle.top - draggingNodeRect.top),
        surfaceRectangle.bottom - draggingNodeRect.bottom,
      ),
    }
  }

  const readClueSpokenName = (clueIdentifier: UniqueIdentifier) => {
    const namedClue = everyClue.find((perceivedClue) => perceivedClue.identifier === clueIdentifier)
    return boardCopy.clueSpokenName(namedClue?.chronologicalOrder ?? 0)
  }

  const calculateDroppedPosition = (clueIdentifier: string, horizontalChange: number, verticalChange: number) => {
    const previousCorner = cardCornerByClueIdentifier[clueIdentifier]
    const horizontalRoom = Math.max(1, measurements.boardWidth - measurements.cardWidth)
    const verticalRoom = Math.max(1, measurements.boardHeight - measurements.cardHeight)
    return {
      horizontalFraction: clampBoardFraction((previousCorner.horizontal + horizontalChange) / horizontalRoom),
      verticalFraction: clampBoardFraction((previousCorner.vertical + verticalChange) / verticalRoom),
    }
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) => boardCopy.cardLiftedAnnouncement(readClueSpokenName(active.id)),
    onDragOver: () => undefined,
    onDragEnd: ({ active }) =>
      boardCopy.cardPinnedAnnouncement(
        readClueSpokenName(active.id),
        describeBoardZone(
          calculateDroppedPosition(String(active.id), latestDragChange.current.horizontal, latestDragChange.current.vertical),
        ),
      ),
    onDragCancel: ({ active }) => boardCopy.cardReturnedAnnouncement(readClueSpokenName(active.id)),
  }

  const suppressClickBriefly = () => {
    isClickSuppressed.current = true
    if (clickSuppressionTimeoutIdentifier.current !== null) {
      window.clearTimeout(clickSuppressionTimeoutIdentifier.current)
    }
    clickSuppressionTimeoutIdentifier.current = window.setTimeout(() => {
      isClickSuppressed.current = false
      clickSuppressionTimeoutIdentifier.current = null
    }, clickSuppressionMilliseconds)
  }

  const handleDragEnd = (dragEndEvent: DragEndEvent) => {
    const clueIdentifier = String(dragEndEvent.active.id)
    setDraggedClueIdentifier(null)
    suppressClickBriefly()
    if (!cardCornerByClueIdentifier[clueIdentifier]) {
      return
    }
    playInteractionFeedback('stamp_impact', { playbackRateMultiplier: randomNumberBetween(1.25, 1.5), volumeMultiplier: 0.7 })
    setPinStrikeVariantName(chooseAnimationVariantName('journal_evidence_pin_strike', pinStrikeVariantNames))
    setPinStrikeCountByClueIdentifier((previousCounts) => ({
      ...previousCounts,
      [clueIdentifier]: (previousCounts[clueIdentifier] ?? 0) + 1,
    }))
    onCluePinnedAt(clueIdentifier, calculateDroppedPosition(clueIdentifier, dragEndEvent.delta.x, dragEndEvent.delta.y))
  }

  return (
    <div
      className="journal-evidence-board"
      role="group"
      aria-label={boardCopy.boardLabel}
      data-is-tying-thread={threadOriginClueIdentifier !== null}
      onKeyDown={(keyboardEvent) => {
        if (keyboardEvent.key === 'Escape' && threadOriginClueIdentifier !== null && draggedClueIdentifier === null) {
          onThreadTyingCancelled()
        }
      }}
    >
      <DndContext
        sensors={sensors}
        modifiers={[keepCardInsideBoard]}
        accessibility={{ announcements, screenReaderInstructions: { draggable: boardCopy.keyboardInstructions } }}
        onDragMove={(dragMoveEvent) => {
          latestDragChange.current = { horizontal: dragMoveEvent.delta.x, vertical: dragMoveEvent.delta.y }
        }}
        onDragStart={(dragStartEvent) => {
          latestDragChange.current = { horizontal: 0, vertical: 0 }
          setDraggedClueIdentifier(String(dragStartEvent.active.id))
          playInteractionFeedback('option_click', { playbackRateMultiplier: randomNumberBetween(0.62, 0.8) })
        }}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setDraggedClueIdentifier(null)
          suppressClickBriefly()
          playInteractionFeedback('panel_close')
        }}
      >
        <ul
          ref={boardSurfaceElement}
          className="journal-evidence-board-surface"
          style={{ height: `${measurements.boardHeight}px` }}
        >
          {boardWidth > 0
            ? shownClues.map((perceivedClue, clueIndex) => (
                <EvidenceCard
                  key={perceivedClue.identifier}
                  perceivedClue={perceivedClue}
                  cardCorner={cardCornerByClueIdentifier[perceivedClue.identifier]}
                  measurements={measurements}
                  entranceOrder={clueIndex}
                  pinEntranceVariantName={pinEntranceVariantName}
                  pinStrikeVariantName={pinStrikeVariantName}
                  pinStrikeCount={pinStrikeCountByClueIdentifier[perceivedClue.identifier] ?? 0}
                  isOpen={perceivedClue.identifier === openClueIdentifier}
                  isThreadOrigin={perceivedClue.identifier === threadOriginClueIdentifier}
                  isAwaitingThreadEnd={
                    threadOriginClueIdentifier !== null && perceivedClue.identifier !== threadOriginClueIdentifier
                  }
                  hasOwnAnalysis={clueIdentifiersWithOwnAnalysis.has(perceivedClue.identifier)}
                  perceivedText={personalizeJournalText(perceivedClue.perceivedText)}
                  wasJustDragged={() => isClickSuppressed.current}
                  onChosen={() => onClueChosen(perceivedClue.identifier)}
                />
              ))
            : null}
        </ul>
        {boardWidth > 0 ? (
          <svg
            className="journal-board-threads"
            width={measurements.boardWidth}
            height={measurements.boardHeight}
            viewBox={`0 0 ${Math.max(1, measurements.boardWidth)} ${measurements.boardHeight}`}
            aria-hidden="true"
            focusable="false"
          >
            {drawnThreads.map((drawnThread) => (
              <EvidenceThread
                key={drawnThread.threadKey}
                threadKey={drawnThread.threadKey}
                startPoint={drawnThread.startPoint}
                endPoint={drawnThread.endPoint}
                isDetached={
                  draggedClueIdentifier === drawnThread.clueThreadLink.firstClueIdentifier ||
                  draggedClueIdentifier === drawnThread.clueThreadLink.secondClueIdentifier
                }
              />
            ))}
          </svg>
        ) : null}
      </DndContext>
    </div>
  )
}

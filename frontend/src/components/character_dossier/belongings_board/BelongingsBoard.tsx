import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { Announcements, CollisionDetection, DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { LockSimple, Package, Wrench } from '@phosphor-icons/react'
import { gsap } from 'gsap'
import { Flip } from 'gsap/Flip'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { chooseAnimationVariantName, randomNumberBetween } from '../../../animation/animation_variety'
import { useInteractionFeedback } from '../../../audio/interaction_feedback'
import { characterDossierCopy } from '../../../copy/character_dossier_copy'
import type { BelongingPlacement } from '../../../demonstration/sanctuary_home_data'
import { usePlayerSettings } from '../../../settings/player_settings'
import {
  calculateBelongingContainerLoad,
  isBelongingPlacement,
} from '../../sanctuary_home/belongings_arrangement'
import type {
  BelongingContainerLoad,
  BelongingMoveEvaluation,
  BelongingMoveRejectionReason,
  BelongingPile,
} from '../../sanctuary_home/belongings_arrangement'
import { BelongingInspectionCard } from './BelongingInspectionCard'
import { jumpBetweenContainersCoordinateGetter } from './belongings_board_keyboard_coordinates'

gsap.registerPlugin(Flip)

const pileEntranceVariantNames = ['dealt_onto_table', 'slid_from_drawer', 'dropped_from_above'] as const
const pileLandingVariantNames = ['heavy_thud', 'skidding_settle', 'rocking_settle', 'pressed_flat'] as const
const containerImpactVariantNames = ['dust_ring', 'ink_splash', 'corner_jolt'] as const
const rejectionVariantNames = ['sideways_shake', 'bounced_back', 'slammed_shut'] as const
const rejectionStampVisibleMilliseconds = 1500
const touchPressDelayMilliseconds = 220
const touchPressToleranceInPixels = 8
const mouseActivationDistanceInPixels = 6
const siblingRelocationSeconds = 0.34

type DropHintKind = 'fits' | 'doesNotFit' | 'alreadyHere' | 'outOfReach'

type ContainerLoadStampKind = 'roomy' | 'tight' | 'full' | 'overloaded'

export type BelongingsBoardContainer = {
  placement: BelongingPlacement
  icon: ReactNode
  isLocked: boolean
}

export type BelongingsBoardContainerGroup = {
  groupIdentifier: string
  groupTitle: string
  groupNote: string
  containers: BelongingsBoardContainer[]
}

type LandedPile = {
  pileIdentifier: string
  placement: BelongingPlacement
  landingVariantName: (typeof pileLandingVariantNames)[number]
  impactVariantName: (typeof containerImpactVariantNames)[number]
  landingCount: number
}

type RejectedMove = {
  placement: BelongingPlacement
  rejectionReason: BelongingMoveRejectionReason
  rejectionText: string
  rejectionVariantName: (typeof rejectionVariantNames)[number]
  rejectionCount: number
  wasRequestedFromInspectionCard: boolean
}

const preferPointerThenClosestCenter: CollisionDetection = (collisionArguments) => {
  const pointerCollisions = pointerWithin(collisionArguments)
  return pointerCollisions.length > 0 ? pointerCollisions : closestCenter(collisionArguments)
}

function readContainerLoadStampKind(containerLoad: BelongingContainerLoad): ContainerLoadStampKind {
  if (containerLoad.isOverloaded) {
    return 'overloaded'
  }
  if (containerLoad.isFull) {
    return 'full'
  }
  return containerLoad.freeAmount <= 1 ? 'tight' : 'roomy'
}

function readDropHintKind(moveEvaluation: BelongingMoveEvaluation): DropHintKind {
  if (moveEvaluation.kind === 'moved') {
    return 'fits'
  }
  if (moveEvaluation.kind === 'unchanged') {
    return 'alreadyHere'
  }
  return moveEvaluation.rejectionReason === 'destination_full' ? 'doesNotFit' : 'outOfReach'
}

function readQuantityText(belongingPile: BelongingPile): string {
  return `${belongingPile.quantity} ${characterDossierCopy.belongings.formatUnitDescription(
    belongingPile.quantity,
    belongingPile.visibleUnitDescription,
  )}`
}

function BelongingPileFace({ belongingPile }: { belongingPile: BelongingPile }) {
  const boardCopy = characterDossierCopy.belongingsBoard
  const isExhausted = belongingPile.quantity === 0
  return (
    <>
      <span className="belongings-pile-name">{belongingPile.visibleName}</span>
      <span className="belongings-pile-quantity" data-emphasized={belongingPile.isConsumable ? 'true' : 'false'}>
        {belongingPile.isConsumable ? (
          <>
            <strong aria-hidden="true">{boardCopy.quantityBadge(belongingPile.quantity)}</strong>
            <span className="visually-hidden-text">{readQuantityText(belongingPile)}</span>
          </>
        ) : (
          readQuantityText(belongingPile)
        )}
      </span>
      <span className="belongings-pile-tags">
        <span className="belongings-pile-tag" data-tag-kind={belongingPile.belongingOrigin}>
          {belongingPile.belongingOrigin === 'mission' ? boardCopy.missionEquipmentTag : boardCopy.personalBelongingTag}
        </span>
        {isExhausted ? (
          <span className="belongings-pile-tag" data-tag-kind="exhausted">
            {boardCopy.exhaustedTag}
          </span>
        ) : null}
        {!belongingPile.isInGoodCondition ? (
          <span className="belongings-pile-tag" data-tag-kind="worn">
            <Wrench size={12} weight="fill" aria-hidden="true" />
            {boardCopy.wornTag}
          </span>
        ) : null}
      </span>
      <span className="belongings-pile-bulk">
        <span className="belongings-pile-bulk-marks" aria-hidden="true">
          {Array.from({ length: belongingPile.bulk }, (_, bulkMarkIndex) => (
            <span key={bulkMarkIndex} className="belongings-pile-bulk-mark" />
          ))}
        </span>
        {boardCopy.bulkLabel(belongingPile.bulk)}
      </span>
    </>
  )
}

function BelongingPileTile({
  belongingPile,
  isLocked,
  entranceOrder,
  entranceVariantName,
  landingVariantName,
  onInspectionRequested,
}: {
  belongingPile: BelongingPile
  isLocked: boolean
  entranceOrder: number
  entranceVariantName: (typeof pileEntranceVariantNames)[number]
  landingVariantName: (typeof pileLandingVariantNames)[number] | null
  onInspectionRequested: (belongingPile: BelongingPile) => void
}) {
  const boardCopy = characterDossierCopy.belongingsBoard
  const playInteractionFeedback = useInteractionFeedback()
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: belongingPile.pileIdentifier,
    disabled: isLocked,
    attributes: { roleDescription: boardCopy.draggableRoleDescription },
  })
  const movableProperties = isLocked ? {} : { ...attributes, ...listeners }
  return (
    <li
      className="belongings-pile-place"
      data-flip-id={belongingPile.pileIdentifier}
      data-entrance-variant={entranceVariantName}
      data-landing-variant={landingVariantName ?? 'none'}
      style={{ '--entrance-order': entranceOrder } as CSSProperties}
    >
      <button
        ref={setNodeRef}
        type="button"
        className="belongings-pile-tile"
        data-pile-identifier={belongingPile.pileIdentifier}
        data-drag-source={isDragging ? 'true' : 'false'}
        data-locked={isLocked ? 'true' : 'false'}
        data-exhausted={belongingPile.quantity === 0 ? 'true' : 'false'}
        data-bulk={belongingPile.bulk}
        {...movableProperties}
        aria-label={boardCopy.pileLabel(
          belongingPile.visibleName,
          readQuantityText(belongingPile),
          boardCopy.containerNames[belongingPile.placement],
        )}
        onContextMenu={(contextMenuEvent) => contextMenuEvent.preventDefault()}
        onPointerEnter={(pointerEvent) => {
          if (pointerEvent.pointerType === 'mouse') {
            playInteractionFeedback('option_hover')
          }
        }}
        onClick={() => onInspectionRequested(belongingPile)}
      >
        <BelongingPileFace belongingPile={belongingPile} />
      </button>
    </li>
  )
}

function BelongingsContainerZone({
  boardContainer,
  containerLoad,
  dropHintKind,
  rejectedMove,
  isRejectionStampVisible,
  landedPile,
  children,
  pileCount,
}: {
  boardContainer: BelongingsBoardContainer
  containerLoad: BelongingContainerLoad
  dropHintKind: DropHintKind | null
  rejectedMove: RejectedMove | null
  isRejectionStampVisible: boolean
  landedPile: LandedPile | null
  children: ReactNode
  pileCount: number
}) {
  const boardCopy = characterDossierCopy.belongingsBoard
  const { setNodeRef, isOver } = useDroppable({ id: boardContainer.placement, disabled: boardContainer.isLocked })
  const loadStampKind = readContainerLoadStampKind(containerLoad)
  const titleElementIdentifier = `belongings-container-title-${boardContainer.placement}`
  const freePlaceCount =
    containerLoad.capacityMeasure === 'pieces' ? Math.max(0, containerLoad.capacity - containerLoad.occupiedAmount) : 0
  return (
    <section
      ref={setNodeRef}
      className="belongings-container"
      data-placement={boardContainer.placement}
      data-locked={boardContainer.isLocked ? 'true' : 'false'}
      data-drop-hint={isOver && dropHintKind ? dropHintKind : 'none'}
      data-rejection-variant={rejectedMove && isRejectionStampVisible ? rejectedMove.rejectionVariantName : 'none'}
      aria-labelledby={titleElementIdentifier}
    >
      {landedPile ? (
        <span
          key={landedPile.landingCount}
          className="belongings-container-impact"
          data-impact-variant={landedPile.impactVariantName}
          aria-hidden="true"
        />
      ) : null}
      <header className="belongings-container-header">
        <h4 id={titleElementIdentifier} className="belongings-container-title">
          {boardContainer.icon}
          {boardCopy.containerNames[boardContainer.placement]}
        </h4>
        <span key={loadStampKind} className="belongings-load-stamp" data-load-stamp={loadStampKind}>
          {boardCopy.loadStamps[loadStampKind]}
        </span>
      </header>
      <p className="belongings-container-note">{boardCopy.containerNotes[boardContainer.placement]}</p>
      <p className="belongings-container-readout">
        {containerLoad.capacityMeasure === 'pieces'
          ? boardCopy.piecesCapacityReadout(containerLoad.occupiedAmount, containerLoad.capacity)
          : boardCopy.bulkCapacityReadout(containerLoad.occupiedAmount + containerLoad.reservedAmount, containerLoad.capacity)}
        {boardContainer.isLocked ? (
          <span className="belongings-container-locked-tag">
            <LockSimple size={14} weight="fill" aria-hidden="true" />
            {boardCopy.lockedContainerTag}
          </span>
        ) : null}
      </p>
      {containerLoad.capacityMeasure === 'bulk' ? (
        <span className="belongings-bulk-notches" aria-hidden="true">
          {Array.from({ length: containerLoad.capacity }, (_, notchIndex) => (
            <span
              key={notchIndex}
              className="belongings-bulk-notch"
              data-notch-state={
                notchIndex < containerLoad.occupiedAmount
                  ? 'occupied'
                  : notchIndex < containerLoad.occupiedAmount + containerLoad.reservedAmount
                    ? 'reserved'
                    : 'free'
              }
            />
          ))}
        </span>
      ) : null}
      {containerLoad.reservedAmount > 0 ? (
        <p className="belongings-container-note">{boardCopy.reservedBulkNote(containerLoad.reservedAmount)}</p>
      ) : null}
      <ul className="belongings-pile-places">
        {children}
        {Array.from({ length: freePlaceCount }, (_, freePlaceIndex) => (
          <li key={`free-place-${freePlaceIndex}`} className="belongings-free-place" aria-hidden="true">
            {boardCopy.freePlaceLabel}
          </li>
        ))}
      </ul>
      {pileCount === 0 && freePlaceCount === 0 ? (
        <p className="belongings-container-empty">
          <Package size={18} weight="bold" aria-hidden="true" />
          {boardCopy.emptyContainerTexts[boardContainer.placement]}
        </p>
      ) : null}
      {isOver && dropHintKind ? (
        <p className="belongings-drop-hint" data-drop-hint={dropHintKind} aria-hidden="true">
          {boardCopy.dropHints[dropHintKind]}
        </p>
      ) : null}
      {rejectedMove && isRejectionStampVisible ? (
        <span key={rejectedMove.rejectionCount} className="belongings-rejection-stamp" aria-hidden="true">
          {boardCopy.rejectionStamps[rejectedMove.rejectionReason]}
        </span>
      ) : null}
      {rejectedMove && !rejectedMove.wasRequestedFromInspectionCard ? (
        <p className="belongings-container-rejection">
          {rejectedMove.rejectionText}
        </p>
      ) : null}
    </section>
  )
}

export function BelongingsBoard({
  boardLabel,
  containerGroups,
  belongingPiles,
  isMissionEquipmentPresent,
  viewMode,
  outOfReachRejectionText,
  previewBelongingMove,
  commitBelongingMove,
}: {
  boardLabel: string
  containerGroups: BelongingsBoardContainerGroup[]
  belongingPiles: BelongingPile[]
  isMissionEquipmentPresent: boolean
  viewMode: 'list' | 'cards'
  outOfReachRejectionText: string
  previewBelongingMove: (pileIdentifier: string, destinationPlacement: BelongingPlacement) => BelongingMoveEvaluation
  commitBelongingMove: (
    pileIdentifier: string,
    destinationPlacement: BelongingPlacement,
    requestedUnitCount: number | null,
  ) => BelongingMoveEvaluation
}) {
  const boardCopy = characterDossierCopy.belongingsBoard
  const playInteractionFeedback = useInteractionFeedback()
  const { shouldReduceMotion, playerSettings } = usePlayerSettings()
  const [pileEntranceVariantName] = useState(() =>
    chooseAnimationVariantName('belongings_pile_entrance', pileEntranceVariantNames),
  )
  const [draggedPileIdentifier, setDraggedPileIdentifier] = useState<string | null>(null)
  const [dragOverlayStyle, setDragOverlayStyle] = useState<CSSProperties>({})
  const [hoveredPlacement, setHoveredPlacement] = useState<BelongingPlacement | null>(null)
  const [inspectedPileIdentifier, setInspectedPileIdentifier] = useState<string | null>(null)
  const [landedPile, setLandedPile] = useState<LandedPile | null>(null)
  const [rejectedMove, setRejectedMove] = useState<RejectedMove | null>(null)
  const [isRejectionStampVisible, setIsRejectionStampVisible] = useState(false)
  const [movementAnnouncement, setMovementAnnouncement] = useState('')
  const boardElement = useRef<HTMLDivElement>(null)
  const pendingRelocationState = useRef<ReturnType<typeof Flip.getState> | null>(null)
  const rejectionStampTimeoutIdentifier = useRef(0)
  const latestDragOutcomeAnnouncement = useRef<string | null>(null)
  const pileIdentifierAwaitingFocus = useRef<string | null>(null)
  const moveCount = useRef(0)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: mouseActivationDistanceInPixels } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: touchPressDelayMilliseconds, tolerance: touchPressToleranceInPixels },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: jumpBetweenContainersCoordinateGetter,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] },
    }),
  )

  useEffect(() => {
    const timeoutIdentifierHolder = rejectionStampTimeoutIdentifier
    return () => window.clearTimeout(timeoutIdentifierHolder.current)
  }, [])

  const pileLayoutSignature = belongingPiles
    .map((belongingPile) => `${belongingPile.pileIdentifier}:${belongingPile.quantity}`)
    .join('|')

  useLayoutEffect(() => {
    const relocationState = pendingRelocationState.current
    pendingRelocationState.current = null
    const pileIdentifierToFocus = pileIdentifierAwaitingFocus.current
    if (pileIdentifierToFocus && boardElement.current) {
      const pileElementToFocus = boardElement.current.querySelector<HTMLElement>(
        `[data-pile-identifier="${pileIdentifierToFocus}"]`,
      )
      const isFocusLost = document.activeElement === null || document.activeElement === document.body
      if (pileElementToFocus && isFocusLost) {
        pileElementToFocus.focus({ preventScroll: true })
        pileIdentifierAwaitingFocus.current = null
      }
    }
    if (!relocationState || !boardElement.current) {
      return
    }
    const relocationAnimation = Flip.from(relocationState, {
      targets: boardElement.current.querySelectorAll('[data-flip-id]'),
      duration: siblingRelocationSeconds,
      ease: 'power2.out',
      simple: true,
      prune: true,
    })
    return () => {
      relocationAnimation.progress(1).kill()
    }
  }, [pileLayoutSignature])

  const pileByIdentifier = new Map(belongingPiles.map((belongingPile) => [belongingPile.pileIdentifier, belongingPile]))
  const draggedPile = draggedPileIdentifier ? (pileByIdentifier.get(draggedPileIdentifier) ?? null) : null
  const inspectedPile = inspectedPileIdentifier ? (pileByIdentifier.get(inspectedPileIdentifier) ?? null) : null
  const boardContainers = containerGroups.flatMap((containerGroup) => containerGroup.containers)
  const unlockedPlacements = boardContainers
    .filter((boardContainer) => !boardContainer.isLocked)
    .map((boardContainer) => boardContainer.placement)
  const isInspectedPileLocked = inspectedPile
    ? boardContainers.some((boardContainer) => boardContainer.placement === inspectedPile.placement && boardContainer.isLocked)
    : false

  const readRejectionText = (
    rejectionReason: BelongingMoveRejectionReason,
    belongingPile: BelongingPile | null,
    destinationPlacement: BelongingPlacement,
  ): string => {
    if (rejectionReason === 'destination_full' && belongingPile) {
      return boardCopy.fullContainerRejections[destinationPlacement](belongingPile.visibleName)
    }
    return rejectionReason === 'place_out_of_reach' ? outOfReachRejectionText : boardCopy.unknownPileRejection
  }

  const performBelongingMove = (
    pileIdentifier: string,
    destinationPlacement: BelongingPlacement,
    requestedUnitCount: number | null,
    wasRequestedFromInspectionCard: boolean,
  ): { announcementText: string; wasMoved: boolean } => {
    const movedPile = pileByIdentifier.get(pileIdentifier) ?? null
    const movedPileName = movedPile?.visibleName ?? ''
    if (!shouldReduceMotion && playerSettings.screenEffectsIntensity !== 'minimal' && boardElement.current) {
      pendingRelocationState.current = Flip.getState(boardElement.current.querySelectorAll('[data-flip-id]'), {
        simple: true,
      })
    }
    const moveEvaluation = commitBelongingMove(pileIdentifier, destinationPlacement, requestedUnitCount)
    moveCount.current += 1
    if (moveEvaluation.kind === 'moved') {
      playInteractionFeedback(
        moveEvaluation.movedBulk >= 3 ? 'heavy_impact' : moveEvaluation.movedBulk === 2 ? 'stamp_impact' : 'panel_close',
      )
      window.clearTimeout(rejectionStampTimeoutIdentifier.current)
      setRejectedMove(null)
      setIsRejectionStampVisible(false)
      setLandedPile({
        pileIdentifier: moveEvaluation.destinationPileIdentifier,
        placement: destinationPlacement,
        landingVariantName: chooseAnimationVariantName('belongings_pile_landing', pileLandingVariantNames),
        impactVariantName: chooseAnimationVariantName('belongings_container_impact', containerImpactVariantNames),
        landingCount: moveCount.current,
      })
      pileIdentifierAwaitingFocus.current = moveEvaluation.destinationPileIdentifier
      const isPartialMove =
        movedPile !== null && requestedUnitCount !== null && requestedUnitCount < movedPile.quantity
      return {
        announcementText: isPartialMove
          ? boardCopy.announcements.movedUnits(requestedUnitCount, movedPileName, boardCopy.containerNames[destinationPlacement])
          : boardCopy.announcements.moved(movedPileName, boardCopy.containerNames[destinationPlacement]),
        wasMoved: true,
      }
    }
    pendingRelocationState.current = null
    if (moveEvaluation.kind === 'unchanged') {
      playInteractionFeedback('panel_close')
      return { announcementText: boardCopy.announcements.returned(movedPileName), wasMoved: false }
    }
    const rejectionText = readRejectionText(moveEvaluation.rejectionReason, movedPile, destinationPlacement)
    playInteractionFeedback('rejection')
    setRejectedMove({
      placement: destinationPlacement,
      rejectionReason: moveEvaluation.rejectionReason,
      rejectionText,
      rejectionVariantName: chooseAnimationVariantName('belongings_move_rejection', rejectionVariantNames),
      rejectionCount: moveCount.current,
      wasRequestedFromInspectionCard,
    })
    setIsRejectionStampVisible(true)
    window.clearTimeout(rejectionStampTimeoutIdentifier.current)
    rejectionStampTimeoutIdentifier.current = window.setTimeout(
      () => setIsRejectionStampVisible(false),
      rejectionStampVisibleMilliseconds,
    )
    return { announcementText: rejectionText, wasMoved: false }
  }

  const handleDragStart = (dragStartEvent: DragStartEvent) => {
    playInteractionFeedback('option_click')
    latestDragOutcomeAnnouncement.current = null
    setDraggedPileIdentifier(String(dragStartEvent.active.id))
    setDragOverlayStyle({ '--carried-tilt': `${randomNumberBetween(-4, 4).toFixed(1)}deg` } as CSSProperties)
    setHoveredPlacement(null)
    setRejectedMove(null)
    setIsRejectionStampVisible(false)
    window.clearTimeout(rejectionStampTimeoutIdentifier.current)
  }

  const handleDragOver = (dragOverEvent: DragOverEvent) => {
    const overPlacement = dragOverEvent.over && isBelongingPlacement(dragOverEvent.over.id) ? dragOverEvent.over.id : null
    if (overPlacement !== hoveredPlacement) {
      setHoveredPlacement(overPlacement)
      if (overPlacement !== null) {
        playInteractionFeedback('option_hover')
      }
    }
  }

  const handleDragEnd = (dragEndEvent: DragEndEvent) => {
    const pileIdentifier = String(dragEndEvent.active.id)
    const destinationPlacement =
      dragEndEvent.over && isBelongingPlacement(dragEndEvent.over.id) ? dragEndEvent.over.id : null
    setDraggedPileIdentifier(null)
    setHoveredPlacement(null)
    if (destinationPlacement === null) {
      playInteractionFeedback('panel_close')
      latestDragOutcomeAnnouncement.current = boardCopy.announcements.returned(
        pileByIdentifier.get(pileIdentifier)?.visibleName ?? '',
      )
      return
    }
    latestDragOutcomeAnnouncement.current = performBelongingMove(pileIdentifier, destinationPlacement, null, false).announcementText
  }

  const handleDragCancel = () => {
    playInteractionFeedback('panel_close')
    setDraggedPileIdentifier(null)
    setHoveredPlacement(null)
  }

  const dragAnnouncements: Announcements = {
    onDragStart: ({ active }) => {
      const announcedPile = pileByIdentifier.get(String(active.id))
      return announcedPile
        ? boardCopy.announcements.pickedUp(announcedPile.visibleName, boardCopy.containerNames[announcedPile.placement])
        : undefined
    },
    onDragOver: ({ active, over }) => {
      const announcedPile = pileByIdentifier.get(String(active.id))
      if (!announcedPile) {
        return undefined
      }
      if (!over || !isBelongingPlacement(over.id)) {
        return boardCopy.announcements.overNothing(announcedPile.visibleName)
      }
      return boardCopy.announcements.overContainer(
        announcedPile.visibleName,
        boardCopy.containerNames[over.id],
        boardCopy.dropHints[readDropHintKind(previewBelongingMove(announcedPile.pileIdentifier, over.id))],
      )
    },
    onDragEnd: ({ active }) =>
      latestDragOutcomeAnnouncement.current ??
      boardCopy.announcements.returned(pileByIdentifier.get(String(active.id))?.visibleName ?? ''),
    onDragCancel: ({ active }) =>
      boardCopy.announcements.cancelled(pileByIdentifier.get(String(active.id))?.visibleName ?? ''),
  }

  const dropHintKind =
    draggedPile && hoveredPlacement ? readDropHintKind(previewBelongingMove(draggedPile.pileIdentifier, hoveredPlacement)) : null

  const openInspection = (belongingPile: BelongingPile) => {
    playInteractionFeedback('panel_open')
    pileIdentifierAwaitingFocus.current = belongingPile.pileIdentifier
    setRejectedMove(null)
    setIsRejectionStampVisible(false)
    setInspectedPileIdentifier(belongingPile.pileIdentifier)
  }

  const closeInspection = () => {
    playInteractionFeedback('panel_close')
    setInspectedPileIdentifier(null)
  }

  const moveInspectedPile = (destinationPlacement: BelongingPlacement, requestedUnitCount: number | null) => {
    if (!inspectedPile) {
      return
    }
    const moveOutcome = performBelongingMove(inspectedPile.pileIdentifier, destinationPlacement, requestedUnitCount, true)
    if (moveOutcome.wasMoved) {
      setMovementAnnouncement(moveOutcome.announcementText)
      setInspectedPileIdentifier(null)
    }
  }

  const returnFocusAfterInspection = (): boolean => {
    const pileIdentifierToFocus = pileIdentifierAwaitingFocus.current
    const pileElementToFocus =
      pileIdentifierToFocus && boardElement.current
        ? boardElement.current.querySelector<HTMLElement>(`[data-pile-identifier="${pileIdentifierToFocus}"]`)
        : null
    if (!pileElementToFocus) {
      return false
    }
    pileIdentifierAwaitingFocus.current = null
    pileElementToFocus.focus()
    return true
  }

  const entranceOrderByPileIdentifier = new Map(
    belongingPiles.map((belongingPile, pileIndex) => [belongingPile.pileIdentifier, pileIndex]),
  )

  return (
    <div ref={boardElement} className="belongings-board" data-view-mode={viewMode} role="group" aria-label={boardLabel}>
      <p className="visually-hidden-text" role="status">
        {movementAnnouncement}
      </p>
      <p className="belongings-board-hint">{boardCopy.movingHint}</p>
      <DndContext
        sensors={sensors}
        collisionDetection={preferPointerThenClosestCenter}
        accessibility={{
          announcements: dragAnnouncements,
          screenReaderInstructions: { draggable: boardCopy.keyboardInstructions },
        }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {containerGroups.map((containerGroup) => (
          <section
            key={containerGroup.groupIdentifier}
            className="belongings-container-group"
            aria-labelledby={`belongings-group-title-${containerGroup.groupIdentifier}`}
          >
            <div className="belongings-container-group-heading">
              <h3 id={`belongings-group-title-${containerGroup.groupIdentifier}`} className="belongings-container-group-title">
                {containerGroup.groupTitle}
              </h3>
              <p className="belongings-container-group-note">{containerGroup.groupNote}</p>
            </div>
            <div className="belongings-container-row">
              {containerGroup.containers.map((boardContainer) => {
                const pilesInContainer = belongingPiles.filter(
                  (belongingPile) => belongingPile.placement === boardContainer.placement,
                )
                return (
                  <BelongingsContainerZone
                    key={boardContainer.placement}
                    boardContainer={boardContainer}
                    containerLoad={calculateBelongingContainerLoad(
                      belongingPiles,
                      boardContainer.placement,
                      isMissionEquipmentPresent,
                    )}
                    dropHintKind={dropHintKind}
                    rejectedMove={rejectedMove?.placement === boardContainer.placement ? rejectedMove : null}
                    isRejectionStampVisible={isRejectionStampVisible}
                    landedPile={landedPile?.placement === boardContainer.placement ? landedPile : null}
                    pileCount={pilesInContainer.length}
                  >
                    {pilesInContainer.map((belongingPile) => (
                      <BelongingPileTile
                        key={belongingPile.pileIdentifier}
                        belongingPile={belongingPile}
                        isLocked={boardContainer.isLocked}
                        entranceOrder={entranceOrderByPileIdentifier.get(belongingPile.pileIdentifier) ?? 0}
                        entranceVariantName={pileEntranceVariantName}
                        landingVariantName={
                          landedPile?.pileIdentifier === belongingPile.pileIdentifier ? landedPile.landingVariantName : null
                        }
                        onInspectionRequested={openInspection}
                      />
                    ))}
                  </BelongingsContainerZone>
                )
              })}
            </div>
          </section>
        ))}
        {createPortal(
          <DragOverlay dropAnimation={null} zIndex={60}>
            {draggedPile ? (
              <div
                className="belongings-pile-tile"
                data-carried-in-the-air="true"
                data-view-mode={viewMode}
                data-bulk={draggedPile.bulk}
                style={dragOverlayStyle}
              >
                <BelongingPileFace belongingPile={draggedPile} />
              </div>
            ) : null}
          </DragOverlay>,
          document.body,
        )}
      </DndContext>
      <BelongingInspectionCard
        belongingPile={inspectedPile}
        moveDestinationPlacements={
          inspectedPile && !isInspectedPileLocked
            ? unlockedPlacements.filter((placement) => placement !== inspectedPile.placement)
            : []
        }
        lockedMoveNote={isInspectedPileLocked ? boardCopy.inspection.lockedMoveNote : null}
        rejectionText={rejectedMove?.wasRequestedFromInspectionCard ? rejectedMove.rejectionText : null}
        rejectionCount={rejectedMove?.rejectionCount ?? 0}
        onMoveRequested={moveInspectedPile}
        onCloseRequested={closeInspection}
        onFocusReturnRequested={returnFocusAfterInspection}
      />
    </div>
  )
}

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import type { Announcements, DragEndEvent, UniqueIdentifier } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowCounterClockwise, CaretDown, CaretUp, DotsSixVertical } from '@phosphor-icons/react'
import { useId, useState } from 'react'
import { randomNumberBetween } from '../../../animation/animation_variety'
import { useInteractionFeedback } from '../../../audio/interaction_feedback'
import { interactivePiecesCopy } from '../../../copy/archive_chat_engine/interactive_pieces_copy'
import { usePlayerSettings } from '../../../settings/player_settings'
import { OrderedPieceSymbolGlyph } from './OrderedPieceSymbolGlyph'
import type { InteractivePieceWidgetProperties } from './interactive_piece_widget_properties'
import { areSubmittedValuesEqual, createInitialWorkingValue } from './interactive_piece_working_values'

const positionsCopy = interactivePiecesCopy.orderedPositions

type OrderedPlateRowProperties = {
  pieceIdentifier: string
  pieceVisibleName: string
  symbolName: string
  positionLabel: string
  isFirstPosition: boolean
  isLastPosition: boolean
  isInteractionDisabled: boolean
  shouldReduceMotion: boolean
  onMoveRequested: (pieceIdentifier: string, positionChange: number) => void
}

function OrderedPlateRow({
  pieceIdentifier,
  pieceVisibleName,
  symbolName,
  positionLabel,
  isFirstPosition,
  isLastPosition,
  isInteractionDisabled,
  shouldReduceMotion,
  onMoveRequested,
}: OrderedPlateRowProperties) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: pieceIdentifier,
    disabled: isInteractionDisabled,
    transition: shouldReduceMotion ? null : undefined,
  })
  return (
    <li
      ref={setNodeRef}
      className="ordered-plate-row"
      data-is-being-dragged={isDragging}
      style={{ transform: CSS.Translate.toString(transform), transition: shouldReduceMotion ? undefined : transition }}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        className="ordered-plate-drag-handle"
        disabled={isInteractionDisabled}
        {...attributes}
        {...listeners}
        aria-label={positionsCopy.dragHandleLabel(pieceVisibleName)}
      >
        <DotsSixVertical size={22} weight="bold" aria-hidden="true" />
      </button>
      <span className="ordered-plate-face">
        <OrderedPieceSymbolGlyph symbolName={symbolName} />
        <span className="ordered-plate-texts">
          <span className="ordered-plate-position-label">{positionLabel}</span>
          <span className="ordered-plate-name">{pieceVisibleName}</span>
        </span>
      </span>
      <button
        type="button"
        className="ordered-plate-move-button"
        disabled={isInteractionDisabled || isFirstPosition}
        aria-label={positionsCopy.moveEarlierButton(pieceVisibleName)}
        onClick={() => onMoveRequested(pieceIdentifier, -1)}
      >
        <CaretUp size={18} weight="bold" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="ordered-plate-move-button"
        disabled={isInteractionDisabled || isLastPosition}
        aria-label={positionsCopy.moveLaterButton(pieceVisibleName)}
        onClick={() => onMoveRequested(pieceIdentifier, 1)}
      >
        <CaretDown size={18} weight="bold" aria-hidden="true" />
      </button>
    </li>
  )
}

export default function OrderedPositionsPiece({
  publicState,
  workingValue,
  isInteractionDisabled,
  onWorkingValueChanged,
}: InteractivePieceWidgetProperties<'ordered_positions'>) {
  const playInteractionFeedback = useInteractionFeedback()
  const { shouldReduceMotion } = usePlayerSettings()
  const [latestMoveAnnouncement, setLatestMoveAnnouncement] = useState('')
  const instructionsIdentifier = useId()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const orderedPieceIdentifiers = workingValue.orderedPieceIdentifiers
  const initialWorkingValue = createInitialWorkingValue(publicState)

  const readPieceVisibleName = (pieceIdentifier: UniqueIdentifier) =>
    publicState.pieces.find((piece) => piece.pieceIdentifier === pieceIdentifier)?.visibleName ?? ''

  const readPositionLabel = (positionIndex: number) =>
    publicState.positionLabels[positionIndex] ?? positionsCopy.fallbackPositionLabel(positionIndex + 1)

  const readPositionLabelOfPiece = (pieceIdentifier: UniqueIdentifier) =>
    readPositionLabel(orderedPieceIdentifiers.indexOf(String(pieceIdentifier)))

  const playPlateSound = () => {
    playInteractionFeedback('option_click', { playbackRateMultiplier: randomNumberBetween(0.6, 0.78) })
  }

  const reportOrder = (nextOrderedPieceIdentifiers: string[]) => {
    onWorkingValueChanged({ widgetKindName: 'ordered_positions', orderedPieceIdentifiers: nextOrderedPieceIdentifiers })
  }

  const movePieceByPositions = (pieceIdentifier: string, positionChange: number) => {
    const currentPositionIndex = orderedPieceIdentifiers.indexOf(pieceIdentifier)
    const nextPositionIndex = currentPositionIndex + positionChange
    if (isInteractionDisabled || currentPositionIndex < 0 || nextPositionIndex < 0 || nextPositionIndex >= orderedPieceIdentifiers.length) {
      return
    }
    playPlateSound()
    setLatestMoveAnnouncement(
      positionsCopy.pieceMovedAnnouncement(readPieceVisibleName(pieceIdentifier), readPositionLabel(nextPositionIndex)),
    )
    reportOrder(arrayMove(orderedPieceIdentifiers, currentPositionIndex, nextPositionIndex))
  }

  const handleDragEnd = (dragEndEvent: DragEndEvent) => {
    const { active, over } = dragEndEvent
    if (!over || active.id === over.id) {
      return
    }
    const previousPositionIndex = orderedPieceIdentifiers.indexOf(String(active.id))
    const nextPositionIndex = orderedPieceIdentifiers.indexOf(String(over.id))
    if (previousPositionIndex < 0 || nextPositionIndex < 0) {
      return
    }
    playPlateSound()
    reportOrder(arrayMove(orderedPieceIdentifiers, previousPositionIndex, nextPositionIndex))
  }

  const dragAnnouncements: Announcements = {
    onDragStart: ({ active }) => positionsCopy.dragStartedAnnouncement(readPieceVisibleName(active.id)),
    onDragOver: ({ active, over }) =>
      over ? positionsCopy.dragOverAnnouncement(readPieceVisibleName(active.id), readPositionLabelOfPiece(over.id)) : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? positionsCopy.dragEndedAnnouncement(readPieceVisibleName(active.id), readPositionLabelOfPiece(over.id))
        : positionsCopy.dragCancelledAnnouncement(readPieceVisibleName(active.id)),
    onDragCancel: ({ active }) => positionsCopy.dragCancelledAnnouncement(readPieceVisibleName(active.id)),
  }

  return (
    <div className="ordered-positions-piece">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={() => playInteractionFeedback('option_hover')}
        onDragEnd={handleDragEnd}
        accessibility={{
          announcements: dragAnnouncements,
          screenReaderInstructions: { draggable: positionsCopy.keyboardInstructions },
        }}
      >
        <SortableContext items={orderedPieceIdentifiers} strategy={verticalListSortingStrategy}>
          <ol className="ordered-plate-list" aria-label={positionsCopy.listLabel} aria-describedby={instructionsIdentifier}>
            {orderedPieceIdentifiers.map((pieceIdentifier, positionIndex) => {
              const piece = publicState.pieces.find((candidatePiece) => candidatePiece.pieceIdentifier === pieceIdentifier)
              return piece ? (
                <OrderedPlateRow
                  key={pieceIdentifier}
                  pieceIdentifier={pieceIdentifier}
                  pieceVisibleName={piece.visibleName}
                  symbolName={piece.symbolName}
                  positionLabel={readPositionLabel(positionIndex)}
                  isFirstPosition={positionIndex === 0}
                  isLastPosition={positionIndex === orderedPieceIdentifiers.length - 1}
                  isInteractionDisabled={isInteractionDisabled}
                  shouldReduceMotion={shouldReduceMotion}
                  onMoveRequested={movePieceByPositions}
                />
              ) : null
            })}
          </ol>
        </SortableContext>
      </DndContext>
      <p className="sr-only" aria-live="polite">
        {latestMoveAnnouncement}
      </p>
      <div className="ordered-positions-footer">
        <button
          type="button"
          className="quiet-action-button"
          disabled={isInteractionDisabled || areSubmittedValuesEqual(workingValue, initialWorkingValue)}
          onClick={() => {
            playInteractionFeedback('panel_close')
            onWorkingValueChanged(initialWorkingValue)
          }}
        >
          <ArrowCounterClockwise size={16} weight="bold" aria-hidden="true" />
          {positionsCopy.restoreInitialOrderButton}
        </button>
      </div>
      <p className="interactive-piece-instructions" id={instructionsIdentifier}>
        {positionsCopy.keyboardInstructions}
      </p>
    </div>
  )
}

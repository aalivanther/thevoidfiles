import { CaretDown, CaretUp } from '@phosphor-icons/react'
import { useId, useRef } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { randomNumberBetween } from '../../../animation/animation_variety'
import { useInteractionFeedback } from '../../../audio/interaction_feedback'
import { interactivePiecesCopy } from '../../../copy/archive_chat_engine/interactive_pieces_copy'
import type { InteractivePieceWidgetProperties } from './interactive_piece_widget_properties'
import { wrapPositionWithinCount } from './interactive_piece_working_values'

const dialsCopy = interactivePiecesCopy.combinationDials
const dragDistancePerSymbolInPixels = 30

type DialDragProgress = {
  dialIndex: number
  pointerStartVerticalPosition: number
  symbolIndexWhenDragStarted: number
  lastReportedSymbolIndex: number
}

export default function CombinationDialsPiece({
  publicState,
  workingValue,
  isInteractionDisabled,
  onWorkingValueChanged,
}: InteractivePieceWidgetProperties<'combination_dials'>) {
  const playInteractionFeedback = useInteractionFeedback()
  const dialDragProgress = useRef<DialDragProgress | null>(null)
  const instructionsIdentifier = useId()

  const readChosenSymbolIndex = (dialIndex: number) => {
    const chosenSymbolIndex = publicState.dials[dialIndex]?.symbols.indexOf(workingValue.chosenSymbols[dialIndex] ?? '') ?? -1
    return chosenSymbolIndex < 0 ? 0 : chosenSymbolIndex
  }

  const chooseSymbolIndex = (dialIndex: number, requestedSymbolIndex: number) => {
    const dial = publicState.dials[dialIndex]
    if (isInteractionDisabled || !dial || dial.symbols.length === 0) {
      return
    }
    const nextSymbolIndex = wrapPositionWithinCount(requestedSymbolIndex, dial.symbols.length)
    if (nextSymbolIndex === readChosenSymbolIndex(dialIndex)) {
      return
    }
    playInteractionFeedback('typewriter_key', {
      playbackRateMultiplier: randomNumberBetween(0.55, 0.7),
      volumeMultiplier: 0.9,
    })
    onWorkingValueChanged({
      widgetKindName: 'combination_dials',
      chosenSymbols: publicState.dials.map((currentDial, currentDialIndex) =>
        currentDialIndex === dialIndex
          ? dial.symbols[nextSymbolIndex]
          : (workingValue.chosenSymbols[currentDialIndex] ?? currentDial.symbols[0] ?? ''),
      ),
    })
  }

  const handleDialKeyDown = (keyboardEvent: KeyboardEvent<HTMLDivElement>, dialIndex: number) => {
    const dial = publicState.dials[dialIndex]
    if (!dial || keyboardEvent.altKey || keyboardEvent.ctrlKey || keyboardEvent.metaKey) {
      return
    }
    const chosenSymbolIndex = readChosenSymbolIndex(dialIndex)
    const requestedSymbolIndexByKey: Record<string, number> = {
      ArrowUp: chosenSymbolIndex - 1,
      ArrowDown: chosenSymbolIndex + 1,
      Home: 0,
      End: dial.symbols.length - 1,
    }
    const requestedSymbolIndex = requestedSymbolIndexByKey[keyboardEvent.key]
    if (requestedSymbolIndex !== undefined) {
      keyboardEvent.preventDefault()
      chooseSymbolIndex(dialIndex, requestedSymbolIndex)
      return
    }
    if (keyboardEvent.key.length !== 1) {
      return
    }
    const typedSymbolIndex = dial.symbols.findIndex(
      (symbol) => symbol.toLocaleUpperCase('es') === keyboardEvent.key.toLocaleUpperCase('es'),
    )
    if (typedSymbolIndex >= 0) {
      keyboardEvent.preventDefault()
      chooseSymbolIndex(dialIndex, typedSymbolIndex)
    }
  }

  const handleDialPointerDown = (pointerEvent: PointerEvent<HTMLDivElement>, dialIndex: number) => {
    if (isInteractionDisabled || (pointerEvent.pointerType === 'mouse' && pointerEvent.button !== 0)) {
      return
    }
    pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId)
    const chosenSymbolIndex = readChosenSymbolIndex(dialIndex)
    dialDragProgress.current = {
      dialIndex,
      pointerStartVerticalPosition: pointerEvent.clientY,
      symbolIndexWhenDragStarted: chosenSymbolIndex,
      lastReportedSymbolIndex: chosenSymbolIndex,
    }
  }

  const handleDialPointerMove = (pointerEvent: PointerEvent<HTMLDivElement>) => {
    const dragProgress = dialDragProgress.current
    if (!dragProgress) {
      return
    }
    const symbolCount = publicState.dials[dragProgress.dialIndex]?.symbols.length ?? 0
    const draggedSymbolCount = Math.round(
      (dragProgress.pointerStartVerticalPosition - pointerEvent.clientY) / dragDistancePerSymbolInPixels,
    )
    const draggedSymbolIndex = wrapPositionWithinCount(dragProgress.symbolIndexWhenDragStarted + draggedSymbolCount, symbolCount)
    if (draggedSymbolIndex !== dragProgress.lastReportedSymbolIndex) {
      dragProgress.lastReportedSymbolIndex = draggedSymbolIndex
      chooseSymbolIndex(dragProgress.dialIndex, draggedSymbolIndex)
    }
  }

  const finishDialDrag = (pointerEvent: PointerEvent<HTMLDivElement>) => {
    dialDragProgress.current = null
    if (pointerEvent.currentTarget.hasPointerCapture(pointerEvent.pointerId)) {
      pointerEvent.currentTarget.releasePointerCapture(pointerEvent.pointerId)
    }
  }

  return (
    <div className="combination-dials-piece">
      <div className="combination-dials-body" role="group" aria-label={dialsCopy.groupLabel} aria-describedby={instructionsIdentifier}>
        <span className="combination-dials-shackle" aria-hidden="true" />
        <div className="combination-dials-row">
          {publicState.dials.map((dial, dialIndex) => {
            const symbolCount = dial.symbols.length
            const chosenSymbolIndex = readChosenSymbolIndex(dialIndex)
            const chosenSymbol = dial.symbols[chosenSymbolIndex] ?? ''
            return (
              <div key={dial.dialIdentifier} className="combination-dial-column">
                <button
                  type="button"
                  className="combination-dial-step-button"
                  disabled={isInteractionDisabled}
                  aria-label={dialsCopy.turnDialUpButton(dial.visibleLabel)}
                  onClick={() => chooseSymbolIndex(dialIndex, chosenSymbolIndex - 1)}
                >
                  <CaretUp size={18} weight="bold" aria-hidden="true" />
                </button>
                <div
                  className="combination-dial-window"
                  role="spinbutton"
                  tabIndex={isInteractionDisabled ? -1 : 0}
                  aria-label={dial.visibleLabel}
                  aria-valuemin={1}
                  aria-valuemax={Math.max(symbolCount, 1)}
                  aria-valuenow={chosenSymbolIndex + 1}
                  aria-valuetext={dialsCopy.dialValueText(dial.visibleLabel, chosenSymbol)}
                  aria-disabled={isInteractionDisabled}
                  onKeyDown={(keyboardEvent) => handleDialKeyDown(keyboardEvent, dialIndex)}
                  onPointerDown={(pointerEvent) => handleDialPointerDown(pointerEvent, dialIndex)}
                  onPointerMove={handleDialPointerMove}
                  onPointerUp={finishDialDrag}
                  onPointerCancel={finishDialDrag}
                >
                  <span className="combination-dial-neighbour-symbol" aria-hidden="true">
                    {dial.symbols[wrapPositionWithinCount(chosenSymbolIndex - 1, symbolCount)] ?? ''}
                  </span>
                  <span className="combination-dial-chosen-symbol" key={chosenSymbol} aria-hidden="true">
                    {chosenSymbol}
                  </span>
                  <span className="combination-dial-neighbour-symbol" aria-hidden="true">
                    {dial.symbols[wrapPositionWithinCount(chosenSymbolIndex + 1, symbolCount)] ?? ''}
                  </span>
                </div>
                <button
                  type="button"
                  className="combination-dial-step-button"
                  disabled={isInteractionDisabled}
                  aria-label={dialsCopy.turnDialDownButton(dial.visibleLabel)}
                  onClick={() => chooseSymbolIndex(dialIndex, chosenSymbolIndex + 1)}
                >
                  <CaretDown size={18} weight="bold" aria-hidden="true" />
                </button>
                <span className="combination-dial-label">{dial.visibleLabel}</span>
              </div>
            )
          })}
        </div>
      </div>
      <p className="interactive-piece-instructions" id={instructionsIdentifier}>
        {dialsCopy.keyboardInstructions}
      </p>
    </div>
  )
}

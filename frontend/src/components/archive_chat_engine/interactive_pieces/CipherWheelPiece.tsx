import { ArrowArcLeft, ArrowArcRight, ArrowDown } from '@phosphor-icons/react'
import { useId, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react'
import { randomNumberBetween } from '../../../animation/animation_variety'
import { useInteractionFeedback } from '../../../audio/interaction_feedback'
import { interactivePiecesCopy } from '../../../copy/archive_chat_engine/interactive_pieces_copy'
import { usePlayerSettings } from '../../../settings/player_settings'
import type { InteractivePieceWidgetProperties } from './interactive_piece_widget_properties'
import { caesarWheelLetters, decipherTextThroughWheel, readLetterReadThroughWheel, wrapPositionWithinCount } from './interactive_piece_working_values'

type WheelDragProgress = {
  lastPointerAngleDegrees: number
  accumulatedTurnDegrees: number
  turnStepsWhenDragStarted: number
  lastReportedShiftPositions: number
}

const wheelCopy = interactivePiecesCopy.cipherWheel

function readPointerAngleDegrees(pointerEvent: PointerEvent<HTMLElement>, wheelElement: HTMLElement): number {
  const wheelBounds = wheelElement.getBoundingClientRect()
  const horizontalDistance = pointerEvent.clientX - (wheelBounds.left + wheelBounds.width / 2)
  const verticalDistance = pointerEvent.clientY - (wheelBounds.top + wheelBounds.height / 2)
  return (Math.atan2(verticalDistance, horizontalDistance) * 180) / Math.PI
}

function readShortestAngleDifferenceDegrees(currentAngleDegrees: number, previousAngleDegrees: number): number {
  let angleDifference = currentAngleDegrees - previousAngleDegrees
  while (angleDifference > 180) {
    angleDifference -= 360
  }
  while (angleDifference < -180) {
    angleDifference += 360
  }
  return angleDifference
}

export default function CipherWheelPiece({
  publicState,
  workingValue,
  isInteractionDisabled,
  onWorkingValueChanged,
}: InteractivePieceWidgetProperties<'cipher_wheel'>) {
  const playInteractionFeedback = useInteractionFeedback()
  const { shouldReduceMotion } = usePlayerSettings()
  const wheelLetters = caesarWheelLetters(publicState.alphabetLetters)
  const letterCount = wheelLetters.length
  const stepAngleDegrees = letterCount > 0 ? 360 / letterCount : 0
  const shiftPositions = wrapPositionWithinCount(workingValue.shiftPositions, letterCount)
  const [visualTurnSteps, setVisualTurnSteps] = useState(shiftPositions)
  const [isWheelBeingDragged, setIsWheelBeingDragged] = useState(false)
  const wheelElementReference = useRef<HTMLDivElement | null>(null)
  const wheelDragProgress = useRef<WheelDragProgress | null>(null)
  const instructionsIdentifier = useId()
  const previewIdentifier = useId()

  const playRatchetSound = () => {
    playInteractionFeedback('typewriter_key', {
      playbackRateMultiplier: randomNumberBetween(0.72, 0.92),
      volumeMultiplier: 0.8,
    })
  }

  const reportShiftPositions = (nextShiftPositions: number) => {
    onWorkingValueChanged({ widgetKindName: 'cipher_wheel', shiftPositions: nextShiftPositions })
  }

  const turnWheelBySteps = (stepCount: number) => {
    if (isInteractionDisabled || letterCount === 0) {
      return
    }
    playRatchetSound()
    setVisualTurnSteps(Math.round(visualTurnSteps) + stepCount)
    reportShiftPositions(wrapPositionWithinCount(shiftPositions + stepCount, letterCount))
  }

  const returnWheelToStartingPosition = () => {
    if (isInteractionDisabled || shiftPositions === 0) {
      return
    }
    playRatchetSound()
    const stepsBackToStart = shiftPositions > letterCount / 2 ? letterCount - shiftPositions : -shiftPositions
    setVisualTurnSteps(Math.round(visualTurnSteps) + stepsBackToStart)
    reportShiftPositions(0)
  }

  const handleWheelKeyDown = (keyboardEvent: KeyboardEvent<HTMLDivElement>) => {
    const largeStepCount = 5
    const stepCountByKey: Record<string, number> = {
      ArrowRight: keyboardEvent.shiftKey ? largeStepCount : 1,
      ArrowUp: keyboardEvent.shiftKey ? largeStepCount : 1,
      ArrowLeft: keyboardEvent.shiftKey ? -largeStepCount : -1,
      ArrowDown: keyboardEvent.shiftKey ? -largeStepCount : -1,
      PageUp: largeStepCount,
      PageDown: -largeStepCount,
    }
    if (keyboardEvent.key === 'Home') {
      keyboardEvent.preventDefault()
      returnWheelToStartingPosition()
      return
    }
    const stepCount = stepCountByKey[keyboardEvent.key]
    if (stepCount === undefined) {
      return
    }
    keyboardEvent.preventDefault()
    turnWheelBySteps(stepCount)
  }

  const handleWheelPointerDown = (pointerEvent: PointerEvent<HTMLDivElement>) => {
    const wheelElement = wheelElementReference.current
    if (isInteractionDisabled || !wheelElement || letterCount === 0) {
      return
    }
    if (pointerEvent.pointerType === 'mouse' && pointerEvent.button !== 0) {
      return
    }
    pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId)
    wheelDragProgress.current = {
      lastPointerAngleDegrees: readPointerAngleDegrees(pointerEvent, wheelElement),
      accumulatedTurnDegrees: 0,
      turnStepsWhenDragStarted: Math.round(visualTurnSteps),
      lastReportedShiftPositions: shiftPositions,
    }
    setIsWheelBeingDragged(true)
  }

  const handleWheelPointerMove = (pointerEvent: PointerEvent<HTMLDivElement>) => {
    const wheelElement = wheelElementReference.current
    const dragProgress = wheelDragProgress.current
    if (!wheelElement || !dragProgress) {
      return
    }
    const pointerAngleDegrees = readPointerAngleDegrees(pointerEvent, wheelElement)
    dragProgress.accumulatedTurnDegrees += readShortestAngleDifferenceDegrees(
      pointerAngleDegrees,
      dragProgress.lastPointerAngleDegrees,
    )
    dragProgress.lastPointerAngleDegrees = pointerAngleDegrees
    const continuousTurnSteps = dragProgress.turnStepsWhenDragStarted + dragProgress.accumulatedTurnDegrees / stepAngleDegrees
    const wholeTurnSteps = Math.round(continuousTurnSteps)
    setVisualTurnSteps(shouldReduceMotion ? wholeTurnSteps : continuousTurnSteps)
    const draggedShiftPositions = wrapPositionWithinCount(wholeTurnSteps, letterCount)
    if (draggedShiftPositions !== dragProgress.lastReportedShiftPositions) {
      dragProgress.lastReportedShiftPositions = draggedShiftPositions
      playRatchetSound()
      reportShiftPositions(draggedShiftPositions)
    }
  }

  const finishWheelDrag = (pointerEvent: PointerEvent<HTMLDivElement>) => {
    if (!wheelDragProgress.current) {
      return
    }
    wheelDragProgress.current = null
    if (pointerEvent.currentTarget.hasPointerCapture(pointerEvent.pointerId)) {
      pointerEvent.currentTarget.releasePointerCapture(pointerEvent.pointerId)
    }
    setVisualTurnSteps(Math.round(visualTurnSteps))
    setIsWheelBeingDragged(false)
  }

  const referenceLetter = wheelLetters[0] ?? ''
  const letterReadAtReference = readLetterReadThroughWheel(publicState, 0, shiftPositions)
  const decipheredPreviewText = decipherTextThroughWheel(publicState, shiftPositions)
  const movingRingStyle = { '--wheel-turn-degrees': `${visualTurnSteps * stepAngleDegrees}deg` } as CSSProperties

  return (
    <div className="cipher-wheel-piece">
      <div className="cipher-wheel-stage">
        <div className="cipher-wheel" ref={wheelElementReference} data-is-disabled={isInteractionDisabled}>
          <span className="cipher-wheel-reference-notch" aria-hidden="true" />
          <div className="cipher-wheel-fixed-ring" aria-hidden="true">
            {wheelLetters.map((alphabetLetter, letterIndex) => (
              <span
                key={`${alphabetLetter}-${letterIndex}`}
                className="cipher-wheel-letter"
                style={{ '--letter-angle-degrees': `${letterIndex * stepAngleDegrees}deg` } as CSSProperties}
              >
                {alphabetLetter}
              </span>
            ))}
          </div>
          <div
            className="cipher-wheel-moving-ring"
            style={movingRingStyle}
            data-is-being-dragged={isWheelBeingDragged}
            role="slider"
            tabIndex={isInteractionDisabled ? -1 : 0}
            aria-label={wheelCopy.wheelLabel}
            aria-valuemin={0}
            aria-valuemax={Math.max(letterCount - 1, 0)}
            aria-valuenow={shiftPositions}
            aria-valuetext={`${wheelCopy.shiftValueText(shiftPositions, referenceLetter, letterReadAtReference)}. ${decipheredPreviewText}`}
            aria-disabled={isInteractionDisabled}
            aria-describedby={`${instructionsIdentifier} ${previewIdentifier}`}
            onKeyDown={handleWheelKeyDown}
            onPointerDown={handleWheelPointerDown}
            onPointerMove={handleWheelPointerMove}
            onPointerUp={finishWheelDrag}
            onPointerCancel={finishWheelDrag}
          >
            {wheelLetters.map((alphabetLetter, letterIndex) => (
              <span
                key={`${alphabetLetter}-${letterIndex}`}
                className="cipher-wheel-letter"
                style={{ '--letter-angle-degrees': `${letterIndex * stepAngleDegrees}deg` } as CSSProperties}
                aria-hidden="true"
              >
                {alphabetLetter}
              </span>
            ))}
            <span className="cipher-wheel-grip-mark" aria-hidden="true" />
          </div>
          <div className="cipher-wheel-hub" aria-hidden="true">
            <span>{referenceLetter}</span>
            <ArrowDown size={14} weight="bold" />
            <span>{letterReadAtReference}</span>
          </div>
        </div>
        <div className="cipher-wheel-turn-buttons">
          <button
            type="button"
            className="quiet-action-button"
            disabled={isInteractionDisabled}
            aria-label={wheelCopy.turnBackwardButton}
            onClick={() => turnWheelBySteps(-1)}
          >
            <ArrowArcLeft size={20} weight="bold" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="quiet-action-button"
            disabled={isInteractionDisabled}
            aria-label={wheelCopy.turnForwardButton}
            onClick={() => turnWheelBySteps(1)}
          >
            <ArrowArcRight size={20} weight="bold" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="cipher-wheel-reading">
        <p className="cipher-wheel-ring-caption">{wheelCopy.outerRingCaption}</p>
        <p className="cipher-wheel-ring-caption">{wheelCopy.innerRingCaption}</p>
        {publicState.wheelInscriptionText.length > 0 ? (
          <div className="cipher-wheel-inscription">
            <p className="dossier-label">{wheelCopy.inscriptionHeading}</p>
            <p>{publicState.wheelInscriptionText}</p>
          </div>
        ) : null}
        <div className="cipher-wheel-text-strip">
          <p className="dossier-label">{wheelCopy.cipheredTextHeading}</p>
          <p className="cipher-wheel-ciphered-text">{publicState.cipheredText}</p>
        </div>
        <div className="cipher-wheel-text-strip" data-is-preview="true">
          <p className="dossier-label">{wheelCopy.decipheredPreviewHeading}</p>
          <p className="cipher-wheel-deciphered-text" id={previewIdentifier}>
            {decipheredPreviewText}
          </p>
        </div>
        <p className="interactive-piece-instructions" id={instructionsIdentifier}>
          {wheelCopy.keyboardInstructions}
        </p>
      </div>
    </div>
  )
}

import { useCallback, useEffect, useRef } from 'react'
import { randomNumberBetween } from '../../../../animation/animation_variety'
import { requestAmbientSilence } from '../../../../audio/ambient_sound_ducking'
import { useInteractionFeedback } from '../../../../audio/interaction_feedback'
import { stagingCopy } from '../../../../copy/archive_chat_engine/staging_copy'
import type { ChronicleClosedByDeathOutcome } from '../../../../game_state/archive_turn_contract'
import { formatWorldClock } from '../../../../game_state/chronicle_state'
import { useTimedProgressShare, useTimedSequence } from '../use_timed_sequence'

export type PsychologicalDeathSequenceProperties = {
  archiveOutcome: ChronicleClosedByDeathOutcome
  inkVariantName: string
  worldClockMinutes: number
  placeName: string
  onSequenceCompleted: () => void
}

const psychologicalDeathStepDurationsMilliseconds = [700, 1000, 1400, 900, 1300, 1500, 1100] as const
const inkStainsStepIndex = 1
const intrusiveOptionsStepIndex = 2
const rewindingClockStepIndex = 3
const dissolvingStepIndex = 4
const typedClosureStepIndex = 5
const holdStepIndex = 6
const ambientSilenceDuringDeathMilliseconds = 11000
const epitaphRewriteMilliseconds = 700
const intrusiveOptionsMilliseconds = 1400
const rewindingClockMilliseconds = 900
const typedClosureMilliseconds = 1100
const intrusiveOptionCount = 4
const dissolvingBandCount = 8
const erraticKeySoundCount = 7
const minutesInOneDay = 1440
const rewoundMinutesWhenClockIsAtMidnight = 720

function scheduleErraticKeySounds(playKeySound: () => void): number[] {
  const timeoutIdentifiers: number[] = []
  let accumulatedDelayMilliseconds = 0
  for (let keyNumber = 0; keyNumber < erraticKeySoundCount; keyNumber += 1) {
    accumulatedDelayMilliseconds += randomNumberBetween(60, 300)
    if (accumulatedDelayMilliseconds > intrusiveOptionsMilliseconds) {
      break
    }
    timeoutIdentifiers.push(window.setTimeout(playKeySound, accumulatedDelayMilliseconds))
  }
  return timeoutIdentifiers
}

export function PsychologicalDeathSequence({
  archiveOutcome,
  inkVariantName,
  worldClockMinutes,
  placeName,
  onSequenceCompleted,
}: PsychologicalDeathSequenceProperties) {
  const playInteractionFeedback = useInteractionFeedback()
  const pendingSoundTimeoutIdentifiers = useRef<number[]>([])
  const hasFinalTollSounded = useRef(false)

  useEffect(() => {
    const scheduledTimeoutIdentifiers = pendingSoundTimeoutIdentifiers
    return () => {
      for (const timeoutIdentifier of scheduledTimeoutIdentifiers.current) {
        window.clearTimeout(timeoutIdentifier)
      }
    }
  }, [])

  const soundFinalTollOnce = useCallback(() => {
    if (hasFinalTollSounded.current) {
      return
    }
    hasFinalTollSounded.current = true
    playInteractionFeedback('final_toll', { playbackRateMultiplier: 1.3 })
  }, [playInteractionFeedback])

  const playStepSound = useCallback(
    (stepIndex: number, wasReachedBySkipping: boolean) => {
      if (wasReachedBySkipping) {
        for (const timeoutIdentifier of pendingSoundTimeoutIdentifiers.current) {
          window.clearTimeout(timeoutIdentifier)
        }
        soundFinalTollOnce()
        return
      }
      if (stepIndex === 0) {
        requestAmbientSilence(ambientSilenceDuringDeathMilliseconds)
        playInteractionFeedback('mind_fracture')
      }
      if (stepIndex === intrusiveOptionsStepIndex) {
        pendingSoundTimeoutIdentifiers.current.push(
          ...scheduleErraticKeySounds(() =>
            playInteractionFeedback('typewriter_key', { playbackRateMultiplier: randomNumberBetween(0.6, 1.5) }),
          ),
        )
      }
      if (stepIndex === dissolvingStepIndex) {
        playInteractionFeedback('high_pitch', { volumeMultiplier: 0.35 })
      }
      if (stepIndex === typedClosureStepIndex) {
        pendingSoundTimeoutIdentifiers.current.push(window.setTimeout(soundFinalTollOnce, typedClosureMilliseconds))
      }
    },
    [playInteractionFeedback, soundFinalTollOnce],
  )

  const { currentStepIndex, canSkipToFinalStep, skipToFinalStep } = useTimedSequence({
    stepDurationsMilliseconds: psychologicalDeathStepDurationsMilliseconds,
    earliestSkippableStepIndex: inkStainsStepIndex,
    onStepEntered: playStepSound,
    onSequenceCompleted,
  })

  const epitaphRewriteText = archiveOutcome.epitaphRewriteText ?? stagingCopy.fallbackEpitaphRewriteText
  const intrusiveOptionText = archiveOutcome.intrusiveOptionText ?? stagingCopy.fallbackIntrusiveOptionText
  const hasReachedFinalState = currentStepIndex >= holdStepIndex

  const epitaphProgressShare = useTimedProgressShare(true, epitaphRewriteMilliseconds)
  const clockProgressShare = useTimedProgressShare(currentStepIndex >= rewindingClockStepIndex, rewindingClockMilliseconds)
  const typedProgressShare = useTimedProgressShare(currentStepIndex >= typedClosureStepIndex, typedClosureMilliseconds)

  const visibleEpitaphCharacterCount =
    currentStepIndex > 0 ? epitaphRewriteText.length : Math.ceil(epitaphRewriteText.length * epitaphProgressShare)
  const minutesSinceMidnight = ((worldClockMinutes % minutesInOneDay) + minutesInOneDay) % minutesInOneDay
  const rewoundMinutes = minutesSinceMidnight > 0 ? minutesSinceMidnight : rewoundMinutesWhenClockIsAtMidnight
  const shownClockMinutes =
    currentStepIndex > rewindingClockStepIndex
      ? worldClockMinutes - rewoundMinutes
      : worldClockMinutes - Math.round(rewoundMinutes * clockProgressShare)
  const isClosureTextSealed = hasReachedFinalState || typedProgressShare >= 1
  const typedClosureCharacterCount = Math.ceil(stagingCopy.chronicleClosedTypedText.length * typedProgressShare)

  return (
    <div
      className="psychological-death-sequence"
      data-death-step={currentStepIndex}
      data-ink-variant={inkVariantName}
      onClick={canSkipToFinalStep ? skipToFinalStep : undefined}
    >
      <div className="psychological-death-tint-frame" aria-hidden="true" />
      {!hasReachedFinalState && currentStepIndex < dissolvingStepIndex ? (
        <p className="psychological-death-epitaph narrative-prose" aria-hidden="true">
          <span className="psychological-death-epitaph-visible">{epitaphRewriteText.slice(0, visibleEpitaphCharacterCount)}</span>
          <span className="psychological-death-epitaph-pending">{epitaphRewriteText.slice(visibleEpitaphCharacterCount)}</span>
        </p>
      ) : null}
      {currentStepIndex >= inkStainsStepIndex && !hasReachedFinalState ? (
        <div className="psychological-death-ink-stains" aria-hidden="true">
          <span className="psychological-death-ink-stain psychological-death-ink-stain-first" />
          <span className="psychological-death-ink-stain psychological-death-ink-stain-second" />
        </div>
      ) : null}
      {currentStepIndex >= intrusiveOptionsStepIndex && currentStepIndex < dissolvingStepIndex ? (
        <div className="psychological-death-intrusive-options" aria-hidden="true">
          {Array.from({ length: intrusiveOptionCount }, (_, optionIndex) => (
            <div
              key={optionIndex}
              className="psychological-death-intrusive-option"
              style={{ animationDelay: `${optionIndex * 180}ms` }}
            >
              <span className="psychological-death-intrusive-option-number">{optionIndex + 1}</span>
              <span>{intrusiveOptionText}</span>
            </div>
          ))}
        </div>
      ) : null}
      {currentStepIndex >= rewindingClockStepIndex && currentStepIndex < typedClosureStepIndex ? (
        <dl className="psychological-death-false-status" aria-hidden="true">
          <div>
            <dt>{stagingCopy.falseClockLabel}</dt>
            <dd>{formatWorldClock(shownClockMinutes)}</dd>
          </div>
          <div>
            <dt>{stagingCopy.falsePlaceLabel}</dt>
            <dd>{clockProgressShare >= 0.5 || currentStepIndex > rewindingClockStepIndex ? stagingCopy.erasedPlaceText : placeName}</dd>
          </div>
        </dl>
      ) : null}
      {currentStepIndex >= dissolvingStepIndex ? (
        <div className="psychological-death-dissolving-bands" aria-hidden="true">
          {Array.from({ length: dissolvingBandCount }, (_, bandIndex) => (
            <span
              key={bandIndex}
              className="psychological-death-dissolving-band"
              style={{ animationDelay: `${hasReachedFinalState ? 0 : bandIndex * 150}ms` }}
            />
          ))}
        </div>
      ) : null}
      {currentStepIndex >= typedClosureStepIndex ? (
        <div className="psychological-death-closure-plate" data-sealed={isClosureTextSealed}>
          {isClosureTextSealed ? (
            <p className="psychological-death-closure-sealed display-title">{stagingCopy.chronicleClosedStampText}</p>
          ) : (
            <p className="psychological-death-closure-typed" aria-hidden="true">
              {stagingCopy.chronicleClosedTypedText.slice(0, typedClosureCharacterCount)}
              <span className="psychological-death-closure-caret" />
            </p>
          )}
          {isClosureTextSealed ? (
            <>
              <p className="psychological-death-cause-label">{stagingCopy.deathCauseLabel}</p>
              <p className="psychological-death-cause-text">{archiveOutcome.perceptibleCauseText}</p>
            </>
          ) : null}
        </div>
      ) : null}
      {canSkipToFinalStep ? (
        <button
          type="button"
          className="quiet-action-button death-sequence-skip-button"
          onClick={(clickEvent) => {
            clickEvent.stopPropagation()
            skipToFinalStep()
          }}
        >
          {stagingCopy.completeDeathSequenceButton}
        </button>
      ) : null}
    </div>
  )
}

export default PsychologicalDeathSequence

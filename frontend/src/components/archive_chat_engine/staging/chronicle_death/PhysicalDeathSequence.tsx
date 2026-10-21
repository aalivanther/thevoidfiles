import { useCallback, useEffect, useRef } from 'react'
import { requestAmbientSilence } from '../../../../audio/ambient_sound_ducking'
import { useInteractionFeedback } from '../../../../audio/interaction_feedback'
import { stagingCopy } from '../../../../copy/archive_chat_engine/staging_copy'
import type { ChronicleClosedByDeathOutcome } from '../../../../game_state/archive_turn_contract'
import { useTimedSequence } from '../use_timed_sequence'

export type PhysicalDeathSequenceProperties = {
  archiveOutcome: ChronicleClosedByDeathOutcome
  crackVariantName: string
  onSequenceCompleted: () => void
}

const physicalDeathStepDurationsMilliseconds = [400, 1200, 600, 600, 900, 500, 1000] as const
const silenceStepIndex = 1
const cracksStepIndex = 2
const woundMarksStepIndex = 3
const risingSheetStepIndex = 4
const stampStepIndex = 5
const holdStepIndex = 6
const ambientSilenceDuringDeathMilliseconds = 9000
const secondHeartbeatDelayMilliseconds = 640
const millisecondsBetweenWoundStamps = 120
const woundStampSoundCount = 3
const seriousWoundMarkCount = 5

const crackPolylinePointsByVariantName: Record<string, string[]> = {
  cracks_from_left_margin: [
    '0,22 9,25 14,19 27,28 33,24 52,33',
    '0,48 12,46 19,54 31,50 38,58 61,55 70,63',
    '0,71 8,75 17,70 24,79 41,77',
  ],
  cracks_from_right_margin: [
    '100,18 90,23 84,17 72,27 66,22 49,30',
    '100,44 89,47 80,41 70,52 60,48 41,57 30,53',
    '100,76 91,72 83,80 74,75 58,82',
  ],
  cracks_from_upper_edge: [
    '24,0 27,11 21,17 30,29 26,36 35,52',
    '52,0 49,13 57,20 51,33 60,41 55,58 63,70',
    '78,0 74,9 81,18 75,26 79,43',
  ],
}

export function PhysicalDeathSequence({ archiveOutcome, crackVariantName, onSequenceCompleted }: PhysicalDeathSequenceProperties) {
  const playInteractionFeedback = useInteractionFeedback()
  const pendingSoundTimeoutIdentifiers = useRef<number[]>([])
  const hasFinalTollSounded = useRef(false)

  useEffect(() => {
    const scheduledTimeoutIdentifiers = pendingSoundTimeoutIdentifiers.current
    return () => {
      for (const timeoutIdentifier of scheduledTimeoutIdentifiers) {
        window.clearTimeout(timeoutIdentifier)
      }
    }
  }, [])

  const soundFinalTollOnce = useCallback(() => {
    if (hasFinalTollSounded.current) {
      return
    }
    hasFinalTollSounded.current = true
    playInteractionFeedback('final_toll')
  }, [playInteractionFeedback])

  const playStepSound = useCallback(
    (stepIndex: number, wasReachedBySkipping: boolean) => {
      if (wasReachedBySkipping) {
        soundFinalTollOnce()
        return
      }
      if (stepIndex === 0) {
        requestAmbientSilence(ambientSilenceDuringDeathMilliseconds)
        playInteractionFeedback('heavy_impact')
      }
      if (stepIndex === silenceStepIndex) {
        playInteractionFeedback('heartbeat', { volumeMultiplier: 0.9 })
        pendingSoundTimeoutIdentifiers.current.push(
          window.setTimeout(
            () => playInteractionFeedback('heartbeat', { volumeMultiplier: 0.5, playbackRateMultiplier: 0.8 }),
            secondHeartbeatDelayMilliseconds,
          ),
        )
      }
      if (stepIndex === cracksStepIndex) {
        playInteractionFeedback('screen_tear')
      }
      if (stepIndex === woundMarksStepIndex) {
        for (let stampNumber = 0; stampNumber < woundStampSoundCount; stampNumber += 1) {
          pendingSoundTimeoutIdentifiers.current.push(
            window.setTimeout(
              () => playInteractionFeedback('stamp_impact', { volumeMultiplier: 1 - stampNumber * 0.3 }),
              stampNumber * millisecondsBetweenWoundStamps,
            ),
          )
        }
      }
      if (stepIndex === risingSheetStepIndex) {
        playInteractionFeedback('falling_whoosh', { playbackRateMultiplier: 0.6 })
      }
      if (stepIndex === stampStepIndex) {
        soundFinalTollOnce()
      }
    },
    [playInteractionFeedback, soundFinalTollOnce],
  )

  const { currentStepIndex, canSkipToFinalStep, skipToFinalStep } = useTimedSequence({
    stepDurationsMilliseconds: physicalDeathStepDurationsMilliseconds,
    earliestSkippableStepIndex: silenceStepIndex,
    onStepEntered: playStepSound,
    onSequenceCompleted,
  })

  const crackPolylinePoints =
    crackPolylinePointsByVariantName[crackVariantName] ?? crackPolylinePointsByVariantName.cracks_from_left_margin
  const isSlashedByCriticalFailure = archiveOutcome.deathCauseName === 'critical_failure'
  const hasReachedFinalState = currentStepIndex >= holdStepIndex

  return (
    <div
      className="physical-death-sequence"
      data-death-step={currentStepIndex}
      data-crack-variant={crackVariantName}
      onClick={canSkipToFinalStep ? skipToFinalStep : undefined}
    >
      <div className="physical-death-impact-frame" aria-hidden="true" />
      {currentStepIndex >= silenceStepIndex ? <div className="physical-death-retiring-band" aria-hidden="true" /> : null}
      {currentStepIndex >= cracksStepIndex && !hasReachedFinalState ? (
        <svg className="physical-death-cracks" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {crackPolylinePoints.map((polylinePoints, crackIndex) => (
            <g key={polylinePoints} style={{ animationDelay: `${crackIndex * 140}ms` }} className="physical-death-crack">
              <polyline className="physical-death-crack-shadow" points={polylinePoints} />
              <polyline className="physical-death-crack-line" points={polylinePoints} />
            </g>
          ))}
        </svg>
      ) : null}
      {currentStepIndex >= risingSheetStepIndex ? <div className="physical-death-rising-sheet" aria-hidden="true" /> : null}
      {currentStepIndex >= woundMarksStepIndex ? (
        <div
          className="physical-death-wound-marks"
          data-slashed={isSlashedByCriticalFailure}
          role="img"
          aria-label={stagingCopy.seriousWoundMarksLabel}
        >
          {Array.from({ length: seriousWoundMarkCount }, (_, woundMarkIndex) => (
            <span
              key={woundMarkIndex}
              className="physical-death-wound-mark"
              style={{ animationDelay: `${isSlashedByCriticalFailure ? 0 : woundMarkIndex * millisecondsBetweenWoundStamps}ms` }}
            />
          ))}
          {isSlashedByCriticalFailure ? <span className="physical-death-wound-slash" /> : null}
        </div>
      ) : null}
      {currentStepIndex >= stampStepIndex ? (
        <div className="physical-death-stamp-plate">
          <p className="physical-death-stamp-title display-title">{stagingCopy.chronicleClosedStampText}</p>
          <p className="physical-death-cause-label">{stagingCopy.deathCauseLabel}</p>
          <p className="physical-death-cause-text">{archiveOutcome.perceptibleCauseText}</p>
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

export default PhysicalDeathSequence

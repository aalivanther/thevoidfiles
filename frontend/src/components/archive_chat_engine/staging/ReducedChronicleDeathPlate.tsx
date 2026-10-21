import { useEffect, useRef } from 'react'
import { requestAmbientSilence } from '../../../audio/ambient_sound_ducking'
import { useInteractionFeedback } from '../../../audio/interaction_feedback'
import { stagingCopy } from '../../../copy/archive_chat_engine/staging_copy'
import type { ChronicleClosedByDeathOutcome } from '../../../game_state/archive_turn_contract'

export type ReducedChronicleDeathPlateProperties = {
  archiveOutcome: ChronicleClosedByDeathOutcome
  onSequenceCompleted: () => void
}

const reducedPlateSilenceMilliseconds = 800
const reducedPlateHoldMilliseconds = 3200

export function ReducedChronicleDeathPlate({ archiveOutcome, onSequenceCompleted }: ReducedChronicleDeathPlateProperties) {
  const playInteractionFeedback = useInteractionFeedback()
  const sequenceCompletedCallback = useRef(onSequenceCompleted)
  const hasOpeningSoundPlayed = useRef(false)
  const isPsychologicalDeath = archiveOutcome.deathNatureName === 'psychological'

  useEffect(() => {
    sequenceCompletedCallback.current = onSequenceCompleted
  }, [onSequenceCompleted])

  useEffect(() => {
    if (!hasOpeningSoundPlayed.current) {
      hasOpeningSoundPlayed.current = true
      requestAmbientSilence(reducedPlateSilenceMilliseconds + reducedPlateHoldMilliseconds)
      playInteractionFeedback(isPsychologicalDeath ? 'mind_fracture' : 'heavy_impact')
    }
    const tollTimeoutIdentifier = window.setTimeout(
      () => playInteractionFeedback('final_toll', { playbackRateMultiplier: isPsychologicalDeath ? 1.3 : 1 }),
      reducedPlateSilenceMilliseconds,
    )
    const holdTimeoutIdentifier = window.setTimeout(
      () => sequenceCompletedCallback.current(),
      reducedPlateSilenceMilliseconds + reducedPlateHoldMilliseconds,
    )
    return () => {
      window.clearTimeout(tollTimeoutIdentifier)
      window.clearTimeout(holdTimeoutIdentifier)
    }
  }, [playInteractionFeedback, isPsychologicalDeath])

  return (
    <div className="reduced-death-plate-stage" data-death-nature={archiveOutcome.deathNatureName}>
      <div className="reduced-death-plate">
        <p className="reduced-death-plate-title display-title">{stagingCopy.chronicleClosedStampText}</p>
        <p className="reduced-death-plate-cause-label">{stagingCopy.deathCauseLabel}</p>
        <p className="reduced-death-plate-cause-text">{archiveOutcome.perceptibleCauseText}</p>
        <button
          type="button"
          className="primary-action-button reduced-death-plate-button"
          onClick={() => {
            playInteractionFeedback('confirmation')
            onSequenceCompleted()
          }}
        >
          {stagingCopy.witnessClosureButton}
        </button>
      </div>
    </div>
  )
}

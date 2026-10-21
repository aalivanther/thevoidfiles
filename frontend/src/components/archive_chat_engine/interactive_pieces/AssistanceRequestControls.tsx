import { Lifebuoy } from '@phosphor-icons/react'
import { useEffect, useId, useRef, useState } from 'react'
import { useInteractionFeedback } from '../../../audio/interaction_feedback'
import { interactivePiecesCopy } from '../../../copy/archive_chat_engine/interactive_pieces_copy'
import type { AssistanceLevelName, InteractivePieceAssistanceRecord } from '../../../game_state/archive_turn_contract'

const assistanceLevelNamesInOrder: AssistanceLevelName[] = ['gentle', 'medium', 'direct']
const assistanceResponseSafetyTimeoutMilliseconds = 9000

export type AssistanceRequestControlsProperties = {
  assistanceGiven: InteractivePieceAssistanceRecord[]
  isRequestingAllowed: boolean
  onAssistanceRequested: (levelName: AssistanceLevelName) => void
}

export function AssistanceRequestControls({
  assistanceGiven,
  isRequestingAllowed,
  onAssistanceRequested,
}: AssistanceRequestControlsProperties) {
  const playInteractionFeedback = useInteractionFeedback()
  const [isDisclosureOpen, setIsDisclosureOpen] = useState(false)
  const [isDirectScopeConfirmationOpen, setIsDirectScopeConfirmationOpen] = useState(false)
  const [assistanceCountWhenRequested, setAssistanceCountWhenRequested] = useState<number | null>(null)
  const safetyTimeoutIdentifier = useRef<number | null>(null)
  const disclosureRegionIdentifier = useId()
  const isAssistancePending = assistanceCountWhenRequested !== null && assistanceGiven.length <= assistanceCountWhenRequested

  useEffect(
    () => () => {
      if (safetyTimeoutIdentifier.current !== null) {
        window.clearTimeout(safetyTimeoutIdentifier.current)
      }
    },
    [],
  )

  const requestAssistance = (levelName: AssistanceLevelName) => {
    playInteractionFeedback('confirmation')
    setIsDirectScopeConfirmationOpen(false)
    setAssistanceCountWhenRequested(assistanceGiven.length)
    if (safetyTimeoutIdentifier.current !== null) {
      window.clearTimeout(safetyTimeoutIdentifier.current)
    }
    safetyTimeoutIdentifier.current = window.setTimeout(() => {
      safetyTimeoutIdentifier.current = null
      setAssistanceCountWhenRequested(null)
    }, assistanceResponseSafetyTimeoutMilliseconds)
    onAssistanceRequested(levelName)
  }

  const hasAssistanceBeenGiven = (levelName: AssistanceLevelName) =>
    assistanceGiven.some((assistanceRecord) => assistanceRecord.levelName === levelName)

  return (
    <section className="assistance-controls">
      {assistanceGiven.length > 0 ? (
        <div className="assistance-given">
          <h4 className="dossier-label">{interactivePiecesCopy.assistanceGivenHeading}</h4>
          <ul className="assistance-given-list" aria-live="polite">
            {assistanceGiven.map((assistanceRecord, assistanceIndex) => (
              <li key={`${assistanceRecord.levelName}-${assistanceIndex}`} className="assistance-given-note">
                <span className="assistance-given-level">
                  {interactivePiecesCopy.assistanceLevelLabels[assistanceRecord.levelName]}
                </span>
                <span>{assistanceRecord.publicHintText}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {isRequestingAllowed ? (
        <>
          <button
            type="button"
            className="quiet-action-button"
            aria-expanded={isDisclosureOpen}
            aria-controls={disclosureRegionIdentifier}
            onClick={() => {
              playInteractionFeedback(isDisclosureOpen ? 'panel_close' : 'panel_open')
              setIsDisclosureOpen(!isDisclosureOpen)
              setIsDirectScopeConfirmationOpen(false)
            }}
          >
            <Lifebuoy size={16} weight="bold" aria-hidden="true" />
            {isDisclosureOpen
              ? interactivePiecesCopy.assistanceDisclosureHideButton
              : interactivePiecesCopy.assistanceDisclosureButton}
          </button>
          <div id={disclosureRegionIdentifier} hidden={!isDisclosureOpen} className="assistance-disclosure">
            <p className="assistance-explanation">{interactivePiecesCopy.assistanceExplanation}</p>
            <ul className="assistance-level-list">
              {assistanceLevelNamesInOrder.map((levelName) => {
                const wasAlreadyGiven = hasAssistanceBeenGiven(levelName)
                return (
                  <li key={levelName}>
                    <button
                      type="button"
                      className="assistance-level-button"
                      disabled={wasAlreadyGiven || isAssistancePending}
                      onClick={() => {
                        if (levelName === 'direct') {
                          playInteractionFeedback('option_click')
                          setIsDirectScopeConfirmationOpen(true)
                          return
                        }
                        requestAssistance(levelName)
                      }}
                    >
                      <span className="assistance-level-name">{interactivePiecesCopy.assistanceLevelLabels[levelName]}</span>
                      <span className="assistance-level-description">
                        {wasAlreadyGiven
                          ? interactivePiecesCopy.assistanceAlreadyGivenLabel
                          : interactivePiecesCopy.assistanceLevelDescriptions[levelName]}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
            {isDirectScopeConfirmationOpen ? (
              <div className="interactive-piece-inline-confirmation" role="group">
                <p>{interactivePiecesCopy.assistanceDirectScopeQuestion}</p>
                <div className="interactive-piece-inline-confirmation-buttons">
                  <button type="button" className="quiet-action-button" data-is-emphasized="true" onClick={() => requestAssistance('direct')}>
                    {interactivePiecesCopy.assistanceDirectConfirmButton}
                  </button>
                  <button
                    type="button"
                    className="quiet-action-button"
                    onClick={() => {
                      playInteractionFeedback('panel_close')
                      setIsDirectScopeConfirmationOpen(false)
                    }}
                  >
                    {interactivePiecesCopy.assistanceDirectCancelButton}
                  </button>
                </div>
              </div>
            ) : null}
            {isAssistancePending ? (
              <p className="interactive-piece-pending-notice" role="status">
                {interactivePiecesCopy.assistancePendingNotice}
              </p>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  )
}

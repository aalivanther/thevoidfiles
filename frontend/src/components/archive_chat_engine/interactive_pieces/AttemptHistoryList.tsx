import { CheckCircle, XCircle } from '@phosphor-icons/react'
import { interactivePiecesCopy } from '../../../copy/archive_chat_engine/interactive_pieces_copy'
import type {
  InteractivePieceAttemptRecord,
  InteractivePiecePublicState,
} from '../../../game_state/archive_turn_contract'
import { describeSubmittedValue } from './interactive_piece_working_values'

export type AttemptHistoryListProperties = {
  publicState: InteractivePiecePublicState
  attempts: InteractivePieceAttemptRecord[]
  freshAttemptIdentifier: string | null
  freshAttemptVariantName: string
}

export function AttemptHistoryList({
  publicState,
  attempts,
  freshAttemptIdentifier,
  freshAttemptVariantName,
}: AttemptHistoryListProperties) {
  return (
    <section className="attempt-history">
      <h4 className="dossier-label">{interactivePiecesCopy.attemptHistoryHeading}</h4>
      {attempts.length === 0 ? (
        <p className="attempt-history-empty-notice">{interactivePiecesCopy.attemptHistoryEmptyNotice}</p>
      ) : (
        <ol className="attempt-history-list">
          {attempts.map((attemptRecord, attemptIndex) => (
            <li
              key={attemptRecord.attemptIdentifier}
              className="attempt-history-entry"
              data-was-accepted={attemptRecord.wasAccepted}
              data-fresh-attempt-variant={
                attemptRecord.attemptIdentifier === freshAttemptIdentifier ? freshAttemptVariantName : undefined
              }
            >
              <p className="attempt-history-entry-heading">
                <span>{interactivePiecesCopy.attemptOrdinalLabel(attemptIndex + 1)}</span>
                <span className="attempt-history-entry-verdict">
                  {attemptRecord.wasAccepted ? (
                    <CheckCircle size={16} weight="fill" aria-hidden="true" />
                  ) : (
                    <XCircle size={16} weight="fill" aria-hidden="true" />
                  )}
                  {attemptRecord.wasAccepted
                    ? interactivePiecesCopy.attemptAcceptedLabel
                    : interactivePiecesCopy.attemptRejectedLabel}
                </span>
              </p>
              <p className="attempt-history-entry-value">{describeSubmittedValue(publicState, attemptRecord.submittedValue)}</p>
              {attemptRecord.wasAccepted ? null : attemptRecord.violatedVisibleRuleTexts.length > 0 ? (
                <div className="attempt-history-entry-rules">
                  <p>{interactivePiecesCopy.attemptViolatedRulesHeading}</p>
                  <ul>
                    {attemptRecord.violatedVisibleRuleTexts.map((violatedVisibleRuleText) => (
                      <li key={violatedVisibleRuleText}>{violatedVisibleRuleText}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="attempt-history-entry-rules">{interactivePiecesCopy.attemptNoVisibleRuleViolatedNotice}</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

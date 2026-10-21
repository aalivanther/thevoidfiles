import { ArrowLineDown } from '@phosphor-icons/react'
import { useInteractionFeedback } from '../../../audio/interaction_feedback'
import { readingLogCopy } from '../../../copy/archive_chat_engine/reading_log_copy'

export type ReturnToPresentButtonProperties = {
  newEntryCountBelow: number
  onReturnToPresentRequested: () => void
}

export function ReturnToPresentButton({ newEntryCountBelow, onReturnToPresentRequested }: ReturnToPresentButtonProperties) {
  const playInteractionFeedback = useInteractionFeedback()
  return (
    <button
      type="button"
      className="reading-log-return-to-present"
      data-has-new-entries={newEntryCountBelow > 0}
      onClick={() => {
        playInteractionFeedback('falling_whoosh', { volumeMultiplier: 0.5 })
        onReturnToPresentRequested()
      }}
    >
      <ArrowLineDown size={18} weight="bold" aria-hidden="true" />
      <span className="reading-log-return-to-present-text">
        <span className="reading-log-return-to-present-title">{readingLogCopy.returnToPresent.buttonText}</span>
        <span className="reading-log-return-to-present-detail">
          {newEntryCountBelow > 0
            ? readingLogCopy.returnToPresent.newEntriesBelow(newEntryCountBelow)
            : readingLogCopy.returnToPresent.nothingNewBelow}
        </span>
      </span>
    </button>
  )
}

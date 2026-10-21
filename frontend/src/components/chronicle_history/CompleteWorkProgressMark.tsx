import { LockKey, PenNib } from '@phosphor-icons/react'
import type { CSSProperties } from 'react'
import { chronicleHistoryCopy } from '../../copy/chronicle_history_copy'
import { completeWorkArchiveCount } from '../../demonstration/chronicle_history_data'

type CompleteWorkProgressMarkProperties = {
  writtenChapterCount: number
  hasChapterInProgress: boolean
  onCompleteWorkRequested: () => void
  onEntryHovered: () => void
}

export function CompleteWorkProgressMark({
  writtenChapterCount,
  hasChapterInProgress,
  onCompleteWorkRequested,
  onEntryHovered,
}: CompleteWorkProgressMarkProperties) {
  const progressMarkCopy = chronicleHistoryCopy.progressMark
  return (
    <aside className="history-progress-mark entrance-from-below" aria-labelledby="history-progress-heading">
      <p id="history-progress-heading" className="dossier-label">
        {progressMarkCopy.heading}
      </p>
      <p className="history-progress-summary">
        {progressMarkCopy.progressSummary(writtenChapterCount, completeWorkArchiveCount)}
      </p>
      <div
        className="history-progress-tally"
        role="img"
        aria-label={progressMarkCopy.tallyDescription(writtenChapterCount, completeWorkArchiveCount)}
      >
        {Array.from({ length: completeWorkArchiveCount }, (_unusedValue, tallyIndex) => {
          const tallyStateName =
            tallyIndex < writtenChapterCount
              ? 'written'
              : tallyIndex === writtenChapterCount && hasChapterInProgress
                ? 'in_progress'
                : 'blank'
          return (
            <span
              key={tallyIndex}
              className="history-progress-tally-stroke"
              data-tally-state={tallyStateName}
              data-closes-group={(tallyIndex + 1) % 5 === 0}
              style={{ '--tally-order': tallyIndex } as CSSProperties}
            />
          )
        })}
        <span className="history-progress-tally-seal">
          <LockKey size={16} weight="fill" aria-hidden="true" />
        </span>
      </div>
      {hasChapterInProgress ? (
        <p className="history-progress-note">
          <PenNib size={16} weight="fill" aria-hidden="true" />
          {progressMarkCopy.inProgressNote}
        </p>
      ) : null}
      <button
        type="button"
        className="quiet-action-button history-progress-button"
        onClick={onCompleteWorkRequested}
        onPointerEnter={(pointerEvent) => {
          if (pointerEvent.pointerType === 'mouse') {
            onEntryHovered()
          }
        }}
      >
        <LockKey size={18} weight="fill" aria-hidden="true" />
        {progressMarkCopy.goToCompleteWorkButton}
      </button>
    </aside>
  )
}

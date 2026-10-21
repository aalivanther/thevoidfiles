import { BookmarkSimple, Play, X } from '@phosphor-icons/react'
import type { CSSProperties } from 'react'
import { useInteractionFeedback } from '../../audio/interaction_feedback'
import { investigatorProfileCopy } from '../../copy/investigator_profile_copy'
import type { InvestigatorProfileLedger } from '../../demonstration/investigator_profile_data'
import type { ContinuationSelection } from './investigator_profile_record'
import { formatSavedMoment } from './profile_moment_formatting'

type ContinuationSelectionPanelProperties = {
  continuationSelection: ContinuationSelection | null
  investigatorProfileLedger: InvestigatorProfileLedger
  stampRotationDegrees: number
  onActiveChronicleResumed: () => void
  onSelectionCleared: () => void
}

export function ContinuationSelectionPanel({
  continuationSelection,
  investigatorProfileLedger,
  stampRotationDegrees,
  onActiveChronicleResumed,
  onSelectionCleared,
}: ContinuationSelectionPanelProperties) {
  const continuationCopy = investigatorProfileCopy.continuation
  const playInteractionFeedback = useInteractionFeedback()
  const selectedThread = continuationSelection
    ? investigatorProfileLedger.chronicleThreads.find(
        (chronicleThread) => chronicleThread.threadIdentifier === continuationSelection.threadIdentifier,
      )
    : undefined

  if (!continuationSelection || !selectedThread) {
    return (
      <section className="profile-continuation-panel mt-6" data-has-selection="false" aria-label={continuationCopy.regionLabel}>
        <BookmarkSimple size={22} weight="fill" aria-hidden="true" className="shrink-0" />
        <div className="min-w-0">
          <p className="dossier-label">{continuationCopy.emptyLabel}</p>
          <p className="mt-1 text-sm [overflow-wrap:anywhere]">{continuationCopy.emptyExplanation}</p>
        </div>
      </section>
    )
  }

  const selectedSave = investigatorProfileLedger.investigators
    .flatMap((profileInvestigator) => profileInvestigator.savedChronicles)
    .find((savedChronicle) => savedChronicle.saveIdentifier === continuationSelection.saveIdentifier)

  return (
    <section className="profile-continuation-panel mt-6" data-has-selection="true" aria-label={continuationCopy.regionLabel}>
      <span
        key={`${continuationSelection.threadIdentifier}-${continuationSelection.saveIdentifier ?? 'latest'}-${stampRotationDegrees}`}
        className="profile-continuation-stamp display-title"
        style={{ '--stamp-rotation': `${stampRotationDegrees}deg` } as CSSProperties}
        aria-hidden="true"
      >
        {continuationCopy.stampText}
      </span>
      <div className="min-w-0 flex-1">
        <p className="profile-continuation-caption">{continuationCopy.selectedThreadLabel}</p>
        <p className="display-title text-2xl [overflow-wrap:anywhere]">{selectedThread.threadTitle}</p>
        <p className="profile-continuation-caption mt-2">{continuationCopy.selectedSaveLabel}</p>
        <p className="[overflow-wrap:anywhere]">
          {selectedSave
            ? `${investigatorProfileCopy.investigators.savedChronicleKindLabels[selectedSave.saveKindName]} · ${selectedSave.placeName} · ${formatSavedMoment(selectedSave.savedAtTimestamp)}`
            : continuationCopy.latestSaveFallback}
        </p>
        <p className="mt-2 text-sm [overflow-wrap:anywhere]">
          {selectedThread.isCurrentThread ? continuationCopy.currentChronicleExplanation : continuationCopy.demonstrationExplanation}
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          {selectedThread.isCurrentThread ? (
            <button
              type="button"
              className="primary-action-button"
              onClick={() => {
                playInteractionFeedback('confirmation')
                onActiveChronicleResumed()
              }}
            >
              <Play size={18} weight="fill" aria-hidden="true" />
              {continuationCopy.resumeButton}
            </button>
          ) : null}
          <button type="button" className="profile-paper-button" onClick={onSelectionCleared}>
            <X size={16} weight="bold" aria-hidden="true" />
            {continuationCopy.clearButton}
          </button>
        </div>
      </div>
    </section>
  )
}

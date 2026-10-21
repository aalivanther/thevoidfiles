import { LockKey, SealCheck, Skull, UserFocus } from '@phosphor-icons/react'
import type { CSSProperties } from 'react'
import { useInteractionFeedback } from '../../audio/interaction_feedback'
import { investigatorProfileCopy } from '../../copy/investigator_profile_copy'
import type { InvestigatorProfileLedger, ProfileChronicleThread } from '../../demonstration/investigator_profile_data'
import type { ContinuationSelection } from './investigator_profile_record'
import { formatSavedMoment } from './profile_moment_formatting'

type ChronicleThreadsSectionProperties = {
  investigatorProfileLedger: InvestigatorProfileLedger
  continuationSelection: ContinuationSelection | null
  onContinuationSelected: (newSelection: ContinuationSelection) => void
}

export function ChronicleThreadsSection({
  investigatorProfileLedger,
  continuationSelection,
  onContinuationSelected,
}: ChronicleThreadsSectionProperties) {
  const threadsCopy = investigatorProfileCopy.chronicleThreads
  const playInteractionFeedback = useInteractionFeedback()
  const threadsInProgress = investigatorProfileLedger.chronicleThreads.filter(
    (chronicleThread) => chronicleThread.threadStateName === 'in_progress',
  )
  const closedThreads = investigatorProfileLedger.chronicleThreads.filter(
    (chronicleThread) => chronicleThread.threadStateName === 'closed',
  )

  const renderThreadCard = (chronicleThread: ProfileChronicleThread, threadIndex: number) => {
    const isClosedThread = chronicleThread.threadStateName === 'closed'
    const isChosenThread = continuationSelection?.threadIdentifier === chronicleThread.threadIdentifier
    const threadInvestigators = investigatorProfileLedger.investigators.filter((profileInvestigator) =>
      chronicleThread.investigatorIdentifiers.includes(profileInvestigator.investigatorIdentifier),
    )
    const countEntries: Array<{ label: string; count: number }> = [
      { label: threadsCopy.investigatorCountLabel, count: threadInvestigators.length },
      { label: threadsCopy.resolvedArchivesLabel, count: chronicleThread.resolvedArchiveCount },
      { label: threadsCopy.investigatedWhispersLabel, count: chronicleThread.investigatedWhisperCount },
    ]
    const synopsisText = isClosedThread
      ? threadsCopy.closedThreadSynopsis
      : (chronicleThread.synopsis ?? threadsCopy.currentThreadSynopsis)
    return (
      <li
        key={chronicleThread.threadIdentifier}
        className="comic-panel profile-thread-card entrance-from-below min-w-0 p-5"
        data-thread-state={chronicleThread.threadStateName}
        data-chosen-thread={isChosenThread}
        style={{ '--entrance-order': threadIndex } as CSSProperties}
      >
        <span className="profile-thread-string" aria-hidden="true" />
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="profile-thread-state-label">
              {isClosedThread ? <LockKey size={14} weight="fill" aria-hidden="true" /> : null}
              {threadsCopy.chronicleThreadStateLabels[chronicleThread.threadStateName]}
            </p>
            <h3 className="display-title text-2xl [overflow-wrap:anywhere]">{chronicleThread.threadTitle}</h3>
          </div>
          {chronicleThread.isCurrentThread ? <span className="cost-tag">{threadsCopy.currentThreadTag}</span> : null}
        </div>
        <p className="mt-2 max-w-[68ch] text-[0.9375rem] text-paper-muted [overflow-wrap:anywhere]">{synopsisText}</p>

        <dl className="profile-count-grid mt-4">
          {countEntries.map((countEntry) => (
            <div key={countEntry.label} className="profile-count-cell">
              <dt className="dossier-label">{countEntry.label}</dt>
              <dd className="profile-count-value">{countEntry.count}</dd>
            </div>
          ))}
        </dl>

        {isClosedThread ? null : (
          <>
            <p className="dossier-label mt-4">{threadsCopy.investigatorsLabel}</p>
            <ul className="mt-2 flex min-w-0 flex-wrap gap-2">
              {threadInvestigators.map((profileInvestigator) => (
                <li
                  key={profileInvestigator.investigatorIdentifier}
                  className="profile-thread-member"
                  data-member-condition={profileInvestigator.conditionName}
                >
                  {profileInvestigator.conditionName === 'fallen' ? (
                    <Skull size={14} weight="fill" aria-hidden="true" />
                  ) : (
                    <UserFocus size={14} weight="fill" aria-hidden="true" />
                  )}
                  <span className="min-w-0 [overflow-wrap:anywhere]">
                    {profileInvestigator.fullName}
                    {profileInvestigator.conditionName === 'fallen' ? ` (${threadsCopy.fallenInvestigatorSuffix})` : ''}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex min-w-0 flex-wrap items-center justify-between gap-3">
              <p className="dossier-label [overflow-wrap:anywhere]">
                {chronicleThread.lastPlayedAtTimestamp
                  ? `${threadsCopy.lastPlayedLabel}: ${formatSavedMoment(chronicleThread.lastPlayedAtTimestamp)}`
                  : ''}
              </p>
              <button
                type="button"
                className="primary-action-button"
                aria-pressed={isChosenThread}
                onPointerEnter={(pointerEvent) => {
                  if (pointerEvent.pointerType === 'mouse') {
                    playInteractionFeedback('option_hover')
                  }
                }}
                onClick={() =>
                  onContinuationSelected({ threadIdentifier: chronicleThread.threadIdentifier, saveIdentifier: null })
                }
              >
                {isChosenThread ? <SealCheck size={18} weight="fill" aria-hidden="true" /> : null}
                {isChosenThread ? threadsCopy.chosenThreadButton : threadsCopy.chooseThreadButton}
              </button>
            </div>
          </>
        )}
      </li>
    )
  }

  return (
    <section className="min-w-0" aria-labelledby="profile-threads-in-progress-title">
      <h2 id="profile-threads-in-progress-title" className="display-title text-2xl [overflow-wrap:anywhere] sm:text-3xl">
        {threadsCopy.inProgressTitle}
      </h2>
      <ul className="mt-5 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5">{threadsInProgress.map(renderThreadCard)}</ul>
      {closedThreads.length > 0 ? (
        <>
          <h2 className="display-title mt-10 text-2xl [overflow-wrap:anywhere] sm:text-3xl">{threadsCopy.closedTitle}</h2>
          <ul className="mt-5 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-[repeat(2,minmax(0,1fr))]">
            {closedThreads.map(renderThreadCard)}
          </ul>
        </>
      ) : null}
    </section>
  )
}

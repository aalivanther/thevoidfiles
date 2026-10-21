import { CheckCircle, Coins, Handshake, Hourglass, MagnifyingGlass, PauseCircle, Question, ShareFat } from '@phosphor-icons/react'
import type { CSSProperties } from 'react'
import { caseJournalCopy } from '../../copy/case_journal_copy'
import type { JournalThread, JournalThreadClosingStatus, JournalThreadKind } from '../../demonstration/case_journal_data'
import { formatWorldClock } from '../../game_state/chronicle_state'
import type { CaseJournalSectionProperties } from './case_journal_section_properties'
import { calculateStableTiltDegrees } from './journal_paper_layout'

export function JournalThreadKindIcon({ threadKind }: { threadKind: JournalThreadKind }) {
  if (threadKind === 'promise') {
    return <Handshake size={18} weight="fill" aria-hidden="true" />
  }
  if (threadKind === 'debt') {
    return <Coins size={18} weight="fill" aria-hidden="true" />
  }
  if (threadKind === 'inquiry') {
    return <MagnifyingGlass size={18} weight="bold" aria-hidden="true" />
  }
  return <Question size={18} weight="bold" aria-hidden="true" />
}

export function JournalThreadClosingIcon({ closingStatus }: { closingStatus: JournalThreadClosingStatus }) {
  if (closingStatus === 'transferred') {
    return <ShareFat size={16} weight="fill" aria-hidden="true" />
  }
  if (closingStatus === 'suspended') {
    return <PauseCircle size={16} weight="fill" aria-hidden="true" />
  }
  return <CheckCircle size={16} weight="fill" aria-hidden="true" />
}

type JournalThreadTagProperties = {
  journalThread: JournalThread
  isArchiveFinished: boolean
  currentWorldClockMinutes: number
  entranceOrder: number
  personalizeJournalText: (journalText: string) => string
}

export function JournalThreadTag({
  journalThread,
  isArchiveFinished,
  currentWorldClockMinutes,
  entranceOrder,
  personalizeJournalText,
}: JournalThreadTagProperties) {
  const threadsCopy = caseJournalCopy.threads
  const remainingWorldMinutes =
    journalThread.deadlineWorldClockMinutes === null
      ? null
      : journalThread.deadlineWorldClockMinutes - currentWorldClockMinutes
  const hasDeadlinePassed = remainingWorldMinutes !== null && remainingWorldMinutes <= 0
  return (
    <li
      className="journal-paper-sheet journal-thread-tag"
      data-thread-kind={journalThread.threadKind}
      style={
        {
          '--paper-tilt': `${calculateStableTiltDegrees(journalThread.identifier, 0.8)}deg`,
          '--entrance-order': entranceOrder,
        } as CSSProperties
      }
    >
      <span className="journal-thread-tag-hole" aria-hidden="true" />
      <p className="journal-thread-kind">
        <JournalThreadKindIcon threadKind={journalThread.threadKind} />
        {threadsCopy.threadKinds[journalThread.threadKind]}
      </p>
      <h3 className="journal-thread-title">{personalizeJournalText(journalThread.titleText)}</h3>
      <dl className="journal-clue-facts">
        <div>
          <dt>{threadsCopy.originLabel}</dt>
          <dd>
            {personalizeJournalText(journalThread.originText)}{' '}
            <span className="journal-person-entry-moment">
              {threadsCopy.openedAt(journalThread.openedAtPlaceName, formatWorldClock(journalThread.openedAtWorldClockMinutes))}
            </span>
          </dd>
        </div>
        <div>
          <dt>{threadsCopy.responsibleLabel}</dt>
          <dd>{personalizeJournalText(journalThread.responsibleText)}</dd>
        </div>
        <div>
          <dt>{threadsCopy.deadlineLabel}</dt>
          <dd>
            {journalThread.deadlineText ?? threadsCopy.noDeadline}
            {!isArchiveFinished && remainingWorldMinutes !== null ? (
              <span className="journal-thread-remaining">
                <Hourglass size={14} weight="fill" aria-hidden="true" />
                {hasDeadlinePassed
                  ? threadsCopy.deadlineReached
                  : threadsCopy.remainingWorldTime(Math.floor(remainingWorldMinutes / 60), remainingWorldMinutes % 60)}
              </span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt>{threadsCopy.statusLabel}</dt>
          <dd>
            {isArchiveFinished ? (
              <>
                <span className="journal-thread-status" data-thread-status="closed">
                  <JournalThreadClosingIcon closingStatus={journalThread.closingStatusWhenArchiveFinished} />
                  {threadsCopy.closingStatuses[journalThread.closingStatusWhenArchiveFinished]}
                </span>{' '}
                {personalizeJournalText(journalThread.closingNoteText)}
              </>
            ) : (
              <span className="journal-thread-status" data-thread-status="open">
                <Hourglass size={16} weight="fill" aria-hidden="true" />
                {hasDeadlinePassed ? threadsCopy.statusDeadlinePassed : threadsCopy.statusOpen}
              </span>
            )}
          </dd>
        </div>
      </dl>
    </li>
  )
}

type OpenThreadsSectionProperties = CaseJournalSectionProperties & { isArchiveFinished: boolean }

export function OpenThreadsSection({
  livedCaseJournal,
  currentWorldClockMinutes,
  personalizeJournalText,
  isArchiveFinished,
}: OpenThreadsSectionProperties) {
  const threadsCopy = caseJournalCopy.threads
  return (
    <section aria-labelledby="journal-threads-heading">
      <h2 id="journal-threads-heading" className="journal-section-heading">
        {threadsCopy.sectionHeading}
      </h2>
      <p className="journal-section-introduction">{threadsCopy.sectionIntroduction}</p>
      {livedCaseJournal.threads.length === 0 ? <p className="journal-empty-line mt-6">{threadsCopy.noThreads}</p> : null}
      <ul className="journal-thread-list mt-6">
        {livedCaseJournal.threads.map((journalThread, threadIndex) => (
          <JournalThreadTag
            key={journalThread.identifier}
            journalThread={journalThread}
            isArchiveFinished={isArchiveFinished}
            currentWorldClockMinutes={currentWorldClockMinutes}
            entranceOrder={threadIndex}
            personalizeJournalText={personalizeJournalText}
          />
        ))}
      </ul>
      <p className="mt-6 max-w-[68ch] text-sm text-paper-muted">{threadsCopy.closingRule}</p>
    </section>
  )
}

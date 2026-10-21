import { Archive, CaretDown } from '@phosphor-icons/react'
import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useInteractionFeedback } from '../../audio/interaction_feedback'
import { caseJournalCopy } from '../../copy/case_journal_copy'
import { buildLivedCaseJournal } from '../../demonstration/case_journal_data'
import { formatWorldClock } from '../../game_state/chronicle_state'
import type { ArchiveCasework, CaseJournalRecord } from './case_journal_record'
import { ClueSupportIcon } from './clue_support_presentation'
import { calculateStableTiltDegrees } from './journal_paper_layout'
import { JournalThreadTag } from './OpenThreadsSection'

type ClosedArchivesSectionProperties = {
  caseJournalRecord: CaseJournalRecord
  personalizeJournalText: (journalText: string) => string
}

function ClosedArchiveRecord({
  archiveCasework,
  personalizeJournalText,
}: {
  archiveCasework: ArchiveCasework
  personalizeJournalText: (journalText: string) => string
}) {
  const closedCopy = caseJournalCopy.closedArchives
  const recordedCaseJournal = buildLivedCaseJournal(archiveCasework.witnessedOrigins)
  const lastWorldClockMinutes = archiveCasework.witnessedOrigins.at(-1)?.worldClockMinutes ?? 0
  return (
    <div className="journal-closed-archive-record">
      <h4 className="journal-paper-label">{closedCopy.recordedCluesHeading}</h4>
      {recordedCaseJournal.clues.length === 0 ? <p className="journal-paper-prose">{closedCopy.nothingRecorded}</p> : null}
      <ol className="journal-closed-clue-list">
        {recordedCaseJournal.clues.map((perceivedClue) => {
          const ownAnalysisText = (archiveCasework.ownAnalysisTextByClueIdentifier[perceivedClue.identifier] ?? '').trim()
          return (
            <li key={perceivedClue.identifier}>
              <p className="journal-person-entry-moment inline-flex items-center gap-1.5">
                <ClueSupportIcon supportKind={perceivedClue.supportKind} size={14} />
                {caseJournalCopy.supportKinds[perceivedClue.supportKind]} ·{' '}
                {perceivedClue.wasPerceivedBeforeArrival
                  ? caseJournalCopy.clues.beforeArrival
                  : `${formatWorldClock(perceivedClue.worldClockMinutes)} · ${perceivedClue.placeName}`}
              </p>
              <p className="journal-paper-prose">{personalizeJournalText(perceivedClue.perceivedText)}</p>
              {ownAnalysisText.length > 0 ? (
                <p className="journal-closed-own-analysis">
                  <strong>{closedCopy.ownAnalysisPrefix}</strong> {ownAnalysisText}
                </p>
              ) : null}
            </li>
          )
        })}
      </ol>

      {(archiveCasework.confirmedFactTexts ?? []).length > 0 ? (
        <ul className="journal-closed-clue-list">
          {archiveCasework.confirmedFactTexts?.map((text, index) => <li key={index} className="journal-paper-prose">{personalizeJournalText(text)}</li>)}
        </ul>
      ) : null}

      <h4 className="journal-paper-label mt-5">{closedCopy.recordedHypothesesHeading}</h4>
      {archiveCasework.hypotheses.length === 0 ? <p className="journal-paper-prose">{closedCopy.nothingRecorded}</p> : null}
      <ul className="journal-closed-clue-list">
        {archiveCasework.hypotheses.map((playerHypothesis) => (
          <li key={playerHypothesis.identifier}>
            <p className="journal-person-entry-moment">{caseJournalCopy.hypotheses.standingOwnership[playerHypothesis.standing]}</p>
            <p className="journal-hypothesis-statement" data-standing={playerHypothesis.standing}>
              {playerHypothesis.statementText}
            </p>
            {playerHypothesis.standingReasonText.trim().length > 0 ? (
              <p className="journal-closed-own-analysis">{playerHypothesis.standingReasonText}</p>
            ) : null}
          </li>
        ))}
      </ul>

      <h4 className="journal-paper-label mt-5">{closedCopy.recordedThreadsHeading}</h4>
      {recordedCaseJournal.threads.length === 0 ? <p className="journal-paper-prose">{closedCopy.nothingRecorded}</p> : null}
      <ul className="journal-thread-list mt-2">
        {recordedCaseJournal.threads.map((journalThread, threadIndex) => (
          <JournalThreadTag
            key={journalThread.identifier}
            journalThread={journalThread}
            isArchiveFinished={true}
            currentWorldClockMinutes={lastWorldClockMinutes}
            entranceOrder={threadIndex}
            personalizeJournalText={personalizeJournalText}
          />
        ))}
      </ul>

      <h4 className="journal-paper-label mt-5">{closedCopy.recordedNotesHeading}</h4>
      {archiveCasework.freeNotes.length === 0 ? <p className="journal-paper-prose">{closedCopy.nothingRecorded}</p> : null}
      <ul className="journal-closed-clue-list">
        {archiveCasework.freeNotes.map((freeNote) => (
          <li key={freeNote.identifier}>
            <p className="journal-note-text">{freeNote.noteText}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ClosedArchivesSection({
  caseJournalRecord,
  personalizeJournalText,
}: ClosedArchivesSectionProperties) {
  const closedCopy = caseJournalCopy.closedArchives
  const playInteractionFeedback = useInteractionFeedback()
  const [openArchiveSequence, setOpenArchiveSequence] = useState<number | null>(null)
  const closedArchiveSequences = Object.entries(caseJournalRecord.caseworkByArchiveSequence)
    .filter(([, casework]) => casework.wasArchiveFinished)
    .map(([sequence]) => Number(sequence)).filter(Number.isFinite).sort((left, right) => left - right)

  return (
    <section aria-labelledby="journal-closed-heading">
      <h2 id="journal-closed-heading" className="journal-section-heading">
        {closedCopy.sectionHeading}
      </h2>
      <p className="journal-section-introduction">{closedCopy.sectionIntroduction}</p>
      {closedArchiveSequences.length === 0 ? (
        <p className="journal-empty-line mt-6">{closedCopy.noClosedArchives}</p>
      ) : null}
      <ul className="journal-closed-archive-list mt-6">
        {closedArchiveSequences.map((archiveSequence) => {
          const archiveCasework = caseJournalRecord.caseworkByArchiveSequence[String(archiveSequence)]
          const isOpen = openArchiveSequence === archiveSequence
          return (
            <li
              key={archiveSequence}
              className="journal-paper-sheet journal-closed-archive"
              style={
                {
                  '--paper-tilt': `${calculateStableTiltDegrees(`closed_archive_${archiveSequence}`, 0.6)}deg`,
                  '--entrance-order': archiveSequence,
                } as CSSProperties
              }
            >
              <span className="journal-tape-strip" aria-hidden="true" />
              <p className="journal-thread-kind">
                <Archive size={18} weight="fill" aria-hidden="true" />
                {closedCopy.closedArchiveLabel(archiveSequence + 1)}
              </p>
              <h3 className="journal-paper-heading">{archiveCasework?.archiveTitle ?? closedCopy.untitledArchive}</h3>
              {archiveCasework ? (
                <>
                  <button
                    type="button"
                    className="journal-paper-button mt-3"
                    aria-expanded={isOpen}
                    onClick={() => {
                      playInteractionFeedback(isOpen ? 'panel_close' : 'panel_open')
                      setOpenArchiveSequence(isOpen ? null : archiveSequence)
                    }}
                  >
                    <CaretDown
                      size={16}
                      weight="bold"
                      aria-hidden="true"
                      className="journal-hypothesis-caret"
                      data-expanded={isOpen}
                    />
                    {isOpen ? closedCopy.hideRecord : closedCopy.showRecord}
                  </button>
                  {isOpen ? (
                    <ClosedArchiveRecord archiveCasework={archiveCasework} personalizeJournalText={personalizeJournalText} />
                  ) : null}
                </>
              ) : (
                <p className="journal-paper-prose mt-2">{closedCopy.journalNeverOpened}</p>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

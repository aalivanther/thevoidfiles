import { NotePencil, Scissors } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { chooseAnimationVariantName } from '../../animation/animation_variety'
import { useInteractionFeedback } from '../../audio/interaction_feedback'
import { caseJournalCopy } from '../../copy/case_journal_copy'
import { formatWorldClock } from '../../game_state/chronicle_state'
import { maximumFreeNoteCount, playerTextLengthLimits } from './case_journal_record'
import type { CaseJournalSectionProperties } from './case_journal_section_properties'
import { calculateStableTiltDegrees } from './journal_paper_layout'
import { JournalWritingField } from './JournalWritingField'

const pageTearVariantNames = ['tear_upward', 'tear_sideways', 'tear_crumpled'] as const
const noteEntranceVariantNames = ['pin_swing_settle', 'pin_press_in', 'pin_flutter'] as const
const pageTearMilliseconds = 460

export function FreeNotesSection({
  archiveCasework,
  changeArchiveCasework,
  currentWorldClockMinutes,
}: CaseJournalSectionProperties) {
  const notesCopy = caseJournalCopy.notes
  const playInteractionFeedback = useInteractionFeedback()
  const [draftNoteText, setDraftNoteText] = useState('')
  const [formRejectionText, setFormRejectionText] = useState<string | null>(null)
  const [rejectionShakeCount, setRejectionShakeCount] = useState(0)
  const [confirmingTearNoteIdentifier, setConfirmingTearNoteIdentifier] = useState<string | null>(null)
  const [tornNoteIdentifier, setTornNoteIdentifier] = useState<string | null>(null)
  const [pageTearVariantName, setPageTearVariantName] = useState<string>(pageTearVariantNames[0])
  const [noteEntranceVariantName, setNoteEntranceVariantName] = useState(() =>
    chooseAnimationVariantName('journal_note_entrance', noteEntranceVariantNames),
  )
  const pageTearTimeoutIdentifier = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (pageTearTimeoutIdentifier.current !== null) {
        window.clearTimeout(pageTearTimeoutIdentifier.current)
      }
    },
    [],
  )

  const rejectForm = (rejectionText: string) => {
    playInteractionFeedback('rejection')
    setFormRejectionText(rejectionText)
    setRejectionShakeCount((previousCount) => previousCount + 1)
  }

  const keepNewNote = () => {
    const noteText = draftNoteText.trim()
    if (noteText.length === 0) {
      rejectForm(notesCopy.emptyNoteRejected)
      return
    }
    if (archiveCasework.freeNotes.length >= maximumFreeNoteCount) {
      rejectForm(notesCopy.notebookIsFull(maximumFreeNoteCount))
      return
    }
    playInteractionFeedback('confirmation')
    setNoteEntranceVariantName(chooseAnimationVariantName('journal_note_entrance', noteEntranceVariantNames))
    setFormRejectionText(null)
    setDraftNoteText('')
    changeArchiveCasework((previousCasework) => {
      let createdItemCount = previousCasework.createdItemCount + 1
      while (previousCasework.freeNotes.some((existingNote) => existingNote.identifier === `free_note_${createdItemCount}`)) {
        createdItemCount += 1
      }
      return {
        ...previousCasework,
        createdItemCount,
        freeNotes: [
          { identifier: `free_note_${createdItemCount}`, noteText, writtenAtWorldClockMinutes: currentWorldClockMinutes },
          ...previousCasework.freeNotes,
        ],
      }
    })
  }

  const tearNote = (noteIdentifier: string) => {
    if (tornNoteIdentifier !== null) {
      return
    }
    playInteractionFeedback('screen_tear')
    setPageTearVariantName(chooseAnimationVariantName('journal_page_tear', pageTearVariantNames))
    setConfirmingTearNoteIdentifier(null)
    setTornNoteIdentifier(noteIdentifier)
    pageTearTimeoutIdentifier.current = window.setTimeout(() => {
      pageTearTimeoutIdentifier.current = null
      setTornNoteIdentifier(null)
      changeArchiveCasework((previousCasework) => ({
        ...previousCasework,
        freeNotes: previousCasework.freeNotes.filter((existingNote) => existingNote.identifier !== noteIdentifier),
      }))
    }, pageTearMilliseconds)
  }

  return (
    <section aria-labelledby="journal-notes-heading">
      <h2 id="journal-notes-heading" className="journal-section-heading">
        {notesCopy.sectionHeading}
      </h2>
      <p className="journal-section-introduction">{notesCopy.sectionIntroduction}</p>

      <form
        className="journal-paper-sheet journal-new-entry-form mt-6"
        data-rejection-shake={formRejectionText ? (rejectionShakeCount % 2 === 0 ? 'even' : 'odd') : 'none'}
        onSubmit={(submitEvent) => {
          submitEvent.preventDefault()
          keepNewNote()
        }}
      >
        <span className="journal-tape-strip" aria-hidden="true" />
        <JournalWritingField
          fieldLabel={notesCopy.newNoteLabel}
          placeholderText={notesCopy.newNotePlaceholder}
          writtenText={draftNoteText}
          maximumLength={playerTextLengthLimits.freeNote}
          rowCount={4}
          paperTone="paper"
          onWrittenTextChanged={(writtenText) => {
            setDraftNoteText(writtenText)
            setFormRejectionText(null)
          }}
          onSubmitRequested={keepNewNote}
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="submit" className="primary-action-button">
            <NotePencil size={18} weight="fill" aria-hidden="true" />
            {notesCopy.keepNote}
          </button>
          <p className="journal-form-rejection" role="alert">
            {formRejectionText}
          </p>
        </div>
      </form>

      {archiveCasework.freeNotes.length === 0 ? <p className="journal-empty-line mt-6">{notesCopy.noNotes}</p> : null}
      <ul className="journal-note-grid mt-6" aria-label={notesCopy.notesListLabel}>
        {archiveCasework.freeNotes.map((freeNote) => (
          <li
            key={freeNote.identifier}
            className="journal-paper-sheet journal-note-sheet"
            data-being-torn={tornNoteIdentifier === freeNote.identifier}
            data-page-tear-variant={pageTearVariantName}
            data-pin-entrance-variant={noteEntranceVariantName}
            style={{ '--paper-tilt': `${calculateStableTiltDegrees(freeNote.identifier, 1.8)}deg` } as CSSProperties}
          >
            <span className="journal-tape-strip" aria-hidden="true" />
            <p className="journal-note-text">{freeNote.noteText}</p>
            <p className="journal-person-entry-moment">{notesCopy.writtenAt(formatWorldClock(freeNote.writtenAtWorldClockMinutes))}</p>
            <div className="journal-tear-controls">
              {confirmingTearNoteIdentifier === freeNote.identifier ? (
                <>
                  <button
                    type="button"
                    className="journal-paper-button"
                    data-button-tone="destructive"
                    onClick={() => tearNote(freeNote.identifier)}
                  >
                    <Scissors size={16} weight="bold" aria-hidden="true" />
                    {notesCopy.confirmTearNote}
                  </button>
                  <button
                    type="button"
                    className="journal-paper-button"
                    onClick={() => {
                      playInteractionFeedback('panel_close')
                      setConfirmingTearNoteIdentifier(null)
                    }}
                  >
                    {notesCopy.cancelTearNote}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="journal-paper-button"
                  onClick={() => {
                    playInteractionFeedback('option_click')
                    setConfirmingTearNoteIdentifier(freeNote.identifier)
                  }}
                >
                  <Scissors size={16} weight="bold" aria-hidden="true" />
                  {notesCopy.tearNote}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

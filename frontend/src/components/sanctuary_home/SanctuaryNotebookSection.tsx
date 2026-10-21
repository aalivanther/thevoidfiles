import {
  ArrowLeft,
  CheckCircle,
  LockKey,
  MagnifyingGlass,
  NotePencil,
  PushPin,
  PushPinSlash,
  Tag,
  Trash,
  Warning,
  X,
} from '@phosphor-icons/react'
import { AlertDialog } from 'radix-ui'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { chooseAnimationVariantName, randomNumberBetween } from '../../animation/animation_variety'
import { useInteractionFeedback } from '../../audio/interaction_feedback'
import { sanctuaryHomeCopy } from '../../copy/sanctuary_home_copy'
import {
  maximumNoteBodyLength,
  maximumNoteCount,
  maximumNoteTagCount,
  maximumNoteTagLength,
  maximumNoteTitleLength,
  normalizeNoteTagName,
} from './sanctuary_home_record'
import type { PersonalNote } from './sanctuary_home_record'

const notePinningVariantNames = ['pin_straight_drop', 'pin_twisting_push', 'pin_hammered_twice'] as const
const autosaveDelayMilliseconds = 800
const remainingCharactersWarningThreshold = 100

const savedTimeFormatter = new Intl.DateTimeFormat('es-419', { hour: '2-digit', minute: '2-digit' })
const lastEditedDateFormatter = new Intl.DateTimeFormat('es-419', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})

type AutosaveStatus = { kind: 'idle' } | { kind: 'pending' } | { kind: 'saved'; savedAtTimestamp: number }

type SanctuaryNotebookSectionProperties = {
  personalNotes: PersonalNote[]
  createdNoteCount: number
  blockedActionMessage: string | null
  onNotebookChanged: (personalNotes: PersonalNote[], createdNoteCount: number) => void
}

function normalizeSearchableText(rawText: string): string {
  return rawText
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
}

function doesNoteMatchSearch(personalNote: PersonalNote, normalizedSearchText: string): boolean {
  if (normalizedSearchText.length === 0) {
    return true
  }
  return normalizeSearchableText(
    `${personalNote.titleText}\n${personalNote.bodyText}\n${personalNote.tagNames.join('\n')}`,
  ).includes(normalizedSearchText)
}

export function SanctuaryNotebookSection({
  personalNotes,
  createdNoteCount,
  blockedActionMessage,
  onNotebookChanged,
}: SanctuaryNotebookSectionProperties) {
  const notebookCopy = sanctuaryHomeCopy.notebook
  const playInteractionFeedback = useInteractionFeedback()
  const [selectedNoteIdentifier, setSelectedNoteIdentifier] = useState<string | null>(null)
  const [draftNote, setDraftNote] = useState<PersonalNote | null>(null)
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>({ kind: 'idle' })
  const [searchText, setSearchText] = useState('')
  const [selectedTagName, setSelectedTagName] = useState<string | null>(null)
  const [pendingTagText, setPendingTagText] = useState('')
  const [notebookRejectionMessage, setNotebookRejectionMessage] = useState<string | null>(null)
  const [noteAwaitingDeletion, setNoteAwaitingDeletion] = useState<PersonalNote | null>(null)
  const [statusAnnouncement, setStatusAnnouncement] = useState('')
  const [pinningPresentation, setPinningPresentation] = useState<{
    noteIdentifier: string
    variantName: (typeof notePinningVariantNames)[number]
  } | null>(null)
  const [noteTiltByIdentifier, setNoteTiltByIdentifier] = useState<Record<string, number>>({})

  const latestPersonalNotes = useRef(personalNotes)
  const latestCreatedNoteCount = useRef(createdNoteCount)
  const latestNotebookChangedCallback = useRef(onNotebookChanged)
  const latestDraftNote = useRef<PersonalNote | null>(null)
  const hasUnsavedDraftChanges = useRef(false)
  const autosaveTimeoutIdentifier = useRef<number | null>(null)
  const shouldFocusTitleField = useRef(false)
  const titleFieldElement = useRef<HTMLInputElement>(null)

  useEffect(() => {
    latestPersonalNotes.current = personalNotes
    latestCreatedNoteCount.current = createdNoteCount
    latestNotebookChangedCallback.current = onNotebookChanged
  }, [personalNotes, createdNoteCount, onNotebookChanged])

  const saveDraftNote = useCallback((): boolean => {
    if (autosaveTimeoutIdentifier.current !== null) {
      window.clearTimeout(autosaveTimeoutIdentifier.current)
      autosaveTimeoutIdentifier.current = null
    }
    const draftNoteToSave = latestDraftNote.current
    if (!draftNoteToSave || !hasUnsavedDraftChanges.current) {
      return false
    }
    hasUnsavedDraftChanges.current = false
    const savedPersonalNotes = latestPersonalNotes.current.map((personalNote) =>
      personalNote.identifier === draftNoteToSave.identifier ? draftNoteToSave : personalNote,
    )
    latestPersonalNotes.current = savedPersonalNotes
    latestNotebookChangedCallback.current(savedPersonalNotes, latestCreatedNoteCount.current)
    return true
  }, [])

  useEffect(
    () => () => {
      saveDraftNote()
    },
    [saveDraftNote],
  )

  useEffect(() => {
    if (shouldFocusTitleField.current && selectedNoteIdentifier !== null) {
      shouldFocusTitleField.current = false
      titleFieldElement.current?.focus()
    }
  }, [selectedNoteIdentifier])

  const rejectNotebookAction = (messageText: string) => {
    playInteractionFeedback('rejection')
    setNotebookRejectionMessage(messageText)
  }

  const changeDraftNote = (changedFields: Partial<Pick<PersonalNote, 'titleText' | 'bodyText' | 'tagNames'>>) => {
    const previousDraftNote = latestDraftNote.current
    if (!previousDraftNote || blockedActionMessage) {
      return
    }
    const changedDraftNote: PersonalNote = { ...previousDraftNote, ...changedFields, lastEditedTimestamp: Date.now() }
    latestDraftNote.current = changedDraftNote
    hasUnsavedDraftChanges.current = true
    setDraftNote(changedDraftNote)
    setAutosaveStatus({ kind: 'pending' })
    setNotebookRejectionMessage(null)
    if (autosaveTimeoutIdentifier.current !== null) {
      window.clearTimeout(autosaveTimeoutIdentifier.current)
    }
    autosaveTimeoutIdentifier.current = window.setTimeout(() => {
      autosaveTimeoutIdentifier.current = null
      if (saveDraftNote()) {
        setAutosaveStatus({ kind: 'saved', savedAtTimestamp: Date.now() })
      }
    }, autosaveDelayMilliseconds)
  }

  const changeTypedField = (fieldName: 'titleText' | 'bodyText', typedText: string, maximumLength: number) => {
    const previousText = latestDraftNote.current?.[fieldName] ?? ''
    const limitedText = typedText.slice(0, maximumLength)
    if (limitedText.length > previousText.length) {
      playInteractionFeedback('typewriter_key')
    }
    changeDraftNote({ [fieldName]: limitedText })
  }

  const openNote = (personalNote: PersonalNote | null) => {
    const previouslyOpenNote = latestDraftNote.current
    const wasDraftSaved = saveDraftNote()
    latestDraftNote.current = personalNote ? { ...personalNote, tagNames: [...personalNote.tagNames] } : null
    setDraftNote(latestDraftNote.current)
    setSelectedNoteIdentifier(personalNote?.identifier ?? null)
    setPendingTagText('')
    setNotebookRejectionMessage(null)
    setAutosaveStatus(
      wasDraftSaved && previouslyOpenNote
        ? { kind: 'saved', savedAtTimestamp: previouslyOpenNote.lastEditedTimestamp }
        : { kind: 'idle' },
    )
  }

  const createNote = () => {
    if (blockedActionMessage) {
      rejectNotebookAction(blockedActionMessage)
      return
    }
    saveDraftNote()
    if (latestPersonalNotes.current.length >= maximumNoteCount) {
      rejectNotebookAction(notebookCopy.noteLimitReachedMessage)
      return
    }
    const nextCreatedNoteCount = latestCreatedNoteCount.current + 1
    const createdNote: PersonalNote = {
      identifier: `personal_note_${nextCreatedNoteCount}`,
      titleText: '',
      bodyText: '',
      tagNames: [],
      isPinned: false,
      lastEditedTimestamp: Date.now(),
    }
    const personalNotesWithCreatedNote = [createdNote, ...latestPersonalNotes.current]
    latestPersonalNotes.current = personalNotesWithCreatedNote
    latestCreatedNoteCount.current = nextCreatedNoteCount
    latestNotebookChangedCallback.current(personalNotesWithCreatedNote, nextCreatedNoteCount)
    playInteractionFeedback('panel_open')
    setNoteTiltByIdentifier((previousTilts) => ({
      ...previousTilts,
      [createdNote.identifier]: randomNumberBetween(-1.6, 1.6),
    }))
    setSearchText('')
    setSelectedTagName(null)
    shouldFocusTitleField.current = true
    latestDraftNote.current = createdNote
    setDraftNote(createdNote)
    setSelectedNoteIdentifier(createdNote.identifier)
    setPendingTagText('')
    setNotebookRejectionMessage(null)
    setAutosaveStatus({ kind: 'saved', savedAtTimestamp: Date.now() })
  }

  const togglePinnedState = () => {
    const previousDraftNote = latestDraftNote.current
    if (!previousDraftNote) {
      return
    }
    if (blockedActionMessage) {
      rejectNotebookAction(blockedActionMessage)
      return
    }
    const pinnedDraftNote: PersonalNote = { ...previousDraftNote, isPinned: !previousDraftNote.isPinned }
    latestDraftNote.current = pinnedDraftNote
    hasUnsavedDraftChanges.current = true
    setDraftNote(pinnedDraftNote)
    saveDraftNote()
    setAutosaveStatus({ kind: 'saved', savedAtTimestamp: Date.now() })
    playInteractionFeedback(pinnedDraftNote.isPinned ? 'stamp_impact' : 'option_click')
    setStatusAnnouncement(pinnedDraftNote.isPinned ? notebookCopy.notePinnedAnnouncement : notebookCopy.noteUnpinnedAnnouncement)
    setPinningPresentation(
      pinnedDraftNote.isPinned
        ? {
            noteIdentifier: pinnedDraftNote.identifier,
            variantName: chooseAnimationVariantName('sanctuary_note_pinning', notePinningVariantNames),
          }
        : null,
    )
  }

  const requestNoteDeletion = () => {
    if (!latestDraftNote.current) {
      return
    }
    if (blockedActionMessage) {
      rejectNotebookAction(blockedActionMessage)
      return
    }
    playInteractionFeedback('panel_open')
    setNoteAwaitingDeletion(latestDraftNote.current)
  }

  const confirmNoteDeletion = () => {
    const deletedNote = noteAwaitingDeletion
    if (!deletedNote || blockedActionMessage) {
      return
    }
    if (autosaveTimeoutIdentifier.current !== null) {
      window.clearTimeout(autosaveTimeoutIdentifier.current)
      autosaveTimeoutIdentifier.current = null
    }
    hasUnsavedDraftChanges.current = false
    latestDraftNote.current = null
    const remainingPersonalNotes = latestPersonalNotes.current.filter(
      (personalNote) => personalNote.identifier !== deletedNote.identifier,
    )
    latestPersonalNotes.current = remainingPersonalNotes
    latestNotebookChangedCallback.current(remainingPersonalNotes, latestCreatedNoteCount.current)
    playInteractionFeedback('falling_whoosh')
    setStatusAnnouncement(notebookCopy.noteDeletedAnnouncement)
    setNoteAwaitingDeletion(null)
    setDraftNote(null)
    setSelectedNoteIdentifier(null)
    setAutosaveStatus({ kind: 'idle' })
  }

  const addPendingTag = () => {
    const currentDraftNote = latestDraftNote.current
    if (!currentDraftNote) {
      return
    }
    if (blockedActionMessage) {
      rejectNotebookAction(blockedActionMessage)
      return
    }
    const normalizedTagName = normalizeNoteTagName(pendingTagText)
    if (normalizedTagName.length === 0) {
      setPendingTagText('')
      return
    }
    if (currentDraftNote.tagNames.includes(normalizedTagName)) {
      setPendingTagText('')
      return
    }
    if (currentDraftNote.tagNames.length >= maximumNoteTagCount) {
      rejectNotebookAction(notebookCopy.tagLimitReachedMessage)
      return
    }
    playInteractionFeedback('confirmation')
    changeDraftNote({ tagNames: [...currentDraftNote.tagNames, normalizedTagName] })
    setPendingTagText('')
  }

  const removeTag = (removedTagName: string) => {
    const currentDraftNote = latestDraftNote.current
    if (!currentDraftNote) {
      return
    }
    if (blockedActionMessage) {
      rejectNotebookAction(blockedActionMessage)
      return
    }
    playInteractionFeedback('option_click')
    changeDraftNote({ tagNames: currentDraftNote.tagNames.filter((tagName) => tagName !== removedTagName) })
  }

  const displayedPersonalNotes = personalNotes.map((personalNote) =>
    draftNote && personalNote.identifier === draftNote.identifier ? draftNote : personalNote,
  )
  const everyTagName = [...new Set(displayedPersonalNotes.flatMap((personalNote) => personalNote.tagNames))].sort(
    (firstTagName, secondTagName) => firstTagName.localeCompare(secondTagName, 'es'),
  )
  const activeTagName = selectedTagName !== null && everyTagName.includes(selectedTagName) ? selectedTagName : null
  const normalizedSearchText = normalizeSearchableText(searchText.trim())
  const visiblePersonalNotes = displayedPersonalNotes
    .filter(
      (personalNote) =>
        doesNoteMatchSearch(personalNote, normalizedSearchText) &&
        (activeTagName === null || personalNote.tagNames.includes(activeTagName)),
    )
    .sort(
      (firstNote, secondNote) =>
        Number(secondNote.isPinned) - Number(firstNote.isPinned) ||
        secondNote.lastEditedTimestamp - firstNote.lastEditedTimestamp,
    )
  const isReadOnly = blockedActionMessage !== null
  const remainingBodyCharacters = draftNote ? maximumNoteBodyLength - draftNote.bodyText.length : maximumNoteBodyLength

  return (
    <section aria-labelledby="sanctuary-notebook-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id="sanctuary-notebook-title" className="display-title text-2xl">
            {notebookCopy.title}
          </h2>
          <p className="mt-1 max-w-[68ch] text-sm text-paper-muted">{notebookCopy.description}</p>
        </div>
        <button
          type="button"
          className="primary-action-button"
          aria-disabled={isReadOnly}
          data-unavailable={isReadOnly}
          onClick={createNote}
        >
          <NotePencil size={20} weight="fill" aria-hidden="true" />
          {notebookCopy.newNoteButton}
        </button>
      </div>

      <p className="visually-hidden-text" role="status">
        {statusAnnouncement}
      </p>
      {notebookRejectionMessage ? (
        <p role="alert" className="mt-3 border-l-4 border-blood-accent pl-3 text-sm text-blood-accent-text">
          {notebookRejectionMessage}
        </p>
      ) : null}

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className={selectedNoteIdentifier !== null ? 'hidden lg:block' : undefined}>
          <label className="dossier-label block" htmlFor="sanctuary-note-search">
            {notebookCopy.searchLabel}
          </label>
          <div className="relative mt-1">
            <MagnifyingGlass
              size={18}
              weight="bold"
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-paper-muted"
              aria-hidden="true"
            />
            <input
              id="sanctuary-note-search"
              type="search"
              className="free-action-field sanctuary-search-field"
              value={searchText}
              maxLength={80}
              placeholder={notebookCopy.searchPlaceholder}
              onChange={(changeEvent) => {
                if (changeEvent.target.value.length > searchText.length) {
                  playInteractionFeedback('typewriter_key')
                }
                setSearchText(changeEvent.target.value)
              }}
            />
          </div>

          {everyTagName.length > 0 ? (
            <div className="mt-3" role="group" aria-label={notebookCopy.tagFilterLabel}>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="sanctuary-tag-filter"
                  aria-pressed={activeTagName === null}
                  onClick={() => {
                    playInteractionFeedback('option_click')
                    setSelectedTagName(null)
                  }}
                >
                  {notebookCopy.allTagsFilter}
                </button>
                {everyTagName.map((tagName) => (
                  <button
                    key={tagName}
                    type="button"
                    className="sanctuary-tag-filter"
                    aria-pressed={activeTagName === tagName}
                    onClick={() => {
                      playInteractionFeedback('option_click')
                      setSelectedTagName(activeTagName === tagName ? null : tagName)
                    }}
                  >
                    <Tag size={14} weight="fill" aria-hidden="true" />
                    {tagName}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <p className="dossier-label mt-4">{notebookCopy.noteCountLabel(personalNotes.length, maximumNoteCount)}</p>

          {personalNotes.length === 0 ? (
            <div className="sanctuary-note-empty mt-3">
              <p className="font-[family-name:var(--font-display)] text-lg tracking-wide uppercase">
                {notebookCopy.emptyNotebookTitle}
              </p>
              <p className="mt-1 text-sm">{notebookCopy.emptyNotebookDescription}</p>
            </div>
          ) : null}
          {personalNotes.length > 0 && visiblePersonalNotes.length === 0 ? (
            <p className="mt-3 text-sm text-paper-muted">{notebookCopy.noSearchResults}</p>
          ) : null}

          <ul className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-3" aria-label={notebookCopy.noteListLabel}>
            {visiblePersonalNotes.map((personalNote) => (
              <li key={personalNote.identifier}>
                <button
                  type="button"
                  className={`sanctuary-note-slip ${
                    pinningPresentation?.noteIdentifier === personalNote.identifier ? pinningPresentation.variantName : ''
                  }`}
                  style={{ '--note-tilt': `${(noteTiltByIdentifier[personalNote.identifier] ?? 0).toFixed(2)}deg` } as CSSProperties}
                  aria-current={selectedNoteIdentifier === personalNote.identifier ? 'true' : undefined}
                  data-pinned={personalNote.isPinned}
                  onClick={() => {
                    playInteractionFeedback('option_click')
                    openNote(personalNote)
                  }}
                >
                  {personalNote.isPinned ? (
                    <span className="sanctuary-note-pin">
                      <PushPin size={18} weight="fill" aria-hidden="true" />
                      <span className="visually-hidden-text">{notebookCopy.pinnedTag}</span>
                    </span>
                  ) : null}
                  <span className="sanctuary-note-slip-title">
                    {personalNote.titleText.trim().length > 0 ? personalNote.titleText : notebookCopy.untitledNote}
                  </span>
                  <span className="sanctuary-note-slip-preview">
                    {personalNote.bodyText.trim().length > 0 ? personalNote.bodyText : notebookCopy.emptyBodyPreview}
                  </span>
                  {personalNote.tagNames.length > 0 ? (
                    <span className="sanctuary-note-slip-tags">
                      {personalNote.tagNames.map((tagName) => (
                        <span key={tagName}>#{tagName}</span>
                      ))}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className={selectedNoteIdentifier === null ? 'hidden lg:block' : undefined}>
          {draftNote ? (
            <div className="sanctuary-note-editor aged-paper-document p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  className="quiet-action-button sanctuary-paper-quiet-button sanctuary-small-screen-only"
                  onClick={() => {
                    playInteractionFeedback('panel_close')
                    openNote(null)
                  }}
                >
                  <ArrowLeft size={18} weight="bold" aria-hidden="true" />
                  {notebookCopy.backToListButton}
                </button>
                <p className="sanctuary-autosave-status" role="status" data-autosave-state={isReadOnly ? 'locked' : autosaveStatus.kind}>
                  {isReadOnly ? <LockKey size={16} weight="fill" aria-hidden="true" /> : null}
                  {!isReadOnly && autosaveStatus.kind === 'saved' ? (
                    <CheckCircle size={16} weight="fill" aria-hidden="true" />
                  ) : null}
                  {isReadOnly
                    ? notebookCopy.readOnlyTag
                    : autosaveStatus.kind === 'pending'
                      ? notebookCopy.autosavePending
                      : autosaveStatus.kind === 'saved'
                        ? notebookCopy.autosaveSaved(savedTimeFormatter.format(autosaveStatus.savedAtTimestamp))
                        : notebookCopy.autosaveIdle}
                </p>
              </div>

              <label className="sanctuary-paper-label mt-4 block" htmlFor="sanctuary-note-title">
                {notebookCopy.titleFieldLabel}
              </label>
              <input
                id="sanctuary-note-title"
                ref={titleFieldElement}
                type="text"
                className="sanctuary-paper-field sanctuary-paper-title-field"
                value={draftNote.titleText}
                maxLength={maximumNoteTitleLength}
                readOnly={isReadOnly}
                placeholder={notebookCopy.titleFieldPlaceholder}
                autoComplete="off"
                onChange={(changeEvent) => changeTypedField('titleText', changeEvent.target.value, maximumNoteTitleLength)}
              />
              <p className="sanctuary-paper-counter" aria-hidden="true">
                {notebookCopy.characterCount(draftNote.titleText.length, maximumNoteTitleLength)}
              </p>

              <label className="sanctuary-paper-label mt-3 block" htmlFor="sanctuary-note-body">
                {notebookCopy.bodyFieldLabel}
              </label>
              <textarea
                id="sanctuary-note-body"
                className="sanctuary-paper-field sanctuary-paper-body-field"
                value={draftNote.bodyText}
                maxLength={maximumNoteBodyLength}
                readOnly={isReadOnly}
                rows={10}
                placeholder={notebookCopy.bodyFieldPlaceholder}
                aria-describedby="sanctuary-note-body-counter"
                onChange={(changeEvent) => changeTypedField('bodyText', changeEvent.target.value, maximumNoteBodyLength)}
              />
              <p
                id="sanctuary-note-body-counter"
                className="sanctuary-paper-counter"
                data-near-limit={remainingBodyCharacters <= remainingCharactersWarningThreshold}
              >
                {remainingBodyCharacters <= 0 ? <Warning size={14} weight="fill" aria-hidden="true" /> : null}
                {remainingBodyCharacters <= 0 ? `${notebookCopy.characterLimitReached} · ` : ''}
                {notebookCopy.characterCount(draftNote.bodyText.length, maximumNoteBodyLength)}
              </p>

              <label className="sanctuary-paper-label mt-3 block" htmlFor="sanctuary-note-tag">
                {notebookCopy.tagFieldLabel}
              </label>
              {draftNote.tagNames.length > 0 ? (
                <ul className="mt-1 flex flex-wrap gap-2">
                  {draftNote.tagNames.map((tagName) => (
                    <li key={tagName} className="sanctuary-paper-tag">
                      <span className="[overflow-wrap:anywhere]">#{tagName}</span>
                      <button
                        type="button"
                        className="sanctuary-paper-tag-remove"
                        aria-label={notebookCopy.removeTagButton(tagName)}
                        aria-disabled={isReadOnly}
                        onClick={() => removeTag(tagName)}
                      >
                        <X size={14} weight="bold" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  id="sanctuary-note-tag"
                  type="text"
                  className="sanctuary-paper-field sanctuary-paper-tag-field"
                  value={pendingTagText}
                  maxLength={maximumNoteTagLength}
                  readOnly={isReadOnly}
                  placeholder={notebookCopy.tagFieldPlaceholder}
                  autoComplete="off"
                  aria-describedby="sanctuary-note-tag-hint"
                  onChange={(changeEvent) => {
                    if (isReadOnly) {
                      return
                    }
                    if (changeEvent.target.value.length > pendingTagText.length) {
                      playInteractionFeedback('typewriter_key')
                    }
                    setPendingTagText(changeEvent.target.value.replace(/,/g, ''))
                  }}
                  onKeyDown={(keyboardEvent) => {
                    if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ',') {
                      keyboardEvent.preventDefault()
                      addPendingTag()
                    }
                  }}
                />
                <button
                  type="button"
                  className="quiet-action-button sanctuary-paper-quiet-button"
                  aria-disabled={isReadOnly}
                  onClick={addPendingTag}
                >
                  <Tag size={18} weight="fill" aria-hidden="true" />
                  {notebookCopy.addTagButton}
                </button>
              </div>
              <p id="sanctuary-note-tag-hint" className="sanctuary-paper-counter sanctuary-paper-hint">
                {notebookCopy.tagFieldHint(maximumNoteTagCount)}
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t-2 border-black/30 pt-4">
                <p className="font-[family-name:var(--font-dossier)] text-xs opacity-75">
                  {notebookCopy.lastEditedLabel(lastEditedDateFormatter.format(draftNote.lastEditedTimestamp))}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="quiet-action-button sanctuary-paper-quiet-button"
                    aria-pressed={draftNote.isPinned}
                    aria-disabled={isReadOnly}
                    onClick={togglePinnedState}
                  >
                    {draftNote.isPinned ? (
                      <PushPinSlash size={18} weight="fill" aria-hidden="true" />
                    ) : (
                      <PushPin size={18} weight="fill" aria-hidden="true" />
                    )}
                    {draftNote.isPinned ? notebookCopy.unpinButton : notebookCopy.pinButton}
                  </button>
                  <button
                    type="button"
                    className="quiet-action-button sanctuary-paper-quiet-button sanctuary-paper-danger-button"
                    aria-disabled={isReadOnly}
                    onClick={requestNoteDeletion}
                  >
                    <Trash size={18} weight="fill" aria-hidden="true" />
                    {notebookCopy.deleteButton}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="sanctuary-note-editor-placeholder">
              <NotePencil size={36} weight="duotone" aria-hidden="true" />
              <p className="mt-2 font-[family-name:var(--font-display)] text-lg tracking-wide uppercase">
                {notebookCopy.editorPlaceholderTitle}
              </p>
              <p className="mt-1 text-sm text-paper-muted">{notebookCopy.editorPlaceholderDescription}</p>
            </div>
          )}
        </div>
      </div>

      <AlertDialog.Root
        open={noteAwaitingDeletion !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            playInteractionFeedback('panel_close')
            setNoteAwaitingDeletion(null)
          }
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="dialog-overlay" />
          <AlertDialog.Content className="centered-dialog-content aged-paper-document p-5 sm:p-6">
            <AlertDialog.Title className="font-[family-name:var(--font-narrative)] text-xl leading-snug font-semibold">
              {notebookCopy.deleteConfirmationTitle}
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm opacity-85 [overflow-wrap:anywhere]">
              {notebookCopy.deleteConfirmationDescription(
                noteAwaitingDeletion && noteAwaitingDeletion.titleText.trim().length > 0
                  ? noteAwaitingDeletion.titleText
                  : notebookCopy.untitledNote,
              )}
            </AlertDialog.Description>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <AlertDialog.Cancel asChild>
                <button type="button" className="quiet-action-button sanctuary-paper-quiet-button">
                  {notebookCopy.deleteConfirmationCancel}
                </button>
              </AlertDialog.Cancel>
              <button type="button" className="primary-action-button" onClick={confirmNoteDeletion}>
                <Trash size={18} weight="fill" aria-hidden="true" />
                {notebookCopy.deleteConfirmationConfirm}
              </button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </section>
  )
}

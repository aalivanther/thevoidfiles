import { useEffect, useId, useRef, useState } from 'react'
import { useInteractionFeedback } from '../../audio/interaction_feedback'
import { caseJournalCopy } from '../../copy/case_journal_copy'
import { countPlayerWrittenCharacters, sanitizePlayerWrittenText } from './case_journal_record'

type JournalWritingFieldProperties = {
  fieldLabel: string
  fieldHint?: string
  placeholderText: string
  writtenText: string
  maximumLength: number
  rowCount: number
  paperTone: 'paper' | 'dark'
  onWrittenTextChanged: (writtenText: string) => void
  onFieldLeft?: () => void
  onSubmitRequested?: () => void
}

const keyPulseMilliseconds = 120

export function JournalWritingField({
  fieldLabel,
  fieldHint,
  placeholderText,
  writtenText,
  maximumLength,
  rowCount,
  paperTone,
  onWrittenTextChanged,
  onFieldLeft,
  onSubmitRequested,
}: JournalWritingFieldProperties) {
  const playInteractionFeedback = useInteractionFeedback()
  const fieldIdentifier = useId()
  const [isKeyPulseVisible, setIsKeyPulseVisible] = useState(false)
  const keyPulseTimeoutIdentifier = useRef<number | null>(null)
  const writtenCount = countPlayerWrittenCharacters(writtenText)
  const isLimitReached = writtenCount >= maximumLength

  useEffect(
    () => () => {
      if (keyPulseTimeoutIdentifier.current !== null) {
        window.clearTimeout(keyPulseTimeoutIdentifier.current)
      }
    },
    [],
  )

  const showKeyPulse = () => {
    setIsKeyPulseVisible(true)
    if (keyPulseTimeoutIdentifier.current !== null) {
      window.clearTimeout(keyPulseTimeoutIdentifier.current)
    }
    keyPulseTimeoutIdentifier.current = window.setTimeout(() => setIsKeyPulseVisible(false), keyPulseMilliseconds)
  }

  return (
    <div className="journal-writing-field" data-paper-tone={paperTone}>
      <label htmlFor={fieldIdentifier} className="journal-writing-field-label">
        {fieldLabel}
      </label>
      {fieldHint ? (
        <p id={`${fieldIdentifier}-hint`} className="journal-writing-field-hint">
          {fieldHint}
        </p>
      ) : null}
      <textarea
        id={fieldIdentifier}
        className="journal-writing-field-input"
        data-key-pulse={isKeyPulseVisible}
        rows={rowCount}
        value={writtenText}
        placeholder={placeholderText}
        spellCheck={false}
        autoComplete="off"
        aria-describedby={`${fieldHint ? `${fieldIdentifier}-hint ` : ''}${fieldIdentifier}-count`}
        onChange={(changeEvent) => {
          const sanitizedText = sanitizePlayerWrittenText(changeEvent.target.value, maximumLength)
          const wasTextCutByLimit = countPlayerWrittenCharacters(changeEvent.target.value) > maximumLength
          if (sanitizedText === writtenText) {
            if (wasTextCutByLimit) {
              playInteractionFeedback('rejection')
            }
            return
          }
          playInteractionFeedback(wasTextCutByLimit ? 'rejection' : 'typewriter_key')
          showKeyPulse()
          onWrittenTextChanged(sanitizedText)
        }}
        onBlur={onFieldLeft}
        onKeyDown={(keyboardEvent) => {
          if (onSubmitRequested && keyboardEvent.key === 'Enter' && (keyboardEvent.ctrlKey || keyboardEvent.metaKey)) {
            keyboardEvent.preventDefault()
            onSubmitRequested()
          }
        }}
      />
      <p id={`${fieldIdentifier}-count`} className="journal-writing-field-count" data-limit-reached={isLimitReached}>
        <span aria-hidden="true">{caseJournalCopy.writingField.remainingCharacters(writtenCount, maximumLength)}</span>
        <span className="visually-hidden-text">
          {caseJournalCopy.writingField.remainingCharactersSpoken(maximumLength - writtenCount)}
        </span>
        {isLimitReached ? <span> · {caseJournalCopy.writingField.limitReached}</span> : null}
      </p>
    </div>
  )
}

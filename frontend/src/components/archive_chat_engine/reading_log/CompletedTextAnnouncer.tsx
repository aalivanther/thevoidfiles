import { useState } from 'react'
import { readingLogCopy } from '../../../copy/archive_chat_engine/reading_log_copy'
import type { ArchiveLogEntry } from '../../../game_state/archive_turn_contract'
import { readInvestigatorShortName, useChronicleState } from '../../../game_state/chronicle_state'
import { readPlainTextOfMarkedParagraphs } from './marked_paragraph_plain_text'
import { describeConfirmedEffect } from './confirmed_effect_description'

export type CompletedTextAnnouncerProperties = {
  completedLogEntries: ArchiveLogEntry[]
}

type CompletedTextAnnouncement = {
  announcementKey: string
  announcedText: string
  isUrgent: boolean
}

const maximumKeptAnnouncementCount = 8

function composeAnnouncedText(logEntry: ArchiveLogEntry, investigatorShortName: string): string | null {
  switch (logEntry.voice) {
    case 'director_narration':
      return readingLogCopy.directorNarratesAnnouncement(readPlainTextOfMarkedParagraphs(logEntry.markedParagraphs))
    case 'character_dialogue':
      return `${readingLogCopy.characterSpeaksWithDeliveryLabel(
        logEntry.speakerVisibleName,
        readingLogCopy.characterDeliveryLabels[logEntry.deliveryName],
      )} ${readPlainTextOfMarkedParagraphs(logEntry.markedParagraphs)}`
    case 'inner_thought':
      return readingLogCopy.labelledAnnouncement(
        readingLogCopy.innerThoughtCaptionLabels[logEntry.thoughtOriginName],
        readPlainTextOfMarkedParagraphs(logEntry.markedParagraphs),
      )
    case 'system_notice':
      return readingLogCopy.labelledAnnouncement(readingLogCopy.noticeCaptionLabel, logEntry.plainParagraphs.join(' '))
    case 'director_question':
      if (logEntry.answeredOptionIdentifier === null) {
        return readingLogCopy.directorQuestionRulesTheTurn.awaitedAnswerAnnouncement(
          logEntry.plainParagraphs.join(' '),
          Math.min(logEntry.answerOptions.length, 9),
        )
      }
      return readingLogCopy.labelledAnnouncement(
        readingLogCopy.directorQuestionCaptionLabel,
        logEntry.plainParagraphs.join(' '),
      )
    case 'investigator_entry':
      return readingLogCopy.investigatorDeclaresAnnouncement(
        investigatorShortName,
        logEntry.attemptedSteps.map((attemptedStep) => attemptedStep.actionText).join('. '),
      )
    case 'consequence_receipt':
      return readingLogCopy.labelledAnnouncement(
        readingLogCopy.consequenceReceiptCaptionLabel,
        logEntry.confirmedEffects.map(describeConfirmedEffect).join('. '),
      )
    case 'relationship_pulse':
    case 'interactive_piece_anchor':
      return null
  }
}

export function CompletedTextAnnouncer({ completedLogEntries }: CompletedTextAnnouncerProperties) {
  const { chronicleState } = useChronicleState()
  const investigatorShortName = readInvestigatorShortName(chronicleState.investigatorRegistration)
  const [alreadyAnnouncedIdentifiers, setAlreadyAnnouncedIdentifiers] = useState(
    () => new Set(completedLogEntries.map((logEntry) => logEntry.identifier)),
  )
  const [keptAnnouncements, setKeptAnnouncements] = useState<CompletedTextAnnouncement[]>([])

  const newlyCompletedLogEntries = completedLogEntries.filter(
    (logEntry) => !alreadyAnnouncedIdentifiers.has(logEntry.identifier),
  )
  if (newlyCompletedLogEntries.length > 0) {
    setAlreadyAnnouncedIdentifiers(
      new Set([...alreadyAnnouncedIdentifiers, ...newlyCompletedLogEntries.map((logEntry) => logEntry.identifier)]),
    )
    const newAnnouncements = newlyCompletedLogEntries.flatMap((logEntry) => {
      const announcedText = composeAnnouncedText(logEntry, investigatorShortName)
      return announcedText === null
        ? []
        : [
            {
              announcementKey: logEntry.identifier,
              announcedText,
              isUrgent: logEntry.voice === 'director_question' && logEntry.questionKindName === 'illogical_action_veto',
            },
          ]
    })
    if (newAnnouncements.length > 0) {
      setKeptAnnouncements((previousAnnouncements) =>
        [...previousAnnouncements, ...newAnnouncements].slice(-maximumKeptAnnouncementCount),
      )
    }
  }

  return (
    <>
      <div
        className="visually-hidden-text"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label={readingLogCopy.completedTextAnnouncementsLabel}
      >
        {keptAnnouncements
          .filter((keptAnnouncement) => !keptAnnouncement.isUrgent)
          .map((keptAnnouncement) => (
            <p key={keptAnnouncement.announcementKey}>{keptAnnouncement.announcedText}</p>
          ))}
      </div>
      <div className="visually-hidden-text" role="alert">
        {keptAnnouncements
          .filter((keptAnnouncement) => keptAnnouncement.isUrgent)
          .slice(-1)
          .map((keptAnnouncement) => (
            <p key={keptAnnouncement.announcementKey}>{keptAnnouncement.announcedText}</p>
          ))}
      </div>
    </>
  )
}

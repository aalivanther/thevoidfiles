import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { chooseAnimationVariantName } from '../../../animation/animation_variety'
import { useInteractionFeedback } from '../../../audio/interaction_feedback'
import { readingLogCopy } from '../../../copy/archive_chat_engine/reading_log_copy'
import type { ArchiveLogEntry } from '../../../game_state/archive_turn_contract'

export type ReadingLogEntryFrameProperties = {
  logEntry: ArchiveLogEntry
  hasArrivedDuringThisVisit: boolean
  continuesPreviousSpeaker: boolean
  shouldAnnounceDirectorLegend: boolean
  children: ReactNode
}

const entranceVariantNames = ['filed_from_below', 'slid_from_margin', 'pressed_onto_page', 'dropped_from_above'] as const

const logEntryIdentifiersWithArrivalSoundPlayed = new Set<string>()

function isLogEntryTextTypedProgressively(logEntry: ArchiveLogEntry): boolean {
  return (
    logEntry.voice === 'director_narration' || logEntry.voice === 'character_dialogue' || logEntry.voice === 'inner_thought'
  )
}

export function ReadingLogEntryFrame({
  logEntry,
  hasArrivedDuringThisVisit,
  continuesPreviousSpeaker,
  shouldAnnounceDirectorLegend,
  children,
}: ReadingLogEntryFrameProperties) {
  const playInteractionFeedback = useInteractionFeedback()
  const [entranceVariantName] = useState(() =>
    chooseAnimationVariantName(`reading_log_entry_entrance_${logEntry.voice}`, entranceVariantNames),
  )
  const shouldPlayEntrance = hasArrivedDuringThisVisit && !isLogEntryTextTypedProgressively(logEntry)
  const isVetoQuestion = logEntry.voice === 'director_question' && logEntry.questionKindName === 'illogical_action_veto'

  useEffect(() => {
    if (!hasArrivedDuringThisVisit || logEntryIdentifiersWithArrivalSoundPlayed.has(logEntry.identifier)) {
      return
    }
    if (logEntry.voice === 'consequence_receipt') {
      logEntryIdentifiersWithArrivalSoundPlayed.add(logEntry.identifier)
      playInteractionFeedback('stamp_impact', { volumeMultiplier: 0.45 })
    }
    if (isVetoQuestion) {
      logEntryIdentifiersWithArrivalSoundPlayed.add(logEntry.identifier)
      playInteractionFeedback('rejection')
    }
  }, [hasArrivedDuringThisVisit, isVetoQuestion, logEntry.identifier, logEntry.voice, playInteractionFeedback])

  return (
    <div
      className="reading-log-entry"
      data-log-entry-identifier={logEntry.identifier}
      data-voice-name={logEntry.voice}
      data-should-play-entrance={shouldPlayEntrance}
      data-entrance-variant={entranceVariantName}
      data-continues-previous-speaker={continuesPreviousSpeaker}
    >
      {shouldAnnounceDirectorLegend ? <p className="visually-hidden-text">{readingLogCopy.directorCaptionLabel}</p> : null}
      {children}
    </div>
  )
}

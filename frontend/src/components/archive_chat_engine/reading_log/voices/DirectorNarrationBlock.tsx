import { readingLogCopy } from '../../../../copy/archive_chat_engine/reading_log_copy'
import type { DirectorNarrationEntry } from '../../../../game_state/archive_turn_contract'
import { useDirectorNarrationVoice } from '../../../../voice/director_narration_voice'
import { useArchiveTurnFlow } from '../../archive_turn_flow_context'
import { RevealedVoiceText } from './RevealedVoiceText'

export type DirectorNarrationBlockProperties = {
  narrationEntry: DirectorNarrationEntry
  onRevealProgressed: () => void
}

export function DirectorNarrationBlock({ narrationEntry, onRevealProgressed }: DirectorNarrationBlockProperties) {
  const { revealPlaybackState } = useArchiveTurnFlow()
  useDirectorNarrationVoice(narrationEntry, revealPlaybackState.logEntryIdentifierBeingRevealed === narrationEntry.identifier)
  return (
    <div className="reading-log-director-narration narrative-prose">
      <p className="visually-hidden-text">{readingLogCopy.directorCaptionLabel}</p>
      <RevealedVoiceText
        logEntryIdentifier={narrationEntry.identifier}
        markedParagraphs={narrationEntry.markedParagraphs}
        baseCharactersPerSecondMultiplier={1}
        onRevealProgressed={onRevealProgressed}
      />
    </div>
  )
}

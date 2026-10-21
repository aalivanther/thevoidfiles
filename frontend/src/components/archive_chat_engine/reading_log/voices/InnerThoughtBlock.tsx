import { readingLogCopy } from '../../../../copy/archive_chat_engine/reading_log_copy'
import type { InnerThoughtEntry } from '../../../../game_state/archive_turn_contract'
import { RevealedVoiceText } from './RevealedVoiceText'

export type InnerThoughtBlockProperties = {
  thoughtEntry: InnerThoughtEntry
  onRevealProgressed: () => void
}

export function InnerThoughtBlock({ thoughtEntry, onRevealProgressed }: InnerThoughtBlockProperties) {
  return (
    <div className="reading-log-inner-thought" data-thought-origin-name={thoughtEntry.thoughtOriginName}>
      <p className="dossier-label reading-log-inner-thought-caption">
        {readingLogCopy.innerThoughtCaptionLabels[thoughtEntry.thoughtOriginName]}
      </p>
      <div className="reading-log-inner-thought-text narrative-prose">
        <RevealedVoiceText
          logEntryIdentifier={thoughtEntry.identifier}
          markedParagraphs={thoughtEntry.markedParagraphs}
          baseCharactersPerSecondMultiplier={0.8}
          onRevealProgressed={onRevealProgressed}
        />
      </div>
    </div>
  )
}

import { useInteractionFeedback } from '../../../../audio/interaction_feedback'
import { readingLogCopy } from '../../../../copy/archive_chat_engine/reading_log_copy'
import type { CharacterDialogueEntry } from '../../../../game_state/archive_turn_contract'
import { PersonSilhouetteMark } from './PersonSilhouetteMark'
import { RevealedVoiceText } from './RevealedVoiceText'

export type CharacterDialogueBlockProperties = {
  dialogueEntry: CharacterDialogueEntry
  isReadOnly: boolean
  onPersonDetailRequested: (personIdentifier: string) => void
  onRevealProgressed: () => void
}

const revealSpeedMultiplierByDeliveryName: Record<CharacterDialogueEntry['deliveryName'], number> = {
  spoken: 1,
  whispered: 0.85,
  shouted: 1.3,
  heard_from_afar: 0.9,
}

export function CharacterDialogueBlock({
  dialogueEntry,
  isReadOnly,
  onPersonDetailRequested,
  onRevealProgressed,
}: CharacterDialogueBlockProperties) {
  const playInteractionFeedback = useInteractionFeedback()
  const deliveryText = readingLogCopy.characterDeliveryLabels[dialogueEntry.deliveryName]
  const speakerCaption = (
    <>
      <span className="reading-log-dialogue-speaker-name">{dialogueEntry.speakerVisibleName}</span>
      <span className="reading-log-dialogue-delivery">{deliveryText}</span>
    </>
  )
  return (
    <div className="reading-log-character-dialogue" data-delivery-name={dialogueEntry.deliveryName}>
      <div className="reading-log-dialogue-heading">
        <PersonSilhouetteMark silhouetteName={dialogueEntry.speakerSilhouetteName} />
        {isReadOnly ? (
          <p className="reading-log-dialogue-speaker">{speakerCaption}</p>
        ) : (
          <button
            type="button"
            className="reading-log-dialogue-speaker reading-log-dialogue-speaker-button"
            aria-label={readingLogCopy.openSpeakerDetailLabel(dialogueEntry.speakerVisibleName)}
            onClick={() => {
              playInteractionFeedback('option_click')
              onPersonDetailRequested(dialogueEntry.speakerPersonIdentifier)
            }}
          >
            {speakerCaption}
          </button>
        )}
      </div>
      <div className="reading-log-dialogue-speech narrative-prose">
        <RevealedVoiceText
          logEntryIdentifier={dialogueEntry.identifier}
          markedParagraphs={dialogueEntry.markedParagraphs}
          baseCharactersPerSecondMultiplier={revealSpeedMultiplierByDeliveryName[dialogueEntry.deliveryName]}
          onRevealProgressed={onRevealProgressed}
        />
      </div>
    </div>
  )
}

import { useArchiveTurnFlow } from '../../archive_turn_flow_context'
import { MarkedTextReveal } from '../../narrative_markup/MarkedTextReveal'

export type RevealedVoiceTextProperties = {
  logEntryIdentifier: string
  markedParagraphs: string[]
  baseCharactersPerSecondMultiplier: number
  onRevealProgressed: () => void
}

export function RevealedVoiceText({
  logEntryIdentifier,
  markedParagraphs,
  baseCharactersPerSecondMultiplier,
  onRevealProgressed,
}: RevealedVoiceTextProperties) {
  const { revealPlaybackState, reportRevealReachedParagraph, reportRevealCompleted } = useArchiveTurnFlow()
  return (
    <MarkedTextReveal
      markedParagraphs={markedParagraphs}
      baseCharactersPerSecondMultiplier={baseCharactersPerSecondMultiplier}
      shouldAnimateReveal={revealPlaybackState.logEntryIdentifierBeingRevealed === logEntryIdentifier}
      isImmediateCompletionRequested={revealPlaybackState.isImmediateCompletionRequested}
      onParagraphReached={(paragraphIndex) => reportRevealReachedParagraph(logEntryIdentifier, paragraphIndex)}
      onRevealProgressed={onRevealProgressed}
      onRevealCompleted={() => reportRevealCompleted(logEntryIdentifier)}
    />
  )
}

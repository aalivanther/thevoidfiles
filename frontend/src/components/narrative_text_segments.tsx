export type NarrativeTextSegment = {
  visibleText: string
  isAnomalous: boolean
}

const anomalousWordPattern = /\[\[(.+?)\]\]/g

export function splitParagraphIntoNarrativeTextSegments(paragraphText: string): NarrativeTextSegment[] {
  const narrativeTextSegments: NarrativeTextSegment[] = []
  let lastProcessedPosition = 0
  for (const anomalousWordMatch of paragraphText.matchAll(anomalousWordPattern)) {
    const matchStartPosition = anomalousWordMatch.index
    if (matchStartPosition > lastProcessedPosition) {
      narrativeTextSegments.push({
        visibleText: paragraphText.slice(lastProcessedPosition, matchStartPosition),
        isAnomalous: false,
      })
    }
    narrativeTextSegments.push({ visibleText: anomalousWordMatch[1], isAnomalous: true })
    lastProcessedPosition = matchStartPosition + anomalousWordMatch[0].length
  }
  if (lastProcessedPosition < paragraphText.length) {
    narrativeTextSegments.push({ visibleText: paragraphText.slice(lastProcessedPosition), isAnomalous: false })
  }
  return narrativeTextSegments
}

export function countVisibleCharactersInParagraph(paragraphText: string): number {
  return splitParagraphIntoNarrativeTextSegments(paragraphText).reduce(
    (characterCount, narrativeTextSegment) => characterCount + narrativeTextSegment.visibleText.length,
    0,
  )
}

export function paragraphContainsAnomalousWord(paragraphText: string): boolean {
  return splitParagraphIntoNarrativeTextSegments(paragraphText).some(
    (narrativeTextSegment) => narrativeTextSegment.isAnomalous,
  )
}

type NarrativeParagraphProperties = {
  paragraphText: string
  visibleCharacterLimit?: number
  shouldShowCaret?: boolean
}

export function NarrativeParagraph({
  paragraphText,
  visibleCharacterLimit = Number.POSITIVE_INFINITY,
  shouldShowCaret = false,
}: NarrativeParagraphProperties) {
  let remainingCharacterAllowance = visibleCharacterLimit
  const renderedSegments = splitParagraphIntoNarrativeTextSegments(paragraphText).map(
    (narrativeTextSegment, segmentIndex) => {
      const visiblePortion = narrativeTextSegment.visibleText.slice(0, Math.max(0, remainingCharacterAllowance))
      remainingCharacterAllowance -= narrativeTextSegment.visibleText.length
      if (visiblePortion.length === 0) {
        return null
      }
      return narrativeTextSegment.isAnomalous ? (
        <span key={segmentIndex} className="anomalous-word">
          {visiblePortion}
        </span>
      ) : (
        <span key={segmentIndex}>{visiblePortion}</span>
      )
    },
  )
  return (
    <p>
      {renderedSegments}
      {shouldShowCaret ? <span className="typewriter-caret" aria-hidden="true" /> : null}
    </p>
  )
}

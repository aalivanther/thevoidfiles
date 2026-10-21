import { parseMarkedNarrativeParagraph } from '../narrative_markup/narrative_markup_parser'

export function readPlainTextOfMarkedParagraphs(markedParagraphs: readonly string[]): string {
  return markedParagraphs
    .map((markedParagraphText) =>
      parseMarkedNarrativeParagraph(markedParagraphText)
        .map((markedSegment) => markedSegment.visibleText)
        .join(''),
    )
    .join(' ')
}

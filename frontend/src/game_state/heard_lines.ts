import { formatWorldClock } from './chronicle_state'

const markupSpanPattern = /\[\[([^[\]]*)\]\]/g
const droppedMarkupTagNames = new Set(['pausa', 'temblor', 'latido', 'interferencia', 'tinta', 'reescrito', 'censura'])

function stripMarkupSpans(visibleText: string): string {
  return visibleText
    .replace(markupSpanPattern, (_matchedText, insideText: string) => {
      const tagName = insideText.trim().split(':')[0]?.trim().toLowerCase() ?? ''
      return droppedMarkupTagNames.has(tagName) ? '' : insideText.trim()
    })
    .replace(/\s+/g, ' ')
    .trim()
}

export function readHeardLineSentences(
  directorEntries: ReadonlyArray<{ voice: string; speakerVisibleName?: string; markedParagraphs?: string[] }>,
  placeName: string,
  worldClockMinutes: number,
): string[] {
  const clockLabel = formatWorldClock(worldClockMinutes)
  const cleanedPlaceName = placeName.trim()
  const sentences: string[] = []
  for (const directorEntry of directorEntries) {
    if (directorEntry.voice !== 'character_dialogue') {
      continue
    }
    const speakerVisibleName = directorEntry.speakerVisibleName?.trim() ?? ''
    if (speakerVisibleName === '') {
      continue
    }
    const spokenText = (directorEntry.markedParagraphs ?? [])
      .map((markedParagraph) => stripMarkupSpans(markedParagraph))
      .filter((markedParagraph) => markedParagraph !== '')
      .join(' ')
    if (spokenText === '') {
      continue
    }
    sentences.push(
      cleanedPlaceName === ''
        ? `A las ${clockLabel}, ${speakerVisibleName} dijo: ${spokenText}`
        : `A las ${clockLabel}, en ${cleanedPlaceName}, ${speakerVisibleName} dijo: ${spokenText}`,
    )
  }
  return sentences
}

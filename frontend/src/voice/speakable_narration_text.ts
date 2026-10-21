const markedSpanPattern = /\[\[([^[\]]{1,160})\]\]/g
const silentTagNames = new Set(['pausa', 'censura', 'tachado'])
const sentenceBoundaryPattern = /(?<=[.!?…»”])\s+/

function normalizeTagText(tagText: string): string {
  return tagText
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

function readSpeakableTextFromMarkedSpan(spanContent: string): string {
  const separatorIndex = spanContent.indexOf(':')
  if (separatorIndex <= 0) {
    return spanContent
  }
  const tagNames = spanContent.slice(0, separatorIndex).split('+').map(normalizeTagText)
  const argumentText = spanContent.slice(separatorIndex + 1)
  if (tagNames.some((tagName) => silentTagNames.has(tagName))) {
    return ' '
  }
  if (tagNames.includes('reescrito')) {
    const [textBeforeRewriting, textAfterRewriting] = argumentText.split('|')
    return textAfterRewriting ?? textBeforeRewriting
  }
  return argumentText
}

export function convertMarkedParagraphToSpeakableText(markedParagraphText: string): string {
  return markedParagraphText
    .replace(markedSpanPattern, (_wholeSpan, spanContent: string) => readSpeakableTextFromMarkedSpan(spanContent))
    .replaceAll('[[', '')
    .replaceAll(']]', '')
    .replace(/█+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function splitSpeakableTextIntoRequests(speakableText: string, maximumRequestLength: number): string[] {
  if (speakableText.length <= maximumRequestLength) {
    return speakableText.length > 0 ? [speakableText] : []
  }
  const requestTexts: string[] = []
  let currentRequestText = ''
  for (const sentenceText of speakableText.split(sentenceBoundaryPattern)) {
    const joinedText = currentRequestText ? `${currentRequestText} ${sentenceText}` : sentenceText
    if (joinedText.length <= maximumRequestLength) {
      currentRequestText = joinedText
      continue
    }
    if (currentRequestText) {
      requestTexts.push(currentRequestText)
    }
    let remainingSentenceText = sentenceText
    while (remainingSentenceText.length > maximumRequestLength) {
      requestTexts.push(remainingSentenceText.slice(0, maximumRequestLength))
      remainingSentenceText = remainingSentenceText.slice(maximumRequestLength)
    }
    currentRequestText = remainingSentenceText
  }
  if (currentRequestText) {
    requestTexts.push(currentRequestText)
  }
  return requestTexts
}

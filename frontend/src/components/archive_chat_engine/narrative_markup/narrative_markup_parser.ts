import {
  forbiddenInvisibleCodePointRanges,
  longSpanNarrativeTextEffectNames,
  narrativeMarkupLimits,
  narrativeTextEffectNameBySpanishTag,
  redactedBlockCharacter,
} from './narrative_markup_effect_catalog'
import type { NarrativeTextEffectName } from './narrative_markup_effect_catalog'

export type { NarrativeTextEffectName } from './narrative_markup_effect_catalog'

export type MarkedNarrativeSegment = {
  visibleText: string
  effectNames: NarrativeTextEffectName[]
  textBeforeRewriting: string | null
  pauseMilliseconds: number
}

const markedSpanPattern = new RegExp(
  `\\[\\[([^\\[\\]]{1,${narrativeMarkupLimits.maximumMarkedSpanContentLength}})\\]\\]`,
  'g',
)
const singleTagWordPattern = /^[a-z]+$/
const combiningDiacriticalMarkPattern = /\p{Diacritic}/gu
const alreadyWarnedMarkupProblems = new Set<string>()

function warnAboutMarkupProblemDuringDevelopment(problemDescription: string, offendingText: string) {
  if (!import.meta.env?.DEV) {
    return
  }
  const warningKey = `${problemDescription}|${offendingText}`
  if (alreadyWarnedMarkupProblems.has(warningKey) || alreadyWarnedMarkupProblems.size > 200) {
    return
  }
  alreadyWarnedMarkupProblems.add(warningKey)
  console.warn(`[narrative markup] ${problemDescription}: ${offendingText}`)
}

export function countCharactersInVisibleText(visibleText: string): number {
  return Array.from(visibleText).length
}

function removeForbiddenInvisibleCharacters(rawText: string): string {
  return Array.from(rawText.replace(/\r\n?/g, '\n'))
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0
      return !forbiddenInvisibleCodePointRanges.some(
        ([firstForbiddenCodePoint, lastForbiddenCodePoint]) =>
          codePoint >= firstForbiddenCodePoint && codePoint <= lastForbiddenCodePoint,
      )
    })
    .join('')
}

function removeOrphanMarkupBrackets(visibleText: string): string {
  let cleanedText = visibleText
  for (let passCount = 0; passCount < 8 && (cleanedText.includes('[[') || cleanedText.includes(']]')); passCount += 1) {
    cleanedText = cleanedText.replaceAll('[[', '').replaceAll(']]', '')
  }
  return cleanedText.includes('[[') || cleanedText.includes(']]') ? cleanedText.replace(/[[\]]/g, '') : cleanedText
}

function normalizeTagText(tagText: string): string {
  return tagText.trim().toLowerCase().normalize('NFD').replace(combiningDiacriticalMarkPattern, '')
}

function createPlainSegment(visibleText: string): MarkedNarrativeSegment {
  return { visibleText, effectNames: [], textBeforeRewriting: null, pauseMilliseconds: 0 }
}

function createLegacyAnomalousSegment(spanContent: string): MarkedNarrativeSegment {
  if (countCharactersInVisibleText(spanContent) > narrativeMarkupLimits.maximumSpanCharacterCount) {
    warnAboutMarkupProblemDuringDevelopment('span longer than allowed, shown as plain text', spanContent)
    return createPlainSegment(spanContent)
  }
  return { ...createPlainSegment(spanContent), effectNames: ['anomalous'] }
}

function readWholeNumber(argumentText: string): number | null {
  const trimmedArgumentText = argumentText.trim()
  if (!/^\d{1,6}$/.test(trimmedArgumentText)) {
    return null
  }
  return Number.parseInt(trimmedArgumentText, 10)
}

function clampNumber(value: number, minimumValue: number, maximumValue: number): number {
  return Math.min(maximumValue, Math.max(minimumValue, value))
}

function readAllowedSpanCharacterCount(effectNames: NarrativeTextEffectName[]): number {
  const areAllEffectsAllowedOnLongSpans = effectNames.every((effectName) =>
    longSpanNarrativeTextEffectNames.includes(effectName),
  )
  return areAllEffectsAllowedOnLongSpans
    ? narrativeMarkupLimits.maximumLongSpanCharacterCount
    : narrativeMarkupLimits.maximumSpanCharacterCount
}

function readKnownEffectNames(normalizedTagTexts: string[]): NarrativeTextEffectName[] {
  const knownEffectNames: NarrativeTextEffectName[] = []
  for (const normalizedTagText of normalizedTagTexts) {
    const effectName = Object.hasOwn(narrativeTextEffectNameBySpanishTag, normalizedTagText)
      ? narrativeTextEffectNameBySpanishTag[normalizedTagText]
      : undefined
    if (!effectName) {
      warnAboutMarkupProblemDuringDevelopment('unknown tag discarded', normalizedTagText)
      continue
    }
    const isOppositeRevealRateAlreadyPresent =
      (effectName === 'slow_reveal' && knownEffectNames.includes('fast_reveal')) ||
      (effectName === 'fast_reveal' && knownEffectNames.includes('slow_reveal'))
    if (!knownEffectNames.includes(effectName) && !isOppositeRevealRateAlreadyPresent) {
      knownEffectNames.push(effectName)
    }
  }
  return knownEffectNames.slice(0, narrativeMarkupLimits.maximumCombinedEffectCountPerSpan)
}

function createSegmentFromMarkedSpan(spanContent: string): MarkedNarrativeSegment | null {
  const separatorIndex = spanContent.indexOf(':')
  if (separatorIndex <= 0) {
    return createLegacyAnomalousSegment(spanContent)
  }
  const normalizedTagTexts = spanContent.slice(0, separatorIndex).split('+').map(normalizeTagText)
  const rawArgumentText = spanContent.slice(separatorIndex + 1)
  const doesPrefixLookLikeTagList = normalizedTagTexts.every((normalizedTagText) =>
    singleTagWordPattern.test(normalizedTagText),
  )
  if (!doesPrefixLookLikeTagList) {
    return createLegacyAnomalousSegment(spanContent)
  }
  const isAnyTagKnown = normalizedTagTexts.some((normalizedTagText) =>
    Object.hasOwn(narrativeTextEffectNameBySpanishTag, normalizedTagText),
  )
  if (!isAnyTagKnown && /^\s/.test(rawArgumentText)) {
    return createLegacyAnomalousSegment(spanContent)
  }
  const argumentText = rawArgumentText.trimStart()
  const effectNames = readKnownEffectNames(normalizedTagTexts)
  if (effectNames.length === 0) {
    return argumentText.length > 0 ? createPlainSegment(argumentText) : null
  }
  if (effectNames.includes('pause')) {
    const requestedPauseMilliseconds = readWholeNumber(argumentText)
    if (requestedPauseMilliseconds === null) {
      warnAboutMarkupProblemDuringDevelopment('pause without a number discarded', spanContent)
      return null
    }
    return {
      visibleText: '',
      effectNames: ['pause'],
      textBeforeRewriting: null,
      pauseMilliseconds: clampNumber(
        requestedPauseMilliseconds,
        narrativeMarkupLimits.minimumPauseMilliseconds,
        narrativeMarkupLimits.maximumPauseMilliseconds,
      ),
    }
  }
  if (effectNames.includes('redacted')) {
    const requestedCharacterCount = readWholeNumber(argumentText) ?? countCharactersInVisibleText(argumentText)
    const redactedCharacterCount = clampNumber(
      requestedCharacterCount,
      narrativeMarkupLimits.minimumRedactedCharacterCount,
      narrativeMarkupLimits.maximumRedactedCharacterCount,
    )
    return { ...createPlainSegment(redactedBlockCharacter.repeat(redactedCharacterCount)), effectNames: ['redacted'] }
  }
  if (argumentText.length === 0) {
    return null
  }
  if (effectNames.includes('rewritten')) {
    const alternativeSeparatorIndex = argumentText.indexOf('|')
    const textBeforeRewriting =
      alternativeSeparatorIndex >= 0 ? argumentText.slice(0, alternativeSeparatorIndex).trim() : ''
    const textAfterRewriting =
      alternativeSeparatorIndex >= 0 ? argumentText.slice(alternativeSeparatorIndex + 1).replaceAll('|', ' ').trim() : ''
    const effectNamesWithoutRewriting = effectNames.filter((effectName) => effectName !== 'rewritten')
    if (textBeforeRewriting.length === 0 || textAfterRewriting.length === 0) {
      warnAboutMarkupProblemDuringDevelopment('rewritten span without both texts', spanContent)
      const remainingVisibleText = textAfterRewriting || textBeforeRewriting || argumentText.replaceAll('|', ' ').trim()
      return remainingVisibleText.length > 0
        ? { ...createPlainSegment(remainingVisibleText), effectNames: effectNamesWithoutRewriting }
        : null
    }
    const allowedCharacterCount = readAllowedSpanCharacterCount(effectNames)
    if (
      countCharactersInVisibleText(textBeforeRewriting) > allowedCharacterCount ||
      countCharactersInVisibleText(textAfterRewriting) > allowedCharacterCount
    ) {
      warnAboutMarkupProblemDuringDevelopment('span longer than allowed, shown as plain text', spanContent)
      return createPlainSegment(textAfterRewriting)
    }
    return { visibleText: textAfterRewriting, effectNames, textBeforeRewriting, pauseMilliseconds: 0 }
  }
  if (countCharactersInVisibleText(argumentText) > readAllowedSpanCharacterCount(effectNames)) {
    warnAboutMarkupProblemDuringDevelopment('span longer than allowed, shown as plain text', spanContent)
    return createPlainSegment(argumentText)
  }
  return { ...createPlainSegment(argumentText), effectNames }
}

export function removeEffectsFromSegment(segment: MarkedNarrativeSegment): MarkedNarrativeSegment {
  return createPlainSegment(segment.visibleText)
}

export function mergeAdjacentPlainSegments(segments: MarkedNarrativeSegment[]): MarkedNarrativeSegment[] {
  const mergedSegments: MarkedNarrativeSegment[] = []
  for (const segment of segments) {
    const previousSegment = mergedSegments[mergedSegments.length - 1]
    const isPlainSegment = segment.effectNames.length === 0 && segment.pauseMilliseconds === 0
    const isPreviousSegmentPlain =
      previousSegment !== undefined && previousSegment.effectNames.length === 0 && previousSegment.pauseMilliseconds === 0
    if (isPlainSegment && isPreviousSegmentPlain) {
      mergedSegments[mergedSegments.length - 1] = createPlainSegment(
        removeOrphanMarkupBrackets(previousSegment.visibleText + segment.visibleText),
      )
    } else {
      mergedSegments.push(segment)
    }
  }
  return mergedSegments
}

function applyParagraphBudget(segments: MarkedNarrativeSegment[]): MarkedNarrativeSegment[] {
  let markedSpanCount = 0
  return segments.map((segment) => {
    if (segment.effectNames.length === 0 || segment.effectNames.includes('pause')) {
      return segment
    }
    markedSpanCount += 1
    if (markedSpanCount > narrativeMarkupLimits.maximumMarkedSpanCountPerParagraph) {
      warnAboutMarkupProblemDuringDevelopment('paragraph budget exceeded, shown as plain text', segment.visibleText)
      return removeEffectsFromSegment(segment)
    }
    return segment
  })
}

function parseSanitizedParagraph(sanitizedParagraphText: string): MarkedNarrativeSegment[] {
  const segments: MarkedNarrativeSegment[] = []
  let lastConsumedIndex = 0
  for (const spanMatch of sanitizedParagraphText.matchAll(markedSpanPattern)) {
    const spanStartIndex = spanMatch.index ?? 0
    if (spanStartIndex > lastConsumedIndex) {
      segments.push(createPlainSegment(sanitizedParagraphText.slice(lastConsumedIndex, spanStartIndex)))
    }
    const markedSegment = createSegmentFromMarkedSpan(spanMatch[1])
    if (markedSegment) {
      segments.push(markedSegment)
    }
    lastConsumedIndex = spanStartIndex + spanMatch[0].length
  }
  if (lastConsumedIndex < sanitizedParagraphText.length) {
    segments.push(createPlainSegment(sanitizedParagraphText.slice(lastConsumedIndex)))
  }
  const segmentsWithoutOrphanBrackets = segments
    .map((segment) => ({
      ...segment,
      visibleText: removeOrphanMarkupBrackets(segment.visibleText),
      textBeforeRewriting:
        segment.textBeforeRewriting === null ? null : removeOrphanMarkupBrackets(segment.textBeforeRewriting),
    }))
    .filter((segment) => segment.visibleText.length > 0 || segment.pauseMilliseconds > 0)
  return mergeAdjacentPlainSegments(applyParagraphBudget(segmentsWithoutOrphanBrackets))
    .map((segment) =>
      segment.effectNames.length === 0 ? { ...segment, visibleText: removeOrphanMarkupBrackets(segment.visibleText) } : segment,
    )
    .filter((segment) => segment.visibleText.length > 0 || segment.pauseMilliseconds > 0)
}

export function parseMarkedNarrativeParagraph(markedParagraphText: string): MarkedNarrativeSegment[] {
  if (typeof markedParagraphText !== 'string' || markedParagraphText.length === 0) {
    return []
  }
  try {
    return parseSanitizedParagraph(removeForbiddenInvisibleCharacters(markedParagraphText))
  } catch {
    const fallbackVisibleText = removeOrphanMarkupBrackets(markedParagraphText)
    return fallbackVisibleText.length > 0 ? [createPlainSegment(fallbackVisibleText)] : []
  }
}

export function countVisibleCharactersInSegments(segments: MarkedNarrativeSegment[]): number {
  return segments.reduce(
    (characterCount, segment) => characterCount + countCharactersInVisibleText(segment.visibleText),
    0,
  )
}

export function countVisibleCharactersInMarkedParagraph(markedParagraphText: string): number {
  return countVisibleCharactersInSegments(parseMarkedNarrativeParagraph(markedParagraphText))
}

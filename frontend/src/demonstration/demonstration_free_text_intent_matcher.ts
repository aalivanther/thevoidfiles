export type FreePlanSegment =
  | { kind: 'suggestion_reference'; suggestionNumber: number; conditionText: string | null }
  | { kind: 'free_text'; actionText: string; conditionText: string | null }

export type PlanConditionKindName =
  | 'time_remains'
  | 'renata_is_present'
  | 'boatman_waits'
  | 'investigator_is_wounded'
  | 'scene_is_not_dangerous'
  | 'unrecognized'

export type ClassifiedPlanCondition = { kindName: PlanConditionKindName; isNegated: boolean }

export type IntentCandidate<CandidateIdentifier extends string = string> = {
  candidateIdentifier: CandidateIdentifier
  patternSources: string[]
}

const combiningMarkPattern = /[\u0300-\u036f]/g

function foldCharacter(character: string): string {
  const foldedCharacter = character.normalize('NFD').replace(combiningMarkPattern, '').toLowerCase()
  return foldedCharacter.length === 1 ? foldedCharacter : character.toLowerCase().charAt(0) || ' '
}

export function foldSpanishText(originalText: string): string {
  return Array.from(originalText).map(foldCharacter).join('')
}

const numericRunPattern = /\b\d{1,2}(?:\s*(?:-|–|—|,|;|>|y luego|luego|despues|y|e)\s*\d{1,2})*\b/g
const measuredUnitAfterNumberPattern =
  /^\s*(?:minutos?|horas?|metros?|pasos|peldanos?|escalones?|destellos?|veces|anos?|bengalas?|bolsas?|segundos?|de la (?:manana|madrugada|noche))\b/
const strongSeparatorPattern =
  /[.;\n]+|,?\s+(?:y\s+)?(?:luego|despues|entonces|a continuacion|acto seguido|una vez (?:ahi|alli|alla|dentro|arriba|abajo|en el lugar))\b,?/g
const leadingConnectivePattern =
  /^(?:[\s,:]+|(?:y|e|pero|luego|despues|entonces|primero|por ultimo|finalmente|al final|hago|hare|realizo|ejecuto|elijo|escojo|voy con|sigo con|pasos?|opcion(?:es)?|sugerencias?|numeros?|numero)\b)+/
const trailingConnectivePattern =
  /(?:[\s,:]+|\b(?:y|e|luego|despues|entonces|hago|hare|realizo|ejecuto|elijo|escojo|las?|los?|el|pasos?|opcion(?:es)?|acciones|accion|sugerencias?|numeros?|numero))+$/
const conditionClausePattern =
  /(?:^|[\s,])((?:pero\s+)?(?:y\s+)?(?:solo|solamente|unicamente)?\s*(?:si|siempre que|siempre y cuando|mientras|a menos que|salvo que|salvo si|excepto si)\b.+)$/

type TextSlice = { startIndex: number; endIndex: number }

type NumericRun = TextSlice & { suggestionNumbers: number[] }

function findValidNumericRuns(foldedText: string, availableSuggestionCount: number): NumericRun[] {
  const numericRuns: NumericRun[] = []
  for (const runMatch of foldedText.matchAll(numericRunPattern)) {
    const startIndex = runMatch.index
    const endIndex = startIndex + runMatch[0].length
    const characterBefore = foldedText.charAt(startIndex - 1)
    const characterAfter = foldedText.charAt(endIndex)
    const suggestionNumbers = (runMatch[0].match(/\d{1,2}/g) ?? []).map(Number)
    const areAllNumbersAvailable = suggestionNumbers.every(
      (suggestionNumber) => suggestionNumber >= 1 && suggestionNumber <= availableSuggestionCount,
    )
    if (
      !areAllNumbersAvailable ||
      characterBefore === ':' ||
      characterAfter === ':' ||
      characterBefore === '.' && /\d/.test(foldedText.charAt(startIndex - 2)) ||
      measuredUnitAfterNumberPattern.test(foldedText.slice(endIndex))
    ) {
      continue
    }
    numericRuns.push({ startIndex, endIndex, suggestionNumbers })
  }
  return numericRuns
}

function trimSliceWithPattern(foldedText: string, textSlice: TextSlice): TextSlice {
  let { startIndex, endIndex } = textSlice
  const leadingMatch = foldedText.slice(startIndex, endIndex).match(leadingConnectivePattern)
  if (leadingMatch) {
    startIndex += leadingMatch[0].length
  }
  const trailingMatch = foldedText.slice(startIndex, endIndex).match(trailingConnectivePattern)
  if (trailingMatch) {
    endIndex -= trailingMatch[0].length
  }
  while (startIndex < endIndex && /[\s,:]/.test(foldedText.charAt(startIndex))) {
    startIndex += 1
  }
  while (endIndex > startIndex && /[\s,:]/.test(foldedText.charAt(endIndex - 1))) {
    endIndex -= 1
  }
  return { startIndex, endIndex }
}

function splitSliceOnStrongSeparators(foldedText: string, textSlice: TextSlice): TextSlice[] {
  const sliceText = foldedText.slice(textSlice.startIndex, textSlice.endIndex)
  const resultingSlices: TextSlice[] = []
  let cursorIndex = 0
  for (const separatorMatch of sliceText.matchAll(strongSeparatorPattern)) {
    resultingSlices.push({ startIndex: textSlice.startIndex + cursorIndex, endIndex: textSlice.startIndex + separatorMatch.index })
    cursorIndex = separatorMatch.index + separatorMatch[0].length
  }
  resultingSlices.push({ startIndex: textSlice.startIndex + cursorIndex, endIndex: textSlice.endIndex })
  return resultingSlices
}

function countLetters(someText: string): number {
  return (someText.match(/[a-zñ]/g) ?? []).length
}

type ParsedChunk =
  | { kind: 'action'; actionSlice: TextSlice; conditionSlice: TextSlice | null }
  | { kind: 'condition_only'; conditionSlice: TextSlice }

function parseChunk(foldedText: string, chunkSlice: TextSlice): ParsedChunk | null {
  const trimmedSlice = trimSliceWithPattern(foldedText, chunkSlice)
  const chunkText = foldedText.slice(trimmedSlice.startIndex, trimmedSlice.endIndex)
  if (countLetters(chunkText) < 3) {
    return null
  }
  const conditionMatch = chunkText.match(conditionClausePattern)
  if (!conditionMatch || conditionMatch.index === undefined) {
    return { kind: 'action', actionSlice: trimmedSlice, conditionSlice: null }
  }
  const conditionStartIndex = trimmedSlice.startIndex + conditionMatch.index + (conditionMatch[0].length - conditionMatch[1].length)
  const conditionSlice = trimSliceWithPattern(foldedText, { startIndex: conditionStartIndex, endIndex: trimmedSlice.endIndex })
  const actionSlice = trimSliceWithPattern(foldedText, { startIndex: trimmedSlice.startIndex, endIndex: conditionStartIndex })
  if (countLetters(foldedText.slice(actionSlice.startIndex, actionSlice.endIndex)) < 3) {
    return { kind: 'condition_only', conditionSlice }
  }
  return { kind: 'action', actionSlice, conditionSlice }
}

export function splitFreeTextIntoPlanSegments(freeText: string, availableSuggestionCount: number): FreePlanSegment[] {
  const originalCharacters = Array.from(freeText)
  const foldedText = originalCharacters.map(foldCharacter).join('')
  const readOriginalText = (textSlice: TextSlice) =>
    originalCharacters.slice(textSlice.startIndex, textSlice.endIndex).join('').trim()
  const numericRuns = findValidNumericRuns(foldedText, availableSuggestionCount)
  const planSegments: FreePlanSegment[] = []
  let conditionAwaitingNextReference: string | null = null

  const consumeTextBetweenRuns = (betweenSlice: TextSlice, isFollowedByNumericRun: boolean) => {
    const parsedChunks = splitSliceOnStrongSeparators(foldedText, betweenSlice)
      .map((chunkSlice) => parseChunk(foldedText, chunkSlice))
      .filter((parsedChunk): parsedChunk is ParsedChunk => parsedChunk !== null)
    parsedChunks.forEach((parsedChunk, chunkIndex) => {
      if (parsedChunk.kind === 'action') {
        planSegments.push({
          kind: 'free_text',
          actionText: readOriginalText(parsedChunk.actionSlice),
          conditionText: parsedChunk.conditionSlice ? readOriginalText(parsedChunk.conditionSlice) : null,
        })
        return
      }
      const conditionText = readOriginalText(parsedChunk.conditionSlice)
      const isLastChunk = chunkIndex === parsedChunks.length - 1
      const previousSegment = planSegments[planSegments.length - 1]
      if (isLastChunk && isFollowedByNumericRun) {
        conditionAwaitingNextReference = conditionText
      } else if (previousSegment && previousSegment.conditionText === null) {
        previousSegment.conditionText = conditionText
      }
    })
  }

  let cursorIndex = 0
  for (const numericRun of numericRuns) {
    consumeTextBetweenRuns({ startIndex: cursorIndex, endIndex: numericRun.startIndex }, true)
    numericRun.suggestionNumbers.forEach((suggestionNumber, numberIndex) => {
      planSegments.push({
        kind: 'suggestion_reference',
        suggestionNumber,
        conditionText: numberIndex === 0 ? conditionAwaitingNextReference : null,
      })
    })
    conditionAwaitingNextReference = null
    cursorIndex = numericRun.endIndex
  }
  consumeTextBetweenRuns({ startIndex: cursorIndex, endIndex: foldedText.length }, false)
  return planSegments
}

export function findBestMatchingIntent<CandidateIdentifier extends string>(
  freeText: string,
  intentCandidates: ReadonlyArray<IntentCandidate<CandidateIdentifier>>,
): CandidateIdentifier | null {
  const foldedText = foldSpanishText(freeText)
  let bestCandidateIdentifier: CandidateIdentifier | null = null
  let bestMatchedPatternCount = 0
  for (const intentCandidate of intentCandidates) {
    const matchedPatternCount = intentCandidate.patternSources.filter((patternSource) =>
      new RegExp(patternSource, 'i').test(foldedText),
    ).length
    if (matchedPatternCount > bestMatchedPatternCount) {
      bestMatchedPatternCount = matchedPatternCount
      bestCandidateIdentifier = intentCandidate.candidateIdentifier
    }
  }
  return bestCandidateIdentifier
}

export function doesFreeTextMatchAnyPattern(freeText: string, patternSources: readonly string[]): boolean {
  const foldedText = foldSpanishText(freeText)
  return patternSources.some((patternSource) => new RegExp(patternSource, 'i').test(foldedText))
}

const actionWithoutMethodPattern =
  /^\s*(?:(?:lo|la|le|los|las)\s+)?(?:ataco|atacar|ataca|ataque|peleo|pelear|lucho|luchar|disparo|disparar|golpeo|golpear|mato|matar|destruyo|destruir|lo resuelvo|resuelvo|gano|hago algo|actuo|uso mis poderes)(?:\s+(?:ya|ahora|fuerte|con todo))?\s*[.!¡]*\s*$/

export function isActionTextWithoutMethod(actionText: string): boolean {
  return actionWithoutMethodPattern.test(foldSpanishText(actionText))
}

const objectNeverCarriedPattern =
  /\b(pistola|revolver|rifle|escopeta|fusil|arma de fuego|granada|dinamita|explosivos?|lanzallamas|espada|katana|helicoptero|dron|telefono satelital|varita|hechizo|conjuro)\b/

export function findMentionOfObjectNeverCarried(actionText: string): string | null {
  const objectMatch = foldSpanishText(actionText).match(objectNeverCarriedPattern)
  return objectMatch ? objectMatch[1] : null
}

const preparationPattern =
  /\b(antes de llegar|preparandome|me preparo|prepararme|preparo (?:el|mi) equipo|reviso (?:el|mi) equipo|repaso (?:el|mi) equipo|compruebo (?:el|mi) equipo|respiro hondo|me mentalizo)\b/

export function isPreparationText(actionText: string): boolean {
  return preparationPattern.test(foldSpanishText(actionText))
}

export function classifyPlanCondition(conditionText: string): ClassifiedPlanCondition {
  const foldedCondition = foldSpanishText(conditionText)
  const isNegated = /\b(a menos que|salvo que|salvo si|excepto si)\b/.test(foldedCondition) !== /\bsi no\b|\bno (?:esta|hay|queda|sobra|tengo|espera|sigue)\b/.test(foldedCondition)
  if (/(sobra|queda|hay|tengo|da|alcanza)\w* (?:el |algo de |mas )?tiempo|antes del? (?:amanecer|alba)|no es tarde|me da tiempo/.test(foldedCondition)) {
    return { kindName: 'time_remains', isNegated }
  }
  if (/(renata|la mujer|ella)\b.*\b(esta|delante|presente|cerca|conmigo|mira|acompana)/.test(foldedCondition)) {
    return { kindName: 'renata_is_present', isNegated }
  }
  if (/lanchero\b.*\b(espera|sigue|esta|aguarda)/.test(foldedCondition)) {
    return { kindName: 'boatman_waits', isNegated }
  }
  if (/\b(herid\w*|lastimad\w*|sangr\w*|herida grave)\b/.test(foldedCondition)) {
    return { kindName: 'investigator_is_wounded', isNegated }
  }
  if (/\b(segur\w*|sin peligro|hay peligro|tranquil\w*|a salvo)\b/.test(foldedCondition)) {
    return { kindName: 'scene_is_not_dangerous', isNegated: /\bhay peligro\b/.test(foldedCondition) ? !isNegated : isNegated }
  }
  return { kindName: 'unrecognized', isNegated: false }
}

export function sanitizeQuotedPlayerText(playerText: string): string {
  const cleanedText = playerText.replace(/[[\]{}]/g, '').replace(/\s+/g, ' ').trim()
  return cleanedText.length > 120 ? `${cleanedText.slice(0, 117).trimEnd()}…` : cleanedText
}

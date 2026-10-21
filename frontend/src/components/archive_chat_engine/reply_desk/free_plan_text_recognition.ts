export type RecognisedPlanFragment =
  | { kind: 'own_words'; actionText: string; conditionText: string | null }
  | { kind: 'suggestion_reference'; suggestionNumber: number; conditionText: string | null }

export type FreePlanTextRecognition = {
  fragments: RecognisedPlanFragment[]
  referencedSuggestionNumbers: number[]
}

type NumberToken = {
  startIndex: number
  endIndex: number
  numericValue: number
  isPlausibleSuggestionReference: boolean
}

type NumberTokenGroup = {
  startIndex: number
  endIndex: number
  numberTokens: NumberToken[]
}

const separatorBetweenReferencedNumbersPattern =
  /^\s*(?:[-–—,;>→/]|,\s*y|,\s*luego|y\s+luego|y\s+después|y\s+despues|y|e|luego|después|despues)?\s*$/iu

const measuredThingAfterNumberPattern =
  /^\s*(?:minutos?|horas?|segundos?|días?|dias?|semanas?|mes(?:es)?|años?|metros?|kilómetros?|kilometros?|km|cm|m|pasos?|veces|vez|personas?|hombres?|mujeres?|pisos?|puertas?|ventanas?|nombres?|monedas?|billetes?|unidades|unidad|bengalas?|bolsas?|de\s+la\s+(?:mañana|tarde|noche)|en\s+punto|y\s+(?:media|cuarto))(?![\p{L}])/iu

const clockOrListingBeforeNumberPattern = /(?:\ba\s+las?|\bson\s+las|\bhasta\s+las|\bdesde\s+las|\bunos|\bunas|\bcasi|\bcomo)\s*$/iu

const referenceCueBeforeLoneNumberPattern =
  /(?:\bsugerencias?|\bopción|\bopcion|\bopciones|\bnúmero|\bnumero|\bhago|\bharé|\bhare|\bhacer|\bla|\blo|\bel)\s*$/iu

const emphaticConditionAtEndPattern =
  /(?:^|[\s,;.:])((?:pero\s+)?(?:solo|sólo|solamente|únicamente|unicamente)\s+si\s+[^,;.]+)$/iu

const plainConditionAtEndPattern = /(?:^|[,;.:]\s*|\by\s+|\be\s+)(si\s+[^,;.]+)$/iu

const conditionAtStartPattern =
  /^\s*,?\s*((?:pero\s+)?(?:(?:solo|sólo|solamente|únicamente|unicamente)\s+)?si\s+[^,;.]+)/iu

const trailingConnectorPattern =
  /(?:[\s,;:.]+|\s(?:y|e|luego|después|despues|entonces|también|tambien|hago|haré|hare|hacer|la|lo|el|las|los|sugerencias?|opción|opcion|opciones|número|numero))+$/iu

const leadingConnectorPattern = /^(?:[\s,;:.]+|(?:y|e|luego|después|despues|entonces)\s+)+/iu

const letterPattern = /\p{L}/u

function removeSurroundingConnectors(fragmentText: string): string {
  let cleanedText = ` ${fragmentText} `
  let previousText = ''
  while (previousText !== cleanedText) {
    previousText = cleanedText
    cleanedText = cleanedText.replace(trailingConnectorPattern, '').replace(leadingConnectorPattern, '')
  }
  return cleanedText.trim()
}

function readNumberTokens(draftText: string, availableSuggestionCount: number): NumberToken[] {
  const numberTokens: NumberToken[] = []
  for (const numberMatch of draftText.matchAll(/\d+/gu)) {
    const startIndex = numberMatch.index
    const endIndex = startIndex + numberMatch[0].length
    const numericValue = Number.parseInt(numberMatch[0], 10)
    const characterBefore = startIndex > 0 ? draftText[startIndex - 1] : ''
    const textAfter = draftText.slice(endIndex)
    const textBefore = draftText.slice(0, startIndex)
    const isGluedToSomethingBefore = /[\p{L}\p{N}.:$#°]/u.test(characterBefore)
    const isGluedToSomethingAfter = /^(?:[\p{L}%°:$]|[.,]\d)/u.test(textAfter)
    numberTokens.push({
      startIndex,
      endIndex,
      numericValue,
      isPlausibleSuggestionReference:
        numericValue >= 1 &&
        numericValue <= availableSuggestionCount &&
        numberMatch[0].length <= 2 &&
        !isGluedToSomethingBefore &&
        !isGluedToSomethingAfter &&
        !measuredThingAfterNumberPattern.test(textAfter) &&
        !clockOrListingBeforeNumberPattern.test(textBefore),
    })
  }
  return numberTokens
}

function groupNeighbouringNumberTokens(draftText: string, numberTokens: NumberToken[]): NumberTokenGroup[] {
  const numberTokenGroups: NumberTokenGroup[] = []
  for (const numberToken of numberTokens) {
    const latestGroup = numberTokenGroups[numberTokenGroups.length - 1]
    const textSinceLatestGroup = latestGroup ? draftText.slice(latestGroup.endIndex, numberToken.startIndex) : null
    if (
      latestGroup &&
      textSinceLatestGroup !== null &&
      textSinceLatestGroup.length > 0 &&
      separatorBetweenReferencedNumbersPattern.test(textSinceLatestGroup)
    ) {
      latestGroup.numberTokens.push(numberToken)
      latestGroup.endIndex = numberToken.endIndex
    } else {
      numberTokenGroups.push({
        startIndex: numberToken.startIndex,
        endIndex: numberToken.endIndex,
        numberTokens: [numberToken],
      })
    }
  }
  return numberTokenGroups
}

function readConditionAtEnd(fragmentText: string): { conditionText: string | null; remainingText: string } {
  const conditionMatch = emphaticConditionAtEndPattern.exec(fragmentText) ?? plainConditionAtEndPattern.exec(fragmentText)
  if (!conditionMatch) {
    return { conditionText: null, remainingText: fragmentText }
  }
  const conditionText = removeSurroundingConnectors(conditionMatch[1])
  if (!letterPattern.test(conditionText)) {
    return { conditionText: null, remainingText: fragmentText }
  }
  const conditionStartIndex = conditionMatch.index + conditionMatch[0].length - conditionMatch[1].length
  return { conditionText, remainingText: fragmentText.slice(0, conditionStartIndex) }
}

export function recogniseFreePlanText(draftText: string, availableSuggestionCount: number): FreePlanTextRecognition {
  const wholeTextAsOwnWords: FreePlanTextRecognition = {
    fragments: draftText.trim().length > 0 ? [{ kind: 'own_words', actionText: draftText.trim(), conditionText: null }] : [],
    referencedSuggestionNumbers: [],
  }
  if (availableSuggestionCount === 0) {
    return wholeTextAsOwnWords
  }
  const numberTokenGroups = groupNeighbouringNumberTokens(draftText, readNumberTokens(draftText, availableSuggestionCount))
  const sequenceGroups = numberTokenGroups.filter(
    (numberTokenGroup) =>
      numberTokenGroup.numberTokens.length >= 2 &&
      numberTokenGroup.numberTokens.every((numberToken) => numberToken.isPlausibleSuggestionReference),
  )
  const isWholeDraftOneNumber = /^\s*\d{1,2}\s*$/u.test(draftText)
  const plausibleLoneGroups = numberTokenGroups.filter(
    (numberTokenGroup) =>
      numberTokenGroup.numberTokens.length === 1 && numberTokenGroup.numberTokens[0].isPlausibleSuggestionReference,
  )
  const isSomeReferenceUnmistakable =
    isWholeDraftOneNumber ||
    sequenceGroups.length > 0 ||
    plausibleLoneGroups.some((numberTokenGroup) => {
      const textBeforeGroup = draftText.slice(0, numberTokenGroup.startIndex)
      return (
        referenceCueBeforeLoneNumberPattern.test(textBeforeGroup) ||
        readConditionAtEnd(textBeforeGroup).conditionText !== null
      )
    })
  const acceptedGroups = isSomeReferenceUnmistakable
    ? numberTokenGroups.filter(
        (numberTokenGroup) => sequenceGroups.includes(numberTokenGroup) || plausibleLoneGroups.includes(numberTokenGroup),
      )
    : []
  if (acceptedGroups.length === 0) {
    return wholeTextAsOwnWords
  }

  const fragments: RecognisedPlanFragment[] = []
  const referencedSuggestionNumbers: number[] = []
  let readingIndex = 0
  acceptedGroups.forEach((acceptedGroup, acceptedGroupIndex) => {
    const textBeforeGroup = draftText.slice(readingIndex, acceptedGroup.startIndex)
    const conditionBeforeGroup = readConditionAtEnd(textBeforeGroup)
    const ownWordsBeforeGroup = removeSurroundingConnectors(conditionBeforeGroup.remainingText)
    if (letterPattern.test(ownWordsBeforeGroup)) {
      fragments.push({ kind: 'own_words', actionText: ownWordsBeforeGroup, conditionText: null })
    }
    readingIndex = acceptedGroup.endIndex
    let conditionText = conditionBeforeGroup.conditionText
    if (conditionText === null) {
      const nextGroup = acceptedGroups[acceptedGroupIndex + 1]
      const textAfterGroup = draftText.slice(acceptedGroup.endIndex, nextGroup ? nextGroup.startIndex : draftText.length)
      const conditionAfterGroupMatch = conditionAtStartPattern.exec(textAfterGroup)
      if (conditionAfterGroupMatch) {
        const conditionAfterGroup = removeSurroundingConnectors(conditionAfterGroupMatch[1])
        if (letterPattern.test(conditionAfterGroup)) {
          conditionText = conditionAfterGroup
          readingIndex = acceptedGroup.endIndex + conditionAfterGroupMatch[0].length
        }
      }
    }
    for (const numberToken of acceptedGroup.numberTokens) {
      if (!referencedSuggestionNumbers.includes(numberToken.numericValue)) {
        referencedSuggestionNumbers.push(numberToken.numericValue)
        fragments.push({ kind: 'suggestion_reference', suggestionNumber: numberToken.numericValue, conditionText })
      }
    }
  })
  const ownWordsAfterLastGroup = removeSurroundingConnectors(draftText.slice(readingIndex))
  if (letterPattern.test(ownWordsAfterLastGroup)) {
    fragments.push({ kind: 'own_words', actionText: ownWordsAfterLastGroup, conditionText: null })
  }
  return { fragments, referencedSuggestionNumbers }
}

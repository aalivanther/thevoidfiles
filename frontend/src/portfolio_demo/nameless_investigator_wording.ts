export const namelessInvestigatorRoleName = 'Investigador'
export const investigatorNamePlaceholder = '{{nombre}}'

const investigatorNamePlaceholderPattern = /\{\{nombre(?:_completo)?\}\}/g
const sentenceOpeningPattern = /(?:^|[.!?…¡¿«])\s*$/
const contractedPrepositionPattern = /(^|[\s«(—])(a|A|de|De)\s$/

function readContractedPreposition(preposition: string): string {
  const contractedForms: Record<string, string> = { a: 'al', A: 'Al', de: 'del', De: 'Del' }
  return contractedForms[preposition]
}

export function applyNamelessInvestigatorWording(narrativeText: string): string {
  let wordedText = ''
  let consumedLength = 0
  for (const placeholderMatch of narrativeText.matchAll(investigatorNamePlaceholderPattern)) {
    const placeholderStart = placeholderMatch.index
    const placeholderEnd = placeholderStart + placeholderMatch[0].length
    let precedingText = wordedText + narrativeText.slice(consumedLength, placeholderStart)
    const isQuotedOnItsOwn = precedingText.endsWith('«') && narrativeText.charAt(placeholderEnd) === '»'
    const prepositionMatch = precedingText.match(contractedPrepositionPattern)
    let reference: string
    if (isQuotedOnItsOwn) {
      reference = namelessInvestigatorRoleName
    } else if (prepositionMatch) {
      precedingText = `${precedingText.slice(0, precedingText.length - prepositionMatch[0].length)}${prepositionMatch[1]}${readContractedPreposition(prepositionMatch[2])} `
      reference = namelessInvestigatorRoleName
    } else {
      reference = `${sentenceOpeningPattern.test(precedingText) ? 'El' : 'el'} ${namelessInvestigatorRoleName}`
    }
    wordedText = `${precedingText}${reference}`
    consumedLength = placeholderEnd
  }
  return consumedLength === 0 ? narrativeText : wordedText + narrativeText.slice(consumedLength)
}

type CopyFunction = (...copyArguments: never[]) => unknown

function adaptCopyValue(copyValue: unknown): unknown {
  if (typeof copyValue === 'function') {
    const realCopyFunction = copyValue as (...copyArguments: unknown[]) => unknown
    return (...copyArguments: unknown[]) => {
      const producedValue = realCopyFunction(
        ...copyArguments.map((copyArgument) =>
          copyArgument === namelessInvestigatorRoleName ? investigatorNamePlaceholder : copyArgument,
        ),
      )
      return typeof producedValue === 'string' ? applyNamelessInvestigatorWording(producedValue) : adaptCopyValue(producedValue)
    }
  }
  if (Array.isArray(copyValue)) {
    return copyValue.map(adaptCopyValue)
  }
  if (typeof copyValue === 'object' && copyValue !== null) {
    return Object.fromEntries(Object.entries(copyValue).map(([copyKey, nestedValue]) => [copyKey, adaptCopyValue(nestedValue)]))
  }
  return copyValue
}

export function adaptCopyToNamelessInvestigator<CopyShape extends Record<string, unknown> | CopyFunction>(
  realCopy: CopyShape,
): CopyShape {
  return adaptCopyValue(realCopy) as CopyShape
}

const namedHtmlEntities: Record<string, string> = {
  aacute: 'á',
  Aacute: 'Á',
  eacute: 'é',
  Eacute: 'É',
  iacute: 'í',
  Iacute: 'Í',
  oacute: 'ó',
  Oacute: 'Ó',
  uacute: 'ú',
  Uacute: 'Ú',
  ntilde: 'ñ',
  Ntilde: 'Ñ',
  uuml: 'ü',
  Uuml: 'Ü',
  iquest: '¿',
  iexcl: '¡',
  amp: '&',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
  nbsp: ' ',
}

const namedEntityPattern = /&([A-Za-z][A-Za-z0-9]+);/g
const decimalEntityPattern = /&#(\d+);/g
const hexadecimalEntityPattern = /&#x([0-9A-Fa-f]+);/g
const maximumUnicodeCodePoint = 0x10ffff

function isUsableUnicodeCodePoint(codePoint: number): boolean {
  return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= maximumUnicodeCodePoint
}

function decodeOneGeneratedMarkupPass(rawText: string): string {
  return rawText
    .replace(namedEntityPattern, (matchedText, entityName: string) => namedHtmlEntities[entityName] ?? matchedText)
    .replace(decimalEntityPattern, (matchedText, decimalCode: string) => {
      const codePoint = Number(decimalCode)
      return isUsableUnicodeCodePoint(codePoint) ? String.fromCodePoint(codePoint) : matchedText
    })
    .replace(hexadecimalEntityPattern, (matchedText, hexadecimalCode: string) => {
      const codePoint = Number.parseInt(hexadecimalCode, 16)
      return isUsableUnicodeCodePoint(codePoint) ? String.fromCodePoint(codePoint) : matchedText
    })
}

export function decodeGeneratedMarkupText(rawText: string): string {
  if (!rawText.includes('&')) {
    return rawText
  }
  let decodedText = rawText
  for (let decodePass = 0; decodePass < 3; decodePass += 1) {
    const nextDecodedText = decodeOneGeneratedMarkupPass(decodedText)
    if (nextDecodedText === decodedText) {
      return decodedText
    }
    decodedText = nextDecodedText
  }
  return decodedText
}

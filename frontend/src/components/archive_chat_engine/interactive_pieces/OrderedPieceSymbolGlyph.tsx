const symbolPathBySymbolName: Record<string, string> = {
  circle: 'M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16Z',
  crescent: 'M14 3a9 9 0 1 0 7 13a7.5 7.5 0 1 1-7-13Z',
  triangle: 'M12 3 22 21H2Z',
  square: 'M4 4H20V20H4Z',
  cross: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z',
  diamond: 'M12 2 22 12 12 22 2 12Z',
  bar: 'M3 9H21V15H3Z',
  star: 'M12 2l3 7h7l-5.5 4.5 2 7.5L12 16.5 5.5 21l2-7.5L2 9h7Z',
  double_slit: 'M6 3h4v18H6ZM14 3h4v18h-4Z',
  eye: 'M2 12c4-7 16-7 20 0c-4 7-16 7-20 0Zm10-3a3 3 0 1 0 0 6a3 3 0 1 0 0-6Z',
}

const fallbackSymbolNames = Object.keys(symbolPathBySymbolName)

function readSymbolPath(symbolName: string): string {
  const knownSymbolPath = symbolPathBySymbolName[symbolName]
  if (knownSymbolPath) {
    return knownSymbolPath
  }
  const symbolNameChecksum = Array.from(symbolName).reduce(
    (runningChecksum, symbolCharacter) => (runningChecksum * 31 + symbolCharacter.charCodeAt(0)) % 9973,
    7,
  )
  return symbolPathBySymbolName[fallbackSymbolNames[symbolNameChecksum % fallbackSymbolNames.length]]
}

export function OrderedPieceSymbolGlyph({ symbolName }: { symbolName: string }) {
  return (
    <svg viewBox="0 0 24 24" className="ordered-piece-symbol-glyph" aria-hidden="true" focusable="false">
      <path d={readSymbolPath(symbolName)} fillRule="evenodd" />
    </svg>
  )
}

import { useMemo } from 'react'

export type TremorTextEffectProperties = {
  visibleText: string
}

export function TremorTextEffect({ visibleText }: TremorTextEffectProperties) {
  const wordsAndSpaces = useMemo(() => visibleText.split(/(\s+)/).filter((piece) => piece.length > 0), [visibleText])
  return (
    <>
      <span className="visually-hidden-text">{visibleText}</span>
      <span aria-hidden="true">
        {wordsAndSpaces.map((wordOrSpace, pieceIndex) =>
          /^\s+$/.test(wordOrSpace) ? (
            <span key={pieceIndex}>{wordOrSpace}</span>
          ) : (
            <span key={pieceIndex} className="narrative-tremor-word">
              {Array.from(wordOrSpace).map((character, characterIndex) => (
                <span key={characterIndex} className="narrative-tremor-character">
                  {character}
                </span>
              ))}
            </span>
          ),
        )}
      </span>
    </>
  )
}

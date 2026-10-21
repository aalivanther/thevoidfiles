import { useMemo } from 'react'
import { MarkedNarrativeSegmentsParagraph } from './MarkedNarrativeSegmentsParagraph'
import { parseMarkedNarrativeParagraph } from './narrative_markup_parser'

export type MarkedNarrativeParagraphProperties = {
  markedParagraphText: string
  visibleCharacterLimit?: number
  shouldShowCaret?: boolean
  shouldPlayEffects: boolean
}

export function MarkedNarrativeParagraph({
  markedParagraphText,
  visibleCharacterLimit,
  shouldShowCaret = false,
  shouldPlayEffects,
}: MarkedNarrativeParagraphProperties) {
  const segments = useMemo(() => parseMarkedNarrativeParagraph(markedParagraphText), [markedParagraphText])
  return (
    <MarkedNarrativeSegmentsParagraph
      segments={segments}
      visibleCharacterLimit={visibleCharacterLimit}
      shouldShowCaret={shouldShowCaret}
      shouldPlayEffects={shouldPlayEffects}
    />
  )
}

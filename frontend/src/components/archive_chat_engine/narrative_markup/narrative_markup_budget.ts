import { movingNarrativeTextEffectNames, narrativeMarkupLimits } from './narrative_markup_effect_catalog'
import { mergeAdjacentPlainSegments, parseMarkedNarrativeParagraph, removeEffectsFromSegment } from './narrative_markup_parser'
import type { MarkedNarrativeSegment } from './narrative_markup_parser'

export function applyTurnMarkupBudget(segmentsByParagraph: MarkedNarrativeSegment[][]): MarkedNarrativeSegment[][] {
  let markedSpanCount = 0
  let movingEffectCount = 0
  let interferenceCount = 0
  let pauseCount = 0
  let totalPauseMilliseconds = 0

  return segmentsByParagraph.map((paragraphSegments) => {
    const budgetedSegments: MarkedNarrativeSegment[] = []
    for (const segment of paragraphSegments) {
      if (segment.effectNames.includes('pause')) {
        const remainingPauseMilliseconds = narrativeMarkupLimits.maximumTotalPauseMillisecondsPerTurn - totalPauseMilliseconds
        if (pauseCount >= narrativeMarkupLimits.maximumPauseCountPerTurn || remainingPauseMilliseconds <= 0) {
          continue
        }
        const allowedPauseMilliseconds = Math.min(segment.pauseMilliseconds, remainingPauseMilliseconds)
        pauseCount += 1
        totalPauseMilliseconds += allowedPauseMilliseconds
        budgetedSegments.push({ ...segment, pauseMilliseconds: allowedPauseMilliseconds })
        continue
      }
      if (segment.effectNames.length === 0) {
        budgetedSegments.push(segment)
        continue
      }
      const hasMovingEffect = segment.effectNames.some((effectName) => movingNarrativeTextEffectNames.includes(effectName))
      const hasInterference = segment.effectNames.includes('interference')
      const isOverBudget =
        markedSpanCount >= narrativeMarkupLimits.maximumMarkedSpanCountPerTurn ||
        (hasMovingEffect && movingEffectCount >= narrativeMarkupLimits.maximumMovingEffectCountPerTurn) ||
        (hasInterference && interferenceCount >= narrativeMarkupLimits.maximumInterferenceCountPerTurn)
      if (isOverBudget) {
        budgetedSegments.push(removeEffectsFromSegment(segment))
        continue
      }
      markedSpanCount += 1
      movingEffectCount += hasMovingEffect ? 1 : 0
      interferenceCount += hasInterference ? 1 : 0
      budgetedSegments.push(segment)
    }
    return mergeAdjacentPlainSegments(budgetedSegments)
  })
}

export function parseMarkedParagraphsOfOneTurn(markedParagraphs: readonly string[]): MarkedNarrativeSegment[][] {
  return applyTurnMarkupBudget(markedParagraphs.map(parseMarkedNarrativeParagraph))
}

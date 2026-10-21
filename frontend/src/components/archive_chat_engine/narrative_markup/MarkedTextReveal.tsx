import { useEffect, useMemo, useRef } from 'react'
import { charactersPerSecondByTextRevealSpeed, usePlayerSettings } from '../../../settings/player_settings'
import { MarkedNarrativeSegmentsParagraph } from './MarkedNarrativeSegmentsParagraph'
import { parseMarkedParagraphsOfOneTurn } from './narrative_markup_budget'
import { countVisibleCharactersInSegments } from './narrative_markup_parser'
import { createTextRevealSteps, useTimedTextReveal } from './use_timed_text_reveal'

export type MarkedTextRevealProperties = {
  markedParagraphs: string[]
  baseCharactersPerSecondMultiplier: number
  shouldAnimateReveal: boolean
  isImmediateCompletionRequested: boolean
  onParagraphReached: (paragraphIndex: number) => void
  onRevealProgressed: () => void
  onRevealCompleted: () => void
}

const paragraphSignatureSeparator = '\u0000'

export function MarkedTextReveal({
  markedParagraphs,
  baseCharactersPerSecondMultiplier,
  shouldAnimateReveal,
  isImmediateCompletionRequested,
  onParagraphReached,
  onRevealProgressed,
  onRevealCompleted,
}: MarkedTextRevealProperties) {
  const { playerSettings, shouldReduceMotion } = usePlayerSettings()
  const paragraphsSignature = markedParagraphs.join(paragraphSignatureSeparator)
  const segmentsByParagraph = useMemo(
    () => parseMarkedParagraphsOfOneTurn(paragraphsSignature.split(paragraphSignatureSeparator)),
    [paragraphsSignature],
  )
  const characterCountByParagraph = useMemo(
    () => segmentsByParagraph.map(countVisibleCharactersInSegments),
    [segmentsByParagraph],
  )
  const totalCharacterCount = useMemo(
    () => characterCountByParagraph.reduce((runningTotal, characterCount) => runningTotal + characterCount, 0),
    [characterCountByParagraph],
  )
  const characterCountBeforeParagraph = useMemo(
    () =>
      characterCountByParagraph.map((_, paragraphIndex) =>
        characterCountByParagraph
          .slice(0, paragraphIndex)
          .reduce((runningTotal, characterCount) => runningTotal + characterCount, 0),
      ),
    [characterCountByParagraph],
  )
  const revealSteps = useMemo(() => createTextRevealSteps(segmentsByParagraph), [segmentsByParagraph])

  const safeSpeedMultiplier =
    Number.isFinite(baseCharactersPerSecondMultiplier) && baseCharactersPerSecondMultiplier > 0
      ? baseCharactersPerSecondMultiplier
      : 1
  const charactersPerSecond = charactersPerSecondByTextRevealSpeed[playerSettings.textRevealSpeed] * safeSpeedMultiplier
  const isRevealAnimated = shouldAnimateReveal && !shouldReduceMotion && Number.isFinite(charactersPerSecond)

  const revealedCharacterCount = useTimedTextReveal({
    revealSteps,
    totalCharacterCount,
    charactersPerSecond,
    isRevealAnimated,
    isImmediateCompletionRequested,
  })

  const latestCallbacks = useRef({ onParagraphReached, onRevealProgressed, onRevealCompleted })
  const revealReport = useRef({ wasAnimating: false, reachedParagraphCount: 0, hasReportedCompletion: false })

  useEffect(() => {
    latestCallbacks.current = { onParagraphReached, onRevealProgressed, onRevealCompleted }
  }, [onParagraphReached, onRevealProgressed, onRevealCompleted])

  useEffect(() => {
    if (!shouldAnimateReveal) {
      revealReport.current = { wasAnimating: false, reachedParagraphCount: 0, hasReportedCompletion: false }
      return
    }
    if (!revealReport.current.wasAnimating) {
      revealReport.current = { wasAnimating: true, reachedParagraphCount: 0, hasReportedCompletion: false }
    }
    let charactersBeforeParagraph = 0
    characterCountByParagraph.forEach((paragraphCharacterCount, paragraphIndex) => {
      const hasParagraphBeenReached =
        revealedCharacterCount > charactersBeforeParagraph || revealedCharacterCount >= totalCharacterCount
      if (hasParagraphBeenReached && paragraphIndex >= revealReport.current.reachedParagraphCount) {
        revealReport.current.reachedParagraphCount = paragraphIndex + 1
        latestCallbacks.current.onParagraphReached(paragraphIndex)
      }
      charactersBeforeParagraph += paragraphCharacterCount
    })
    latestCallbacks.current.onRevealProgressed()
    if (revealedCharacterCount >= totalCharacterCount && !revealReport.current.hasReportedCompletion) {
      revealReport.current.hasReportedCompletion = true
      latestCallbacks.current.onRevealCompleted()
    }
  }, [shouldAnimateReveal, revealedCharacterCount, totalCharacterCount, characterCountByParagraph])

  const isRevealInProgress = revealedCharacterCount < totalCharacterCount
  const shouldPlayEffects = isRevealAnimated && !isImmediateCompletionRequested

  return (
    <div className="narrative-marked-text-reveal" aria-hidden={isRevealInProgress ? true : undefined}>
      <div className="narrative-marked-text-reveal-measure" aria-hidden="true">
        {segmentsByParagraph.map((paragraphSegments, paragraphIndex) =>
          characterCountByParagraph[paragraphIndex] === 0 ? null : (
            <MarkedNarrativeSegmentsParagraph
              key={`measure-${paragraphIndex}`}
              segments={paragraphSegments}
              shouldPlayEffects={false}
            />
          ),
        )}
      </div>
      <div className="narrative-marked-text-reveal-live">
        {segmentsByParagraph.map((paragraphSegments, paragraphIndex) => {
          const charactersAvailableForThisParagraph = revealedCharacterCount - characterCountBeforeParagraph[paragraphIndex]
          const paragraphCharacterCount = characterCountByParagraph[paragraphIndex]
          if (paragraphCharacterCount === 0 || (charactersAvailableForThisParagraph <= 0 && isRevealInProgress)) {
            return null
          }
          return (
            <MarkedNarrativeSegmentsParagraph
              key={paragraphIndex}
              segments={paragraphSegments}
              visibleCharacterLimit={isRevealInProgress ? charactersAvailableForThisParagraph : undefined}
              shouldShowCaret={isRevealInProgress && charactersAvailableForThisParagraph < paragraphCharacterCount}
              shouldPlayEffects={shouldPlayEffects}
            />
          )
        })}
      </div>
    </div>
  )
}

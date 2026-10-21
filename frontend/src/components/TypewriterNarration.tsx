import { useEffect, useMemo, useRef, useState } from 'react'
import { useInteractionFeedback } from '../audio/interaction_feedback'
import { charactersPerSecondByTextRevealSpeed, usePlayerSettings } from '../settings/player_settings'
import {
  NarrativeParagraph,
  countVisibleCharactersInParagraph,
  splitParagraphIntoNarrativeTextSegments,
} from './narrative_text_segments'

type TypewriterNarrationProperties = {
  paragraphs: string[]
  shouldAnimateReveal: boolean
  isImmediateCompletionRequested: boolean
  onRevealCompleted: () => void
  onRevealProgressed: () => void
}

function findAnomalousWordStartPositions(paragraphs: string[]): number[] {
  const anomalousWordStartPositions: number[] = []
  let charactersBeforeCurrentSegment = 0
  for (const paragraphText of paragraphs) {
    for (const narrativeTextSegment of splitParagraphIntoNarrativeTextSegments(paragraphText)) {
      if (narrativeTextSegment.isAnomalous) {
        anomalousWordStartPositions.push(charactersBeforeCurrentSegment)
      }
      charactersBeforeCurrentSegment += narrativeTextSegment.visibleText.length
    }
  }
  return anomalousWordStartPositions
}

export function TypewriterNarration({
  paragraphs,
  shouldAnimateReveal,
  isImmediateCompletionRequested,
  onRevealCompleted,
  onRevealProgressed,
}: TypewriterNarrationProperties) {
  const { playerSettings, shouldReduceMotion } = usePlayerSettings()
  const playInteractionFeedback = useInteractionFeedback()
  const characterCountByParagraph = useMemo(
    () => paragraphs.map(countVisibleCharactersInParagraph),
    [paragraphs],
  )
  const totalCharacterCount = useMemo(
    () => characterCountByParagraph.reduce((runningTotal, characterCount) => runningTotal + characterCount, 0),
    [characterCountByParagraph],
  )
  const anomalousWordStartPositions = useMemo(() => findAnomalousWordStartPositions(paragraphs), [paragraphs])
  const charactersPerSecond = charactersPerSecondByTextRevealSpeed[playerSettings.textRevealSpeed]
  const shouldRevealInstantly =
    !shouldAnimateReveal || shouldReduceMotion || !Number.isFinite(charactersPerSecond)

  const [revealedCharacterCount, setRevealedCharacterCount] = useState(
    shouldRevealInstantly ? totalCharacterCount : 0,
  )
  const hasReportedCompletion = useRef(false)
  const announcedAnomalousWordCount = useRef(0)
  const completionCallback = useRef(onRevealCompleted)
  const progressCallback = useRef(onRevealProgressed)
  completionCallback.current = onRevealCompleted
  progressCallback.current = onRevealProgressed

  useEffect(() => {
    if (shouldRevealInstantly || isImmediateCompletionRequested) {
      setRevealedCharacterCount(totalCharacterCount)
      return
    }
    let previousTimestamp = performance.now()
    let fractionalCharacterProgress = 0
    const revealIntervalIdentifier = window.setInterval(() => {
      const currentTimestamp = performance.now()
      const elapsedSeconds = (currentTimestamp - previousTimestamp) / 1000
      previousTimestamp = currentTimestamp
      fractionalCharacterProgress += elapsedSeconds * charactersPerSecond
      const wholeCharactersToReveal = Math.floor(fractionalCharacterProgress)
      if (wholeCharactersToReveal > 0) {
        fractionalCharacterProgress -= wholeCharactersToReveal
        setRevealedCharacterCount((previousCount) =>
          Math.min(totalCharacterCount, previousCount + wholeCharactersToReveal),
        )
      }
    }, 30)
    return () => window.clearInterval(revealIntervalIdentifier)
  }, [shouldRevealInstantly, isImmediateCompletionRequested, charactersPerSecond, totalCharacterCount])

  useEffect(() => {
    if (shouldAnimateReveal) {
      const reachedAnomalousWordCount = anomalousWordStartPositions.filter(
        (startPosition) => startPosition < revealedCharacterCount,
      ).length
      if (reachedAnomalousWordCount > announcedAnomalousWordCount.current) {
        announcedAnomalousWordCount.current = reachedAnomalousWordCount
        playInteractionFeedback('anomaly_glitch')
      }
      progressCallback.current()
    }
    if (revealedCharacterCount >= totalCharacterCount && !hasReportedCompletion.current) {
      hasReportedCompletion.current = true
      completionCallback.current()
    }
  }, [
    revealedCharacterCount,
    totalCharacterCount,
    shouldAnimateReveal,
    anomalousWordStartPositions,
    playInteractionFeedback,
  ])

  const isRevealInProgress = revealedCharacterCount < totalCharacterCount
  let charactersAssignedToPreviousParagraphs = 0

  return (
    <>
      <div aria-hidden={isRevealInProgress}>
        {paragraphs.map((paragraphText, paragraphIndex) => {
          const charactersAvailableForThisParagraph =
            revealedCharacterCount - charactersAssignedToPreviousParagraphs
          const paragraphCharacterCount = characterCountByParagraph[paragraphIndex]
          charactersAssignedToPreviousParagraphs += paragraphCharacterCount
          if (charactersAvailableForThisParagraph <= 0 && isRevealInProgress) {
            return null
          }
          const isThisParagraphBeingRevealed =
            isRevealInProgress && charactersAvailableForThisParagraph < paragraphCharacterCount
          return (
            <NarrativeParagraph
              key={paragraphIndex}
              paragraphText={paragraphText}
              visibleCharacterLimit={isRevealInProgress ? charactersAvailableForThisParagraph : undefined}
              shouldShowCaret={isThisParagraphBeingRevealed}
            />
          )
        })}
      </div>
      {isRevealInProgress ? (
        <div className="visually-hidden-text">
          {paragraphs.map((paragraphText, paragraphIndex) => (
            <NarrativeParagraph key={paragraphIndex} paragraphText={paragraphText} />
          ))}
        </div>
      ) : null}
    </>
  )
}

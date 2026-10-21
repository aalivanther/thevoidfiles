import { useEffect, useRef, useState } from 'react'
import { charactersPerSecondByTextRevealSpeed } from '../../../settings/player_settings'
import { revealRateMultiplierByNarrativeTextEffectName } from './narrative_markup_effect_catalog'
import { countCharactersInVisibleText } from './narrative_markup_parser'
import type { MarkedNarrativeSegment } from './narrative_markup_parser'

export type TextRevealStep =
  | { kind: 'characters'; characterCount: number; revealRateMultiplier: number }
  | { kind: 'silence'; referenceMilliseconds: number }

const revealTickMilliseconds = 30
const breathBetweenParagraphsMilliseconds = 180
const safetyTimeoutDurationMultiplier = 1.5
const safetyTimeoutExtraMilliseconds = 1500
const minimumSilenceSpeedScale = 0.4

export function createTextRevealSteps(segmentsByParagraph: MarkedNarrativeSegment[][]): TextRevealStep[] {
  const revealSteps: TextRevealStep[] = []
  segmentsByParagraph.forEach((paragraphSegments, paragraphIndex) => {
    if (paragraphIndex > 0 && paragraphSegments.length > 0) {
      revealSteps.push({ kind: 'silence', referenceMilliseconds: breathBetweenParagraphsMilliseconds })
    }
    for (const segment of paragraphSegments) {
      if (segment.pauseMilliseconds > 0) {
        revealSteps.push({ kind: 'silence', referenceMilliseconds: segment.pauseMilliseconds })
      }
      const characterCount = countCharactersInVisibleText(segment.visibleText)
      if (characterCount > 0) {
        const revealRateMultiplier = segment.effectNames.reduce(
          (runningMultiplier, effectName) =>
            runningMultiplier * (revealRateMultiplierByNarrativeTextEffectName[effectName] ?? 1),
          1,
        )
        revealSteps.push({ kind: 'characters', characterCount, revealRateMultiplier })
      }
    }
  })
  return revealSteps
}

function readSilenceMilliseconds(referenceMilliseconds: number, charactersPerSecond: number): number {
  const speedScale = Math.min(
    1,
    Math.max(minimumSilenceSpeedScale, charactersPerSecondByTextRevealSpeed.calm / charactersPerSecond),
  )
  return referenceMilliseconds * speedScale
}

function readStepDurationMilliseconds(revealStep: TextRevealStep, charactersPerSecond: number): number {
  return revealStep.kind === 'silence'
    ? readSilenceMilliseconds(revealStep.referenceMilliseconds, charactersPerSecond)
    : (revealStep.characterCount / (charactersPerSecond * revealStep.revealRateMultiplier)) * 1000
}

type RevealProgress = {
  stepIndex: number
  elapsedMillisecondsWithinStep: number
  characterCountBeforeStep: number
}

function createInitialRevealProgress(): RevealProgress {
  return { stepIndex: 0, elapsedMillisecondsWithinStep: 0, characterCountBeforeStep: 0 }
}

function advanceRevealProgress(
  revealProgress: RevealProgress,
  revealSteps: TextRevealStep[],
  charactersPerSecond: number,
  elapsedMilliseconds: number,
): number {
  let remainingMilliseconds = elapsedMilliseconds
  while (revealProgress.stepIndex < revealSteps.length) {
    const currentStep = revealSteps[revealProgress.stepIndex]
    const stepDurationMilliseconds = readStepDurationMilliseconds(currentStep, charactersPerSecond)
    const millisecondsLeftInStep = stepDurationMilliseconds - revealProgress.elapsedMillisecondsWithinStep
    if (remainingMilliseconds < millisecondsLeftInStep) {
      revealProgress.elapsedMillisecondsWithinStep += remainingMilliseconds
      const partialCharacterCount =
        currentStep.kind === 'characters' && stepDurationMilliseconds > 0
          ? Math.floor(
              (revealProgress.elapsedMillisecondsWithinStep / stepDurationMilliseconds) * currentStep.characterCount,
            )
          : 0
      return revealProgress.characterCountBeforeStep + partialCharacterCount
    }
    remainingMilliseconds -= Math.max(0, millisecondsLeftInStep)
    revealProgress.characterCountBeforeStep += currentStep.kind === 'characters' ? currentStep.characterCount : 0
    revealProgress.elapsedMillisecondsWithinStep = 0
    revealProgress.stepIndex += 1
  }
  return revealProgress.characterCountBeforeStep
}

export type TimedTextRevealRequest = {
  revealSteps: TextRevealStep[]
  totalCharacterCount: number
  charactersPerSecond: number
  isRevealAnimated: boolean
  isImmediateCompletionRequested: boolean
}

export function useTimedTextReveal({
  revealSteps,
  totalCharacterCount,
  charactersPerSecond,
  isRevealAnimated,
  isImmediateCompletionRequested,
}: TimedTextRevealRequest): number {
  const [revealedCharacterCount, setRevealedCharacterCount] = useState(0)
  const [wasRevealAnimated, setWasRevealAnimated] = useState(isRevealAnimated)
  const revealProgress = useRef<RevealProgress>(createInitialRevealProgress())

  if (wasRevealAnimated !== isRevealAnimated) {
    setWasRevealAnimated(isRevealAnimated)
    if (isRevealAnimated) {
      setRevealedCharacterCount(0)
    }
  }
  if (isRevealAnimated && isImmediateCompletionRequested && revealedCharacterCount < totalCharacterCount) {
    setRevealedCharacterCount(totalCharacterCount)
  }

  const isRevealRunning =
    isRevealAnimated &&
    !isImmediateCompletionRequested &&
    totalCharacterCount > 0 &&
    revealedCharacterCount < totalCharacterCount &&
    Number.isFinite(charactersPerSecond) &&
    charactersPerSecond > 0

  useEffect(() => {
    revealProgress.current = createInitialRevealProgress()
  }, [isRevealAnimated, revealSteps])

  useEffect(() => {
    if (!isRevealRunning) {
      return
    }
    let previousTimestamp = Date.now()
    const revealIntervalIdentifier = window.setInterval(() => {
      const currentTimestamp = Date.now()
      const elapsedMilliseconds = Math.max(0, currentTimestamp - previousTimestamp)
      previousTimestamp = currentTimestamp
      const nextRevealedCharacterCount = advanceRevealProgress(
        revealProgress.current,
        revealSteps,
        charactersPerSecond,
        elapsedMilliseconds,
      )
      setRevealedCharacterCount((previousCount) =>
        nextRevealedCharacterCount > previousCount ? nextRevealedCharacterCount : previousCount,
      )
    }, revealTickMilliseconds)
    const expectedDurationMilliseconds = revealSteps.reduce(
      (runningDuration, revealStep) => runningDuration + readStepDurationMilliseconds(revealStep, charactersPerSecond),
      0,
    )
    const safetyTimeoutIdentifier = window.setTimeout(
      () => setRevealedCharacterCount(totalCharacterCount),
      expectedDurationMilliseconds * safetyTimeoutDurationMultiplier + safetyTimeoutExtraMilliseconds,
    )
    return () => {
      window.clearInterval(revealIntervalIdentifier)
      window.clearTimeout(safetyTimeoutIdentifier)
    }
  }, [isRevealRunning, revealSteps, charactersPerSecond, totalCharacterCount])

  return isRevealRunning ? Math.min(totalCharacterCount, revealedCharacterCount) : totalCharacterCount
}

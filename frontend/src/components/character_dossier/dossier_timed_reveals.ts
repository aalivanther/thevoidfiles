import { useEffect, useRef, useState } from 'react'
import { chooseAnimationVariantName, randomNumberBetween } from '../../animation/animation_variety'
import { useInteractionFeedback } from '../../audio/interaction_feedback'
import { usePlayerSettings } from '../../settings/player_settings'

const countingVariantNames = ['decelerating_roll', 'mechanical_ticker', 'overshooting_needle'] as const
const typingVariantNames = ['steady_clerk', 'bursting_clerk', 'hesitant_clerk'] as const

type CountingVariantName = (typeof countingVariantNames)[number]

function calculateCountedAmount(
  countingVariantName: CountingVariantName,
  targetAmount: number,
  linearProgress: number,
): number {
  if (linearProgress >= 1) {
    return targetAmount
  }
  if (countingVariantName === 'mechanical_ticker') {
    const steppedProgress = Math.floor(linearProgress * 9) / 9
    return Math.round(targetAmount * steppedProgress)
  }
  if (countingVariantName === 'overshooting_needle') {
    const overshootingProgress = 1 + 0.12 * Math.sin(linearProgress * Math.PI) - Math.pow(1 - linearProgress, 3)
    return Math.round(targetAmount * overshootingProgress)
  }
  return Math.round(targetAmount * (1 - Math.pow(1 - linearProgress, 3)))
}

export function useTimedCountedAmount(targetAmount: number): { displayedAmount: number; hasSettled: boolean } {
  const { shouldReduceMotion } = usePlayerSettings()
  const [countingVariantName] = useState(() => chooseAnimationVariantName('dossier_counted_amount', countingVariantNames))
  const [countingDurationMilliseconds] = useState(() => randomNumberBetween(700, 1150))
  const [linearProgress, setLinearProgress] = useState(0)

  useEffect(() => {
    if (shouldReduceMotion) {
      return
    }
    const startingTimestamp = performance.now()
    const countingIntervalIdentifier = window.setInterval(() => {
      const elapsedProgress = Math.min(1, (performance.now() - startingTimestamp) / countingDurationMilliseconds)
      setLinearProgress(elapsedProgress)
      if (elapsedProgress >= 1) {
        window.clearInterval(countingIntervalIdentifier)
      }
    }, 40)
    return () => window.clearInterval(countingIntervalIdentifier)
  }, [targetAmount, shouldReduceMotion, countingDurationMilliseconds])

  const hasSettled = shouldReduceMotion || linearProgress >= 1
  return {
    displayedAmount: hasSettled ? targetAmount : calculateCountedAmount(countingVariantName, targetAmount, linearProgress),
    hasSettled,
  }
}

export type TypedCharacterReveal = {
  revealedCharacterCount: number
  isTypingFinished: boolean
  completeTyping: () => void
}

export function useTypedCharacterReveal(totalCharacterCount: number, isTypingWanted: boolean): TypedCharacterReveal {
  const { shouldReduceMotion } = usePlayerSettings()
  const playInteractionFeedback = useInteractionFeedback()
  const [typingVariantName] = useState(() => chooseAnimationVariantName('dossier_typed_record', typingVariantNames))
  const [revealedCharacterCount, setRevealedCharacterCount] = useState(0)
  const [hasTypingBeenCompletedByPlayer, setHasTypingBeenCompletedByPlayer] = useState(false)
  const revealedCharacterCountReference = useRef(0)
  const shouldTypingRun = isTypingWanted && !shouldReduceMotion && !hasTypingBeenCompletedByPlayer

  useEffect(() => {
    if (!shouldTypingRun) {
      return
    }
    let pendingTimeoutIdentifier = 0
    const typeNextCharacters = () => {
      const charactersTypedAtOnce = typingVariantName === 'bursting_clerk' ? Math.round(randomNumberBetween(2, 6)) : 2
      const nextRevealedCharacterCount = Math.min(
        totalCharacterCount,
        revealedCharacterCountReference.current + charactersTypedAtOnce,
      )
      revealedCharacterCountReference.current = nextRevealedCharacterCount
      setRevealedCharacterCount(nextRevealedCharacterCount)
      playInteractionFeedback('typewriter_key')
      if (nextRevealedCharacterCount >= totalCharacterCount) {
        return
      }
      const pauseMilliseconds =
        typingVariantName === 'steady_clerk'
          ? 26
          : typingVariantName === 'bursting_clerk'
            ? randomNumberBetween(18, 90)
            : Math.random() < 0.08
              ? randomNumberBetween(180, 320)
              : randomNumberBetween(16, 34)
      pendingTimeoutIdentifier = window.setTimeout(typeNextCharacters, pauseMilliseconds)
    }
    pendingTimeoutIdentifier = window.setTimeout(typeNextCharacters, 520)
    return () => window.clearTimeout(pendingTimeoutIdentifier)
  }, [shouldTypingRun, totalCharacterCount, typingVariantName, playInteractionFeedback])

  const isTypingFinished = !shouldTypingRun || revealedCharacterCount >= totalCharacterCount
  return {
    revealedCharacterCount: isTypingFinished ? totalCharacterCount : revealedCharacterCount,
    isTypingFinished,
    completeTyping: () => setHasTypingBeenCompletedByPlayer(true),
  }
}

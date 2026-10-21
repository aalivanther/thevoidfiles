import { useEffect, useState } from 'react'
import { usePlayerSettings } from '../../settings/player_settings'
import type { DirectorGenerationWaitStageName } from './use_director_generation_wait'

const decodingGlyphs = '▓▒░#%&@§¶†‡∆◊/\\'
const decodingStepMilliseconds = 360
const loopingLineHoldMilliseconds = 2200

type DirectorGenerationLetteringProperties = {
  waitStageName: Exclude<DirectorGenerationWaitStageName, 'idle'>
  assemblingText: string
  loopingTexts: readonly string[]
  completingText: string
  statusLabel: string
}

function scrambleTowardFinalText(finalText: string, decodedShare: number): string {
  const decodedCharacterCount = Math.max(0, Math.min(finalText.length, Math.floor(finalText.length * decodedShare)))
  const unsettledTailLength = Math.min(10, finalText.length - decodedCharacterCount)
  const unsettledTail = Array.from(finalText.slice(decodedCharacterCount, decodedCharacterCount + unsettledTailLength))
    .map((finalCharacter) =>
      finalCharacter === ' ' ? ' ' : decodingGlyphs[Math.floor(Math.random() * decodingGlyphs.length)],
    )
    .join('')
  return finalText.slice(0, decodedCharacterCount) + unsettledTail
}

export function DirectorGenerationLettering({
  waitStageName,
  assemblingText,
  loopingTexts,
  completingText,
  statusLabel,
}: DirectorGenerationLetteringProperties) {
  const { shouldReduceMotion } = usePlayerSettings()
  const [loopingTextIndex, setLoopingTextIndex] = useState(0)
  const [displayedText, setDisplayedText] = useState(assemblingText)
  const currentLoopingText = loopingTexts[loopingTextIndex] ?? assemblingText
  const targetText =
    waitStageName === 'assembling'
      ? assemblingText
      : waitStageName === 'completing'
        ? completingText
        : currentLoopingText

  useEffect(() => {
    if (waitStageName !== 'looping' || loopingTexts.length < 2 || shouldReduceMotion) {
      return
    }
    const lineHoldTimeoutIdentifier = window.setInterval(
      () => setLoopingTextIndex((previousIndex) => (previousIndex + 1) % loopingTexts.length),
      loopingLineHoldMilliseconds,
    )
    return () => window.clearInterval(lineHoldTimeoutIdentifier)
  }, [waitStageName, loopingTexts, shouldReduceMotion])

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayedText(targetText)
      return
    }
    if (waitStageName === 'looping') {
      setDisplayedText(targetText)
      return
    }
    const startedAtTimestamp = performance.now()
    const decodingIntervalIdentifier = window.setInterval(() => {
      const decodedShare = Math.min(1, (performance.now() - startedAtTimestamp) / 480)
      if (decodedShare >= 1) {
        setDisplayedText(targetText)
        window.clearInterval(decodingIntervalIdentifier)
        return
      }
      setDisplayedText(scrambleTowardFinalText(targetText, decodedShare))
    }, decodingStepMilliseconds)
    setDisplayedText(scrambleTowardFinalText(targetText, 0.12))
    return () => window.clearInterval(decodingIntervalIdentifier)
  }, [targetText, waitStageName, shouldReduceMotion])

  return (
    <p className="director-generation-lettering director-wait-keeps-alive" data-wait-stage-name={waitStageName} role="status">
      <span className="visually-hidden-text">{statusLabel}</span>
      <span aria-hidden="true">{displayedText}</span>
    </p>
  )
}

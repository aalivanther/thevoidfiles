import { useEffect, useState } from 'react'
import { usePlayerSettings } from '../settings/player_settings'

const decodingGlyphs = '▓▒░#%&@§¶†‡∆◊/\\'
const decodingStepMilliseconds = 42

type DecodingTextProperties = {
  finalText: string
  startDelayMilliseconds: number
  durationMilliseconds: number
}

export function DecodingText({ finalText, startDelayMilliseconds, durationMilliseconds }: DecodingTextProperties) {
  const { shouldReduceMotion } = usePlayerSettings()
  const [displayedText, setDisplayedText] = useState(shouldReduceMotion ? finalText : '')

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayedText(finalText)
      return
    }
    const startTimestamp = performance.now() + startDelayMilliseconds
    const decodingIntervalIdentifier = window.setInterval(() => {
      const decodedShare = (performance.now() - startTimestamp) / durationMilliseconds
      if (decodedShare < 0) {
        return
      }
      if (decodedShare >= 1) {
        setDisplayedText(finalText)
        window.clearInterval(decodingIntervalIdentifier)
        return
      }
      const decodedCharacterCount = Math.floor(finalText.length * decodedShare)
      const unsettledTailLength = Math.min(14, finalText.length - decodedCharacterCount)
      const unsettledTail = Array.from(finalText.slice(decodedCharacterCount, decodedCharacterCount + unsettledTailLength))
        .map((finalCharacter) =>
          finalCharacter === ' ' ? ' ' : decodingGlyphs[Math.floor(Math.random() * decodingGlyphs.length)],
        )
        .join('')
      setDisplayedText(finalText.slice(0, decodedCharacterCount) + unsettledTail)
    }, decodingStepMilliseconds)
    return () => window.clearInterval(decodingIntervalIdentifier)
  }, [finalText, startDelayMilliseconds, durationMilliseconds, shouldReduceMotion])

  return (
    <>
      <span aria-hidden="true">{displayedText}</span>
      <span className="visually-hidden-text">{finalText}</span>
    </>
  )
}

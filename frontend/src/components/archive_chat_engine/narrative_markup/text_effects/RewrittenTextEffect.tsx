import gsap from 'gsap'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { useEffect, useRef } from 'react'
import { useInteractionFeedback } from '../../../../audio/interaction_feedback'
import type { EffectPlaybackStateName } from './use_one_time_effect_playback'

gsap.registerPlugin(ScrambleTextPlugin)

export type RewrittenTextEffectProperties = {
  textBeforeRewriting: string
  textAfterRewriting: string
  visibleCharacterCount: number
  totalCharacterCount: number
  playbackStateName: EffectPlaybackStateName
  shouldUseFullMotion: boolean
}

const scrambleDurationSeconds = 0.5
const scrambleCharacters = 'abcdefghijklmnñopqrstuvwxyz'
const rewritingKeySoundDelaysMilliseconds = [0, 160, 320]

export function RewrittenTextEffect({
  textBeforeRewriting,
  textAfterRewriting,
  visibleCharacterCount,
  totalCharacterCount,
  playbackStateName,
  shouldUseFullMotion,
}: RewrittenTextEffectProperties) {
  const playInteractionFeedback = useInteractionFeedback()
  const scramblingElement = useRef<HTMLSpanElement>(null)
  const isScrambling = playbackStateName === 'playing' && shouldUseFullMotion

  useEffect(() => {
    if (playbackStateName !== 'playing') {
      return
    }
    const keySoundTimeoutIdentifiers = rewritingKeySoundDelaysMilliseconds.map((delayMilliseconds) =>
      window.setTimeout(() => playInteractionFeedback('typewriter_key'), delayMilliseconds),
    )
    return () => keySoundTimeoutIdentifiers.forEach((timeoutIdentifier) => window.clearTimeout(timeoutIdentifier))
  }, [playbackStateName, playInteractionFeedback])

  useEffect(() => {
    const targetElement = scramblingElement.current
    if (!isScrambling || !targetElement) {
      return
    }
    targetElement.textContent = textBeforeRewriting
    const scrambleTween = gsap.to(targetElement, {
      duration: scrambleDurationSeconds,
      ease: 'none',
      scrambleText: { text: textAfterRewriting, chars: scrambleCharacters, speed: 0.7 },
    })
    return () => {
      scrambleTween.kill()
    }
  }, [isScrambling, textBeforeRewriting, textAfterRewriting])

  if (playbackStateName === 'finished') {
    return (
      <span key="settled">
        {visibleCharacterCount >= totalCharacterCount
          ? textAfterRewriting
          : Array.from(textAfterRewriting).slice(0, visibleCharacterCount).join('')}
      </span>
    )
  }
  if (isScrambling) {
    return (
      <>
        <span className="visually-hidden-text">{textAfterRewriting}</span>
        <span key="scrambling" ref={scramblingElement} aria-hidden="true" />
      </>
    )
  }
  const beforeCharacters = Array.from(textBeforeRewriting)
  const visibleBeforeCharacterCount =
    visibleCharacterCount >= totalCharacterCount
      ? beforeCharacters.length
      : Math.ceil((visibleCharacterCount / Math.max(1, totalCharacterCount)) * beforeCharacters.length)
  return <span key="original">{beforeCharacters.slice(0, visibleBeforeCharacterCount).join('')}</span>
}

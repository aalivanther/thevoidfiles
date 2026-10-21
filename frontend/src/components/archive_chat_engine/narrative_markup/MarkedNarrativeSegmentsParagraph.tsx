import { useCallback, useMemo } from 'react'
import { useInteractionFeedback } from '../../../audio/interaction_feedback'
import { usePlayerSettings } from '../../../settings/player_settings'
import {
  playDurationMillisecondsByNarrativeTextEffectName,
  reducedMotionInterferenceOutlineMilliseconds,
} from './narrative_markup_effect_catalog'
import type { NarrativeTextEffectName } from './narrative_markup_effect_catalog'
import type { MarkedNarrativeSegment } from './narrative_markup_parser'
import { RedactedTextBlock } from './text_effects/RedactedTextBlock'
import { RewrittenTextEffect } from './text_effects/RewrittenTextEffect'
import { TremorTextEffect } from './text_effects/TremorTextEffect'
import { useOneTimeEffectPlayback } from './text_effects/use_one_time_effect_playback'

export type MarkedNarrativeSegmentsParagraphProperties = {
  segments: MarkedNarrativeSegment[]
  visibleCharacterLimit?: number
  shouldShowCaret?: boolean
  shouldPlayEffects: boolean
}

const effectPlaybackVariantCount = 3

const classNameByNarrativeTextEffectName: Record<NarrativeTextEffectName, string> = {
  anomalous: 'anomalous-word narrative-effect-anomalous',
  tremor: 'narrative-effect-tremor',
  heartbeat: 'narrative-effect-heartbeat',
  whisper: 'narrative-effect-whisper',
  shout: 'narrative-effect-shout',
  struck_through: 'narrative-effect-struck-through',
  redacted: 'narrative-effect-redacted',
  interference: 'narrative-effect-interference',
  ink_bleed: 'narrative-effect-ink-bleed',
  fading: 'narrative-effect-fading',
  rewritten: 'narrative-effect-rewritten',
  document_type: 'narrative-effect-document-type',
  pause: '',
  slow_reveal: 'narrative-effect-slow-reveal',
  fast_reveal: 'narrative-effect-fast-reveal',
}

function readPlayDurationMilliseconds(effectNames: NarrativeTextEffectName[], shouldUseFullMotion: boolean): number {
  const longestDurationMilliseconds = effectNames.reduce(
    (runningDuration, effectName) =>
      Math.max(runningDuration, playDurationMillisecondsByNarrativeTextEffectName[effectName] ?? 0),
    0,
  )
  return effectNames.includes('interference') && !shouldUseFullMotion
    ? Math.max(longestDurationMilliseconds, reducedMotionInterferenceOutlineMilliseconds)
    : longestDurationMilliseconds
}

type MarkedNarrativeSpanProperties = {
  segment: MarkedNarrativeSegment
  segmentCharacters: string[]
  visibleCharacterCount: number
  shouldPlayEffects: boolean
  shouldUseFullMotion: boolean
}

function MarkedNarrativeSpan({
  segment,
  segmentCharacters,
  visibleCharacterCount,
  shouldPlayEffects,
  shouldUseFullMotion,
}: MarkedNarrativeSpanProperties) {
  const playInteractionFeedback = useInteractionFeedback()
  const { effectNames } = segment
  const isSegmentCompletelyVisible = visibleCharacterCount >= segmentCharacters.length

  const playEffectStartSound = useCallback(() => {
    if (effectNames.includes('anomalous')) {
      playInteractionFeedback('anomaly_glitch')
    }
    if (effectNames.includes('struck_through')) {
      playInteractionFeedback('typewriter_key')
    }
    if (effectNames.includes('redacted')) {
      playInteractionFeedback('stamp_impact', { volumeMultiplier: 0.4 })
    }
    if (effectNames.includes('interference')) {
      playInteractionFeedback('screen_tear', { volumeMultiplier: 0.7 })
    }
  }, [effectNames, playInteractionFeedback])

  const { playbackStateName, playbackVariantIndex } = useOneTimeEffectPlayback({
    animationName: `narrative_text_effect_${effectNames.join('_')}`,
    variantCount: effectPlaybackVariantCount,
    isSegmentCompletelyVisible,
    shouldPlayEffects,
    playDurationMilliseconds: readPlayDurationMilliseconds(effectNames, shouldUseFullMotion),
    onPlaybackStarted: playEffectStartSound,
  })

  const visibleSegmentText = isSegmentCompletelyVisible
    ? segment.visibleText
    : segmentCharacters.slice(0, visibleCharacterCount).join('')
  const spanClassName = [
    'narrative-marked-span',
    ...effectNames.map((effectName) => classNameByNarrativeTextEffectName[effectName]),
    `is-effect-${playbackStateName}`,
  ]
    .filter((className) => className.length > 0)
    .join(' ')

  if (effectNames.includes('redacted')) {
    return (
      <span className={spanClassName}>
        <RedactedTextBlock
          visibleBlockCount={Math.min(visibleCharacterCount, segmentCharacters.length)}
          playbackStateName={playbackStateName}
          shouldUseFullMotion={shouldUseFullMotion}
        />
      </span>
    )
  }

  const isTremorPlaying = effectNames.includes('tremor') && playbackStateName === 'playing' && shouldUseFullMotion
  const isRewritten = effectNames.includes('rewritten') && segment.textBeforeRewriting !== null
  const isInterferencePlaying = effectNames.includes('interference') && playbackStateName === 'playing'
  const SpanElementName = effectNames.includes('struck_through') ? 'del' : 'span'

  return (
    <SpanElementName
      className={spanClassName}
      data-effect-variant={playbackVariantIndex}
      data-interference-text={isInterferencePlaying && shouldUseFullMotion ? segment.visibleText : undefined}
    >
      {isRewritten ? (
        <RewrittenTextEffect
          textBeforeRewriting={segment.textBeforeRewriting ?? ''}
          textAfterRewriting={segment.visibleText}
          visibleCharacterCount={visibleCharacterCount}
          totalCharacterCount={segmentCharacters.length}
          playbackStateName={playbackStateName}
          shouldUseFullMotion={shouldUseFullMotion}
        />
      ) : isTremorPlaying ? (
        <TremorTextEffect visibleText={segment.visibleText} />
      ) : (
        visibleSegmentText
      )}
    </SpanElementName>
  )
}

export function MarkedNarrativeSegmentsParagraph({
  segments,
  visibleCharacterLimit,
  shouldShowCaret = false,
  shouldPlayEffects,
}: MarkedNarrativeSegmentsParagraphProperties) {
  const { playerSettings, shouldReduceMotion } = usePlayerSettings()
  const shouldUseFullMotion = !shouldReduceMotion && playerSettings.screenEffectsIntensity !== 'minimal'
  const charactersBySegment = useMemo(() => segments.map((segment) => Array.from(segment.visibleText)), [segments])
  const characterCountBeforeSegment = useMemo(
    () =>
      charactersBySegment.map((_, segmentIndex) =>
        charactersBySegment
          .slice(0, segmentIndex)
          .reduce((runningTotal, segmentCharacters) => runningTotal + segmentCharacters.length, 0),
      ),
    [charactersBySegment],
  )
  const allowedCharacterCount =
    visibleCharacterLimit === undefined ? Number.POSITIVE_INFINITY : Math.max(0, visibleCharacterLimit)

  return (
    <p className="narrative-marked-paragraph">
      {segments.map((segment, segmentIndex) => {
        const segmentCharacters = charactersBySegment[segmentIndex]
        const visibleCharacterCount = Math.max(
          0,
          Math.min(segmentCharacters.length, allowedCharacterCount - characterCountBeforeSegment[segmentIndex]),
        )
        if (segmentCharacters.length === 0 || visibleCharacterCount <= 0) {
          return null
        }
        if (segment.effectNames.length === 0) {
          return (
            <span key={segmentIndex}>
              {visibleCharacterCount >= segmentCharacters.length
                ? segment.visibleText
                : segmentCharacters.slice(0, visibleCharacterCount).join('')}
            </span>
          )
        }
        return (
          <MarkedNarrativeSpan
            key={segmentIndex}
            segment={segment}
            segmentCharacters={segmentCharacters}
            visibleCharacterCount={visibleCharacterCount}
            shouldPlayEffects={shouldPlayEffects}
            shouldUseFullMotion={shouldUseFullMotion}
          />
        )
      })}
      {shouldShowCaret ? <span className="typewriter-caret" aria-hidden="true" /> : null}
    </p>
  )
}

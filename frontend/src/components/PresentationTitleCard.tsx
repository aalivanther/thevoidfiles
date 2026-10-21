import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { chooseAnimationVariantName, randomNumberBetween } from '../animation/animation_variety'
import { useScenePlaybackOccupation } from '../animation/scene_playback_clock'
import { useInteractionFeedback } from '../audio/interaction_feedback'
import { usePlayerSettings } from '../settings/player_settings'
import { spanishInterfaceCopy } from '../spanish_interface_copy'

gsap.registerPlugin(useGSAP, SplitText)

const presentationHoldMilliseconds = 3000
const entranceDelaySeconds = 0.62
const impactSoundDelayMilliseconds = 640
const titleEntranceVariantNames = ['heavy_slam', 'scattered_letters', 'flickering_signal', 'rising_words'] as const
const reducedMotionHoldMilliseconds = 1200

type PresentationTitleCardProperties = {
  chapterLabel: string
  chapterTitle: string
  detailLine?: string
  onPresentationFinished: () => void
}

export function PresentationTitleCard({
  chapterLabel,
  chapterTitle,
  detailLine,
  onPresentationFinished,
}: PresentationTitleCardProperties) {
  const { shouldReduceMotion } = usePlayerSettings()
  const playInteractionFeedback = useInteractionFeedback()
  const finishedCallback = useRef(onPresentationFinished)
  const cardElement = useRef<HTMLButtonElement>(null)
  const titleElement = useRef<HTMLSpanElement>(null)
  const [titleEntranceVariantName] = useState(() =>
    chooseAnimationVariantName('presentation_title', titleEntranceVariantNames),
  )
  const [bandStyle] = useState(
    () =>
      ({
        '--band-tilt': `${randomNumberBetween(-7, 7).toFixed(1)}deg`,
        '--band-height': `${randomNumberBetween(16, 27).toFixed(0)}%`,
      }) as CSSProperties,
  )

  useGSAP(
    () => {
      if (shouldReduceMotion || titleEntranceVariantName === 'heavy_slam' || !titleElement.current) {
        return
      }
      const splitTitle = SplitText.create(titleElement.current, { type: 'words,chars' })
      if (titleEntranceVariantName === 'scattered_letters') {
        gsap.from(splitTitle.chars, {
          opacity: 0,
          x: () => randomNumberBetween(-260, 260),
          y: () => randomNumberBetween(-180, 180),
          rotate: () => randomNumberBetween(-120, 120),
          scale: () => randomNumberBetween(0.2, 2.6),
          duration: 0.7,
          ease: 'expo.out',
          stagger: { each: 0.018, from: 'random' },
          delay: entranceDelaySeconds,
        })
        return
      }
      if (titleEntranceVariantName === 'flickering_signal') {
        gsap.from(splitTitle.chars, {
          opacity: 0,
          duration: 0.05,
          repeat: 5,
          yoyo: true,
          ease: 'steps(1)',
          stagger: { each: 0.035, from: 'random' },
          delay: entranceDelaySeconds,
        })
        gsap.from(titleElement.current, { skewX: 24, x: -30, duration: 0.5, ease: 'elastic.out(1, 0.45)', delay: entranceDelaySeconds })
        return
      }
      gsap.from(splitTitle.words, {
        opacity: 0,
        yPercent: 120,
        rotate: 6,
        duration: 0.55,
        ease: 'back.out(1.8)',
        stagger: 0.09,
        delay: entranceDelaySeconds,
      })
    },
    { scope: cardElement, dependencies: [titleEntranceVariantName, shouldReduceMotion] },
  )
  useScenePlaybackOccupation(
    'presentation-title-card',
    'signature',
    true,
    shouldReduceMotion ? reducedMotionHoldMilliseconds : presentationHoldMilliseconds,
  )
  const hasFinished = useRef(false)

  useEffect(() => {
    finishedCallback.current = onPresentationFinished
  }, [onPresentationFinished])

  const finishPresentation = () => {
    if (hasFinished.current) {
      return
    }
    hasFinished.current = true
    finishedCallback.current()
  }

  useEffect(() => {
    const impactSoundTimeoutIdentifier = window.setTimeout(
      () => playInteractionFeedback('stamp_impact'),
      impactSoundDelayMilliseconds,
    )
    const holdTimeoutIdentifier = window.setTimeout(
      finishPresentation,
      shouldReduceMotion ? reducedMotionHoldMilliseconds : presentationHoldMilliseconds,
    )
    return () => {
      window.clearTimeout(impactSoundTimeoutIdentifier)
      window.clearTimeout(holdTimeoutIdentifier)
    }
  }, [playInteractionFeedback, shouldReduceMotion])

  return (
    <button
      ref={cardElement}
      type="button"
      style={bandStyle}
      className="presentation-card-backdrop fixed inset-0 z-[45] flex cursor-pointer flex-col items-center justify-center overflow-hidden bg-void-base px-6 text-center"
      aria-label={`${chapterLabel}. ${chapterTitle}. ${spanishInterfaceCopy.presentationCard.skipHint}`}
      onClick={finishPresentation}
    >
      <span className="presentation-card-upper-band" aria-hidden="true" />
      <span className="presentation-card-lower-band" aria-hidden="true" />
      <span className="dossier-label presentation-card-label">{chapterLabel}</span>
      <span
        ref={titleElement}
        className={`display-title mt-3 max-w-4xl text-[clamp(2.25rem,8vw,5.5rem)] ${
          titleEntranceVariantName === 'heavy_slam' || shouldReduceMotion ? 'presentation-card-title' : ''
        }`}
      >
        {chapterTitle}
      </span>
      {detailLine ? (
        <span className="presentation-card-detail mt-4 font-[family-name:var(--font-dossier)] text-sm tracking-wide text-paper-muted">
          {detailLine}
        </span>
      ) : null}
      <span className="dossier-label presentation-card-detail absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))]">
        {spanishInterfaceCopy.presentationCard.skipHint}
      </span>
    </button>
  )
}

import { useEffect, useRef, useState } from 'react'
import { chooseAnimationVariantIndex } from '../../../../animation/animation_variety'

export type EffectPlaybackStateName = 'waiting' | 'playing' | 'finished'

export type OneTimeEffectPlayback = {
  playbackStateName: EffectPlaybackStateName
  playbackVariantIndex: number
}

export type OneTimeEffectPlaybackRequest = {
  animationName: string
  variantCount: number
  isSegmentCompletelyVisible: boolean
  shouldPlayEffects: boolean
  playDurationMilliseconds: number
  onPlaybackStarted: () => void
}

export function useOneTimeEffectPlayback({
  animationName,
  variantCount,
  isSegmentCompletelyVisible,
  shouldPlayEffects,
  playDurationMilliseconds,
  onPlaybackStarted,
}: OneTimeEffectPlaybackRequest): OneTimeEffectPlayback {
  const [playback, setPlayback] = useState<OneTimeEffectPlayback & { waitingSessionNumber: number }>({
    playbackStateName: shouldPlayEffects && playDurationMilliseconds > 0 ? 'waiting' : 'finished',
    playbackVariantIndex: 0,
    waitingSessionNumber: 1,
  })
  const [previousShouldPlayEffects, setPreviousShouldPlayEffects] = useState(shouldPlayEffects)
  const lastStartedWaitingSessionNumber = useRef(0)
  const latestPlaybackStartedCallback = useRef(onPlaybackStarted)

  if (previousShouldPlayEffects !== shouldPlayEffects) {
    setPreviousShouldPlayEffects(shouldPlayEffects)
    if (shouldPlayEffects && !isSegmentCompletelyVisible && playDurationMilliseconds > 0) {
      setPlayback({
        playbackStateName: 'waiting',
        playbackVariantIndex: 0,
        waitingSessionNumber: playback.waitingSessionNumber + 1,
      })
    }
    if (!shouldPlayEffects && playback.playbackStateName === 'waiting') {
      setPlayback({ ...playback, playbackStateName: 'finished' })
    }
  }

  useEffect(() => {
    latestPlaybackStartedCallback.current = onPlaybackStarted
  }, [onPlaybackStarted])

  useEffect(() => {
    if (
      playback.playbackStateName !== 'waiting' ||
      !shouldPlayEffects ||
      !isSegmentCompletelyVisible ||
      lastStartedWaitingSessionNumber.current === playback.waitingSessionNumber
    ) {
      return
    }
    lastStartedWaitingSessionNumber.current = playback.waitingSessionNumber
    const chosenVariantIndex = chooseAnimationVariantIndex(animationName, variantCount)
    setPlayback((previousPlayback) => ({
      ...previousPlayback,
      playbackStateName: 'playing',
      playbackVariantIndex: chosenVariantIndex,
    }))
    latestPlaybackStartedCallback.current()
  }, [
    playback.playbackStateName,
    playback.waitingSessionNumber,
    shouldPlayEffects,
    isSegmentCompletelyVisible,
    animationName,
    variantCount,
  ])

  useEffect(() => {
    if (playback.playbackStateName !== 'playing') {
      return
    }
    const finishTimeoutIdentifier = window.setTimeout(
      () => setPlayback((previousPlayback) => ({ ...previousPlayback, playbackStateName: 'finished' })),
      playDurationMilliseconds,
    )
    return () => window.clearTimeout(finishTimeoutIdentifier)
  }, [playback.playbackStateName, playDurationMilliseconds])

  return playback
}

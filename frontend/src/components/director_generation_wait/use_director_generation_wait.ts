import { useCallback, useEffect, useRef, useState } from 'react'
import { useScenePlaybackOccupation } from '../../animation/scene_playback_clock'
import { usePlayerSettings } from '../../settings/player_settings'

export type DirectorGenerationWaitStageName = 'idle' | 'assembling' | 'looping' | 'completing'

const assemblingDurationMilliseconds = 520
const completingDurationMilliseconds = 480
const reducedMotionStageMilliseconds = 150

export function useDirectorGenerationWait() {
  const { shouldReduceMotion } = usePlayerSettings()
  const [waitStageName, setWaitStageName] = useState<DirectorGenerationWaitStageName>('idle')
  const waitSessionNumber = useRef(0)
  const hasGenerationCompleted = useRef(false)
  const hasAssemblingFinished = useRef(false)
  const completionSequenceFinishedResolver = useRef<(() => void) | null>(null)
  const scheduledTimeoutIdentifiers = useRef<number[]>([])

  const clearScheduledTimeouts = useCallback(() => {
    scheduledTimeoutIdentifiers.current.forEach((timeoutIdentifier) => window.clearTimeout(timeoutIdentifier))
    scheduledTimeoutIdentifiers.current = []
  }, [])

  const scheduleTimeout = useCallback((callback: () => void, delayMilliseconds: number) => {
    const timeoutIdentifier = window.setTimeout(callback, delayMilliseconds)
    scheduledTimeoutIdentifiers.current.push(timeoutIdentifier)
    return timeoutIdentifier
  }, [])

  const enterCompletingStage = useCallback(
    (sessionNumber: number) => {
      setWaitStageName('completing')
      scheduleTimeout(() => {
        if (sessionNumber !== waitSessionNumber.current) {
          return
        }
        setWaitStageName('idle')
        const resolveCompletionSequence = completionSequenceFinishedResolver.current
        completionSequenceFinishedResolver.current = null
        resolveCompletionSequence?.()
      }, shouldReduceMotion ? reducedMotionStageMilliseconds : completingDurationMilliseconds)
    },
    [scheduleTimeout, shouldReduceMotion],
  )

  const beginGeneration = useCallback(() => {
    clearScheduledTimeouts()
    completionSequenceFinishedResolver.current?.()
    completionSequenceFinishedResolver.current = null
    waitSessionNumber.current += 1
    const sessionNumber = waitSessionNumber.current
    hasGenerationCompleted.current = false
    hasAssemblingFinished.current = false
    setWaitStageName('assembling')
    scheduleTimeout(() => {
      if (sessionNumber !== waitSessionNumber.current) {
        return
      }
      hasAssemblingFinished.current = true
      if (hasGenerationCompleted.current) {
        enterCompletingStage(sessionNumber)
        return
      }
      setWaitStageName('looping')
    }, shouldReduceMotion ? reducedMotionStageMilliseconds : assemblingDurationMilliseconds)
  }, [clearScheduledTimeouts, enterCompletingStage, scheduleTimeout, shouldReduceMotion])

  const markGenerationCompletedAndWaitForSequence = useCallback(() => {
    return new Promise<void>((resolveWaiting) => {
      hasGenerationCompleted.current = true
      completionSequenceFinishedResolver.current = resolveWaiting
      if (hasAssemblingFinished.current) {
        enterCompletingStage(waitSessionNumber.current)
      }
    })
  }, [enterCompletingStage])

  useEffect(
    () => () => {
      clearScheduledTimeouts()
      completionSequenceFinishedResolver.current?.()
      completionSequenceFinishedResolver.current = null
    },
    [clearScheduledTimeouts],
  )

  useScenePlaybackOccupation('director-generation-wait', 'reveal', waitStageName !== 'idle')

  return {
    waitStageName,
    isGenerationWaitActive: waitStageName !== 'idle',
    beginGeneration,
    markGenerationCompletedAndWaitForSequence,
  }
}

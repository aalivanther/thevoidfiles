import { useCallback, useEffect, useRef, useState } from 'react'

export type TimedSequenceOptions = {
  stepDurationsMilliseconds: readonly number[]
  earliestSkippableStepIndex: number
  onStepEntered: (stepIndex: number, wasReachedBySkipping: boolean) => void
  onSequenceCompleted: () => void
}

export type TimedSequencePlayback = {
  currentStepIndex: number
  canSkipToFinalStep: boolean
  skipToFinalStep: () => void
}

const sequenceSafetyMarginMilliseconds = 3000
const progressRefreshIntervalMilliseconds = 50

export function useTimedSequence({
  stepDurationsMilliseconds,
  earliestSkippableStepIndex,
  onStepEntered,
  onSequenceCompleted,
}: TimedSequenceOptions): TimedSequencePlayback {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [initialStepDurationsMilliseconds] = useState(() => [...stepDurationsMilliseconds])
  const finalStepIndex = initialStepDurationsMilliseconds.length - 1
  const stepEnteredCallback = useRef(onStepEntered)
  const sequenceCompletedCallback = useRef(onSequenceCompleted)
  const hasSequenceCompleted = useRef(false)
  const lastAnnouncedStepIndex = useRef(-1)
  const wasFinalStepReachedBySkipping = useRef(false)

  useEffect(() => {
    stepEnteredCallback.current = onStepEntered
    sequenceCompletedCallback.current = onSequenceCompleted
  }, [onStepEntered, onSequenceCompleted])

  const completeSequenceOnce = useCallback(() => {
    if (hasSequenceCompleted.current) {
      return
    }
    hasSequenceCompleted.current = true
    sequenceCompletedCallback.current()
  }, [])

  useEffect(() => {
    const totalDurationMilliseconds = initialStepDurationsMilliseconds.reduce(
      (runningDuration, stepDuration) => runningDuration + stepDuration,
      0,
    )
    const safetyTimeoutIdentifier = window.setTimeout(
      completeSequenceOnce,
      totalDurationMilliseconds + sequenceSafetyMarginMilliseconds,
    )
    return () => window.clearTimeout(safetyTimeoutIdentifier)
  }, [initialStepDurationsMilliseconds, completeSequenceOnce])

  useEffect(() => {
    if (lastAnnouncedStepIndex.current !== currentStepIndex) {
      lastAnnouncedStepIndex.current = currentStepIndex
      stepEnteredCallback.current(currentStepIndex, wasFinalStepReachedBySkipping.current)
    }
    const stepTimeoutIdentifier = window.setTimeout(() => {
      if (currentStepIndex >= finalStepIndex) {
        completeSequenceOnce()
        return
      }
      setCurrentStepIndex(currentStepIndex + 1)
    }, initialStepDurationsMilliseconds[currentStepIndex])
    return () => window.clearTimeout(stepTimeoutIdentifier)
  }, [currentStepIndex, finalStepIndex, initialStepDurationsMilliseconds, completeSequenceOnce])

  const canSkipToFinalStep = currentStepIndex >= earliestSkippableStepIndex && currentStepIndex < finalStepIndex

  const skipToFinalStep = useCallback(() => {
    const reachedStepIndex = lastAnnouncedStepIndex.current
    if (reachedStepIndex < earliestSkippableStepIndex || reachedStepIndex >= finalStepIndex) {
      return
    }
    wasFinalStepReachedBySkipping.current = true
    setCurrentStepIndex(finalStepIndex)
  }, [earliestSkippableStepIndex, finalStepIndex])

  return { currentStepIndex, canSkipToFinalStep, skipToFinalStep }
}

export function useTimedProgressShare(hasStarted: boolean, durationMilliseconds: number): number {
  const [progressShare, setProgressShare] = useState(0)

  useEffect(() => {
    if (!hasStarted) {
      return
    }
    const startTimestamp = Date.now()
    const progressIntervalIdentifier = window.setInterval(() => {
      const elapsedShare = Math.min(1, (Date.now() - startTimestamp) / Math.max(1, durationMilliseconds))
      setProgressShare(elapsedShare)
      if (elapsedShare >= 1) {
        window.clearInterval(progressIntervalIdentifier)
      }
    }, progressRefreshIntervalMilliseconds)
    return () => window.clearInterval(progressIntervalIdentifier)
  }, [hasStarted, durationMilliseconds])

  return progressShare
}

import { useEffect } from 'react'

export type ScenePlaybackLaneName = 'ambient' | 'reveal' | 'signature' | 'transition'

export const maximumSceneFlashesPerSecond = 3
export const sceneTransitionDurationMilliseconds = 560
export const sceneTransitionCoverMilliseconds = 220

const lanePriorityByName: Record<ScenePlaybackLaneName, number> = {
  ambient: 0,
  reveal: 1,
  signature: 2,
  transition: 3,
}

type ScenePlaybackOccupation = {
  occupationIdentifier: string
  laneName: ScenePlaybackLaneName
  releaseTimeoutIdentifier: number | null
}

const occupationsByIdentifier = new Map<string, ScenePlaybackOccupation>()
const flashCountingWindowMilliseconds = 1000
let recentSceneFlashTimestamps: number[] = []

function readHighestOccupiedLaneName(): ScenePlaybackLaneName | null {
  let highestLaneName: ScenePlaybackLaneName | null = null
  let highestPriority = -1
  for (const occupation of occupationsByIdentifier.values()) {
    const lanePriority = lanePriorityByName[occupation.laneName]
    if (lanePriority > highestPriority) {
      highestPriority = lanePriority
      highestLaneName = occupation.laneName
    }
  }
  return highestLaneName
}

function publishScenePlaybackDocumentState() {
  if (typeof document === 'undefined') {
    return
  }
  const highestLaneName = readHighestOccupiedLaneName()
  const shouldPauseAmbient = highestLaneName !== null && highestLaneName !== 'ambient'
  document.documentElement.dataset.scenePlaybackHighestLane = highestLaneName ?? 'idle'
  document.documentElement.dataset.scenePlaybackAmbient = shouldPauseAmbient ? 'paused' : 'running'
}

function clearOccupationTimeout(occupation: ScenePlaybackOccupation) {
  if (occupation.releaseTimeoutIdentifier !== null) {
    window.clearTimeout(occupation.releaseTimeoutIdentifier)
  }
}

export function releaseScenePlaybackLane(occupationIdentifier: string) {
  const occupation = occupationsByIdentifier.get(occupationIdentifier)
  if (!occupation) {
    return
  }
  clearOccupationTimeout(occupation)
  occupationsByIdentifier.delete(occupationIdentifier)
  publishScenePlaybackDocumentState()
}

export function occupyScenePlaybackLane(
  occupationIdentifier: string,
  laneName: ScenePlaybackLaneName,
  budgetMilliseconds: number,
) {
  const occupyingSameLaneIdentifiers: string[] = []
  for (const [existingOccupationIdentifier, existingOccupation] of occupationsByIdentifier) {
    if (
      existingOccupation.laneName === laneName &&
      existingOccupationIdentifier !== occupationIdentifier &&
      laneName !== 'ambient'
    ) {
      occupyingSameLaneIdentifiers.push(existingOccupationIdentifier)
    }
  }
  occupyingSameLaneIdentifiers.forEach((existingOccupationIdentifier) => {
    releaseScenePlaybackLane(existingOccupationIdentifier)
  })
  const previousOccupation = occupationsByIdentifier.get(occupationIdentifier)
  if (previousOccupation) {
    clearOccupationTimeout(previousOccupation)
  }
  const releaseTimeoutIdentifier =
    budgetMilliseconds > 0
      ? window.setTimeout(() => {
          releaseScenePlaybackLane(occupationIdentifier)
        }, budgetMilliseconds)
      : null
  occupationsByIdentifier.set(occupationIdentifier, {
    occupationIdentifier,
    laneName,
    releaseTimeoutIdentifier,
  })
  publishScenePlaybackDocumentState()
}

export function isScenePlaybackLaneOccupied(laneName: ScenePlaybackLaneName) {
  for (const occupation of occupationsByIdentifier.values()) {
    if (occupation.laneName === laneName) {
      return true
    }
  }
  return false
}

export function shouldPauseAmbientPlayback() {
  const highestLaneName = readHighestOccupiedLaneName()
  return highestLaneName !== null && highestLaneName !== 'ambient'
}

export function requestSceneFlashPermission(currentTimestampMilliseconds: number) {
  recentSceneFlashTimestamps = recentSceneFlashTimestamps.filter(
    (flashTimestamp) => currentTimestampMilliseconds - flashTimestamp < flashCountingWindowMilliseconds,
  )
  if (recentSceneFlashTimestamps.length >= maximumSceneFlashesPerSecond) {
    return false
  }
  recentSceneFlashTimestamps.push(currentTimestampMilliseconds)
  return true
}

export function forgetScenePlaybackOccupations() {
  for (const occupation of occupationsByIdentifier.values()) {
    clearOccupationTimeout(occupation)
  }
  occupationsByIdentifier.clear()
  recentSceneFlashTimestamps = []
  publishScenePlaybackDocumentState()
}

export function useScenePlaybackOccupation(
  occupationIdentifier: string,
  laneName: ScenePlaybackLaneName,
  isOccupationActive: boolean,
  budgetMilliseconds = 0,
) {
  useEffect(() => {
    if (!isOccupationActive) {
      releaseScenePlaybackLane(occupationIdentifier)
      return
    }
    occupyScenePlaybackLane(occupationIdentifier, laneName, budgetMilliseconds)
    return () => {
      releaseScenePlaybackLane(occupationIdentifier)
    }
  }, [occupationIdentifier, laneName, isOccupationActive, budgetMilliseconds])
}

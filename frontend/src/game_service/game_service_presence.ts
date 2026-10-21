import { gameServiceCopy } from '../copy/game_service_copy'
import { readGameServiceHealth } from './game_service_client'
import type { GameServiceHealth } from './game_service_client'
import { createProfile, openProfile } from './profile_catalogue_requests'

export const defaultProfileIdentifier = 'main_chronicle'

const servicePresenceProbeTimeoutMilliseconds = 1500
const profileNotFoundFailureName = 'profile_not_found'
const profileAlreadyRegisteredFailureName = 'profile_already_registered'

export type GameServicePresence = {
  isServicePresent: boolean
  providerModeName: GameServiceHealth['providerModeName'] | null
  activeProfileIdentifier: string | null
}

const absentGameServicePresence: GameServicePresence = {
  isServicePresent: false,
  providerModeName: null,
  activeProfileIdentifier: null,
}

let pendingGameServicePresence: Promise<GameServicePresence> | null = null
let knownGameServicePresence: GameServicePresence | null = null

async function ensureDefaultProfileIsOpen(): Promise<string | null> {
  const firstOpeningResult = await openProfile(defaultProfileIdentifier)
  if (firstOpeningResult.wasSuccessful) {
    return firstOpeningResult.value.isArchived ? null : firstOpeningResult.value.profileIdentifier
  }
  if (firstOpeningResult.failureName !== profileNotFoundFailureName) {
    return null
  }
  const creationResult = await createProfile(gameServiceCopy.defaultProfileVisibleName, defaultProfileIdentifier)
  if (!creationResult.wasSuccessful && creationResult.failureName !== profileAlreadyRegisteredFailureName) {
    return null
  }
  const secondOpeningResult = await openProfile(defaultProfileIdentifier)
  return secondOpeningResult.wasSuccessful && !secondOpeningResult.value.isArchived
    ? secondOpeningResult.value.profileIdentifier
    : null
}

async function probeGameServicePresence(): Promise<GameServicePresence> {
  try {
    const healthResult = await readGameServiceHealth(servicePresenceProbeTimeoutMilliseconds)
    if (!healthResult.wasSuccessful) {
      return absentGameServicePresence
    }
    const activeProfileIdentifier = await ensureDefaultProfileIsOpen()
    return {
      isServicePresent: activeProfileIdentifier !== null,
      providerModeName: healthResult.value.providerModeName,
      activeProfileIdentifier,
    }
  } catch {
    return absentGameServicePresence
  }
}

const gameServicePresenceListeners = new Set<() => void>()

function trackGameServicePresenceProbe(): Promise<GameServicePresence> {
  const trackedPresenceProbe: Promise<GameServicePresence> = probeGameServicePresence().then((gameServicePresence) => {
    if (pendingGameServicePresence === trackedPresenceProbe) {
      knownGameServicePresence = gameServicePresence
      gameServicePresenceListeners.forEach((notifyListener) => notifyListener())
    }
    return gameServicePresence
  })
  pendingGameServicePresence = trackedPresenceProbe
  return trackedPresenceProbe
}

export function readGameServicePresence(): Promise<GameServicePresence> {
  return pendingGameServicePresence ?? trackGameServicePresenceProbe()
}

export function refreshGameServicePresence(): Promise<GameServicePresence> {
  return trackGameServicePresenceProbe()
}

export function readKnownGameServicePresence(): GameServicePresence | null {
  return knownGameServicePresence
}

export function subscribeToGameServicePresence(notifyListener: () => void): () => void {
  gameServicePresenceListeners.add(notifyListener)
  return () => {
    gameServicePresenceListeners.delete(notifyListener)
  }
}

export function readActiveProfileIdentifier(): string | null {
  return knownGameServicePresence?.activeProfileIdentifier ?? null
}

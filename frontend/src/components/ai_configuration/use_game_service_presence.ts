import { useSyncExternalStore } from 'react'
import { readKnownGameServicePresence, subscribeToGameServicePresence } from '../../game_service/game_service_presence'
import type { GameServicePresence } from '../../game_service/game_service_presence'

export function useGameServicePresence(): GameServicePresence | null {
  return useSyncExternalStore(subscribeToGameServicePresence, readKnownGameServicePresence)
}

import { chronicleStorageKey } from '../game_state/chronicle_state'
import { composePortfolioDemoChronicleState } from './portfolio_demo_chronicle_seed'

const gameStorageKeyPrefix = 'the_void_files_'
const keptAcrossRestartsStorageKeys = ['the_void_files_player_settings']

export type PortfolioDemoSeedingOutcome = 'seeded' | 'already_in_progress' | 'storage_unavailable'

export function seedPortfolioDemoChronicleWhenAbsent(): PortfolioDemoSeedingOutcome {
  try {
    if (window.sessionStorage.getItem(chronicleStorageKey) !== null) {
      return 'already_in_progress'
    }
    window.sessionStorage.setItem(chronicleStorageKey, JSON.stringify(composePortfolioDemoChronicleState()))
    return 'seeded'
  } catch (storageError) {
    console.warn('portfolio demo chronicle could not be seeded in session storage', storageError)
    return 'storage_unavailable'
  }
}

function removeGameEntries(browserStorage: Storage) {
  const removableKeys: string[] = []
  for (let storageIndex = 0; storageIndex < browserStorage.length; storageIndex += 1) {
    const storageKey = browserStorage.key(storageIndex)
    if (storageKey?.startsWith(gameStorageKeyPrefix) && !keptAcrossRestartsStorageKeys.includes(storageKey)) {
      removableKeys.push(storageKey)
    }
  }
  removableKeys.forEach((storageKey) => browserStorage.removeItem(storageKey))
}

export function restartPortfolioDemo() {
  try {
    removeGameEntries(window.sessionStorage)
    removeGameEntries(window.localStorage)
  } catch (storageError) {
    console.warn('portfolio demo storage could not be cleared before restarting', storageError)
  }
  window.location.replace(`${window.location.pathname}${window.location.search}`)
}

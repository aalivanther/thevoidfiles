import { readGameServicePresence } from './game_service_presence'
import {
  chronicleSnapshotVersionConflictFailureName,
  readChronicleSnapshot,
  saveChronicleSnapshot,
} from './profile_chronicle_snapshot_requests'

const snapshotSavingDebounceMilliseconds = 600
const shortestRetryDelayMilliseconds = 5000
const longestRetryDelayMilliseconds = 60000
const synchronisationNoteStorageKeyPrefix = 'the_void_files_chronicle_synchronisation_note_'
const unknownStateVersion = -1

type SynchronisationNote = {
  baseStateVersion: number
  isLocalCopyAhead: boolean
}

export type ChronicleSnapshotSynchroniserOptions<SynchronisedChronicleState extends { storageFormatVersion: number }> = {
  initialChronicleState: SynchronisedChronicleState
  readLatestChronicleState: () => SynchronisedChronicleState
  isChronicleStateUsable: (candidate: unknown) => candidate is SynchronisedChronicleState
  whenActiveProfileIsResolved: (activeProfileIdentifier: string | null) => void
  restoreChronicleState: (restoredChronicleState: SynchronisedChronicleState) => void
  whenSnapshotWasSaved: (activeProfileIdentifier: string, savedChronicleState: SynchronisedChronicleState) => void
}

export type ChronicleSnapshotSynchroniser<SynchronisedChronicleState> = {
  start: () => void
  noteChronicleStateChanged: (chronicleState: SynchronisedChronicleState) => void
  stop: () => void
}

function readSynchronisationNote(profileIdentifier: string): SynchronisationNote | null {
  try {
    const storedText = window.sessionStorage.getItem(`${synchronisationNoteStorageKeyPrefix}${profileIdentifier}`)
    if (!storedText) {
      return null
    }
    const parsedCandidate: unknown = JSON.parse(storedText)
    if (typeof parsedCandidate !== 'object' || parsedCandidate === null) {
      return null
    }
    const possibleNote = parsedCandidate as Partial<SynchronisationNote>
    return typeof possibleNote.baseStateVersion === 'number' && typeof possibleNote.isLocalCopyAhead === 'boolean'
      ? { baseStateVersion: possibleNote.baseStateVersion, isLocalCopyAhead: possibleNote.isLocalCopyAhead }
      : null
  } catch {
    return null
  }
}

function writeSynchronisationNote(profileIdentifier: string, synchronisationNote: SynchronisationNote) {
  try {
    window.sessionStorage.setItem(
      `${synchronisationNoteStorageKeyPrefix}${profileIdentifier}`,
      JSON.stringify(synchronisationNote),
    )
  } catch {
    return
  }
}

export function createChronicleSnapshotSynchroniser<SynchronisedChronicleState extends { storageFormatVersion: number }>(
  synchroniserOptions: ChronicleSnapshotSynchroniserOptions<SynchronisedChronicleState>,
): ChronicleSnapshotSynchroniser<SynchronisedChronicleState> {
  let isStopped = false
  let activeProfileIdentifier: string | null = null
  let isServerCopyKnown = false
  let serverStateVersion = unknownStateVersion
  let isRequestInFlight = false
  let synchronisedChronicleState: SynchronisedChronicleState = synchroniserOptions.initialChronicleState
  let lastNotedChronicleState: SynchronisedChronicleState = synchroniserOptions.initialChronicleState
  let pendingTimeoutIdentifier: number | null = null
  let nextRetryDelayMilliseconds = shortestRetryDelayMilliseconds

  const clearPendingTimeout = () => {
    if (pendingTimeoutIdentifier !== null) {
      window.clearTimeout(pendingTimeoutIdentifier)
      pendingTimeoutIdentifier = null
    }
  }

  const scheduleNextStep = (nextStep: () => Promise<void>, delayMilliseconds: number) => {
    clearPendingTimeout()
    if (isStopped) {
      return
    }
    pendingTimeoutIdentifier = window.setTimeout(() => {
      pendingTimeoutIdentifier = null
      void nextStep()
    }, delayMilliseconds)
  }

  const scheduleRetry = (nextStep: () => Promise<void>) => {
    scheduleNextStep(nextStep, nextRetryDelayMilliseconds)
    nextRetryDelayMilliseconds = Math.min(nextRetryDelayMilliseconds * 2, longestRetryDelayMilliseconds)
  }

  const adoptServerCopy = (profileIdentifier: string, serverChronicleState: SynchronisedChronicleState) => {
    synchronisedChronicleState = serverChronicleState
    lastNotedChronicleState = serverChronicleState
    writeSynchronisationNote(profileIdentifier, { baseStateVersion: serverStateVersion, isLocalCopyAhead: false })
    if (JSON.stringify(synchroniserOptions.readLatestChronicleState()) !== JSON.stringify(serverChronicleState)) {
      synchroniserOptions.restoreChronicleState(serverChronicleState)
    } else {
      synchronisedChronicleState = synchroniserOptions.readLatestChronicleState()
      lastNotedChronicleState = synchronisedChronicleState
    }
  }

  const readServerCopy = async (shouldLocalCopyAheadBeKept: boolean): Promise<void> => {
    const profileIdentifier = activeProfileIdentifier
    if (isStopped || profileIdentifier === null || isRequestInFlight) {
      return
    }
    isRequestInFlight = true
    const readingResult = await readChronicleSnapshot(profileIdentifier)
    isRequestInFlight = false
    if (isStopped) {
      return
    }
    if (!readingResult.wasSuccessful) {
      scheduleRetry(() => readServerCopy(shouldLocalCopyAheadBeKept))
      return
    }
    nextRetryDelayMilliseconds = shortestRetryDelayMilliseconds
    const storedSnapshot = readingResult.value
    const synchronisationNote = readSynchronisationNote(profileIdentifier)
    const isLocalCopyAhead =
      shouldLocalCopyAheadBeKept &&
      synchronisationNote !== null &&
      synchronisationNote.isLocalCopyAhead &&
      synchronisationNote.baseStateVersion === storedSnapshot.stateVersion
    serverStateVersion = storedSnapshot.stateVersion
    isServerCopyKnown = true
    if (
      storedSnapshot.hasSnapshot &&
      !isLocalCopyAhead &&
      synchroniserOptions.isChronicleStateUsable(storedSnapshot.chronicleState)
    ) {
      adoptServerCopy(profileIdentifier, storedSnapshot.chronicleState)
      return
    }
    scheduleNextStep(saveLatestCopy, snapshotSavingDebounceMilliseconds)
  }

  const saveLatestCopy = async (): Promise<void> => {
    const profileIdentifier = activeProfileIdentifier
    if (isStopped || profileIdentifier === null || !isServerCopyKnown || isRequestInFlight) {
      return
    }
    const chronicleStateToSave = synchroniserOptions.readLatestChronicleState()
    if (chronicleStateToSave === synchronisedChronicleState) {
      return
    }
    isRequestInFlight = true
    const savingResult = await saveChronicleSnapshot(profileIdentifier, serverStateVersion, chronicleStateToSave)
    isRequestInFlight = false
    if (isStopped) {
      return
    }
    if (savingResult.wasSuccessful) {
      nextRetryDelayMilliseconds = shortestRetryDelayMilliseconds
      serverStateVersion = savingResult.value.stateVersion
      synchronisedChronicleState = chronicleStateToSave
      const isNewerCopyWaiting = synchroniserOptions.readLatestChronicleState() !== chronicleStateToSave
      writeSynchronisationNote(profileIdentifier, {
        baseStateVersion: serverStateVersion,
        isLocalCopyAhead: isNewerCopyWaiting,
      })
      synchroniserOptions.whenSnapshotWasSaved(profileIdentifier, chronicleStateToSave)
      if (isNewerCopyWaiting) {
        scheduleNextStep(saveLatestCopy, snapshotSavingDebounceMilliseconds)
      }
      return
    }
    if (savingResult.failureName === chronicleSnapshotVersionConflictFailureName) {
      isServerCopyKnown = false
      await readServerCopy(false)
      return
    }
    scheduleRetry(saveLatestCopy)
  }

  return {
    start() {
      void readGameServicePresence().then((gameServicePresence) => {
        if (isStopped) {
          return
        }
        activeProfileIdentifier = gameServicePresence.activeProfileIdentifier
        synchroniserOptions.whenActiveProfileIsResolved(activeProfileIdentifier)
        if (activeProfileIdentifier !== null) {
          void readServerCopy(true)
        }
      })
    },
    noteChronicleStateChanged(chronicleState) {
      if (isStopped || chronicleState === lastNotedChronicleState) {
        return
      }
      lastNotedChronicleState = chronicleState
      if (activeProfileIdentifier === null || chronicleState === synchronisedChronicleState) {
        return
      }
      writeSynchronisationNote(activeProfileIdentifier, {
        baseStateVersion: isServerCopyKnown
          ? serverStateVersion
          : (readSynchronisationNote(activeProfileIdentifier)?.baseStateVersion ?? unknownStateVersion),
        isLocalCopyAhead: true,
      })
      if (isServerCopyKnown && !isRequestInFlight) {
        scheduleNextStep(saveLatestCopy, snapshotSavingDebounceMilliseconds)
      }
    },
    stop() {
      isStopped = true
      clearPendingTimeout()
    },
  }
}

import { useEffect, useState } from 'react'
import type { DirectorWaitStageName } from '../../../game_state/archive_turn_contract'

const extendedWaitMilliseconds = 8000
const complicatedWaitMilliseconds = 15000
const retryOfferedWaitMilliseconds = 20000
const waitStageCheckIntervalMilliseconds = 500

function readDirectorWaitStageName(elapsedMilliseconds: number): DirectorWaitStageName {
  if (elapsedMilliseconds >= retryOfferedWaitMilliseconds) {
    return 'retry_offered'
  }
  if (elapsedMilliseconds >= complicatedWaitMilliseconds) {
    return 'complicated'
  }
  if (elapsedMilliseconds >= extendedWaitMilliseconds) {
    return 'extended'
  }
  return 'normal'
}

type ObservedDirectorWait = {
  waitStartedAtTimestamp: number
  directorWaitStageName: DirectorWaitStageName
}

export function useDirectorWaitTiming(waitStartedAtTimestamp: number | null): DirectorWaitStageName {
  const [observedDirectorWait, setObservedDirectorWait] = useState<ObservedDirectorWait | null>(null)

  useEffect(() => {
    if (waitStartedAtTimestamp === null) {
      return
    }
    const waitStageCheckIntervalIdentifier = window.setInterval(() => {
      const directorWaitStageName = readDirectorWaitStageName(Date.now() - waitStartedAtTimestamp)
      setObservedDirectorWait((previousObservedWait) =>
        previousObservedWait &&
        previousObservedWait.waitStartedAtTimestamp === waitStartedAtTimestamp &&
        previousObservedWait.directorWaitStageName === directorWaitStageName
          ? previousObservedWait
          : { waitStartedAtTimestamp, directorWaitStageName },
      )
    }, waitStageCheckIntervalMilliseconds)
    return () => window.clearInterval(waitStageCheckIntervalIdentifier)
  }, [waitStartedAtTimestamp])

  if (
    waitStartedAtTimestamp === null ||
    !observedDirectorWait ||
    observedDirectorWait.waitStartedAtTimestamp !== waitStartedAtTimestamp
  ) {
    return 'normal'
  }
  return observedDirectorWait.directorWaitStageName
}

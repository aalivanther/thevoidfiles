import { useContext, useState } from 'react'
import { ArchiveTurnFlowContext, inertArchiveTurnFlowContextValue } from '../archive_turn_flow_context'
import type { ArchiveTurnFlowContextValue } from '../archive_turn_flow_context'

export function useArchiveTurnFlowOrInertValue(): ArchiveTurnFlowContextValue {
  return useContext(ArchiveTurnFlowContext) ?? inertArchiveTurnFlowContextValue
}

export function useWasMountedDuringFreshTurn(): boolean {
  const { directorTurnPhaseName, revealPlaybackState } = useArchiveTurnFlowOrInertValue()
  const [wasMountedDuringFreshTurn] = useState(
    () =>
      directorTurnPhaseName !== 'idle' ||
      revealPlaybackState.logEntryIdentifierBeingRevealed !== null ||
      revealPlaybackState.logEntryIdentifiersAwaitingReveal.length > 0,
  )
  return wasMountedDuringFreshTurn
}

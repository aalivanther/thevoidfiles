import type {
  InteractivePiecePublicDefinition,
  InteractivePieceRuntimeState,
} from '../../../game_state/archive_turn_contract'
import { InteractivePieceFrame } from './InteractivePieceFrame'

export type InteractivePieceSlotProperties = {
  publicDefinition: InteractivePiecePublicDefinition
  runtimeState: InteractivePieceRuntimeState
  isReadOnly: boolean
}

export function InteractivePieceSlot({ publicDefinition, runtimeState, isReadOnly }: InteractivePieceSlotProperties) {
  return (
    <InteractivePieceFrame
      key={publicDefinition.interactivePieceIdentifier}
      publicDefinition={publicDefinition}
      runtimeState={runtimeState}
      isReadOnly={isReadOnly}
    />
  )
}

import type { InteractivePiecePublicState, InteractivePieceSubmittedValue } from '../../../game_state/archive_turn_contract'

export type InteractivePieceWidgetProperties<WidgetKindName extends InteractivePiecePublicState['widgetKindName']> = {
  publicState: Extract<InteractivePiecePublicState, { widgetKindName: WidgetKindName }>
  workingValue: Extract<InteractivePieceSubmittedValue, { widgetKindName: WidgetKindName }>
  isInteractionDisabled: boolean
  onWorkingValueChanged: (workingValue: InteractivePieceSubmittedValue) => void
}

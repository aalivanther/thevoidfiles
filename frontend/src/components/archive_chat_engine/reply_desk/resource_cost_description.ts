import { replyDeskCopy } from '../../../copy/archive_chat_engine/reply_desk_copy'
import { readBelongingVisibleName } from '../../../demonstration/demonstration_case_script'
import type { ResourceCost } from '../../../game_state/archive_turn_contract'
import { formatAmount } from '../../../game_state/chronicle_state'

export function describeResourceCost(
  resourceCost: ResourceCost,
  liveBelongingDefinitions?: Record<string, { visibleName: string }> | null,
): string {
  if (resourceCost.kind === 'operational_funds') {
    return replyDeskCopy.operationalFundsCostDescription(formatAmount(resourceCost.amount))
  }
  return replyDeskCopy.belongingCostDescription(
    resourceCost.units,
    readBelongingVisibleName(resourceCost.belongingIdentifier, liveBelongingDefinitions).toLowerCase(),
  )
}

import { replyDeskCopy } from '../../../copy/archive_chat_engine/reply_desk_copy'
import { formatAmount } from '../../../game_state/chronicle_state'
import type { ResourceCostTotal } from './plan_resource_cost_totals'

export function describeResourceCostTotal(resourceCostTotal: ResourceCostTotal): string {
  return resourceCostTotal.isAffordable
    ? replyDeskCopy.resourceCostTotalDescription(
        resourceCostTotal.resourceVisibleName,
        formatAmount(resourceCostTotal.spentAmount),
        formatAmount(resourceCostTotal.remainingAmount),
      )
    : replyDeskCopy.resourceCostTotalInsufficientDescription(
        resourceCostTotal.resourceVisibleName,
        formatAmount(resourceCostTotal.spentAmount),
      )
}

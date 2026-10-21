import { ArrowRight, WarningDiamond } from '@phosphor-icons/react'
import { replyDeskCopy } from '../../../copy/archive_chat_engine/reply_desk_copy'
import { formatAmount } from '../../../game_state/chronicle_state'
import type { ResourceCostTotal } from './plan_resource_cost_totals'

type ResourceCostEstimateListProperties = {
  resourceCostTotals: ResourceCostTotal[]
  emptyNotice: string
  estimateNotice: string
}

export function ResourceCostEstimateList({ resourceCostTotals, emptyNotice, estimateNotice }: ResourceCostEstimateListProperties) {
  if (resourceCostTotals.length === 0) {
    return <p className="reply-desk-cost-estimate-notice">{emptyNotice}</p>
  }
  return (
    <>
      <ul className="reply-desk-cost-estimate-rows">
        {resourceCostTotals.map((resourceCostTotal) => (
          <li key={resourceCostTotal.resourceKey} className="reply-desk-cost-estimate-row">
            <span className="reply-desk-cost-estimate-resource">{resourceCostTotal.resourceVisibleName}</span>
            <span className="reply-desk-cost-estimate-amounts">
              <span>
                <span className="reply-desk-cost-estimate-amount-label">{replyDeskCopy.costLedgerSpentAmountLabel}</span>{' '}
                {formatAmount(resourceCostTotal.spentAmount)}
              </span>
              <ArrowRight size={14} weight="bold" aria-hidden="true" />
              <span className="reply-desk-cost-estimate-remaining" data-is-affordable={resourceCostTotal.isAffordable ? 'true' : 'false'}>
                <span className="reply-desk-cost-estimate-amount-label">{replyDeskCopy.costLedgerRemainingAmountLabel}</span>{' '}
                {resourceCostTotal.isAffordable ? (
                  formatAmount(resourceCostTotal.remainingAmount)
                ) : (
                  <>
                    <WarningDiamond size={14} weight="fill" aria-hidden="true" /> {replyDeskCopy.insufficientResource}
                  </>
                )}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="reply-desk-cost-estimate-notice">{estimateNotice}</p>
    </>
  )
}

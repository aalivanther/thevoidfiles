import { replyDeskCopy } from '../../../copy/archive_chat_engine/reply_desk_copy'
import { readBelongingVisibleName } from '../../../demonstration/demonstration_case_script'
import type { PlannedActionStep, ResourceCost } from '../../../game_state/archive_turn_contract'
import type { InvestigatorState } from '../../../game_state/chronicle_state'

export type ResourceCostTotal = {
  resourceKey: string
  resourceVisibleName: string
  currentAmount: number
  spentAmount: number
  remainingAmount: number
  isAffordable: boolean
}

function readResourceKey(resourceCost: ResourceCost): string {
  return resourceCost.kind === 'operational_funds' ? 'operational_funds' : `belonging_${resourceCost.belongingIdentifier}`
}

export function totalResourceCostsOfPlanSteps(
  planSteps: PlannedActionStep[],
  investigator: InvestigatorState,
  amountsAlreadyCommittedByResourceKey: ReadonlyMap<string, number> = new Map(),
): ResourceCostTotal[] {
  const resourceCostTotals: ResourceCostTotal[] = []
  for (const planStep of planSteps) {
    const resourceCost = planStep.declaredResourceCost
    if (!resourceCost) {
      continue
    }
    const resourceKey = readResourceKey(resourceCost)
    const spentAmount = resourceCost.kind === 'operational_funds' ? resourceCost.amount : resourceCost.units
    const existingTotal = resourceCostTotals.find((resourceCostTotal) => resourceCostTotal.resourceKey === resourceKey)
    if (existingTotal) {
      existingTotal.spentAmount += spentAmount
      existingTotal.remainingAmount -= spentAmount
      existingTotal.isAffordable = existingTotal.remainingAmount >= 0
      continue
    }
    const amountBeforeTheseSteps =
      (resourceCost.kind === 'operational_funds'
        ? investigator.operationalFunds
        : investigator.belongingUnits[resourceCost.belongingIdentifier]) -
      (amountsAlreadyCommittedByResourceKey.get(resourceKey) ?? 0)
    resourceCostTotals.push({
      resourceKey,
      resourceVisibleName:
        resourceCost.kind === 'operational_funds'
          ? replyDeskCopy.operationalFundsName
          : readBelongingVisibleName(resourceCost.belongingIdentifier),
      currentAmount: amountBeforeTheseSteps,
      spentAmount,
      remainingAmount: amountBeforeTheseSteps - spentAmount,
      isAffordable: amountBeforeTheseSteps - spentAmount >= 0,
    })
  }
  return resourceCostTotals
}

export function readSpentAmountsByResourceKey(resourceCostTotals: ResourceCostTotal[]): Map<string, number> {
  return new Map(resourceCostTotals.map((resourceCostTotal) => [resourceCostTotal.resourceKey, resourceCostTotal.spentAmount]))
}

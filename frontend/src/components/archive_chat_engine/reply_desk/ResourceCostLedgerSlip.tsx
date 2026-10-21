import { ArrowRight, WarningDiamond } from '@phosphor-icons/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { replyDeskCopy } from '../../../copy/archive_chat_engine/reply_desk_copy'
import { formatAmount } from '../../../game_state/chronicle_state'
import {
  changePlanDetailSurface,
  readPlanDetailSurfaceSnapshot,
  usePlanDetailSurfaceSnapshot,
} from './plan_detail_surface_store'
import type { ResourceCostTotal } from './plan_resource_cost_totals'

export type ResourceCostLedgerSlipVariantName = 'slip_tilted_left' | 'slip_tilted_right' | 'slip_dropped_flat'

const repeatedConfirmationGuardMilliseconds = 700
const inlineFallbackDelayMilliseconds = 400

type ResourceCostLedgerSlipProperties = {
  firstBatchCostTotals: ResourceCostTotal[]
  laterBatchesCostTotals: ResourceCostTotal[]
  variantName: ResourceCostLedgerSlipVariantName
  isConfirmationDisabled: boolean
  onConfirmed: () => void
  onDismissed: () => void
}

function ResourceCostTotalRows({ heading, resourceCostTotals }: { heading: string; resourceCostTotals: ResourceCostTotal[] }) {
  if (resourceCostTotals.length === 0) {
    return null
  }
  return (
    <div className="reply-desk-cost-ledger-group">
      <p className="reply-desk-cost-ledger-heading">{heading}</p>
      <ul className="reply-desk-cost-ledger-rows">
        {resourceCostTotals.map((resourceCostTotal) => (
          <li key={resourceCostTotal.resourceKey} className="reply-desk-cost-ledger-row">
            <span className="reply-desk-cost-ledger-resource">{resourceCostTotal.resourceVisibleName}</span>
            <span className="reply-desk-cost-ledger-amounts">
              <span>
                <span className="reply-desk-cost-ledger-amount-label">{replyDeskCopy.costLedgerCurrentAmountLabel}</span>{' '}
                {formatAmount(resourceCostTotal.currentAmount)}
              </span>
              <span>
                <span className="reply-desk-cost-ledger-amount-label">{replyDeskCopy.costLedgerSpentAmountLabel}</span>{' '}
                {formatAmount(resourceCostTotal.spentAmount)}
              </span>
              <ArrowRight size={14} weight="bold" aria-hidden="true" />
              <span className="reply-desk-cost-ledger-remaining">
                <span className="reply-desk-cost-ledger-amount-label">{replyDeskCopy.costLedgerRemainingAmountLabel}</span>{' '}
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
    </div>
  )
}

export function ResourceCostLedgerSlip({
  firstBatchCostTotals,
  laterBatchesCostTotals,
  variantName,
  isConfirmationDisabled,
  onConfirmed,
  onDismissed,
}: ResourceCostLedgerSlipProperties) {
  const { costLedgerSlotElement, costLedgerActionsSlotElement, costDismissalRequestCount } = usePlanDetailSurfaceSnapshot()
  const [isInlineFallbackAllowed, setIsInlineFallbackAllowed] = useState(false)
  const confirmationButton = useRef<HTMLButtonElement>(null)
  const hasConfirmationBeenRequested = useRef(false)
  const repeatedConfirmationGuardTimer = useRef<number | null>(null)
  const handledCostDismissalRequestCount = useRef<number | null>(null)

  useLayoutEffect(() => {
    handledCostDismissalRequestCount.current = readPlanDetailSurfaceSnapshot().costDismissalRequestCount
    changePlanDetailSurface({ isCostLedgerSlipMounted: true, isDetailSurfaceOpen: true })
    return () => {
      changePlanDetailSurface({ isCostLedgerSlipMounted: false })
    }
  }, [])

  useEffect(() => {
    const inlineFallbackTimer = window.setTimeout(() => setIsInlineFallbackAllowed(true), inlineFallbackDelayMilliseconds)
    return () => {
      window.clearTimeout(inlineFallbackTimer)
      if (repeatedConfirmationGuardTimer.current !== null) {
        window.clearTimeout(repeatedConfirmationGuardTimer.current)
      }
    }
  }, [])

  useEffect(() => {
    if (handledCostDismissalRequestCount.current === null || handledCostDismissalRequestCount.current === costDismissalRequestCount) {
      return
    }
    handledCostDismissalRequestCount.current = costDismissalRequestCount
    onDismissed()
  }, [costDismissalRequestCount, onDismissed])

  useEffect(() => {
    confirmationButton.current?.focus()
  }, [costLedgerActionsSlotElement, isInlineFallbackAllowed])

  const requestConfirmationOnce = () => {
    if (hasConfirmationBeenRequested.current) {
      return
    }
    hasConfirmationBeenRequested.current = true
    repeatedConfirmationGuardTimer.current = window.setTimeout(() => {
      repeatedConfirmationGuardTimer.current = null
      hasConfirmationBeenRequested.current = false
    }, repeatedConfirmationGuardMilliseconds)
    onConfirmed()
  }

  const returnToReplyDesk = () => {
    onDismissed()
    changePlanDetailSurface({ isDetailSurfaceOpen: false })
  }

  const dismissOnEscape = (keyboardEvent: KeyboardEvent<HTMLElement>) => {
    if (keyboardEvent.key !== 'Escape' || keyboardEvent.defaultPrevented) {
      return
    }
    keyboardEvent.stopPropagation()
    returnToReplyDesk()
  }

  const ledgerDocument = (
    <section
      className="reply-desk-cost-ledger aged-paper-document"
      data-variant={variantName}
      aria-labelledby="reply-desk-cost-ledger-title"
      aria-describedby="reply-desk-cost-ledger-description"
      onKeyDown={dismissOnEscape}
    >
      <h2 id="reply-desk-cost-ledger-title" className="reply-desk-cost-ledger-title">
        {replyDeskCopy.costLedgerTitle}
      </h2>
      <p id="reply-desk-cost-ledger-description" className="reply-desk-cost-ledger-description">
        {replyDeskCopy.costLedgerDescription}
      </p>
      <ResourceCostTotalRows heading={replyDeskCopy.costLedgerFirstBatchHeading} resourceCostTotals={firstBatchCostTotals} />
      <ResourceCostTotalRows heading={replyDeskCopy.costLedgerLaterBatchesHeading} resourceCostTotals={laterBatchesCostTotals} />
    </section>
  )

  const ledgerActions = (
    <div
      className="reply-desk-cost-ledger-actions"
      role="group"
      aria-label={replyDeskCopy.costLedgerTitle}
      onKeyDown={dismissOnEscape}
    >
      <button type="button" className="reply-desk-cost-ledger-dismiss" onClick={returnToReplyDesk}>
        {replyDeskCopy.returnToPlanButton}
      </button>
      <button
        type="button"
        ref={confirmationButton}
        className="reply-desk-cost-ledger-confirm"
        disabled={isConfirmationDisabled}
        aria-describedby="reply-desk-cost-ledger-description"
        onClick={requestConfirmationOnce}
      >
        {replyDeskCopy.confirmCostAndSendButton}
      </button>
    </div>
  )

  if (costLedgerSlotElement && costLedgerActionsSlotElement) {
    return (
      <>
        {createPortal(ledgerDocument, costLedgerSlotElement)}
        {createPortal(ledgerActions, costLedgerActionsSlotElement)}
      </>
    )
  }

  if (!isInlineFallbackAllowed) {
    return null
  }

  return (
    <div className="reply-desk-cost-ledger-inline-fallback">
      {ledgerDocument}
      {ledgerActions}
    </div>
  )
}

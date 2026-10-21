import { CaretDown, CaretUp, CheckCircle, HourglassMedium } from '@phosphor-icons/react'
import { useId, useState } from 'react'
import { useInteractionFeedback } from '../../../audio/interaction_feedback'
import { replyDeskCopy } from '../../../copy/archive_chat_engine/reply_desk_copy'
import type { PendingActionPlan, PlannedActionStep } from '../../../game_state/archive_turn_contract'
import { useChronicleState } from '../../../game_state/chronicle_state'
import { PlanDetailSurface } from './PlanDetailSurface'
import { ResourceCostEstimateList } from './ResourceCostEstimateList'
import { usePlanDetailSurfaceModeName, usePlanDetailSurfaceSnapshot } from './plan_detail_surface_store'
import { totalResourceCostsOfPlanSteps } from './plan_resource_cost_totals'
import { describeResourceCost } from './resource_cost_description'
import { describeResourceCostTotal } from './resource_cost_total_description'

type PendingPlanSummaryProperties = {
  pendingActionPlan: PendingActionPlan
  onModificationRequested: () => void
}

type PendingPlanStepRowProperties = {
  planStep: PlannedActionStep
  stepNumber: number
  wasExecuted: boolean
}

function PendingPlanStepRow({ planStep, stepNumber, wasExecuted }: PendingPlanStepRowProperties) {
  const { chronicleState } = useChronicleState()
  return (
    <li className="reply-desk-pending-plan-step" data-was-executed={wasExecuted ? 'true' : 'false'}>
      <span className="reply-desk-plan-step-number" aria-hidden="true">
        {stepNumber}
      </span>
      <span className="reply-desk-plan-step-text">
        <span className="reply-desk-plan-step-origin">
          {wasExecuted ? (
            <CheckCircle size={13} weight="fill" aria-hidden="true" />
          ) : (
            <HourglassMedium size={13} weight="fill" aria-hidden="true" />
          )}
          {wasExecuted ? replyDeskCopy.executedPlanStepLabel : replyDeskCopy.pendingPlanStepLabel}
        </span>
        <span className="reply-desk-plan-step-action">{planStep.actionText}</span>
        {planStep.conditionText ? (
          <span className="reply-desk-plan-step-condition">
            <span className="reply-desk-plan-step-condition-prefix">{replyDeskCopy.planStepConditionPrefix}</span>{' '}
            {planStep.conditionText}
          </span>
        ) : null}
        {planStep.declaredResourceCost && !wasExecuted ? (
          <span className="cost-tag reply-desk-plan-step-cost">
            {describeResourceCost(planStep.declaredResourceCost, chronicleState.archiveRun.belongingDefinitions)}
          </span>
        ) : null}
      </span>
    </li>
  )
}

export function PendingPlanSummary({ pendingActionPlan, onModificationRequested }: PendingPlanSummaryProperties) {
  const playInteractionFeedback = useInteractionFeedback()
  const { chronicleState } = useChronicleState()
  const surfaceModeName = usePlanDetailSurfaceModeName()
  const { planRailHostElement } = usePlanDetailSurfaceSnapshot()
  const [isDetailSurfaceOpen, setIsDetailSurfaceOpen] = useState(false)
  const [areExecutedStepsExpanded, setAreExecutedStepsExpanded] = useState(false)
  const executedStepListIdentifier = useId()

  const executedPlanSteps = pendingActionPlan.steps.slice(0, pendingActionPlan.executedStepCount)
  const remainingPlanSteps = pendingActionPlan.steps.slice(pendingActionPlan.executedStepCount)
  const nextPlanStep = remainingPlanSteps[0]
  const laterPlanSteps = remainingPlanSteps.slice(1)
  const remainingCostTotals = totalResourceCostsOfPlanSteps(remainingPlanSteps, chronicleState.investigator)
  const remainingCostDescriptions = remainingCostTotals.map(describeResourceCostTotal)
  const shouldReportExpandedState = surfaceModeName !== 'right_rail'

  if (!nextPlanStep) {
    return null
  }

  const changeDetailSurfaceOpen = (isOpen: boolean) => {
    if (isOpen === isDetailSurfaceOpen) {
      return
    }
    playInteractionFeedback(isOpen ? 'panel_open' : 'panel_close')
    setIsDetailSurfaceOpen(isOpen)
  }

  const openPendingPlanDetailFromDockLine = () => {
    if (surfaceModeName === 'right_rail') {
      playInteractionFeedback('option_click')
      const firstRailControl = planRailHostElement?.querySelector<HTMLElement>('button')
      firstRailControl?.scrollIntoView({ block: 'nearest' })
      firstRailControl?.focus()
      return
    }
    changeDetailSurfaceOpen(!isDetailSurfaceOpen)
  }

  const requestModification = () => {
    setIsDetailSurfaceOpen(false)
    onModificationRequested()
  }

  const dockLine = (
    <section className="reply-desk-plan-line reply-desk-pending-plan-line" aria-label={replyDeskCopy.pendingPlanTitle}>
      <button
        type="button"
        className="reply-desk-plan-line-button"
        aria-haspopup={shouldReportExpandedState ? 'dialog' : undefined}
        aria-expanded={shouldReportExpandedState ? isDetailSurfaceOpen : undefined}
        aria-label={`${
          shouldReportExpandedState ? replyDeskCopy.openPendingPlanDetailLabel : replyDeskCopy.goToPendingPlanInRailLabel
        }. ${replyDeskCopy.pendingPlanRemainingLine(remainingPlanSteps.length, nextPlanStep.actionText)}`}
        onClick={openPendingPlanDetailFromDockLine}
      >
        <HourglassMedium size={20} weight="fill" aria-hidden="true" />
        <span className="reply-desk-plan-line-title">{replyDeskCopy.pendingPlanTitle}</span>
        <span className="reply-desk-pending-plan-line-text">
          {replyDeskCopy.pendingPlanRemainingLine(remainingPlanSteps.length, nextPlanStep.actionText)}
        </span>
        {shouldReportExpandedState ? (
          <CaretUp className="reply-desk-plan-line-caret" size={16} weight="bold" aria-hidden="true" />
        ) : null}
      </button>
      <button type="button" className="quiet-action-button reply-desk-pending-plan-modify" onClick={requestModification}>
        {replyDeskCopy.modifyPendingPlanButton}
      </button>
    </section>
  )

  const detailBody = (
    <>
      <section className="reply-desk-plan-detail-section" aria-labelledby="reply-desk-pending-plan-next-step-title">
        <h3 id="reply-desk-pending-plan-next-step-title" className="dossier-label">
          {replyDeskCopy.pendingPlanNextStepSectionTitle}
        </h3>
        <ol className="reply-desk-pending-plan-list" data-section-name="next_step">
          <PendingPlanStepRow planStep={nextPlanStep} stepNumber={pendingActionPlan.executedStepCount + 1} wasExecuted={false} />
        </ol>
      </section>
      {laterPlanSteps.length > 0 ? (
        <section className="reply-desk-plan-detail-section" aria-labelledby="reply-desk-pending-plan-later-steps-title">
          <h3 id="reply-desk-pending-plan-later-steps-title" className="dossier-label">
            {replyDeskCopy.pendingPlanLaterStepsSectionTitle}
          </h3>
          <ol className="reply-desk-pending-plan-list">
            {laterPlanSteps.map((planStep, laterStepIndex) => (
              <PendingPlanStepRow
                key={planStep.stepIdentifier}
                planStep={planStep}
                stepNumber={pendingActionPlan.executedStepCount + laterStepIndex + 2}
                wasExecuted={false}
              />
            ))}
          </ol>
        </section>
      ) : null}
      <section className="reply-desk-plan-detail-section" aria-labelledby="reply-desk-pending-plan-estimated-cost-title">
        <h3 id="reply-desk-pending-plan-estimated-cost-title" className="dossier-label">
          {replyDeskCopy.pendingPlanEstimatedCostSectionTitle}
        </h3>
        <ResourceCostEstimateList
          resourceCostTotals={remainingCostTotals}
          emptyNotice={replyDeskCopy.pendingPlanNoCostNotice}
          estimateNotice={replyDeskCopy.planDetailEstimatedCostNotice}
        />
      </section>
      {executedPlanSteps.length > 0 ? (
        <section className="reply-desk-plan-detail-section reply-desk-executed-steps-section">
          <button
            type="button"
            className="reply-desk-executed-steps-toggle"
            aria-expanded={areExecutedStepsExpanded}
            aria-controls={executedStepListIdentifier}
            onClick={() => {
              playInteractionFeedback(areExecutedStepsExpanded ? 'panel_close' : 'panel_open')
              setAreExecutedStepsExpanded((wasExpanded) => !wasExpanded)
            }}
          >
            <CheckCircle size={16} weight="fill" aria-hidden="true" />
            <span>{replyDeskCopy.executedPlanStepsToggle(executedPlanSteps.length)}</span>
            {areExecutedStepsExpanded ? (
              <CaretUp size={14} weight="bold" aria-hidden="true" />
            ) : (
              <CaretDown size={14} weight="bold" aria-hidden="true" />
            )}
          </button>
          {areExecutedStepsExpanded ? (
            <ol id={executedStepListIdentifier} className="reply-desk-pending-plan-list">
              {executedPlanSteps.map((planStep, executedStepIndex) => (
                <PendingPlanStepRow
                  key={planStep.stepIdentifier}
                  planStep={planStep}
                  stepNumber={executedStepIndex + 1}
                  wasExecuted
                />
              ))}
            </ol>
          ) : null}
        </section>
      ) : null}
    </>
  )

  const detailFooter = (
    <>
      {surfaceModeName !== 'right_rail' ? (
        <button
          type="button"
          className="quiet-action-button reply-desk-plan-detail-return"
          onClick={() => changeDetailSurfaceOpen(false)}
        >
          {replyDeskCopy.returnToPlanButton}
        </button>
      ) : null}
      <button type="button" className="quiet-action-button reply-desk-pending-plan-modify" onClick={requestModification}>
        {replyDeskCopy.modifyPendingPlanButton}
      </button>
    </>
  )

  return (
    <PlanDetailSurface
      surfaceModeName={surfaceModeName}
      isOpen={isDetailSurfaceOpen}
      titleText={replyDeskCopy.pendingPlanTitle}
      countText={replyDeskCopy.pendingPlanExecutedCount(pendingActionPlan.executedStepCount, pendingActionPlan.steps.length)}
      descriptionText={replyDeskCopy.pendingPlanDetailDescription}
      costAnnouncementText={
        remainingCostDescriptions.length > 0 ? replyDeskCopy.estimatedCostAnnouncement(remainingCostDescriptions) : ''
      }
      dockLine={dockLine}
      detailBody={detailBody}
      detailFooter={detailFooter}
      onOpenChanged={changeDetailSurfaceOpen}
    />
  )
}

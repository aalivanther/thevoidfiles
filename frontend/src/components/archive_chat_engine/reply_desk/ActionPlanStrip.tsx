import { DndContext, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import type { Announcements, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CaretUp, ListChecks } from '@phosphor-icons/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { chooseAnimationVariantName } from '../../../animation/animation_variety'
import { useInteractionFeedback } from '../../../audio/interaction_feedback'
import { replyDeskCopy } from '../../../copy/archive_chat_engine/reply_desk_copy'
import { maximumPlanStepsExecutedPerDirectorBatch } from '../../../game_state/archive_turn_contract'
import type { PlannedActionStep, SuggestedInvestigatorAction } from '../../../game_state/archive_turn_contract'
import { useChronicleState } from '../../../game_state/chronicle_state'
import { PlanDetailSurface } from './PlanDetailSurface'
import { PlannedStepChip } from './PlannedStepChip'
import type { PlannedStepEntranceVariantName } from './PlannedStepChip'
import { ResourceCostEstimateList } from './ResourceCostEstimateList'
import {
  changePlanDetailSurface,
  requestCostDismissalFromPlanDetailSurface,
  usePlanDetailSurfaceModeName,
  usePlanDetailSurfaceSnapshot,
} from './plan_detail_surface_store'
import { totalResourceCostsOfPlanSteps } from './plan_resource_cost_totals'
import { useReplyDraft } from './reply_draft_context'
import { describeResourceCostTotal } from './resource_cost_total_description'

const plannedStepEntranceVariantNames: readonly PlannedStepEntranceVariantName[] = [
  'stamped_down',
  'slid_from_margin',
  'unfolded_from_crease',
]

function readEntranceVariantNameOfStep(stepIdentifier: string): PlannedStepEntranceVariantName {
  let characterCodeTotal = 0
  for (const character of stepIdentifier) {
    characterCodeTotal += character.codePointAt(0) ?? 0
  }
  return plannedStepEntranceVariantNames[characterCodeTotal % plannedStepEntranceVariantNames.length]
}

export type PlanLinePulseVariantName = 'ink_blot' | 'stamp' | 'underline'

type PlanLinePulse = {
  pulseSequenceNumber: number
  variantName: PlanLinePulseVariantName
}

const planLinePulseVariantNames: readonly PlanLinePulseVariantName[] = ['ink_blot', 'stamp', 'underline']
const planLinePulseDurationMilliseconds = 520
const compactStepChipWidthInPixels = 148
const compactStepChipGapInPixels = 6
const hiddenStepCounterWidthInPixels = 44

function countCompactStepChipsThatFit(availableWidthInPixels: number, declaredStepCount: number): number {
  const chipCountWithoutCounter = Math.floor(
    (availableWidthInPixels + compactStepChipGapInPixels) / (compactStepChipWidthInPixels + compactStepChipGapInPixels),
  )
  if (chipCountWithoutCounter >= declaredStepCount) {
    return declaredStepCount
  }
  const chipCountBesideCounter = Math.floor(
    (availableWidthInPixels - hiddenStepCounterWidthInPixels) / (compactStepChipWidthInPixels + compactStepChipGapInPixels),
  )
  return Math.max(0, Math.min(declaredStepCount, chipCountBesideCounter))
}

type ActionPlanStripProperties = {
  declaredPlanSteps: PlannedActionStep[]
  suggestedActions: SuggestedInvestigatorAction[]
  onPlanChanged: () => void
}

export function ActionPlanStrip({
  declaredPlanSteps,
  suggestedActions,
  onPlanChanged,
}: ActionPlanStripProperties) {
  const playInteractionFeedback = useInteractionFeedback()
  const { latestAddedStepIdentifiers, movePlanStep, removePlanStep, changePlanStepText, changePlanStepCondition } =
    useReplyDraft()
  const { chronicleState } = useChronicleState()
  const surfaceModeName = usePlanDetailSurfaceModeName()
  const { isDetailSurfaceOpen, isCostLedgerSlipMounted, planRailHostElement } = usePlanDetailSurfaceSnapshot()
  const [expandedStepIdentifier, setExpandedStepIdentifier] = useState<string | null>(null)
  const [planLinePulse, setPlanLinePulse] = useState<PlanLinePulse | null>(null)
  const [compactStepChipAreaWidth, setCompactStepChipAreaWidth] = useState(0)
  const planLinePulseCount = useRef(0)
  const compactStepChipAreaSizeObserver = useRef<ResizeObserver | null>(null)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const stepIdentifiers = useMemo(
    () => declaredPlanSteps.map((planStep) => planStep.stepIdentifier),
    [declaredPlanSteps],
  )

  const readStepNumber = (stepIdentifier: string | number) => stepIdentifiers.indexOf(String(stepIdentifier)) + 1

  const sortingAnnouncements: Announcements = {
    onDragStart: ({ active }) => replyDeskCopy.planStepPickedUpAnnouncement(readStepNumber(active.id)),
    onDragOver: ({ active, over }) =>
      over ? replyDeskCopy.planStepMovedAnnouncement(readStepNumber(active.id), readStepNumber(over.id)) : undefined,
    onDragEnd: ({ active, over }) =>
      replyDeskCopy.planStepDroppedAnnouncement(readStepNumber(over ? over.id : active.id)),
    onDragCancel: () => replyDeskCopy.planStepMoveCancelledAnnouncement,
  }

  const finishSorting = (dragEndEvent: DragEndEvent) => {
    const { active, over } = dragEndEvent
    if (!over || active.id === over.id) {
      return
    }
    playInteractionFeedback('pen_scratch', { volumeMultiplier: 0.6 })
    movePlanStep(String(active.id), stepIdentifiers.indexOf(String(over.id)))
    onPlanChanged()
  }

  const planOrderSignature = stepIdentifiers.join('|')

  useEffect(() => {
    planLinePulseCount.current += 1
    setPlanLinePulse({
      pulseSequenceNumber: planLinePulseCount.current,
      variantName: chooseAnimationVariantName('reply_desk_plan_line_pulse', planLinePulseVariantNames),
    })
    const planLinePulseTimer = window.setTimeout(() => setPlanLinePulse(null), planLinePulseDurationMilliseconds)
    return () => window.clearTimeout(planLinePulseTimer)
  }, [planOrderSignature])

  useEffect(
    () => () => {
      compactStepChipAreaSizeObserver.current?.disconnect()
      changePlanDetailSurface({ isDetailSurfaceOpen: false })
    },
    [],
  )

  const observeCompactStepChipArea = useCallback((compactStepChipArea: HTMLSpanElement | null) => {
    compactStepChipAreaSizeObserver.current?.disconnect()
    compactStepChipAreaSizeObserver.current = null
    if (!compactStepChipArea || typeof ResizeObserver === 'undefined') {
      return
    }
    setCompactStepChipAreaWidth(compactStepChipArea.clientWidth)
    const sizeObserver = new ResizeObserver(() => setCompactStepChipAreaWidth(compactStepChipArea.clientWidth))
    sizeObserver.observe(compactStepChipArea)
    compactStepChipAreaSizeObserver.current = sizeObserver
  }, [])

  const registerCostLedgerSlotElement = useCallback((costLedgerSlotElement: HTMLDivElement | null) => {
    changePlanDetailSurface({ costLedgerSlotElement })
  }, [])

  const registerCostLedgerActionsSlotElement = useCallback((costLedgerActionsSlotElement: HTMLDivElement | null) => {
    changePlanDetailSurface({ costLedgerActionsSlotElement })
  }, [])

  const changeDetailSurfaceOpen = (isOpen: boolean) => {
    if (isOpen === isDetailSurfaceOpen) {
      return
    }
    if (isOpen) {
      playInteractionFeedback('panel_open')
      changePlanDetailSurface({ isDetailSurfaceOpen: true })
      return
    }
    if (isCostLedgerSlipMounted) {
      requestCostDismissalFromPlanDetailSurface()
    } else {
      playInteractionFeedback('panel_close')
    }
    changePlanDetailSurface({ isDetailSurfaceOpen: false })
  }

  const openPlanDetailFromDockLine = () => {
    if (surfaceModeName === 'right_rail') {
      playInteractionFeedback('option_click')
      const firstRailControl = planRailHostElement?.querySelector<HTMLElement>('.reply-desk-plan-step-summary')
      firstRailControl?.scrollIntoView({ block: 'nearest' })
      firstRailControl?.focus()
      return
    }
    changeDetailSurfaceOpen(!isDetailSurfaceOpen)
  }

  const estimatedCostTotals = totalResourceCostsOfPlanSteps(declaredPlanSteps, chronicleState.investigator)
  const estimatedCostDescriptions = estimatedCostTotals.map(describeResourceCostTotal)
  const costAnnouncementText =
    estimatedCostDescriptions.length === 0
      ? ''
      : isCostLedgerSlipMounted
        ? replyDeskCopy.costAwaitingConfirmationAnnouncement(estimatedCostDescriptions)
        : replyDeskCopy.estimatedCostAnnouncement(estimatedCostDescriptions)
  const visibleCompactStepChipCount = countCompactStepChipsThatFit(compactStepChipAreaWidth, declaredPlanSteps.length)
  const hiddenCompactStepChipCount = declaredPlanSteps.length - visibleCompactStepChipCount
  const shouldReportExpandedState = surfaceModeName !== 'right_rail'

  const dockLine = (
    <section className="reply-desk-plan-line" aria-label={replyDeskCopy.planStripTitle}>
      <button
        type="button"
        className="reply-desk-plan-line-button"
        aria-haspopup={shouldReportExpandedState ? 'dialog' : undefined}
        aria-expanded={shouldReportExpandedState ? isDetailSurfaceOpen : undefined}
        aria-label={
          shouldReportExpandedState
            ? replyDeskCopy.openPlanDetailLabel(declaredPlanSteps.length)
            : replyDeskCopy.goToPlanInRailLabel(declaredPlanSteps.length)
        }
        onClick={openPlanDetailFromDockLine}
      >
        {planLinePulse ? (
          <span
            key={planLinePulse.pulseSequenceNumber}
            className="reply-desk-plan-line-pulse"
            data-variant={planLinePulse.variantName}
            aria-hidden="true"
          />
        ) : null}
        <ListChecks size={20} weight="bold" aria-hidden="true" />
        <span className="reply-desk-plan-line-title">{replyDeskCopy.planLineTitle}</span>
        <span className="reply-desk-plan-line-count">{replyDeskCopy.planStepCountLabel(declaredPlanSteps.length)}</span>
        <span ref={observeCompactStepChipArea} className="reply-desk-plan-line-chips" aria-hidden="true">
          {declaredPlanSteps.slice(0, visibleCompactStepChipCount).map((planStep, planStepIndex) => (
            <span key={planStep.stepIdentifier} className="reply-desk-plan-line-chip">
              <span className="reply-desk-plan-step-number">{planStepIndex + 1}</span>
              <span className="reply-desk-plan-line-chip-text">{planStep.actionText}</span>
            </span>
          ))}
          {hiddenCompactStepChipCount > 0 && visibleCompactStepChipCount > 0 ? (
            <span className="reply-desk-plan-line-hidden-count">
              {replyDeskCopy.planLineHiddenStepCount(hiddenCompactStepChipCount)}
            </span>
          ) : null}
        </span>
        {estimatedCostTotals.length > 0 ? (
          <span className="cost-tag reply-desk-plan-line-cost-mark">{replyDeskCopy.planLineCostMark}</span>
        ) : null}
        {shouldReportExpandedState ? (
          <CaretUp className="reply-desk-plan-line-caret" size={16} weight="bold" aria-hidden="true" />
        ) : null}
      </button>
    </section>
  )

  const detailBody = (
    <>
      <div ref={registerCostLedgerSlotElement} className="reply-desk-plan-detail-cost-ledger-slot" />
      <section className="reply-desk-plan-detail-section" aria-labelledby="reply-desk-plan-strip-title">
        <h3 id="reply-desk-plan-strip-title" className="dossier-label">
          {replyDeskCopy.planDetailStepsSectionTitle}
        </h3>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={() => playInteractionFeedback('option_click')}
          onDragEnd={finishSorting}
          accessibility={{
            announcements: sortingAnnouncements,
            screenReaderInstructions: { draggable: replyDeskCopy.sortingInstructions },
          }}
        >
          <SortableContext items={stepIdentifiers} strategy={verticalListSortingStrategy}>
            <ol className="reply-desk-plan-step-list">
              {declaredPlanSteps.map((planStep, planStepIndex) => {
                const originSuggestionIndex = suggestedActions.findIndex(
                  (suggestedAction) => suggestedAction.identifier === planStep.originSuggestedActionIdentifier,
                )
                return (
                  <PlannedStepChip
                    key={planStep.stepIdentifier}
                    planStep={planStep}
                    stepNumber={planStepIndex + 1}
                    declaredStepCount={declaredPlanSteps.length}
                    originSuggestionNumber={originSuggestionIndex >= 0 ? originSuggestionIndex + 1 : null}
                    originalSuggestionText={
                      originSuggestionIndex >= 0 ? suggestedActions[originSuggestionIndex].visibleText : null
                    }
                    isExpanded={expandedStepIdentifier === planStep.stepIdentifier}
                    entranceVariantName={
                      latestAddedStepIdentifiers.includes(planStep.stepIdentifier)
                        ? readEntranceVariantNameOfStep(planStep.stepIdentifier)
                        : null
                    }
                    startsNewDirectorBatch={
                      planStepIndex > 0 && planStepIndex % maximumPlanStepsExecutedPerDirectorBatch === 0
                    }
                    onExpansionToggled={() => {
                      playInteractionFeedback(
                        expandedStepIdentifier === planStep.stepIdentifier ? 'panel_close' : 'panel_open',
                      )
                      setExpandedStepIdentifier((previousIdentifier) =>
                        previousIdentifier === planStep.stepIdentifier ? null : planStep.stepIdentifier,
                      )
                    }}
                    onRemoved={() => {
                      playInteractionFeedback('panel_close')
                      removePlanStep(planStep.stepIdentifier)
                      onPlanChanged()
                    }}
                    onMoved={(targetStepIndex) => {
                      playInteractionFeedback('option_click')
                      movePlanStep(planStep.stepIdentifier, targetStepIndex)
                      onPlanChanged()
                    }}
                    onActionTextChanged={(actionText, originalSuggestionText) => {
                      changePlanStepText(planStep.stepIdentifier, actionText, originalSuggestionText)
                      onPlanChanged()
                    }}
                    onConditionTextChanged={(conditionText) => {
                      changePlanStepCondition(planStep.stepIdentifier, conditionText)
                      onPlanChanged()
                    }}
                  />
                )
              })}
            </ol>
          </SortableContext>
        </DndContext>
        {declaredPlanSteps.length > maximumPlanStepsExecutedPerDirectorBatch ? (
          <p className="reply-desk-batch-notice">
            {replyDeskCopy.directorBatchNotice(maximumPlanStepsExecutedPerDirectorBatch)}
          </p>
        ) : null}
      </section>
      <section className="reply-desk-plan-detail-section" aria-labelledby="reply-desk-plan-estimated-cost-title">
        <h3 id="reply-desk-plan-estimated-cost-title" className="dossier-label">
          {replyDeskCopy.planDetailEstimatedCostSectionTitle}
        </h3>
        <ResourceCostEstimateList
          resourceCostTotals={estimatedCostTotals}
          emptyNotice={replyDeskCopy.planDetailNoCostNotice}
          estimateNotice={replyDeskCopy.planDetailEstimatedCostNotice}
        />
      </section>
    </>
  )

  const detailFooter = (
    <>
      <div ref={registerCostLedgerActionsSlotElement} className="reply-desk-plan-detail-cost-actions-slot" />
      {!isCostLedgerSlipMounted && surfaceModeName !== 'right_rail' ? (
        <button
          type="button"
          className="quiet-action-button reply-desk-plan-detail-return"
          onClick={() => changeDetailSurfaceOpen(false)}
        >
          {replyDeskCopy.returnToPlanButton}
        </button>
      ) : null}
    </>
  )

  return (
    <PlanDetailSurface
      surfaceModeName={surfaceModeName}
      isOpen={isDetailSurfaceOpen}
      titleText={replyDeskCopy.planStripTitle}
      countText={replyDeskCopy.planStepCountLabel(declaredPlanSteps.length)}
      descriptionText={replyDeskCopy.planDetailDescription}
      costAnnouncementText={costAnnouncementText}
      dockLine={dockLine}
      detailBody={detailBody}
      detailFooter={detailFooter}
      onOpenChanged={changeDetailSurfaceOpen}
    />
  )
}

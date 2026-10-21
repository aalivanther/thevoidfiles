import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowDown, ArrowUp, DotsSixVertical, PencilSimpleLine, X } from '@phosphor-icons/react'
import { useId } from 'react'
import { useInteractionFeedback } from '../../../audio/interaction_feedback'
import { replyDeskCopy } from '../../../copy/archive_chat_engine/reply_desk_copy'
import type { PlannedActionStep } from '../../../game_state/archive_turn_contract'
import { useChronicleState } from '../../../game_state/chronicle_state'
import { usePlayerSettings } from '../../../settings/player_settings'
import { describeResourceCost } from './resource_cost_description'

export type PlannedStepEntranceVariantName = 'stamped_down' | 'slid_from_margin' | 'unfolded_from_crease'

const maximumPlanStepTextLength = 600
const maximumPlanStepConditionLength = 160

type PlannedStepChipProperties = {
  planStep: PlannedActionStep
  stepNumber: number
  declaredStepCount: number
  originSuggestionNumber: number | null
  originalSuggestionText: string | null
  isExpanded: boolean
  entranceVariantName: PlannedStepEntranceVariantName | null
  startsNewDirectorBatch: boolean
  onExpansionToggled: () => void
  onRemoved: () => void
  onMoved: (targetStepIndex: number) => void
  onActionTextChanged: (actionText: string, originalSuggestionText: string | null) => void
  onConditionTextChanged: (conditionText: string | null) => void
}

function describeStepOrigin(planStep: PlannedActionStep, originSuggestionNumber: number | null): string {
  if (planStep.originSuggestedActionIdentifier === null) {
    return replyDeskCopy.planStepOwnWordsLabel
  }
  if (originSuggestionNumber === null) {
    return replyDeskCopy.planStepFromEarlierSuggestionLabel
  }
  return planStep.wasTextEditedByPlayer
    ? replyDeskCopy.planStepFromEditedSuggestionLabel(originSuggestionNumber)
    : replyDeskCopy.planStepFromSuggestionLabel(originSuggestionNumber)
}

export function PlannedStepChip({
  planStep,
  stepNumber,
  declaredStepCount,
  originSuggestionNumber,
  originalSuggestionText,
  isExpanded,
  entranceVariantName,
  startsNewDirectorBatch,
  onExpansionToggled,
  onRemoved,
  onMoved,
  onActionTextChanged,
  onConditionTextChanged,
}: PlannedStepChipProperties) {
  const playInteractionFeedback = useInteractionFeedback()
  const { chronicleState } = useChronicleState()
  const { shouldReduceMotion } = usePlayerSettings()
  const editorIdentifier = useId()
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: planStep.stepIdentifier,
    transition: shouldReduceMotion ? null : { duration: 180, easing: 'cubic-bezier(0.2, 0.9, 0.2, 1)' },
  })

  return (
    <li
      ref={setNodeRef}
      className="reply-desk-plan-step"
      data-is-dragging={isDragging ? 'true' : 'false'}
      data-entrance-variant={entranceVariantName ?? 'none'}
      data-starts-new-director-batch={startsNewDirectorBatch ? 'true' : 'false'}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <div className="reply-desk-plan-step-row">
        <button
          type="button"
          ref={setActivatorNodeRef}
          className="reply-desk-plan-step-handle"
          {...attributes}
          {...listeners}
          aria-label={replyDeskCopy.dragPlanStepLabel(stepNumber)}
        >
          <DotsSixVertical size={20} weight="bold" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="reply-desk-plan-step-summary"
          aria-expanded={isExpanded}
          aria-controls={editorIdentifier}
          aria-label={`${replyDeskCopy.openPlanStepEditorLabel(stepNumber)}: ${planStep.actionText}`}
          onClick={onExpansionToggled}
          onKeyDown={(keyboardEvent) => {
            if (keyboardEvent.key === 'Delete') {
              keyboardEvent.preventDefault()
              onRemoved()
            }
          }}
        >
          <span className="reply-desk-plan-step-number" aria-hidden="true">
            {stepNumber}
          </span>
          <span className="reply-desk-plan-step-text">
            <span className="reply-desk-plan-step-origin">
              {describeStepOrigin(planStep, originSuggestionNumber)}
              <PencilSimpleLine size={12} weight="bold" aria-hidden="true" />
            </span>
            <span className="reply-desk-plan-step-action">{planStep.actionText}</span>
            {planStep.conditionText ? (
              <span className="reply-desk-plan-step-condition">
                <span className="reply-desk-plan-step-condition-prefix">{replyDeskCopy.planStepConditionPrefix}</span>{' '}
                {planStep.conditionText}
              </span>
            ) : null}
            {planStep.declaredResourceCost ? (
              <span className="cost-tag reply-desk-plan-step-cost">
                {describeResourceCost(planStep.declaredResourceCost, chronicleState.archiveRun.belongingDefinitions)}
              </span>
            ) : null}
          </span>
        </button>
        <button
          type="button"
          className="reply-desk-plan-step-remove"
          aria-label={replyDeskCopy.removePlanStepLabel(stepNumber)}
          onClick={onRemoved}
        >
          <X size={16} weight="bold" aria-hidden="true" />
        </button>
      </div>
      {isExpanded ? (
        <div id={editorIdentifier} className="reply-desk-plan-step-editor">
          <label className="dossier-label" htmlFor={`${editorIdentifier}-action`}>
            {replyDeskCopy.planStepTextFieldLabel}
          </label>
          <textarea
            id={`${editorIdentifier}-action`}
            className="free-action-field reply-desk-plan-step-field"
            rows={2}
            maxLength={maximumPlanStepTextLength}
            value={planStep.actionText}
            onChange={(changeEvent) => {
              if (changeEvent.target.value.length > planStep.actionText.length) {
                playInteractionFeedback('typewriter_key')
              }
              onActionTextChanged(changeEvent.target.value.slice(0, maximumPlanStepTextLength), originalSuggestionText)
            }}
          />
          <label className="dossier-label" htmlFor={`${editorIdentifier}-condition`}>
            {replyDeskCopy.planStepConditionFieldLabel}
          </label>
          <input
            id={`${editorIdentifier}-condition`}
            type="text"
            className="free-action-field reply-desk-plan-step-field"
            maxLength={maximumPlanStepConditionLength}
            placeholder={replyDeskCopy.planStepConditionPlaceholder}
            autoComplete="off"
            value={planStep.conditionText ?? ''}
            onChange={(changeEvent) => {
              if (changeEvent.target.value.length > (planStep.conditionText ?? '').length) {
                playInteractionFeedback('typewriter_key')
              }
              onConditionTextChanged(changeEvent.target.value.length > 0 ? changeEvent.target.value : null)
            }}
            onKeyDown={(keyboardEvent) => {
              if (keyboardEvent.key === 'Enter') {
                keyboardEvent.preventDefault()
                onExpansionToggled()
              }
            }}
          />
          <div className="reply-desk-condition-presets" role="group" aria-label={replyDeskCopy.planStepConditionPresetsLabel}>
            {replyDeskCopy.planStepConditionPresets.map((conditionPreset) => (
              <button
                key={conditionPreset}
                type="button"
                className="reply-desk-condition-preset"
                aria-pressed={planStep.conditionText === conditionPreset}
                onClick={() => {
                  playInteractionFeedback('option_click')
                  onConditionTextChanged(planStep.conditionText === conditionPreset ? null : conditionPreset)
                }}
              >
                {conditionPreset}
              </button>
            ))}
          </div>
          <div className="reply-desk-plan-step-editor-actions">
            <button
              type="button"
              className="quiet-action-button"
              disabled={stepNumber === 1}
              aria-label={replyDeskCopy.movePlanStepEarlierLabel(stepNumber)}
              onClick={() => onMoved(stepNumber - 2)}
            >
              <ArrowUp size={16} weight="bold" aria-hidden="true" />
              {replyDeskCopy.movePlanStepEarlierButton}
            </button>
            <button
              type="button"
              className="quiet-action-button"
              disabled={stepNumber === declaredStepCount}
              aria-label={replyDeskCopy.movePlanStepLaterLabel(stepNumber)}
              onClick={() => onMoved(stepNumber)}
            >
              <ArrowDown size={16} weight="bold" aria-hidden="true" />
              {replyDeskCopy.movePlanStepLaterButton}
            </button>
            <button type="button" className="quiet-action-button reply-desk-plan-step-editor-close" onClick={onExpansionToggled}>
              {replyDeskCopy.closePlanStepEditorButton}
            </button>
          </div>
        </div>
      ) : null}
    </li>
  )
}

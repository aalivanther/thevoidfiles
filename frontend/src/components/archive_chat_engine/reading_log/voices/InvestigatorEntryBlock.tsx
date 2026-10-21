import { HourglassMedium, PencilSimpleLine, WarningDiamond } from '@phosphor-icons/react'
import { readingLogCopy } from '../../../../copy/archive_chat_engine/reading_log_copy'
import type { InvestigatorCompositionOriginName } from '../../../../game_state/archive_turn_contract'
import { readInvestigatorShortName, useChronicleState } from '../../../../game_state/chronicle_state'

export type InvestigatorDeclaredStep = {
  stepKey: string
  stepNumber: number
  actionText: string
  conditionText: string | null
  compositionOriginName: InvestigatorCompositionOriginName | null
}

export type InvestigatorDeclarationStatusName = 'confirmed' | 'awaiting_director' | 'unanswered_by_director'

export type InvestigatorEntryBlockProperties = {
  declaredSteps: InvestigatorDeclaredStep[]
  declaredPlanStepCount: number | null
  declarationStatusName: InvestigatorDeclarationStatusName
}

export function InvestigatorEntryBlock({
  declaredSteps,
  declaredPlanStepCount,
  declarationStatusName,
}: InvestigatorEntryBlockProperties) {
  const { chronicleState } = useChronicleState()
  const investigatorShortName = readInvestigatorShortName(chronicleState.investigatorRegistration)
  const shouldNumberSteps = declaredPlanStepCount !== null && declaredPlanStepCount > 1
  const stepNumbersByCompositionOriginLabel = new Map<string, number[]>()
  for (const declaredStep of declaredSteps) {
    const compositionOriginLabel = declaredStep.compositionOriginName
      ? readingLogCopy.compositionOriginLabels[declaredStep.compositionOriginName]
      : null
    if (compositionOriginLabel) {
      stepNumbersByCompositionOriginLabel.set(compositionOriginLabel, [
        ...(stepNumbersByCompositionOriginLabel.get(compositionOriginLabel) ?? []),
        declaredStep.stepNumber,
      ])
    }
  }
  const compositionOriginSummaries = [...stepNumbersByCompositionOriginLabel.entries()].map(
    ([compositionOriginLabel, stepNumbers]) =>
      stepNumbers.length === declaredSteps.length
        ? compositionOriginLabel
        : readingLogCopy.compositionOriginForStepsLabel(compositionOriginLabel, stepNumbers),
  )
  return (
    <div className="reading-log-investigator-entry" data-declaration-status-name={declarationStatusName}>
      <p className="dossier-label reading-log-investigator-entry-caption">
        <PencilSimpleLine size={14} weight="bold" aria-hidden="true" />
        <span>{readingLogCopy.investigatorDeclaresLabel(investigatorShortName)}</span>
        {shouldNumberSteps && declaredPlanStepCount !== null ? (
          <span className="reading-log-caption-detail">{readingLogCopy.declaredPlanDetailLabel(declaredPlanStepCount)}</span>
        ) : null}
      </p>
      <ol className="reading-log-investigator-entry-steps" data-are-steps-numbered={shouldNumberSteps}>
        {declaredSteps.map((declaredStep) => (
          <li key={declaredStep.stepKey} className="reading-log-investigator-entry-step">
            {shouldNumberSteps && declaredPlanStepCount !== null ? (
              <p className="reading-log-investigator-entry-step-number">
                <span aria-hidden="true">{readingLogCopy.planStepShortLabel(declaredStep.stepNumber)}</span>
                <span className="visually-hidden-text">
                  {readingLogCopy.planStepLabel(declaredStep.stepNumber, declaredPlanStepCount)}
                </span>
              </p>
            ) : null}
            <div className="reading-log-investigator-entry-step-body">
              <p className="reading-log-investigator-entry-action">{declaredStep.actionText}</p>
              {declaredStep.conditionText ? (
                <p className="reading-log-investigator-entry-detail">
                  {readingLogCopy.planStepConditionLabel(declaredStep.conditionText)}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
      {compositionOriginSummaries.length > 0 ? (
        <p className="reading-log-investigator-entry-detail reading-log-investigator-entry-origin">
          {compositionOriginSummaries.join(readingLogCopy.compositionOriginSeparator)}
        </p>
      ) : null}
      {declarationStatusName === 'awaiting_director' ? (
        <p className="reading-log-investigator-entry-status">
          <HourglassMedium size={14} weight="fill" aria-hidden="true" />
          {readingLogCopy.pendingDeclarationCaptionLabel}
        </p>
      ) : null}
      {declarationStatusName === 'unanswered_by_director' ? (
        <p className="reading-log-investigator-entry-status">
          <WarningDiamond size={14} weight="fill" aria-hidden="true" />
          {readingLogCopy.pendingDeclarationUnansweredCaptionLabel}
        </p>
      ) : null}
    </div>
  )
}

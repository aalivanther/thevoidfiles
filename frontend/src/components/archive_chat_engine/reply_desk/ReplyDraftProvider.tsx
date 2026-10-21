import { useCallback, useMemo, useReducer, useRef } from 'react'
import type { ReactNode } from 'react'
import { replyDeskCopy } from '../../../copy/archive_chat_engine/reply_desk_copy'
import type { PlannedActionStep, SuggestedInvestigatorAction } from '../../../game_state/archive_turn_contract'
import { ReplyDraftContext } from './reply_draft_context'
import type { NewPlanStepDescription, PlanAnnouncement, ReplyDraftContextValue, SentReplyRecord } from './reply_draft_context'

const maximumRememberedSentReplyCount = 20

type ReplyDraftRequests = Omit<
  ReplyDraftContextValue,
  | 'draftText'
  | 'declaredPlanSteps'
  | 'latestAddedStepIdentifiers'
  | 'canUndoReferenceConversion'
  | 'sentReplyRecords'
  | 'planAnnouncement'
>

type ConversionSnapshot = {
  draftText: string
  declaredPlanSteps: PlannedActionStep[]
}

type ReplyDraftState = {
  draftText: string
  declaredPlanSteps: PlannedActionStep[]
  latestAddedStepIdentifiers: string[]
  conversionSnapshot: ConversionSnapshot | null
  sentReplyRecords: SentReplyRecord[]
  planAnnouncement: PlanAnnouncement
}

type ReplyDraftChange =
  | { kind: 'draft_text_changed'; draftText: string }
  | { kind: 'suggested_action_added'; newPlanStep: PlannedActionStep }
  | { kind: 'suggested_action_toggled'; newPlanStep: PlannedActionStep; suggestionNumber: number }
  | { kind: 'own_words_step_added'; newPlanStep: PlannedActionStep }
  | { kind: 'plan_step_removed'; stepIdentifier: string }
  | { kind: 'plan_step_moved'; stepIdentifier: string; targetStepIndex: number }
  | { kind: 'plan_step_text_changed'; stepIdentifier: string; actionText: string; originalSuggestionText: string | null }
  | { kind: 'plan_step_condition_changed'; stepIdentifier: string; conditionText: string | null }
  | { kind: 'declared_plan_steps_replaced'; planSteps: PlannedActionStep[] }
  | { kind: 'draft_converted_into_plan_steps'; newPlanSteps: PlannedActionStep[] }
  | { kind: 'reference_conversion_undone' }
  | { kind: 'sent_reply_record_restored'; sentReplyRecord: SentReplyRecord }
  | { kind: 'sent_reply_remembered'; sentReplyRecord: SentReplyRecord }
  | { kind: 'plan_change_announced'; announcementText: string }
  | { kind: 'reply_draft_cleared' }

const initialReplyDraftState: ReplyDraftState = {
  draftText: '',
  declaredPlanSteps: [],
  latestAddedStepIdentifiers: [],
  conversionSnapshot: null,
  sentReplyRecords: [],
  planAnnouncement: { announcementSequenceNumber: 0, announcementText: '' },
}

function announce(previousState: ReplyDraftState, announcementText: string): PlanAnnouncement {
  return {
    announcementSequenceNumber: previousState.planAnnouncement.announcementSequenceNumber + 1,
    announcementText,
  }
}

function reduceReplyDraftState(previousState: ReplyDraftState, draftChange: ReplyDraftChange): ReplyDraftState {
  switch (draftChange.kind) {
    case 'draft_text_changed':
      return { ...previousState, draftText: draftChange.draftText, conversionSnapshot: null }
    case 'suggested_action_added':
      return {
        ...previousState,
        declaredPlanSteps: [...previousState.declaredPlanSteps, draftChange.newPlanStep],
        latestAddedStepIdentifiers: [draftChange.newPlanStep.stepIdentifier],
        conversionSnapshot: null,
      }
    case 'suggested_action_toggled': {
      const stepAlreadyInPlan = previousState.declaredPlanSteps.find(
        (planStep) =>
          planStep.originSuggestedActionIdentifier === draftChange.newPlanStep.originSuggestedActionIdentifier,
      )
      if (stepAlreadyInPlan) {
        return {
          ...previousState,
          declaredPlanSteps: previousState.declaredPlanSteps.filter((planStep) => planStep !== stepAlreadyInPlan),
          conversionSnapshot: null,
          planAnnouncement: announce(previousState, replyDeskCopy.suggestionRemovedAnnouncement(draftChange.suggestionNumber)),
        }
      }
      return {
        ...previousState,
        declaredPlanSteps: [...previousState.declaredPlanSteps, draftChange.newPlanStep],
        latestAddedStepIdentifiers: [draftChange.newPlanStep.stepIdentifier],
        conversionSnapshot: null,
        planAnnouncement: announce(
          previousState,
          replyDeskCopy.suggestionAddedAnnouncement(draftChange.suggestionNumber, previousState.declaredPlanSteps.length + 1),
        ),
      }
    }
    case 'own_words_step_added':
      return {
        ...previousState,
        draftText: '',
        declaredPlanSteps: [...previousState.declaredPlanSteps, draftChange.newPlanStep],
        latestAddedStepIdentifiers: [draftChange.newPlanStep.stepIdentifier],
        conversionSnapshot: null,
        planAnnouncement: announce(
          previousState,
          replyDeskCopy.ownWordsStepAddedAnnouncement(previousState.declaredPlanSteps.length + 1),
        ),
      }
    case 'plan_step_removed': {
      const removedStepIndex = previousState.declaredPlanSteps.findIndex(
        (planStep) => planStep.stepIdentifier === draftChange.stepIdentifier,
      )
      if (removedStepIndex < 0) {
        return previousState
      }
      return {
        ...previousState,
        declaredPlanSteps: previousState.declaredPlanSteps.filter((_planStep, stepIndex) => stepIndex !== removedStepIndex),
        conversionSnapshot: null,
        planAnnouncement: announce(previousState, replyDeskCopy.planStepRemovedAnnouncement(removedStepIndex + 1)),
      }
    }
    case 'plan_step_moved': {
      const movedStepIndex = previousState.declaredPlanSteps.findIndex(
        (planStep) => planStep.stepIdentifier === draftChange.stepIdentifier,
      )
      const targetStepIndex = Math.max(
        0,
        Math.min(previousState.declaredPlanSteps.length - 1, draftChange.targetStepIndex),
      )
      if (movedStepIndex < 0 || movedStepIndex === targetStepIndex) {
        return previousState
      }
      const reorderedPlanSteps = [...previousState.declaredPlanSteps]
      const [movedPlanStep] = reorderedPlanSteps.splice(movedStepIndex, 1)
      reorderedPlanSteps.splice(targetStepIndex, 0, movedPlanStep)
      return {
        ...previousState,
        declaredPlanSteps: reorderedPlanSteps,
        conversionSnapshot: null,
        planAnnouncement: announce(
          previousState,
          replyDeskCopy.planStepMovedAnnouncement(movedStepIndex + 1, targetStepIndex + 1),
        ),
      }
    }
    case 'plan_step_text_changed':
      return {
        ...previousState,
        conversionSnapshot: null,
        declaredPlanSteps: previousState.declaredPlanSteps.map((planStep) =>
          planStep.stepIdentifier === draftChange.stepIdentifier
            ? {
                ...planStep,
                actionText: draftChange.actionText,
                wasTextEditedByPlayer:
                  planStep.originSuggestedActionIdentifier !== null &&
                  (draftChange.originalSuggestionText === null ||
                    draftChange.actionText.trim() !== draftChange.originalSuggestionText.trim()),
              }
            : planStep,
        ),
      }
    case 'plan_step_condition_changed':
      return {
        ...previousState,
        conversionSnapshot: null,
        declaredPlanSteps: previousState.declaredPlanSteps.map((planStep) =>
          planStep.stepIdentifier === draftChange.stepIdentifier
            ? { ...planStep, conditionText: draftChange.conditionText }
            : planStep,
        ),
      }
    case 'declared_plan_steps_replaced':
      return {
        ...previousState,
        declaredPlanSteps: draftChange.planSteps,
        latestAddedStepIdentifiers: draftChange.planSteps.map((planStep) => planStep.stepIdentifier),
        conversionSnapshot: null,
      }
    case 'draft_converted_into_plan_steps': {
      const stepsNotYetInPlan = draftChange.newPlanSteps.filter(
        (newPlanStep) =>
          newPlanStep.originSuggestedActionIdentifier === null ||
          !previousState.declaredPlanSteps.some(
            (planStep) => planStep.originSuggestedActionIdentifier === newPlanStep.originSuggestedActionIdentifier,
          ),
      )
      return {
        ...previousState,
        draftText: '',
        declaredPlanSteps: [...previousState.declaredPlanSteps, ...stepsNotYetInPlan],
        latestAddedStepIdentifiers: stepsNotYetInPlan.map((planStep) => planStep.stepIdentifier),
        conversionSnapshot: { draftText: previousState.draftText, declaredPlanSteps: previousState.declaredPlanSteps },
        planAnnouncement: announce(previousState, replyDeskCopy.referencesConvertedNotice),
      }
    }
    case 'reference_conversion_undone':
      if (!previousState.conversionSnapshot) {
        return previousState
      }
      return {
        ...previousState,
        draftText: previousState.conversionSnapshot.draftText,
        declaredPlanSteps: previousState.conversionSnapshot.declaredPlanSteps,
        latestAddedStepIdentifiers: [],
        conversionSnapshot: null,
        planAnnouncement: announce(previousState, replyDeskCopy.conversionUndoneNotice),
      }
    case 'sent_reply_record_restored':
      return {
        ...previousState,
        draftText: draftChange.sentReplyRecord.draftText,
        declaredPlanSteps: draftChange.sentReplyRecord.declaredPlanSteps,
        latestAddedStepIdentifiers: [],
        conversionSnapshot: null,
      }
    case 'sent_reply_remembered':
      return {
        ...previousState,
        sentReplyRecords: [...previousState.sentReplyRecords, draftChange.sentReplyRecord].slice(
          -maximumRememberedSentReplyCount,
        ),
      }
    case 'plan_change_announced':
      return { ...previousState, planAnnouncement: announce(previousState, draftChange.announcementText) }
    case 'reply_draft_cleared':
      return {
        ...previousState,
        draftText: '',
        declaredPlanSteps: [],
        latestAddedStepIdentifiers: [],
        conversionSnapshot: null,
      }
  }
}

export function ReplyDraftProvider({ children }: { children: ReactNode }) {
  const [replyDraftState, changeReplyDraftState] = useReducer(reduceReplyDraftState, initialReplyDraftState)
  const createdPlanStepCount = useRef(0)

  const createPlanStep = useCallback((newPlanStepDescription: NewPlanStepDescription): PlannedActionStep => {
    createdPlanStepCount.current += 1
    const originSuggestedAction = newPlanStepDescription.originSuggestedAction
    return {
      stepIdentifier: `plan_step_${Date.now().toString(36)}_${createdPlanStepCount.current}`,
      actionText: newPlanStepDescription.actionText,
      conditionText: newPlanStepDescription.conditionText,
      originSuggestedActionIdentifier: originSuggestedAction ? originSuggestedAction.identifier : null,
      wasTextEditedByPlayer: false,
      declaredResourceCost: originSuggestedAction ? originSuggestedAction.resourceCost : null,
    }
  }, [])

  const replyDraftRequests = useMemo<ReplyDraftRequests>(
    () => ({
      changeDraftText: (draftText) => changeReplyDraftState({ kind: 'draft_text_changed', draftText }),
      addSuggestedActionToPlan: (suggestedAction: SuggestedInvestigatorAction) =>
        changeReplyDraftState({
          kind: 'suggested_action_added',
          newPlanStep: createPlanStep({
            actionText: suggestedAction.visibleText,
            conditionText: null,
            originSuggestedAction: suggestedAction,
          }),
        }),
      toggleSuggestedActionInPlan: (suggestedAction, suggestionNumber) =>
        changeReplyDraftState({
          kind: 'suggested_action_toggled',
          suggestionNumber,
          newPlanStep: createPlanStep({
            actionText: suggestedAction.visibleText,
            conditionText: null,
            originSuggestedAction: suggestedAction,
          }),
        }),
      addOwnWordsStepToPlan: (actionText, conditionText) =>
        changeReplyDraftState({
          kind: 'own_words_step_added',
          newPlanStep: createPlanStep({ actionText, conditionText, originSuggestedAction: null }),
        }),
      removePlanStep: (stepIdentifier) => changeReplyDraftState({ kind: 'plan_step_removed', stepIdentifier }),
      movePlanStep: (stepIdentifier, targetStepIndex) =>
        changeReplyDraftState({ kind: 'plan_step_moved', stepIdentifier, targetStepIndex }),
      changePlanStepText: (stepIdentifier, actionText, originalSuggestionText) =>
        changeReplyDraftState({ kind: 'plan_step_text_changed', stepIdentifier, actionText, originalSuggestionText }),
      changePlanStepCondition: (stepIdentifier, conditionText) =>
        changeReplyDraftState({ kind: 'plan_step_condition_changed', stepIdentifier, conditionText }),
      replaceDeclaredPlanSteps: (planSteps) => changeReplyDraftState({ kind: 'declared_plan_steps_replaced', planSteps }),
      convertDraftIntoPlanSteps: (newPlanStepDescriptions) =>
        changeReplyDraftState({
          kind: 'draft_converted_into_plan_steps',
          newPlanSteps: newPlanStepDescriptions.map(createPlanStep),
        }),
      undoReferenceConversion: () => changeReplyDraftState({ kind: 'reference_conversion_undone' }),
      restoreSentReplyRecord: (sentReplyRecord) =>
        changeReplyDraftState({ kind: 'sent_reply_record_restored', sentReplyRecord }),
      rememberSentReply: (sentReplyRecord) => changeReplyDraftState({ kind: 'sent_reply_remembered', sentReplyRecord }),
      announcePlanChange: (announcementText) => changeReplyDraftState({ kind: 'plan_change_announced', announcementText }),
      clearReplyDraft: () => changeReplyDraftState({ kind: 'reply_draft_cleared' }),
    }),
    [createPlanStep],
  )

  const contextValue = useMemo<ReplyDraftContextValue>(
    () => ({
      draftText: replyDraftState.draftText,
      declaredPlanSteps: replyDraftState.declaredPlanSteps,
      latestAddedStepIdentifiers: replyDraftState.latestAddedStepIdentifiers,
      canUndoReferenceConversion: replyDraftState.conversionSnapshot !== null,
      sentReplyRecords: replyDraftState.sentReplyRecords,
      planAnnouncement: replyDraftState.planAnnouncement,
      ...replyDraftRequests,
    }),
    [replyDraftState, replyDraftRequests],
  )

  return <ReplyDraftContext.Provider value={contextValue}>{children}</ReplyDraftContext.Provider>
}

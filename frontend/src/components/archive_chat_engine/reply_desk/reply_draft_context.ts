import { createContext, useContext } from 'react'
import type { PlannedActionStep, SuggestedInvestigatorAction } from '../../../game_state/archive_turn_contract'

export type NewPlanStepDescription = {
  actionText: string
  conditionText: string | null
  originSuggestedAction: SuggestedInvestigatorAction | null
}

export type SentReplyRecord = {
  draftText: string
  declaredPlanSteps: PlannedActionStep[]
}

export type PlanAnnouncement = {
  announcementSequenceNumber: number
  announcementText: string
}

export type ReplyDraftContextValue = {
  draftText: string
  declaredPlanSteps: PlannedActionStep[]
  latestAddedStepIdentifiers: string[]
  canUndoReferenceConversion: boolean
  sentReplyRecords: SentReplyRecord[]
  planAnnouncement: PlanAnnouncement
  changeDraftText: (draftText: string) => void
  addSuggestedActionToPlan: (suggestedAction: SuggestedInvestigatorAction) => void
  toggleSuggestedActionInPlan: (suggestedAction: SuggestedInvestigatorAction, suggestionNumber: number) => void
  addOwnWordsStepToPlan: (actionText: string, conditionText: string | null) => void
  removePlanStep: (stepIdentifier: string) => void
  movePlanStep: (stepIdentifier: string, targetStepIndex: number) => void
  changePlanStepText: (stepIdentifier: string, actionText: string, originalSuggestionText: string | null) => void
  changePlanStepCondition: (stepIdentifier: string, conditionText: string | null) => void
  replaceDeclaredPlanSteps: (planSteps: PlannedActionStep[]) => void
  convertDraftIntoPlanSteps: (newPlanStepDescriptions: NewPlanStepDescription[]) => void
  undoReferenceConversion: () => void
  restoreSentReplyRecord: (sentReplyRecord: SentReplyRecord) => void
  rememberSentReply: (sentReplyRecord: SentReplyRecord) => void
  announcePlanChange: (announcementText: string) => void
  clearReplyDraft: () => void
}

function ignoreReplyDraftRequest() {
  return undefined
}

export const inertReplyDraftContextValue: ReplyDraftContextValue = {
  draftText: '',
  declaredPlanSteps: [],
  latestAddedStepIdentifiers: [],
  canUndoReferenceConversion: false,
  sentReplyRecords: [],
  planAnnouncement: { announcementSequenceNumber: 0, announcementText: '' },
  changeDraftText: ignoreReplyDraftRequest,
  addSuggestedActionToPlan: ignoreReplyDraftRequest,
  toggleSuggestedActionInPlan: ignoreReplyDraftRequest,
  addOwnWordsStepToPlan: ignoreReplyDraftRequest,
  removePlanStep: ignoreReplyDraftRequest,
  movePlanStep: ignoreReplyDraftRequest,
  changePlanStepText: ignoreReplyDraftRequest,
  changePlanStepCondition: ignoreReplyDraftRequest,
  replaceDeclaredPlanSteps: ignoreReplyDraftRequest,
  convertDraftIntoPlanSteps: ignoreReplyDraftRequest,
  undoReferenceConversion: ignoreReplyDraftRequest,
  restoreSentReplyRecord: ignoreReplyDraftRequest,
  rememberSentReply: ignoreReplyDraftRequest,
  announcePlanChange: ignoreReplyDraftRequest,
  clearReplyDraft: ignoreReplyDraftRequest,
}

export const ReplyDraftContext = createContext<ReplyDraftContextValue | null>(null)

export function useReplyDraft(): ReplyDraftContextValue {
  return useContext(ReplyDraftContext) ?? inertReplyDraftContextValue
}

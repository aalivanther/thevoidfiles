import { createContext, useContext } from 'react'
import type { DirectorGenerationWaitStageName } from '../director_generation_wait/use_director_generation_wait'
import type {
  AssistanceLevelName,
  DirectorTurnPhaseName,
  DirectorWaitStageName,
  InteractivePieceSubmittedValue,
  PlannedActionStep,
  StagingEvent,
} from '../../game_state/archive_turn_contract'

export type RevealPlaybackState = {
  logEntryIdentifierBeingRevealed: string | null
  logEntryIdentifiersAwaitingReveal: string[]
  isImmediateCompletionRequested: boolean
}

export type ReplyDeskFocusRequest = {
  requestSequenceNumber: number
  referencedInteractivePieceIdentifier: string | null
  restoredDraftText: string | null
  shouldOpenPendingPlanForEditing: boolean
}

export type ArchiveTurnFlowContextValue = {
  directorTurnPhaseName: DirectorTurnPhaseName
  directorWaitStageName: DirectorWaitStageName
  generationWaitStageName: DirectorGenerationWaitStageName
  hasDirectorServiceFailed: boolean
  directorServiceFailureName: string | null
  revealPlaybackState: RevealPlaybackState
  pendingStagingEvents: StagingEvent[]
  isReplyDeskAvailable: boolean
  replyDeskFocusRequest: ReplyDeskFocusRequest
  submitInvestigatorPlan: (planSteps: PlannedActionStep[]) => void
  answerDirectorQuestion: (questionEntryIdentifier: string, answerOptionIdentifier: string) => void
  submitInteractivePieceAttempt: (
    interactivePieceIdentifier: string,
    submittedValue: InteractivePieceSubmittedValue,
  ) => void
  requestInteractivePieceAssistance: (interactivePieceIdentifier: string, levelName: AssistanceLevelName) => void
  setInteractivePieceAside: (interactivePieceIdentifier: string) => void
  focusReplyDeskReferencingInteractivePiece: (interactivePieceIdentifier: string) => void
  requestImmediateRevealCompletion: () => void
  reportRevealReachedParagraph: (logEntryIdentifier: string, paragraphIndex: number) => void
  reportRevealCompleted: (logEntryIdentifier: string) => void
  acknowledgeStagingEvent: (stagingEvent: StagingEvent) => void
  retrySameAction: () => void
}

export const ArchiveTurnFlowContext = createContext<ArchiveTurnFlowContextValue | null>(null)

function ignoreTurnFlowRequest() {
  return undefined
}

export const inertArchiveTurnFlowContextValue: ArchiveTurnFlowContextValue = {
  directorTurnPhaseName: 'idle',
  directorWaitStageName: 'normal',
  generationWaitStageName: 'idle',
  hasDirectorServiceFailed: false,
  directorServiceFailureName: null,
  revealPlaybackState: {
    logEntryIdentifierBeingRevealed: null,
    logEntryIdentifiersAwaitingReveal: [],
    isImmediateCompletionRequested: false,
  },
  pendingStagingEvents: [],
  isReplyDeskAvailable: false,
  replyDeskFocusRequest: {
    requestSequenceNumber: 0,
    referencedInteractivePieceIdentifier: null,
    restoredDraftText: null,
    shouldOpenPendingPlanForEditing: false,
  },
  submitInvestigatorPlan: ignoreTurnFlowRequest,
  answerDirectorQuestion: ignoreTurnFlowRequest,
  submitInteractivePieceAttempt: ignoreTurnFlowRequest,
  requestInteractivePieceAssistance: ignoreTurnFlowRequest,
  setInteractivePieceAside: ignoreTurnFlowRequest,
  focusReplyDeskReferencingInteractivePiece: ignoreTurnFlowRequest,
  requestImmediateRevealCompletion: ignoreTurnFlowRequest,
  reportRevealReachedParagraph: ignoreTurnFlowRequest,
  reportRevealCompleted: ignoreTurnFlowRequest,
  acknowledgeStagingEvent: ignoreTurnFlowRequest,
  retrySameAction: ignoreTurnFlowRequest,
}

export function useArchiveTurnFlow(): ArchiveTurnFlowContextValue {
  const contextValue = useContext(ArchiveTurnFlowContext)
  if (!contextValue) {
    throw new Error('useArchiveTurnFlow requires ArchiveTurnFlowProvider')
  }
  return contextValue
}

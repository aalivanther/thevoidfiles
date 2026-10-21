import { createContext, useContext } from 'react'

export const doesOpenDirectorQuestionBlockEverythingElse = true

export type DirectorQuestionRuling = {
  openDirectorQuestionEntryIdentifier: string | null
  openDirectorQuestionAnswerCount: number
  isEverythingElseBlockedByOpenDirectorQuestion: boolean
  answerDirectorQuestionKeepingReplyDraft: (questionEntryIdentifier: string, answerOptionIdentifier: string) => void
}

function ignoreDirectorQuestionAnswer() {
  return undefined
}

export const noDirectorQuestionRuling: DirectorQuestionRuling = {
  openDirectorQuestionEntryIdentifier: null,
  openDirectorQuestionAnswerCount: 0,
  isEverythingElseBlockedByOpenDirectorQuestion: false,
  answerDirectorQuestionKeepingReplyDraft: ignoreDirectorQuestionAnswer,
}

export const DirectorQuestionRulingContext = createContext<DirectorQuestionRuling>(noDirectorQuestionRuling)

export function useDirectorQuestionRuling(): DirectorQuestionRuling {
  return useContext(DirectorQuestionRulingContext)
}

export function readDirectorQuestionAnswerElementIdentifier(questionEntryIdentifier: string, answerNumber: number): string {
  return `director-question-${questionEntryIdentifier}-answer-${answerNumber}`
}

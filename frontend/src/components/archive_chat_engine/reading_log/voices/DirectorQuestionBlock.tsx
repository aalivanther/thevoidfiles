import { CheckSquare, Question } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { chooseAnimationVariantName } from '../../../../animation/animation_variety'
import { useInteractionFeedback } from '../../../../audio/interaction_feedback'
import { readingLogCopy } from '../../../../copy/archive_chat_engine/reading_log_copy'
import type { DirectorQuestionEntry } from '../../../../game_state/archive_turn_contract'
import { useArchiveTurnFlow } from '../../archive_turn_flow_context'
import { useReplyDraft } from '../../reply_desk/reply_draft_context'
import { isTypingSurface, useDirectorQuestionAnswerNumberKeys } from '../../reply_desk/use_suggestion_number_keys'
import {
  readDirectorQuestionAnswerElementIdentifier,
  useDirectorQuestionRuling,
} from '../../turn_flow/director_question_ruling_context'

export type DirectorQuestionBlockProperties = {
  questionEntry: DirectorQuestionEntry
  isReadOnly: boolean
}

const questionEntranceVariantNames = ['note_slipped_under_door', 'stamp_hit', 'red_underline'] as const
const highestAnswerNumberWithKey = 9
const questionEntryIdentifiersWithEntrancePlayed = new Set<string>()
const questionEntryIdentifiersWithFocusOffered = new Set<string>()

function isPlayerInTheMiddleOfTyping(focusedElement: Element | null): boolean {
  if (!isTypingSurface(focusedElement)) {
    return false
  }
  if (focusedElement instanceof HTMLTextAreaElement || focusedElement instanceof HTMLInputElement) {
    return focusedElement.value.trim().length > 0
  }
  return true
}

export function DirectorQuestionBlock({ questionEntry, isReadOnly }: DirectorQuestionBlockProperties) {
  const playInteractionFeedback = useInteractionFeedback()
  const { answerDirectorQuestion, directorTurnPhaseName } = useArchiveTurnFlow()
  const { openDirectorQuestionEntryIdentifier, answerDirectorQuestionKeepingReplyDraft } = useDirectorQuestionRuling()
  const { draftText, declaredPlanSteps } = useReplyDraft()
  const doesReplyDraftHoldPlayerWork = draftText.trim().length > 0 || declaredPlanSteps.length > 0
  const firstAnswerButton = useRef<HTMLButtonElement>(null)
  const isQuestionAnswered = questionEntry.answeredOptionIdentifier !== null
  const isAnswerPossible = !isReadOnly && !isQuestionAnswered && directorTurnPhaseName === 'idle'
  const isQuestionRulingTheTurn = isAnswerPossible && openDirectorQuestionEntryIdentifier === questionEntry.identifier
  const isVetoQuestion = questionEntry.questionKindName === 'illogical_action_veto'
  const [entranceVariantName] = useState(() =>
    !isReadOnly && !isQuestionAnswered && !questionEntryIdentifiersWithEntrancePlayed.has(questionEntry.identifier)
      ? chooseAnimationVariantName('director_question_entrance', questionEntranceVariantNames)
      : null,
  )

  useEffect(() => {
    if (entranceVariantName === null || questionEntryIdentifiersWithEntrancePlayed.has(questionEntry.identifier)) {
      return
    }
    questionEntryIdentifiersWithEntrancePlayed.add(questionEntry.identifier)
    if (isVetoQuestion) {
      return
    }
    if (entranceVariantName === 'stamp_hit') {
      playInteractionFeedback('stamp_impact', { volumeMultiplier: 0.5 })
      return
    }
    playInteractionFeedback(entranceVariantName === 'note_slipped_under_door' ? 'panel_open' : 'typewriter_key', {
      volumeMultiplier: 0.6,
    })
  }, [entranceVariantName, isVetoQuestion, playInteractionFeedback, questionEntry.identifier])

  useEffect(() => {
    if (!isQuestionRulingTheTurn || questionEntryIdentifiersWithFocusOffered.has(questionEntry.identifier)) {
      return
    }
    questionEntryIdentifiersWithFocusOffered.add(questionEntry.identifier)
    if (!isPlayerInTheMiddleOfTyping(document.activeElement)) {
      firstAnswerButton.current?.focus({ preventScroll: true })
    }
  }, [isQuestionRulingTheTurn, questionEntry.identifier])

  const chooseAnswer = (answerOptionIdentifier: string) => {
    if (!isAnswerPossible) {
      return
    }
    playInteractionFeedback('confirmation')
    if (doesReplyDraftHoldPlayerWork) {
      answerDirectorQuestionKeepingReplyDraft(questionEntry.identifier, answerOptionIdentifier)
      return
    }
    answerDirectorQuestion(questionEntry.identifier, answerOptionIdentifier)
  }

  useDirectorQuestionAnswerNumberKeys(isQuestionRulingTheTurn, (answerNumber) => {
    const answerOption = questionEntry.answerOptions[answerNumber - 1]
    if (!answerOption) {
      playInteractionFeedback('rejection')
      return
    }
    chooseAnswer(answerOption.identifier)
  })

  return (
    <div
      className="reading-log-director-question"
      data-question-kind-name={questionEntry.questionKindName}
      data-is-answered={isQuestionAnswered}
      data-is-ruling-the-turn={isQuestionRulingTheTurn}
      data-question-entrance-variant={entranceVariantName ?? undefined}
    >
      <p className="dossier-label reading-log-director-question-caption">
        <Question size={16} weight="bold" aria-hidden="true" />
        <span>{readingLogCopy.directorQuestionCaptionLabel}</span>
        <span className="reading-log-caption-detail">
          {readingLogCopy.directorQuestionKindLabels[questionEntry.questionKindName]}
        </span>
      </p>
      {questionEntry.plainParagraphs.map((paragraphText, paragraphIndex) => (
        <p key={paragraphIndex} className="reading-log-director-question-paragraph">
          {paragraphText}
        </p>
      ))}
      <ol className="reading-log-director-question-answers">
        {questionEntry.answerOptions.map((answerOption, answerIndex) => {
          const answerNumber = answerIndex + 1
          const isChosenAnswer = questionEntry.answeredOptionIdentifier === answerOption.identifier
          return (
            <li key={answerOption.identifier}>
              <button
                ref={answerIndex === 0 ? firstAnswerButton : undefined}
                id={readDirectorQuestionAnswerElementIdentifier(questionEntry.identifier, answerNumber)}
                type="button"
                className="reading-log-director-question-answer"
                data-is-chosen={isChosenAnswer}
                disabled={!isAnswerPossible}
                aria-pressed={isChosenAnswer}
                aria-label={readingLogCopy.directorQuestionAnswerNumberLabel(answerNumber, answerOption.visibleText)}
                aria-keyshortcuts={
                  isQuestionRulingTheTurn && answerNumber <= highestAnswerNumberWithKey ? String(answerNumber) : undefined
                }
                onPointerEnter={(pointerEvent) => {
                  if (pointerEvent.pointerType === 'mouse' && isAnswerPossible) {
                    playInteractionFeedback('option_hover')
                  }
                }}
                onClick={(clickEvent) => {
                  clickEvent.stopPropagation()
                  chooseAnswer(answerOption.identifier)
                }}
              >
                <span
                  className="reading-log-director-question-answer-number"
                  data-is-key-active={isQuestionRulingTheTurn && answerNumber <= highestAnswerNumberWithKey}
                  aria-hidden="true"
                >
                  {answerNumber}
                </span>
                <span className="reading-log-director-question-answer-text">{answerOption.visibleText}</span>
                {isChosenAnswer ? (
                  <span className="reading-log-director-question-chosen-mark">
                    <CheckSquare size={16} weight="fill" aria-hidden="true" />
                    {readingLogCopy.directorQuestionChosenAnswerLabel}
                  </span>
                ) : null}
              </button>
            </li>
          )
        })}
      </ol>
      {isQuestionRulingTheTurn ? (
        <p className="reading-log-director-question-keys-hint" aria-hidden="true">
          {readingLogCopy.directorQuestionRulesTheTurn.answerKeysHint(
            Math.min(questionEntry.answerOptions.length, highestAnswerNumberWithKey),
          )}
        </p>
      ) : null}
    </div>
  )
}

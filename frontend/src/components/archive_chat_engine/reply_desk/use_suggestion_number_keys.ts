import { useEffect, useRef } from 'react'
import { useDirectorQuestionRuling } from '../turn_flow/director_question_ruling_context'

export function isTypingSurface(eventTarget: EventTarget | null): boolean {
  if (!(eventTarget instanceof HTMLElement)) {
    return false
  }
  return (
    eventTarget.isContentEditable ||
    eventTarget.closest('input, textarea, select, [role="dialog"], [role="slider"], [role="menu"], [role="listbox"]') !== null
  )
}

const suggestionDigitKeyCodePattern = /^(?:Digit|Numpad)([1-9])$/u
const suggestionDrawerKeyCodePattern = /^(?:Digit|Numpad)(0)$/u

function useDocumentNumberKeys(
  isListening: boolean,
  onNumberPressed: (pressedNumber: number) => void,
  digitKeyCodePattern: RegExp = suggestionDigitKeyCodePattern,
) {
  const latestNumberPressedHandler = useRef(onNumberPressed)

  useEffect(() => {
    latestNumberPressedHandler.current = onNumberPressed
  }, [onNumberPressed])

  useEffect(() => {
    if (!isListening) {
      return
    }
    const handleDocumentKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (
        keyboardEvent.defaultPrevented ||
        keyboardEvent.repeat ||
        keyboardEvent.altKey ||
        keyboardEvent.ctrlKey ||
        keyboardEvent.metaKey ||
        isTypingSurface(keyboardEvent.target) ||
        document.querySelector('[role="dialog"]') !== null
      ) {
        return
      }
      const digitMatch = digitKeyCodePattern.exec(keyboardEvent.code)
      if (!digitMatch) {
        return
      }
      keyboardEvent.preventDefault()
      latestNumberPressedHandler.current(Number.parseInt(digitMatch[1], 10))
    }
    document.addEventListener('keydown', handleDocumentKeyDown)
    return () => document.removeEventListener('keydown', handleDocumentKeyDown)
  }, [isListening, digitKeyCodePattern])
}

export function useSuggestionNumberKeys(isListening: boolean, onSuggestionNumberPressed: (suggestionNumber: number) => void) {
  const { openDirectorQuestionEntryIdentifier } = useDirectorQuestionRuling()
  useDocumentNumberKeys(isListening && openDirectorQuestionEntryIdentifier === null, onSuggestionNumberPressed)
}

export function useDirectorQuestionAnswerNumberKeys(isListening: boolean, onAnswerNumberPressed: (answerNumber: number) => void) {
  useDocumentNumberKeys(isListening, onAnswerNumberPressed)
}

export function useSuggestionDrawerKey(isListening: boolean, onDrawerKeyPressed: () => void) {
  const { openDirectorQuestionEntryIdentifier } = useDirectorQuestionRuling()
  useDocumentNumberKeys(isListening && openDirectorQuestionEntryIdentifier === null, onDrawerKeyPressed, suggestionDrawerKeyCodePattern)
}

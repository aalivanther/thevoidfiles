import type { InteractivePieceSubmittedValue } from '../../game_state/archive_turn_contract'
import type { DemoInteractivePieceDefinition, DemoPrivateRuleCheck } from './demo_decision_tree_types'

function readPositions(orderedPieceIdentifiers: readonly string[], pieceIdentifier: string): number[] {
  return orderedPieceIdentifiers.flatMap((orderedPieceIdentifier, positionIndex) =>
    orderedPieceIdentifier === pieceIdentifier ? [positionIndex] : [],
  )
}

function isPairRuleSatisfied(
  ruleKindName: 'piece_immediately_before' | 'pieces_not_adjacent' | 'piece_after',
  positions: readonly number[],
  otherPositions: readonly number[],
): boolean {
  if (positions.length === 0 || otherPositions.length === 0) {
    return false
  }
  if (ruleKindName === 'piece_immediately_before') {
    return (
      positions.every((position) => otherPositions.includes(position + 1)) &&
      otherPositions.every((otherPosition) => positions.includes(otherPosition - 1))
    )
  }
  if (ruleKindName === 'pieces_not_adjacent') {
    return positions.every((position) => otherPositions.every((otherPosition) => Math.abs(position - otherPosition) !== 1))
  }
  return Math.min(...positions) > Math.max(...otherPositions)
}

function countDistinctWheelLetters(alphabetLetters: readonly string[]): number {
  return new Set(alphabetLetters).size
}

function isRuleCheckSatisfied(
  piece: DemoInteractivePieceDefinition,
  ruleCheck: DemoPrivateRuleCheck,
  submittedValue: InteractivePieceSubmittedValue,
): boolean {
  const { privateSolution } = piece
  const { publicState } = piece.publicDefinition
  switch (ruleCheck.ruleKindName) {
    case 'exact_combination':
      return (
        privateSolution.widgetKindName === 'combination_dials' &&
        submittedValue.widgetKindName === 'combination_dials' &&
        submittedValue.chosenSymbols.length === privateSolution.chosenSymbols.length &&
        submittedValue.chosenSymbols.every((chosenSymbol, dialIndex) => chosenSymbol === privateSolution.chosenSymbols[dialIndex])
      )
    case 'exact_shift': {
      if (
        privateSolution.widgetKindName !== 'cipher_wheel' ||
        submittedValue.widgetKindName !== 'cipher_wheel' ||
        publicState.widgetKindName !== 'cipher_wheel'
      ) {
        return false
      }
      const wheelLength = countDistinctWheelLetters(publicState.alphabetLetters)
      const normalize = (shiftPositions: number) => ((shiftPositions % wheelLength) + wheelLength) % wheelLength
      return wheelLength > 0 && normalize(submittedValue.shiftPositions) === normalize(privateSolution.shiftPositions)
    }
    case 'piece_at_position': {
      if (submittedValue.widgetKindName !== 'ordered_positions') {
        return false
      }
      const positions = readPositions(submittedValue.orderedPieceIdentifiers, ruleCheck.pieceIdentifier)
      return positions.length === 1 && positions[0] === ruleCheck.positionIndex
    }
    case 'piece_immediately_before':
    case 'pieces_not_adjacent':
    case 'piece_after':
      if (submittedValue.widgetKindName !== 'ordered_positions') {
        return false
      }
      return isPairRuleSatisfied(
        ruleCheck.ruleKindName,
        readPositions(submittedValue.orderedPieceIdentifiers, ruleCheck.pieceIdentifier),
        readPositions(submittedValue.orderedPieceIdentifiers, ruleCheck.otherPieceIdentifier),
      )
  }
}

export function findViolatedVisibleRuleTexts(
  piece: DemoInteractivePieceDefinition,
  submittedValue: InteractivePieceSubmittedValue,
): string[] {
  return piece.privateRuleChecks
    .filter((ruleCheck) => !isRuleCheckSatisfied(piece, ruleCheck, submittedValue))
    .map((ruleCheck) => ruleCheck.visibleRuleText)
}

export function isSubmittedValueUsable(
  piece: DemoInteractivePieceDefinition,
  submittedValue: InteractivePieceSubmittedValue,
): boolean {
  const { publicState } = piece.publicDefinition
  if (publicState.widgetKindName !== submittedValue.widgetKindName) {
    return false
  }
  if (publicState.widgetKindName === 'combination_dials' && submittedValue.widgetKindName === 'combination_dials') {
    return (
      submittedValue.chosenSymbols.length === publicState.dials.length &&
      submittedValue.chosenSymbols.every((chosenSymbol, dialIndex) => publicState.dials[dialIndex].symbols.includes(chosenSymbol))
    )
  }
  if (publicState.widgetKindName === 'cipher_wheel' && submittedValue.widgetKindName === 'cipher_wheel') {
    return Number.isInteger(submittedValue.shiftPositions)
  }
  if (publicState.widgetKindName === 'ordered_positions' && submittedValue.widgetKindName === 'ordered_positions') {
    const expectedIdentifiers = [...publicState.initialOrderPieceIdentifiers].sort()
    const submittedIdentifiers = [...submittedValue.orderedPieceIdentifiers].sort()
    return (
      expectedIdentifiers.length === submittedIdentifiers.length &&
      expectedIdentifiers.every((pieceIdentifier, pieceIndex) => pieceIdentifier === submittedIdentifiers[pieceIndex])
    )
  }
  return false
}

import { interactivePiecesCopy } from '../../../copy/archive_chat_engine/interactive_pieces_copy'
import type {
  CipherWheelPublicState,
  InteractivePiecePublicState,
  InteractivePieceSubmittedValue,
} from '../../../game_state/archive_turn_contract'

export function wrapPositionWithinCount(position: number, count: number): number {
  if (count <= 0) {
    return 0
  }
  return ((Math.round(position) % count) + count) % count
}

export function createInitialWorkingValue(publicState: InteractivePiecePublicState): InteractivePieceSubmittedValue {
  switch (publicState.widgetKindName) {
    case 'cipher_wheel':
      return { widgetKindName: 'cipher_wheel', shiftPositions: 0 }
    case 'ordered_positions':
      return { widgetKindName: 'ordered_positions', orderedPieceIdentifiers: readValidInitialOrder(publicState) }
    case 'combination_dials':
      return {
        widgetKindName: 'combination_dials',
        chosenSymbols: publicState.dials.map((dial) => dial.symbols[0] ?? ''),
      }
  }
}

function readValidInitialOrder(publicState: Extract<InteractivePiecePublicState, { widgetKindName: 'ordered_positions' }>) {
  const knownPieceIdentifiers = publicState.pieces.map((piece) => piece.pieceIdentifier)
  const declaredOrder = publicState.initialOrderPieceIdentifiers.filter((pieceIdentifier, orderIndex, wholeOrder) =>
    knownPieceIdentifiers.includes(pieceIdentifier) && wholeOrder.indexOf(pieceIdentifier) === orderIndex,
  )
  const missingPieceIdentifiers = knownPieceIdentifiers.filter((pieceIdentifier) => !declaredOrder.includes(pieceIdentifier))
  return [...declaredOrder, ...missingPieceIdentifiers]
}

export function readEffectiveWorkingValue(
  publicState: InteractivePiecePublicState,
  storedWorkingValue: InteractivePieceSubmittedValue | null,
): InteractivePieceSubmittedValue {
  const initialWorkingValue = createInitialWorkingValue(publicState)
  if (!storedWorkingValue || storedWorkingValue.widgetKindName !== publicState.widgetKindName) {
    return initialWorkingValue
  }
  if (storedWorkingValue.widgetKindName === 'cipher_wheel' && publicState.widgetKindName === 'cipher_wheel') {
    return {
      widgetKindName: 'cipher_wheel',
      shiftPositions: wrapPositionWithinCount(storedWorkingValue.shiftPositions, publicState.alphabetLetters.length),
    }
  }
  if (
    storedWorkingValue.widgetKindName === 'ordered_positions' &&
    initialWorkingValue.widgetKindName === 'ordered_positions'
  ) {
    const expectedPieceIdentifiers = initialWorkingValue.orderedPieceIdentifiers
    const isStoredOrderComplete =
      storedWorkingValue.orderedPieceIdentifiers.length === expectedPieceIdentifiers.length &&
      expectedPieceIdentifiers.every((pieceIdentifier) => storedWorkingValue.orderedPieceIdentifiers.includes(pieceIdentifier))
    return isStoredOrderComplete ? storedWorkingValue : initialWorkingValue
  }
  if (storedWorkingValue.widgetKindName === 'combination_dials' && publicState.widgetKindName === 'combination_dials') {
    return {
      widgetKindName: 'combination_dials',
      chosenSymbols: publicState.dials.map((dial, dialIndex) => {
        const storedSymbol = storedWorkingValue.chosenSymbols[dialIndex]
        return storedSymbol !== undefined && dial.symbols.includes(storedSymbol) ? storedSymbol : (dial.symbols[0] ?? '')
      }),
    }
  }
  return initialWorkingValue
}

export function areSubmittedValuesEqual(
  firstValue: InteractivePieceSubmittedValue,
  secondValue: InteractivePieceSubmittedValue,
): boolean {
  if (firstValue.widgetKindName === 'cipher_wheel' && secondValue.widgetKindName === 'cipher_wheel') {
    return firstValue.shiftPositions === secondValue.shiftPositions
  }
  if (firstValue.widgetKindName === 'ordered_positions' && secondValue.widgetKindName === 'ordered_positions') {
    return (
      firstValue.orderedPieceIdentifiers.length === secondValue.orderedPieceIdentifiers.length &&
      firstValue.orderedPieceIdentifiers.every(
        (pieceIdentifier, orderIndex) => secondValue.orderedPieceIdentifiers[orderIndex] === pieceIdentifier,
      )
    )
  }
  if (firstValue.widgetKindName === 'combination_dials' && secondValue.widgetKindName === 'combination_dials') {
    return (
      firstValue.chosenSymbols.length === secondValue.chosenSymbols.length &&
      firstValue.chosenSymbols.every((chosenSymbol, dialIndex) => secondValue.chosenSymbols[dialIndex] === chosenSymbol)
    )
  }
  return false
}

export function caesarWheelLetters(alphabetLetters: string[]): string[] {
  const seenLetters = new Set<string>()
  const wheelLetters: string[] = []
  for (const alphabetLetter of alphabetLetters) {
    if (seenLetters.has(alphabetLetter)) {
      continue
    }
    seenLetters.add(alphabetLetter)
    wheelLetters.push(alphabetLetter)
  }
  return wheelLetters
}

export function readLetterReadThroughWheel(
  publicState: CipherWheelPublicState,
  cipheredLetterIndex: number,
  shiftPositions: number,
): string {
  const wheelLetters = caesarWheelLetters(publicState.alphabetLetters)
  return wheelLetters[wrapPositionWithinCount(cipheredLetterIndex - shiftPositions, wheelLetters.length)] ?? ''
}

export function decipherTextThroughWheel(publicState: CipherWheelPublicState, shiftPositions: number): string {
  const uppercaseAlphabetLetters = caesarWheelLetters(publicState.alphabetLetters).map((alphabetLetter) =>
    alphabetLetter.toLocaleUpperCase('es'),
  )
  return Array.from(publicState.cipheredText)
    .map((cipheredCharacter) => {
      const uppercaseCharacter = cipheredCharacter.toLocaleUpperCase('es')
      const cipheredLetterIndex = uppercaseAlphabetLetters.indexOf(uppercaseCharacter)
      if (cipheredLetterIndex < 0) {
        return cipheredCharacter
      }
      const readLetter = readLetterReadThroughWheel(publicState, cipheredLetterIndex, shiftPositions)
      return cipheredCharacter === uppercaseCharacter ? readLetter.toLocaleUpperCase('es') : readLetter.toLocaleLowerCase('es')
    })
    .join('')
}

export function describeSubmittedValue(
  publicState: InteractivePiecePublicState,
  submittedValue: InteractivePieceSubmittedValue,
): string {
  if (submittedValue.widgetKindName === 'cipher_wheel' && publicState.widgetKindName === 'cipher_wheel') {
    const shiftPositions = wrapPositionWithinCount(submittedValue.shiftPositions, publicState.alphabetLetters.length)
    return interactivePiecesCopy.cipherWheel.submittedValueDescription(
      shiftPositions,
      publicState.alphabetLetters[0] ?? '',
      readLetterReadThroughWheel(publicState, 0, shiftPositions),
    )
  }
  if (submittedValue.widgetKindName === 'ordered_positions' && publicState.widgetKindName === 'ordered_positions') {
    return interactivePiecesCopy.orderedPositions.submittedValueDescription(
      submittedValue.orderedPieceIdentifiers.map(
        (pieceIdentifier) =>
          publicState.pieces.find((piece) => piece.pieceIdentifier === pieceIdentifier)?.visibleName ?? '',
      ),
    )
  }
  if (submittedValue.widgetKindName === 'combination_dials') {
    return interactivePiecesCopy.combinationDials.submittedValueDescription(submittedValue.chosenSymbols)
  }
  return ''
}

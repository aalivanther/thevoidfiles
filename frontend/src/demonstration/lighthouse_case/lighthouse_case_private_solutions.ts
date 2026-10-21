import type {
  AssistanceLevelName,
  InteractivePieceSubmittedValue,
} from '../../game_state/archive_turn_contract'
import {
  keeperCipherWheelRuleTexts,
  serviceDoorLockRuleTexts,
  shutterPlateFrameRuleTexts,
  shutterPlatePieceIdentifiers,
} from './lighthouse_case_interactive_pieces'
import { lighthouseCaseInteractivePieceIdentifiers } from './lighthouse_case_persons'

const serviceDoorLockCombination = ['3', '1', '2']
const keeperCipherWheelShiftPositions = 9
const keeperCipherWheelLetterCount = 26

export function findViolatedVisibleRuleTexts(
  interactivePieceIdentifier: string,
  submittedValue: InteractivePieceSubmittedValue,
): string[] {
  if (
    interactivePieceIdentifier === lighthouseCaseInteractivePieceIdentifiers.serviceDoorLock &&
    submittedValue.widgetKindName === 'combination_dials'
  ) {
    const isCombinationExact = serviceDoorLockCombination.every(
      (expectedSymbol, dialIndex) => submittedValue.chosenSymbols[dialIndex] === expectedSymbol,
    )
    return isCombinationExact ? [] : [serviceDoorLockRuleTexts.releasesOnlyWithExactCombination]
  }
  if (
    interactivePieceIdentifier === lighthouseCaseInteractivePieceIdentifiers.keeperCipherWheel &&
    submittedValue.widgetKindName === 'cipher_wheel'
  ) {
    const normalizedShiftPositions =
      ((submittedValue.shiftPositions % keeperCipherWheelLetterCount) + keeperCipherWheelLetterCount) % keeperCipherWheelLetterCount
    return normalizedShiftPositions === keeperCipherWheelShiftPositions ? [] : [keeperCipherWheelRuleTexts.readableTextRequired]
  }
  if (
    interactivePieceIdentifier === lighthouseCaseInteractivePieceIdentifiers.shutterPlateFrame &&
    submittedValue.widgetKindName === 'ordered_positions'
  ) {
    const positionOf = (pieceIdentifier: string) => submittedValue.orderedPieceIdentifiers.indexOf(pieceIdentifier)
    const starPosition = positionOf(shutterPlatePieceIdentifiers.star)
    const crescentPosition = positionOf(shutterPlatePieceIdentifiers.crescent)
    const eyePosition = positionOf(shutterPlatePieceIdentifiers.eye)
    const circlePosition = positionOf(shutterPlatePieceIdentifiers.circle)
    const crossPosition = positionOf(shutterPlatePieceIdentifiers.cross)
    const violatedRuleTexts: string[] = []
    if (starPosition !== 2) {
      violatedRuleTexts.push(shutterPlateFrameRuleTexts.starInTheMiddle)
    }
    if (crescentPosition < 0 || eyePosition !== crescentPosition + 1) {
      violatedRuleTexts.push(shutterPlateFrameRuleTexts.crescentRightBeforeEye)
    }
    if (circlePosition < 0 || Math.abs(circlePosition - starPosition) === 1) {
      violatedRuleTexts.push(shutterPlateFrameRuleTexts.circleAwayFromStar)
    }
    if (crossPosition < 0 || crossPosition < eyePosition) {
      violatedRuleTexts.push(shutterPlateFrameRuleTexts.crossAfterEye)
    }
    return violatedRuleTexts
  }
  return ['La pieza no admite ese intento.']
}

export const proseSolutionPatternSourcesByPieceIdentifier: Record<string, string[]> = {
  [lighthouseCaseInteractivePieceIdentifiers.serviceDoorLock]: ['3\\D{0,3}1\\D{0,3}2', 'tres\\W+(y\\W+)?(uno|doce)', 'tres,? uno,? dos'],
  [lighthouseCaseInteractivePieceIdentifiers.keeperCipherWheel]: ['\\b(9|nueve)\\b'],
  [lighthouseCaseInteractivePieceIdentifiers.shutterPlateFrame]: ['luna\\W+(y\\W+)?((el|la)\\W+)?ojo\\W+(y\\W+)?((el|la)\\W+)?estrella\\W+(y\\W+)?((el|la)\\W+)?cruz\\W+(y\\W+)?((el|la)\\W+)?circulo'],
}

export const failedAttemptNarrationByPieceIdentifier: Record<string, string[]> = {
  [lighthouseCaseInteractivePieceIdentifiers.serviceDoorLock]: [
    '{{nombre}} alinea las tres cifras y tira del arco. El pestillo no se mueve ni medio milímetro. Es un candado honesto: o es, o no es.',
    'Otra combinación, otro tirón. Nada. El latón está frío y perfectamente indiferente.',
    'El arco sigue en su sitio. Arriba, el haz da otra vuelta completa mientras {{nombre}} prueba.',
  ],
  [lighthouseCaseInteractivePieceIdentifiers.keeperCipherWheel]: [
    '{{nombre}} fija la corona y lee el primer bloque por la de fuera. Sale un trabalenguas de consonantes. No es eso.',
    'Con ese giro, las mayúsculas se convierten en otras mayúsculas igual de mudas. El farero no escribió esto.',
    'Otra posición, otra línea ilegible. La inscripción del canto sigue ahí, paciente: se cuenta desde la luz.',
  ],
  [lighthouseCaseInteractivePieceIdentifiers.shutterPlateFrame]: [
    '{{nombre}} encaja las cinco placas. Cuatro entran; la quinta topa contra un resalte y no baja. Ese no es el orden. Hay que sacarlas todas para volver a empezar, y la óptica no deja de girar.',
    'Las placas entran a medias y se quedan bailando en las ranuras, sin trabarse. El haz se cuela por las holguras, intacto.',
    'Otra vez el resalte. El fabricante grabó las reglas en el marco por algo.',
  ],
}

export const assistanceTextsByPieceIdentifier: Record<string, Record<AssistanceLevelName, string>> = {
  [lighthouseCaseInteractivePieceIdentifiers.serviceDoorLock]: {
    gentle: 'Quien puso este candado quería que lo abriera alguien que hubiera leído algo aquí mismo, al pie del faro.',
    medium: 'Hay una hora que el registro de guardia repite en todas las entradas nuevas. Una hora tiene cifras.',
    direct: 'Las tres y doce. Tres cifras, en el orden en que se leen.',
  },
  [lighthouseCaseInteractivePieceIdentifiers.keeperCipherWheel]: {
    gentle: 'La inscripción del disco habla de contar, y de la luz. En este faro hay algo que se puede contar cada madrugada.',
    medium: 'La clave de un farero está a la vista de todos, todas las noches. El faro da siempre el mismo número de destellos antes de la pausa.',
    direct: 'Nueve destellos: la corona se gira nueve letras.',
  },
  [lighthouseCaseInteractivePieceIdentifiers.shutterPlateFrame]: {
    gentle: 'Una de las reglas fija una placa sin discusión. Conviene empezar por ella y ver qué huecos deja.',
    medium: 'Con la estrella en el centro, la media luna y el ojo solo caben juntos a un lado. La cruz decide a cuál.',
    direct: 'Media luna, ojo, estrella, cruz y círculo, de la primera ranura a la quinta.',
  },
}

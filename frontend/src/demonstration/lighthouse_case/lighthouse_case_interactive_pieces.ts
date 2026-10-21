import type { InteractivePiecePublicDefinition } from '../../game_state/archive_turn_contract'
import { lighthouseCaseInteractivePieceIdentifiers } from './lighthouse_case_persons'

export const serviceDoorLockRuleTexts = {
  releasesOnlyWithExactCombination: 'El pestillo solo salta con las tres cifras exactas, leídas de izquierda a derecha.',
}

export const keeperCipherWheelRuleTexts = {
  readableTextRequired: 'Con el giro correcto, todas las líneas se leen en castellano llano.',
  singleShiftForWholeText: 'Un solo giro de la corona vale para el texto entero.',
}

export const shutterPlateFrameRuleTexts = {
  starInTheMiddle: 'La estrella ocupa la ranura del centro.',
  crescentRightBeforeEye: 'La media luna va justo antes del ojo.',
  circleAwayFromStar: 'El círculo no toca a la estrella.',
  crossAfterEye: 'La cruz queda después del ojo.',
}

export const shutterPlatePieceIdentifiers = {
  crescent: 'shutter_plate_a',
  circle: 'shutter_plate_b',
  star: 'shutter_plate_c',
  cross: 'shutter_plate_d',
  eye: 'shutter_plate_e',
}

const decimalDialSymbols = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

export const lighthouseCaseInteractivePieces: Record<string, InteractivePiecePublicDefinition> = {
  [lighthouseCaseInteractivePieceIdentifiers.serviceDoorLock]: {
    interactivePieceIdentifier: lighthouseCaseInteractivePieceIdentifiers.serviceDoorLock,
    familyName: 'spatial_mechanical',
    visibleTitle: 'Candado de tres diales',
    diegeticPurposeText: 'Cierra la puerta de servicio del faro. Es nuevo, de latón, y alguien lo mantiene engrasado.',
    visibleRuleTexts: [serviceDoorLockRuleTexts.releasesOnlyWithExactCombination],
    publicState: {
      widgetKindName: 'combination_dials',
      dials: [
        { dialIdentifier: 'lock_dial_left', visibleLabel: 'Dial izquierdo', symbols: decimalDialSymbols },
        { dialIdentifier: 'lock_dial_middle', visibleLabel: 'Dial central', symbols: decimalDialSymbols },
        { dialIdentifier: 'lock_dial_right', visibleLabel: 'Dial derecho', symbols: decimalDialSymbols },
      ],
    },
    attemptElapsedMinutes: 2,
    isFreeTextAnswerAllowed: true,
  },
  [lighthouseCaseInteractivePieceIdentifiers.keeperCipherWheel]: {
    interactivePieceIdentifier: lighthouseCaseInteractivePieceIdentifiers.keeperCipherWheel,
    familyName: 'fictional_cryptography',
    visibleTitle: 'Disco de cifrado del farero',
    diegeticPurposeText: 'Dos coronas de alfabeto en latón. Sirve para leer las últimas páginas del cuaderno, escritas en bloques de mayúsculas.',
    visibleRuleTexts: [keeperCipherWheelRuleTexts.singleShiftForWholeText, keeperCipherWheelRuleTexts.readableTextRequired],
    publicState: {
      widgetKindName: 'cipher_wheel',
      alphabetLetters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
      cipheredText: 'NAJW MRNI. JYDWCN WDNEN. UJ MNLRVJ NAJ NUERAJ BJWSDASX H WX MNKRJ BDKRA.',
      wheelInscriptionText: 'Se cuenta desde la luz',
    },
    attemptElapsedMinutes: 6,
    isFreeTextAnswerAllowed: true,
  },
  [lighthouseCaseInteractivePieceIdentifiers.shutterPlateFrame]: {
    interactivePieceIdentifier: lighthouseCaseInteractivePieceIdentifiers.shutterPlateFrame,
    familyName: 'logic',
    visibleTitle: 'Bastidor de obturadores',
    diegeticPurposeText: 'Cinco placas de latón en cinco ranuras. En su orden, el haz no sale de la torre.',
    visibleRuleTexts: [
      shutterPlateFrameRuleTexts.starInTheMiddle,
      shutterPlateFrameRuleTexts.crescentRightBeforeEye,
      shutterPlateFrameRuleTexts.circleAwayFromStar,
      shutterPlateFrameRuleTexts.crossAfterEye,
    ],
    publicState: {
      widgetKindName: 'ordered_positions',
      pieces: [
        { pieceIdentifier: shutterPlatePieceIdentifiers.cross, visibleName: 'Placa de la cruz', symbolName: 'cross' },
        { pieceIdentifier: shutterPlatePieceIdentifiers.star, visibleName: 'Placa de la estrella', symbolName: 'star' },
        { pieceIdentifier: shutterPlatePieceIdentifiers.circle, visibleName: 'Placa del círculo', symbolName: 'circle' },
        { pieceIdentifier: shutterPlatePieceIdentifiers.eye, visibleName: 'Placa del ojo', symbolName: 'eye' },
        { pieceIdentifier: shutterPlatePieceIdentifiers.crescent, visibleName: 'Placa de la media luna', symbolName: 'crescent' },
      ],
      initialOrderPieceIdentifiers: [
        shutterPlatePieceIdentifiers.cross,
        shutterPlatePieceIdentifiers.star,
        shutterPlatePieceIdentifiers.circle,
        shutterPlatePieceIdentifiers.eye,
        shutterPlatePieceIdentifiers.crescent,
      ],
      positionLabels: ['Primera ranura', 'Segunda ranura', 'Ranura del centro', 'Cuarta ranura', 'Quinta ranura'],
    },
    attemptElapsedMinutes: 5,
    isFreeTextAnswerAllowed: true,
  },
}

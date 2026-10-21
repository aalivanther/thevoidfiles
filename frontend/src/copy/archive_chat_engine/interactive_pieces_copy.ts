function describeMinuteCount(minuteCount: number): string {
  return minuteCount === 1 ? '1 minuto' : `${minuteCount} minutos`
}

function joinVisibleNames(visibleNames: string[]): string {
  return visibleNames.join(' · ')
}

export const interactivePiecesCopy = {
  pieceRulesHeading: 'Reglas a la vista',
  resolveAnotherWayButton: 'Resolver de otro modo',
  resolveAnotherWayExplanation: 'Lleva a la mesa de respuesta para describir otro método con palabras propias.',
  setAsideButton: 'Dejar para después',
  resumePieceButton: 'Retomar la pieza',
  setAsideNotice: 'La pieza quedó apartada. Los intentos anteriores siguen anotados.',
  lifecycleStatusLabels: {
    presented: 'Sin tocar',
    in_progress: 'En curso',
    resolved: 'Resuelta',
    set_aside: 'Apartada',
    broken: 'Rota',
  },
  familyLabels: {
    logic: 'Mecanismo de lógica',
    fictional_cryptography: 'Escritura cifrada',
    spatial_mechanical: 'Mecanismo',
    temporal: 'Mecanismo de tiempo',
    investigative: 'Pieza de investigación',
    social: 'Trato entre personas',
    ritual: 'Pieza ritual',
  },
  widgetLoadingNotice: 'La pieza se despliega sobre la mesa…',
  widgetLoadingFailedNotice: 'La pieza no llegó a desplegarse.',
  widgetLoadingRetryButton: 'Volver a desplegar',
  freeManipulationNotice: 'Mirar, girar y ordenar no cuesta nada. Solo «Probar» cuenta como intento.',
  attemptButton: 'Probar',
  attemptCostTag: (elapsedMinutes: number) => `${describeMinuteCount(elapsedMinutes)} de reloj`,
  attemptFreeTag: 'Sin coste',
  attemptCostConfirmationQuestion: (elapsedMinutes: number) =>
    `Probar consume ${describeMinuteCount(elapsedMinutes)} del reloj del caso. ¿Se prueba así?`,
  attemptCostConfirmButton: 'Probar y gastar el tiempo',
  attemptCostCancelButton: 'Seguir pensando',
  attemptPendingNotice: 'El Director examina el intento…',
  attemptBlockedByDirectorQuestionNotice:
    'El Director espera una respuesta. La pieza se puede mirar y mover, pero no probar hasta contestarle.',
  attemptAlreadyTriedNotice: 'Esta misma disposición ya se probó antes y no cedió.',
  attemptAcceptedAnnouncement: 'El mecanismo cede.',
  attemptRejectedAnnouncement: 'El mecanismo no cede.',
  resolvedStampText: 'Resuelta',
  brokenStampText: 'Rota',
  resolvedNotice: 'La pieza quedó resuelta. Se conserva tal como se dejó.',
  brokenNoticeFallback: 'La pieza quedó inservible.',
  readOnlyNotice: 'Registro en solo lectura.',
  openFullSheetButton: 'Abrir en hoja completa',
  closeFullSheetButton: 'Volver al registro',
  examinePieceButton: 'Examinar la pieza',
  unfoldPieceButton: 'Desplegar la pieza',
  collapsePieceButton: 'Plegar la pieza',
  attemptTallyLabel: (attemptCount: number) =>
    attemptCount === 0 ? 'Sin intentos' : attemptCount === 1 ? '1 intento anotado' : `${attemptCount} intentos anotados`,
  fullSheetInlineNotice: 'La pieza está abierta en hoja completa.',
  attemptHistoryHeading: 'Intentos anotados',
  attemptHistoryEmptyNotice: 'Todavía no se probó nada.',
  attemptOrdinalLabel: (attemptNumber: number) => `Intento ${attemptNumber}`,
  attemptAcceptedLabel: 'Cedió',
  attemptRejectedLabel: 'No cedió',
  attemptViolatedRulesHeading: 'Reglas a la vista que no se cumplían',
  attemptNoVisibleRuleViolatedNotice: 'Ninguna regla a la vista quedó incumplida; aun así, no cedió.',
  assistanceDisclosureButton: 'Pedir ayuda',
  assistanceDisclosureHideButton: 'Ocultar la ayuda',
  assistanceExplanation: 'La ayuda llega solo cuando se pide. Cada nivel dice un poco más que el anterior.',
  assistanceLevelLabels: {
    gentle: 'Ayuda suave',
    medium: 'Ayuda media',
    direct: 'Ayuda directa',
  },
  assistanceLevelDescriptions: {
    gentle: 'Señala hacia dónde mirar.',
    medium: 'Explica cómo encajan las reglas.',
    direct: 'Revela cómo se resuelve este mecanismo.',
  },
  assistanceAlreadyGivenLabel: 'Ya entregada',
  assistanceGivenHeading: 'Ayudas recibidas',
  assistancePendingNotice: 'El Director busca cómo decirlo…',
  assistanceDirectScopeQuestion: 'La ayuda directa revela este mecanismo y nada más. ¿Se pide?',
  assistanceDirectConfirmButton: 'Revelar este mecanismo',
  assistanceDirectCancelButton: 'Todavía no',
  cipherWheel: {
    wheelLabel: 'Rueda de cifrado',
    outerRingCaption: 'Anillo fijo: letras del texto cifrado',
    innerRingCaption: 'Anillo móvil: lectura',
    turnBackwardButton: 'Girar una posición hacia atrás',
    turnForwardButton: 'Girar una posición hacia adelante',
    inscriptionHeading: 'Inscripción de la rueda',
    cipheredTextHeading: 'Texto cifrado',
    decipheredPreviewHeading: 'Lectura con la rueda así',
    keyboardInstructions: 'Flechas: una posición. Mayúsculas y flecha: cinco posiciones. Inicio: posición de partida.',
    shiftValueText: (shiftPositions: number, referenceLetter: string, resultingLetter: string) =>
      shiftPositions === 0
        ? 'Rueda en su posición de partida'
        : `Rueda girada ${shiftPositions} ${shiftPositions === 1 ? 'posición' : 'posiciones'}: ${referenceLetter} se lee ${resultingLetter}`,
    submittedValueDescription: (shiftPositions: number, referenceLetter: string, resultingLetter: string) =>
      shiftPositions === 0
        ? 'Rueda sin girar'
        : `Rueda girada ${shiftPositions} ${shiftPositions === 1 ? 'posición' : 'posiciones'} (${referenceLetter} se lee ${resultingLetter})`,
  },
  orderedPositions: {
    listLabel: 'Placas en el bastidor, de la primera posición a la última',
    dragHandleLabel: (pieceVisibleName: string) => `Arrastrar ${pieceVisibleName}`,
    moveEarlierButton: (pieceVisibleName: string) => `Subir ${pieceVisibleName} una posición`,
    moveLaterButton: (pieceVisibleName: string) => `Bajar ${pieceVisibleName} una posición`,
    restoreInitialOrderButton: 'Volver al orden de partida',
    keyboardInstructions:
      'Con el teclado: espacio toma la placa, las flechas la mueven, espacio la suelta y Escape la devuelve. También sirven los botones de subir y bajar.',
    fallbackPositionLabel: (positionNumber: number) => `Posición ${positionNumber}`,
    pieceMovedAnnouncement: (pieceVisibleName: string, positionLabel: string) =>
      `${pieceVisibleName} pasa a ${positionLabel}.`,
    dragStartedAnnouncement: (pieceVisibleName: string) => `${pieceVisibleName} en la mano.`,
    dragOverAnnouncement: (pieceVisibleName: string, positionLabel: string) =>
      `${pieceVisibleName} sobre ${positionLabel}.`,
    dragEndedAnnouncement: (pieceVisibleName: string, positionLabel: string) =>
      `${pieceVisibleName} queda en ${positionLabel}.`,
    dragCancelledAnnouncement: (pieceVisibleName: string) => `${pieceVisibleName} vuelve a su sitio.`,
    submittedValueDescription: (orderedPieceVisibleNames: string[]) => joinVisibleNames(orderedPieceVisibleNames),
  },
  combinationDials: {
    groupLabel: 'Diales del candado',
    turnDialUpButton: (dialVisibleLabel: string) => `${dialVisibleLabel}: símbolo anterior`,
    turnDialDownButton: (dialVisibleLabel: string) => `${dialVisibleLabel}: símbolo siguiente`,
    keyboardInstructions: 'Flechas arriba y abajo giran el dial. También se puede teclear el símbolo directamente.',
    dialValueText: (dialVisibleLabel: string, chosenSymbol: string) => `${dialVisibleLabel}: ${chosenSymbol}`,
    submittedValueDescription: (chosenSymbols: string[]) => chosenSymbols.join(' – '),
  },
}

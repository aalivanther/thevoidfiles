export const readingLogCopy = {
  archiveLabel: 'Archivo',
  archivePresentationLabel: (archiveNumberLabel: string) => `Archivo ${archiveNumberLabel}`,
  readingLogRegionLabel: 'Registro del Archivo',
  readOnlyReadingLogRegionLabel: 'Registro del último Archivo, solo lectura',
  completedTextAnnouncementsLabel: 'Lo último que quedó escrito en el registro',
  replyDeskRegionLabel: 'Mesa de respuesta',
  scrollRegionFallbackLabel: 'Zona desplazable',
  labelledAnnouncement: (captionText: string, announcedText: string) => `${captionText}: ${announcedText}`,
  scrollAffordance: {
    moreContentAboveCue: 'Hay más arriba',
    moreContentBelowCue: 'Hay más abajo',
    moreContentAboveButtonLabel: (regionLabel: string) => `Subir una página en ${regionLabel}`,
    moreContentBelowButtonLabel: (regionLabel: string) => `Bajar una página en ${regionLabel}`,
  },
  returnToPresent: {
    buttonText: 'Volver al presente',
    newEntriesBelow: (newEntryCount: number) =>
      newEntryCount === 1 ? 'Hay una entrada nueva' : `Hay ${newEntryCount} entradas nuevas`,
    nothingNewBelow: 'La escena sigue más abajo',
  },
  turnMomentLabel: (worldClockText: string) => `Anotado a las ${worldClockText}`,
  turnGroupLabel: (worldClockText: string) => `Lo anotado a las ${worldClockText}`,
  directorCaptionLabel: 'El Director',
  directorNarratesAnnouncement: (narrationText: string) => `El Director narra: ${narrationText}`,
  noticeCaptionLabel: 'Aviso',
  noticeKindLabels: {
    demonstration_limit: 'Límite de la demostración',
    rule_reminder: 'Recordatorio del reglamento',
    service_failure: 'Sin respuesta',
  },
  demonstrationFallbackNotices: {
    access_key_missing:
      'Este Archivo lo conduce el Director de demostración: el servicio local no tiene guardada la clave de la narración. Se guarda en «Conexión con las inteligencias».',
    provider_rejected:
      'Este Archivo lo conduce el Director de demostración: el proveedor de la narración rechazó la clave o el pedido del servicio local.',
    provider_unavailable:
      'Este Archivo lo conduce el Director de demostración: el proveedor de la narración no respondió a tiempo o está saturado.',
    whisper_material_missing:
      'Este Archivo lo conduce el Director de demostración: el servicio local no tiene material para este Susurro.',
    case_rejected_by_reviewer:
      'El Director escribió el caso, pero el revisor lo rechazó: una pieza o un identificador no cumplía las reglas visibles. Conviene esperar un momento y abrir de nuevo.',
    whisper_absent_from_service_offer:
      'Este Archivo lo conduce el Director de demostración: la oferta de Susurros que guarda el servicio local no incluye este Susurro, así que el servidor no abrió ningún caso ni intervino ninguna inteligencia. Con el material curado activo, basta reiniciar el servicio local para que la oferta se renueve.',
    service_unavailable:
      'Este Archivo lo conduce el Director de demostración: el servicio local no pudo abrirlo.',
  },
  directorQuestionCaptionLabel: 'El Director pregunta',
  directorQuestionKindLabels: {
    method_clarification: 'Falta precisar el método',
    plan_continuation: 'Sobre el resto del plan',
    illogical_action_veto: 'El Director objeta',
  },
  directorQuestionChosenAnswerLabel: 'Respuesta elegida',
  directorQuestionAnswerNumberLabel: (answerNumber: number, answerText: string) => `Respuesta ${answerNumber}: ${answerText}`,
  directorQuestionRulesTheTurn: {
    awaitedAnswerAnnouncement: (questionText: string, answerCount: number) =>
      answerCount > 1
        ? `El Director pregunta y espera una respuesta: ${questionText} Se responde con las teclas 1 a ${answerCount}.`
        : `El Director pregunta y espera una respuesta: ${questionText} Se responde con la tecla 1.`,
    answerKeysHint: (answerCount: number) =>
      answerCount > 1 ? `Se responde con las teclas 1 a ${answerCount}` : 'Se responde con la tecla 1',
    waitingCoursesOfActionLine: (waitingCourseCount: number) =>
      waitingCourseCount === 1
        ? 'Un curso de acción aguarda sobre la mesa hasta que el Director tenga su respuesta.'
        : `${waitingCourseCount} cursos de acción aguardan sobre la mesa hasta que el Director tenga su respuesta.`,
    replyDeskUnavailableLine: 'El Director espera una respuesta. La mesa se reabre al contestar.',
    replyDeskUnavailableGroupLabel: 'Mesa de respuesta, no disponible hasta responder al Director',
    goToQuestionButton: 'Ir a la pregunta',
  },
  consequenceReceiptCaptionLabel: 'Queda anotado',
  innerThoughtCaptionLabels: {
    own_reasoning: 'Para sí',
    legitimate_memory: 'Recuerdo',
    intrusive_perception: 'No es suyo',
  },
  characterDeliveryLabels: {
    spoken: 'dice',
    whispered: 'susurra',
    shouted: 'grita',
    heard_from_afar: 'se oye a lo lejos',
  },
  characterSpeaksLabel: (speakerVisibleName: string) => `${speakerVisibleName} dice:`,
  characterSpeaksWithDeliveryLabel: (speakerVisibleName: string, deliveryText: string) =>
    `${speakerVisibleName} ${deliveryText}:`,
  openSpeakerDetailLabel: (speakerVisibleName: string) => `Ver lo que se sabe de ${speakerVisibleName}`,
  investigatorDeclaresLabel: (investigatorShortName: string) => `${investigatorShortName} declara`,
  investigatorDeclaresAnnouncement: (investigatorShortName: string, declaredText: string) =>
    `${investigatorShortName} declara: ${declaredText}`,
  pendingDeclarationCaptionLabel: 'Enviado al Director',
  pendingDeclarationUnansweredCaptionLabel: 'Sin respuesta del Director',
  planStepLabel: (stepNumber: number, declaredPlanStepCount: number) => `Paso ${stepNumber} de ${declaredPlanStepCount}`,
  planStepShortLabel: (stepNumber: number) => `${stepNumber}.`,
  declaredPlanDetailLabel: (declaredPlanStepCount: number) => `plan de ${declaredPlanStepCount} pasos`,
  compositionOriginForStepsLabel: (compositionOriginLabel: string, stepNumbers: number[]) =>
    stepNumbers.length === 1
      ? `${compositionOriginLabel} (paso ${stepNumbers[0]})`
      : `${compositionOriginLabel} (pasos ${stepNumbers.join(', ')})`,
  compositionOriginSeparator: ' · ',
  planStepConditionLabel: (conditionText: string) => `Condición: ${conditionText}`,
  compositionOriginLabels: {
    suggested_action: 'sugerencia del Director',
    edited_suggestion: 'a partir de una sugerencia',
    own_words: null,
    interactive_piece_attempt: 'intento sobre la pieza',
    director_question_answer: 'respuesta al Director',
  },
  editedSuggestionLabel: 'a partir de una sugerencia',
  completeTextButton: 'Completar texto',
  closeArchiveButton: 'Cerrar el Archivo',
  retrySameActionButton: 'Reintentar la misma acción',
  serviceFailureNotice: 'El Director no respondió. Nada cambió ni se descontó.',
  longWaitRetryNotice: 'La respuesta tarda más de lo habitual. Reintentar no repite ningún coste.',
  confirmedEffectLines: {
    worldClockAdvanced: (resultingClockText: string) => `Hora: ${resultingClockText}`,
    placeChanged: (resultingPlaceName: string) => `Lugar: ${resultingPlaceName}`,
    operationalFundsSpent: (previousAmountText: string, resultingAmountText: string) =>
      `Fondos operativos: ${previousAmountText} → ${resultingAmountText}`,
    belongingUnitsConsumed: (belongingVisibleName: string, previousUnits: number, resultingUnits: number) =>
      `${belongingVisibleName}: ${previousUnits} → ${resultingUnits}`,
    belongingUnitsGained: (belongingVisibleName: string, previousUnits: number, resultingUnits: number) =>
      `${belongingVisibleName}: ${previousUnits} → ${resultingUnits}`,
    personalFundsSpent: (amountText: string) => `Fondos personales: −${amountText}`,
    seriousWoundSuffered: (perceptibleCauseText: string, resultingSeriousWoundCount: number) =>
      `Herida Grave: ${perceptibleCauseText} (${resultingSeriousWoundCount} de 5)`,
    conditionGained: (visibleName: string) => `Condición: ${visibleName}`,
    conditionEnded: (visibleName: string) => `Termina la condición: ${visibleName}`,
    personBecameKnown: (visibleName: string) => `Persona conocida: ${visibleName}`,
    journalUpdated: 'Diario actualizado',
    knowledgeGained: (visibleName: string) => `Hecho: ${visibleName}`,
    effortSpent: (resultingEffort: number) => `Esfuerzo que queda: ${resultingEffort}`,
    perceptionWasAltered: (clarificationText: string) => `Percepción alterada: ${clarificationText}`,
    criticalFailureRecorded: (perceptibleCauseText: string) => `Fallo crítico: ${perceptibleCauseText}`,
  },
}

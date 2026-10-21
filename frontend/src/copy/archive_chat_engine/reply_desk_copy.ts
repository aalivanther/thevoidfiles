export type IntentionFacetName = 'objective' | 'method' | 'resource' | 'recipient' | 'precaution'

const ordinalPlaceNames = [
  'primer',
  'segundo',
  'tercer',
  'cuarto',
  'quinto',
  'sexto',
  'séptimo',
  'octavo',
  'noveno',
  'décimo',
  'undécimo',
  'duodécimo',
]

function describeDestinationPlaceInPlan(stepNumber: number): string {
  const ordinalPlaceName = ordinalPlaceNames[stepNumber - 1]
  return ordinalPlaceName ? `al ${ordinalPlaceName} lugar` : `al lugar ${stepNumber}`
}

function describeRestingPlaceInPlan(stepNumber: number): string {
  const ordinalPlaceName = ordinalPlaceNames[stepNumber - 1]
  return ordinalPlaceName ? `en el ${ordinalPlaceName} lugar` : `en el lugar ${stepNumber}`
}

export const replyDeskCopy = {
  suggestedActionsTitle: 'Cursos de acción',
  suggestedActionsHint:
    'Tocar una sugerencia, o pulsar su número, la suma al plan. En el campo se describe qué hace el Investigador, cómo y con qué; también vale citar sugerencias: «4-5-2 y solo si sobra tiempo 1». Nada se envía hasta pulsar Enviar.',
  addSuggestionToPlanLabel: (suggestionNumber: number) => `Sumar la sugerencia ${suggestionNumber} al plan`,
  removeSuggestionFromPlanLabel: (suggestionNumber: number) => `Quitar la sugerencia ${suggestionNumber} del plan`,
  suggestionPlacedInPlanBadge: (stepNumber: number) => `En el plan · paso ${stepNumber}`,
  insufficientResource: 'No alcanza',
  insufficientResourceExplanation: 'El recurso que pide esta sugerencia no alcanza.',
  otherCoursesDrawerLabel: (hiddenCourseCount: number) => `Otros cursos (${hiddenCourseCount})`,
  otherCoursesDrawerKeyHint: 'Tecla 0',
  otherCoursesDrawerRegionLabel: 'Otros cursos de acción',
  exitsRowTitle: 'Salidas',
  suggestedActionGroupTitles: {
    speak: 'Hablar',
    examine: 'Examinar',
    use_or_spend: 'Usar o gastar',
    move: 'Moverse',
    withdraw: 'Retirarse',
  },
  attemptedBeforeMark: 'De nuevo',
  attemptedBeforeSpokenNote: 'ya se intentó antes',
  consumedCoursesTitle: 'Ya no está disponible',
  consumedCourseMark: 'Hecho',

  replyDeskLabel: 'Mesa de respuesta',
  draftFieldLabel: 'Acción del Investigador',
  draftFieldPlaceholder: 'Escribir la acción…',
  draftFieldPlaceholderWithPlan: 'Sumar otro paso…',
  remainingCharactersNotice: (remainingCharacterCount: number) =>
    remainingCharacterCount === 1 ? 'Queda 1 carácter.' : `Quedan ${remainingCharacterCount} caracteres.`,

  planStripTitle: 'Plan declarado',
  planStepCountLabel: (stepCount: number) => (stepCount === 1 ? '1 paso' : `${stepCount} pasos`),
  planStepFromSuggestionLabel: (suggestionNumber: number) => `Sugerencia ${suggestionNumber}`,
  planStepFromEditedSuggestionLabel: (suggestionNumber: number) => `Sugerencia ${suggestionNumber}, editada`,
  planStepFromEarlierSuggestionLabel: 'Sugerencia anterior',
  planStepOwnWordsLabel: 'Palabras propias',
  planStepConditionPrefix: 'Condición:',
  openPlanStepEditorLabel: (stepNumber: number) => `Editar el paso ${stepNumber}`,
  closePlanStepEditorButton: 'Listo',
  planStepTextFieldLabel: 'Qué hace el Investigador en este paso',
  planStepConditionFieldLabel: 'Condición (opcional)',
  planStepConditionPlaceholder: 'Por ejemplo: solo si sobra tiempo',
  planStepConditionPresetsLabel: 'Condiciones frecuentes',
  planStepConditionPresets: [
    'solo si sobra tiempo',
    'solo si nadie observa',
    'si el paso anterior sale bien',
    'si el paso anterior no alcanza',
  ],
  movePlanStepEarlierLabel: (stepNumber: number) => `Subir el paso ${stepNumber}`,
  movePlanStepLaterLabel: (stepNumber: number) => `Bajar el paso ${stepNumber}`,
  movePlanStepEarlierButton: 'Subir',
  movePlanStepLaterButton: 'Bajar',
  removePlanStepLabel: (stepNumber: number) => `Quitar el paso ${stepNumber}`,
  dragPlanStepLabel: (stepNumber: number) => `Reordenar el paso ${stepNumber}`,
  executedPlanStepLabel: 'Ya ejecutado',
  pendingPlanStepLabel: 'Pendiente',
  directorBatchNotice: (maximumStepCount: number) =>
    `El Director resuelve hasta ${maximumStepCount} pasos por tanda, narra y pregunta si el plan continúa.`,

  pendingPlanTitle: 'Plan en curso',
  pendingPlanExecutedCount: (executedStepCount: number, declaredStepCount: number) =>
    `${executedStepCount} de ${declaredStepCount} pasos ya ejecutados`,
  modifyPendingPlanButton: 'Modificar el plan',

  planLineTitle: 'Plan',
  planLineCostMark: 'Con coste',
  planLineHiddenStepCount: (hiddenStepCount: number) => `+${hiddenStepCount}`,
  openPlanDetailLabel: (stepCount: number) =>
    stepCount === 1 ? 'Abrir el plan declarado: 1 paso' : `Abrir el plan declarado: ${stepCount} pasos`,
  goToPlanInRailLabel: (stepCount: number) =>
    stepCount === 1 ? 'Ir al plan declarado: 1 paso' : `Ir al plan declarado: ${stepCount} pasos`,
  planDetailDescription: 'Aquí se ordenan, se editan o se quitan los pasos. Nada se descuenta hasta confirmar el vale.',
  planDetailStepsSectionTitle: 'Pasos del plan',
  planDetailEstimatedCostSectionTitle: 'Coste estimado',
  planDetailEstimatedCostNotice: 'Es una estimación. Nada se descuenta hasta confirmar el vale al enviar.',
  planDetailNoCostNotice: 'Este plan no consume recursos.',
  closePlanDetailLabel: 'Cerrar el plan',
  planRailPanelLabel: 'Plan del Investigador',
  resourceCostTotalDescription: (resourceName: string, spentAmountText: string, remainingAmountText: string) =>
    `${resourceName}: sale ${spentAmountText}, quedaría ${remainingAmountText}`,
  resourceCostTotalInsufficientDescription: (resourceName: string, spentAmountText: string) =>
    `${resourceName}: sale ${spentAmountText}, no alcanza`,
  estimatedCostAnnouncement: (resourceCostTotalDescriptions: string[]) =>
    `Coste estimado del plan. ${resourceCostTotalDescriptions.join('. ')}. Nada se descuenta todavía.`,
  costAwaitingConfirmationAnnouncement: (resourceCostTotalDescriptions: string[]) =>
    `Vale de recursos a la espera. ${resourceCostTotalDescriptions.join('. ')}. Nada se descuenta hasta confirmar.`,

  pendingPlanRemainingLine: (pendingStepCount: number, nextStepText: string) =>
    pendingStepCount === 1 ? `Queda 1 paso: ${nextStepText}` : `Quedan ${pendingStepCount} pasos. Sigue: ${nextStepText}`,
  openPendingPlanDetailLabel: 'Abrir el plan en curso',
  goToPendingPlanInRailLabel: 'Ir al plan en curso',
  pendingPlanDetailDescription: 'Lo pendiente no se ejecuta ni se descuenta hasta que el plan continúe.',
  pendingPlanNextStepSectionTitle: 'Sigue ahora',
  pendingPlanLaterStepsSectionTitle: 'Pendientes después',
  pendingPlanEstimatedCostSectionTitle: 'Coste estimado de lo pendiente',
  pendingPlanNoCostNotice: 'Lo pendiente no consume recursos.',
  executedPlanStepsToggle: (executedStepCount: number) =>
    executedStepCount === 1 ? '1 paso ya ejecutado' : `${executedStepCount} pasos ya ejecutados`,

  sortingInstructions:
    'Para reordenar un paso: Espacio lo toma, las flechas lo mueven, Espacio lo suelta y Escape cancela.',
  planStepPickedUpAnnouncement: (stepNumber: number) => `Paso ${stepNumber} tomado.`,
  planStepMovedAnnouncement: (stepNumber: number, targetStepNumber: number) =>
    `Paso ${stepNumber} movido ${describeDestinationPlaceInPlan(targetStepNumber)}.`,
  planStepDroppedAnnouncement: (targetStepNumber: number) =>
    `Paso soltado: queda ${describeRestingPlaceInPlan(targetStepNumber)}.`,
  planStepMoveCancelledAnnouncement: 'Movimiento cancelado. El plan queda como estaba.',
  suggestionAddedAnnouncement: (suggestionNumber: number, stepNumber: number) =>
    `Sugerencia ${suggestionNumber} sumada al plan como paso ${stepNumber}. Nada se envió.`,
  suggestionRemovedAnnouncement: (suggestionNumber: number) => `Sugerencia ${suggestionNumber} quitada del plan.`,
  ownWordsStepAddedAnnouncement: (stepNumber: number) => `Texto propio sumado al plan como paso ${stepNumber}.`,
  planStepRemovedAnnouncement: (stepNumber: number) => `Paso ${stepNumber} quitado del plan.`,

  recognisedReferencesNotice: (suggestionNumbers: number[]) =>
    suggestionNumbers.length === 1
      ? `Se reconoce la sugerencia ${suggestionNumbers[0]}.`
      : `Se reconocen las sugerencias ${suggestionNumbers.join(' → ')}, en ese orden.`,
  convertReferencesButton: 'Convertir en fichas',
  referencesConvertedNotice: 'El texto se repartió en fichas. Conviene revisar el plan antes de enviar.',
  referencesConvertedOnSendNotice: 'Las sugerencias citadas ya son fichas del plan. Revisar y volver a pulsar Enviar.',
  undoConversionButton: 'Deshacer',
  conversionUndoneNotice: 'El texto volvió al campo tal como estaba.',
  unaffordableReferencesNotice: (suggestionNumbers: number[]) =>
    suggestionNumbers.length === 1
      ? `La sugerencia ${suggestionNumbers[0]} quedó fuera: el recurso que pide no alcanza.`
      : `Las sugerencias ${suggestionNumbers.join(', ')} quedaron fuera: el recurso que piden no alcanza.`,

  addDraftAsStepButton: 'Sumar como paso',
  addDraftAsStepShortcutHint: 'Ctrl + Intro',
  sendActionButton: 'Enviar acción',
  sendPlanButton: 'Enviar plan',
  clearDraftButton: 'Vaciar',
  keyboardHelpNotice: 'Intro envía · Mayús + Intro salta de línea · Ctrl + Intro suma el texto como paso · 1 a 9 suman sugerencias',
  emptyActionRejection: 'Falta describir la acción.',
  emptyDraftCannotBecomeStepRejection: 'No hay texto que sumar al plan.',
  emptyPlanStepRejection: (stepNumber: number) => `El paso ${stepNumber} quedó sin texto.`,
  planExceedsResourcesRejection: (resourceName: string) =>
    `El plan pide más ${resourceName} de lo que hay. Falta quitar o cambiar algún paso.`,
  directorBusyNotice: 'El Director trabaja. Se puede seguir armando la respuesta.',
  referencedInteractivePieceNotice: 'La respuesta se refiere a la pieza abierta en el registro.',
  restoredFromHistoryNotice: 'Respuesta anterior recuperada. Flecha abajo vuelve al campo vacío.',

  costLedgerTitle: 'Vale de recursos',
  costLedgerDescription: 'Nada se descuenta hasta confirmar. El Director cobra solo los pasos que lleguen a ejecutarse.',
  costLedgerFirstBatchHeading: 'En esta tanda',
  costLedgerLaterBatchesHeading: 'Si el plan continúa',
  costLedgerCurrentAmountLabel: 'Hay',
  costLedgerRemainingAmountLabel: 'Quedaría',
  costLedgerSpentAmountLabel: 'Sale',
  confirmCostAndSendButton: 'Confirmar coste y enviar',
  returnToPlanButton: 'Volver a la mesa',
  costAwaitingConfirmationNotice: 'El envío consume recursos. Falta confirmar el vale.',
  operationalFundsName: 'Fondos operativos',
  operationalFundsCostDescription: (amountText: string) => `−${amountText} de fondos`,
  belongingCostDescription: (units: number, belongingName: string) => `−${units} ${belongingName}`,

  intentionFacetsLabel: 'Fichas de intención',
  refineIntentionButton: 'Afinar',
  refinementSheetTitle: 'Afinar la intención',
  refinementSheetDescription: 'Elegir una ficha y luego el fragmento que se suma al texto.',
  refinementSheetChooseFacetNotice: 'Ninguna ficha abierta todavía.',
  closeRefinementSheetButton: 'Cerrar',
  intentionFacetIndicatedLabel: 'indicado',
  intentionFacetNames: {
    objective: 'Objetivo',
    method: 'Método',
    resource: 'Recurso',
    recipient: 'Destinatario',
    precaution: 'Precaución',
  } satisfies Record<IntentionFacetName, string>,
  intentionFacetListTitles: {
    objective: 'Para qué lo hace',
    method: 'Cómo lo hace',
    resource: 'Con qué cuenta',
    recipient: 'A quién o a qué se dirige',
    precaution: 'Con qué cuidado',
  } satisfies Record<IntentionFacetName, string>,
  objectiveFacetOpening: 'Para ',
  objectiveFacetItemLabel: 'Empezar a escribir el objetivo',
  methodFacetFragments: [
    'con calma y sin apuro',
    'a simple vista, sin tocar nada',
    'con las manos, palmo a palmo',
    'preguntando sin rodeos',
    'dando un rodeo en la conversación',
    'en silencio',
    'comparando con lo ya anotado',
  ],
  precautionFacetFragments: [
    'sin perder de vista la salida',
    'sin dejar rastro',
    'manteniendo distancia',
    'sin quedarse a solas',
    'avisando antes a alguien de confianza',
    'con la luz apagada',
  ],
  resourceFacetFundsFragment: 'pagando con los Fondos operativos',
  resourceFacetBelongingFragment: (belongingName: string) => `usando ${belongingName}`,
  resourceFacetBelongingItemLabel: (belongingName: string, units: number) => `${belongingName} · ${units} a mano`,
  resourceFacetFundsItemLabel: (amountText: string) => `Fondos operativos · ${amountText}`,
  recipientFacetPersonFragment: (personName: string) => `a ${personName}`,
  recipientFacetPlaceFragment: (placeName: string) => `en ${placeName}`,
  emptyFacetListNotice: 'Nada que ofrecer aquí todavía.',
}

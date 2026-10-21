import type { PlanConditionKindName } from '../demonstration_free_text_intent_matcher'

export const lighthouseCaseDirectorCopy = {
  openingRelationshipCauseByPersonIdentifier: {
    renata_oquendo: 'Esperaba al final del muelle viejo con una libreta contra el pecho. No hubo palabras todavía.',
    punta_animas_boatman: 'Una sola travesía nocturna hasta Punta Ánimas. No apagó el motor.',
  } as Record<string, string>,
  unknownRenataNameAtSentenceStart: 'La mujer de la libreta',
  unknownRenataNameInsideSentence: 'la mujer de la libreta',
  lostVoiceOfAnchorPerson: 'la voz de {{ancla_nombre}}',
  lostVoiceOfUprootedInvestigator: 'la propia voz de {{nombre}}, más joven, como sonaba en las grabaciones viejas',
  methodClarificationParagraphs: [
    'Hace falta el método para poder adjudicarlo: ¿qué hace exactamente {{nombre}}, con qué y contra qué? Ningún tiempo ha transcurrido.',
  ],
  describeMethodAnswer: 'Describir el método',
  illogicalActionVetoParagraphs: (mentionedObjectText: string) => [
    `{{nombre}} no lleva encima nada parecido a «${mentionedObjectText}»: no figura entre sus pertenencias ni ha aparecido en esta escena. Ningún tiempo ha transcurrido.`,
  ],
  rethinkActionAnswer: 'Replantear la acción',
  insistOnActionAnswer: 'Intentarlo de todos modos',
  insistedImpossibleActionParagraph: (mentionedObjectText: string) =>
    `{{nombre}} se palpa los bolsillos, abre la bolsa, vuelve a palparse. No hay «${mentionedObjectText}». Nunca lo hubo. La noche le cobra el minuto perdido y sigue a lo suyo.`,
  editedSuggestionNotice:
    'Demostración: el Director resuelve la sugerencia de origen. Los matices añadidos por escrito quedan anotados en el registro, pero todavía no cambian el resultado.',
  preparationParagraph:
    'Antes de nada, {{nombre}} se toma un momento para prepararse: repasa el equipo pieza por pieza, ajusta las correas, comprueba la linterna contra la palma de la mano y guarda las bengalas donde la mano las encuentre a oscuras. No cambia el mundo. Cambia el pulso.',
  conditionWasMetParagraph: (actionText: string, conditionText: string) =>
    `«${actionText}» dependía de una condición —«${conditionText}»—, y la condición se cumple.`,
  conditionWasUnmetParagraph: (actionText: string, conditionText: string, reasonText: string) =>
    `«${actionText}» quedaba sujeto a una condición —«${conditionText}»— y la condición no se da: ${reasonText} {{nombre}} lo deja sin hacer.`,
  unrecognizedConditionParagraph: (conditionText: string) =>
    `Nada de lo que {{nombre}} percibe contradice «${conditionText}», así que sigue adelante.`,
  unmetConditionReasonByKindName: {
    time_remains: 'la noche ya no da más de sí. La pausa después del noveno destello ha empezado a alargarse.',
    renata_is_present: 'la mujer de la libreta no está aquí.',
    renata_is_absent: 'la mujer de la libreta está delante, mirando.',
    boatman_waits: 'nadie le dio al lanchero motivos para esperar.',
    investigator_is_wounded: '{{nombre}} no tiene ninguna Herida Grave.',
    investigator_is_unharmed: '{{nombre}} ya carga con una Herida Grave.',
    scene_is_not_dangerous: 'este sitio es cualquier cosa menos seguro.',
    unrecognized: '',
  } as Record<PlanConditionKindName | 'renata_is_absent' | 'investigator_is_unharmed', string>,
  actionOutOfReachParagraph: (actionText: string) =>
    `«${actionText}» ya no está al alcance desde aquí: pertenece a otro lugar, o a otro momento de la noche. {{nombre}} lo descarta.`,
  actionAlreadyDoneParagraph: (actionText: string) =>
    `«${actionText}»: eso ya está hecho, y repetirlo no va a enseñar nada nuevo. {{nombre}} no pierde tiempo en ello.`,
  actionWithoutMethodInsidePlanParagraph: (actionText: string) =>
    `«${actionText}» no dice cómo ni con qué. Sin método no hay nada que adjudicar, y ese paso se queda en intención.`,
  unaffordableCostParagraph: (actionText: string) =>
    `«${actionText}» pedía un recurso que {{nombre}} ya no tiene. La mano vuelve vacía del bolsillo.`,
  leftoverStepsParagraph: (leftoverActionTexts: string[]) =>
    `No todo cupo en este tramo de la noche. Quedó sin hacer: ${leftoverActionTexts
      .map((leftoverActionText) => `«${leftoverActionText}»`)
      .join(', ')}. {{nombre}} tendrá que decidirlo de nuevo, con lo que ahora sabe.`,
  sceneChangedMidPlanParagraph:
    'El lugar ha cambiado, y con él lo que está al alcance. Lo que quedaba del plan se pensó para otro sitio.',
  planContinuationParagraphs: (executedStepCount: number, skippedStepCount: number, pendingStepCount: number, nextActionText: string) => [
    `De lo que {{nombre}} se propuso, en este tramo ${executedStepCount === 1 ? 'cupo un paso' : `cupieron ${executedStepCount} pasos`}${
      skippedStepCount > 0
        ? ` y ${skippedStepCount === 1 ? 'uno quedó descartado' : `${skippedStepCount} quedaron descartados`} por no darse las circunstancias`
        : ''
    }. ${pendingStepCount === 1 ? 'Queda un paso pendiente' : `Quedan ${pendingStepCount} pasos pendientes`}. El siguiente: «${nextActionText}».`,
    'La escena ya no es la misma que cuando se trazó el plan. ¿Cómo sigue {{nombre}}?',
  ],
  continuePlanAnswer: 'Continuar con el plan',
  modifyPlanAnswer: 'Modificar el plan',
  discardPlanAnswer: 'Abandonar el resto del plan',
  firstEntropySignalParagraph:
    'Desde donde está, {{nombre}} alcanza a ver la orilla por un ventanuco. El haz ya no barre las casas al mismo paso que al llegar: se detiene en cada puerta un poco más, como quien lee los números.',
  secondEntropySignalParagraph:
    'La pausa después del noveno destello es cada vez más larga. En el pueblo se ha encendido una ventana, luego otra. El haz se queda en cada puerta lo que dura una respiración, y algunas puertas empiezan a devolverle la mirada.',
  attemptActionTextByWidgetKindName: {
    combination_dials: (chosenSymbols: string[]) => `Probar el candado con la combinación ${chosenSymbols.join(' · ')}`,
    cipher_wheel: (shiftPositions: number) =>
      `Fijar el disco de cifrado con un giro de ${shiftPositions} ${shiftPositions === 1 ? 'letra' : 'letras'} y leer`,
    ordered_positions: (orderedVisibleNames: string[]) => `Encajar las placas en este orden: ${orderedVisibleNames.join(', ')}`,
  },
  pieceOutOfReachRuleText: 'Desde aquí no se alcanza el mecanismo.',
  pieceOutOfReachParagraph: 'El mecanismo no está aquí. {{nombre}} tendría que volver a donde lo dejó.',
  pieceSolvedInProseParagraph: '{{nombre}} no necesita tantear: lo dice, lo hace, y el mecanismo le da la razón.',
}

import type { InvestigatorAttributeName, InvestigatorAttributes } from '../game_state/chronicle_state'

export type EvaluatedAttributeName = Exclude<InvestigatorAttributeName, 's'>

export type EvaluationAnswer = {
  identifier: string
  visibleText: string
  measuredAttributeScore: number
  secondaryLeaningAttribute: EvaluatedAttributeName | null
}

export type EvaluationVignette = {
  identifier: string
  measuredAttribute: EvaluatedAttributeName
  figureKind: 'inkblot' | 'none'
  sceneText: string
  questionText: string
  answers: EvaluationAnswer[]
}

export const evaluationVignettes: EvaluationVignette[] = [
  {
    identifier: 'recurring_staircase_dream',
    measuredAttribute: 'im',
    figureKind: 'none',
    sceneText:
      "Lleva tres noches soñando lo mismo: una escalera que baja y alguien que cuenta los peldaños en voz alta. La cuarta noche reconoce la voz. Es la suya.",
    questionText: "¿Qué hace al despertar?",
    answers: [
      {
        identifier: 'recurring_staircase_dream_answer_1',
        visibleText: "Anota el sueño con todos sus detalles y vuelve a dormirse",
        measuredAttributeScore: 3,
        secondaryLeaningAttribute: 'c',
      },
      {
        identifier: 'recurring_staircase_dream_answer_2',
        visibleText: "Enciende la luz y espera el amanecer sin darle más vueltas",
        measuredAttributeScore: 2,
        secondaryLeaningAttribute: null,
      },
      {
        identifier: 'recurring_staircase_dream_answer_3',
        visibleText: "Llama a alguien de confianza, aunque sea tarde, solo para oír otra voz",
        measuredAttributeScore: 1,
        secondaryLeaningAttribute: 'co',
      },
      {
        identifier: 'recurring_staircase_dream_answer_4',
        visibleText: "Evita dormir la noche siguiente",
        measuredAttributeScore: 0,
        secondaryLeaningAttribute: 'm',
      },
    ],
  },
  {
    identifier: 'burning_second_floor',
    measuredAttribute: 'if',
    figureKind: 'none',
    sceneText:
      "Un edificio arde. En el segundo piso alguien golpea una ventana. Los bomberos tardarán ocho minutos.",
    questionText: "¿Qué hace?",
    answers: [
      {
        identifier: 'burning_second_floor_answer_1',
        visibleText: "Sube por la escalera de servicio con la chaqueta mojada sobre la cabeza",
        measuredAttributeScore: 3,
        secondaryLeaningAttribute: 'im',
      },
      {
        identifier: 'burning_second_floor_answer_2',
        visibleText: "Arrastra un contenedor bajo la ventana y grita que salte",
        measuredAttributeScore: 2,
        secondaryLeaningAttribute: 'c',
      },
      {
        identifier: 'burning_second_floor_answer_3',
        visibleText: "Organiza a los vecinos: mantas, una escalera, alguien que vuelva a llamar",
        measuredAttributeScore: 1,
        secondaryLeaningAttribute: 'co',
      },
      {
        identifier: 'burning_second_floor_answer_4',
        visibleText: "No pierde de vista la ventana para poder guiar a los bomberos cuando lleguen",
        measuredAttributeScore: 0,
        secondaryLeaningAttribute: 'o',
      },
    ],
  },
  {
    identifier: 'letters_in_unknown_alphabet',
    measuredAttribute: 'c',
    figureKind: 'none',
    sceneText:
      "Hereda una caja de cartas escritas en un alfabeto que no reconoce.",
    questionText: "¿Por dónde empieza?",
    answers: [
      {
        identifier: 'letters_in_unknown_alphabet_answer_1',
        visibleText: "Cuenta los símbolos, busca repeticiones y arma una tabla",
        measuredAttributeScore: 3,
        secondaryLeaningAttribute: null,
      },
      {
        identifier: 'letters_in_unknown_alphabet_answer_2',
        visibleText: "Ordena las cartas por el papel, la tinta y el desgaste, para saber cuál es la más antigua",
        measuredAttributeScore: 2,
        secondaryLeaningAttribute: 'o',
      },
      {
        identifier: 'letters_in_unknown_alphabet_answer_3',
        visibleText: "Lleva una copia a alguien que sepa de lenguas",
        measuredAttributeScore: 1,
        secondaryLeaningAttribute: 'co',
      },
      {
        identifier: 'letters_in_unknown_alphabet_answer_4',
        visibleText: "Duerme con una bajo la almohada, por si acaso tiene algo que decir",
        measuredAttributeScore: 0,
        secondaryLeaningAttribute: 'm',
      },
    ],
  },
  {
    identifier: 'room_that_changed',
    measuredAttribute: 'o',
    figureKind: 'none',
    sceneText:
      "Entra a una habitación que conoce bien. Algo está distinto, pero no sabe qué.",
    questionText: "¿Qué hace primero?",
    answers: [
      {
        identifier: 'room_that_changed_answer_1',
        visibleText: "Se queda en el umbral y recorre la habitación con la vista, objeto por objeto, antes de pisar",
        measuredAttributeScore: 3,
        secondaryLeaningAttribute: 'im',
      },
      {
        identifier: 'room_that_changed_answer_2',
        visibleText: "La compara con una foto vieja que guarda en el teléfono",
        measuredAttributeScore: 2,
        secondaryLeaningAttribute: 'c',
      },
      {
        identifier: 'room_that_changed_answer_3',
        visibleText: "Pregunta en voz alta si hay alguien",
        measuredAttributeScore: 1,
        secondaryLeaningAttribute: 'co',
      },
      {
        identifier: 'room_that_changed_answer_4',
        visibleText: "Entra y revisa los armarios y debajo de la cama",
        measuredAttributeScore: 0,
        secondaryLeaningAttribute: 'if',
      },
    ],
  },
  {
    identifier: 'guard_at_the_archive',
    measuredAttribute: 'co',
    figureKind: 'none',
    sceneText:
      "Un guardia le niega el paso al archivo municipal donde está el documento que necesita. Cierran en veinte minutos.",
    questionText: "¿Cómo lo intenta?",
    answers: [
      {
        identifier: 'guard_at_the_archive_answer_1',
        visibleText: "Le pregunta por su turno, descubre qué le preocupa y se gana dos minutos dentro",
        measuredAttributeScore: 3,
        secondaryLeaningAttribute: 'o',
      },
      {
        identifier: 'guard_at_the_archive_answer_2',
        visibleText: "Cita con aplomo un reglamento que obligaría a dejar pasar",
        measuredAttributeScore: 2,
        secondaryLeaningAttribute: 'c',
      },
      {
        identifier: 'guard_at_the_archive_answer_3',
        visibleText: "Espera al cambio de turno y observa por dónde entra el personal",
        measuredAttributeScore: 1,
        secondaryLeaningAttribute: 'o',
      },
      {
        identifier: 'guard_at_the_archive_answer_4',
        visibleText: "Busca una ventana abierta en el patio trasero",
        measuredAttributeScore: 0,
        secondaryLeaningAttribute: 'if',
      },
    ],
  },
  {
    identifier: 'warm_stone_in_the_market',
    measuredAttribute: 'm',
    figureKind: 'inkblot',
    sceneText:
      "Una anciana en el mercado le pone en la mano una piedra tibia y dice: «Es suya. La perdió antes de nacer.»",
    questionText: "¿Qué hace con la piedra?",
    answers: [
      {
        identifier: 'warm_stone_in_the_market_answer_1',
        visibleText: "La guarda. Al cerrar el puño siente que es verdad",
        measuredAttributeScore: 3,
        secondaryLeaningAttribute: null,
      },
      {
        identifier: 'warm_stone_in_the_market_answer_2',
        visibleText: "Le pregunta a la anciana quién es y cómo lo sabe",
        measuredAttributeScore: 2,
        secondaryLeaningAttribute: 'co',
      },
      {
        identifier: 'warm_stone_in_the_market_answer_3',
        visibleText: "La lleva a que alguien le diga qué mineral es",
        measuredAttributeScore: 1,
        secondaryLeaningAttribute: 'c',
      },
      {
        identifier: 'warm_stone_in_the_market_answer_4',
        visibleText: "Se la devuelve con amabilidad y sigue su camino",
        measuredAttributeScore: 0,
        secondaryLeaningAttribute: 'im',
      },
    ],
  },
  {
    identifier: 'stranger_who_knows_too_much',
    measuredAttribute: 'im',
    figureKind: 'none',
    sceneText:
      "En una sala de espera, el desconocido de al lado se inclina y le dice en voz baja la calle donde creció, el nombre de su primera mascota y la hora exacta. Luego se levanta y se va.",
    questionText: "¿Qué hace?",
    answers: [
      {
        identifier: 'stranger_who_knows_too_much_answer_1',
        visibleText: "Termina el trámite que vino a hacer. Ya lo pensará después, con calma",
        measuredAttributeScore: 3,
        secondaryLeaningAttribute: null,
      },
      {
        identifier: 'stranger_who_knows_too_much_answer_2',
        visibleText: "Lo sigue a distancia para ver adónde va",
        measuredAttributeScore: 2,
        secondaryLeaningAttribute: 'o',
      },
      {
        identifier: 'stranger_who_knows_too_much_answer_3',
        visibleText: "Lo alcanza en la puerta y le exige una explicación",
        measuredAttributeScore: 1,
        secondaryLeaningAttribute: 'co',
      },
      {
        identifier: 'stranger_who_knows_too_much_answer_4',
        visibleText: "Se marcha sin terminar; hoy ya no puede pensar en otra cosa",
        measuredAttributeScore: 0,
        secondaryLeaningAttribute: 'm',
      },
    ],
  },
  {
    identifier: 'envelope_before_midnight',
    measuredAttribute: 'if',
    figureKind: 'none',
    sceneText:
      "Tiene que entregar un sobre al otro lado de la ciudad antes de medianoche. No hay transporte y llueve.",
    questionText: "¿Cómo llega?",
    answers: [
      {
        identifier: 'envelope_before_midnight_answer_1',
        visibleText: "Echa a correr. Conoce su ritmo y sabe que llega",
        measuredAttributeScore: 3,
        secondaryLeaningAttribute: 'im',
      },
      {
        identifier: 'envelope_before_midnight_answer_2',
        visibleText: "Toma una bicicleta que no es suya; ya la devolverá",
        measuredAttributeScore: 2,
        secondaryLeaningAttribute: null,
      },
      {
        identifier: 'envelope_before_midnight_answer_3',
        visibleText: "Calcula la ruta más corta por pasajes y patios, aunque llegue con lo justo",
        measuredAttributeScore: 1,
        secondaryLeaningAttribute: 'c',
      },
      {
        identifier: 'envelope_before_midnight_answer_4',
        visibleText: "Convence a un repartidor de hacer un desvío",
        measuredAttributeScore: 0,
        secondaryLeaningAttribute: 'co',
      },
    ],
  },
  {
    identifier: 'clock_that_loses_seven_minutes',
    measuredAttribute: 'c',
    figureKind: 'none',
    sceneText:
      "El reloj de pared de la casa atrasa exactamente siete minutos cada día. Lo han cambiado tres veces.",
    questionText: "¿Qué hace?",
    answers: [
      {
        identifier: 'clock_that_loses_seven_minutes_answer_1',
        visibleText: "Registra la hora durante un mes y busca qué más ocurre a ese ritmo",
        measuredAttributeScore: 3,
        secondaryLeaningAttribute: 'im',
      },
      {
        identifier: 'clock_that_loses_seven_minutes_answer_2',
        visibleText: "Desmonta el último reloj para ver si hay algo raro en el mecanismo",
        measuredAttributeScore: 2,
        secondaryLeaningAttribute: 'o',
      },
      {
        identifier: 'clock_that_loses_seven_minutes_answer_3',
        visibleText: "Pregunta a quienes vivieron antes en la casa",
        measuredAttributeScore: 1,
        secondaryLeaningAttribute: 'co',
      },
      {
        identifier: 'clock_that_loses_seven_minutes_answer_4',
        visibleText: "Cuelga el reloj en otra pared y deja de pensar en ello",
        measuredAttributeScore: 0,
        secondaryLeaningAttribute: 'im',
      },
    ],
  },
  {
    identifier: 'unknown_guest_in_the_photograph',
    measuredAttribute: 'o',
    figureKind: 'none',
    sceneText:
      "En la foto de grupo de una boda aparece una persona que ningún invitado recuerda.",
    questionText: "¿Qué hace con la foto?",
    answers: [
      {
        identifier: 'unknown_guest_in_the_photograph_answer_1',
        visibleText: "La amplía: la ropa, la sombra, hacia dónde mira, qué sostiene",
        measuredAttributeScore: 3,
        secondaryLeaningAttribute: null,
      },
      {
        identifier: 'unknown_guest_in_the_photograph_answer_2',
        visibleText: "Cruza la lista de invitados con el plano de las mesas",
        measuredAttributeScore: 2,
        secondaryLeaningAttribute: 'c',
      },
      {
        identifier: 'unknown_guest_in_the_photograph_answer_3',
        visibleText: "Llama, una por una, a las personas que salen a su lado",
        measuredAttributeScore: 1,
        secondaryLeaningAttribute: 'co',
      },
      {
        identifier: 'unknown_guest_in_the_photograph_answer_4',
        visibleText: "Siente que no debería seguir mirándola y le hace caso a esa sensación",
        measuredAttributeScore: 0,
        secondaryLeaningAttribute: 'm',
      },
    ],
  },
  {
    identifier: 'siblings_arguing_over_the_house',
    measuredAttribute: 'co',
    figureKind: 'none',
    sceneText:
      "Dos hermanos discuten a gritos por la casa de su madre. Usted solo venía a verla por dentro.",
    questionText: "¿Qué hace?",
    answers: [
      {
        identifier: 'siblings_arguing_over_the_house_answer_1',
        visibleText: "Se sienta con ellos y consigue que cada uno diga qué quiere de verdad",
        measuredAttributeScore: 3,
        secondaryLeaningAttribute: 'im',
      },
      {
        identifier: 'siblings_arguing_over_the_house_answer_2',
        visibleText: "Habla con cada uno por separado y acuerda la visita con quien ceda",
        measuredAttributeScore: 2,
        secondaryLeaningAttribute: 'c',
      },
      {
        identifier: 'siblings_arguing_over_the_house_answer_3',
        visibleText: "Mientras discuten, recorre la casa con los ojos bien abiertos",
        measuredAttributeScore: 1,
        secondaryLeaningAttribute: 'o',
      },
      {
        identifier: 'siblings_arguing_over_the_house_answer_4',
        visibleText: "Se va y vuelve otro día; esa pelea no es asunto suyo",
        measuredAttributeScore: 0,
        secondaryLeaningAttribute: 'im',
      },
    ],
  },
  {
    identifier: 'corner_always_avoided',
    measuredAttribute: 'm',
    figureKind: 'none',
    sceneText:
      "Hay una esquina de su ciudad donde siempre, sin motivo, cruza a la otra acera.",
    questionText: "Ahora que lo ha notado, ¿qué hace?",
    answers: [
      {
        identifier: 'corner_always_avoided_answer_1',
        visibleText: "Una noche va a propósito, se detiene justo ahí y espera a ver qué nota",
        measuredAttributeScore: 3,
        secondaryLeaningAttribute: 'im',
      },
      {
        identifier: 'corner_always_avoided_answer_2',
        visibleText: "Investiga qué hubo antes en ese solar",
        measuredAttributeScore: 2,
        secondaryLeaningAttribute: 'c',
      },
      {
        identifier: 'corner_always_avoided_answer_3',
        visibleText: "Se fija en si otras personas también la evitan",
        measuredAttributeScore: 1,
        secondaryLeaningAttribute: 'o',
      },
      {
        identifier: 'corner_always_avoided_answer_4',
        visibleText: "Nada. Seguirá cruzando, como siempre",
        measuredAttributeScore: 0,
        secondaryLeaningAttribute: null,
      },
    ],
  },
]

export const evaluatedAttributeNames: EvaluatedAttributeName[] = ['im', 'if', 'c', 'o', 'co', 'm']

const fixedInitialLuck = 2
const maximumInitialAttributeTotal = 30
const minimumInitialAttributeValue = 1
const maximumInitialAttributeValue = 10
const highestAnswerScore = 3
const measuredShareOfAptitude = 0.78
const leaningShareOfAptitude = 0.22
const baselineAptitudeForEveryAttribute = 0.4

export type ChosenEvaluationAnswer = {
  evaluationVignette: EvaluationVignette
  evaluationAnswer: EvaluationAnswer
}

export function deriveInvestigatorAttributesFromAnswers(chosenAnswers: ChosenEvaluationAnswer[]): InvestigatorAttributes {
  const measuredScores: Record<EvaluatedAttributeName, number[]> = { im: [], if: [], c: [], o: [], co: [], m: [] }
  const leaningCounts: Record<EvaluatedAttributeName, number> = { im: 0, if: 0, c: 0, o: 0, co: 0, m: 0 }
  for (const { evaluationVignette, evaluationAnswer } of chosenAnswers) {
    measuredScores[evaluationVignette.measuredAttribute].push(evaluationAnswer.measuredAttributeScore)
    if (evaluationAnswer.secondaryLeaningAttribute) {
      leaningCounts[evaluationAnswer.secondaryLeaningAttribute] += 1
    }
  }
  const highestLeaningCount = Math.max(1, ...evaluatedAttributeNames.map((attributeName) => leaningCounts[attributeName]))
  const aptitudeByAttribute: Record<EvaluatedAttributeName, number> = { im: 0, if: 0, c: 0, o: 0, co: 0, m: 0 }
  for (const attributeName of evaluatedAttributeNames) {
    const scoresForAttribute = measuredScores[attributeName]
    const averageMeasuredShare =
      scoresForAttribute.length === 0
        ? 0.5
        : scoresForAttribute.reduce((runningTotal, score) => runningTotal + score, 0) /
          scoresForAttribute.length /
          highestAnswerScore
    const leaningShare = leaningCounts[attributeName] / highestLeaningCount
    aptitudeByAttribute[attributeName] =
      baselineAptitudeForEveryAttribute +
      measuredShareOfAptitude * averageMeasuredShare +
      leaningShareOfAptitude * leaningShare
  }
  const totalAptitude = evaluatedAttributeNames.reduce(
    (runningTotal, attributeName) => runningTotal + aptitudeByAttribute[attributeName],
    0,
  )
  const pointsToDistribute =
    maximumInitialAttributeTotal - fixedInitialLuck - evaluatedAttributeNames.length * minimumInitialAttributeValue
  const attributeValues: Record<EvaluatedAttributeName, number> = { im: 1, if: 1, c: 1, o: 1, co: 1, m: 1 }
  const unassignedRemainders: Array<{ attributeName: EvaluatedAttributeName; remainder: number }> = []
  let assignedPoints = 0
  for (const attributeName of evaluatedAttributeNames) {
    const exactShare = (aptitudeByAttribute[attributeName] / totalAptitude) * pointsToDistribute
    const wholePoints = Math.min(Math.floor(exactShare), maximumInitialAttributeValue - minimumInitialAttributeValue)
    attributeValues[attributeName] += wholePoints
    assignedPoints += wholePoints
    unassignedRemainders.push({ attributeName, remainder: exactShare - wholePoints })
  }
  unassignedRemainders.sort((firstEntry, secondEntry) => secondEntry.remainder - firstEntry.remainder)
  let remainderIndex = 0
  while (assignedPoints < pointsToDistribute && remainderIndex < unassignedRemainders.length * 3) {
    const { attributeName } = unassignedRemainders[remainderIndex % unassignedRemainders.length]
    if (attributeValues[attributeName] < maximumInitialAttributeValue) {
      attributeValues[attributeName] += 1
      assignedPoints += 1
    }
    remainderIndex += 1
  }
  return { ...attributeValues, s: fixedInitialLuck }
}

export const evaluationReadingByDominantAttribute: Record<EvaluatedAttributeName, string> = {
  im: 'Una mente que no se quiebra con facilidad. Lo imposible tendrá que insistir.',
  if: 'Un cuerpo que responde antes que la duda. Conviene recordar que también se rompe.',
  c: 'Una cabeza que ordena el mundo en causas. Habrá causas que no quieran ser ordenadas.',
  o: 'Una mirada que no perdona un detalle. Algunos detalles devuelven la mirada.',
  co: 'Una voz que abre puertas. No todas las puertas deberían abrirse.',
  m: 'Una sensibilidad que ya oía algo antes de hoy. Ahora sabrá qué era.',
}

import {
  lighthouseCaseFlagNames,
  lighthouseCaseInteractivePieceIdentifiers,
  lighthouseCaseSceneIdentifiers,
  renataPersonIdentifier,
} from './lighthouse_case_persons'
import {
  createBranchCondition,
  createCaseActionBranch,
  createCaseBranchOutcome,
  createDialogueEntry,
  createNarrationEntry,
  createThoughtEntry,
} from './lighthouse_case_script_types'
import type { CaseSceneDefinition } from './lighthouse_case_script_types'

export const keeperRoomScene: CaseSceneDefinition = {
  sceneIdentifier: lighthouseCaseSceneIdentifiers.keeperRoom,
  placeName: 'Faro · Cuarto del farero',
  tensionTierName: 'uneasy',
  presentPersons: [
    {
      personIdentifier: renataPersonIdentifier,
      presenceText: 'De pie en el umbral, sin cruzarlo. Mira la mesa de su maestro desde lejos.',
      presenceCondition: null,
    },
  ],
  perceivedPointsOfInterest: [
    { identifier: 'keeper_room_point_logbook', visibleName: 'El cuaderno del farero, abierto sobre la mesa' },
    { identifier: 'keeper_room_point_brass_disc', visibleName: 'Un disco de latón con dos coronas de letras' },
    { identifier: 'keeper_room_point_staircase', visibleName: 'El arranque de la escalera de caracol' },
  ],
  arrivalEntries: [
    createNarrationEntry(
      'El cuarto del farero guarda el orden de alguien que pensaba volver: la taza boca abajo, el cuaderno abierto, un bolígrafo azul cruzado sobre la página, un disco de latón haciendo de pisapapeles. Por el hueco de la escalera baja, muy débil, una voz de hombre que cuenta.',
    ),
  ],
  actionBranches: [
    createCaseActionBranch({
      branchIdentifier: 'read_keeper_logbook',
      visibleText: 'Leer el cuaderno del farero que sigue sobre la mesa',
      actionGroupName: 'examine',
      freeTextIntentPatternSources: ['cuaderno', 'le\\w* (el )?(diario|libro)', 'inventario', 'bitacora'],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [
          createNarrationEntry(
            'La letra del farero es prolija hasta agosto de 1987. Después se vuelve un inventario: nombres del pueblo, uno por línea, cada uno con una cifra del uno al nueve. Todos con su oficio al lado: patrón, redera, maestro, fogonero. Gente hecha y derecha. Ningún niño.',
            'La última línea dice [[documento:10 —]] y nada más. La tinta del guion todavía mancha el dedo.',
            'Las páginas finales no están en castellano ni en ninguna otra lengua: bloques de letras mayúsculas, apretadas, sin una sola tachadura. El disco de latón que sujeta la página tiene dos coronas de alfabeto y una inscripción en el canto: [[documento:Se cuenta desde la luz]].',
          ),
        ],
        elapsedMinutes: 11,
        grantedLivedExperienceFlagNames: [lighthouseCaseFlagNames.readKeeperLogbook],
        presentedInteractivePieceIdentifiers: [lighthouseCaseInteractivePieceIdentifiers.keeperCipherWheel],
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'ask_renata_about_brother',
      visibleText: 'Preguntar a la mujer de la libreta, sin apurarla, a quién espera',
      actionGroupName: 'speak',
      freeTextIntentPatternSources: ['pregunt\\w* a (renata|la mujer)', 'su hermano', 'a quien espera', 'habl\\w* con renata', 'su madre'],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [
          createNarrationEntry(
            '{{nombre}} hace la pregunta y después hace lo más difícil: esperar. La mujer dice llamarse Renata Oquendo, por si hacía falta, y mira la taza boca abajo un rato largo antes de contestar.',
          ),
          createDialogueEntry(
            renataPersonIdentifier,
            'spoken',
            '«A Tomás. Mi hermano. Subió anoche a contar destellos porque alguien le dijo que el faro devuelve gente.» Traga saliva. «Quería que le devolviera a nuestra madre. Elvira. Se la llevó el mar el año en que apagaron esto.» Dice el año sin dudar: 1987.',
            '«Él juraba que el faro no alumbra barcos. Que cuenta a los que faltan. Y que si sobra un destello, es que alguien sobra aquí abajo.»',
            '«Mi madre era menuda, ¿sabe? Me llegaba al hombro. El farero medía a la gente a ojo, con una raya en el marco, como a los críos. Se reían de eso los dos.»',
          ),
        ],
        elapsedMinutes: 8,
        personIdentifiersBecomingKnown: [renataPersonIdentifier],
        grantedLivedExperienceFlagNames: [lighthouseCaseFlagNames.askedAboutBrother, lighthouseCaseFlagNames.spokeWithRenata],
        relationshipChanges: [
          {
            personIdentifier: renataPersonIdentifier,
            directionName: 'toward_investigator_as_perceived',
            dimensionName: null,
            levelChange: 1,
            perceptibleCauseText: 'Pudo hablar de Tomás y de su madre a su ritmo, sin que nadie la apurara.',
          },
        ],
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'ask_renata_to_read_master_handwriting',
      visibleText: 'Pedirle a Renata que mire las páginas cifradas de su maestro',
      actionGroupName: 'speak',
      visibilityCondition: createBranchCondition({
        requiredLivedExperienceFlagNames: [lighthouseCaseFlagNames.readKeeperLogbook],
        forbiddenLivedExperienceFlagNames: [lighthouseCaseFlagNames.essentialConclusionByDocument],
      }),
      freeTextIntentPatternSources: ['(renata|ella).*(le\\w*|mir\\w*|descifr\\w*)', 'letra de su maestro', 'ensen\\w* (el cuaderno|las paginas) a renata'],
      conditionalOutcomes: [
        {
          condition: createBranchCondition({
            minimumRelationshipLevels: [
              { personIdentifier: renataPersonIdentifier, directionName: 'toward_investigator_as_perceived', minimumLevel: 4 },
            ],
          }),
          outcome: createCaseBranchOutcome({
            directorEntries: [
              createNarrationEntry(
                'Renata cruza el umbral. Son tres pasos y le cuestan como treinta. Se inclina sobre el cuaderno sin tocarlo.',
              ),
              createDialogueEntry(
                renataPersonIdentifier,
                'spoken',
                '«Es su disco. Nos lo enseñó el primer invierno: giras la corona de dentro tantas letras como sea la clave y lees por la de fuera. Siempre decía que la clave de un farero tiene que estar a la vista de todo el mundo, todas las noches, o no sirve.» Niega con la cabeza. «La clave de estas páginas no me la dio nunca.»',
              ),
              createNarrationEntry('Vuelve al umbral de espaldas, sin dejar de mirar la mesa.'),
            ],
            elapsedMinutes: 6,
            additionalWitnessedOriginIdentifiers: ['renata_read_master_handwriting'],
            relationshipChanges: [
              {
                personIdentifier: renataPersonIdentifier,
                directionName: 'from_investigator',
                dimensionName: null,
                levelChange: 1,
                perceptibleCauseText: 'Entró al cuarto de su maestro, a pesar del miedo, para ayudar con el cuaderno.',
              },
            ],
          }),
        },
      ],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [
          createDialogueEntry(
            renataPersonIdentifier,
            'whispered',
            '«No me pida que entre. Todavía no.» Se abraza a la libreta. No es un no para siempre: es el no de quien aún no sabe con quién está hablando.',
          ),
        ],
        elapsedMinutes: 2,
        shouldUpdateJournal: false,
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'bag_blue_pen_evidence',
      visibleText: 'Guardar el bolígrafo azul del registro en una bolsa de evidencia',
      actionGroupName: 'use_or_spend',
      resourceCost: { kind: 'belonging', belongingIdentifier: 'sealed_evidence_bag', units: 1 },
      freeTextIntentPatternSources: ['boligrafo', 'bolsa de evidencia', 'guard\\w* (la )?evidencia', 'pluma azul'],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [
          createNarrationEntry(
            'El bolígrafo es de propaganda: una ferretería de Punta Ánimas que cerró hace veinte años. Es el mismo azul de las entradas nuevas del registro de guardia. {{nombre}} lo sella y rotula la bolsa.',
            'Al guardarla nota que la bolsa está ligeramente más pesada de lo que debería, como si el bolígrafo siguiera [[escribiendo]] dentro.',
          ),
        ],
        elapsedMinutes: 4,
        stagingEvents: [{ kind: 'anomaly_manifested', anchorEntryIndex: 0, anchorParagraphIndex: 1 }],
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'connect_the_three_counts',
      visibleText: 'Poner juntas las tres cuentas: las marcas de llave, la libreta y el cuaderno',
      actionGroupName: 'examine',
      visibilityCondition: createBranchCondition({
        requiredLivedExperienceFlagNames: [
          lighthouseCaseFlagNames.sawKeyMarks,
          lighthouseCaseFlagNames.spokeWithRenata,
          lighthouseCaseFlagNames.readKeeperLogbook,
          lighthouseCaseFlagNames.askedAboutBrother,
        ],
        forbiddenLivedExperienceFlagNames: [lighthouseCaseFlagNames.knowsMissingName],
      }),
      freeTextIntentPatternSources: ['at\\w* cabos', 'tres cuentas', 'deduc\\w*', 'quien es (el|la) decim\\w*', 'compar\\w* (las marcas|la libreta)'],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [
          createThoughtEntry(
            'own_reasoning',
            'Nueve marcas a la altura de un adulto y una más abajo. Nueve palitos y un décimo con otra letra. Nueve nombres con su cifra y un «10 —» sin nombre. Tres manos distintas llevando la misma cuenta, y a las tres les falta lo mismo.',
            'La marca baja no es de un niño: en el cuaderno no hay ninguno. Es de alguien menudo, medido a ojo contra un marco. Alguien que el farero conocía lo bastante como para bromear con su estatura, y a quien no apuntó.',
            'Falta un nombre en la lista. Y Renata acaba de decirlo en voz alta sin saber que lo decía: [[lento:Elvira, la que se llevó el mar en 1987.]]',
          ),
        ],
        elapsedMinutes: 5,
        grantedLivedExperienceFlagNames: [
          lighthouseCaseFlagNames.essentialConclusionByObservation,
          lighthouseCaseFlagNames.knowsMissingName,
        ],
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'ask_renata_before_writing_name',
      visibleText: 'Contarle a Renata lo averiguado y pedirle permiso para escribir el nombre de su madre',
      actionGroupName: 'speak',
      visibilityCondition: createBranchCondition({
        requiredLivedExperienceFlagNames: [lighthouseCaseFlagNames.knowsMissingName],
        forbiddenLivedExperienceFlagNames: [lighthouseCaseFlagNames.renataConsentedToName],
      }),
      freeTextIntentPatternSources: ['permiso', 'cont\\w* a renata', 'dec\\w* a renata', 'explic\\w* a renata'],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [
          createNarrationEntry(
            '{{nombre}} se lo cuenta entero y sin adornos: la barca, los diez, la lista de nueve, el nombre que el farero no quiso apuntar. Renata escucha con la espalda contra el marco, resbalando despacio hasta quedar sentada en el umbral.',
          ),
          createDialogueEntry(
            renataPersonIdentifier,
            'spoken',
            '«Treinta y nueve años contándola de menos.» Se limpia la cara con la manga del abrigo, que es de hombre, que es de Tomás. «Escríbalo. Con todas las letras. Elvira Sanjurjo. Y gracias por preguntarme: es lo único de ella que todavía era mío.»',
          ),
        ],
        elapsedMinutes: 7,
        grantedLivedExperienceFlagNames: [lighthouseCaseFlagNames.renataConsentedToName],
        relationshipChanges: [
          {
            personIdentifier: renataPersonIdentifier,
            directionName: 'toward_investigator_as_perceived',
            dimensionName: 'affection',
            levelChange: 2,
            perceptibleCauseText: 'Le pidieron permiso antes de escribir el nombre de su madre.',
          },
        ],
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'finish_keeper_inventory',
      visibleText: 'Completar la última línea del cuaderno del farero con el nombre que falta',
      actionGroupName: 'use_or_spend',
      visibilityCondition: createBranchCondition({ requiredLivedExperienceFlagNames: [lighthouseCaseFlagNames.knowsMissingName] }),
      freeTextIntentPatternSources: ['escrib\\w* (el nombre|elvira)', 'complet\\w* (la linea|el cuaderno|la lista)', 'apunt\\w* (el nombre|a elvira|a la madre)'],
      conditionalOutcomes: [
        {
          condition: createBranchCondition({ requiredLivedExperienceFlagNames: [lighthouseCaseFlagNames.renataConsentedToName] }),
          outcome: createCaseBranchOutcome({
            directorEntries: [
              createNarrationEntry(
                '{{nombre}} toma el bolígrafo que haya a mano y escribe junto al «10 —», despacio, con Renata mirando desde el umbral: [[documento:Elvira Sanjurjo]]. El papel lo acepta sin correrse la tinta.',
                'El décimo destello no llega. En su lugar, la torre entera [[lento:exhala un aire frío con olor a sal vieja]], y arriba la voz que contaba se interrumpe a media cifra.',
                'Luego, pasos. Descalzos. Un hombre baja los peldaños de uno en uno, contándolos en voz alta para no perderse, y al llegar al último se queda mirando a su hermana como quien vuelve de un turno muy largo.',
              ),
            ],
            elapsedMinutes: 9,
            additionalWitnessedOriginIdentifiers: ['name_written_with_consent'],
            personIdentifiersBecomingKnown: ['renata_brother'],
            grantedLivedExperienceFlagNames: [lighthouseCaseFlagNames.resolutionByRepair, lighthouseCaseFlagNames.brotherWasFreed],
            relationshipChanges: [
              {
                personIdentifier: 'renata_brother',
                directionName: 'toward_investigator_as_perceived',
                dimensionName: 'debt',
                levelChange: 3,
                perceptibleCauseText: 'Bajó de la torre porque alguien escribió el nombre que cerraba la cuenta.',
              },
              {
                personIdentifier: renataPersonIdentifier,
                directionName: 'toward_investigator_as_perceived',
                dimensionName: 'debt',
                levelChange: 2,
                perceptibleCauseText: 'Su hermano bajó vivo la escalera del faro.',
              },
            ],
            newPlaceName: 'Punta Ánimas · Muelle viejo',
            nextSceneIdentifier: lighthouseCaseSceneIdentifiers.dawnPier,
          }),
        },
      ],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [
          createNarrationEntry(
            '{{nombre}} escribe junto al «10 —» el nombre de la madre de Renata, el que el mar se llevó. No avisa a nadie. El papel lo acepta sin correrse la tinta.',
            'El décimo destello no llega. En su lugar, la torre entera [[lento:exhala un aire frío con olor a sal vieja]], y el hermano de Renata baja los peldaños de uno en uno, contándolos en voz alta para no perderse.',
          ),
          createDialogueEntry(
            renataPersonIdentifier,
            'spoken',
            '«¿Qué ha escrito?» Lee por encima del hombro de {{nombre}}. Abraza a su hermano, y por encima del hombro de él mira el cuaderno con algo que no es gratitud del todo. «Era su nombre. Era mío para darlo.»',
          ),
        ],
        elapsedMinutes: 9,
        additionalWitnessedOriginIdentifiers: ['name_written_without_consent'],
        personIdentifiersBecomingKnown: ['renata_brother'],
        grantedLivedExperienceFlagNames: [lighthouseCaseFlagNames.resolutionByRepair, lighthouseCaseFlagNames.brotherWasFreed],
        relationshipChanges: [
          {
            personIdentifier: 'renata_brother',
            directionName: 'toward_investigator_as_perceived',
            dimensionName: 'debt',
            levelChange: 3,
            perceptibleCauseText: 'Bajó de la torre porque alguien escribió el nombre que cerraba la cuenta.',
          },
          {
            personIdentifier: renataPersonIdentifier,
            directionName: 'toward_investigator_as_perceived',
            dimensionName: null,
            levelChange: -1,
            perceptibleCauseText: 'El nombre de su madre se escribió sin decírselo. Su hermano volvió, pero a ella le quitaron algo.',
          },
        ],
        newPlaceName: 'Punta Ánimas · Muelle viejo',
        nextSceneIdentifier: lighthouseCaseSceneIdentifiers.dawnPier,
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'take_keeper_logbook',
      visibleText: 'Llevarse el cuaderno del farero bajo el brazo',
      actionGroupName: 'use_or_spend',
      visibilityCondition: createBranchCondition({ requiredLivedExperienceFlagNames: [lighthouseCaseFlagNames.readKeeperLogbook] }),
      freeTextIntentPatternSources: ['llev\\w* el cuaderno', 'tom\\w* el cuaderno', 'guard\\w* el cuaderno', 'cog\\w* el cuaderno'],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [
          createNarrationEntry(
            '{{nombre}} cierra el cuaderno y se lo mete bajo el brazo. Pesa poco. Al levantarlo de la mesa queda un rectángulo limpio en el polvo, y la voz de arriba se salta un número.',
          ),
        ],
        elapsedMinutes: 2,
        grantedLivedExperienceFlagNames: [lighthouseCaseFlagNames.carriesKeeperLogbook],
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'start_up_inner_staircase',
      visibleText: 'Tomar la escalera de caracol hacia arriba',
      actionGroupName: 'move',
      isRepeatable: true,
      freeTextIntentPatternSources: ['escalera( de caracol| interior)?', 'sub\\w*'],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [
          createNarrationEntry(
            '{{nombre}} pone el pie en el primer peldaño. La escalera de caracol sube pegada al muro, sin barandilla por el lado del hueco. En la pared, el plano de la OICNAU clavado con chinchetas lo dice claro: ciento ocho peldaños hasta la linterna.',
          ),
        ],
        elapsedMinutes: 2,
        newPlaceName: 'Faro · Escalera interior',
        shouldUpdateJournal: false,
        nextSceneIdentifier: lighthouseCaseSceneIdentifiers.innerStaircase,
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'leave_keeper_room',
      visibleText: 'Salir al pie del faro',
      actionGroupName: 'move',
      isRepeatable: true,
      freeTextIntentPatternSources: ['sal\\w* (del faro|afuera|fuera)', 'pie del faro', 'volv\\w* afuera'],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [createNarrationEntry('{{nombre}} cruza el umbral junto a Renata y vuelve al pie de la torre. Fuera, el reloj parece recordar cómo se avanza.')],
        elapsedMinutes: 2,
        newPlaceName: 'Punta Ánimas · Pie del faro',
        shouldUpdateJournal: false,
        nextSceneIdentifier: lighthouseCaseSceneIdentifiers.towerFoot,
      }),
    }),
  ],
  freeTextFallbackOutcome: createCaseBranchOutcome({
    directorEntries: [
      createNarrationEntry(
        'El interior del faro recibe el intento de {{nombre}} con un eco que tarda demasiado en volver. Arriba, algo metálico rueda unos centímetros y se detiene. No pasa nada más, y ese nada tiene la forma de alguien conteniendo el aliento.',
      ),
      createThoughtEntry('own_reasoning', 'La mesa, el cuaderno, el disco de latón. El farero dejó las cosas donde alguien pudiera encontrarlas.'),
    ],
    elapsedMinutes: 4,
    shouldUpdateJournal: false,
  }),
  interactivePieceSolvedOutcomes: {
    [lighthouseCaseInteractivePieceIdentifiers.keeperCipherWheel]: createCaseBranchOutcome({
      directorEntries: [
        createNarrationEntry(
          'Nueve letras desde la luz. La corona interior encaja con un clic de relojería y los bloques de mayúsculas se ordenan solos en castellano, en la letra mental de un hombre que llevaba años queriendo decirlo.',
          '[[documento:Eran diez. Apunté nueve. La décima era Elvira Sanjurjo y no debía subir a esa barca.]] [[documento:Yo lo sabía y no la apunté, porque apuntarla era confesar que la dejé subir.]]',
          '[[documento:La luz cuenta a los que faltan y a ella nunca la encuentra en la lista. Por eso cuenta de más.]] [[documento:Por eso busca. Que alguien escriba su nombre donde yo no pude.]]',
        ),
        createThoughtEntry('own_reasoning', 'Falta un nombre en la lista, y es el de la madre de Renata. Ya no es una sospecha: está escrito.'),
      ],
      elapsedMinutes: 1,
      grantedLivedExperienceFlagNames: [
        lighthouseCaseFlagNames.essentialConclusionByDocument,
        lighthouseCaseFlagNames.knowsMissingName,
      ],
    }),
  },
}

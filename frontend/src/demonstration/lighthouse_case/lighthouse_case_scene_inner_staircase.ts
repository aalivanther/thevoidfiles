import {
  brotherPersonIdentifier,
  disorientationConditionIdentifier,
  lighthouseCaseFlagNames,
  lighthouseCaseSceneIdentifiers,
} from './lighthouse_case_persons'
import {
  createBranchCondition,
  createCaseActionBranch,
  createCaseBranchOutcome,
  createDialogueEntry,
  createNarrationEntry,
  createThoughtEntry,
} from './lighthouse_case_script_types'
import type { CaseBranchOutcome, CaseSceneDefinition } from './lighthouse_case_script_types'

const disorientationCondition = {
  conditionIdentifier: disorientationConditionIdentifier,
  visibleName: 'Desorientación',
  originText: 'Pasar del peldaño ciento ocho de la escalera del faro llevando la cuenta.',
  effectText: 'Las horas y las distancias dentro de la torre no son de fiar. Lo que {{nombre}} lee en un reloj puede no ser cierto.',
  exitText: 'Salir de la torre, o bajar y descansar un rato lejos de la escalera.',
}

function createCountedClimbOutcome(openingParagraph: string, elapsedMinutes: number): CaseBranchOutcome {
  return createCaseBranchOutcome({
    directorEntries: [
      createNarrationEntry(
        openingParagraph,
        'Ciento ocho peldaños según el plano. {{nombre}} cuenta ciento ocho. Se detiene, mira hacia arriba, y todavía queda [[un tramo entero]].',
        'En el peldaño ciento nueve hay una bota de hombre, erguida, con los cordones atados. Está tibia. {{nombre}} mira el reloj para anotar la hora y el reloj dice las [[interferencia:tres y doce]]. No las tres y pico. Las tres y doce, con el segundero clavado, igual que en el registro de abajo.',
        'Y la voz que contaba arriba ya no es la de un hombre cansado. Ha cambiado de timbre a mitad de una cifra, como una radio que encuentra otra emisora. Ahora es {{voz_perdida}}, muy cerca, del otro lado de la curva de la escalera.',
      ),
      createDialogueEntry(
        'voice_on_the_staircase',
        'whispered',
        '«[[susurro:Cuentas bien. Casi nadie cuenta tan bien.]] Falta uno nada más. Dime a quién quieres de vuelta. Dime el nombre y lo cuento por ti.»',
      ),
      createThoughtEntry(
        'intrusive_perception',
        'Sería tan fácil. Un nombre. Solo un nombre, y la cuenta cerraría.',
        'Ese pensamiento ha llegado con la cadencia de la voz, no con la de {{nombre}}. [[No es suyo.]]',
      ),
    ],
    elapsedMinutes,
    conditionsGained: [disorientationCondition],
    perceptionClarificationText:
      'Dentro de la torre, la hora que {{nombre}} percibe no es de fiar. El tiempo real ha seguido corriendo.',
    grantedLivedExperienceFlagNames: [lighthouseCaseFlagNames.voiceHasChanged],
    stagingEvents: [
      {
        kind: 'mental_attack',
        anchorEntryIndex: 0,
        anchorParagraphIndex: 2,
        falsifiedStatusReading: { statusFieldName: 'world_clock', falseVisibleText: '03:12' },
        rewrittenPastPhrase: null,
      },
    ],
  })
}

const becomingTheTenthOutcomeFields = {
  elapsedMinutes: 1,
  criticalFailureCauseText: 'Le dio al faro lo que el faro pide: un nombre que no era el suyo, dicho en voz alta en la escalera.',
  stagingEvents: [{ kind: 'critical_failure' as const, anchorEntryIndex: 0, anchorParagraphIndex: 1 }],
  archiveEndingIdentifier: 'death_became_the_tenth',
}

export const innerStaircaseScene: CaseSceneDefinition = {
  sceneIdentifier: lighthouseCaseSceneIdentifiers.innerStaircase,
  placeName: 'Faro · Escalera interior',
  tensionTierName: 'threatening',
  presentPersons: [],
  perceivedPointsOfInterest: [
    { identifier: 'staircase_point_voice', visibleName: 'La voz que cuenta, más arriba' },
    { identifier: 'staircase_point_plan', visibleName: 'El plano de la torre: ciento ocho peldaños' },
  ],
  arrivalEntries: [
    createNarrationEntry(
      'La escalera de caracol se enrosca hacia arriba sin barandilla por el lado del hueco. Desde algún punto de la espiral, una voz de hombre cuenta peldaños con la monotonía de quien lleva toda la noche haciéndolo y no puede parar. El reloj de {{nombre}} hace un ruido seco y el segundero se queda quieto.',
    ),
  ],
  actionBranches: [
    createCaseActionBranch({
      branchIdentifier: 'climb_inner_staircase',
      visibleText: 'Subir por la escalera interior contando los peldaños',
      actionGroupName: 'move',
      freeTextIntentPatternSources: ['sub\\w*.*cont\\w*', 'cont\\w*.*(peldanos|escalones)'],
      conditionalOutcomes: [
        {
          condition: createBranchCondition({ requiredLivedExperienceFlagNames: [lighthouseCaseFlagNames.staircaseWasAwakened] }),
          outcome: createCountedClimbOutcome(
            'La escalera ya estaba despierta: desde que chirrió la bisagra, cada peldaño devuelve el paso de {{nombre}} un instante antes de que lo dé. Aun así {{nombre}} sube contando, porque contar parece lo prudente.',
            19,
          ),
        },
      ],
      defaultOutcome: createCountedClimbOutcome(
        '{{nombre}} sube contando en voz baja, con la mano en el muro, porque contar parece lo prudente.',
        14,
      ),
    }),
    createCaseActionBranch({
      branchIdentifier: 'climb_without_counting',
      visibleText: 'Subir sin llevar ninguna cuenta, con la vista en el muro',
      actionGroupName: 'move',
      isRepeatable: true,
      freeTextIntentPatternSources: ['sin contar', 'no cont\\w*', 'sub\\w* (hasta|a) la linterna', 'segu\\w* subiendo'],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [
          createNarrationEntry(
            '{{nombre}} sube pensando en cualquier otra cosa: la lista de la compra, una canción, el nombre de una calle. Cada vez que un número intenta formarse, lo deja caer. La voz de la espiral se impacienta, tropieza en su cuenta, queda por debajo.',
            'Sin cuenta que llevar, la escalera no tiene dónde esconder un peldaño de más. El último tramo desemboca en una trampilla, y la trampilla en el cuarto de la linterna. La óptica gira despacio, apagada y, sin embargo, [[dando luz]].',
          ),
        ],
        elapsedMinutes: 12,
        newPlaceName: 'Faro · Cuarto de la linterna',
        shouldUpdateJournal: false,
        nextSceneIdentifier: lighthouseCaseSceneIdentifiers.lanternRoom,
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'call_brother_by_his_name',
      visibleText: 'Llamar a Tomás por su nombre, hacia arriba, sin subir',
      actionGroupName: 'speak',
      visibilityCondition: createBranchCondition({ requiredLivedExperienceFlagNames: [lighthouseCaseFlagNames.askedAboutBrother] }),
      freeTextIntentPatternSources: ['tomas', 'llam\\w* al hermano', 'grit\\w* (su|el) nombre'],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [
          createNarrationEntry('{{nombre}} hace bocina con las manos y llama hacia el hueco: «¡Tomás! ¡Tomás Oquendo!». La cuenta de arriba se corta en seco.'),
          createDialogueEntry(
            brotherPersonIdentifier,
            'heard_from_afar',
            '«…¿Quién…? No suba contando. [[pausa:400]]Por lo que más quiera, no suba contando. Y si le pregunta por alguien, [[grito:no le dé ningún nombre]]. Yo se lo di. Yo le dije el de mi madre.»',
          ),
          createNarrationEntry('Después la voz vuelve a contar, arrastrada, como si algo tirara de ella hacia los números.'),
        ],
        elapsedMinutes: 3,
        grantedLivedExperienceFlagNames: [lighthouseCaseFlagNames.calledBrotherByName],
        relationshipChanges: [
          {
            personIdentifier: brotherPersonIdentifier,
            directionName: 'toward_investigator_as_perceived',
            dimensionName: null,
            levelChange: 1,
            perceptibleCauseText: 'Alguien lo llamó por su nombre cuando llevaba una noche entera siendo solo un número.',
          },
        ],
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'examine_warm_boot',
      visibleText: 'Examinar la bota tibia del peldaño ciento nueve',
      actionGroupName: 'examine',
      visibilityCondition: createBranchCondition({ requiredLivedExperienceFlagNames: [lighthouseCaseFlagNames.voiceHasChanged] }),
      freeTextIntentPatternSources: ['bota'],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [
          createNarrationEntry(
            'Es una bota de trabajo, talla grande, con barro fresco del pie del faro en la suela. Las huellas que entraban y no salían. Dentro, el calor es el de un pie que acabara de sacarse. {{nombre}} la levanta y debajo no hay peldaño: hay la [[sombra de un peldaño]], pintada en el aire, que aguanta el peso igual.',
            'El plano dice ciento ocho. Este escalón no figura. Alguien está guardado aquí, en un sitio que la torre se inventó para guardarlo.',
          ),
        ],
        elapsedMinutes: 4,
        stagingEvents: [{ kind: 'anomaly_manifested', anchorEntryIndex: 0, anchorParagraphIndex: 0 }],
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'answer_voice_with_own_name',
      visibleText: 'Contestarle a la voz solo con el nombre propio, completo',
      actionGroupName: 'speak',
      visibilityCondition: createBranchCondition({ requiredLivedExperienceFlagNames: [lighthouseCaseFlagNames.voiceHasChanged] }),
      freeTextIntentPatternSources: ['mi (propio )?nombre', 'nombre propio', 'dig\\w* quien soy'],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [
          createNarrationEntry(
            '«{{nombre_completo}}», dice {{nombre}}, y nada más. Ni una sílaba que no le pertenezca.',
            'La voz calla. Es un silencio ofendido, de ventanilla que se cierra. Durante un momento largo la escalera es solo una escalera, y el peldaño ciento nueve parece más delgado que antes, como si dudara de sí mismo.',
          ),
          createThoughtEntry('own_reasoning', 'Pide nombres ajenos. El propio no le sirve. El propio, de hecho, parece estorbarle.'),
        ],
        elapsedMinutes: 2,
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'give_the_voice_the_name_it_asks_for',
      visibleText: 'Decirle a la voz el nombre de quien {{nombre}} quiere de vuelta',
      actionGroupName: 'speak',
      visibilityCondition: createBranchCondition({ requiredLivedExperienceFlagNames: [lighthouseCaseFlagNames.voiceHasChanged] }),
      freeTextIntentPatternSources: ['(dig\\w*|dec\\w*|dar\\w*|doy) (el|un|ese) nombre', 'quiero de vuelta', 'que me devuelva', 'respond\\w* a la voz', 'nombre de mi'],
      defaultOutcome: createCaseBranchOutcome({
        ...becomingTheTenthOutcomeFields,
        directorEntries: [
          createNarrationEntry(
            '{{nombre}} lo dice. El nombre sale entero, con todo lo que pesa, y la escalera lo recibe como un mostrador recibe una moneda.',
            '[[lento:La voz da las gracias. Luego cuenta: «…y diez».]] El peldaño ciento nueve ya no está delante. Está [[temblor:debajo]].',
            'Abajo, muy lejos, una mujer con un abrigo demasiado grande levanta la vista hacia la torre y empieza una página nueva en su libreta.',
          ),
        ],
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'keep_counting_past_the_plan',
      visibleText: 'Seguir contando en voz alta más allá del ciento ocho',
      actionGroupName: 'speak',
      visibilityCondition: createBranchCondition({
        requiredLivedExperienceFlagNames: [lighthouseCaseFlagNames.voiceHasChanged],
        requiredActiveConditionIdentifiers: [disorientationConditionIdentifier],
      }),
      freeTextIntentPatternSources: ['segu\\w* contando', 'ciento (nueve|diez)', 'cont\\w* mas alla'],
      defaultOutcome: createCaseBranchOutcome({
        ...becomingTheTenthOutcomeFields,
        criticalFailureCauseText: 'Siguió contando en voz alta más allá del último peldaño del plano, con la cabeza ya tomada por la torre.',
        directorEntries: [
          createNarrationEntry(
            'Ciento nueve. Ciento diez. La voz cuenta a la par, encantada, medio tono por debajo. Ciento once. A partir de cierto número {{nombre}} ya no sabe cuál de las dos voces es la suya, y a partir de otro deja de importar.',
            '[[lento:Quien cuenta para el faro acaba siendo contado.]] El peldaño de más ya no está delante. Está [[temblor:debajo]].',
            'Abajo, muy lejos, una mujer con un abrigo demasiado grande levanta la vista hacia la torre y empieza una página nueva en su libreta.',
          ),
        ],
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'descend_to_keeper_room',
      visibleText: 'Bajar al cuarto del farero y sentarse un rato lejos de la escalera',
      actionGroupName: 'move',
      isRepeatable: true,
      freeTextIntentPatternSources: ['baj\\w*', 'descans\\w*', 'volv\\w* abajo'],
      conditionalOutcomes: [
        {
          condition: createBranchCondition({ requiredActiveConditionIdentifiers: [disorientationConditionIdentifier] }),
          outcome: createCaseBranchOutcome({
            directorEntries: [
              createNarrationEntry(
                '{{nombre}} baja de espaldas al hueco, sin contar, y se sienta en la silla del farero con los ojos cerrados hasta que el pulso y el segundero vuelven a ponerse de acuerdo. Cuando mira otra vez el reloj, la hora es una hora cualquiera, fea y verdadera.',
              ),
            ],
            elapsedMinutes: 15,
            newPlaceName: 'Faro · Cuarto del farero',
            conditionIdentifiersEnded: [disorientationConditionIdentifier],
            shouldUpdateJournal: false,
            nextSceneIdentifier: lighthouseCaseSceneIdentifiers.keeperRoom,
          }),
        },
      ],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [createNarrationEntry('{{nombre}} baja la espiral sin contar. El cuarto del farero sigue como estaba; la voz queda arriba.')],
        elapsedMinutes: 5,
        newPlaceName: 'Faro · Cuarto del farero',
        shouldUpdateJournal: false,
        nextSceneIdentifier: lighthouseCaseSceneIdentifiers.keeperRoom,
      }),
    }),
  ],
  freeTextFallbackOutcome: createCaseBranchOutcome({
    directorEntries: [
      createNarrationEntry(
        '{{nombre}} lo intenta, y la escalera devuelve el gesto un instante antes de que termine, como un espejo con prisa. No sirve de nada aquí. Arriba, la voz sigue con su cuenta; no ha perdido ni un número.',
      ),
    ],
    elapsedMinutes: 3,
    shouldUpdateJournal: false,
  }),
  interactivePieceSolvedOutcomes: {},
}

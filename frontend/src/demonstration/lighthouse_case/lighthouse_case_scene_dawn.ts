import {
  boatmanPersonIdentifier,
  brotherPersonIdentifier,
  lighthouseCaseFlagNames,
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
import type { CaseActionBranch, CaseBranchOutcome, CaseSceneDefinition } from './lighthouse_case_script_types'

export const dawnArchiveEndingRequestIdentifier = 'resolved_at_dawn'

export const retreatWithRenataBranch: CaseActionBranch = createCaseActionBranch({
  branchIdentifier: 'evacuate_renata_and_withdraw',
  visibleText: 'Retirarse con Renata y esperar el amanecer lejos de la torre',
  actionGroupName: 'withdraw',
  freeTextIntentPatternSources: ['retir\\w*', 'me voy', 'huir', 'huyo', 'abandon\\w* el faro', 'esper\\w* (el|al) amanecer', 'sac\\w* a renata'],
  defaultOutcome: createCaseBranchOutcome({
    directorEntries: [
      createNarrationEntry(
        '{{nombre}} decide que esta noche no se gana. Toma a Renata del brazo y la aleja de la torre; ella se deja llevar mirando hacia atrás, hacia arriba, moviendo los labios sin voz. Desde la lancha ven pasar el décimo destello sobre las casas, lento, deteniéndose en cada puerta.',
        'Se detiene más tiempo en una. Al amanecer, esa casa tiene la mesa puesta para dos y nadie dentro. Retirarse conserva la vida. No siempre conserva lo demás.',
      ),
      createDialogueEntry(
        renataPersonIdentifier,
        'whispered',
        '«Él sigue ahí arriba.» No es un reproche. Es peor: es una cuenta que ella va a seguir llevando sola.',
      ),
    ],
    elapsedMinutes: 25,
    newPlaceName: 'Punta Ánimas · Muelle viejo',
    grantedLivedExperienceFlagNames: [lighthouseCaseFlagNames.resolutionByRetreat, lighthouseCaseFlagNames.houseWasTaken],
    relationshipChanges: [
      {
        personIdentifier: renataPersonIdentifier,
        directionName: 'toward_investigator_as_perceived',
        dimensionName: null,
        levelChange: -2,
        perceptibleCauseText: 'La sacaron de allí con vida, y su hermano se quedó dentro de la torre.',
      },
    ],
    nextSceneIdentifier: lighthouseCaseSceneIdentifiers.dawnPier,
  }),
})

const lateBoatmanTestimonyOutcome: CaseBranchOutcome = createCaseBranchOutcome({
  directorEntries: [
    createNarrationEntry('Con la luz del día encima, el lanchero parece diez años más viejo y bastante menos asustado. Espera a que {{nombre}} termine la pregunta y contesta sin rodeos, como quien paga una cuenta atrasada.'),
    createDialogueEntry(
      boatmanPersonIdentifier,
      'spoken',
      '«Mi padre los vio embarcar. Contó [[diez]]. El parte dijo nueve. La décima era la Elvira, la madre de los Oquendo: no tenía que ir a bordo, el farero lo sabía y no la apuntó. Eso es todo lo que hay. Eso es lo que lleva contando esa torre desde entonces.»',
    ),
  ],
  elapsedMinutes: 8,
  additionalWitnessedOriginIdentifiers: ['boatman_testimony_heard'],
  grantedLivedExperienceFlagNames: [
    lighthouseCaseFlagNames.essentialConclusionByTestimony,
    lighthouseCaseFlagNames.knowsMissingName,
  ],
  relationshipChanges: [
    {
      personIdentifier: boatmanPersonIdentifier,
      directionName: 'from_investigator',
      dimensionName: null,
      levelChange: 1,
      perceptibleCauseText: 'Cumplió la espera hasta el alba y además contó lo que su padre vio en 1987.',
    },
  ],
})

export const dawnPierScene: CaseSceneDefinition = {
  sceneIdentifier: lighthouseCaseSceneIdentifiers.dawnPier,
  placeName: 'Punta Ánimas · Muelle viejo',
  tensionTierName: 'calm',
  presentPersons: [
    {
      personIdentifier: renataPersonIdentifier,
      presenceText: 'Sentada en un noray, con la libreta cerrada sobre las rodillas.',
      presenceCondition: null,
    },
    {
      personIdentifier: brotherPersonIdentifier,
      presenceText: 'Descalzo, envuelto en una manta de la lancha, mirando el agua como si fuera nueva.',
      presenceCondition: createBranchCondition({ requiredLivedExperienceFlagNames: [lighthouseCaseFlagNames.brotherWasFreed] }),
    },
    {
      personIdentifier: boatmanPersonIdentifier,
      presenceText: 'Cumplió: la lancha sigue amarrada con su nudo corto.',
      presenceCondition: createBranchCondition({ requiredLivedExperienceFlagNames: [lighthouseCaseFlagNames.boatmanWasPaid] }),
    },
  ],
  perceivedPointsOfInterest: [
    { identifier: 'dawn_point_tower', visibleName: 'La torre, a la luz gris de la mañana' },
    { identifier: 'dawn_point_report', visibleName: 'El formulario del informe, todavía en blanco' },
  ],
  arrivalEntries: [
    createNarrationEntry(
      'Amanece gris sobre Punta Ánimas. A la luz del día el faro es una torre apagada con la puerta entreabierta, y cuesta creer que haya sido otra cosa. Las gaviotas vuelven a posarse en la galería. El reloj de {{nombre}} anda.',
    ),
  ],
  actionBranches: [
    createCaseActionBranch({
      branchIdentifier: 'say_goodbye_to_renata',
      visibleText: 'Despedirse de Renata antes de embarcar',
      actionGroupName: 'speak',
      freeTextIntentPatternSources: ['desped\\w*', 'habl\\w* con renata', 'renata'],
      conditionalOutcomes: [
        {
          condition: createBranchCondition({ requiredLivedExperienceFlagNames: [lighthouseCaseFlagNames.renataConsentedToName] }),
          outcome: createCaseBranchOutcome({
            directorEntries: [
              createDialogueEntry(
                renataPersonIdentifier,
                'spoken',
                '«He arrancado la última página de la libreta. La de los diez.» Se la tiende a {{nombre}}, doblada en cuatro. «Para su informe, o para lo que usted guarde. Yo ya no tengo que contar nada. Si alguna vez vuelve por esta costa, en mi casa hay sitio y hay café.»',
              ),
            ],
            elapsedMinutes: 5,
            relationshipChanges: [
              {
                personIdentifier: renataPersonIdentifier,
                directionName: 'from_investigator',
                dimensionName: 'affection',
                levelChange: 2,
                perceptibleCauseText: 'Se despidió ofreciendo su casa y la última página de su libreta.',
              },
            ],
          }),
        },
        {
          condition: createBranchCondition({ requiredLivedExperienceFlagNames: [lighthouseCaseFlagNames.resolutionByRetreat] }),
          outcome: createCaseBranchOutcome({
            directorEntries: [
              createDialogueEntry(
                renataPersonIdentifier,
                'spoken',
                '«Váyase tranquilamente. Usted hizo lo que pudo y yo estoy viva, que ya es más de lo que tiene mi hermano.» Abre la libreta por una página limpia. «Esta noche vuelvo a contar. Alguien tiene que saber cuántos da.»',
              ),
            ],
            elapsedMinutes: 4,
          }),
        },
        {
          condition: createBranchCondition({ requiredLivedExperienceFlagNames: [lighthouseCaseFlagNames.resolutionByContainment] }),
          outcome: createCaseBranchOutcome({
            directorEntries: [
              createDialogueEntry(
                renataPersonIdentifier,
                'spoken',
                '«Anoche no alumbró ninguna puerta. Eso se lo debo.» Mira la torre. «Pero yo lo oigo desde aquí, ¿sabe? Sigue contando ahí dentro, a oscuras. ¿Cuánto aguantan esas placas? ¿Y cuánto aguanta él?»',
              ),
              createNarrationEntry('{{nombre}} no tiene esa respuesta, y no la inventa.'),
            ],
            elapsedMinutes: 4,
          }),
        },
      ],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [
          createDialogueEntry(
            renataPersonIdentifier,
            'spoken',
            '«Bajó. Eso no se me va a olvidar.» Aprieta la mano de {{nombre}} con las dos suyas, una sola vez, fuerte. «Buen viaje. Y no cuente nada en voz alta durante unos días, por si acaso.»',
          ),
        ],
        elapsedMinutes: 4,
        relationshipChanges: [
          {
            personIdentifier: renataPersonIdentifier,
            directionName: 'from_investigator',
            dimensionName: null,
            levelChange: 1,
            perceptibleCauseText: 'Se despidió con un apretón de manos y un consejo dicho en serio.',
          },
        ],
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'speak_with_freed_brother',
      visibleText: 'Sentarse un momento junto al hombre de la manta',
      actionGroupName: 'speak',
      visibilityCondition: createBranchCondition({ requiredLivedExperienceFlagNames: [lighthouseCaseFlagNames.brotherWasFreed] }),
      freeTextIntentPatternSources: ['tomas', 'hermano', 'hombre de la manta', 'hombre descalzo'],
      conditionalOutcomes: [
        {
          condition: createBranchCondition({ requiredLivedExperienceFlagNames: [lighthouseCaseFlagNames.resolutionByRepair] }),
          outcome: createCaseBranchOutcome({
            directorEntries: [
              createDialogueEntry(
                brotherPersonIdentifier,
                'spoken',
                '«Tomás Oquendo.» Da la mano como quien comprueba que todavía tiene. «Allí arriba yo era un número. Oí cómo se escribía un nombre, letra por letra, y de pronto la escalera tenía los peldaños justos. ¿Quién lo escribió? ¿Fue usted?» Asiente despacio. «Entonces le debo una madre apuntada y una vida. No sé cómo se paga eso, pero lo debo.»',
              ),
            ],
            elapsedMinutes: 6,
            relationshipChanges: [
              {
                personIdentifier: brotherPersonIdentifier,
                directionName: 'from_investigator',
                dimensionName: 'debt',
                levelChange: 2,
                perceptibleCauseText: 'Reconoció en voz alta una deuda de gratitud que nadie le reclamó.',
              },
            ],
          }),
        },
        {
          condition: createBranchCondition({ requiredLivedExperienceFlagNames: [lighthouseCaseFlagNames.resolutionByForeignLight] }),
          outcome: createCaseBranchOutcome({
            directorEntries: [
              createDialogueEntry(
                brotherPersonIdentifier,
                'spoken',
                '«Tomás Oquendo. Gracias por sacarme.» Lo dice mirando el agua, no a {{nombre}}. «Subí a pedir a mi madre. Mientras la cuenta seguía abierta, había por dónde. Usted la rompió. Estoy vivo y ella ya no tiene camino.» Se ciñe la manta. «No es justo que se lo eche en cara. Se lo echo igual.»',
              ),
            ],
            elapsedMinutes: 5,
          }),
        },
      ],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [
          createDialogueEntry(
            brotherPersonIdentifier,
            'spoken',
            '«Tomás Oquendo.» Tose, todavía. «Lo oí decir su nombre allá arriba. El suyo, no el de otro. Yo no tuve esa cabeza: yo di el de mi madre, y la torre me cobró a mí.» Mira el costado de {{nombre}}, la forma de respirar corto. «Ese golpe era mío. No se me olvida quién lo recibió.»',
          ),
        ],
        elapsedMinutes: 5,
        relationshipChanges: [
          {
            personIdentifier: brotherPersonIdentifier,
            directionName: 'from_investigator',
            dimensionName: 'debt',
            levelChange: 1,
            perceptibleCauseText: 'Reconoció que el golpe del faro era para él y lo recibió otra persona.',
          },
        ],
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'ask_boatman_at_dawn',
      visibleText: 'Preguntar al lanchero, ya con luz, por la noche de 1987',
      actionGroupName: 'speak',
      visibilityCondition: createBranchCondition({
        forbiddenLivedExperienceFlagNames: [
          lighthouseCaseFlagNames.knowsMissingName,
          lighthouseCaseFlagNames.boatmanClosedForTonight,
        ],
      }),
      freeTextIntentPatternSources: ['lanchero', '1987', 'naufragio'],
      conditionalOutcomes: [
        {
          condition: createBranchCondition({ requiredLivedExperienceFlagNames: [lighthouseCaseFlagNames.boatmanWasPaid] }),
          outcome: lateBoatmanTestimonyOutcome,
        },
        {
          condition: createBranchCondition({
            minimumRelationshipLevels: [
              { personIdentifier: boatmanPersonIdentifier, directionName: 'toward_investigator_as_perceived', minimumLevel: 4 },
            ],
          }),
          outcome: lateBoatmanTestimonyOutcome,
        },
      ],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [
          createNarrationEntry(
            'La lancha que trajo a {{nombre}} no está. Nadie le pagó la espera ni le dio motivos para quedarse, y el lanchero se fue con la última oscuridad. El que recoge pasajeros esta mañana es un muchacho que no había nacido en 1987 y que prefiere hablar de fútbol.',
          ),
        ],
        elapsedMinutes: 3,
        shouldUpdateJournal: false,
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'sign_report_on_the_boat',
      visibleText: 'Redactar el informe en la lancha y cerrar el Archivo',
      actionGroupName: 'withdraw',
      freeTextIntentPatternSources: ['informe', 'cerr\\w* el archivo', 'embarc\\w*', 'me voy', 'termin\\w*'],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [
          createThoughtEntry('own_reasoning', 'Lo que se sabe, se escribe. Lo que no se sabe, se deja en blanco. Inventar es otra forma de contar de más.'),
        ],
        elapsedMinutes: 20,
        shouldUpdateJournal: false,
        archiveEndingIdentifier: dawnArchiveEndingRequestIdentifier,
      }),
    }),
  ],
  freeTextFallbackOutcome: createCaseBranchOutcome({
    directorEntries: [
      createNarrationEntry(
        '{{nombre}} lo intenta, y la mañana lo deja pasar sin comentario. Después de una noche así, casi todo lo que se hace de día parece pequeño. El informe sigue esperando.',
      ),
    ],
    elapsedMinutes: 3,
    shouldUpdateJournal: false,
  }),
  interactivePieceSolvedOutcomes: {},
}

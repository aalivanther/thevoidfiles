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

export const towerFootScene: CaseSceneDefinition = {
  sceneIdentifier: lighthouseCaseSceneIdentifiers.towerFoot,
  placeName: 'Punta Ánimas · Pie del faro',
  tensionTierName: 'uneasy',
  presentPersons: [
    {
      personIdentifier: renataPersonIdentifier,
      presenceText: 'Se ha quedado a unos pasos de la puerta, con la libreta cerrada y la vista en lo alto.',
      presenceCondition: null,
    },
  ],
  perceivedPointsOfInterest: [
    { identifier: 'tower_foot_point_watch_register', visibleName: 'El registro de guardia clavado junto a la puerta' },
    { identifier: 'tower_foot_point_service_door', visibleName: 'La puerta de servicio, en la cara norte' },
    { identifier: 'tower_foot_point_main_door', visibleName: 'La puerta principal, entreabierta' },
  ],
  arrivalEntries: [
    createNarrationEntry(
      'Al pie de la torre el viento se corta de golpe. La puerta principal sigue entreabierta el mismo palmo. El registro de guardia cruje en su clavo. Arriba, el haz da otra vuelta.',
    ),
  ],
  actionBranches: [
    createCaseActionBranch({
      branchIdentifier: 'examine_watch_register',
      visibleText: 'Examinar el registro de guardia clavado junto a la puerta del faro',
      actionGroupName: 'examine',
      freeTextIntentPatternSources: ['registro( de guardia)?', 'le\\w* el registro', 'hoja clavada', 'turnos'],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [
          createNarrationEntry(
            'El registro está hinchado por la sal, pero la tinta reciente resiste. Las entradas de 1987 terminan a media frase. Debajo, con bolígrafo azul, alguien ha seguido anotando turnos que nadie hizo.',
            'Cada entrada nueva lleva la misma hora: [[documento:03:12]]. Tres, doce. Tres, doce. Una columna entera, año tras año, con la paciencia de un candado.',
            '{{nombre}} mira su reloj. Marca las tres y veintitantos, y sin embargo el segundero lleva un rato largo [[sin moverse]].',
          ),
        ],
        elapsedMinutes: 9,
        grantedLivedExperienceFlagNames: [lighthouseCaseFlagNames.readWatchRegister],
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'inspect_service_door',
      visibleText: 'Rodear el faro y revisar la puerta de servicio',
      actionGroupName: 'examine',
      freeTextIntentPatternSources: ['puerta de servicio', 'rode\\w* (el|la) (faro|torre)', 'candado', 'huellas'],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [
          createNarrationEntry(
            'La puerta de servicio tiene candado nuevo sobre bisagras viejas: tres diales de latón, sin una mota de óxido. En el barro hay huellas de botas que entran. {{nombre}} busca las que salen. No las hay.',
            'Junto al marco, a la altura de los ojos, alguien rayó nueve marcas con una llave. La décima está más abajo, a la altura de un niño.',
            'Las bisagras cederían con una palanca y un empujón. También cantarían: el hierro viejo se oye en toda la torre, de abajo arriba, y aquí dentro hay algo que escucha.',
          ),
        ],
        elapsedMinutes: 8,
        grantedLivedExperienceFlagNames: [lighthouseCaseFlagNames.sawKeyMarks],
        presentedInteractivePieceIdentifiers: [lighthouseCaseInteractivePieceIdentifiers.serviceDoorLock],
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'force_service_door_hinge',
      visibleText: 'Forzar las bisagras viejas de la puerta de servicio',
      actionGroupName: 'use_or_spend',
      visibilityCondition: createBranchCondition({
        requiredLivedExperienceFlagNames: [lighthouseCaseFlagNames.sawKeyMarks],
        forbiddenLivedExperienceFlagNames: [lighthouseCaseFlagNames.machineRoomIsOpen],
      }),
      freeTextIntentPatternSources: ['forz\\w*', 'bisagra', 'palanca', 'romp\\w* (el candado|la puerta)', 'patada', 'derrib\\w*'],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [
          createNarrationEntry(
            '{{nombre}} mete una barra de hierro del muelle entre el marco y la hoja, y carga el peso. La primera bisagra aguanta. La segunda suelta un [[grito:chirrido]] largo que sube por dentro de la torre como por una garganta.',
            'Arriba, muy arriba, algo deja de contar un instante. Luego sigue, más rápido.',
          ),
          createDialogueEntry(
            renataPersonIdentifier,
            'shouted',
            '«¡No! ¡Así no! Esa puerta la cerró él con sus manos…» Renata da dos pasos atrás, tapándose los oídos. Tarda en volver a mirar a {{nombre}}, y cuando lo hace es de otra manera.',
          ),
          createNarrationEntry('La puerta cuelga de una sola bisagra. Dentro huele a grasa fría y a gasóleo de hace décadas.'),
        ],
        elapsedMinutes: 7,
        newPlaceName: 'Faro · Cuarto de máquinas',
        grantedLivedExperienceFlagNames: [
          lighthouseCaseFlagNames.staircaseWasAwakened,
          lighthouseCaseFlagNames.machineRoomIsOpen,
        ],
        interactivePieceStatusChanges: [
          {
            interactivePieceIdentifier: lighthouseCaseInteractivePieceIdentifiers.serviceDoorLock,
            resultingLifecycleStatusName: 'broken',
            brokenReasonPublicText: 'La puerta se abrió por las bisagras. El candado cuelga intacto de una argolla que ya no cierra nada.',
          },
        ],
        relationshipChanges: [
          {
            personIdentifier: renataPersonIdentifier,
            directionName: 'toward_investigator_as_perceived',
            dimensionName: null,
            levelChange: -1,
            perceptibleCauseText: 'La puerta de su maestro fue forzada delante de ella, y la torre entera lo oyó.',
          },
        ],
        nextSceneIdentifier: lighthouseCaseSceneIdentifiers.machineRoom,
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'enter_machine_room_again',
      visibleText: 'Entrar al cuarto de máquinas por la puerta de servicio',
      actionGroupName: 'move',
      visibilityCondition: createBranchCondition({ requiredLivedExperienceFlagNames: [lighthouseCaseFlagNames.machineRoomIsOpen] }),
      isRepeatable: true,
      freeTextIntentPatternSources: ['cuarto de maquinas', 'entr\\w* por (la puerta de )?servicio'],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [createNarrationEntry('{{nombre}} vuelve a cruzar la puerta de servicio. El olor a grasa fría sale a recibir.')],
        elapsedMinutes: 2,
        newPlaceName: 'Faro · Cuarto de máquinas',
        shouldUpdateJournal: false,
        nextSceneIdentifier: lighthouseCaseSceneIdentifiers.machineRoom,
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'enter_main_door',
      visibleText: 'Empujar la puerta principal y entrar al faro',
      actionGroupName: 'move',
      isRepeatable: true,
      freeTextIntentPatternSources: ['puerta principal', 'entr\\w* (al|en el) faro', 'empuj\\w* la puerta', 'cuarto del farero'],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [
          createNarrationEntry(
            'La puerta cede sin ruido, como si alguien la engrasara cada semana. Dentro hay una planta baja redonda, una mesa, una silla, una estufa muerta y el arranque de la escalera de caracol. El eco de los pasos de {{nombre}} tarda demasiado en volver.',
          ),
          createDialogueEntry(
            renataPersonIdentifier,
            'whispered',
            '«Yo me quedo en el umbral. No es miedo.» Lo piensa. «Sí es miedo. Pero también es que ahí dentro yo cuento sin querer, y no quiero contar.»',
          ),
        ],
        elapsedMinutes: 3,
        newPlaceName: 'Faro · Cuarto del farero',
        shouldUpdateJournal: false,
        nextSceneIdentifier: lighthouseCaseSceneIdentifiers.keeperRoom,
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'return_to_old_pier',
      visibleText: 'Volver al muelle viejo',
      actionGroupName: 'move',
      isRepeatable: true,
      freeTextIntentPatternSources: ['volv\\w* al muelle', 'regres\\w* al muelle', 'ir al muelle', 'a la lancha'],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [createNarrationEntry('{{nombre}} desanda los cuarenta metros hasta el muelle. Renata se queda donde está, mirando la torre.')],
        elapsedMinutes: 4,
        newPlaceName: 'Punta Ánimas · Muelle viejo',
        shouldUpdateJournal: false,
        nextSceneIdentifier: lighthouseCaseSceneIdentifiers.oldPier,
      }),
    }),
  ],
  freeTextFallbackOutcome: createCaseBranchOutcome({
    directorEntries: [
      createNarrationEntry(
        '{{nombre}} lo intenta, y la torre lo consiente con la indiferencia de las cosas muy viejas. No cambia nada que se pueda ver. La cal sigue cayendo en escamas; el haz sigue dando vueltas.',
      ),
      createThoughtEntry('own_reasoning', 'Hay dos puertas, un registro clavado y una mujer que no quiere entrar. Por ahí se empieza.'),
    ],
    elapsedMinutes: 4,
    shouldUpdateJournal: false,
  }),
  interactivePieceSolvedOutcomes: {
    [lighthouseCaseInteractivePieceIdentifiers.serviceDoorLock]: createCaseBranchOutcome({
      directorEntries: [
        createNarrationEntry(
          'Tres. Uno. Dos. El pestillo salta con un chasquido limpio, de mecanismo cuidado. La hora que el registro repite año tras año era también la llave: quien cerró esta puerta quería que solo entrara alguien que hubiera leído.',
          'La hoja gira sin un solo ruido. Dentro huele a grasa fría y a gasóleo de hace décadas. Arriba, nada ha dejado de contar.',
        ),
      ],
      elapsedMinutes: 1,
      newPlaceName: 'Faro · Cuarto de máquinas',
      grantedLivedExperienceFlagNames: [lighthouseCaseFlagNames.machineRoomIsOpen],
      nextSceneIdentifier: lighthouseCaseSceneIdentifiers.machineRoom,
    }),
  },
}

export const machineRoomScene: CaseSceneDefinition = {
  sceneIdentifier: lighthouseCaseSceneIdentifiers.machineRoom,
  placeName: 'Faro · Cuarto de máquinas',
  tensionTierName: 'uneasy',
  presentPersons: [],
  perceivedPointsOfInterest: [
    { identifier: 'machine_room_point_plates', visibleName: 'Un cajón de madera con placas de latón' },
    { identifier: 'machine_room_point_service_staircase', visibleName: 'La escalera de servicio, estrecha y tapiada a medias' },
  ],
  arrivalEntries: [
    createNarrationEntry(
      'El cuarto de máquinas es un nicho de hierro: un generador desmontado, bidones vacíos, y contra la pared un cajón de madera con el rótulo [[documento:OBTURADORES · NO MONTAR SIN ORDEN]]. Al fondo arranca una escalera de servicio, recta y estrecha, que sube pegada al muro por fuera del hueco de la escalera principal.',
    ),
  ],
  actionBranches: [
    createCaseActionBranch({
      branchIdentifier: 'take_shutter_plates',
      visibleText: 'Abrir el cajón y llevarse las placas de obturador',
      actionGroupName: 'use_or_spend',
      freeTextIntentPatternSources: ['placas?', 'obturador\\w*', 'cajon'],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [
          createNarrationEntry(
            'Dentro del cajón hay cinco placas de latón envueltas en papel encerado, cada una con un grabado distinto: una media luna, un círculo, una estrella, una cruz, un ojo abierto. Pesan como pesa lo que se hizo para durar.',
            'Pegada a la tapa, una nota a máquina del farero: [[documento:Con las cinco en su orden el haz no sale de la torre. No suelta nada. Solo calla.]]',
          ),
        ],
        elapsedMinutes: 6,
        grantedLivedExperienceFlagNames: [lighthouseCaseFlagNames.hasShutterPlates],
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'climb_service_staircase',
      visibleText: 'Subir a la linterna por la escalera de servicio',
      actionGroupName: 'move',
      isRepeatable: true,
      freeTextIntentPatternSources: ['escalera de servicio', 'sub\\w* (a la linterna|arriba)'],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [
          createNarrationEntry(
            'La escalera de servicio no tiene número de peldaños en ningún plano, y {{nombre}} decide no dárselo. Sube con la mano en el muro, sin contar. Al otro lado de la pared, en el hueco principal, alguien sí cuenta, con voz cansada. La voz queda abajo. Luego queda atrás.',
            'Una trampilla se abre al suelo del cuarto de la linterna. La óptica gira despacio sobre su baño de mercurio, apagada y, sin embargo, [[dando luz]].',
          ),
        ],
        elapsedMinutes: 11,
        newPlaceName: 'Faro · Cuarto de la linterna',
        shouldUpdateJournal: false,
        nextSceneIdentifier: lighthouseCaseSceneIdentifiers.lanternRoom,
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'leave_machine_room',
      visibleText: 'Salir otra vez al pie del faro',
      actionGroupName: 'move',
      isRepeatable: true,
      freeTextIntentPatternSources: ['sal\\w* (del cuarto|afuera|fuera)', 'volv\\w* al pie', 'pie del faro'],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [createNarrationEntry('{{nombre}} sale del cuarto de máquinas. Fuera, el aire de la noche parece tibio en comparación.')],
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
        '{{nombre}} prueba, y el cuarto de máquinas devuelve un eco corto, metálico, de sitio pequeño. Nada aquí responde a eso. El cajón sigue contra la pared; la escalera de servicio sigue subiendo.',
      ),
    ],
    elapsedMinutes: 3,
    shouldUpdateJournal: false,
  }),
  interactivePieceSolvedOutcomes: {},
}

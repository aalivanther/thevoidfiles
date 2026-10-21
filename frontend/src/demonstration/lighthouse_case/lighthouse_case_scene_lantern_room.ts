import {
  brotherPersonIdentifier,
  lighthouseCaseFlagNames,
  lighthouseCaseInteractivePieceIdentifiers,
  lighthouseCaseSceneIdentifiers,
} from './lighthouse_case_persons'
import {
  createBranchCondition,
  createCaseActionBranch,
  createCaseBranchOutcome,
  createNarrationEntry,
  createThoughtEntry,
} from './lighthouse_case_script_types'
import type { CaseSceneDefinition } from './lighthouse_case_script_types'

const galleryFallOutcomeFields = {
  elapsedMinutes: 1,
  criticalFailureCauseText: 'Volvió a cargar el cuerpo contra la barandilla vencida de la galería, a treinta metros de las rocas.',
  stagingEvents: [{ kind: 'critical_failure' as const, anchorEntryIndex: 0, anchorParagraphIndex: 1 }],
  archiveEndingIdentifier: 'death_gallery_fall',
}

export const lanternRoomScene: CaseSceneDefinition = {
  sceneIdentifier: lighthouseCaseSceneIdentifiers.lanternRoom,
  placeName: 'Faro · Cuarto de la linterna',
  tensionTierName: 'lethal',
  presentPersons: [],
  perceivedPointsOfInterest: [
    { identifier: 'lantern_room_point_optic', visibleName: 'La óptica, girando sobre su baño de mercurio' },
    { identifier: 'lantern_room_point_shutter_frame', visibleName: 'Un bastidor de latón con cinco ranuras vacías' },
    { identifier: 'lantern_room_point_gallery_door', visibleName: 'La puerta de hierro que da a la galería exterior' },
  ],
  arrivalEntries: [
    createNarrationEntry(
      'El cuarto de la linterna es una jaula de cristal de ocho caras. En el centro, la óptica gira sin motor que la mueva. No hay lámpara dentro: hay un hueco con la forma de una llama, y de ese hueco sale la luz. Nueve destellos. Una pausa larga, como si alguien tomara aire.',
      'Frente a la óptica hay un bastidor de latón con cinco ranuras vacías. En un rincón, lonas viejas que huelen a brea. Una puerta de hierro da a la galería exterior.',
    ),
  ],
  actionBranches: [
    createCaseActionBranch({
      branchIdentifier: 'stand_in_beam_and_answer',
      visibleText: 'Ponerse frente al haz cuando llegue el décimo destello y responder con el nombre propio',
      actionGroupName: 'speak',
      freeTextIntentPatternSources: ['frente al haz', 'decimo destello', 'respond\\w*', 'mi (propio )?nombre', 'nombre propio', 'plant\\w*'],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [
          createNarrationEntry(
            '{{nombre}} se planta en el centro del cuarto, de espaldas al muro macizo, lejos de los cristales. El décimo destello llega de pie y con los ojos abiertos. No es luz: es una [[pregunta]], y pesa. Pide un nombre. Cualquier nombre que no esté ya en la lista.',
            '«{{nombre_completo}}», responde {{nombre}}, con lo único cierto que tiene, completo y en voz alta.',
            'El golpe es de cuerpo entero. Lanza a {{nombre}} contra el zócalo de hierro y algo cruje en el costado, un [[temblor:dolor limpio y definitivo]]. Pero arriba la linterna duda por primera vez en treinta y nueve años. Y en el peldaño ciento nueve, un hombre descalzo empieza a toser.',
          ),
          createThoughtEntry('own_reasoning', 'El muro ha aguantado. Contra la barandilla de ahí fuera, este mismo golpe habría sido otra cosa.'),
        ],
        elapsedMinutes: 6,
        seriousWoundCauseText: 'El golpe del décimo destello, recibido de frente, contra el zócalo de hierro del cuarto de la linterna.',
        personIdentifiersBecomingKnown: [brotherPersonIdentifier],
        grantedLivedExperienceFlagNames: [lighthouseCaseFlagNames.resolutionByOwnName, lighthouseCaseFlagNames.brotherWasFreed],
        stagingEvents: [{ kind: 'attack_received', anchorEntryIndex: 0, anchorParagraphIndex: 2 }],
        relationshipChanges: [
          {
            personIdentifier: brotherPersonIdentifier,
            directionName: 'toward_investigator_as_perceived',
            dimensionName: 'debt',
            levelChange: 2,
            perceptibleCauseText: 'Alguien recibió el golpe del faro en su lugar, y él pudo bajar.',
          },
        ],
        newPlaceName: 'Punta Ánimas · Muelle viejo',
        nextSceneIdentifier: lighthouseCaseSceneIdentifiers.dawnPier,
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'ignite_flare_as_eleventh_light',
      visibleText: 'Encender una bengala dentro de la óptica para romper la cuenta',
      actionGroupName: 'use_or_spend',
      resourceCost: { kind: 'belonging', belongingIdentifier: 'signal_flare', units: 1 },
      freeTextIntentPatternSources: ['bengala', 'luz ajena', 'romp\\w* la cuenta', 'prend\\w* fuego'],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [
          createNarrationEntry(
            '{{nombre}} arranca la tapa de la bengala, la frota y la clava en el hueco con forma de llama. Arde roja en el centro de la óptica y los prismas la multiplican por toda la bahía. Nueve blancos, uno [[ajeno]], y ahora uno rojo que nadie pidió. La cuenta ya no cierra.',
            'El faro se apaga [[temblor:de golpe]], de verdad, como en 1987. En la escalera alguien llama a su hermana por su nombre con la voz rota de quien lleva una noche entera contando.',
            'Abajo, en el pueblo, se encienden ventanas. Una, cuatro, veinte. Punta Ánimas entera ha visto su faro muerto ponerse rojo. Mañana habrá alguien con un teléfono y ganas de contarlo.',
          ),
        ],
        elapsedMinutes: 7,
        personIdentifiersBecomingKnown: [brotherPersonIdentifier],
        grantedLivedExperienceFlagNames: [
          lighthouseCaseFlagNames.resolutionByForeignLight,
          lighthouseCaseFlagNames.brotherWasFreed,
          lighthouseCaseFlagNames.bayWitnessedTheLight,
        ],
        stagingEvents: [{ kind: 'attack_delivered', anchorEntryIndex: 0, anchorParagraphIndex: 1 }],
        relationshipChanges: [
          {
            personIdentifier: brotherPersonIdentifier,
            directionName: 'toward_investigator_as_perceived',
            dimensionName: null,
            levelChange: -1,
            perceptibleCauseText: 'Salió libre, pero con la cuenta rota su madre ya no tiene por dónde volver. Lo sabe, y mira a quien la rompió.',
          },
        ],
        newPlaceName: 'Punta Ánimas · Muelle viejo',
        nextSceneIdentifier: lighthouseCaseSceneIdentifiers.dawnPier,
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'write_missing_name_under_the_lamp',
      visibleText: 'Abrir el cuaderno del farero aquí mismo y escribir el nombre que falta',
      actionGroupName: 'use_or_spend',
      visibilityCondition: createBranchCondition({
        requiredLivedExperienceFlagNames: [lighthouseCaseFlagNames.carriesKeeperLogbook, lighthouseCaseFlagNames.knowsMissingName],
      }),
      freeTextIntentPatternSources: ['escrib\\w* (el nombre|elvira)', 'complet\\w* (la linea|el cuaderno|la lista)', 'apunt\\w*'],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [
          createNarrationEntry(
            '{{nombre}} apoya el cuaderno contra el bastidor vacío y, a la luz de lo mismo que quiere apagar, escribe junto al «10 —»: [[documento:Elvira Sanjurjo]]. La tinta no se corre.',
            'La pausa después del noveno destello se alarga, se alarga, y no se rompe. El hueco con forma de llama [[desvanece:se queda en hueco]]. La torre exhala un aire frío con olor a sal vieja, y por la trampilla sube el ruido de unos pies descalzos bajando peldaños, contados en voz alta para no perderse.',
          ),
        ],
        elapsedMinutes: 8,
        personIdentifiersBecomingKnown: [brotherPersonIdentifier],
        grantedLivedExperienceFlagNames: [lighthouseCaseFlagNames.resolutionByRepair, lighthouseCaseFlagNames.brotherWasFreed],
        relationshipChanges: [
          {
            personIdentifier: brotherPersonIdentifier,
            directionName: 'toward_investigator_as_perceived',
            dimensionName: 'debt',
            levelChange: 3,
            perceptibleCauseText: 'Bajó de la torre porque alguien escribió el nombre que cerraba la cuenta.',
          },
        ],
        newPlaceName: 'Punta Ánimas · Muelle viejo',
        nextSceneIdentifier: lighthouseCaseSceneIdentifiers.dawnPier,
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'mount_shutter_plates',
      visibleText: 'Montar las cinco placas de obturador en el bastidor',
      actionGroupName: 'use_or_spend',
      visibilityCondition: createBranchCondition({ requiredLivedExperienceFlagNames: [lighthouseCaseFlagNames.hasShutterPlates] }),
      freeTextIntentPatternSources: ['placas?', 'obturador\\w*', 'bastidor'],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [
          createNarrationEntry(
            '{{nombre}} desenvuelve las placas sobre el suelo de rejilla. El bastidor tiene cinco ranuras y, grabadas en el latón del marco, las instrucciones del fabricante en letra diminuta. Un orden. Solo uno deja el haz dentro de la torre.',
            'La nota del farero lo advertía: con las placas puestas el faro calla, y no suelta nada.',
          ),
        ],
        elapsedMinutes: 4,
        presentedInteractivePieceIdentifiers: [lighthouseCaseInteractivePieceIdentifiers.shutterPlateFrame],
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'photograph_the_optic',
      visibleText: 'Fotografiar la óptica mientras gira, sin mirar directamente el haz',
      actionGroupName: 'examine',
      freeTextIntentPatternSources: ['fotograf\\w*', 'foto', 'camara'],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [
          createNarrationEntry(
            '{{nombre}} dispara nueve veces con la cámara apoyada en el zócalo, mirando el suelo. En la pantalla, las nueve fotos muestran la linterna apagada y cubierta de polvo.',
            'Hay una décima foto que nadie tomó. Sale {{nombre}}, de espaldas, con la cámara en las manos, [[interferencia:desde dentro de la óptica]].',
          ),
        ],
        elapsedMinutes: 6,
        stagingEvents: [{ kind: 'anomaly_manifested', anchorEntryIndex: 0, anchorParagraphIndex: 1 }],
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'cover_lantern_room_windows',
      visibleText: 'Tapar los cristales de la linterna con las lonas del rincón',
      actionGroupName: 'use_or_spend',
      freeTextIntentPatternSources: ['lonas?', 'tap\\w* (los cristales|la linterna|las ventanas)', 'cubr\\w*'],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [
          createNarrationEntry(
            'Las lonas pesan y huelen a brea. {{nombre}} cubre tres de los ocho cristales justo cuando la pausa del noveno destello se acaba. Es el peor momento posible: el décimo pasa a través de la lona sin perder un ápice de brillo y la brea [[temblor:prende]].',
            '{{nombre}} arranca las lonas ardiendo y las tira por la puerta de la galería antes de que el fuego llegue al mercurio. Caen treinta metros, dando vueltas, hasta las rocas. Ya no hay lonas.',
            'Y el haz, estrechado por los tres cristales ennegrecidos, ya no recorre la orilla casa por casa. Se ha quedado [[fijo en una sola puerta]]. En esa casa se enciende una luz, se abre la puerta, y alguien sale en camisón a mirar hacia arriba.',
          ),
        ],
        elapsedMinutes: 16,
        criticalFailureCauseText: 'Las lonas se colocaron a destiempo: ardieron, se perdieron, y el haz quedó fijo sobre una sola casa del pueblo.',
        grantedLivedExperienceFlagNames: [lighthouseCaseFlagNames.tarpaulinsWereLost, lighthouseCaseFlagNames.houseWasTaken],
        stagingEvents: [{ kind: 'critical_failure', anchorEntryIndex: 0, anchorParagraphIndex: 0 }],
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'step_out_to_gallery',
      visibleText: 'Salir a la galería exterior por la puerta de hierro',
      actionGroupName: 'move',
      isRepeatable: true,
      freeTextIntentPatternSources: ['galeria', 'sal\\w* (afuera|fuera)', 'puerta de hierro'],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [createNarrationEntry('{{nombre}} empuja la puerta de hierro. El viento entra primero.')],
        elapsedMinutes: 1,
        newPlaceName: 'Faro · Galería exterior',
        shouldUpdateJournal: false,
        nextSceneIdentifier: lighthouseCaseSceneIdentifiers.outerGallery,
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'descend_from_lantern_room',
      visibleText: 'Bajar por la trampilla, sin contar',
      actionGroupName: 'move',
      isRepeatable: true,
      freeTextIntentPatternSources: ['baj\\w*', 'trampilla', 'volv\\w* abajo'],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [
          createNarrationEntry('{{nombre}} baja por la trampilla con la mente ocupada en cualquier cosa que no sea un número. La espiral lo consiente a regañadientes.'),
        ],
        elapsedMinutes: 9,
        newPlaceName: 'Faro · Cuarto del farero',
        shouldUpdateJournal: false,
        nextSceneIdentifier: lighthouseCaseSceneIdentifiers.keeperRoom,
      }),
    }),
  ],
  freeTextFallbackOutcome: createCaseBranchOutcome({
    directorEntries: [
      createNarrationEntry(
        'Lo que {{nombre}} intenta ocurre en mal momento: justo cuando la pausa después del noveno destello empieza a alargarse. El décimo llega, recorre el cuarto como una mirada, y esta vez pasa de largo. No ha servido. Tampoco ha costado nada todavía.',
      ),
    ],
    elapsedMinutes: 5,
    shouldUpdateJournal: false,
  }),
  interactivePieceSolvedOutcomes: {
    [lighthouseCaseInteractivePieceIdentifiers.shutterPlateFrame]: createCaseBranchOutcome({
      directorEntries: [
        createNarrationEntry(
          'La quinta placa entra en su ranura y las cinco se traban entre sí con un solo golpe sordo. El hueco con forma de llama sigue dando luz, pero la luz ya no sale: gira dentro de la jaula de latón como un animal que aprende el tamaño de su caja.',
          'Fuera, por primera vez en treinta y nueve años, la bahía está a oscuras una madrugada entera. Ninguna puerta recibe visita. Ninguna cuenta se cierra, tampoco. En algún punto de la escalera, una voz cansada sigue contando, y nadie va a bajar esta noche.',
        ),
        createThoughtEntry('own_reasoning', 'Callar no es soltar. El farero lo dejó escrito. Esto compra tiempo, y el tiempo tiene dueño.'),
      ],
      elapsedMinutes: 2,
      grantedLivedExperienceFlagNames: [lighthouseCaseFlagNames.resolutionByContainment],
      newPlaceName: 'Punta Ánimas · Muelle viejo',
      nextSceneIdentifier: lighthouseCaseSceneIdentifiers.dawnPier,
    }),
  },
}

export const outerGalleryScene: CaseSceneDefinition = {
  sceneIdentifier: lighthouseCaseSceneIdentifiers.outerGallery,
  placeName: 'Faro · Galería exterior',
  tensionTierName: 'lethal',
  presentPersons: [],
  perceivedPointsOfInterest: [
    { identifier: 'gallery_point_railing', visibleName: 'La barandilla de hierro, comida por la sal' },
    { identifier: 'gallery_point_lantern_door', visibleName: 'La puerta de hierro del cuarto de la linterna' },
  ],
  arrivalEntries: [
    createNarrationEntry(
      'La galería es un anillo de rejilla de un metro de ancho alrededor de la linterna, a treinta metros sobre las rocas. La barandilla está comida por la sal: al rozarla con la cadera cede un dedo hacia fuera, y un tornillo se suelta, rebota en la rejilla y cae. Tarda mucho en sonar abajo.',
      'Desde aquí el haz pasa a la altura del pecho. Nueve veces. Luego la pausa.',
    ),
  ],
  actionBranches: [
    createCaseActionBranch({
      branchIdentifier: 'test_gallery_railing',
      visibleText: 'Comprobar con la mano cuánto aguanta la barandilla',
      actionGroupName: 'examine',
      freeTextIntentPatternSources: ['comprob\\w*', 'barandilla', 'prob\\w* (la|el) (barandilla|hierro)'],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [
          createNarrationEntry(
            '{{nombre}} empuja la barandilla con la palma, sin cargar el cuerpo. Los montantes giran en sus bases como dientes flojos. Aguanta una mano. No aguantaría un hombro, y mucho menos un cuerpo lanzado contra ella.',
          ),
          createThoughtEntry('own_reasoning', 'Lo que haya que hacer frente a ese haz, mejor hacerlo con un muro detrás.'),
        ],
        elapsedMinutes: 2,
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'face_tenth_flash_on_gallery',
      visibleText: 'Esperar el décimo destello aquí fuera, de pie en la galería',
      actionGroupName: 'examine',
      visibilityCondition: createBranchCondition({ forbiddenLivedExperienceFlagNames: [lighthouseCaseFlagNames.railingIsBent] }),
      freeTextIntentPatternSources: ['decimo destello', 'frente al haz', 'esper\\w* (el|al) (destello|haz)', 'respond\\w*', 'plant\\w*'],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [
          createNarrationEntry(
            'El décimo destello encuentra a {{nombre}} de pie en la rejilla, con la bahía a la espalda. No es luz: es una [[pregunta]], y pesa. {{nombre}} abre la boca para contestar y no llega a la segunda sílaba.',
            'El golpe lanza el cuerpo entero contra la barandilla. El hierro [[temblor:cruje y se dobla]] hacia fuera, medio metro sobre el vacío, y aguanta por dos tornillos. Algo se ha roto también en el costado de {{nombre}}, con un dolor limpio y definitivo.',
            'La barandilla queda vencida, abierta como una puerta hacia las rocas. No va a parar un segundo golpe. No va a parar ni un tropiezo.',
          ),
        ],
        elapsedMinutes: 4,
        seriousWoundCauseText: 'El golpe del décimo destello, recibido en la galería exterior, contra una barandilla que se dobló sobre el vacío.',
        grantedLivedExperienceFlagNames: [lighthouseCaseFlagNames.railingIsBent],
        stagingEvents: [{ kind: 'attack_received', anchorEntryIndex: 0, anchorParagraphIndex: 1 }],
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'face_tenth_flash_on_gallery_again',
      visibleText: 'Volver a plantarse ante el décimo destello en el mismo sitio de la galería',
      actionGroupName: 'examine',
      visibilityCondition: createBranchCondition({ requiredLivedExperienceFlagNames: [lighthouseCaseFlagNames.railingIsBent] }),
      freeTextIntentPatternSources: ['decimo destello', 'frente al haz', 'otra vez', 'de nuevo', 'respond\\w*', 'plant\\w*'],
      defaultOutcome: createCaseBranchOutcome({
        ...galleryFallOutcomeFields,
        directorEntries: [
          createNarrationEntry(
            '{{nombre}} se coloca otra vez en la rejilla, con el costado ardiendo y la barandilla vencida a la espalda. Esta vez el nombre propio sale completo. El faro duda. Y golpea igual.',
            '[[lento:Los dos tornillos que quedaban no discuten.]] El hierro se abre, la rejilla se acaba, y hay treinta metros de aire hasta [[temblor:las rocas]].',
          ),
        ],
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'reach_optic_over_bent_railing',
      visibleText: 'Apoyarse en el tramo doblado para alcanzar la óptica por fuera',
      actionGroupName: 'use_or_spend',
      visibilityCondition: createBranchCondition({ requiredLivedExperienceFlagNames: [lighthouseCaseFlagNames.railingIsBent] }),
      freeTextIntentPatternSources: ['apoy\\w*', 'alcanz\\w* la optica', 'por fuera', 'trep\\w*', 'asom\\w*'],
      defaultOutcome: createCaseBranchOutcome({
        ...galleryFallOutcomeFields,
        directorEntries: [
          createNarrationEntry(
            '{{nombre}} pisa el travesaño doblado y estira el brazo hacia el cristal de la óptica. Faltan dos palmos. Carga un poco más de peso para ganar uno.',
            '[[lento:Los dos tornillos que quedaban no discuten.]] El hierro se abre, la rejilla se acaba, y hay treinta metros de aire hasta [[temblor:las rocas]].',
          ),
        ],
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'enter_lantern_room_from_gallery',
      visibleText: 'Entrar al cuarto de la linterna por la puerta de hierro',
      actionGroupName: 'move',
      isRepeatable: true,
      freeTextIntentPatternSources: ['entr\\w*', 'cuarto de la linterna', 'puerta de hierro', 'adentro'],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [createNarrationEntry('{{nombre}} entra y cierra la puerta de hierro a su espalda. El viento se queda fuera. El haz, no.')],
        elapsedMinutes: 1,
        newPlaceName: 'Faro · Cuarto de la linterna',
        shouldUpdateJournal: false,
        nextSceneIdentifier: lighthouseCaseSceneIdentifiers.lanternRoom,
      }),
    }),
  ],
  freeTextFallbackOutcome: createCaseBranchOutcome({
    directorEntries: [
      createNarrationEntry(
        '{{nombre}} lo intenta, y el viento de la galería se lo lleva a medias. Aquí fuera todo gesto tiene treinta metros de caída debajo. La rejilla vibra con cada paso; la barandilla no promete nada.',
      ),
    ],
    elapsedMinutes: 3,
    shouldUpdateJournal: false,
  }),
  interactivePieceSolvedOutcomes: {},
}

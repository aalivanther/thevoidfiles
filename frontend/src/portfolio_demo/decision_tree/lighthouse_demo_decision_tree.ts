import type { DemoDecisionTree } from './demo_decision_tree_types'

export const lighthouseDemoDecisionTree: DemoDecisionTree = {
  treeFormatVersion: 1,
  treeContentVersion: "2026-10-20.2",
  sourceSpecificationPath: "content/synthetic_cases/lighthouse_counts_one_more/case_specification.json",
  whisperIdentifier: "lighthouse_counts_one_more",
  archiveCaseIdentifier: "portfolio_demo_lighthouse_counts_one_more",
  archiveTitle: "El faro que cuenta de más",
  archiveNumberLabel: "01",
  fictionalDateLabel: "Archivo 01 · noche en Punta Ánimas",
  lostVoiceText: "la propia voz del Investigador, más joven, como sonaba en las grabaciones viejas",
  openingNarrationParagraphs: [
    "La lancha deja al Investigador en el muelle viejo de Punta Ánimas a las tres y doce de la madrugada. El lanchero no apaga el motor. Mira el faro, no a quien acaba de desembarcar.",
    "El faro lleva apagado desde 1987. Aun así, sobre el agua negra, un destello blanco barre la bahía. Luego otro. El Investigador los cuenta sin querer: nueve. Una pausa larga, como si alguien tomara aire. [[pausa:700]]Y un [[décimo]].",
    "El dosier de la OICNAU cabe en media página: un faro que no debería alumbrar, un hombre que subió anoche y no ha bajado, tres noches de plazo, y cuatro encargos escritos a máquina. Saber de dónde sale el décimo destello. Encontrar al hombre. Que no falte nadie más. Que no salga en los periódicos.",
    "Al final del muelle espera una mujer con un abrigo demasiado grande. Sostiene una libreta contra el pecho. La puerta del faro, a cuarenta metros, está entreabierta. Pegada a la torre, una escalera exterior de hierro sube hasta la galería, roja de óxido bajo cada destello."
  ],
  initialState: {
    firstNodeIdentifier: "pier_arrival",
    worldClockMinutes: 192,
    operationalFunds: 1800,
    belongingUnits: {
      signal_flare: 2,
      hand_lantern: 1,
      sealed_evidence_bag: 4
    }
  },
  belongingDefinitions: [
    {
      identifier: "signal_flare",
      visibleName: "Bengalas",
      visibleUnitDescription: "unidades"
    },
    {
      identifier: "hand_lantern",
      visibleName: "Linterna de mano",
      visibleUnitDescription: "unidad"
    },
    {
      identifier: "sealed_evidence_bag",
      visibleName: "Bolsas de evidencia",
      visibleUnitDescription: "unidades"
    }
  ],
  persons: [
    {
      personIdentifier: "renata_oquendo",
      knownName: "Renata Oquendo",
      aliasBeforeNameIsKnown: "La mujer de la libreta",
      silhouetteName: "long_coat_figure",
      initialLevelFromInvestigator: 2,
      initialLevelTowardInvestigator: 2,
      isRelationshipEstablishedAtOpening: true,
      openingRelationshipCauseText: "Esperaba al final del muelle viejo con una libreta contra el pecho. No hubo palabras todavía.",
      nameConcealment: {
        concealedNameTexts: [
          "Renata Oquendo",
          "Renata"
        ],
        replacementAtSentenceStart: "La mujer de la libreta",
        replacementInsideSentence: "la mujer de la libreta"
      }
    },
    {
      personIdentifier: "punta_animas_boatman",
      knownName: "El lanchero",
      aliasBeforeNameIsKnown: "El lanchero",
      silhouetteName: "capped_figure",
      initialLevelFromInvestigator: 1,
      initialLevelTowardInvestigator: 1,
      isRelationshipEstablishedAtOpening: true,
      openingRelationshipCauseText: "Una sola travesía nocturna hasta Punta Ánimas. No apagó el motor.",
      nameConcealment: null
    },
    {
      personIdentifier: "renata_brother",
      knownName: "Tomás Oquendo",
      aliasBeforeNameIsKnown: "El hombre descalzo de la escalera",
      silhouetteName: "close_figure",
      initialLevelFromInvestigator: 1,
      initialLevelTowardInvestigator: 1,
      isRelationshipEstablishedAtOpening: false,
      openingRelationshipCauseText: null,
      nameConcealment: null
    },
    {
      personIdentifier: "voice_on_the_staircase",
      knownName: "La voz de la escalera",
      aliasBeforeNameIsKnown: "La voz de la escalera",
      silhouetteName: "close_figure",
      initialLevelFromInvestigator: 0,
      initialLevelTowardInvestigator: 0,
      isRelationshipEstablishedAtOpening: false,
      openingRelationshipCauseText: null,
      nameConcealment: null
    }
  ],
  actions: [
    {
      actionIdentifier: "speak_with_waiting_woman",
      visibleText: "Hablar con la mujer que espera al final del muelle",
      actionGroupName: "speak",
      resourceCost: null,
      freeTextIntentPatternSources: [
        "habl\\w* con (la mujer|ella|renata)",
        "mujer del abrigo",
        "acerc\\w* a la mujer",
        "pregunt\\w* a la mujer"
      ],
      visibilityRequiredFlagNames: [],
      visibilityForbiddenFlagNames: [],
      outcome: {
        directorEntries: [
          {
            voice: "director_narration",
            markedParagraphs: [
              "La mujer no retrocede cuando el Investigador se acerca, pero tampoco suelta la libreta. Tiene las manos de quien ha trabajado con cabos y los ojos de quien lleva dos noches sin cerrarlos."
            ]
          },
          {
            voice: "character_dialogue",
            speakerPersonIdentifier: "renata_oquendo",
            deliveryName: "spoken",
            markedParagraphs: [
              "«Renata Oquendo. Fui la última aprendiz del farero, cuando esto todavía alumbraba barcos.» Habla bajo, sin dejar de mirar la linterna apagada de la torre.",
              "«Mi hermano subió anoche a contar. Decía que si contabas bien, el faro te devolvía a alguien. [[pausa:500]]No ha bajado.»"
            ]
          },
          {
            voice: "director_narration",
            markedParagraphs: [
              "Abre la libreta: columnas de palitos, noche tras noche, siempre nueve. La última página tiene diez, y el décimo está trazado con [[otra letra]]."
            ]
          }
        ],
        elapsedMinutes: 9,
        grantedLivedExperienceFlagNames: [
          "spoke_with_renata"
        ],
        personIdentifiersBecomingKnown: [
          "renata_oquendo"
        ],
        relationshipChanges: [
          {
            personIdentifier: "renata_oquendo",
            directionName: "toward_investigator_as_perceived",
            dimensionName: null,
            levelChange: 1,
            perceptibleCauseText: "Alguien la escuchó antes de entrar al faro, y ella abrió la libreta."
          },
          {
            personIdentifier: "renata_oquendo",
            directionName: "from_investigator",
            dimensionName: null,
            levelChange: 1,
            perceptibleCauseText: "Su relato coincide con los diez destellos contados al desembarcar."
          }
        ],
        stagingEvents: [],
        conditionsGained: [],
        conditionIdentifiersEnded: [],
        additionalWitnessedOriginIdentifiers: [],
        perceptionClarificationText: null,
        seriousWoundCauseText: null,
        criticalFailureCauseText: null,
        presentedInteractivePieceIdentifiers: [],
        shouldUpdateJournal: true,
        destination: {
          kind: "stay_in_node"
        }
      },
      conditionalOutcomes: []
    },
    {
      actionIdentifier: "listen_to_boatman_warning",
      visibleText: "Quedarse un momento junto a la lancha y dejar que el lanchero hable",
      actionGroupName: "speak",
      resourceCost: null,
      freeTextIntentPatternSources: [
        "escuch\\w* al lanchero",
        "dej\\w* que el lanchero",
        "habl\\w* con el lanchero",
        "convers\\w* con el lanchero"
      ],
      visibilityRequiredFlagNames: [],
      visibilityForbiddenFlagNames: [],
      outcome: {
        directorEntries: [
          {
            voice: "director_narration",
            markedParagraphs: [
              "El Investigador no pregunta nada. Se queda junto a la borda, con las manos quietas, y el silencio hace el trabajo. El lanchero aguanta tres destellos antes de romperlo."
            ]
          },
          {
            voice: "character_dialogue",
            speakerPersonIdentifier: "punta_animas_boatman",
            deliveryName: "spoken",
            markedParagraphs: [
              "«Yo traigo gente hasta aquí y me vuelvo. No subo. Nadie de la bahía sube.» Escupe al agua. «Le voy a decir una cosa y haga con ella lo que quiera: si oye que el faro dice su nombre, [[no conteste]]. Y si le pide otro nombre, menos.»"
            ]
          },
          {
            voice: "director_narration",
            markedParagraphs: [
              "El Investigador asiente sin sonreír. El lanchero lo nota, y algo en sus hombros baja un dedo. El Investigador no le ha dicho su nombre a nadie en este pueblo."
            ]
          }
        ],
        elapsedMinutes: 6,
        grantedLivedExperienceFlagNames: [
          "boatman_was_heard"
        ],
        personIdentifiersBecomingKnown: [],
        relationshipChanges: [
          {
            personIdentifier: "punta_animas_boatman",
            directionName: "toward_investigator_as_perceived",
            dimensionName: null,
            levelChange: 2,
            perceptibleCauseText: "Su advertencia fue escuchada en serio, sin burla y sin prisa."
          }
        ],
        stagingEvents: [],
        conditionsGained: [],
        conditionIdentifiersEnded: [],
        additionalWitnessedOriginIdentifiers: [],
        perceptionClarificationText: null,
        seriousWoundCauseText: null,
        criticalFailureCauseText: null,
        presentedInteractivePieceIdentifiers: [],
        shouldUpdateJournal: true,
        destination: {
          kind: "stay_in_node"
        }
      },
      conditionalOutcomes: []
    },
    {
      actionIdentifier: "pay_boatman_to_wait",
      visibleText: "Pagar al lanchero para que espere hasta el amanecer",
      actionGroupName: "use_or_spend",
      resourceCost: {
        kind: "operational_funds",
        amount: 120
      },
      freeTextIntentPatternSources: [
        "pag\\w* al lanchero",
        "que (me )?espere",
        "contrat\\w* al lanchero",
        "dar\\w* dinero al lanchero"
      ],
      visibilityRequiredFlagNames: [],
      visibilityForbiddenFlagNames: [],
      outcome: {
        directorEntries: [
          {
            voice: "director_narration",
            markedParagraphs: [
              "El lanchero cuenta los billetes dos veces y apaga por fin el motor. El silencio que queda es peor que el ruido."
            ]
          },
          {
            voice: "character_dialogue",
            speakerPersonIdentifier: "punta_animas_boatman",
            deliveryName: "spoken",
            markedParagraphs: [
              "«Hasta que claree, ni un minuto más. Y si oye que el faro dice su nombre, no conteste.»"
            ]
          },
          {
            voice: "director_narration",
            markedParagraphs: [
              "Amarra la lancha con un nudo corto, de los que se sueltan de un tirón."
            ]
          }
        ],
        elapsedMinutes: 5,
        grantedLivedExperienceFlagNames: [
          "boatman_was_paid"
        ],
        personIdentifiersBecomingKnown: [],
        relationshipChanges: [
          {
            personIdentifier: "punta_animas_boatman",
            directionName: "toward_investigator_as_perceived",
            dimensionName: "employment",
            levelChange: 1,
            perceptibleCauseText: "Cobró por adelantado y sin regateo la espera hasta el alba."
          }
        ],
        stagingEvents: [],
        conditionsGained: [],
        conditionIdentifiersEnded: [],
        additionalWitnessedOriginIdentifiers: [],
        perceptionClarificationText: null,
        seriousWoundCauseText: null,
        criticalFailureCauseText: null,
        presentedInteractivePieceIdentifiers: [],
        shouldUpdateJournal: true,
        destination: {
          kind: "stay_in_node"
        }
      },
      conditionalOutcomes: []
    },
    {
      actionIdentifier: "walk_to_tower_foot",
      visibleText: "Caminar hasta el pie del faro",
      actionGroupName: "move",
      resourceCost: null,
      freeTextIntentPatternSources: [
        "(ir|voy|camin\\w*|acerc\\w*) (hasta |a |al |hacia )?(el )?(pie del )?faro",
        "pie del faro",
        "puerta del faro"
      ],
      visibilityRequiredFlagNames: [],
      visibilityForbiddenFlagNames: [],
      outcome: {
        directorEntries: [
          {
            voice: "director_narration",
            markedParagraphs: [
              "El Investigador pasa junto a la mujer del abrigo sin detenerse. Ella abre la boca, la cierra, y echa a andar detrás, a diez pasos, como quien sigue un entierro ajeno.",
              "De cerca el faro es más viejo y más alto. La cal se cae a pedazos. La puerta principal está entreabierta un palmo exacto, y del interior sale un aire más frío que el de la noche."
            ]
          }
        ],
        elapsedMinutes: 5,
        grantedLivedExperienceFlagNames: [],
        personIdentifiersBecomingKnown: [],
        relationshipChanges: [],
        stagingEvents: [],
        conditionsGained: [],
        conditionIdentifiersEnded: [],
        additionalWitnessedOriginIdentifiers: [],
        perceptionClarificationText: null,
        seriousWoundCauseText: null,
        criticalFailureCauseText: null,
        presentedInteractivePieceIdentifiers: [],
        shouldUpdateJournal: true,
        destination: {
          kind: "move_to_node",
          nodeIdentifier: "tower_foot"
        }
      },
      conditionalOutcomes: [
        {
          requiredLivedExperienceFlagNames: [
            "spoke_with_renata"
          ],
          forbiddenLivedExperienceFlagNames: [],
          outcome: {
            directorEntries: [
              {
                voice: "director_narration",
                markedParagraphs: [
                  "El Investigador echa a andar hacia la torre y, sin que nadie se lo pida, Renata camina al lado. No dice nada. A veinte metros de la puerta empieza a contar los pasos en voz muy baja, se da cuenta, y se calla.",
                  "De cerca el faro es más viejo y más alto. La cal se cae a pedazos. La puerta principal está entreabierta un palmo exacto, y del interior sale un aire más frío que el de la noche."
                ]
              }
            ],
            elapsedMinutes: 5,
            grantedLivedExperienceFlagNames: [
              "renata_walks_along"
            ],
            personIdentifiersBecomingKnown: [],
            relationshipChanges: [],
            stagingEvents: [],
            conditionsGained: [],
            conditionIdentifiersEnded: [],
            additionalWitnessedOriginIdentifiers: [],
            perceptionClarificationText: null,
            seriousWoundCauseText: null,
            criticalFailureCauseText: null,
            presentedInteractivePieceIdentifiers: [],
            shouldUpdateJournal: true,
            destination: {
              kind: "move_to_node",
              nodeIdentifier: "tower_foot"
            }
          }
        }
      ]
    },
    {
      actionIdentifier: "examine_watch_register",
      visibleText: "Examinar el registro de guardia clavado junto a la puerta del faro",
      actionGroupName: "examine",
      resourceCost: null,
      freeTextIntentPatternSources: [
        "registro( de guardia)?",
        "le\\w* el registro",
        "hoja clavada",
        "turnos"
      ],
      visibilityRequiredFlagNames: [],
      visibilityForbiddenFlagNames: [],
      outcome: {
        directorEntries: [
          {
            voice: "director_narration",
            markedParagraphs: [
              "El registro está hinchado por la sal, pero la tinta reciente resiste. Las entradas de 1987 terminan a media frase. Debajo, con bolígrafo azul, alguien ha seguido anotando turnos que nadie hizo.",
              "Cada entrada nueva lleva la misma hora: [[documento:03:12]]. Tres, doce. Tres, doce. Una columna entera, año tras año, con la paciencia de un candado.",
              "El Investigador mira su reloj. Marca las tres y veintitantos, y sin embargo el segundero lleva un rato largo [[sin moverse]]."
            ]
          }
        ],
        elapsedMinutes: 9,
        grantedLivedExperienceFlagNames: [
          "read_watch_register"
        ],
        personIdentifiersBecomingKnown: [],
        relationshipChanges: [],
        stagingEvents: [],
        conditionsGained: [],
        conditionIdentifiersEnded: [],
        additionalWitnessedOriginIdentifiers: [],
        perceptionClarificationText: null,
        seriousWoundCauseText: null,
        criticalFailureCauseText: null,
        presentedInteractivePieceIdentifiers: [],
        shouldUpdateJournal: true,
        destination: {
          kind: "stay_in_node"
        }
      },
      conditionalOutcomes: []
    },
    {
      actionIdentifier: "inspect_service_door",
      visibleText: "Rodear el faro y revisar la puerta de servicio",
      actionGroupName: "examine",
      resourceCost: null,
      freeTextIntentPatternSources: [
        "puerta de servicio",
        "rode\\w* (el|la) (faro|torre)",
        "candado",
        "huellas"
      ],
      visibilityRequiredFlagNames: [],
      visibilityForbiddenFlagNames: [],
      outcome: {
        directorEntries: [
          {
            voice: "director_narration",
            markedParagraphs: [
              "La puerta de servicio tiene candado nuevo sobre bisagras viejas: tres diales de latón, sin una mota de óxido. En el barro hay huellas de botas que entran. El Investigador busca las que salen. No las hay.",
              "Junto al marco, a la altura de los ojos, alguien rayó nueve marcas con una llave. La décima está más abajo, a la altura de un niño.",
              "Las bisagras cederían con una palanca y un empujón. También cantarían: el hierro viejo se oye en toda la torre, de abajo arriba, y aquí dentro hay algo que escucha."
            ]
          }
        ],
        elapsedMinutes: 8,
        grantedLivedExperienceFlagNames: [
          "saw_key_marks"
        ],
        personIdentifiersBecomingKnown: [],
        relationshipChanges: [],
        stagingEvents: [],
        conditionsGained: [],
        conditionIdentifiersEnded: [],
        additionalWitnessedOriginIdentifiers: [],
        perceptionClarificationText: null,
        seriousWoundCauseText: null,
        criticalFailureCauseText: null,
        presentedInteractivePieceIdentifiers: [
          "interactive_piece_0001"
        ],
        shouldUpdateJournal: true,
        destination: {
          kind: "stay_in_node"
        }
      },
      conditionalOutcomes: []
    },
    {
      actionIdentifier: "enter_main_door",
      visibleText: "Empujar la puerta principal y entrar al faro",
      actionGroupName: "move",
      resourceCost: null,
      freeTextIntentPatternSources: [
        "puerta principal",
        "entr\\w* (al|en el) faro",
        "empuj\\w* la puerta",
        "cuarto del farero"
      ],
      visibilityRequiredFlagNames: [],
      visibilityForbiddenFlagNames: [],
      outcome: {
        directorEntries: [
          {
            voice: "director_narration",
            markedParagraphs: [
              "La puerta cede sin ruido, como si alguien la engrasara cada semana. Dentro hay una planta baja redonda, una mesa, una silla, una estufa muerta y el arranque de la escalera de caracol. El eco de los pasos del Investigador tarda demasiado en volver."
            ]
          },
          {
            voice: "character_dialogue",
            speakerPersonIdentifier: "renata_oquendo",
            deliveryName: "whispered",
            markedParagraphs: [
              "«Yo me quedo en el umbral. No es miedo.» Lo piensa. «Sí es miedo. Pero también es que ahí dentro yo cuento sin querer, y no quiero contar.»"
            ]
          }
        ],
        elapsedMinutes: 3,
        grantedLivedExperienceFlagNames: [],
        personIdentifiersBecomingKnown: [],
        relationshipChanges: [],
        stagingEvents: [],
        conditionsGained: [],
        conditionIdentifiersEnded: [],
        additionalWitnessedOriginIdentifiers: [],
        perceptionClarificationText: null,
        seriousWoundCauseText: null,
        criticalFailureCauseText: null,
        presentedInteractivePieceIdentifiers: [],
        shouldUpdateJournal: false,
        destination: {
          kind: "move_to_node",
          nodeIdentifier: "keeper_room"
        }
      },
      conditionalOutcomes: []
    },
    {
      actionIdentifier: "evacuate_renata_and_withdraw",
      visibleText: "Retirarse con Renata y esperar el amanecer lejos de la torre",
      actionGroupName: "withdraw",
      resourceCost: null,
      freeTextIntentPatternSources: [
        "retir\\w*",
        "me voy",
        "huir",
        "huyo",
        "abandon\\w* el faro",
        "esper\\w* (el|al) amanecer",
        "sac\\w* a renata"
      ],
      visibilityRequiredFlagNames: [],
      visibilityForbiddenFlagNames: [],
      outcome: {
        directorEntries: [
          {
            voice: "director_narration",
            markedParagraphs: [
              "El Investigador decide que esta noche no se gana. Toma a Renata del brazo y la aleja de la torre; ella se deja llevar mirando hacia atrás, hacia arriba, moviendo los labios sin voz. Desde la lancha ven pasar el décimo destello sobre las casas, lento, deteniéndose en cada puerta.",
              "Se detiene más tiempo en una. Al amanecer, esa casa tiene la mesa puesta para dos y nadie dentro. Retirarse conserva la vida. No siempre conserva lo demás."
            ]
          },
          {
            voice: "character_dialogue",
            speakerPersonIdentifier: "renata_oquendo",
            deliveryName: "whispered",
            markedParagraphs: [
              "«Él sigue ahí arriba.» No es un reproche. Es peor: es una cuenta que ella va a seguir llevando sola."
            ]
          }
        ],
        elapsedMinutes: 25,
        grantedLivedExperienceFlagNames: [
          "resolution_by_retreat",
          "house_was_taken"
        ],
        personIdentifiersBecomingKnown: [],
        relationshipChanges: [
          {
            personIdentifier: "renata_oquendo",
            directionName: "toward_investigator_as_perceived",
            dimensionName: null,
            levelChange: -2,
            perceptibleCauseText: "La sacaron de allí con vida, y su hermano se quedó dentro de la torre."
          }
        ],
        stagingEvents: [],
        conditionsGained: [],
        conditionIdentifiersEnded: [],
        additionalWitnessedOriginIdentifiers: [],
        perceptionClarificationText: null,
        seriousWoundCauseText: null,
        criticalFailureCauseText: null,
        presentedInteractivePieceIdentifiers: [],
        shouldUpdateJournal: true,
        destination: {
          kind: "close_archive",
          endingIdentifier: "ending_retreat_with_renata"
        }
      },
      conditionalOutcomes: []
    },
    {
      actionIdentifier: "take_shutter_plates",
      visibleText: "Abrir el cajón y llevarse las placas de obturador",
      actionGroupName: "use_or_spend",
      resourceCost: null,
      freeTextIntentPatternSources: [
        "placas?",
        "obturador\\w*",
        "cajon"
      ],
      visibilityRequiredFlagNames: [],
      visibilityForbiddenFlagNames: [],
      outcome: {
        directorEntries: [
          {
            voice: "director_narration",
            markedParagraphs: [
              "Dentro del cajón hay cinco placas de latón envueltas en papel encerado, cada una con un grabado distinto: una media luna, un círculo, una estrella, una cruz, un ojo abierto. Pesan como pesa lo que se hizo para durar.",
              "Pegada a la tapa, una nota a máquina del farero: [[documento:Con las cinco en su orden el haz no sale de la torre. No suelta nada. Solo calla.]]"
            ]
          }
        ],
        elapsedMinutes: 6,
        grantedLivedExperienceFlagNames: [
          "has_shutter_plates"
        ],
        personIdentifiersBecomingKnown: [],
        relationshipChanges: [],
        stagingEvents: [],
        conditionsGained: [],
        conditionIdentifiersEnded: [],
        additionalWitnessedOriginIdentifiers: [],
        perceptionClarificationText: null,
        seriousWoundCauseText: null,
        criticalFailureCauseText: null,
        presentedInteractivePieceIdentifiers: [],
        shouldUpdateJournal: true,
        destination: {
          kind: "stay_in_node"
        }
      },
      conditionalOutcomes: []
    },
    {
      actionIdentifier: "climb_service_staircase",
      visibleText: "Subir a la linterna por la escalera de servicio",
      actionGroupName: "move",
      resourceCost: null,
      freeTextIntentPatternSources: [
        "escalera de servicio",
        "sub\\w* (a la linterna|arriba)"
      ],
      visibilityRequiredFlagNames: [],
      visibilityForbiddenFlagNames: [],
      outcome: {
        directorEntries: [
          {
            voice: "director_narration",
            markedParagraphs: [
              "La escalera de servicio no tiene número de peldaños en ningún plano, y el Investigador decide no dárselo. Sube con la mano en el muro, sin contar. Al otro lado de la pared, en el hueco principal, alguien sí cuenta, con voz cansada. La voz queda abajo. Luego queda atrás.",
              "Una trampilla se abre al suelo del cuarto de la linterna. La óptica gira despacio sobre su baño de mercurio, apagada y, sin embargo, [[dando luz]]."
            ]
          }
        ],
        elapsedMinutes: 11,
        grantedLivedExperienceFlagNames: [],
        personIdentifiersBecomingKnown: [],
        relationshipChanges: [],
        stagingEvents: [],
        conditionsGained: [],
        conditionIdentifiersEnded: [],
        additionalWitnessedOriginIdentifiers: [],
        perceptionClarificationText: null,
        seriousWoundCauseText: null,
        criticalFailureCauseText: null,
        presentedInteractivePieceIdentifiers: [],
        shouldUpdateJournal: false,
        destination: {
          kind: "move_to_node",
          nodeIdentifier: "lantern_room"
        }
      },
      conditionalOutcomes: []
    },
    {
      actionIdentifier: "photograph_the_optic",
      visibleText: "Fotografiar la óptica mientras gira, sin mirar directamente el haz",
      actionGroupName: "examine",
      resourceCost: null,
      freeTextIntentPatternSources: [
        "fotograf\\w*",
        "foto",
        "camara"
      ],
      visibilityRequiredFlagNames: [],
      visibilityForbiddenFlagNames: [],
      outcome: {
        directorEntries: [
          {
            voice: "director_narration",
            markedParagraphs: [
              "El Investigador dispara nueve veces con la cámara apoyada en el zócalo, mirando el suelo. En la pantalla, las nueve fotos muestran la linterna apagada y cubierta de polvo.",
              "Hay una décima foto que nadie tomó. Sale el Investigador, de espaldas, con la cámara en las manos, [[interferencia:desde dentro de la óptica]]."
            ]
          }
        ],
        elapsedMinutes: 6,
        grantedLivedExperienceFlagNames: [],
        personIdentifiersBecomingKnown: [],
        relationshipChanges: [],
        stagingEvents: [
          {
            kind: "anomaly_manifested",
            anchorDirectorEntryIndex: 0,
            anchorParagraphIndex: 1
          }
        ],
        conditionsGained: [],
        conditionIdentifiersEnded: [],
        additionalWitnessedOriginIdentifiers: [],
        perceptionClarificationText: null,
        seriousWoundCauseText: null,
        criticalFailureCauseText: null,
        presentedInteractivePieceIdentifiers: [],
        shouldUpdateJournal: true,
        destination: {
          kind: "stay_in_node"
        }
      },
      conditionalOutcomes: []
    },
    {
      actionIdentifier: "mount_shutter_plates",
      visibleText: "Montar las cinco placas de obturador en el bastidor",
      actionGroupName: "use_or_spend",
      resourceCost: null,
      freeTextIntentPatternSources: [
        "placas?",
        "obturador\\w*",
        "bastidor"
      ],
      visibilityRequiredFlagNames: [
        "has_shutter_plates"
      ],
      visibilityForbiddenFlagNames: [],
      outcome: {
        directorEntries: [
          {
            voice: "director_narration",
            markedParagraphs: [
              "El Investigador desenvuelve las placas sobre el suelo de rejilla. El bastidor tiene cinco ranuras y, grabadas en el latón del marco, las instrucciones del fabricante en letra diminuta. Un orden. Solo uno deja el haz dentro de la torre.",
              "La nota del farero lo advertía: con las placas puestas el faro calla, y no suelta nada."
            ]
          }
        ],
        elapsedMinutes: 4,
        grantedLivedExperienceFlagNames: [],
        personIdentifiersBecomingKnown: [],
        relationshipChanges: [],
        stagingEvents: [],
        conditionsGained: [],
        conditionIdentifiersEnded: [],
        additionalWitnessedOriginIdentifiers: [],
        perceptionClarificationText: null,
        seriousWoundCauseText: null,
        criticalFailureCauseText: null,
        presentedInteractivePieceIdentifiers: [
          "interactive_piece_0003"
        ],
        shouldUpdateJournal: true,
        destination: {
          kind: "stay_in_node"
        }
      },
      conditionalOutcomes: []
    },
    {
      actionIdentifier: "stand_in_beam_and_answer",
      visibleText: "Ponerse frente al haz cuando llegue el décimo destello y responder con el nombre propio",
      actionGroupName: "speak",
      resourceCost: null,
      freeTextIntentPatternSources: [
        "frente al haz",
        "decimo destello",
        "respond\\w*",
        "mi (propio )?nombre",
        "nombre propio",
        "plant\\w*"
      ],
      visibilityRequiredFlagNames: [],
      visibilityForbiddenFlagNames: [],
      outcome: {
        directorEntries: [
          {
            voice: "director_narration",
            markedParagraphs: [
              "El Investigador se planta en el centro del cuarto, de espaldas al muro macizo, lejos de los cristales. El décimo destello llega de pie y con los ojos abiertos. No es luz: es una [[pregunta]], y pesa. Pide un nombre. Cualquier nombre que no esté ya en la lista.",
              "«Investigador», responde el Investigador, con lo único cierto que tiene, completo y en voz alta.",
              "El golpe es de cuerpo entero. Lanza al Investigador contra el zócalo de hierro y algo cruje en el costado, un [[temblor:dolor limpio y definitivo]]. Pero arriba la linterna duda por primera vez en treinta y nueve años. Y en el peldaño ciento nueve, un hombre descalzo empieza a toser."
            ]
          },
          {
            voice: "inner_thought",
            thoughtOriginName: "own_reasoning",
            markedParagraphs: [
              "El muro ha aguantado. Contra la barandilla de ahí fuera, este mismo golpe habría sido otra cosa."
            ]
          }
        ],
        elapsedMinutes: 6,
        grantedLivedExperienceFlagNames: [
          "resolution_by_own_name",
          "brother_was_freed"
        ],
        personIdentifiersBecomingKnown: [
          "renata_brother"
        ],
        relationshipChanges: [
          {
            personIdentifier: "renata_brother",
            directionName: "toward_investigator_as_perceived",
            dimensionName: "debt",
            levelChange: 2,
            perceptibleCauseText: "Alguien recibió el golpe del faro en su lugar, y él pudo bajar."
          }
        ],
        stagingEvents: [
          {
            kind: "attack_received",
            anchorDirectorEntryIndex: 0,
            anchorParagraphIndex: 2,
            causedSeriousWound: true
          }
        ],
        conditionsGained: [],
        conditionIdentifiersEnded: [],
        additionalWitnessedOriginIdentifiers: [],
        perceptionClarificationText: null,
        seriousWoundCauseText: "El golpe del décimo destello, recibido de frente, contra el zócalo de hierro del cuarto de la linterna.",
        criticalFailureCauseText: null,
        presentedInteractivePieceIdentifiers: [],
        shouldUpdateJournal: true,
        destination: {
          kind: "close_archive",
          endingIdentifier: "ending_own_name"
        }
      },
      conditionalOutcomes: []
    },
    {
      actionIdentifier: "ignite_flare_as_eleventh_light",
      visibleText: "Encender una bengala dentro de la óptica para romper la cuenta",
      actionGroupName: "use_or_spend",
      resourceCost: {
        kind: "belonging",
        belongingIdentifier: "signal_flare",
        units: 1
      },
      freeTextIntentPatternSources: [
        "bengala",
        "luz ajena",
        "romp\\w* la cuenta",
        "prend\\w* fuego"
      ],
      visibilityRequiredFlagNames: [],
      visibilityForbiddenFlagNames: [],
      outcome: {
        directorEntries: [
          {
            voice: "director_narration",
            markedParagraphs: [
              "El Investigador arranca la tapa de la bengala, la frota y la clava en el hueco con forma de llama. Arde roja en el centro de la óptica y los prismas la multiplican por toda la bahía. Nueve blancos, uno [[ajeno]], y ahora uno rojo que nadie pidió. La cuenta ya no cierra.",
              "El faro se apaga [[temblor:de golpe]], de verdad, como en 1987. En la escalera alguien llama a su hermana por su nombre con la voz rota de quien lleva una noche entera contando.",
              "Abajo, en el pueblo, se encienden ventanas. Una, cuatro, veinte. Punta Ánimas entera ha visto su faro muerto ponerse rojo. Mañana habrá alguien con un teléfono y ganas de contarlo."
            ]
          }
        ],
        elapsedMinutes: 7,
        grantedLivedExperienceFlagNames: [
          "resolution_by_foreign_light",
          "brother_was_freed",
          "bay_witnessed_the_light"
        ],
        personIdentifiersBecomingKnown: [
          "renata_brother"
        ],
        relationshipChanges: [
          {
            personIdentifier: "renata_brother",
            directionName: "toward_investigator_as_perceived",
            dimensionName: null,
            levelChange: -1,
            perceptibleCauseText: "Salió libre, pero con la cuenta rota su madre ya no tiene por dónde volver. Lo sabe, y mira a quien la rompió."
          }
        ],
        stagingEvents: [
          {
            kind: "attack_delivered",
            anchorDirectorEntryIndex: 0,
            anchorParagraphIndex: 1
          }
        ],
        conditionsGained: [],
        conditionIdentifiersEnded: [],
        additionalWitnessedOriginIdentifiers: [],
        perceptionClarificationText: null,
        seriousWoundCauseText: null,
        criticalFailureCauseText: null,
        presentedInteractivePieceIdentifiers: [],
        shouldUpdateJournal: true,
        destination: {
          kind: "close_archive",
          endingIdentifier: "ending_foreign_light"
        }
      },
      conditionalOutcomes: []
    },
    {
      actionIdentifier: "step_out_to_gallery",
      visibleText: "Salir a la galería exterior por la puerta de hierro",
      actionGroupName: "move",
      resourceCost: null,
      freeTextIntentPatternSources: [
        "galeria",
        "sal\\w* (afuera|fuera)",
        "puerta de hierro"
      ],
      visibilityRequiredFlagNames: [],
      visibilityForbiddenFlagNames: [],
      outcome: {
        directorEntries: [
          {
            voice: "director_narration",
            markedParagraphs: [
              "El Investigador empuja la puerta de hierro. El viento entra primero."
            ]
          }
        ],
        elapsedMinutes: 1,
        grantedLivedExperienceFlagNames: [],
        personIdentifiersBecomingKnown: [],
        relationshipChanges: [],
        stagingEvents: [],
        conditionsGained: [],
        conditionIdentifiersEnded: [],
        additionalWitnessedOriginIdentifiers: [],
        perceptionClarificationText: null,
        seriousWoundCauseText: null,
        criticalFailureCauseText: null,
        presentedInteractivePieceIdentifiers: [],
        shouldUpdateJournal: false,
        destination: {
          kind: "move_to_node",
          nodeIdentifier: "outer_gallery"
        }
      },
      conditionalOutcomes: []
    },
    {
      actionIdentifier: "test_gallery_railing",
      visibleText: "Comprobar con la mano cuánto aguanta la barandilla",
      actionGroupName: "examine",
      resourceCost: null,
      freeTextIntentPatternSources: [
        "comprob\\w*",
        "barandilla",
        "prob\\w* (la|el) (barandilla|hierro)"
      ],
      visibilityRequiredFlagNames: [],
      visibilityForbiddenFlagNames: [],
      outcome: {
        directorEntries: [
          {
            voice: "director_narration",
            markedParagraphs: [
              "El Investigador empuja la barandilla con la palma, sin cargar el cuerpo. Los montantes giran en sus bases como dientes flojos. Aguanta una mano. No aguantaría un hombro, y mucho menos un cuerpo lanzado contra ella."
            ]
          },
          {
            voice: "inner_thought",
            thoughtOriginName: "own_reasoning",
            markedParagraphs: [
              "Lo que haya que hacer frente a ese haz, mejor hacerlo con un muro detrás."
            ]
          }
        ],
        elapsedMinutes: 2,
        grantedLivedExperienceFlagNames: [],
        personIdentifiersBecomingKnown: [],
        relationshipChanges: [],
        stagingEvents: [],
        conditionsGained: [],
        conditionIdentifiersEnded: [],
        additionalWitnessedOriginIdentifiers: [],
        perceptionClarificationText: null,
        seriousWoundCauseText: null,
        criticalFailureCauseText: null,
        presentedInteractivePieceIdentifiers: [],
        shouldUpdateJournal: true,
        destination: {
          kind: "stay_in_node"
        }
      },
      conditionalOutcomes: []
    },
    {
      actionIdentifier: "face_tenth_flash_on_gallery",
      visibleText: "Esperar el décimo destello aquí fuera, de pie en la galería",
      actionGroupName: "examine",
      resourceCost: null,
      freeTextIntentPatternSources: [
        "decimo destello",
        "frente al haz",
        "esper\\w* (el|al) (destello|haz)",
        "respond\\w*",
        "plant\\w*"
      ],
      visibilityRequiredFlagNames: [],
      visibilityForbiddenFlagNames: [],
      outcome: {
        directorEntries: [
          {
            voice: "director_narration",
            markedParagraphs: [
              "El décimo destello encuentra al Investigador de pie en la rejilla, con la bahía a la espalda. No es luz: es una [[pregunta]], y pesa. El Investigador abre la boca para contestar y no llega a la segunda sílaba.",
              "El golpe lanza el cuerpo entero contra la barandilla. El hierro [[temblor:cruje y se dobla]] hacia fuera, medio metro sobre el vacío, y aguanta por dos tornillos. Algo se ha roto también en el costado del Investigador, con un dolor limpio y definitivo.",
              "La barandilla queda vencida, abierta como una puerta hacia las rocas. No va a parar un segundo golpe. No va a parar ni un tropiezo."
            ]
          }
        ],
        elapsedMinutes: 4,
        grantedLivedExperienceFlagNames: [
          "railing_is_bent"
        ],
        personIdentifiersBecomingKnown: [],
        relationshipChanges: [],
        stagingEvents: [
          {
            kind: "attack_received",
            anchorDirectorEntryIndex: 0,
            anchorParagraphIndex: 1,
            causedSeriousWound: true
          }
        ],
        conditionsGained: [],
        conditionIdentifiersEnded: [],
        additionalWitnessedOriginIdentifiers: [],
        perceptionClarificationText: null,
        seriousWoundCauseText: "El golpe del décimo destello, recibido en la galería exterior, contra una barandilla que se dobló sobre el vacío.",
        criticalFailureCauseText: null,
        presentedInteractivePieceIdentifiers: [],
        shouldUpdateJournal: true,
        destination: {
          kind: "move_to_node",
          nodeIdentifier: "outer_gallery_bent_railing"
        }
      },
      conditionalOutcomes: []
    },
    {
      actionIdentifier: "face_tenth_flash_on_gallery_again",
      visibleText: "Volver a plantarse ante el décimo destello en el mismo sitio de la galería",
      actionGroupName: "examine",
      resourceCost: null,
      freeTextIntentPatternSources: [
        "decimo destello",
        "frente al haz",
        "otra vez",
        "de nuevo",
        "respond\\w*",
        "plant\\w*"
      ],
      visibilityRequiredFlagNames: [],
      visibilityForbiddenFlagNames: [],
      outcome: {
        directorEntries: [
          {
            voice: "director_narration",
            markedParagraphs: [
              "El Investigador se coloca otra vez en la rejilla, con el costado ardiendo y la barandilla vencida a la espalda. Esta vez el nombre propio sale completo. El faro duda. Y golpea igual.",
              "[[lento:Los dos tornillos que quedaban no discuten.]] El hierro se abre, la rejilla se acaba, y hay treinta metros de aire hasta [[temblor:las rocas]]."
            ]
          }
        ],
        elapsedMinutes: 1,
        grantedLivedExperienceFlagNames: [],
        personIdentifiersBecomingKnown: [],
        relationshipChanges: [],
        stagingEvents: [
          {
            kind: "critical_failure",
            anchorDirectorEntryIndex: 0,
            anchorParagraphIndex: 1
          }
        ],
        conditionsGained: [],
        conditionIdentifiersEnded: [],
        additionalWitnessedOriginIdentifiers: [],
        perceptionClarificationText: null,
        seriousWoundCauseText: null,
        criticalFailureCauseText: "Volvió a cargar el cuerpo contra la barandilla vencida de la galería, a treinta metros de las rocas.",
        presentedInteractivePieceIdentifiers: [],
        shouldUpdateJournal: true,
        destination: {
          kind: "close_archive",
          endingIdentifier: "death_gallery_fall"
        }
      },
      conditionalOutcomes: []
    },
    {
      actionIdentifier: "enter_lantern_room_from_gallery",
      visibleText: "Entrar al cuarto de la linterna por la puerta de hierro",
      actionGroupName: "move",
      resourceCost: null,
      freeTextIntentPatternSources: [
        "entr\\w*",
        "cuarto de la linterna",
        "puerta de hierro",
        "adentro"
      ],
      visibilityRequiredFlagNames: [],
      visibilityForbiddenFlagNames: [],
      outcome: {
        directorEntries: [
          {
            voice: "director_narration",
            markedParagraphs: [
              "El Investigador entra y cierra la puerta de hierro a su espalda. El viento se queda fuera. El haz, no."
            ]
          }
        ],
        elapsedMinutes: 1,
        grantedLivedExperienceFlagNames: [],
        personIdentifiersBecomingKnown: [],
        relationshipChanges: [],
        stagingEvents: [],
        conditionsGained: [],
        conditionIdentifiersEnded: [],
        additionalWitnessedOriginIdentifiers: [],
        perceptionClarificationText: null,
        seriousWoundCauseText: null,
        criticalFailureCauseText: null,
        presentedInteractivePieceIdentifiers: [],
        shouldUpdateJournal: false,
        destination: {
          kind: "move_to_node",
          nodeIdentifier: "lantern_room_after_gallery"
        }
      },
      conditionalOutcomes: []
    },
    {
      actionIdentifier: "ask_renata_about_brother",
      visibleText: "Preguntar a la mujer de la libreta, sin apurarla, a quién espera",
      actionGroupName: "speak",
      resourceCost: null,
      freeTextIntentPatternSources: [
        "pregunt\\w* a (renata|la mujer)",
        "su hermano",
        "a quien espera",
        "habl\\w* con renata",
        "su madre"
      ],
      visibilityRequiredFlagNames: [],
      visibilityForbiddenFlagNames: [],
      outcome: {
        directorEntries: [
          {
            voice: "director_narration",
            markedParagraphs: [
              "El Investigador hace la pregunta y después hace lo más difícil: esperar. La mujer dice llamarse Renata Oquendo, por si hacía falta, y mira la taza boca abajo un rato largo antes de contestar."
            ]
          },
          {
            voice: "character_dialogue",
            speakerPersonIdentifier: "renata_oquendo",
            deliveryName: "spoken",
            markedParagraphs: [
              "«A Tomás. Mi hermano. Subió anoche a contar destellos porque alguien le dijo que el faro devuelve gente.» Traga saliva. «Quería que le devolviera a nuestra madre. Elvira. Se la llevó el mar el año en que apagaron esto.» Dice el año sin dudar: 1987.",
              "«Él juraba que el faro no alumbra barcos. Que cuenta a los que faltan. Y que si sobra un destello, es que alguien sobra aquí abajo.»",
              "«Mi madre era menuda, ¿sabe? Me llegaba al hombro. El farero medía a la gente a ojo, con una raya en el marco, como a los críos. Se reían de eso los dos.»"
            ]
          }
        ],
        elapsedMinutes: 8,
        grantedLivedExperienceFlagNames: [
          "asked_about_brother",
          "spoke_with_renata"
        ],
        personIdentifiersBecomingKnown: [
          "renata_oquendo"
        ],
        relationshipChanges: [
          {
            personIdentifier: "renata_oquendo",
            directionName: "toward_investigator_as_perceived",
            dimensionName: null,
            levelChange: 1,
            perceptibleCauseText: "Pudo hablar de Tomás y de su madre a su ritmo, sin que nadie la apurara."
          }
        ],
        stagingEvents: [],
        conditionsGained: [],
        conditionIdentifiersEnded: [],
        additionalWitnessedOriginIdentifiers: [],
        perceptionClarificationText: null,
        seriousWoundCauseText: null,
        criticalFailureCauseText: null,
        presentedInteractivePieceIdentifiers: [],
        shouldUpdateJournal: true,
        destination: {
          kind: "stay_in_node"
        }
      },
      conditionalOutcomes: []
    },
    {
      actionIdentifier: "bag_blue_pen_evidence",
      visibleText: "Guardar el bolígrafo azul del registro en una bolsa de evidencia",
      actionGroupName: "use_or_spend",
      resourceCost: {
        kind: "belonging",
        belongingIdentifier: "sealed_evidence_bag",
        units: 1
      },
      freeTextIntentPatternSources: [
        "boligrafo",
        "bolsa de evidencia",
        "guard\\w* (la )?evidencia",
        "pluma azul"
      ],
      visibilityRequiredFlagNames: [],
      visibilityForbiddenFlagNames: [],
      outcome: {
        directorEntries: [
          {
            voice: "director_narration",
            markedParagraphs: [
              "El bolígrafo es de propaganda: una ferretería de Punta Ánimas que cerró hace veinte años. Es el mismo azul de las entradas nuevas del registro de guardia. El Investigador lo sella y rotula la bolsa.",
              "Al guardarla nota que la bolsa está ligeramente más pesada de lo que debería, como si el bolígrafo siguiera [[escribiendo]] dentro."
            ]
          }
        ],
        elapsedMinutes: 4,
        grantedLivedExperienceFlagNames: [],
        personIdentifiersBecomingKnown: [],
        relationshipChanges: [],
        stagingEvents: [
          {
            kind: "anomaly_manifested",
            anchorDirectorEntryIndex: 0,
            anchorParagraphIndex: 1
          }
        ],
        conditionsGained: [],
        conditionIdentifiersEnded: [],
        additionalWitnessedOriginIdentifiers: [],
        perceptionClarificationText: null,
        seriousWoundCauseText: null,
        criticalFailureCauseText: null,
        presentedInteractivePieceIdentifiers: [],
        shouldUpdateJournal: true,
        destination: {
          kind: "stay_in_node"
        }
      },
      conditionalOutcomes: []
    },
    {
      actionIdentifier: "read_keeper_logbook",
      visibleText: "Leer el cuaderno del farero que sigue sobre la mesa",
      actionGroupName: "examine",
      resourceCost: null,
      freeTextIntentPatternSources: [
        "cuaderno",
        "le\\w* (el )?(diario|libro)",
        "inventario",
        "bitacora"
      ],
      visibilityRequiredFlagNames: [],
      visibilityForbiddenFlagNames: [],
      outcome: {
        directorEntries: [
          {
            voice: "director_narration",
            markedParagraphs: [
              "La letra del farero es prolija hasta agosto de 1987. Después se vuelve un inventario: nombres del pueblo, uno por línea, cada uno con una cifra del uno al nueve. Todos con su oficio al lado: patrón, redera, maestro, fogonero. Gente hecha y derecha. Ningún niño.",
              "La última línea dice [[documento:10 —]] y nada más. La tinta del guion todavía mancha el dedo.",
              "Las páginas finales no están en castellano ni en ninguna otra lengua: bloques de letras mayúsculas, apretadas, sin una sola tachadura. El disco de latón que sujeta la página tiene dos coronas de alfabeto y una inscripción en el canto: [[documento:Se cuenta desde la luz]]."
            ]
          }
        ],
        elapsedMinutes: 11,
        grantedLivedExperienceFlagNames: [
          "read_keeper_logbook"
        ],
        personIdentifiersBecomingKnown: [],
        relationshipChanges: [],
        stagingEvents: [],
        conditionsGained: [],
        conditionIdentifiersEnded: [],
        additionalWitnessedOriginIdentifiers: [],
        perceptionClarificationText: null,
        seriousWoundCauseText: null,
        criticalFailureCauseText: null,
        presentedInteractivePieceIdentifiers: [
          "interactive_piece_0002"
        ],
        shouldUpdateJournal: true,
        destination: {
          kind: "stay_in_node"
        }
      },
      conditionalOutcomes: []
    },
    {
      actionIdentifier: "ask_renata_before_writing_name",
      visibleText: "Contarle a Renata lo averiguado y pedirle permiso para escribir el nombre de su madre",
      actionGroupName: "speak",
      resourceCost: null,
      freeTextIntentPatternSources: [
        "permiso",
        "cont\\w* a renata",
        "dec\\w* a renata",
        "explic\\w* a renata"
      ],
      visibilityRequiredFlagNames: [
        "knows_missing_name"
      ],
      visibilityForbiddenFlagNames: [
        "renata_consented_to_name"
      ],
      outcome: {
        directorEntries: [
          {
            voice: "director_narration",
            markedParagraphs: [
              "El Investigador se lo cuenta entero y sin adornos: la barca, los diez, la lista de nueve, el nombre que el farero no quiso apuntar. Renata escucha con la espalda contra el marco, resbalando despacio hasta quedar sentada en el umbral."
            ]
          },
          {
            voice: "character_dialogue",
            speakerPersonIdentifier: "renata_oquendo",
            deliveryName: "spoken",
            markedParagraphs: [
              "«Treinta y nueve años contándola de menos.» Se limpia la cara con la manga del abrigo, que es de hombre, que es de Tomás. «Escríbalo. Con todas las letras. Elvira Sanjurjo. Y gracias por preguntarme: es lo único de ella que todavía era mío.»"
            ]
          }
        ],
        elapsedMinutes: 7,
        grantedLivedExperienceFlagNames: [
          "renata_consented_to_name"
        ],
        personIdentifiersBecomingKnown: [],
        relationshipChanges: [
          {
            personIdentifier: "renata_oquendo",
            directionName: "toward_investigator_as_perceived",
            dimensionName: "affection",
            levelChange: 2,
            perceptibleCauseText: "Le pidieron permiso antes de escribir el nombre de su madre."
          }
        ],
        stagingEvents: [],
        conditionsGained: [],
        conditionIdentifiersEnded: [],
        additionalWitnessedOriginIdentifiers: [],
        perceptionClarificationText: null,
        seriousWoundCauseText: null,
        criticalFailureCauseText: null,
        presentedInteractivePieceIdentifiers: [],
        shouldUpdateJournal: true,
        destination: {
          kind: "stay_in_node"
        }
      },
      conditionalOutcomes: []
    },
    {
      actionIdentifier: "finish_keeper_inventory",
      visibleText: "Completar la última línea del cuaderno del farero con el nombre que falta",
      actionGroupName: "use_or_spend",
      resourceCost: null,
      freeTextIntentPatternSources: [
        "escrib\\w* (el nombre|elvira)",
        "complet\\w* (la linea|el cuaderno|la lista)",
        "apunt\\w* (el nombre|a elvira|a la madre)"
      ],
      visibilityRequiredFlagNames: [
        "knows_missing_name"
      ],
      visibilityForbiddenFlagNames: [],
      outcome: {
        directorEntries: [
          {
            voice: "director_narration",
            markedParagraphs: [
              "El Investigador escribe junto al «10 —» el nombre de la madre de Renata, el que el mar se llevó. No avisa a nadie. El papel lo acepta sin correrse la tinta.",
              "El décimo destello no llega. En su lugar, la torre entera [[lento:exhala un aire frío con olor a sal vieja]], y el hermano de Renata baja los peldaños de uno en uno, contándolos en voz alta para no perderse."
            ]
          },
          {
            voice: "character_dialogue",
            speakerPersonIdentifier: "renata_oquendo",
            deliveryName: "spoken",
            markedParagraphs: [
              "«¿Qué ha escrito?» Lee por encima del hombro del Investigador. Abraza a su hermano, y por encima del hombro de él mira el cuaderno con algo que no es gratitud del todo. «Era su nombre. Era mío para darlo.»"
            ]
          }
        ],
        elapsedMinutes: 9,
        grantedLivedExperienceFlagNames: [
          "resolution_by_repair",
          "brother_was_freed"
        ],
        personIdentifiersBecomingKnown: [
          "renata_brother"
        ],
        relationshipChanges: [
          {
            personIdentifier: "renata_brother",
            directionName: "toward_investigator_as_perceived",
            dimensionName: "debt",
            levelChange: 3,
            perceptibleCauseText: "Bajó de la torre porque alguien escribió el nombre que cerraba la cuenta."
          },
          {
            personIdentifier: "renata_oquendo",
            directionName: "toward_investigator_as_perceived",
            dimensionName: null,
            levelChange: -1,
            perceptibleCauseText: "El nombre de su madre se escribió sin decírselo. Su hermano volvió, pero a ella le quitaron algo."
          }
        ],
        stagingEvents: [],
        conditionsGained: [],
        conditionIdentifiersEnded: [],
        additionalWitnessedOriginIdentifiers: [
          "name_written_without_consent"
        ],
        perceptionClarificationText: null,
        seriousWoundCauseText: null,
        criticalFailureCauseText: null,
        presentedInteractivePieceIdentifiers: [],
        shouldUpdateJournal: true,
        destination: {
          kind: "close_archive",
          endingIdentifier: "ending_closed_count"
        }
      },
      conditionalOutcomes: [
        {
          requiredLivedExperienceFlagNames: [
            "renata_consented_to_name"
          ],
          forbiddenLivedExperienceFlagNames: [],
          outcome: {
            directorEntries: [
              {
                voice: "director_narration",
                markedParagraphs: [
                  "El Investigador toma el bolígrafo que haya a mano y escribe junto al «10 —», despacio, con Renata mirando desde el umbral: [[documento:Elvira Sanjurjo]]. El papel lo acepta sin correrse la tinta.",
                  "El décimo destello no llega. En su lugar, la torre entera [[lento:exhala un aire frío con olor a sal vieja]], y arriba la voz que contaba se interrumpe a media cifra.",
                  "Luego, pasos. Descalzos. Un hombre baja los peldaños de uno en uno, contándolos en voz alta para no perderse, y al llegar al último se queda mirando a su hermana como quien vuelve de un turno muy largo."
                ]
              }
            ],
            elapsedMinutes: 9,
            grantedLivedExperienceFlagNames: [
              "resolution_by_repair",
              "brother_was_freed"
            ],
            personIdentifiersBecomingKnown: [
              "renata_brother"
            ],
            relationshipChanges: [
              {
                personIdentifier: "renata_brother",
                directionName: "toward_investigator_as_perceived",
                dimensionName: "debt",
                levelChange: 3,
                perceptibleCauseText: "Bajó de la torre porque alguien escribió el nombre que cerraba la cuenta."
              },
              {
                personIdentifier: "renata_oquendo",
                directionName: "toward_investigator_as_perceived",
                dimensionName: "debt",
                levelChange: 2,
                perceptibleCauseText: "Su hermano bajó vivo la escalera del faro."
              }
            ],
            stagingEvents: [],
            conditionsGained: [],
            conditionIdentifiersEnded: [],
            additionalWitnessedOriginIdentifiers: [
              "name_written_with_consent"
            ],
            perceptionClarificationText: null,
            seriousWoundCauseText: null,
            criticalFailureCauseText: null,
            presentedInteractivePieceIdentifiers: [],
            shouldUpdateJournal: true,
            destination: {
              kind: "close_archive",
              endingIdentifier: "ending_closed_count"
            }
          }
        }
      ]
    },
    {
      actionIdentifier: "start_up_inner_staircase",
      visibleText: "Tomar la escalera de caracol hacia arriba",
      actionGroupName: "move",
      resourceCost: null,
      freeTextIntentPatternSources: [
        "escalera( de caracol| interior)?",
        "sub\\w*"
      ],
      visibilityRequiredFlagNames: [],
      visibilityForbiddenFlagNames: [],
      outcome: {
        directorEntries: [
          {
            voice: "director_narration",
            markedParagraphs: [
              "El Investigador pone el pie en el primer peldaño. La escalera de caracol sube pegada al muro, sin barandilla por el lado del hueco. En la pared, el plano de la OICNAU clavado con chinchetas lo dice claro: ciento ocho peldaños hasta la linterna."
            ]
          }
        ],
        elapsedMinutes: 2,
        grantedLivedExperienceFlagNames: [],
        personIdentifiersBecomingKnown: [],
        relationshipChanges: [],
        stagingEvents: [],
        conditionsGained: [],
        conditionIdentifiersEnded: [],
        additionalWitnessedOriginIdentifiers: [],
        perceptionClarificationText: null,
        seriousWoundCauseText: null,
        criticalFailureCauseText: null,
        presentedInteractivePieceIdentifiers: [],
        shouldUpdateJournal: false,
        destination: {
          kind: "move_to_node",
          nodeIdentifier: "inner_staircase"
        }
      },
      conditionalOutcomes: []
    },
    {
      actionIdentifier: "climb_inner_staircase",
      visibleText: "Subir por la escalera interior contando los peldaños",
      actionGroupName: "move",
      resourceCost: null,
      freeTextIntentPatternSources: [
        "sub\\w*.*cont\\w*",
        "cont\\w*.*(peldanos|escalones)"
      ],
      visibilityRequiredFlagNames: [],
      visibilityForbiddenFlagNames: [],
      outcome: {
        directorEntries: [
          {
            voice: "director_narration",
            markedParagraphs: [
              "El Investigador sube contando en voz baja, con la mano en el muro, porque contar parece lo prudente.",
              "Ciento ocho peldaños según el plano. El Investigador cuenta ciento ocho. Se detiene, mira hacia arriba, y todavía queda [[un tramo entero]].",
              "En el peldaño ciento nueve hay una bota de hombre, erguida, con los cordones atados. Está tibia. El Investigador mira el reloj para anotar la hora y el reloj dice las [[interferencia:tres y doce]]. No las tres y pico. Las tres y doce, con el segundero clavado, igual que en el registro de abajo.",
              "Y la voz que contaba arriba ya no es la de un hombre cansado. Ha cambiado de timbre a mitad de una cifra, como una radio que encuentra otra emisora. Ahora es {{voz_perdida}}, muy cerca, del otro lado de la curva de la escalera."
            ]
          },
          {
            voice: "character_dialogue",
            speakerPersonIdentifier: "voice_on_the_staircase",
            deliveryName: "whispered",
            markedParagraphs: [
              "«[[susurro:Cuentas bien. Casi nadie cuenta tan bien.]] Falta uno nada más. Dime a quién quieres de vuelta. Dime el nombre y lo cuento por ti.»"
            ]
          },
          {
            voice: "inner_thought",
            thoughtOriginName: "intrusive_perception",
            markedParagraphs: [
              "Sería tan fácil. Un nombre. Solo un nombre, y la cuenta cerraría.",
              "Ese pensamiento ha llegado con la cadencia de la voz, no con la del Investigador. [[No es suyo.]]"
            ]
          }
        ],
        elapsedMinutes: 14,
        grantedLivedExperienceFlagNames: [
          "voice_has_changed"
        ],
        personIdentifiersBecomingKnown: [],
        relationshipChanges: [],
        stagingEvents: [
          {
            kind: "mental_attack",
            anchorDirectorEntryIndex: 0,
            anchorParagraphIndex: 2,
            falsifiedStatusReading: {
              statusFieldName: "world_clock",
              falseVisibleText: "03:12"
            },
            rewrittenPastPhrase: null
          }
        ],
        conditionsGained: [
          {
            conditionIdentifier: "tower_disorientation",
            visibleName: "Desorientación",
            originText: "Pasar del peldaño ciento ocho de la escalera del faro llevando la cuenta.",
            effectText: "Las horas y las distancias dentro de la torre no son de fiar. Lo que el Investigador lee en un reloj puede no ser cierto.",
            exitText: "Salir de la torre, o bajar y descansar un rato lejos de la escalera."
          }
        ],
        conditionIdentifiersEnded: [],
        additionalWitnessedOriginIdentifiers: [],
        perceptionClarificationText: "Dentro de la torre, la hora que el Investigador percibe no es de fiar. El tiempo real ha seguido corriendo.",
        seriousWoundCauseText: null,
        criticalFailureCauseText: null,
        presentedInteractivePieceIdentifiers: [],
        shouldUpdateJournal: true,
        destination: {
          kind: "move_to_node",
          nodeIdentifier: "inner_staircase_voice"
        }
      },
      conditionalOutcomes: []
    },
    {
      actionIdentifier: "climb_without_counting",
      visibleText: "Subir sin llevar ninguna cuenta, con la vista en el muro",
      actionGroupName: "move",
      resourceCost: null,
      freeTextIntentPatternSources: [
        "sin contar",
        "no cont\\w*",
        "sub\\w* (hasta|a) la linterna",
        "segu\\w* subiendo"
      ],
      visibilityRequiredFlagNames: [],
      visibilityForbiddenFlagNames: [],
      outcome: {
        directorEntries: [
          {
            voice: "director_narration",
            markedParagraphs: [
              "El Investigador sube pensando en cualquier otra cosa: la lista de la compra, una canción, el nombre de una calle. Cada vez que un número intenta formarse, lo deja caer. La voz de la espiral se impacienta, tropieza en su cuenta, queda por debajo.",
              "Sin cuenta que llevar, la escalera no tiene dónde esconder un peldaño de más. El último tramo desemboca en una trampilla, y la trampilla en el cuarto de la linterna. La óptica gira despacio, apagada y, sin embargo, [[dando luz]]."
            ]
          }
        ],
        elapsedMinutes: 12,
        grantedLivedExperienceFlagNames: [],
        personIdentifiersBecomingKnown: [],
        relationshipChanges: [],
        stagingEvents: [],
        conditionsGained: [],
        conditionIdentifiersEnded: [],
        additionalWitnessedOriginIdentifiers: [],
        perceptionClarificationText: null,
        seriousWoundCauseText: null,
        criticalFailureCauseText: null,
        presentedInteractivePieceIdentifiers: [],
        shouldUpdateJournal: false,
        destination: {
          kind: "move_to_node",
          nodeIdentifier: "lantern_room"
        }
      },
      conditionalOutcomes: []
    },
    {
      actionIdentifier: "call_brother_by_his_name",
      visibleText: "Llamar a Tomás por su nombre, hacia arriba, sin subir",
      actionGroupName: "speak",
      resourceCost: null,
      freeTextIntentPatternSources: [
        "tomas",
        "llam\\w* al hermano",
        "grit\\w* (su|el) nombre"
      ],
      visibilityRequiredFlagNames: [
        "asked_about_brother"
      ],
      visibilityForbiddenFlagNames: [],
      outcome: {
        directorEntries: [
          {
            voice: "director_narration",
            markedParagraphs: [
              "El Investigador hace bocina con las manos y llama hacia el hueco: «¡Tomás! ¡Tomás Oquendo!». La cuenta de arriba se corta en seco."
            ]
          },
          {
            voice: "character_dialogue",
            speakerPersonIdentifier: "renata_brother",
            deliveryName: "heard_from_afar",
            markedParagraphs: [
              "«…¿Quién…? No suba contando. [[pausa:400]]Por lo que más quiera, no suba contando. Y si le pregunta por alguien, [[grito:no le dé ningún nombre]]. Yo se lo di. Yo le dije el de mi madre.»"
            ]
          },
          {
            voice: "director_narration",
            markedParagraphs: [
              "Después la voz vuelve a contar, arrastrada, como si algo tirara de ella hacia los números."
            ]
          }
        ],
        elapsedMinutes: 3,
        grantedLivedExperienceFlagNames: [
          "called_brother_by_name"
        ],
        personIdentifiersBecomingKnown: [],
        relationshipChanges: [
          {
            personIdentifier: "renata_brother",
            directionName: "toward_investigator_as_perceived",
            dimensionName: null,
            levelChange: 1,
            perceptibleCauseText: "Alguien lo llamó por su nombre cuando llevaba una noche entera siendo solo un número."
          }
        ],
        stagingEvents: [],
        conditionsGained: [],
        conditionIdentifiersEnded: [],
        additionalWitnessedOriginIdentifiers: [],
        perceptionClarificationText: null,
        seriousWoundCauseText: null,
        criticalFailureCauseText: null,
        presentedInteractivePieceIdentifiers: [],
        shouldUpdateJournal: true,
        destination: {
          kind: "stay_in_node"
        }
      },
      conditionalOutcomes: []
    },
    {
      actionIdentifier: "examine_warm_boot",
      visibleText: "Examinar la bota tibia del peldaño ciento nueve",
      actionGroupName: "examine",
      resourceCost: null,
      freeTextIntentPatternSources: [
        "bota"
      ],
      visibilityRequiredFlagNames: [],
      visibilityForbiddenFlagNames: [],
      outcome: {
        directorEntries: [
          {
            voice: "director_narration",
            markedParagraphs: [
              "Es una bota de trabajo, talla grande, con barro fresco del pie del faro en la suela. Las huellas que entraban y no salían. Dentro, el calor es el de un pie que acabara de sacarse. El Investigador la levanta y debajo no hay peldaño: hay la [[sombra de un peldaño]], pintada en el aire, que aguanta el peso igual.",
              "El plano dice ciento ocho. Este escalón no figura. Alguien está guardado aquí, en un sitio que la torre se inventó para guardarlo."
            ]
          }
        ],
        elapsedMinutes: 4,
        grantedLivedExperienceFlagNames: [],
        personIdentifiersBecomingKnown: [],
        relationshipChanges: [],
        stagingEvents: [
          {
            kind: "anomaly_manifested",
            anchorDirectorEntryIndex: 0,
            anchorParagraphIndex: 0
          }
        ],
        conditionsGained: [],
        conditionIdentifiersEnded: [],
        additionalWitnessedOriginIdentifiers: [],
        perceptionClarificationText: null,
        seriousWoundCauseText: null,
        criticalFailureCauseText: null,
        presentedInteractivePieceIdentifiers: [],
        shouldUpdateJournal: true,
        destination: {
          kind: "stay_in_node"
        }
      },
      conditionalOutcomes: []
    },
    {
      actionIdentifier: "answer_voice_with_own_name",
      visibleText: "Contestarle a la voz solo con el nombre propio, completo",
      actionGroupName: "speak",
      resourceCost: null,
      freeTextIntentPatternSources: [
        "mi (propio )?nombre",
        "nombre propio",
        "dig\\w* quien soy"
      ],
      visibilityRequiredFlagNames: [],
      visibilityForbiddenFlagNames: [],
      outcome: {
        directorEntries: [
          {
            voice: "director_narration",
            markedParagraphs: [
              "«Investigador», dice el Investigador, y nada más. Ni una sílaba que no le pertenezca.",
              "La voz calla. Es un silencio ofendido, de ventanilla que se cierra. Durante un momento largo la escalera es solo una escalera, y el peldaño ciento nueve parece más delgado que antes, como si dudara de sí mismo."
            ]
          },
          {
            voice: "inner_thought",
            thoughtOriginName: "own_reasoning",
            markedParagraphs: [
              "Pide nombres ajenos. El propio no le sirve. El propio, de hecho, parece estorbarle."
            ]
          }
        ],
        elapsedMinutes: 2,
        grantedLivedExperienceFlagNames: [],
        personIdentifiersBecomingKnown: [],
        relationshipChanges: [],
        stagingEvents: [],
        conditionsGained: [],
        conditionIdentifiersEnded: [],
        additionalWitnessedOriginIdentifiers: [],
        perceptionClarificationText: null,
        seriousWoundCauseText: null,
        criticalFailureCauseText: null,
        presentedInteractivePieceIdentifiers: [],
        shouldUpdateJournal: true,
        destination: {
          kind: "stay_in_node"
        }
      },
      conditionalOutcomes: []
    },
    {
      actionIdentifier: "give_the_voice_the_name_it_asks_for",
      visibleText: "Decirle a la voz el nombre de quien el Investigador quiere de vuelta",
      actionGroupName: "speak",
      resourceCost: null,
      freeTextIntentPatternSources: [
        "(dig\\w*|dec\\w*|dar\\w*|doy) (el|un|ese) nombre",
        "quiero de vuelta",
        "que me devuelva",
        "respond\\w* a la voz",
        "nombre de mi"
      ],
      visibilityRequiredFlagNames: [],
      visibilityForbiddenFlagNames: [],
      outcome: {
        directorEntries: [
          {
            voice: "director_narration",
            markedParagraphs: [
              "El Investigador lo dice. El nombre sale entero, con todo lo que pesa, y la escalera lo recibe como un mostrador recibe una moneda.",
              "[[lento:La voz da las gracias. Luego cuenta: «…y diez».]] El peldaño ciento nueve ya no está delante. Está [[temblor:debajo]].",
              "Abajo, muy lejos, una mujer con un abrigo demasiado grande levanta la vista hacia la torre y empieza una página nueva en su libreta."
            ]
          }
        ],
        elapsedMinutes: 1,
        grantedLivedExperienceFlagNames: [],
        personIdentifiersBecomingKnown: [],
        relationshipChanges: [],
        stagingEvents: [
          {
            kind: "critical_failure",
            anchorDirectorEntryIndex: 0,
            anchorParagraphIndex: 1
          }
        ],
        conditionsGained: [],
        conditionIdentifiersEnded: [],
        additionalWitnessedOriginIdentifiers: [],
        perceptionClarificationText: null,
        seriousWoundCauseText: null,
        criticalFailureCauseText: "Le dio al faro lo que el faro pide: un nombre que no era el suyo, dicho en voz alta en la escalera.",
        presentedInteractivePieceIdentifiers: [],
        shouldUpdateJournal: true,
        destination: {
          kind: "close_archive",
          endingIdentifier: "death_became_the_tenth"
        }
      },
      conditionalOutcomes: []
    },
    {
      actionIdentifier: "keep_counting_past_the_plan",
      visibleText: "Seguir contando en voz alta más allá del ciento ocho",
      actionGroupName: "speak",
      resourceCost: null,
      freeTextIntentPatternSources: [
        "segu\\w* contando",
        "ciento (nueve|diez)",
        "cont\\w* mas alla"
      ],
      visibilityRequiredFlagNames: [],
      visibilityForbiddenFlagNames: [],
      outcome: {
        directorEntries: [
          {
            voice: "director_narration",
            markedParagraphs: [
              "Ciento nueve. Ciento diez. La voz cuenta a la par, encantada, medio tono por debajo. Ciento once. A partir de cierto número el Investigador ya no sabe cuál de las dos voces es la suya, y a partir de otro deja de importar.",
              "[[lento:Quien cuenta para el faro acaba siendo contado.]] El peldaño de más ya no está delante. Está [[temblor:debajo]].",
              "Abajo, muy lejos, una mujer con un abrigo demasiado grande levanta la vista hacia la torre y empieza una página nueva en su libreta."
            ]
          }
        ],
        elapsedMinutes: 1,
        grantedLivedExperienceFlagNames: [],
        personIdentifiersBecomingKnown: [],
        relationshipChanges: [],
        stagingEvents: [
          {
            kind: "critical_failure",
            anchorDirectorEntryIndex: 0,
            anchorParagraphIndex: 1
          }
        ],
        conditionsGained: [],
        conditionIdentifiersEnded: [],
        additionalWitnessedOriginIdentifiers: [],
        perceptionClarificationText: null,
        seriousWoundCauseText: null,
        criticalFailureCauseText: "Siguió contando en voz alta más allá del último peldaño del plano, con la cabeza ya tomada por la torre.",
        presentedInteractivePieceIdentifiers: [],
        shouldUpdateJournal: true,
        destination: {
          kind: "close_archive",
          endingIdentifier: "death_became_the_tenth"
        }
      },
      conditionalOutcomes: []
    },
    {
      actionIdentifier: "descend_to_keeper_room",
      visibleText: "Bajar al cuarto del farero y sentarse un rato lejos de la escalera",
      actionGroupName: "move",
      resourceCost: null,
      freeTextIntentPatternSources: [
        "baj\\w*",
        "descans\\w*",
        "volv\\w* abajo"
      ],
      visibilityRequiredFlagNames: [],
      visibilityForbiddenFlagNames: [],
      outcome: {
        directorEntries: [
          {
            voice: "director_narration",
            markedParagraphs: [
              "El Investigador baja de espaldas al hueco, sin contar, y se sienta en la silla del farero con los ojos cerrados hasta que el pulso y el segundero vuelven a ponerse de acuerdo. Cuando mira otra vez el reloj, la hora es una hora cualquiera, fea y verdadera."
            ]
          }
        ],
        elapsedMinutes: 15,
        grantedLivedExperienceFlagNames: [],
        personIdentifiersBecomingKnown: [],
        relationshipChanges: [],
        stagingEvents: [],
        conditionsGained: [],
        conditionIdentifiersEnded: [
          "tower_disorientation"
        ],
        additionalWitnessedOriginIdentifiers: [],
        perceptionClarificationText: null,
        seriousWoundCauseText: null,
        criticalFailureCauseText: null,
        presentedInteractivePieceIdentifiers: [],
        shouldUpdateJournal: false,
        destination: {
          kind: "move_to_node",
          nodeIdentifier: "keeper_room_after_staircase"
        }
      },
      conditionalOutcomes: []
    }
  ],
  nodes: [
    {
      nodeIdentifier: "pier_arrival",
      sceneIdentifier: "pier_arrival",
      placeName: "Punta Ánimas · Muelle viejo",
      tensionTierName: "uneasy",
      presentPersons: [
        {
          personIdentifier: "renata_oquendo",
          presenceText: "Espera al final del muelle, con una libreta apretada contra el pecho."
        },
        {
          personIdentifier: "punta_animas_boatman",
          presenceText: "Sigue en la lancha, con una mano en el timón y los ojos en la torre."
        }
      ],
      perceivedPointsOfInterest: [
        {
          identifier: "pier_point_lighthouse_door",
          visibleName: "La puerta entreabierta del faro"
        },
        {
          identifier: "pier_point_outer_staircase",
          visibleName: "La escalera exterior de hierro"
        },
        {
          identifier: "pier_point_boat",
          visibleName: "La lancha, con el motor en marcha"
        }
      ],
      arrivalEntries: [
        {
          voice: "director_narration",
          markedParagraphs: [
            "El muelle viejo sigue donde estaba: tablones húmedos, olor a gasóleo, la lancha golpeando despacio contra los neumáticos. Sobre el agua, el haz pasa y vuelve a pasar."
          ]
        }
      ],
      actionIdentifiers: [
        "speak_with_waiting_woman",
        "listen_to_boatman_warning",
        "pay_boatman_to_wait",
        "walk_to_tower_foot"
      ],
      pieceSolvedOutcomes: []
    },
    {
      nodeIdentifier: "tower_foot",
      sceneIdentifier: "tower_foot",
      placeName: "Punta Ánimas · Pie del faro",
      tensionTierName: "uneasy",
      presentPersons: [
        {
          personIdentifier: "renata_oquendo",
          presenceText: "Se ha quedado a unos pasos de la puerta, con la libreta cerrada y la vista en lo alto."
        }
      ],
      perceivedPointsOfInterest: [
        {
          identifier: "tower_foot_point_watch_register",
          visibleName: "El registro de guardia clavado junto a la puerta"
        },
        {
          identifier: "tower_foot_point_service_door",
          visibleName: "La puerta de servicio, en la cara norte"
        },
        {
          identifier: "tower_foot_point_main_door",
          visibleName: "La puerta principal, entreabierta"
        }
      ],
      arrivalEntries: [
        {
          voice: "director_narration",
          markedParagraphs: [
            "Al pie de la torre el viento se corta de golpe. La puerta principal sigue entreabierta el mismo palmo. El registro de guardia cruje en su clavo. Arriba, el haz da otra vuelta."
          ]
        }
      ],
      actionIdentifiers: [
        "examine_watch_register",
        "inspect_service_door",
        "enter_main_door",
        "evacuate_renata_and_withdraw"
      ],
      pieceSolvedOutcomes: [
        {
          interactivePieceIdentifier: "interactive_piece_0001",
          outcome: {
            directorEntries: [
              {
                voice: "director_narration",
                markedParagraphs: [
                  "Tres. Uno. Dos. El pestillo salta con un chasquido limpio, de mecanismo cuidado. La hora que el registro repite año tras año era también la llave: quien cerró esta puerta quería que solo entrara alguien que hubiera leído.",
                  "La hoja gira sin un solo ruido. Dentro huele a grasa fría y a gasóleo de hace décadas. Arriba, nada ha dejado de contar."
                ]
              }
            ],
            elapsedMinutes: 1,
            grantedLivedExperienceFlagNames: [
              "machine_room_is_open"
            ],
            personIdentifiersBecomingKnown: [],
            relationshipChanges: [],
            stagingEvents: [],
            conditionsGained: [],
            conditionIdentifiersEnded: [],
            additionalWitnessedOriginIdentifiers: [],
            perceptionClarificationText: null,
            seriousWoundCauseText: null,
            criticalFailureCauseText: null,
            presentedInteractivePieceIdentifiers: [],
            shouldUpdateJournal: true,
            destination: {
              kind: "move_to_node",
              nodeIdentifier: "machine_room"
            }
          }
        }
      ]
    },
    {
      nodeIdentifier: "machine_room",
      sceneIdentifier: "machine_room",
      placeName: "Faro · Cuarto de máquinas",
      tensionTierName: "uneasy",
      presentPersons: [],
      perceivedPointsOfInterest: [
        {
          identifier: "machine_room_point_plates",
          visibleName: "Un cajón de madera con placas de latón"
        },
        {
          identifier: "machine_room_point_service_staircase",
          visibleName: "La escalera de servicio, estrecha y tapiada a medias"
        }
      ],
      arrivalEntries: [
        {
          voice: "director_narration",
          markedParagraphs: [
            "El cuarto de máquinas es un nicho de hierro: un generador desmontado, bidones vacíos, y contra la pared un cajón de madera con el rótulo [[documento:OBTURADORES · NO MONTAR SIN ORDEN]]. Al fondo arranca una escalera de servicio, recta y estrecha, que sube pegada al muro por fuera del hueco de la escalera principal."
          ]
        }
      ],
      actionIdentifiers: [
        "take_shutter_plates",
        "climb_service_staircase"
      ],
      pieceSolvedOutcomes: []
    },
    {
      nodeIdentifier: "lantern_room",
      sceneIdentifier: "lantern_room",
      placeName: "Faro · Cuarto de la linterna",
      tensionTierName: "lethal",
      presentPersons: [],
      perceivedPointsOfInterest: [
        {
          identifier: "lantern_room_point_optic",
          visibleName: "La óptica, girando sobre su baño de mercurio"
        },
        {
          identifier: "lantern_room_point_shutter_frame",
          visibleName: "Un bastidor de latón con cinco ranuras vacías"
        },
        {
          identifier: "lantern_room_point_gallery_door",
          visibleName: "La puerta de hierro que da a la galería exterior"
        }
      ],
      arrivalEntries: [
        {
          voice: "director_narration",
          markedParagraphs: [
            "El cuarto de la linterna es una jaula de cristal de ocho caras. En el centro, la óptica gira sin motor que la mueva. No hay lámpara dentro: hay un hueco con la forma de una llama, y de ese hueco sale la luz. Nueve destellos. Una pausa larga, como si alguien tomara aire.",
            "Frente a la óptica hay un bastidor de latón con cinco ranuras vacías. En un rincón, lonas viejas que huelen a brea. Una puerta de hierro da a la galería exterior."
          ]
        }
      ],
      actionIdentifiers: [
        "photograph_the_optic",
        "mount_shutter_plates",
        "stand_in_beam_and_answer",
        "ignite_flare_as_eleventh_light",
        "step_out_to_gallery"
      ],
      pieceSolvedOutcomes: [
        {
          interactivePieceIdentifier: "interactive_piece_0003",
          outcome: {
            directorEntries: [
              {
                voice: "director_narration",
                markedParagraphs: [
                  "La quinta placa entra en su ranura y las cinco se traban entre sí con un solo golpe sordo. El hueco con forma de llama sigue dando luz, pero la luz ya no sale: gira dentro de la jaula de latón como un animal que aprende el tamaño de su caja.",
                  "Fuera, por primera vez en treinta y nueve años, la bahía está a oscuras una madrugada entera. Ninguna puerta recibe visita. Ninguna cuenta se cierra, tampoco. En algún punto de la escalera, una voz cansada sigue contando, y nadie va a bajar esta noche."
                ]
              },
              {
                voice: "inner_thought",
                thoughtOriginName: "own_reasoning",
                markedParagraphs: [
                  "Callar no es soltar. El farero lo dejó escrito. Esto compra tiempo, y el tiempo tiene dueño."
                ]
              }
            ],
            elapsedMinutes: 2,
            grantedLivedExperienceFlagNames: [
              "resolution_by_containment"
            ],
            personIdentifiersBecomingKnown: [],
            relationshipChanges: [],
            stagingEvents: [],
            conditionsGained: [],
            conditionIdentifiersEnded: [],
            additionalWitnessedOriginIdentifiers: [],
            perceptionClarificationText: null,
            seriousWoundCauseText: null,
            criticalFailureCauseText: null,
            presentedInteractivePieceIdentifiers: [],
            shouldUpdateJournal: true,
            destination: {
              kind: "close_archive",
              endingIdentifier: "ending_fixed_shutters"
            }
          }
        }
      ]
    },
    {
      nodeIdentifier: "outer_gallery",
      sceneIdentifier: "outer_gallery",
      placeName: "Faro · Galería exterior",
      tensionTierName: "lethal",
      presentPersons: [],
      perceivedPointsOfInterest: [
        {
          identifier: "gallery_point_railing",
          visibleName: "La barandilla de hierro, comida por la sal"
        },
        {
          identifier: "gallery_point_lantern_door",
          visibleName: "La puerta de hierro del cuarto de la linterna"
        }
      ],
      arrivalEntries: [
        {
          voice: "director_narration",
          markedParagraphs: [
            "La galería es un anillo de rejilla de un metro de ancho alrededor de la linterna, a treinta metros sobre las rocas. La barandilla está comida por la sal: al rozarla con la cadera cede un dedo hacia fuera, y un tornillo se suelta, rebota en la rejilla y cae. Tarda mucho en sonar abajo.",
            "Desde aquí el haz pasa a la altura del pecho. Nueve veces. Luego la pausa."
          ]
        }
      ],
      actionIdentifiers: [
        "test_gallery_railing",
        "face_tenth_flash_on_gallery"
      ],
      pieceSolvedOutcomes: []
    },
    {
      nodeIdentifier: "outer_gallery_bent_railing",
      sceneIdentifier: "outer_gallery",
      placeName: "Faro · Galería exterior",
      tensionTierName: "lethal",
      presentPersons: [],
      perceivedPointsOfInterest: [
        {
          identifier: "gallery_point_railing",
          visibleName: "La barandilla de hierro, comida por la sal"
        },
        {
          identifier: "gallery_point_lantern_door",
          visibleName: "La puerta de hierro del cuarto de la linterna"
        }
      ],
      arrivalEntries: [],
      actionIdentifiers: [
        "face_tenth_flash_on_gallery_again",
        "enter_lantern_room_from_gallery"
      ],
      pieceSolvedOutcomes: []
    },
    {
      nodeIdentifier: "lantern_room_after_gallery",
      sceneIdentifier: "lantern_room",
      placeName: "Faro · Cuarto de la linterna",
      tensionTierName: "lethal",
      presentPersons: [],
      perceivedPointsOfInterest: [
        {
          identifier: "lantern_room_point_optic",
          visibleName: "La óptica, girando sobre su baño de mercurio"
        },
        {
          identifier: "lantern_room_point_shutter_frame",
          visibleName: "Un bastidor de latón con cinco ranuras vacías"
        },
        {
          identifier: "lantern_room_point_gallery_door",
          visibleName: "La puerta de hierro que da a la galería exterior"
        }
      ],
      arrivalEntries: [
        {
          voice: "director_narration",
          markedParagraphs: [
            "El cuarto de la linterna es una jaula de cristal de ocho caras. En el centro, la óptica gira sin motor que la mueva. No hay lámpara dentro: hay un hueco con la forma de una llama, y de ese hueco sale la luz. Nueve destellos. Una pausa larga, como si alguien tomara aire.",
            "Frente a la óptica hay un bastidor de latón con cinco ranuras vacías. En un rincón, lonas viejas que huelen a brea. Una puerta de hierro da a la galería exterior."
          ]
        }
      ],
      actionIdentifiers: [
        "photograph_the_optic",
        "mount_shutter_plates",
        "stand_in_beam_and_answer"
      ],
      pieceSolvedOutcomes: [
        {
          interactivePieceIdentifier: "interactive_piece_0003",
          outcome: {
            directorEntries: [
              {
                voice: "director_narration",
                markedParagraphs: [
                  "La quinta placa entra en su ranura y las cinco se traban entre sí con un solo golpe sordo. El hueco con forma de llama sigue dando luz, pero la luz ya no sale: gira dentro de la jaula de latón como un animal que aprende el tamaño de su caja.",
                  "Fuera, por primera vez en treinta y nueve años, la bahía está a oscuras una madrugada entera. Ninguna puerta recibe visita. Ninguna cuenta se cierra, tampoco. En algún punto de la escalera, una voz cansada sigue contando, y nadie va a bajar esta noche."
                ]
              },
              {
                voice: "inner_thought",
                thoughtOriginName: "own_reasoning",
                markedParagraphs: [
                  "Callar no es soltar. El farero lo dejó escrito. Esto compra tiempo, y el tiempo tiene dueño."
                ]
              }
            ],
            elapsedMinutes: 2,
            grantedLivedExperienceFlagNames: [
              "resolution_by_containment"
            ],
            personIdentifiersBecomingKnown: [],
            relationshipChanges: [],
            stagingEvents: [],
            conditionsGained: [],
            conditionIdentifiersEnded: [],
            additionalWitnessedOriginIdentifiers: [],
            perceptionClarificationText: null,
            seriousWoundCauseText: null,
            criticalFailureCauseText: null,
            presentedInteractivePieceIdentifiers: [],
            shouldUpdateJournal: true,
            destination: {
              kind: "close_archive",
              endingIdentifier: "ending_fixed_shutters"
            }
          }
        }
      ]
    },
    {
      nodeIdentifier: "keeper_room",
      sceneIdentifier: "keeper_room",
      placeName: "Faro · Cuarto del farero",
      tensionTierName: "uneasy",
      presentPersons: [
        {
          personIdentifier: "renata_oquendo",
          presenceText: "De pie en el umbral, sin cruzarlo. Mira la mesa de su maestro desde lejos."
        }
      ],
      perceivedPointsOfInterest: [
        {
          identifier: "keeper_room_point_logbook",
          visibleName: "El cuaderno del farero, abierto sobre la mesa"
        },
        {
          identifier: "keeper_room_point_brass_disc",
          visibleName: "Un disco de latón con dos coronas de letras"
        },
        {
          identifier: "keeper_room_point_staircase",
          visibleName: "El arranque de la escalera de caracol"
        }
      ],
      arrivalEntries: [
        {
          voice: "director_narration",
          markedParagraphs: [
            "El cuarto del farero guarda el orden de alguien que pensaba volver: la taza boca abajo, el cuaderno abierto, un bolígrafo azul cruzado sobre la página, un disco de latón haciendo de pisapapeles. Por el hueco de la escalera baja, muy débil, una voz de hombre que cuenta."
          ]
        }
      ],
      actionIdentifiers: [
        "ask_renata_about_brother",
        "bag_blue_pen_evidence",
        "read_keeper_logbook",
        "ask_renata_before_writing_name",
        "finish_keeper_inventory",
        "start_up_inner_staircase",
        "evacuate_renata_and_withdraw"
      ],
      pieceSolvedOutcomes: [
        {
          interactivePieceIdentifier: "interactive_piece_0002",
          outcome: {
            directorEntries: [
              {
                voice: "director_narration",
                markedParagraphs: [
                  "Nueve letras desde la luz. La corona interior encaja con un clic de relojería y los bloques de mayúsculas se ordenan solos en castellano, en la letra mental de un hombre que llevaba años queriendo decirlo.",
                  "[[documento:Eran diez. Apunté nueve. La décima era Elvira Sanjurjo y no debía subir a esa barca.]] [[documento:Yo lo sabía y no la apunté, porque apuntarla era confesar que la dejé subir.]]",
                  "[[documento:La luz cuenta a los que faltan y a ella nunca la encuentra en la lista. Por eso cuenta de más.]] [[documento:Por eso busca. Que alguien escriba su nombre donde yo no pude.]]"
                ]
              },
              {
                voice: "inner_thought",
                thoughtOriginName: "own_reasoning",
                markedParagraphs: [
                  "Falta un nombre en la lista, y es el de la madre de Renata. Ya no es una sospecha: está escrito."
                ]
              }
            ],
            elapsedMinutes: 1,
            grantedLivedExperienceFlagNames: [
              "essential_conclusion_by_document",
              "knows_missing_name"
            ],
            personIdentifiersBecomingKnown: [],
            relationshipChanges: [],
            stagingEvents: [],
            conditionsGained: [],
            conditionIdentifiersEnded: [],
            additionalWitnessedOriginIdentifiers: [],
            perceptionClarificationText: null,
            seriousWoundCauseText: null,
            criticalFailureCauseText: null,
            presentedInteractivePieceIdentifiers: [],
            shouldUpdateJournal: true,
            destination: {
              kind: "stay_in_node"
            }
          }
        }
      ]
    },
    {
      nodeIdentifier: "inner_staircase",
      sceneIdentifier: "inner_staircase",
      placeName: "Faro · Escalera interior",
      tensionTierName: "threatening",
      presentPersons: [],
      perceivedPointsOfInterest: [
        {
          identifier: "staircase_point_voice",
          visibleName: "La voz que cuenta, más arriba"
        },
        {
          identifier: "staircase_point_plan",
          visibleName: "El plano de la torre: ciento ocho peldaños"
        }
      ],
      arrivalEntries: [
        {
          voice: "director_narration",
          markedParagraphs: [
            "La escalera de caracol se enrosca hacia arriba sin barandilla por el lado del hueco. Desde algún punto de la espiral, una voz de hombre cuenta peldaños con la monotonía de quien lleva toda la noche haciéndolo y no puede parar. El reloj del Investigador hace un ruido seco y el segundero se queda quieto."
          ]
        }
      ],
      actionIdentifiers: [
        "climb_inner_staircase",
        "climb_without_counting",
        "call_brother_by_his_name"
      ],
      pieceSolvedOutcomes: []
    },
    {
      nodeIdentifier: "inner_staircase_voice",
      sceneIdentifier: "inner_staircase",
      placeName: "Faro · Escalera interior",
      tensionTierName: "threatening",
      presentPersons: [],
      perceivedPointsOfInterest: [
        {
          identifier: "staircase_point_voice",
          visibleName: "La voz que cuenta, más arriba"
        },
        {
          identifier: "staircase_point_plan",
          visibleName: "El plano de la torre: ciento ocho peldaños"
        }
      ],
      arrivalEntries: [],
      actionIdentifiers: [
        "examine_warm_boot",
        "answer_voice_with_own_name",
        "call_brother_by_his_name",
        "give_the_voice_the_name_it_asks_for",
        "keep_counting_past_the_plan",
        "descend_to_keeper_room"
      ],
      pieceSolvedOutcomes: []
    },
    {
      nodeIdentifier: "keeper_room_after_staircase",
      sceneIdentifier: "keeper_room",
      placeName: "Faro · Cuarto del farero",
      tensionTierName: "uneasy",
      presentPersons: [
        {
          personIdentifier: "renata_oquendo",
          presenceText: "De pie en el umbral, sin cruzarlo. Mira la mesa de su maestro desde lejos."
        }
      ],
      perceivedPointsOfInterest: [
        {
          identifier: "keeper_room_point_logbook",
          visibleName: "El cuaderno del farero, abierto sobre la mesa"
        },
        {
          identifier: "keeper_room_point_brass_disc",
          visibleName: "Un disco de latón con dos coronas de letras"
        },
        {
          identifier: "keeper_room_point_staircase",
          visibleName: "El arranque de la escalera de caracol"
        }
      ],
      arrivalEntries: [
        {
          voice: "director_narration",
          markedParagraphs: [
            "El cuarto del farero guarda el orden de alguien que pensaba volver: la taza boca abajo, el cuaderno abierto, un bolígrafo azul cruzado sobre la página, un disco de latón haciendo de pisapapeles. Por el hueco de la escalera baja, muy débil, una voz de hombre que cuenta."
          ]
        }
      ],
      actionIdentifiers: [
        "ask_renata_about_brother",
        "bag_blue_pen_evidence",
        "read_keeper_logbook",
        "ask_renata_before_writing_name",
        "finish_keeper_inventory",
        "evacuate_renata_and_withdraw"
      ],
      pieceSolvedOutcomes: [
        {
          interactivePieceIdentifier: "interactive_piece_0002",
          outcome: {
            directorEntries: [
              {
                voice: "director_narration",
                markedParagraphs: [
                  "Nueve letras desde la luz. La corona interior encaja con un clic de relojería y los bloques de mayúsculas se ordenan solos en castellano, en la letra mental de un hombre que llevaba años queriendo decirlo.",
                  "[[documento:Eran diez. Apunté nueve. La décima era Elvira Sanjurjo y no debía subir a esa barca.]] [[documento:Yo lo sabía y no la apunté, porque apuntarla era confesar que la dejé subir.]]",
                  "[[documento:La luz cuenta a los que faltan y a ella nunca la encuentra en la lista. Por eso cuenta de más.]] [[documento:Por eso busca. Que alguien escriba su nombre donde yo no pude.]]"
                ]
              },
              {
                voice: "inner_thought",
                thoughtOriginName: "own_reasoning",
                markedParagraphs: [
                  "Falta un nombre en la lista, y es el de la madre de Renata. Ya no es una sospecha: está escrito."
                ]
              }
            ],
            elapsedMinutes: 1,
            grantedLivedExperienceFlagNames: [
              "essential_conclusion_by_document",
              "knows_missing_name"
            ],
            personIdentifiersBecomingKnown: [],
            relationshipChanges: [],
            stagingEvents: [],
            conditionsGained: [],
            conditionIdentifiersEnded: [],
            additionalWitnessedOriginIdentifiers: [],
            perceptionClarificationText: null,
            seriousWoundCauseText: null,
            criticalFailureCauseText: null,
            presentedInteractivePieceIdentifiers: [],
            shouldUpdateJournal: true,
            destination: {
              kind: "stay_in_node"
            }
          }
        }
      ]
    }
  ],
  interactivePieces: [
    {
      publicDefinition: {
        interactivePieceIdentifier: "interactive_piece_0001",
        familyName: "spatial_mechanical",
        visibleTitle: "Candado de tres diales",
        diegeticPurposeText: "Cierra la puerta de servicio del faro. Es nuevo, de latón, y alguien lo mantiene engrasado.",
        visibleRuleTexts: [
          "El pestillo solo salta con las tres cifras exactas, leídas de izquierda a derecha."
        ],
        publicState: {
          widgetKindName: "combination_dials",
          dials: [
            {
              dialIdentifier: "lock_dial_left",
              visibleLabel: "Dial izquierdo",
              symbols: [
                "0",
                "1",
                "2",
                "3",
                "4",
                "5",
                "6",
                "7",
                "8",
                "9"
              ]
            },
            {
              dialIdentifier: "lock_dial_middle",
              visibleLabel: "Dial central",
              symbols: [
                "0",
                "1",
                "2",
                "3",
                "4",
                "5",
                "6",
                "7",
                "8",
                "9"
              ]
            },
            {
              dialIdentifier: "lock_dial_right",
              visibleLabel: "Dial derecho",
              symbols: [
                "0",
                "1",
                "2",
                "3",
                "4",
                "5",
                "6",
                "7",
                "8",
                "9"
              ]
            }
          ]
        },
        attemptElapsedMinutes: 2,
        isFreeTextAnswerAllowed: true
      },
      privateSolution: {
        widgetKindName: "combination_dials",
        chosenSymbols: [
          "3",
          "1",
          "2"
        ]
      },
      privateRuleChecks: [
        {
          ruleKindName: "exact_combination",
          visibleRuleText: "El pestillo solo salta con las tres cifras exactas, leídas de izquierda a derecha."
        }
      ],
      failedAttemptNarrationParagraphs: [
        "El Investigador alinea las tres cifras y tira del arco. El pestillo no se mueve ni medio milímetro. Es un candado honesto: o es, o no es.",
        "Otra combinación, otro tirón. Nada. El latón está frío y perfectamente indiferente.",
        "El arco sigue en su sitio. Arriba, el haz da otra vuelta completa mientras el Investigador prueba."
      ],
      assistanceHintTextByLevelName: {
        gentle: "Quien puso este candado quería que lo abriera alguien que hubiera leído algo aquí mismo, al pie del faro.",
        medium: "Hay una hora que el registro de guardia repite en todas las entradas nuevas. Una hora tiene cifras.",
        direct: "Las tres y doce. Tres cifras, en el orden en que se leen."
      }
    },
    {
      publicDefinition: {
        interactivePieceIdentifier: "interactive_piece_0002",
        familyName: "fictional_cryptography",
        visibleTitle: "Disco de cifrado del farero",
        diegeticPurposeText: "Dos coronas de alfabeto en latón. Sirve para leer las últimas páginas del cuaderno, escritas en bloques de mayúsculas.",
        visibleRuleTexts: [
          "Un solo giro de la corona vale para el texto entero.",
          "Con el giro correcto, todas las líneas se leen en castellano llano."
        ],
        publicState: {
          widgetKindName: "cipher_wheel",
          alphabetLetters: [
            "A",
            "B",
            "C",
            "D",
            "E",
            "F",
            "G",
            "H",
            "I",
            "J",
            "K",
            "L",
            "M",
            "N",
            "O",
            "P",
            "Q",
            "R",
            "S",
            "T",
            "U",
            "V",
            "W",
            "X",
            "Y",
            "Z"
          ],
          cipheredText: "NAJW MRNI. JYDWCN WDNEN. UJ MNLRVJ NAJ NUERAJ BJWSDASX H WX MNKRJ BDKRA.",
          wheelInscriptionText: "Se cuenta desde la luz"
        },
        attemptElapsedMinutes: 6,
        isFreeTextAnswerAllowed: true
      },
      privateSolution: {
        widgetKindName: "cipher_wheel",
        shiftPositions: 9
      },
      privateRuleChecks: [
        {
          ruleKindName: "exact_shift",
          visibleRuleText: "Con el giro correcto, todas las líneas se leen en castellano llano."
        }
      ],
      failedAttemptNarrationParagraphs: [
        "El Investigador fija la corona y lee el primer bloque por la de fuera. Sale un trabalenguas de consonantes. No es eso.",
        "Con ese giro, las mayúsculas se convierten en otras mayúsculas igual de mudas. El farero no escribió esto.",
        "Otra posición, otra línea ilegible. La inscripción del canto sigue ahí, paciente: se cuenta desde la luz."
      ],
      assistanceHintTextByLevelName: {
        gentle: "La inscripción del disco habla de contar, y de la luz. En este faro hay algo que se puede contar cada madrugada.",
        medium: "La clave de un farero está a la vista de todos, todas las noches. El faro da siempre el mismo número de destellos antes de la pausa.",
        direct: "Nueve destellos: la corona se gira nueve letras."
      }
    },
    {
      publicDefinition: {
        interactivePieceIdentifier: "interactive_piece_0003",
        familyName: "logic",
        visibleTitle: "Bastidor de obturadores",
        diegeticPurposeText: "Cinco placas de latón en cinco ranuras. En su orden, el haz no sale de la torre.",
        visibleRuleTexts: [
          "La estrella ocupa la ranura del centro.",
          "La media luna va justo antes del ojo.",
          "El círculo no toca a la estrella.",
          "La cruz queda después del ojo."
        ],
        publicState: {
          widgetKindName: "ordered_positions",
          pieces: [
            {
              pieceIdentifier: "shutter_plate_d",
              visibleName: "Placa de la cruz",
              symbolName: "cross"
            },
            {
              pieceIdentifier: "shutter_plate_c",
              visibleName: "Placa de la estrella",
              symbolName: "star"
            },
            {
              pieceIdentifier: "shutter_plate_b",
              visibleName: "Placa del círculo",
              symbolName: "circle"
            },
            {
              pieceIdentifier: "shutter_plate_e",
              visibleName: "Placa del ojo",
              symbolName: "eye"
            },
            {
              pieceIdentifier: "shutter_plate_a",
              visibleName: "Placa de la media luna",
              symbolName: "crescent"
            }
          ],
          initialOrderPieceIdentifiers: [
            "shutter_plate_d",
            "shutter_plate_c",
            "shutter_plate_b",
            "shutter_plate_e",
            "shutter_plate_a"
          ],
          positionLabels: [
            "Primera ranura",
            "Segunda ranura",
            "Ranura del centro",
            "Cuarta ranura",
            "Quinta ranura"
          ]
        },
        attemptElapsedMinutes: 5,
        isFreeTextAnswerAllowed: true
      },
      privateSolution: {
        widgetKindName: "ordered_positions",
        orderedPieceIdentifiers: [
          "shutter_plate_a",
          "shutter_plate_e",
          "shutter_plate_c",
          "shutter_plate_d",
          "shutter_plate_b"
        ]
      },
      privateRuleChecks: [
        {
          ruleKindName: "piece_at_position",
          pieceIdentifier: "shutter_plate_c",
          positionIndex: 2,
          visibleRuleText: "La estrella ocupa la ranura del centro."
        },
        {
          ruleKindName: "piece_immediately_before",
          pieceIdentifier: "shutter_plate_a",
          otherPieceIdentifier: "shutter_plate_e",
          visibleRuleText: "La media luna va justo antes del ojo."
        },
        {
          ruleKindName: "pieces_not_adjacent",
          pieceIdentifier: "shutter_plate_b",
          otherPieceIdentifier: "shutter_plate_c",
          visibleRuleText: "El círculo no toca a la estrella."
        },
        {
          ruleKindName: "piece_after",
          pieceIdentifier: "shutter_plate_d",
          otherPieceIdentifier: "shutter_plate_e",
          visibleRuleText: "La cruz queda después del ojo."
        }
      ],
      failedAttemptNarrationParagraphs: [
        "El Investigador encaja las cinco placas. Cuatro entran; la quinta topa contra un resalte y no baja. Ese no es el orden. Hay que sacarlas todas para volver a empezar, y la óptica no deja de girar.",
        "Las placas entran a medias y se quedan bailando en las ranuras, sin trabarse. El haz se cuela por las holguras, intacto.",
        "Otra vez el resalte. El fabricante grabó las reglas en el marco por algo."
      ],
      assistanceHintTextByLevelName: {
        gentle: "Una de las reglas fija una placa sin discusión. Conviene empezar por ella y ver qué huecos deja.",
        medium: "Con la estrella en el centro, la media luna y el ojo solo caben juntos a un lado. La cruz decide a cuál.",
        direct: "Media luna, ojo, estrella, cruz y círculo, de la primera ranura a la quinta."
      }
    }
  ],
  endings: [
    {
      endingIdentifier: "ending_closed_count",
      closingEntries: [
        {
          voice: "director_narration",
          markedParagraphs: [
            "El Investigador redacta el informe en la lancha, con letra firme. La cuenta del faro de Punta Ánimas está cerrada: diez nombres, diez líneas, ninguna en blanco. El hombre que faltaba desayuna con su hermana, y a ninguno de los dos le hace falta contar las tazas.",
            "Cuando la lancha dobla el espigón, el Investigador se vuelve a mirar la torre. Espera nueve destellos por costumbre. No hay ninguno. Por primera vez desde 1987, el faro está apagado del todo, y es solo un faro."
          ]
        }
      ],
      deathOutcome: null
    },
    {
      endingIdentifier: "ending_own_name",
      closingEntries: [
        {
          voice: "director_narration",
          markedParagraphs: [
            "El Investigador redacta el informe en la lancha, respirando corto, con el costado vendado con lo que había. El hombre que faltaba está vivo. El faro dudó, soltó lo que tenía y golpeó a quien se atrevió a contestarle con su propio nombre.",
            "Cuando la lancha dobla el espigón, la torre está apagada. El Investigador no sabría jurar que vaya a seguir así: a esa cuenta le sigue faltando algo, y las cuentas a las que les falta algo tienen paciencia."
          ]
        }
      ],
      deathOutcome: null
    },
    {
      endingIdentifier: "ending_foreign_light",
      closingEntries: [
        {
          voice: "director_narration",
          markedParagraphs: [
            "El Investigador redacta el informe en la lancha mientras, en el muelle, tres vecinos discuten a gritos sobre la luz roja de anoche y un cuarto la enseña grabada en su teléfono. El faro está apagado de verdad. El hombre que faltaba está vivo. Y el incidente ya no le pertenece a la OICNAU.",
            "La casilla de «discreción operativa» se queda sin marcar. Hay victorias que hacen mucho ruido."
          ]
        }
      ],
      deathOutcome: null
    },
    {
      endingIdentifier: "ending_fixed_shutters",
      closingEntries: [
        {
          voice: "director_narration",
          markedParagraphs: [
            "El Investigador redacta el informe en la lancha. Anoche el haz no salió de la torre y ninguna puerta de Punta Ánimas recibió visita: eso es un hecho y va en la primera línea. En la segunda va el otro: dentro de la jaula de latón la luz sigue girando, y en la escalera alguien sigue contando.",
            "Es un informe de contención. Deja un hilo abierto, con nombre y apellido, en el peldaño ciento nueve."
          ]
        }
      ],
      deathOutcome: null
    },
    {
      endingIdentifier: "ending_retreat_with_renata",
      closingEntries: [
        {
          voice: "director_narration",
          markedParagraphs: [
            "El Investigador redacta el informe en la lancha. Es corto. Dos personas salieron con vida del pie de la torre. Un hombre sigue dentro. Una casa de la calle del puerto amaneció con la mesa puesta para dos y nadie a quien servir.",
            "El faro dará nueve destellos esta madrugada. Tal vez diez. El Archivo se cierra con sanción y sin gloria, que es como se cierran casi todos."
          ]
        }
      ],
      deathOutcome: null
    },
    {
      endingIdentifier: "death_became_the_tenth",
      closingEntries: [],
      deathOutcome: {
        kind: "chronicle_closed_by_death",
        deathNatureName: "psychological",
        deathCauseName: "critical_failure",
        perceptibleCauseText: "En la escalera del faro de Punta Ánimas, el Investigador le dio a la torre lo que la torre pedía. Desde esa madrugada el faro da diez destellos.",
        epitaphRewriteText: "El Investigador es el décimo destello.",
        intrusiveOptionText: "Contar uno más"
      }
    },
    {
      endingIdentifier: "death_gallery_fall",
      closingEntries: [],
      deathOutcome: {
        kind: "chronicle_closed_by_death",
        deathNatureName: "physical",
        deathCauseName: "critical_failure",
        perceptibleCauseText: "La barandilla de la galería del faro de Punta Ánimas, ya vencida por un primer golpe, no aguantó el segundo. Treinta metros hasta las rocas.",
        epitaphRewriteText: null,
        intrusiveOptionText: null
      }
    }
  ],
  objectives: [
    {
      objectiveIdentifier: "origin_of_tenth_flash",
      visibleText: "Determinar el origen del décimo destello",
      requiredLivedExperienceFlagNames: [
        "knows_missing_name"
      ],
      forbiddenLivedExperienceFlagNames: []
    },
    {
      objectiveIdentifier: "missing_man_located",
      visibleText: "Localizar al hombre desaparecido",
      requiredLivedExperienceFlagNames: [
        "brother_was_freed"
      ],
      forbiddenLivedExperienceFlagNames: []
    },
    {
      objectiveIdentifier: "no_further_disappearances",
      visibleText: "Evitar nuevas desapariciones durante el plazo",
      requiredLivedExperienceFlagNames: [],
      forbiddenLivedExperienceFlagNames: [
        "house_was_taken"
      ]
    },
    {
      objectiveIdentifier: "incident_kept_from_press",
      visibleText: "Mantener el incidente fuera de la prensa",
      requiredLivedExperienceFlagNames: [],
      forbiddenLivedExperienceFlagNames: [
        "bay_witnessed_the_light"
      ]
    }
  ],
  aliveClosingEpilogue: {
    placeName: "Punta Ánimas · Muelle viejo",
    dawnWorldClockMinutes: 400,
    reportElapsedMinutes: 20,
    entries: [
      {
        voice: "director_narration",
        markedParagraphs: [
          "Amanece gris sobre Punta Ánimas. A la luz del día el faro es una torre apagada con la puerta entreabierta, y cuesta creer que haya sido otra cosa. Las gaviotas vuelven a posarse en la galería. El reloj del Investigador anda."
        ]
      },
      {
        voice: "inner_thought",
        thoughtOriginName: "own_reasoning",
        markedParagraphs: [
          "Lo que se sabe, se escribe. Lo que no se sabe, se deja en blanco. Inventar es otra forma de contar de más."
        ]
      }
    ]
  },
  entropySignals: [
    {
      signalFlagName: "first_entropy_signal_was_given",
      minimumStateVersion: 10,
      markedParagraph: "Desde donde está, el Investigador alcanza a ver la orilla por un ventanuco. El haz ya no barre las casas al mismo paso que al llegar: se detiene en cada puerta un poco más, como quien lee los números."
    },
    {
      signalFlagName: "second_entropy_signal_was_given",
      minimumStateVersion: 18,
      markedParagraph: "La pausa después del noveno destello es cada vez más larga. En el pueblo se ha encendido una ventana, luego otra. El haz se queda en cada puerta lo que dura una respiración, y algunas puertas empiezan a devolverle la mirada."
    }
  ],
  aliveEndingClosingEntries: [
    {
      requiredLivedExperienceFlagNames: [
        "knows_missing_name"
      ],
      entry: {
        voice: "director_narration",
        markedParagraphs: [
          "En la casilla del origen, el Investigador escribe lo que sabe: que en 1987 embarcaron diez y se apuntaron nueve, y que la torre llevaba treinta y nueve años buscando el nombre que faltaba en su lista."
        ]
      }
    },
    {
      requiredLivedExperienceFlagNames: [],
      entry: {
        voice: "inner_thought",
        thoughtOriginName: "own_reasoning",
        markedParagraphs: [
          "En la casilla del origen del fenómeno, el Investigador escribe «no determinado» y no añade nada. Es la línea más honesta del informe y la que más va a molestar a quien lo lea."
        ]
      }
    }
  ]
}

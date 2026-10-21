import {
  boatmanPersonIdentifier,
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
import type { CaseSceneDefinition } from './lighthouse_case_script_types'

const boatmanTestimonyOutcome = createCaseBranchOutcome({
  directorEntries: [
    createNarrationEntry(
      'El lanchero tarda en contestar. Saca un cigarro, no lo enciende, lo guarda otra vez. Cuando habla lo hace mirando el agua, como quien devuelve algo que llevaba demasiado tiempo en el bolsillo.',
    ),
    createDialogueEntry(
      boatmanPersonIdentifier,
      'spoken',
      '«Mi padre estaba en este mismo muelle la noche que salió la barca. Tenía la costumbre de contar a la gente que embarcaba, por si luego había que dar parte. Contó [[diez]].»',
      '«El parte dijo nueve. Mi padre fue a la capitanía, dijo que faltaba una, y le contestaron que el farero llevaba la lista y que la lista estaba bien. La décima era la Elvira, la madre de esa muchacha. No tenía que ir a bordo. El farero lo sabía y no la apuntó.»',
    ),
    createNarrationEntry(
      'Se santigua otra vez, más despacio. No pide que {{nombre}} guarde el secreto. Parece aliviado de que ya no sea solo suyo.',
    ),
  ],
  elapsedMinutes: 9,
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
      perceptibleCauseText: 'Contó lo que su padre vio en 1987 sin pedir nada a cambio.',
    },
  ],
})

export const oldPierScene: CaseSceneDefinition = {
  sceneIdentifier: lighthouseCaseSceneIdentifiers.oldPier,
  placeName: 'Punta Ánimas · Muelle viejo',
  tensionTierName: 'uneasy',
  presentPersons: [
    {
      personIdentifier: renataPersonIdentifier,
      presenceText: 'Espera al final del muelle, con una libreta apretada contra el pecho.',
      presenceCondition: null,
    },
    {
      personIdentifier: boatmanPersonIdentifier,
      presenceText: 'Sigue en la lancha, con una mano en el timón y los ojos en la torre.',
      presenceCondition: null,
    },
  ],
  perceivedPointsOfInterest: [
    { identifier: 'pier_point_lighthouse_door', visibleName: 'La puerta entreabierta del faro' },
    { identifier: 'pier_point_outer_staircase', visibleName: 'La escalera exterior de hierro' },
    { identifier: 'pier_point_boat', visibleName: 'La lancha, con el motor en marcha' },
  ],
  arrivalEntries: [
    createNarrationEntry(
      'El muelle viejo sigue donde estaba: tablones húmedos, olor a gasóleo, la lancha golpeando despacio contra los neumáticos. Sobre el agua, el haz pasa y vuelve a pasar.',
    ),
  ],
  actionBranches: [
    createCaseActionBranch({
      branchIdentifier: 'speak_with_waiting_woman',
      visibleText: 'Hablar con la mujer que espera al final del muelle',
      actionGroupName: 'speak',
      freeTextIntentPatternSources: ['habl\\w* con (la mujer|ella|renata)', 'mujer del abrigo', 'acerc\\w* a la mujer', 'pregunt\\w* a la mujer'],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [
          createNarrationEntry(
            'La mujer no retrocede cuando {{nombre}} se acerca, pero tampoco suelta la libreta. Tiene las manos de quien ha trabajado con cabos y los ojos de quien lleva dos noches sin cerrarlos.',
          ),
          createDialogueEntry(
            renataPersonIdentifier,
            'spoken',
            '«Renata Oquendo. Fui la última aprendiz del farero, cuando esto todavía alumbraba barcos.» Habla bajo, sin dejar de mirar la linterna apagada de la torre.',
            '«Mi hermano subió anoche a contar. Decía que si contabas bien, el faro te devolvía a alguien. [[pausa:500]]No ha bajado.»',
          ),
          createNarrationEntry(
            'Abre la libreta: columnas de palitos, noche tras noche, siempre nueve. La última página tiene diez, y el décimo está trazado con [[otra letra]].',
          ),
        ],
        elapsedMinutes: 9,
        personIdentifiersBecomingKnown: [renataPersonIdentifier],
        grantedLivedExperienceFlagNames: [lighthouseCaseFlagNames.spokeWithRenata],
        relationshipChanges: [
          {
            personIdentifier: renataPersonIdentifier,
            directionName: 'toward_investigator_as_perceived',
            dimensionName: null,
            levelChange: 1,
            perceptibleCauseText: 'Alguien la escuchó antes de entrar al faro, y ella abrió la libreta.',
          },
          {
            personIdentifier: renataPersonIdentifier,
            directionName: 'from_investigator',
            dimensionName: null,
            levelChange: 1,
            perceptibleCauseText: 'Su relato coincide con los diez destellos contados al desembarcar.',
          },
        ],
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'listen_to_boatman_warning',
      visibleText: 'Quedarse un momento junto a la lancha y dejar que el lanchero hable',
      actionGroupName: 'speak',
      freeTextIntentPatternSources: ['escuch\\w* al lanchero', 'dej\\w* que el lanchero', 'habl\\w* con el lanchero', 'convers\\w* con el lanchero'],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [
          createNarrationEntry(
            '{{nombre}} no pregunta nada. Se queda junto a la borda, con las manos quietas, y el silencio hace el trabajo. El lanchero aguanta tres destellos antes de romperlo.',
          ),
          createDialogueEntry(
            boatmanPersonIdentifier,
            'spoken',
            '«Yo traigo gente hasta aquí y me vuelvo. No subo. Nadie de la bahía sube.» Escupe al agua. «Le voy a decir una cosa y haga con ella lo que quiera: si oye que el faro dice su nombre, [[no conteste]]. Y si le pide otro nombre, menos.»',
          ),
          createNarrationEntry(
            '{{nombre}} asiente sin sonreír. El lanchero lo nota, y algo en sus hombros baja un dedo. {{nombre}} no le ha dicho su nombre a nadie en este pueblo.',
          ),
        ],
        elapsedMinutes: 6,
        grantedLivedExperienceFlagNames: [lighthouseCaseFlagNames.boatmanWasHeard],
        relationshipChanges: [
          {
            personIdentifier: boatmanPersonIdentifier,
            directionName: 'toward_investigator_as_perceived',
            dimensionName: null,
            levelChange: 2,
            perceptibleCauseText: 'Su advertencia fue escuchada en serio, sin burla y sin prisa.',
          },
        ],
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'count_flashes_from_boat',
      visibleText: 'Volver a la lancha y contar los destellos con el cronómetro',
      actionGroupName: 'examine',
      freeTextIntentPatternSources: ['cont\\w* (los )?destellos', 'cronomet\\w*', 'medir (el|los) (ritmo|destellos)'],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [
          createNarrationEntry(
            '{{nombre}} cronometra tres ciclos completos desde la lancha. Nueve destellos cada doce segundos, exactos como un metrónomo. El décimo no sigue el ritmo: llega cuando alguien en la orilla lo está [[mirando]].',
            'El lanchero se santigua sin disimulo y cuenta también, moviendo los labios.',
          ),
          createDialogueEntry(boatmanPersonIdentifier, 'whispered', '«Antes no hacía eso.» No aclara si habla del faro o de sí mismo.'),
        ],
        elapsedMinutes: 10,
        relationshipChanges: [
          {
            personIdentifier: boatmanPersonIdentifier,
            directionName: 'toward_investigator_as_perceived',
            dimensionName: null,
            levelChange: 1,
            perceptibleCauseText: 'Contaron los destellos a la par, sin que nadie se riera de su gesto.',
          },
        ],
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'pay_boatman_to_wait',
      visibleText: 'Pagar al lanchero para que espere hasta el amanecer',
      actionGroupName: 'use_or_spend',
      resourceCost: { kind: 'operational_funds', amount: 120 },
      freeTextIntentPatternSources: ['pag\\w* al lanchero', 'que (me )?espere', 'contrat\\w* al lanchero', 'dar\\w* dinero al lanchero'],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [
          createNarrationEntry(
            'El lanchero cuenta los billetes dos veces y apaga por fin el motor. El silencio que queda es peor que el ruido.',
          ),
          createDialogueEntry(
            boatmanPersonIdentifier,
            'spoken',
            '«Hasta que claree, ni un minuto más. Y si oye que el faro dice su nombre, no conteste.»',
          ),
          createNarrationEntry('Amarra la lancha con un nudo corto, de los que se sueltan de un tirón.'),
        ],
        elapsedMinutes: 5,
        grantedLivedExperienceFlagNames: [lighthouseCaseFlagNames.boatmanWasPaid],
        relationshipChanges: [
          {
            personIdentifier: boatmanPersonIdentifier,
            directionName: 'toward_investigator_as_perceived',
            dimensionName: 'employment',
            levelChange: 1,
            perceptibleCauseText: 'Cobró por adelantado y sin regateo la espera hasta el alba.',
          },
        ],
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'ask_boatman_about_the_shipwreck_year',
      visibleText: 'Preguntar al lanchero qué pasó en la bahía en 1987',
      actionGroupName: 'speak',
      freeTextIntentPatternSources: ['1987', 'naufragio', 'pregunt\\w* al lanchero', 'que paso (aquella|esa) noche', 'la barca'],
      conditionalOutcomes: [
        {
          condition: createBranchCondition({ requiredLivedExperienceFlagNames: [lighthouseCaseFlagNames.boatmanWasPaid] }),
          outcome: boatmanTestimonyOutcome,
        },
        {
          condition: createBranchCondition({
            minimumRelationshipLevels: [
              { personIdentifier: boatmanPersonIdentifier, directionName: 'toward_investigator_as_perceived', minimumLevel: 4 },
            ],
          }),
          outcome: boatmanTestimonyOutcome,
        },
      ],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [
          createNarrationEntry(
            'La pregunta cae demasiado pronto. El lanchero endurece la cara como quien cierra una escotilla.',
          ),
          createDialogueEntry(
            boatmanPersonIdentifier,
            'spoken',
            '«Yo a usted no le conozco de nada. Del ochenta y siete hablan los que quieren que les pase algo.» Da gas al motor para no oír la respuesta.',
          ),
          createNarrationEntry('Por esta noche, esa puerta queda cerrada. No hay trato entre los dos que la abra.'),
        ],
        elapsedMinutes: 4,
        additionalWitnessedOriginIdentifiers: ['boatman_refused_to_talk'],
        grantedLivedExperienceFlagNames: [lighthouseCaseFlagNames.boatmanClosedForTonight],
        relationshipChanges: [
          {
            personIdentifier: boatmanPersonIdentifier,
            directionName: 'toward_investigator_as_perceived',
            dimensionName: null,
            levelChange: -1,
            perceptibleCauseText: 'Le apretaron con 1987 sin haber trato ni confianza de por medio.',
          },
        ],
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'ignite_flare_outer_stairs',
      visibleText: 'Encender una bengala y subir por la escalera exterior',
      actionGroupName: 'use_or_spend',
      resourceCost: { kind: 'belonging', belongingIdentifier: 'signal_flare', units: 1 },
      freeTextIntentPatternSources: ['escalera exterior', 'sub\\w* por fuera', 'bengala.*(sub|escal)', '(sub|escal).*bengala'],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [
          createNarrationEntry(
            'La bengala prende con un siseo rojo y el muelle entero cambia de color. La escalera exterior está oxidada, pero aguanta. Cada peldaño suelta una escama de hierro que tarda en tocar el suelo.',
            'A media subida, {{nombre}} nota que su sombra sobre el muro no sube al mismo ritmo que el resto del cuerpo.',
            'Desde la galería se ve la bahía completa. No hay ningún barco al que avisar. El haz, cuando pasa, no ilumina el agua: ilumina la orilla, casa por casa, como si [[buscara]].',
          ),
        ],
        elapsedMinutes: 12,
        newPlaceName: 'Faro · Galería exterior',
        nextSceneIdentifier: lighthouseCaseSceneIdentifiers.outerGallery,
      }),
    }),
    createCaseActionBranch({
      branchIdentifier: 'walk_to_tower_foot',
      visibleText: 'Caminar hasta el pie del faro',
      actionGroupName: 'move',
      freeTextIntentPatternSources: ['(ir|voy|camin\\w*|acerc\\w*) (hasta |a |al |hacia )?(el )?(pie del )?faro', 'pie del faro', 'puerta del faro'],
      conditionalOutcomes: [
        {
          condition: createBranchCondition({ requiredLivedExperienceFlagNames: [lighthouseCaseFlagNames.spokeWithRenata] }),
          outcome: createCaseBranchOutcome({
            directorEntries: [
              createNarrationEntry(
                '{{nombre}} echa a andar hacia la torre y, sin que nadie se lo pida, Renata camina al lado. No dice nada. A veinte metros de la puerta empieza a contar los pasos en voz muy baja, se da cuenta, y se calla.',
                'De cerca el faro es más viejo y más alto. La cal se cae a pedazos. La puerta principal está entreabierta un palmo exacto, y del interior sale un aire más frío que el de la noche.',
              ),
            ],
            elapsedMinutes: 5,
            newPlaceName: 'Punta Ánimas · Pie del faro',
            grantedLivedExperienceFlagNames: [lighthouseCaseFlagNames.renataWalksAlong],
            nextSceneIdentifier: lighthouseCaseSceneIdentifiers.towerFoot,
          }),
        },
      ],
      defaultOutcome: createCaseBranchOutcome({
        directorEntries: [
          createNarrationEntry(
            '{{nombre}} pasa junto a la mujer del abrigo sin detenerse. Ella abre la boca, la cierra, y echa a andar detrás, a diez pasos, como quien sigue un entierro ajeno.',
            'De cerca el faro es más viejo y más alto. La cal se cae a pedazos. La puerta principal está entreabierta un palmo exacto, y del interior sale un aire más frío que el de la noche.',
          ),
        ],
        elapsedMinutes: 5,
        newPlaceName: 'Punta Ánimas · Pie del faro',
        nextSceneIdentifier: lighthouseCaseSceneIdentifiers.towerFoot,
      }),
    }),
  ],
  freeTextFallbackOutcome: createCaseBranchOutcome({
    directorEntries: [
      createNarrationEntry(
        '{{nombre}} lo intenta a su manera y el muelle responde con lo de siempre: madera húmeda, olor a gasóleo, un destello que pasa sin detenerse. Nada de lo que hay aquí se presta a eso, o no todavía.',
      ),
      createThoughtEntry('own_reasoning', 'La torre sigue ahí. La mujer de la libreta también. La lancha cabecea contra el muelle, esperando una decisión.'),
    ],
    elapsedMinutes: 4,
    shouldUpdateJournal: false,
  }),
  interactivePieceSolvedOutcomes: {},
}

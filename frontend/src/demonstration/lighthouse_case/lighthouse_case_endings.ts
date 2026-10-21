import type {
  ArchiveEndedAliveOutcome,
  ArchiveObjectiveResult,
  ArchivePerformanceRatingName,
} from '../../game_state/archive_turn_contract'
import { lighthouseCaseFlagNames } from './lighthouse_case_persons'
import { createNarrationEntry, createThoughtEntry } from './lighthouse_case_script_types'
import type { CaseEndingDefinition } from './lighthouse_case_script_types'

export const lighthouseCaseObjectiveTexts = {
  originOfTenthFlash: 'Determinar el origen del décimo destello',
  missingManLocated: 'Localizar al hombre desaparecido',
  noFurtherDisappearances: 'Evitar nuevas desapariciones durante el plazo',
  incidentKeptFromPress: 'Mantener el incidente fuera de la prensa',
}

export const lighthouseCaseEndingIdentifiers = {
  closedCount: 'ending_closed_count',
  ownName: 'ending_own_name',
  foreignLight: 'ending_foreign_light',
  fixedShutters: 'ending_fixed_shutters',
  retreatWithRenata: 'ending_retreat_with_renata',
  becameTheTenth: 'death_became_the_tenth',
  galleryFall: 'death_gallery_fall',
} as const

const unknownOriginClosingParagraph =
  'En la casilla del origen del fenómeno, {{nombre}} escribe «no determinado» y no añade nada. Es la línea más honesta del informe y la que más va a molestar a quien lo lea.'

const knownOriginClosingParagraph =
  'En la casilla del origen, {{nombre}} escribe lo que sabe: que en 1987 embarcaron diez y se apuntaron nueve, y que la torre llevaba treinta y nueve años buscando el nombre que faltaba en su lista.'

export const lighthouseCaseEndings: Record<string, CaseEndingDefinition> = {
  [lighthouseCaseEndingIdentifiers.closedCount]: {
    endingIdentifier: lighthouseCaseEndingIdentifiers.closedCount,
    closingEntries: [
      createNarrationEntry(
        '{{nombre}} redacta el informe en la lancha, con letra firme. La cuenta del faro de Punta Ánimas está cerrada: diez nombres, diez líneas, ninguna en blanco. El hombre que faltaba desayuna con su hermana, y a ninguno de los dos le hace falta contar las tazas.',
        'Cuando la lancha dobla el espigón, {{nombre}} se vuelve a mirar la torre. Espera nueve destellos por costumbre. No hay ninguno. Por primera vez desde 1987, el faro está apagado del todo, y es solo un faro.',
      ),
    ],
    deathOutcome: null,
  },
  [lighthouseCaseEndingIdentifiers.ownName]: {
    endingIdentifier: lighthouseCaseEndingIdentifiers.ownName,
    closingEntries: [
      createNarrationEntry(
        '{{nombre}} redacta el informe en la lancha, respirando corto, con el costado vendado con lo que había. El hombre que faltaba está vivo. El faro dudó, soltó lo que tenía y golpeó a quien se atrevió a contestarle con su propio nombre.',
        'Cuando la lancha dobla el espigón, la torre está apagada. {{nombre}} no sabría jurar que vaya a seguir así: a esa cuenta le sigue faltando algo, y las cuentas a las que les falta algo tienen paciencia.',
      ),
    ],
    deathOutcome: null,
  },
  [lighthouseCaseEndingIdentifiers.foreignLight]: {
    endingIdentifier: lighthouseCaseEndingIdentifiers.foreignLight,
    closingEntries: [
      createNarrationEntry(
        '{{nombre}} redacta el informe en la lancha mientras, en el muelle, tres vecinos discuten a gritos sobre la luz roja de anoche y un cuarto la enseña grabada en su teléfono. El faro está apagado de verdad. El hombre que faltaba está vivo. Y el incidente ya no le pertenece a la OICNAU.',
        'La casilla de «discreción operativa» se queda sin marcar. Hay victorias que hacen mucho ruido.',
      ),
    ],
    deathOutcome: null,
  },
  [lighthouseCaseEndingIdentifiers.fixedShutters]: {
    endingIdentifier: lighthouseCaseEndingIdentifiers.fixedShutters,
    closingEntries: [
      createNarrationEntry(
        '{{nombre}} redacta el informe en la lancha. Anoche el haz no salió de la torre y ninguna puerta de Punta Ánimas recibió visita: eso es un hecho y va en la primera línea. En la segunda va el otro: dentro de la jaula de latón la luz sigue girando, y en la escalera alguien sigue contando.',
        'Es un informe de contención. Deja un hilo abierto, con nombre y apellido, en el peldaño ciento nueve.',
      ),
    ],
    deathOutcome: null,
  },
  [lighthouseCaseEndingIdentifiers.retreatWithRenata]: {
    endingIdentifier: lighthouseCaseEndingIdentifiers.retreatWithRenata,
    closingEntries: [
      createNarrationEntry(
        '{{nombre}} redacta el informe en la lancha. Es corto. Dos personas salieron con vida del pie de la torre. Un hombre sigue dentro. Una casa de la calle del puerto amaneció con la mesa puesta para dos y nadie a quien servir.',
        'El faro dará nueve destellos esta madrugada. Tal vez diez. El Archivo se cierra con sanción y sin gloria, que es como se cierran casi todos.',
      ),
    ],
    deathOutcome: null,
  },
  [lighthouseCaseEndingIdentifiers.becameTheTenth]: {
    endingIdentifier: lighthouseCaseEndingIdentifiers.becameTheTenth,
    closingEntries: [],
    deathOutcome: {
      kind: 'chronicle_closed_by_death',
      deathNatureName: 'psychological',
      deathCauseName: 'critical_failure',
      perceptibleCauseText: 'En la escalera del faro de Punta Ánimas, {{nombre}} le dio a la torre lo que la torre pedía. Desde esa madrugada el faro da diez destellos.',
      epitaphRewriteText: '{{nombre}} es el décimo destello.',
      intrusiveOptionText: 'Contar uno más',
    },
  },
  [lighthouseCaseEndingIdentifiers.galleryFall]: {
    endingIdentifier: lighthouseCaseEndingIdentifiers.galleryFall,
    closingEntries: [],
    deathOutcome: {
      kind: 'chronicle_closed_by_death',
      deathNatureName: 'physical',
      deathCauseName: 'critical_failure',
      perceptibleCauseText: 'La barandilla de la galería del faro de Punta Ánimas, ya vencida por un primer golpe, no aguantó el segundo. Treinta metros hasta las rocas.',
      epitaphRewriteText: null,
      intrusiveOptionText: null,
    },
  },
}

export function chooseDawnEndingIdentifier(livedExperienceFlagNames: readonly string[]): string {
  if (livedExperienceFlagNames.includes(lighthouseCaseFlagNames.resolutionByRepair)) {
    return lighthouseCaseEndingIdentifiers.closedCount
  }
  if (livedExperienceFlagNames.includes(lighthouseCaseFlagNames.resolutionByOwnName)) {
    return lighthouseCaseEndingIdentifiers.ownName
  }
  if (livedExperienceFlagNames.includes(lighthouseCaseFlagNames.resolutionByForeignLight)) {
    return lighthouseCaseEndingIdentifiers.foreignLight
  }
  if (livedExperienceFlagNames.includes(lighthouseCaseFlagNames.resolutionByContainment)) {
    return lighthouseCaseEndingIdentifiers.fixedShutters
  }
  return lighthouseCaseEndingIdentifiers.retreatWithRenata
}

export function createOriginClosingEntry(livedExperienceFlagNames: readonly string[]) {
  return livedExperienceFlagNames.includes(lighthouseCaseFlagNames.knowsMissingName)
    ? createNarrationEntry(knownOriginClosingParagraph)
    : createThoughtEntry('own_reasoning', unknownOriginClosingParagraph)
}

function ratePerformance(achievedObjectiveCount: number): ArchivePerformanceRatingName {
  if (achievedObjectiveCount >= 4) {
    return 'excellent'
  }
  return achievedObjectiveCount >= 2 ? 'satisfactory' : 'disappointing'
}

export function createLighthouseArchiveEndedAliveOutcome(
  endingIdentifier: string,
  livedExperienceFlagNames: readonly string[],
): ArchiveEndedAliveOutcome {
  const hasFlag = (flagName: string) => livedExperienceFlagNames.includes(flagName)
  const objectiveResults: ArchiveObjectiveResult[] = [
    { visibleText: lighthouseCaseObjectiveTexts.originOfTenthFlash, wasAchieved: hasFlag(lighthouseCaseFlagNames.knowsMissingName) },
    { visibleText: lighthouseCaseObjectiveTexts.missingManLocated, wasAchieved: hasFlag(lighthouseCaseFlagNames.brotherWasFreed) },
    { visibleText: lighthouseCaseObjectiveTexts.noFurtherDisappearances, wasAchieved: !hasFlag(lighthouseCaseFlagNames.houseWasTaken) },
    { visibleText: lighthouseCaseObjectiveTexts.incidentKeptFromPress, wasAchieved: !hasFlag(lighthouseCaseFlagNames.bayWitnessedTheLight) },
  ]
  return {
    kind: 'archive_ended_alive',
    endingIdentifier,
    performanceRatingName: ratePerformance(objectiveResults.filter((objectiveResult) => objectiveResult.wasAchieved).length),
    objectiveResults,
    countsAsSanctionedClosure: true,
  }
}

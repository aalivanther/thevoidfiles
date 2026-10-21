import type { ArchiveOutcome } from '../game_state/archive_turn_contract'
import { demonstrationArchive } from './demonstration_case_script'

export const completeWorkArchiveCount = 99

export const chapterSummaryWordLimit = 140

export type ChapterWritingStateName = 'written' | 'in_progress' | 'unwritten'

export type ChapterHighlightKindName = 'key_decision' | 'cost_paid' | 'person_met' | 'scar_left'

export type ChapterHighlight = {
  highlightKindName: ChapterHighlightKindName
  highlightText: string
}

export type ChapterPageLayoutName = 'highlights_below' | 'highlights_in_margin' | 'decision_as_pull_quote'

export type ChronicleChapter = {
  chapterIdentifier: string
  chapterSequence: number
  chapterTitle: string
  placeName: string
  seasonLine: string
  writingStateName: ChapterWritingStateName
  summaryParagraphs: string[]
  highlights: ChapterHighlight[]
  pageLayoutName: ChapterPageLayoutName
}

export type CompleteWorkSample = {
  sampleTitle: string
  sampleParagraphs: string[]
  sampleHighlightNotes: Array<{ chapterReference: string; noteText: string }>
}

const earlierChapters: ChronicleChapter[] = [
  {
    chapterIdentifier: 'stopped_clocks_of_the_cove',
    chapterSequence: 1,
    chapterTitle: 'Los relojes de Caleta Hornos',
    placeName: 'Caleta Hornos',
    seasonLine: 'Fines de verano · dos tardes',
    writingStateName: 'written',
    pageLayoutName: 'highlights_below',
    summaryParagraphs: [
      'En Caleta Hornos todos los relojes marcaban las cinco y cuarenta, y nadie quería decir desde cuándo. {{nombre}} llegó con el encargo de averiguarlo y una maleta que no alcanzó a deshacer.',
      'Era la hora en que se hundió la Santa Elvira. Los relojes esperaban. Cada tarde, a las cinco y cuarenta, una lancha sin tripulación entraba sola a la caleta, y cada tarde alguien del pueblo bajaba a recibirla y no volvía a subir.',
      '{{nombre}} bajó al muelle antes que nadie y le dio cuerda a su propio reloj delante de la lancha. Fue lo único que avanzó esa tarde. La lancha dio media vuelta sin prisa. Los relojes del pueblo siguen parados, pero ahora marcan las cinco y cuarenta y uno.',
    ],
    highlights: [
      { highlightKindName: 'key_decision', highlightText: 'Dar cuerda al reloj propio frente a la lancha, en lugar de subir a ella.' },
      { highlightKindName: 'cost_paid', highlightText: 'El reloj de pulsera atrasa un minuto cada noche desde entonces.' },
      { highlightKindName: 'person_met', highlightText: 'Doña Imelda Carrizo, relojera. Arregló gratis lo que sabía que no tenía arreglo.' },
      { highlightKindName: 'scar_left', highlightText: 'No soportar una sala de espera con reloj de pared.' },
    ],
  },
  {
    chapterIdentifier: 'last_platform_of_line_seven',
    chapterSequence: 2,
    chapterTitle: 'Último andén',
    placeName: 'Línea 7 · servicio de medianoche',
    seasonLine: 'Otoño · cuatro noches',
    writingStateName: 'written',
    pageLayoutName: 'decision_as_pull_quote',
    summaryParagraphs: [
      'El último tren de la Línea 7 se detenía noventa segundos en una estación que no figura en ningún plano. Tres pasajeros se habían bajado allí en un mes. Las cámaras los mostraban caminar hacia el fondo del andén con la calma de quien llega a casa.',
      '{{nombre}} viajó cuatro noches en el último vagón antes de que las puertas se abrieran. El andén olía a pan recién hecho. Al fondo, alguien había encendido una luz y puesto un plato.',
      '{{nombre}} no se bajó. Sostuvo las puertas con el cuerpo y llamó a gritos a un muchacho que ya iba por la mitad del andén. El muchacho volvió. Los otros tres no contestaron. La estación dejó de aparecer esa semana, y el conductor pidió el traslado al turno de mañana.',
    ],
    highlights: [
      { highlightKindName: 'key_decision', highlightText: 'Quedarse en el vagón y llamar desde la puerta, sin pisar el andén.' },
      { highlightKindName: 'cost_paid', highlightText: 'Cuatro noches sin dormir y tres nombres que el informe da por perdidos.' },
      { highlightKindName: 'person_met', highlightText: 'Ulises Barraza, conductor del último servicio. Sabe más de lo que declaró.' },
      { highlightKindName: 'scar_left', highlightText: 'El olor a pan recién hecho todavía le cierra el estómago.' },
    ],
  },
  {
    chapterIdentifier: 'house_of_covered_mirrors',
    chapterSequence: 3,
    chapterTitle: 'La casa de los espejos tapados',
    placeName: 'Barrio Alto · casa de la familia Río',
    seasonLine: 'Invierno · una noche de velorio',
    writingStateName: 'written',
    pageLayoutName: 'highlights_in_margin',
    summaryParagraphs: [
      'En el velorio de don Anselmo Río había sábanas sobre todos los espejos, como manda la costumbre. La familia llamó porque el del pasillo seguía reflejando bajo la tela. Se veía la sala llena y una silla ocupada por alguien que no estaba en la casa.',
      '{{nombre}} pasó la noche entre rezos y café recalentado, mirando la sábana de reojo. La figura de la silla era Carmela, la nieta menor, que a esa hora dormía en el segundo piso. En el reflejo llevaba un vestido negro que todavía nadie le había comprado.',
      'Antes del amanecer, {{nombre}} descolgó el espejo y lo enterró con el difunto, cara abajo. La familia no preguntó. Carmela cumplió nueve años en abril. {{nombre}} mandó una tarjeta y no fue a la fiesta.',
    ],
    highlights: [
      { highlightKindName: 'key_decision', highlightText: 'Enterrar el espejo con el difunto, sin destaparlo para mirar.' },
      { highlightKindName: 'cost_paid', highlightText: 'No saber nunca si lo evitó o solo lo aplazó.' },
      { highlightKindName: 'person_met', highlightText: 'Carmela Río, ocho años. Pregunta demasiado bien para su edad.' },
      { highlightKindName: 'scar_left', highlightText: 'Costumbre de dar vuelta los espejos en los cuartos de hotel.' },
    ],
  },
  {
    chapterIdentifier: 'choir_under_the_reservoir',
    chapterSequence: 4,
    chapterTitle: 'El coro de la represa',
    placeName: 'Embalse San Gabriel · sala de compuertas',
    seasonLine: 'Primavera · once días',
    writingStateName: 'written',
    pageLayoutName: 'highlights_below',
    summaryParagraphs: [
      'Bajo el embalse San Gabriel quedó un pueblo entero, con su iglesia. Los operarios del turno de noche empezaron a oír el coro en marzo. En abril, dos de ellos ya cantaban las respuestas sin haberlas aprendido.',
      '{{nombre}} revisó planos, actas de expropiación y la lista de quienes se negaron a irse. Eran once. El coro, según las grabaciones, tiene doce voces. La duodécima apareció este año y canta un tono más arriba, como quien todavía no se sabe la letra.',
      'Era la voz de Evaristo Luna, el operario más antiguo, que seguía vivo y fichando cada noche. {{nombre}} lo sacó de la represa con una licencia médica falsificada y le consiguió un cuarto lejos del agua. El coro volvió a tener once voces. Nadie puede asegurar que se conforme.',
    ],
    highlights: [
      { highlightKindName: 'key_decision', highlightText: 'Falsificar una licencia médica para alejar a Evaristo del embalse.' },
      { highlightKindName: 'cost_paid', highlightText: 'Una firma falsa en un expediente que la OICNAU puede revisar cuando quiera.' },
      { highlightKindName: 'person_met', highlightText: 'Evaristo Luna, operario. Tararea dormido y no recuerda haberlo hecho.' },
      { highlightKindName: 'scar_left', highlightText: 'Una melodía de cuatro notas que regresa cuando hay silencio.' },
    ],
  },
]

export type LighthouseEndingName =
  | 'closed_count'
  | 'own_name'
  | 'foreign_light'
  | 'fixed_shutters'
  | 'retreat_with_renata'
  | 'became_the_tenth'
  | 'gallery_fall'
  | 'death_by_accumulated_wounds'

type LighthouseResolution = {
  closingParagraph: string
  keyDecisionText: string
  costPaidText: string
  scarLeftText: string
}

const survivorScarLeftText = 'Contar las luces, sin querer, cada vez que algo parpadea.'

const lighthouseResolutionByEndingName: Record<LighthouseEndingName, LighthouseResolution> = {
  closed_count: {
    closingParagraph:
      '{{nombre}} escribió bajo la lámpara el nombre que faltaba desde 1987. Diez nombres, diez líneas, ninguna en blanco. El décimo destello no llegó, y el hermano de Renata bajó los peldaños de uno en uno. Al amanecer el faro era solo un faro.',
    keyDecisionText: 'Escribir bajo la lámpara el nombre que la lista del faro esperaba desde 1987.',
    costPaidText: 'Haber puesto de su puño y letra un nombre en una lista que no termina de entender.',
    scarLeftText: survivorScarLeftText,
  },
  own_name: {
    closingParagraph:
      '{{nombre}} esperó el décimo destello de pie y le contestó con su nombre completo. El golpe le quebró algo en el costado. La linterna dudó por primera vez en treinta y nueve años y soltó al hombre que guardaba. A esa cuenta le sigue faltando algo.',
    keyDecisionText: 'Ponerse frente al haz y responder con el propio nombre.',
    costPaidText: 'Una Herida Grave en el costado, de las que el cuerpo no perdona.',
    scarLeftText: 'Dudar un instante antes de decir su nombre completo en voz alta.',
  },
  foreign_light: {
    closingParagraph:
      '{{nombre}} encendió una bengala dentro de la linterna. Nueve blancos, uno ajeno y uno rojo que nadie había pedido: la cuenta dejó de cerrar. El faro se apagó de verdad y el hermano de Renata bajó por su pie. Toda la bahía vio la luz roja.',
    keyDecisionText: 'Romper la cuenta con una luz que el faro no esperaba.',
    costPaidText: 'Una bengala menos y un incidente que ya comenta medio pueblo.',
    scarLeftText: survivorScarLeftText,
  },
  fixed_shutters: {
    closingParagraph:
      '{{nombre}} encerró la óptica tras las placas de latón antes del décimo destello. El haz no salió de la torre y ninguna puerta de Punta Ánimas recibió visita. Dentro de la jaula la luz sigue girando, y en la escalera alguien sigue contando.',
    keyDecisionText: 'Encerrar la luz en lugar de contestarle.',
    costPaidText: 'Un hombre que sigue en el peldaño ciento nueve y un hilo abierto con su nombre.',
    scarLeftText: survivorScarLeftText,
  },
  retreat_with_renata: {
    closingParagraph:
      '{{nombre}} sacó a Renata del pie de la torre y esperó el amanecer en la lancha. El décimo destello pasó despacio sobre las casas y se detuvo en una puerta. Por la mañana había allí una mesa puesta para dos y nadie a quien servir.',
    keyDecisionText: 'Retirarse con Renata antes del décimo destello.',
    costPaidText: 'Una casa vacía en Punta Ánimas y un hermano que no bajó.',
    scarLeftText: survivorScarLeftText,
  },
  became_the_tenth: {
    closingParagraph:
      '{{nombre}} subió la escalera contando peldaños, y a media altura una voz empezó a contar a la par. {{nombre}} le dio a la torre lo que la torre pedía. Quien cuenta para el faro acaba siendo contado: desde esa madrugada, Punta Ánimas ve diez destellos.',
    keyDecisionText: 'Contestarle a la voz de la escalera en lugar de bajar.',
    costPaidText: 'Todo. Este libro no tiene más páginas escritas por la misma mano.',
    scarLeftText: 'Un destello de más sobre la bahía, cada madrugada.',
  },
  gallery_fall: {
    closingParagraph:
      '{{nombre}} salió a la galería a esperar el décimo destello. La barandilla, vencida ya por un primer golpe, no aguantó el segundo. Treinta metros hasta las rocas. El faro siguió contando esa noche, y la siguiente.',
    keyDecisionText: 'Volver a plantarse en la galería con la barandilla ya vencida.',
    costPaidText: 'Todo. Este libro no tiene más páginas escritas por la misma mano.',
    scarLeftText: 'Un tramo de barandilla que nadie ha vuelto a reparar.',
  },
  death_by_accumulated_wounds: {
    closingParagraph:
      'Punta Ánimas cobró más de lo que {{nombre}} llevaba encima. El cuerpo aguantó cuatro heridas y no aguantó la quinta. El faro siguió dando nueve destellos y, tras la pausa, un décimo. El informe quedó sin firmar.',
    keyDecisionText: 'Seguir adelante cuando el cuerpo ya había dicho basta.',
    costPaidText: 'Todo. Este libro no tiene más páginas escritas por la misma mano.',
    scarLeftText: 'Un informe sin firma en un cajón de la OICNAU.',
  },
}

const lighthouseResolutionWithoutKnownEnding: LighthouseResolution = {
  closingParagraph:
    'Lo que {{nombre}} intentó ocurrió en la pausa más larga, justo después del noveno destello. El décimo pasó de largo. Al amanecer el faro volvía a ser una torre apagada con la puerta entreabierta, y el informe llevaba un párrafo en blanco.',
  keyDecisionText: 'Actuar por cuenta propia en la pausa después del noveno destello.',
  costPaidText: 'Un informe con un párrafo en blanco: lo que todavía no sabe explicar.',
  scarLeftText: survivorScarLeftText,
}

const lighthouseEndingNameByEndingIdentifier: Record<string, LighthouseEndingName> = {
  ending_closed_count: 'closed_count',
  ending_own_name: 'own_name',
  ending_foreign_light: 'foreign_light',
  ending_fixed_shutters: 'fixed_shutters',
  ending_retreat_with_renata: 'retreat_with_renata',
}

const lighthouseEndingNameByDecisiveOriginIdentifier: Record<string, LighthouseEndingName> = {
  write_missing_name_under_the_lamp: 'closed_count',
  stand_in_beam_and_answer: 'own_name',
  ignite_flare_as_eleventh_light: 'foreign_light',
  mount_shutter_plates: 'fixed_shutters',
}

const lighthouseDeathEndingNameByFatalOriginIdentifier: Record<string, LighthouseEndingName> = {
  give_the_voice_the_name_it_asks_for: 'became_the_tenth',
  keep_counting_past_the_plan: 'became_the_tenth',
  face_tenth_flash_on_gallery_again: 'gallery_fall',
  reach_optic_over_bent_railing: 'gallery_fall',
}

const lighthouseOpeningSummaryParagraph =
  'La lancha dejó a {{nombre}} en el muelle viejo de Punta Ánimas a las tres y doce. El faro, apagado desde 1987, barría la bahía con nueve destellos y, tras una pausa, un décimo que nadie supo explicar. En el muelle esperaba Renata Oquendo, con una libreta llena de palitos.'

const lighthouseMiddleSummaryParagraph =
  'Su hermano había subido la noche anterior a contar. Creía que el faro devolvía a alguien si la cuenta salía bien. {{nombre}} entendió pronto otra cosa: el faro contaba a los que faltaban, y el décimo destello buscaba, casa por casa, a quien sobraba.'

type LighthouseArchiveRunReading = {
  witnessedOrigins: ReadonlyArray<{ originIdentifier: string }>
  archiveOutcome: ArchiveOutcome | null
}

function findLatestWitnessedEndingName(
  witnessedOrigins: ReadonlyArray<{ originIdentifier: string }>,
  endingNameByOriginIdentifier: Record<string, LighthouseEndingName>,
): LighthouseEndingName | null {
  for (let originIndex = witnessedOrigins.length - 1; originIndex >= 0; originIndex -= 1) {
    const witnessedOrigin = witnessedOrigins[originIndex]
    const endingName = witnessedOrigin ? endingNameByOriginIdentifier[witnessedOrigin.originIdentifier] : undefined
    if (endingName) {
      return endingName
    }
  }
  return null
}

export function readLighthouseEndingName(archiveRun: LighthouseArchiveRunReading): LighthouseEndingName | null {
  const { archiveOutcome, witnessedOrigins } = archiveRun
  if (archiveOutcome === null) {
    return null
  }
  if (archiveOutcome.kind === 'archive_ended_alive') {
    return (
      lighthouseEndingNameByEndingIdentifier[archiveOutcome.endingIdentifier] ??
      findLatestWitnessedEndingName(witnessedOrigins, lighthouseEndingNameByDecisiveOriginIdentifier)
    )
  }
  if (archiveOutcome.deathCauseName !== 'critical_failure') {
    return 'death_by_accumulated_wounds'
  }
  return (
    findLatestWitnessedEndingName(witnessedOrigins, lighthouseDeathEndingNameByFatalOriginIdentifier) ??
    (archiveOutcome.deathNatureName === 'psychological' ? 'became_the_tenth' : 'gallery_fall')
  )
}

export function limitSummaryParagraphsToOnePage(summaryParagraphs: readonly string[]): string[] {
  let remainingWordCount = chapterSummaryWordLimit
  const limitedParagraphs: string[] = []
  for (const summaryParagraph of summaryParagraphs) {
    if (remainingWordCount <= 0) {
      break
    }
    const paragraphWords = summaryParagraph.split(/\s+/).filter((paragraphWord) => paragraphWord.length > 0)
    if (paragraphWords.length <= remainingWordCount) {
      limitedParagraphs.push(summaryParagraph)
      remainingWordCount -= paragraphWords.length
      continue
    }
    const sentences = summaryParagraph.match(/[^.!?…]+[.!?…]+["»”]?\s*/g) ?? []
    let keptText = ''
    let keptWordCount = 0
    for (const sentence of sentences) {
      const sentenceWordCount = sentence.split(/\s+/).filter((sentenceWord) => sentenceWord.length > 0).length
      if (keptWordCount + sentenceWordCount > remainingWordCount) {
        break
      }
      keptText += sentence
      keptWordCount += sentenceWordCount
    }
    if (keptText.trim().length > 0) {
      limitedParagraphs.push(keptText.trim())
    }
    break
  }
  return limitedParagraphs
}

export function countSummaryWords(summaryParagraphs: readonly string[]): number {
  return summaryParagraphs.reduce(
    (runningWordCount, summaryParagraph) =>
      runningWordCount + summaryParagraph.split(/\s+/).filter((paragraphWord) => paragraphWord.length > 0).length,
    0,
  )
}

function buildLighthouseChapter(
  writingStateName: ChapterWritingStateName,
  lighthouseEndingName: LighthouseEndingName | null,
): ChronicleChapter {
  const lighthouseResolution = lighthouseEndingName
    ? lighthouseResolutionByEndingName[lighthouseEndingName]
    : lighthouseResolutionWithoutKnownEnding
  const summaryParagraphsByWritingStateName: Record<ChapterWritingStateName, string[]> = {
    written: [lighthouseOpeningSummaryParagraph, lighthouseMiddleSummaryParagraph, lighthouseResolution.closingParagraph],
    in_progress: [lighthouseOpeningSummaryParagraph],
    unwritten: [],
  }
  return {
    chapterIdentifier: 'lighthouse_that_counts_one_more',
    chapterSequence: earlierChapters.length + 1,
    chapterTitle: demonstrationArchive.archiveTitle,
    placeName: 'Punta Ánimas · faro viejo',
    seasonLine: 'Madrugada · plazo de tres noches',
    writingStateName,
    pageLayoutName: 'decision_as_pull_quote',
    summaryParagraphs: summaryParagraphsByWritingStateName[writingStateName],
    highlights:
      writingStateName === 'written'
        ? [
            { highlightKindName: 'key_decision', highlightText: lighthouseResolution.keyDecisionText },
            { highlightKindName: 'cost_paid', highlightText: lighthouseResolution.costPaidText },
            {
              highlightKindName: 'person_met',
              highlightText: 'Renata Oquendo, última aprendiz del farero. Lleva años contando destellos en una libreta.',
            },
            { highlightKindName: 'scar_left', highlightText: lighthouseResolution.scarLeftText },
          ]
        : [],
  }
}

export function buildChronicleChapters(
  lighthouseWritingStateName: ChapterWritingStateName,
  lighthouseEndingName: LighthouseEndingName | null,
): ChronicleChapter[] {
  return [...earlierChapters, buildLighthouseChapter(lighthouseWritingStateName, lighthouseEndingName)].map(
    (chronicleChapter) => ({
      ...chronicleChapter,
      summaryParagraphs: limitSummaryParagraphsToOnePage(chronicleChapter.summaryParagraphs),
    }),
  )
}

export const completeWorkSample: CompleteWorkSample = {
  sampleTitle: 'Lo que el agua devuelve',
  sampleParagraphs: [
    'Con los años, {{nombre}} aprendió que casi todo empieza cerca del agua. Una caleta con los relojes parados, un embalse que canta, un faro que cuenta de más. El agua guarda lo que se lleva y a veces lo ofrece de vuelta, siempre a cambio de alguien.',
    'En Caleta Hornos bastó con negarse a subir. En Punta Ánimas ya no alcanzó con negarse. Entre una orilla y la otra hay un reloj que atrasa, una melodía de cuatro notas y una libreta ajena llena de palitos. Ninguna de esas cosas figura en los informes. Todas pesan en la maleta.',
  ],
  sampleHighlightNotes: [
    { chapterReference: 'Capítulo I', noteText: 'La primera vez que {{nombre}} dijo que no.' },
    { chapterReference: 'Capítulo IV', noteText: 'La primera mentira por escrito.' },
    { chapterReference: 'Capítulo V', noteText: 'El faro aprendió un nombre nuevo.' },
  ],
}

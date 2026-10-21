import { demonstrationArchive, initialInvestigatorState } from './demonstration_case_script'
import { lighthouseWhisperIdentifier } from './world_atlas_data'

export type ClueSupportKind = 'observation' | 'testimony' | 'document' | 'experiment'

export const clueSupportKindNames: readonly ClueSupportKind[] = ['observation', 'testimony', 'document', 'experiment']

export type JournalThreadKind = 'promise' | 'debt' | 'inquiry' | 'open_mystery'

export type JournalThreadClosingStatus = 'finished' | 'transferred' | 'suspended'

export type HandoutAppearanceKind = 'pocket_notebook' | 'watch_register' | 'keeper_logbook' | 'evidence_bag' | 'instant_photograph'

export type WitnessedOrigin = {
  originIdentifier: string
  placeName: string
  worldClockMinutes: number
}

export type PerceivedClueDefinition = {
  identifier: string
  supportKind: ClueSupportKind
  perceivedText: string
  sourceText: string
  personIdentifiers: string[]
  handoutIdentifier?: string
  wasPerceivedBeforeArrival?: boolean
}

export type PerceivedClue = PerceivedClueDefinition & {
  placeName: string
  worldClockMinutes: number
  chronologicalOrder: number
}

export type PersonStatementDefinition = {
  quotedText: string
  addresseeText: string
}

export type KnownPersonDefinition = {
  identifier: string
  knownName: string
  aliasBeforeNameIsKnown: string
  nameRevealingOriginIdentifiers: string[]
  bondTextByOriginIdentifier: Record<string, string>
  impressionTextByOriginIdentifier: Record<string, string>
  statementsByOriginIdentifier: Record<string, PersonStatementDefinition[]>
}

export type KnownPersonStatement = PersonStatementDefinition & {
  placeName: string
  worldClockMinutes: number
}

export type KnownPersonImpression = {
  impressionText: string
  worldClockMinutes: number
}

export type KnownPerson = {
  identifier: string
  displayName: string
  isNameKnown: boolean
  firstSeenPlaceName: string
  firstSeenWorldClockMinutes: number
  bondTexts: string[]
  impressions: KnownPersonImpression[]
  statements: KnownPersonStatement[]
}

export type JournalThreadDefinition = {
  identifier: string
  threadKind: JournalThreadKind
  titleText: string
  originText: string
  responsibleText: string
  deadlineText: string | null
  deadlineWorldClockMinutes: number | null
  closingStatusWhenArchiveFinished: JournalThreadClosingStatus
  closingNoteText: string
}

export type JournalThread = JournalThreadDefinition & {
  openedAtPlaceName: string
  openedAtWorldClockMinutes: number
}

export type HandoutDefinition = {
  identifier: string
  appearanceKind: HandoutAppearanceKind
  titleText: string
  captionText: string
  custodyText: string
  documentLines: string[]
  seenInOriginIdentifiers: string[]
}

export type SeenHandout = HandoutDefinition & {
  seenAtPlaceName: string
  seenAtWorldClockMinutes: number
}

export type LivedCaseJournal = {
  clues: PerceivedClue[]
  knownPersons: KnownPerson[]
  threads: JournalThread[]
  handouts: SeenHandout[]
  placeNames: string[]
}

export const archiveOpeningOriginIdentifier = 'archive_opening'

export const demonstrationDawnWorldClockMinutes = 6 * 60 + 40

export const demonstrationJournalArchiveTitle = demonstrationArchive.archiveTitle

export const demonstrationJournalArchiveNumberLabel = demonstrationArchive.archiveNumberLabel

const perceivedCluesByOriginIdentifier: Record<string, PerceivedClueDefinition[]> = {
  archive_opening: [
    {
      identifier: 'fishermen_radio_rumor',
      supportKind: 'testimony',
      perceivedText:
        'La radio de los pescadores repite que el faro de Punta Ánimas lleva apagado desde 1987 y que aun así da nueve destellos cada madrugada. Que anoche dio diez. Que esta mañana faltaba un hombre.',
      sourceText: 'Susurro oído en la banda costera, antes de viajar. Nadie dio su nombre.',
      personIdentifiers: [],
      wasPerceivedBeforeArrival: true,
    },
    {
      identifier: 'flashes_counted_on_arrival',
      supportKind: 'observation',
      perceivedText:
        'Un destello blanco barre la bahía desde la torre apagada. Luego otro. Contados sin querer: nueve, una pausa larga, como si alguien tomara aire, y un décimo.',
      sourceText: 'Visto a simple vista al desembarcar.',
      personIdentifiers: [],
    },
    {
      identifier: 'boatman_keeps_engine_running',
      supportKind: 'observation',
      perceivedText: 'El lanchero no apaga el motor. Mira el faro, no a quien acaba de desembarcar.',
      sourceText: 'Visto al bajar de la lancha.',
      personIdentifiers: ['boatman'],
    },
    {
      identifier: 'woman_waiting_with_notebook',
      supportKind: 'observation',
      perceivedText:
        'Al final del muelle espera una mujer con un abrigo demasiado grande. Sostiene una libreta contra el pecho. La puerta del faro, a unos cuarenta metros, está entreabierta.',
      sourceText: 'Visto desde el muelle.',
      personIdentifiers: ['renata_oquendo'],
    },
  ],
  speak_with_waiting_woman: [
    {
      identifier: 'renata_introduces_herself',
      supportKind: 'testimony',
      perceivedText:
        'Dice llamarse Renata Oquendo y haber sido la última aprendiz del farero. Habla bajo, sin dejar de mirar la linterna apagada de la torre.',
      sourceText: 'Lo dijo ella misma, de palabra.',
      personIdentifiers: ['renata_oquendo', 'lighthouse_keeper'],
    },
    {
      identifier: 'renata_about_brother_counting',
      supportKind: 'testimony',
      perceivedText: '«Mi hermano subió anoche a contar. Decía que si contabas bien, el faro te devolvía a alguien.»',
      sourceText: 'Palabras de Renata Oquendo. Ella repite lo que decía su hermano; a él no se le ha oído.',
      personIdentifiers: ['renata_oquendo', 'renata_brother'],
    },
    {
      identifier: 'renata_notebook_tally',
      supportKind: 'document',
      perceivedText:
        'La libreta tiene columnas de palitos, noche tras noche, siempre nueve. La última página tiene diez, y el décimo está trazado con otra letra.',
      sourceText: 'Libreta de Renata Oquendo, abierta por ella.',
      personIdentifiers: ['renata_oquendo'],
      handoutIdentifier: 'renata_pocket_notebook',
    },
  ],
  examine_watch_register: [
    {
      identifier: 'register_continued_in_blue_ink',
      supportKind: 'document',
      perceivedText:
        'Las entradas de 1987 terminan a media frase. Debajo, con bolígrafo azul, alguien ha seguido anotando turnos que nadie hizo. Cada entrada nueva lleva la misma hora: las tres y doce.',
      sourceText: 'Registro de guardia clavado junto a la puerta del faro. Hinchado por la sal; la tinta reciente resiste.',
      personIdentifiers: [],
      handoutIdentifier: 'lighthouse_watch_register',
    },
    {
      identifier: 'own_watch_stopped',
      supportKind: 'observation',
      perceivedText:
        'El reloj propio marca las tres y veintitantos, y sin embargo el segundero lleva un rato largo sin moverse.',
      sourceText: 'Reloj de pulsera de {{nombre}}, mirado al pie del faro.',
      personIdentifiers: [],
    },
  ],
  ignite_flare_outer_stairs: [
    {
      identifier: 'shadow_climbs_out_of_step',
      supportKind: 'observation',
      perceivedText:
        'A media subida por la escalera exterior, con la bengala encendida, la sombra propia sobre el muro no sube al mismo ritmo que el resto del cuerpo.',
      sourceText: 'Visto a la luz roja de la bengala.',
      personIdentifiers: [],
    },
    {
      identifier: 'beam_searches_the_shore',
      supportKind: 'observation',
      perceivedText:
        'Desde la galería se ve la bahía completa y no hay ningún barco. El haz, cuando pasa, no ilumina el agua: ilumina la orilla, casa por casa.',
      sourceText: 'Visto desde la galería exterior del faro.',
      personIdentifiers: [],
    },
  ],
  inspect_service_door: [
    {
      identifier: 'boot_prints_only_entering',
      supportKind: 'observation',
      perceivedText:
        'La puerta de servicio tiene candado nuevo sobre bisagras viejas. En el barro hay huellas de botas que entran. De las que salen, ninguna.',
      sourceText: 'Visto al rodear el faro.',
      personIdentifiers: [],
    },
    {
      identifier: 'scratched_marks_by_door',
      supportKind: 'observation',
      perceivedText:
        'Junto al marco, a la altura de los ojos, alguien rayó nueve marcas con una llave. La décima está más abajo, a la altura de un niño.',
      sourceText: 'Visto en el marco de la puerta de servicio.',
      personIdentifiers: [],
    },
  ],
  count_flashes_from_boat: [
    {
      identifier: 'flashes_timed_with_stopwatch',
      supportKind: 'experiment',
      perceivedText:
        'Tres ciclos completos con el cronómetro: nueve destellos cada doce segundos, exactos como un metrónomo. El décimo no sigue el ritmo; las tres veces llegó cuando alguien en la orilla lo estaba mirando.',
      sourceText: 'Medición propia desde la lancha.',
      personIdentifiers: [],
    },
    {
      identifier: 'boatman_crosses_himself',
      supportKind: 'testimony',
      perceivedText:
        'El lanchero se santigua sin disimulo y murmura: «Antes no hacía eso». No aclara si habla del faro o de sí mismo.',
      sourceText: 'Palabras del lanchero, dichas a media voz en la lancha.',
      personIdentifiers: ['boatman'],
    },
  ],
  pay_boatman_to_wait: [
    {
      identifier: 'boatman_sets_his_terms',
      supportKind: 'testimony',
      perceivedText: '«Hasta que claree, ni un minuto más. Y si oye que el faro dice su nombre, no conteste.»',
      sourceText: 'Palabras del lanchero al recibir el pago.',
      personIdentifiers: ['boatman'],
    },
  ],
  listen_to_boatman_warning: [
    {
      identifier: 'boatman_warning_about_names',
      supportKind: 'testimony',
      perceivedText:
        '«Si oye que el faro dice su nombre, no conteste. Y si le pide otro nombre, menos.» Nadie de la bahía sube a la torre.',
      sourceText: 'Palabras del lanchero, dichas junto a la borda sin que nadie le preguntara.',
      personIdentifiers: ['boatman'],
    },
    {
      identifier: 'name_told_to_nobody',
      supportKind: 'observation',
      perceivedText: '{{nombre}} no le ha dicho su nombre a nadie en este pueblo. El lanchero tampoco lo preguntó.',
      sourceText: 'Recuerdo propio de la noche, repasado en el muelle.',
      personIdentifiers: ['boatman'],
    },
  ],
  boatman_testimony_heard: [
    {
      identifier: 'boatman_father_counted_ten',
      supportKind: 'testimony',
      perceivedText:
        'El padre del lanchero vio embarcar a la gente la noche de 1987 y contó diez. El parte dijo nueve. La décima era Elvira, la madre de Renata: no debía ir a bordo, el farero lo sabía y no la apuntó.',
      sourceText: 'Palabras del lanchero. Él repite lo que vio su padre; no lo presenció.',
      personIdentifiers: ['boatman', 'renata_mother', 'lighthouse_keeper'],
    },
  ],
  boatman_refused_to_talk: [
    {
      identifier: 'boatman_shuts_down_about_1987',
      supportKind: 'observation',
      perceivedText:
        'Preguntado por 1987 sin que mediara trato, el lanchero se cerró en banda y dio gas al motor para no oír más.',
      sourceText: 'Visto en el muelle viejo.',
      personIdentifiers: ['boatman'],
    },
  ],
  force_service_door_hinge: [
    {
      identifier: 'hinge_scream_heard_by_tower',
      supportKind: 'experiment',
      perceivedText:
        'La bisagra forzada soltó un chirrido que subió por dentro de la torre. Arriba, algo dejó de contar un instante y luego siguió, más rápido.',
      sourceText: 'Provocado y oído al forzar la puerta de servicio.',
      personIdentifiers: [],
    },
  ],
  solved_interactive_piece_0001: [
    {
      identifier: 'lock_opens_with_register_hour',
      supportKind: 'experiment',
      perceivedText:
        'El candado de la puerta de servicio se abre con la hora que el registro de guardia repite en todas sus entradas nuevas.',
      sourceText: 'Comprobado en el propio candado.',
      personIdentifiers: [],
    },
  ],
  take_shutter_plates: [
    {
      identifier: 'keeper_note_on_shutter_plates',
      supportKind: 'document',
      perceivedText:
        'Cinco placas de latón grabadas, en un cajón rotulado «Obturadores · no montar sin orden». Nota del farero en la tapa: «Con las cinco en su orden el haz no sale de la torre. No suelta nada. Solo calla.»',
      sourceText: 'Cajón del cuarto de máquinas del faro.',
      personIdentifiers: ['lighthouse_keeper'],
    },
  ],
  renata_read_master_handwriting: [
    {
      identifier: 'keeper_cipher_method',
      supportKind: 'testimony',
      perceivedText:
        'El disco de latón es el cifrado del farero: se gira la corona interior tantas letras como sea la clave. Él decía que la clave de un farero tiene que estar a la vista de todos, todas las noches. La de estas páginas no se la dio a nadie.',
      sourceText: 'Palabras de Renata Oquendo, inclinada sobre el cuaderno de su maestro.',
      personIdentifiers: ['renata_oquendo', 'lighthouse_keeper'],
    },
  ],
  solved_interactive_piece_0002: [
    {
      identifier: 'keeper_confession_deciphered',
      supportKind: 'document',
      perceivedText:
        '«Eran diez. Apunté nueve. La décima era Elvira Sanjurjo y no debía subir a esa barca. Yo lo sabía y no la apunté.» La luz cuenta a los que faltan y a ella nunca la encuentra en la lista.',
      sourceText: 'Últimas páginas del cuaderno del farero, descifradas con su disco.',
      personIdentifiers: ['lighthouse_keeper', 'renata_mother'],
      handoutIdentifier: 'keeper_logbook',
    },
  ],
  connect_the_three_counts: [
    {
      identifier: 'three_counts_miss_the_same_name',
      supportKind: 'observation',
      perceivedText:
        'Nueve marcas de llave y una más abajo; nueve palitos y un décimo con otra letra; nueve nombres de adultos y un «10 —» en blanco. La marca baja no es de un niño: es de alguien menudo, medido a ojo. Falta un nombre en la lista, y es el de Elvira, la madre de Renata.',
      sourceText: 'Deducción propia a partir de lo visto en la puerta de servicio, la libreta y el cuaderno.',
      personIdentifiers: ['renata_mother', 'lighthouse_keeper'],
    },
  ],
  call_brother_by_his_name: [
    {
      identifier: 'brother_answers_from_above',
      supportKind: 'testimony',
      perceivedText:
        '«No suba contando. Y si le pregunta por alguien, no le dé ningún nombre. Yo se lo di. Yo le dije el de mi madre.»',
      sourceText: 'Voz de Tomás Oquendo, oída desde lo alto de la escalera. No se le vio.',
      personIdentifiers: ['renata_brother'],
    },
  ],
  examine_warm_boot: [
    {
      identifier: 'boot_mud_and_missing_step',
      supportKind: 'observation',
      perceivedText:
        'La bota lleva en la suela barro fresco del pie del faro: son las huellas que entraban y no salían. Debajo no hay peldaño, sino la sombra de uno, que aguanta el peso igual. El plano no lo recoge.',
      sourceText: 'Visto y tocado en el peldaño ciento nueve.',
      personIdentifiers: [],
    },
  ],
  answer_voice_with_own_name: [
    {
      identifier: 'voice_rejects_own_name',
      supportKind: 'experiment',
      perceivedText:
        'A la voz de la escalera se le respondió solo con el nombre propio. Calló, ofendida. Pide nombres ajenos; el propio le estorba.',
      sourceText: 'Prueba propia en la escalera interior.',
      personIdentifiers: [],
    },
  ],
  test_gallery_railing: [
    {
      identifier: 'gallery_railing_is_loose',
      supportKind: 'experiment',
      perceivedText:
        'Los montantes de la barandilla de la galería giran en sus bases. Aguanta una mano; no aguantaría un cuerpo.',
      sourceText: 'Comprobado con la palma, sin cargar peso.',
      personIdentifiers: [],
    },
  ],
  face_tenth_flash_on_gallery: [
    {
      identifier: 'railing_bent_by_first_blow',
      supportKind: 'observation',
      perceivedText:
        'El golpe del décimo destello dobló la barandilla de la galería medio metro sobre el vacío. Quedó sujeta por dos tornillos.',
      sourceText: 'Vivido en carne propia en la galería exterior.',
      personIdentifiers: [],
    },
  ],
  write_missing_name_under_the_lamp: [
    {
      identifier: 'name_written_under_the_lamp',
      supportKind: 'experiment',
      perceivedText:
        'Escrito junto al «10 —», en el cuarto de la linterna, el nombre de Elvira Sanjurjo. La pausa después del noveno destello no se rompió. Por la trampilla subió el ruido de unos pies descalzos bajando peldaños.',
      sourceText: 'Prueba propia sobre el cuaderno del farero.',
      personIdentifiers: ['renata_mother', 'renata_brother'],
      handoutIdentifier: 'keeper_logbook',
    },
  ],
  solved_interactive_piece_0003: [
    {
      identifier: 'shutters_keep_the_beam_inside',
      supportKind: 'experiment',
      perceivedText:
        'Con las cinco placas trabadas, la luz sigue girando dentro de la jaula de latón y no sale de la torre. La bahía pasó la madrugada a oscuras. En la escalera, la voz siguió contando.',
      sourceText: 'Comprobado en el bastidor del cuarto de la linterna.',
      personIdentifiers: [],
    },
  ],
  speak_with_freed_brother: [
    {
      identifier: 'brother_names_himself',
      supportKind: 'testimony',
      perceivedText:
        'El hombre que bajó de la torre dice llamarse Tomás Oquendo. Allí arriba, dice, él era un número.',
      sourceText: 'Palabras de Tomás Oquendo, al amanecer, en el muelle viejo.',
      personIdentifiers: ['renata_brother'],
    },
  ],
  climb_inner_staircase: [
    {
      identifier: 'staircase_has_extra_flight',
      supportKind: 'experiment',
      perceivedText:
        'El plano de la OICNAU marca ciento ocho peldaños. Contados en voz baja, uno por uno: ciento ocho, y todavía queda un tramo entero por subir.',
      sourceText: 'Conteo propio cotejado con el plano del dosier.',
      personIdentifiers: [],
    },
    {
      identifier: 'warm_boot_on_step',
      supportKind: 'observation',
      perceivedText:
        'En el peldaño ciento nueve hay una bota de hombre, erguida, con los cordones atados. Está tibia.',
      sourceText: 'Visto y tocado en la escalera interior.',
      personIdentifiers: [],
    },
    {
      identifier: 'voice_changes_and_asks_for_a_name',
      supportKind: 'observation',
      perceivedText:
        'Pasado el ciento ocho, el reloj marcó las tres y doce con el segundero clavado, y la voz que contaba cambió de timbre: pidió un nombre, el de alguien a quien se quiera de vuelta. El pensamiento de dárselo no era propio.',
      sourceText: 'Vivido en la escalera interior. La hora percibida no es de fiar.',
      personIdentifiers: [],
    },
  ],
  read_keeper_logbook: [
    {
      identifier: 'keeper_logbook_becomes_inventory',
      supportKind: 'document',
      perceivedText:
        'La letra del farero es prolija hasta agosto de 1987. Después el cuaderno se vuelve un inventario: nombres del pueblo, uno por línea, cada uno con una cifra del uno al nueve.',
      sourceText: 'Cuaderno del farero, sobre la mesa de su cuarto.',
      personIdentifiers: ['lighthouse_keeper'],
      handoutIdentifier: 'keeper_logbook',
    },
    {
      identifier: 'keeper_logbook_last_line',
      supportKind: 'document',
      perceivedText: 'La última línea dice «10 —» y nada más. La tinta del guion todavía mancha el dedo.',
      sourceText: 'Cuaderno del farero, última página escrita.',
      personIdentifiers: ['lighthouse_keeper'],
      handoutIdentifier: 'keeper_logbook',
    },
  ],
  ask_renata_about_brother: [
    {
      identifier: 'renata_about_mother',
      supportKind: 'testimony',
      perceivedText:
        'Tarda en contestar. Su hermano se llama Tomás y subió a pedir que el faro le devolviera a su madre, Elvira. «Se la llevó el mar el año en que apagaron esto.» Dice el año sin dudar: 1987.',
      sourceText: 'Palabras de Renata Oquendo, preguntada por lo que quería recuperar su hermano.',
      personIdentifiers: ['renata_oquendo', 'renata_mother', 'renata_brother'],
    },
    {
      identifier: 'brother_belief_about_lighthouse',
      supportKind: 'testimony',
      perceivedText:
        '«Él juraba que el faro no alumbra barcos. Que cuenta a los que faltan. Y que si sobra un destello, es que alguien sobra aquí abajo.»',
      sourceText: 'Palabras de Renata Oquendo. Es lo que ella dice que creía su hermano.',
      personIdentifiers: ['renata_oquendo', 'renata_brother'],
    },
  ],
  cover_lantern_room_windows: [
    {
      identifier: 'beam_passes_through_canvas',
      supportKind: 'experiment',
      perceivedText:
        'Tres de los ocho cristales cubiertos con las lonas justo cuando acababa la pausa del noveno destello. El décimo pasó a través de la lona sin perder un ápice de brillo, y la brea prendió. Las lonas se perdieron por la galería.',
      sourceText: 'Prueba propia en el cuarto de la linterna.',
      personIdentifiers: [],
    },
    {
      identifier: 'shaded_houses_go_dark',
      supportKind: 'observation',
      perceivedText:
        'Estrechado por los cristales ennegrecidos, el haz dejó de recorrer la orilla y se quedó fijo en una sola puerta. En esa casa se encendió una luz y alguien salió a mirar hacia arriba.',
      sourceText: 'Visto desde el cuarto de la linterna, después de perder las lonas.',
      personIdentifiers: [],
    },
  ],
  bag_blue_pen_evidence: [
    {
      identifier: 'blue_pen_from_closed_hardware_store',
      supportKind: 'observation',
      perceivedText:
        'El bolígrafo azul del registro es de propaganda: una ferretería de Punta Ánimas que cerró hace veinte años.',
      sourceText: 'Leído en el cuerpo del bolígrafo antes de sellarlo.',
      personIdentifiers: [],
      handoutIdentifier: 'sealed_blue_pen_bag',
    },
    {
      identifier: 'sealed_bag_weighs_more',
      supportKind: 'observation',
      perceivedText: 'La bolsa sellada y rotulada pesa ligeramente más de lo que debería.',
      sourceText: 'Notado al guardar la bolsa.',
      personIdentifiers: [],
      handoutIdentifier: 'sealed_blue_pen_bag',
    },
  ],
  stand_in_beam_and_answer: [
    {
      identifier: 'tenth_flash_felt_as_question',
      supportKind: 'experiment',
      perceivedText:
        'Recibido de frente y con los ojos abiertos, el décimo destello no se siente como luz: se siente como una pregunta, y pesa. {{nombre}} respondió con su nombre completo, en voz alta. El golpe terminó contra el zócalo de hierro.',
      sourceText: 'Vivido en carne propia en el cuarto de la linterna.',
      personIdentifiers: [],
    },
    {
      identifier: 'lantern_hesitates_and_man_coughs',
      supportKind: 'observation',
      perceivedText:
        'Después de la respuesta, la linterna dudó. En el peldaño ciento nueve, un hombre descalzo empezó a toser.',
      sourceText: 'Visto y oído desde el cuarto de la linterna.',
      personIdentifiers: ['barefoot_man'],
    },
  ],
  ignite_flare_as_eleventh_light: [
    {
      identifier: 'red_flare_breaks_the_count',
      supportKind: 'experiment',
      perceivedText:
        'Una bengala encendida en el centro de la óptica: los prismas la repartieron por toda la bahía. Nueve blancos, el décimo y uno rojo de más. El faro se apagó de golpe.',
      sourceText: 'Prueba propia dentro de la linterna.',
      personIdentifiers: [],
    },
    {
      identifier: 'voice_calls_renata_from_stairs',
      supportKind: 'observation',
      perceivedText:
        'En la escalera alguien llama a su hermana por su nombre, con la voz rota de quien lleva una noche entera contando. Abajo, el pueblo entero encendió las ventanas: todos vieron el faro ponerse rojo.',
      sourceText: 'Oído desde el cuarto de la linterna. No se vio a quien llamaba.',
      personIdentifiers: ['renata_oquendo'],
    },
  ],
  finish_keeper_inventory: [
    {
      identifier: 'name_written_on_last_line',
      supportKind: 'experiment',
      perceivedText:
        'Escrito junto al «10 —» el nombre de la madre de Renata. El papel lo aceptó sin que se corriera la tinta. El décimo destello no llegó; la torre entera exhaló un aire frío con olor a sal vieja.',
      sourceText: 'Prueba propia sobre el cuaderno del farero.',
      personIdentifiers: ['renata_mother', 'lighthouse_keeper'],
      handoutIdentifier: 'keeper_logbook',
    },
    {
      identifier: 'brother_comes_down_counting',
      supportKind: 'observation',
      perceivedText:
        'El hermano de Renata baja los peldaños de uno en uno, contándolos en voz alta para no perderse.',
      sourceText: 'Visto y oído en la escalera interior.',
      personIdentifiers: ['renata_brother'],
    },
  ],
  evacuate_renata_and_withdraw: [
    {
      identifier: 'tenth_flash_stops_at_doors',
      supportKind: 'observation',
      perceivedText:
        'Desde la lancha, con Renata a salvo, se ve pasar el décimo destello sobre las casas, lento, deteniéndose en cada puerta. En una se detiene más tiempo.',
      sourceText: 'Visto desde la lancha, en el muelle viejo.',
      personIdentifiers: ['renata_oquendo'],
    },
    {
      identifier: 'table_set_for_two',
      supportKind: 'observation',
      perceivedText: 'Al amanecer, esa casa tiene la mesa puesta para dos y nadie dentro.',
      sourceText: 'Visto al amanecer, desde la puerta de la casa.',
      personIdentifiers: [],
    },
  ],
  photograph_the_optic: [
    {
      identifier: 'nine_photographs_show_dead_lantern',
      supportKind: 'experiment',
      perceivedText:
        'Nueve disparos con la cámara apoyada en el zócalo, sin mirar el haz. En la pantalla, las nueve fotos muestran la linterna apagada y cubierta de polvo.',
      sourceText: 'Cámara propia, en el cuarto de la linterna.',
      personIdentifiers: [],
    },
    {
      identifier: 'tenth_photograph_nobody_took',
      supportKind: 'document',
      perceivedText:
        'Hay una décima foto que nadie tomó. Sale {{nombre}}, de espaldas, con la cámara en las manos, desde dentro de la óptica.',
      sourceText: 'Décima imagen en la memoria de la cámara.',
      personIdentifiers: [],
      handoutIdentifier: 'tenth_photograph',
    },
  ],
}

const knownPersonDefinitions: KnownPersonDefinition[] = [
  {
    identifier: 'boatman',
    knownName: 'El lanchero',
    aliasBeforeNameIsKnown: 'El lanchero',
    nameRevealingOriginIdentifiers: [],
    bondTextByOriginIdentifier: {
      archive_opening: 'Trajo a {{nombre}} en su lancha hasta el muelle viejo. No ha dicho cómo se llama.',
      pay_boatman_to_wait: 'Cobró 120 de fondos operativos por esperar. Trato de dinero, nada más por ahora.',
      boatman_testimony_heard: 'Confió a {{nombre}} lo que su padre vio en 1987.',
    },
    impressionTextByOriginIdentifier: {
      archive_opening: 'No quiso apagar el motor ni mirar a quien traía. Da la impresión de respetar más al faro que al mar.',
      listen_to_boatman_warning: 'Habló sin que nadie le preguntara, y se relajó al ver que se le escuchaba en serio.',
      boatman_refused_to_talk: 'Se cerró en banda en cuanto oyó el año. No es hombre al que se le saque nada apretando.',
      count_flashes_from_boat:
        'Se santiguó sin disimulo. Sea lo que sea lo que cambió, parece haberlo notado antes de esta noche.',
      pay_boatman_to_wait:
        'Aceptó el dinero, pero las condiciones las puso él. Habla del faro como de algo que llama a la gente.',
    },
    statementsByOriginIdentifier: {
      count_flashes_from_boat: [{ quotedText: '«Antes no hacía eso.»', addresseeText: 'Murmurado, quizá para sí mismo' }],
      pay_boatman_to_wait: [
        {
          quotedText: '«Hasta que claree, ni un minuto más. Y si oye que el faro dice su nombre, no conteste.»',
          addresseeText: 'Dicho a {{nombre}}',
        },
      ],
    },
  },
  {
    identifier: 'renata_oquendo',
    knownName: 'Renata Oquendo',
    aliasBeforeNameIsKnown: 'La mujer del abrigo grande',
    nameRevealingOriginIdentifiers: [
      'speak_with_waiting_woman',
      'ask_renata_about_brother',
      'say_goodbye_to_renata',
      'ask_renata_before_writing_name',
      'ignite_flare_as_eleventh_light',
      'finish_keeper_inventory',
      'evacuate_renata_and_withdraw',
    ],
    bondTextByOriginIdentifier: {
      speak_with_waiting_woman: 'Última aprendiz del farero, según ella misma. Hermana del hombre que subió anoche.',
      evacuate_renata_and_withdraw: '{{nombre}} la alejó de la torre del brazo y la llevó hasta la lancha.',
    },
    impressionTextByOriginIdentifier: {
      archive_opening: 'Esperaba a alguien, o algo. Apretaba la libreta como quien teme que se la quiten.',
      speak_with_waiting_woman:
        'Habla bajo y no aparta la vista de la torre. Lleva la cuenta noche tras noche; no parece alguien que exagere.',
      ask_renata_about_brother:
        'Tardó en contestar, pero el año lo dijo sin dudar. Repite las ideas de su hermano sin decir si las comparte.',
      force_service_door_hinge: 'Gritó cuando chirrió la bisagra. Tardó en volver a mirar a {{nombre}}, y lo hizo de otra manera.',
      ask_renata_before_writing_name: 'Escuchó toda la verdad sentada en el umbral. Dio el nombre de su madre con todas las letras, y dio las gracias por la pregunta.',
      name_written_without_consent: 'Abrazó a su hermano y miró el cuaderno con algo que no era gratitud del todo.',
      evacuate_renata_and_withdraw: 'Se dejó llevar sin resistirse. No dejó de mirar las casas de la orilla.',
    },
    statementsByOriginIdentifier: {
      speak_with_waiting_woman: [
        {
          quotedText: '«Mi hermano subió anoche a contar. Decía que si contabas bien, el faro te devolvía a alguien.»',
          addresseeText: 'Dicho a {{nombre}}',
        },
      ],
      ask_renata_about_brother: [
        {
          quotedText: '«A nuestra madre. Se la llevó el mar el año en que apagaron esto.»',
          addresseeText: 'Dicho a {{nombre}}, tras un silencio',
        },
        {
          quotedText:
            '«Él juraba que el faro no alumbra barcos. Que cuenta a los que faltan. Y que si sobra un destello, es que alguien sobra aquí abajo.»',
          addresseeText: 'Dicho a {{nombre}}',
        },
      ],
    },
  },
  {
    identifier: 'renata_brother',
    knownName: 'Tomás Oquendo',
    aliasBeforeNameIsKnown: 'El hermano de Renata',
    nameRevealingOriginIdentifiers: ['ask_renata_about_brother', 'call_brother_by_his_name', 'speak_with_freed_brother'],
    bondTextByOriginIdentifier: {
      speak_with_waiting_woman: 'Hermano de Renata Oquendo. Nadie ha dicho todavía su nombre de pila.',
      ask_renata_about_brother: 'Hermano de Renata Oquendo. Ella lo llama Tomás.',
      write_missing_name_under_the_lamp: 'Hermano de Renata Oquendo. Bajó de la torre cuando la cuenta se cerró.',
      speak_with_freed_brother: 'Reconoce deberle a {{nombre}} haber salido de la torre.',
      finish_keeper_inventory: 'Hermano de Renata Oquendo. Nadie ha dicho todavía su nombre de pila.',
    },
    impressionTextByOriginIdentifier: {
      speak_with_waiting_woman: 'Solo se le conoce por lo que cuenta su hermana: subió al faro a contar destellos.',
      ask_renata_about_brother:
        'Según Renata, quería recuperar a su madre. Todo lo que se sabe de sus ideas llega de segunda mano.',
      finish_keeper_inventory: 'Bajó por su propio pie, contando peldaños en voz alta. Visto por primera vez.',
      call_brother_by_his_name: 'Contestó desde arriba con la voz de quien lleva una noche entera contando. Avisó, antes que pedir ayuda.',
      speak_with_freed_brother: 'Agotado y lúcido. Da la mano como quien comprueba que todavía tiene.',
    },
    statementsByOriginIdentifier: {
      speak_with_waiting_woman: [
        {
          quotedText: '«Si cuentas bien, el faro te devuelve a alguien.»',
          addresseeText: 'Atribuido por Renata; no se le oyó decirlo',
        },
      ],
      ask_renata_about_brother: [
        {
          quotedText: '«El faro no alumbra barcos. Cuenta a los que faltan.»',
          addresseeText: 'Atribuido por Renata; no se le oyó decirlo',
        },
      ],
    },
  },
  {
    identifier: 'lighthouse_keeper',
    knownName: 'El farero',
    aliasBeforeNameIsKnown: 'El farero',
    nameRevealingOriginIdentifiers: [],
    bondTextByOriginIdentifier: {
      speak_with_waiting_woman: 'Maestro de Renata Oquendo, según ella. No se sabe qué fue de él.',
      read_keeper_logbook: 'Autor del cuaderno que sigue sobre la mesa de su cuarto.',
      finish_keeper_inventory: 'Autor del cuaderno que sigue sobre la mesa de su cuarto.',
    },
    impressionTextByOriginIdentifier: {
      speak_with_waiting_woman: 'Renata lo nombra con respeto y en pasado.',
      read_keeper_logbook:
        'Un hombre ordenado hasta agosto de 1987. Después, alguien que solo hacía listas. No se sabe si el cambio fue suyo.',
      finish_keeper_inventory: 'Dejó una línea sin terminar, y la línea admitió que otra mano la completara.',
    },
    statementsByOriginIdentifier: {
      read_keeper_logbook: [{ quotedText: '«10 —»', addresseeText: 'Escrito en su cuaderno, sin destinatario' }],
    },
  },
  {
    identifier: 'renata_mother',
    knownName: 'Elvira Sanjurjo',
    aliasBeforeNameIsKnown: 'La madre de Renata',
    nameRevealingOriginIdentifiers: ['solved_interactive_piece_0002', 'ask_renata_before_writing_name', 'write_missing_name_under_the_lamp'],
    bondTextByOriginIdentifier: {
      ask_renata_about_brother: 'Madre de Renata Oquendo y de su hermano. El mar se la llevó en 1987, según Renata.',
      finish_keeper_inventory: 'Madre de Renata Oquendo y de su hermano. Su nombre quedó escrito en el cuaderno del farero.',
      boatman_testimony_heard: 'Décima pasajera de la barca de 1987, según el lanchero. No figuraba en la lista.',
      solved_interactive_piece_0002: 'Décima pasajera de la barca de 1987, según la confesión del farero. Él no la apuntó.',
    },
    impressionTextByOriginIdentifier: {
      ask_renata_about_brother: 'Solo se la conoce por la voz de su hija, que aún no habla de ella con calma.',
      finish_keeper_inventory: 'Su nombre cupo en la línea que faltaba. Qué significa eso, está por verse.',
    },
    statementsByOriginIdentifier: {},
  },
  {
    identifier: 'barefoot_man',
    knownName: 'Hombre descalzo de la escalera',
    aliasBeforeNameIsKnown: 'Hombre descalzo de la escalera',
    nameRevealingOriginIdentifiers: [],
    bondTextByOriginIdentifier: {
      stand_in_beam_and_answer: 'Desconocido. Nadie lo ha identificado todavía.',
    },
    impressionTextByOriginIdentifier: {
      stand_in_beam_and_answer:
        'Apareció tosiendo en el peldaño ciento nueve, descalzo. Parece vivo y agotado. Habrá que preguntarle quién es.',
    },
    statementsByOriginIdentifier: {},
  },
]

const threadDefinitionsByOriginIdentifier: Record<string, JournalThreadDefinition[]> = {
  archive_opening: [
    {
      identifier: 'sanctioned_lighthouse_inquiry',
      threadKind: 'inquiry',
      titleText: 'Averiguar por qué un faro apagado desde 1987 da destellos, y qué fue del hombre que falta',
      originText: 'Sanción de la OICNAU tras el Susurro de la radio de pescadores.',
      responsibleText: '{{nombre}}',
      deadlineText: 'Tres noches desde la sanción',
      deadlineWorldClockMinutes: null,
      closingStatusWhenArchiveFinished: 'finished',
      closingNoteText: 'Terminado con el informe redactado en la lancha al amanecer.',
    },
  ],
  pay_boatman_to_wait: [
    {
      identifier: 'boatman_waits_until_dawn',
      threadKind: 'promise',
      titleText: 'El lanchero espera con el motor apagado hasta que claree, ni un minuto más',
      originText: 'Pago de 120 de fondos operativos, entregado en mano en el muelle viejo.',
      responsibleText: 'El lanchero',
      deadlineText: 'Hasta el amanecer',
      deadlineWorldClockMinutes: demonstrationDawnWorldClockMinutes,
      closingStatusWhenArchiveFinished: 'finished',
      closingNoteText: 'Terminado: amaneció y la lancha seguía en el muelle.',
    },
    {
      identifier: 'lighthouse_might_say_a_name',
      threadKind: 'open_mystery',
      titleText: 'El lanchero da por hecho que el faro puede decir el nombre de alguien',
      originText: 'Advertencia del lanchero al cobrar.',
      responsibleText: '{{nombre}}',
      deadlineText: null,
      deadlineWorldClockMinutes: null,
      closingStatusWhenArchiveFinished: 'suspended',
      closingNoteText: 'Suspendido: queda anotado en la Crónica sin respuesta.',
    },
  ],
  speak_with_waiting_woman: [
    {
      identifier: 'find_renata_brother',
      threadKind: 'inquiry',
      titleText: 'Saber qué fue del hermano de Renata, que subió anoche al faro a contar',
      originText: 'Conversación con Renata Oquendo en el muelle viejo.',
      responsibleText: '{{nombre}}',
      deadlineText: null,
      deadlineWorldClockMinutes: null,
      closingStatusWhenArchiveFinished: 'finished',
      closingNoteText: 'Terminado con el cierre del Archivo; lo averiguado consta en el informe.',
    },
  ],
  examine_watch_register: [
    {
      identifier: 'watch_stopped_at_foot_of_lighthouse',
      threadKind: 'open_mystery',
      titleText: 'El reloj propio se quedó clavado en las tres y veintiuno al pie del faro',
      originText: 'Lectura del registro de guardia.',
      responsibleText: '{{nombre}}',
      deadlineText: null,
      deadlineWorldClockMinutes: null,
      closingStatusWhenArchiveFinished: 'suspended',
      closingNoteText: 'Suspendido: queda anotado en la Crónica sin respuesta.',
    },
  ],
  ignite_flare_outer_stairs: [
    {
      identifier: 'shadow_out_of_step',
      threadKind: 'open_mystery',
      titleText: 'La sombra propia no subía al mismo ritmo que el cuerpo',
      originText: 'Subida por la escalera exterior con la bengala encendida.',
      responsibleText: '{{nombre}}',
      deadlineText: null,
      deadlineWorldClockMinutes: null,
      closingStatusWhenArchiveFinished: 'suspended',
      closingNoteText: 'Suspendido: queda anotado en la Crónica sin respuesta.',
    },
  ],
  bag_blue_pen_evidence: [
    {
      identifier: 'deliver_sealed_pen_for_analysis',
      threadKind: 'debt',
      titleText: 'Entregar a la OICNAU la bolsa sellada con el bolígrafo azul',
      originText: 'Evidencia recogida y rotulada por {{nombre}} dentro del faro.',
      responsibleText: '{{nombre}}',
      deadlineText: 'Al entregar el informe del Archivo',
      deadlineWorldClockMinutes: null,
      closingStatusWhenArchiveFinished: 'transferred',
      closingNoteText: 'Transferido: la bolsa viaja con el informe y pasa a custodia de la OICNAU.',
    },
  ],
  photograph_the_optic: [
    {
      identifier: 'photograph_nobody_took',
      threadKind: 'open_mystery',
      titleText: 'Quién, o qué, tomó la décima foto desde dentro de la óptica',
      originText: 'Revisión de la cámara en el cuarto de la linterna.',
      responsibleText: '{{nombre}}',
      deadlineText: null,
      deadlineWorldClockMinutes: null,
      closingStatusWhenArchiveFinished: 'suspended',
      closingNoteText: 'Suspendido: queda anotado en la Crónica sin respuesta.',
    },
  ],
  evacuate_renata_and_withdraw: [
    {
      identifier: 'house_with_table_set',
      threadKind: 'open_mystery',
      titleText: 'La casa donde el destello se detuvo amaneció con la mesa puesta para dos y nadie dentro',
      originText: 'Retirada al muelle con Renata Oquendo.',
      responsibleText: '{{nombre}}',
      deadlineText: null,
      deadlineWorldClockMinutes: null,
      closingStatusWhenArchiveFinished: 'suspended',
      closingNoteText: 'Suspendido: queda anotado en la Crónica sin respuesta.',
    },
  ],
  solved_interactive_piece_0003: [
    {
      identifier: 'man_still_kept_on_missing_step',
      threadKind: 'open_mystery',
      titleText: 'Con los obturadores puestos el faro calla, pero no suelta a quien guarda en el peldaño ciento nueve',
      originText: 'Nota del farero en el cajón de las placas, y lo oído en la escalera después de montarlas.',
      responsibleText: '{{nombre}}',
      deadlineText: null,
      deadlineWorldClockMinutes: null,
      closingStatusWhenArchiveFinished: 'transferred',
      closingNoteText: 'Transferido: el informe de contención lo deja señalado a la OICNAU como hilo abierto.',
    },
  ],
  stand_in_beam_and_answer: [
    {
      identifier: 'identify_barefoot_man',
      threadKind: 'inquiry',
      titleText: 'Preguntar al hombre descalzo de la escalera quién es y cuánto tiempo lleva ahí',
      originText: 'Lo ocurrido en el cuarto de la linterna tras responder al décimo destello.',
      responsibleText: '{{nombre}}',
      deadlineText: null,
      deadlineWorldClockMinutes: null,
      closingStatusWhenArchiveFinished: 'finished',
      closingNoteText: 'Terminado con el cierre del Archivo; lo averiguado consta en el informe.',
    },
  ],
}

const handoutDefinitions: HandoutDefinition[] = [
  {
    identifier: 'renata_pocket_notebook',
    appearanceKind: 'pocket_notebook',
    titleText: 'Libreta de Renata',
    captionText: 'Hojas cuadriculadas, tapa blanda, esquinas mojadas.',
    custodyText: 'La conserva Renata Oquendo. Lo visto en ella ya está anotado aquí y no se pierde.',
    documentLines: ['|||| ||||', '|||| ||||', '|||| ||||', '|||| ||||', '|||| ||||  |'],
    seenInOriginIdentifiers: ['speak_with_waiting_woman'],
  },
  {
    identifier: 'lighthouse_watch_register',
    appearanceKind: 'watch_register',
    titleText: 'Registro de guardia',
    captionText: 'Clavado junto a la puerta del faro. Hinchado por la sal.',
    custodyText: 'Sigue clavado junto a la puerta. Lo leído ya está anotado aquí y no se pierde.',
    documentLines: [
      '14 ago 1987 · Relevo sin novedad. Viento del',
      '03:12 · Guardia cumplida.',
      '03:12 · Guardia cumplida.',
      '03:12 · Guardia cumplida.',
    ],
    seenInOriginIdentifiers: ['examine_watch_register'],
  },
  {
    identifier: 'keeper_logbook',
    appearanceKind: 'keeper_logbook',
    titleText: 'Cuaderno del farero',
    captionText: 'Tapas de hule negro. Sobre la mesa de su cuarto.',
    custodyText: 'Quedó en el cuarto del farero. Lo leído ya está anotado aquí y no se pierde.',
    documentLines: ['Ago 1987', 'nombre · 4', 'nombre · 7', 'nombre · 2', 'nombre · 9', '10 —'],
    seenInOriginIdentifiers: ['read_keeper_logbook', 'finish_keeper_inventory', 'write_missing_name_under_the_lamp'],
  },
  {
    identifier: 'sealed_blue_pen_bag',
    appearanceKind: 'evidence_bag',
    titleText: 'Bolsa de evidencia',
    captionText: 'Bolígrafo azul de propaganda. Sellada y rotulada.',
    custodyText: 'En custodia de {{nombre}}. Si se extraviara, lo observado seguiría anotado aquí.',
    documentLines: ['FERRETERÍA', 'PUNTA ÁNIMAS', 'Rotulada a mano'],
    seenInOriginIdentifiers: ['bag_blue_pen_evidence'],
  },
  {
    identifier: 'tenth_photograph',
    appearanceKind: 'instant_photograph',
    titleText: 'La décima foto',
    captionText: 'Nadie la tomó. Una figura de espaldas, vista desde dentro de la óptica.',
    custodyText: 'Guardada en la cámara de {{nombre}}. Si se borrara, lo visto seguiría anotado aquí.',
    documentLines: ['10 / 9'],
    seenInOriginIdentifiers: ['photograph_the_optic'],
  },
]

type WitnessedOriginSource = {
  witnessedOrigins: readonly WitnessedOrigin[]
}

export function readWitnessedOriginsFromArchiveRun(
  archiveRun: WitnessedOriginSource,
  hasOpenArchive: boolean,
  chosenWhisperIdentifier: string | null,
): WitnessedOrigin[] {
  if (!hasOpenArchive) {
    return []
  }
  const engineOrigins = archiveRun.witnessedOrigins.map((witnessedOrigin) => ({
    originIdentifier: witnessedOrigin.originIdentifier,
    placeName: witnessedOrigin.placeName,
    worldClockMinutes: witnessedOrigin.worldClockMinutes,
  }))
  if (chosenWhisperIdentifier !== lighthouseWhisperIdentifier) {
    return engineOrigins
  }
  return [
    {
      originIdentifier: archiveOpeningOriginIdentifier,
      placeName: initialInvestigatorState.placeName,
      worldClockMinutes: initialInvestigatorState.worldClockMinutes,
    },
    ...engineOrigins,
  ]
}

export function buildLivedCaseJournal(witnessedOrigins: readonly WitnessedOrigin[]): LivedCaseJournal {
  const clues: PerceivedClue[] = []
  const threads: JournalThread[] = []
  const handouts: SeenHandout[] = []
  const placeNames: string[] = []

  witnessedOrigins.forEach((witnessedOrigin) => {
    const clueDefinitions = perceivedCluesByOriginIdentifier[witnessedOrigin.originIdentifier] ?? []
    clueDefinitions.forEach((clueDefinition) => {
      clues.push({
        ...clueDefinition,
        placeName: witnessedOrigin.placeName,
        worldClockMinutes: witnessedOrigin.worldClockMinutes,
        chronologicalOrder: clues.length + 1,
      })
    })
    if (clueDefinitions.length > 0 && !placeNames.includes(witnessedOrigin.placeName)) {
      placeNames.push(witnessedOrigin.placeName)
    }
    const threadDefinitions = threadDefinitionsByOriginIdentifier[witnessedOrigin.originIdentifier] ?? []
    threadDefinitions.forEach((threadDefinition) => {
      if (threads.some((existingThread) => existingThread.identifier === threadDefinition.identifier)) {
        return
      }
      threads.push({
        ...threadDefinition,
        openedAtPlaceName: witnessedOrigin.placeName,
        openedAtWorldClockMinutes: witnessedOrigin.worldClockMinutes,
      })
    })
    handoutDefinitions.forEach((handoutDefinition) => {
      const wasSeenNow = handoutDefinition.seenInOriginIdentifiers.includes(witnessedOrigin.originIdentifier)
      const isAlreadyListed = handouts.some((seenHandout) => seenHandout.identifier === handoutDefinition.identifier)
      if (wasSeenNow && !isAlreadyListed) {
        handouts.push({
          ...handoutDefinition,
          seenAtPlaceName: witnessedOrigin.placeName,
          seenAtWorldClockMinutes: witnessedOrigin.worldClockMinutes,
        })
      }
    })
  })

  const knownPersons: KnownPerson[] = []
  knownPersonDefinitions.forEach((personDefinition) => {
    const originsInvolvingPerson = witnessedOrigins.filter(
      (witnessedOrigin) =>
        personDefinition.impressionTextByOriginIdentifier[witnessedOrigin.originIdentifier] !== undefined ||
        personDefinition.bondTextByOriginIdentifier[witnessedOrigin.originIdentifier] !== undefined ||
        personDefinition.statementsByOriginIdentifier[witnessedOrigin.originIdentifier] !== undefined,
    )
    if (originsInvolvingPerson.length === 0) {
      return
    }
    const isNameKnown =
      personDefinition.knownName === personDefinition.aliasBeforeNameIsKnown ||
      witnessedOrigins.some((witnessedOrigin) =>
        personDefinition.nameRevealingOriginIdentifiers.includes(witnessedOrigin.originIdentifier),
      )
    const bondTexts: string[] = []
    const impressions: KnownPersonImpression[] = []
    const statements: KnownPersonStatement[] = []
    originsInvolvingPerson.forEach((witnessedOrigin) => {
      const bondText = personDefinition.bondTextByOriginIdentifier[witnessedOrigin.originIdentifier]
      if (bondText && !bondTexts.includes(bondText)) {
        bondTexts.push(bondText)
      }
      const impressionText = personDefinition.impressionTextByOriginIdentifier[witnessedOrigin.originIdentifier]
      if (impressionText) {
        impressions.push({ impressionText, worldClockMinutes: witnessedOrigin.worldClockMinutes })
      }
      const statementDefinitions = personDefinition.statementsByOriginIdentifier[witnessedOrigin.originIdentifier] ?? []
      statementDefinitions.forEach((statementDefinition) => {
        statements.push({
          ...statementDefinition,
          placeName: witnessedOrigin.placeName,
          worldClockMinutes: witnessedOrigin.worldClockMinutes,
        })
      })
    })
    knownPersons.push({
      identifier: personDefinition.identifier,
      displayName: isNameKnown ? personDefinition.knownName : personDefinition.aliasBeforeNameIsKnown,
      isNameKnown: isNameKnown && personDefinition.nameRevealingOriginIdentifiers.length > 0,
      firstSeenPlaceName: originsInvolvingPerson[0].placeName,
      firstSeenWorldClockMinutes: originsInvolvingPerson[0].worldClockMinutes,
      bondTexts,
      impressions,
      statements,
    })
  })

  return { clues, knownPersons, threads, handouts, placeNames }
}

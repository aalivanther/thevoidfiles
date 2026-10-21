import type {
  EpochClimateStageName,
  WorldAtlasPlaceIdentifier,
  WorldAtlasPlaceKnowledge,
  WorldNewsClippingIdentifier,
} from '../demonstration/world_atlas_data'

type PlaceCopy = {
  placeName: string
  regionName: string
  accessDescription: string
  knownFacts: string
}

type ClippingCopy = {
  headline: string
  sourceLabel: string
  bodyText: string
}

type EpochClimateCopy = {
  climateName: string
  toneDescription: string
  headlines: string[]
}

const placeCopyByIdentifier: Record<WorldAtlasPlaceIdentifier, PlaceCopy> = {
  residence: {
    placeName: 'Residencia',
    regionName: 'Punto de partida',
    accessDescription: 'Carretera en las cuatro direcciones y estación de tren a poca distancia.',
    knownFacts:
      'El lugar al que se vuelve entre un Archivo y el siguiente. Todas las distancias del plano se miden desde este alfiler.',
  },
  punta_animas: {
    placeName: 'Punta Ánimas',
    regionName: 'Costa oeste · Rural aislada',
    accessDescription: 'Solo por mar: lancha desde Puerto Cabral, cuando algún lanchero acepta cruzar de noche.',
    knownFacts:
      'Un pueblo de pescadores con un faro apagado desde 1987. El muelle viejo sigue en pie. La gente habla bajo cuando se menciona la torre.',
  },
  cabral_harbor: {
    placeName: 'Puerto Cabral',
    regionName: 'Costa oeste',
    accessDescription: 'Carretera costera desde la residencia. Lanchas de alquiler en el espigón norte.',
    knownFacts:
      'Puerto pesquero mediano. De aquí salió la lancha hacia Punta Ánimas. El lanchero cobró por adelantado y no quiso dar su nombre.',
  },
  las_cruces_junction: {
    placeName: 'Empalme Las Cruces',
    regionName: 'Llanura del norte',
    accessDescription: 'Línea férrea principal y carretera del norte.',
    knownFacts:
      'Nudo ferroviario por el que pasa casi cualquier viaje hacia el norte o el este. Cantina abierta toda la noche y un tablón de anuncios que nadie limpia.',
  },
  fourth_floor_facility: {
    placeName: 'Complejo farmacéutico',
    regionName: 'Cinturón industrial del noreste · Instalación corporativa',
    accessDescription: 'Tren hasta Empalme Las Cruces y carretera de servicio. Entrada con control de acceso, según el rumor.',
    knownFacts:
      'Solo se sabe lo que dice un hilo borrado de un foro de vigilantes. La ubicación es aproximada: nadie ha ido a comprobarla.',
  },
  arch_street: {
    placeName: 'Calle del Arco',
    regionName: 'Casco antiguo del sureste · Sitio histórico',
    accessDescription: 'Carretera del sureste, un día entero de camino. Dentro del casco antiguo solo se circula a pie.',
    knownFacts:
      'Una nota breve de un diario regional la menciona. Parroquia antigua, calles estrechas. Lo demás son palabras de vecinos que nadie ha contrastado.',
  },
  uncharted_mark: {
    placeName: 'Marca sin leyenda',
    regionName: 'Mar abierto',
    accessDescription: 'Ninguno conocido. En esa zona las cartas náuticas no señalan tierra.',
    knownFacts:
      'Un punto de tinta que no estaba en el plano la última vez que se desplegó. Nadie en la casa recuerda haberlo marcado. La tinta todavía mancha el dedo.',
  },
}

const knowledgeLabelByKnowledge: Record<WorldAtlasPlaceKnowledge, string> = {
  lived: 'Se vive aquí',
  visited: 'Visitado en persona',
  passed_through: 'Conocido de paso',
  hearsay: 'Solo de oídas',
  unexplained: 'Sin explicación',
}

const clippingCopyByIdentifier: Record<WorldNewsClippingIdentifier, ClippingCopy> = {
  lighthouse_press_note: {
    headline: 'Vecinos de Punta Ánimas atribuyen a una avería las luces vistas en el faro',
    sourceLabel: 'El Litoral · Sección comarcal',
    bodyText:
      'La capitanía asegura que el faro continúa fuera de servicio y que «no hay nada que investigar». Un pescador dado por desaparecido regresó a su casa sin querer hacer declaraciones. La cofradía pide que se deje descansar al pueblo.',
  },
  ferry_schedule_cut: {
    headline: 'La naviera reduce a dos las salidas semanales por el temporal',
    sourceLabel: 'El Litoral · Puertos',
    bodyText:
      'Las lanchas de Puerto Cabral saldrán solo martes y viernes hasta nuevo aviso. Los patrones advierten que los precios de los trayectos particulares subirán mientras dure el mal tiempo.',
  },
  pharmaceutical_expansion: {
    headline: 'Una farmacéutica anuncia trescientos empleos en su planta del noreste',
    sourceLabel: 'La Gaceta Económica',
    bodyText:
      'La empresa amplía turnos y busca personal de seguridad con disponibilidad nocturna. El sindicato celebra la noticia, aunque reclama conocer las condiciones de los nuevos contratos.',
  },
  short_wave_interference: {
    headline: 'Radioaficionados denuncian interferencias nocturnas en onda corta',
    sourceLabel: 'Boletín de la Liga de Radioaficionados',
    bodyText:
      'Varios socios registran desde hace semanas una señal que ocupa la misma frecuencia a la misma hora. La autoridad de telecomunicaciones responde que no le consta ninguna emisión sin licencia.',
  },
  parish_restoration: {
    headline: 'Comienza la restauración del retablo mayor con fondos de una donación anónima',
    sourceLabel: 'Diario regional del sureste',
    bodyText:
      'Las obras obligarán a cerrar el templo por las noches durante dos meses. El párroco agradece la generosidad del donante y pide paciencia a los vecinos del casco antiguo.',
  },
  fishing_ban_extension: {
    headline: 'Se prorroga la veda en la franja oeste tras otra semana de redes vacías',
    sourceLabel: 'Radio de pescadores · Parte de la mañana',
    bodyText:
      'Los patrones no recuerdan una temporada igual. Unos culpan a las corrientes, otros al ruido de los cargueros. La cofradía estudia pedir ayudas al gobierno regional.',
  },
}

const epochClimateCopyByStageName: Record<EpochClimateStageName, EpochClimateCopy> = {
  local_threat: {
    climateName: 'Calma con grietas',
    toneDescription:
      'Los periódicos hablan del tiempo, de la pesca y de los precios. Lo extraño, cuando asoma, cabe en un suelto de página par y se olvida al día siguiente.',
    headlines: [
      'El temporal deja sin luz a tres pueblos de la costa',
      'Sube el precio del gasóleo por tercera semana',
      'Una vecina asegura que su reloj atrasa solo de madrugada',
    ],
  },
  regional_unrest: {
    climateName: 'Inquietud de comarca',
    toneDescription:
      'Los sucesos raros ya no se olvidan tan rápido. Las columnas de opinión piden explicaciones y los alcaldes contestan con comunicados demasiado parecidos entre sí.',
    headlines: [
      'Tres municipios suspenden sus fiestas «por prudencia»',
      'La comisaría regional refuerza las patrullas nocturnas sin dar motivos',
      'Se agotan las cerraduras en las ferreterías del interior',
    ],
  },
  widespread_alarm: {
    climateName: 'Alarma extendida',
    toneDescription:
      'Las portadas ya no disimulan. Hay programas de radio que leen listas de desaparecidos y tertulianos que discuten a gritos lo que hace un año nadie se atrevía a nombrar.',
    headlines: [
      'El gobierno pide calma y recomienda no viajar de noche',
      'Las iglesias abren sus puertas las veinticuatro horas',
      'Cierran dos universidades tras la renuncia de sus claustros',
    ],
  },
  paradigm_crisis: {
    climateName: 'Crisis de paradigma',
    toneDescription:
      'Lo que se daba por cierto ya no sirve. Los diarios salen con páginas en blanco, los científicos se contradicen en directo y la gente mira al cielo antes de salir de casa.',
    headlines: [
      'Los observatorios dejan de publicar sus mediciones',
      'Dimiten en bloque los asesores científicos del gobierno',
      'Editorial: «Ya no sabemos qué preguntas hacer»',
    ],
  },
}

const formatThousands = (amount: number) => String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

export const worldAtlasCopy = {
  screenTitle: 'Mundo',
  presentationLabel: 'Entre Archivos',
  presentationTitle: 'Mesa de cartografía',
  presentationDetail: 'El mundo no espera a nadie',
  headerLead:
    'El plano se despliega bajo la lámpara. Todo lo que aparece aquí es lo que se ha visto, oído o leído: ni más, ni menos.',
  unknownResidenceName: 'Residencia sin registrar',
  worldDateLabel: 'Fecha del mundo',
  worldClockLabel: 'Hora',
  daysElapsedDescription: (elapsedDayCount: number) =>
    elapsedDayCount === 0
      ? 'Primer día de la Crónica'
      : elapsedDayCount === 1
        ? 'Ha pasado un día desde el inicio de la Crónica'
        : `Han pasado ${elapsedDayCount} días desde el inicio de la Crónica`,
  map: {
    sectionTitle: 'Plano de trabajo',
    mapDescription: (residenceName: string) =>
      `Plano estilizado del mundo conocido, centrado en ${residenceName}. No representa geografía exacta. Se desplaza con las flechas del teclado y se amplía con las teclas más y menos; la tecla cero lo devuelve a la residencia. Al elegir un destino se traza la ruta a lápiz y se anota el viaje estimado. La lista de la pestaña contigua contiene lo mismo en texto.`,
    keyboardHint:
      'Arrastrar: desplazar · Doble pulsación o pellizco: ampliar · Flechas: desplazar · + y −: ampliar o reducir · 0: volver a la residencia · Rueda del ratón: ampliar, después de pulsar sobre el plano',
    zoomInLabel: 'Ampliar el plano',
    zoomOutLabel: 'Reducir el plano',
    panNorthLabel: 'Desplazar hacia el norte',
    panSouthLabel: 'Desplazar hacia el sur',
    panWestLabel: 'Desplazar hacia el oeste',
    panEastLabel: 'Desplazar hacia el este',
    recenterLabel: 'Volver a la residencia',
    zoomAnnouncement: (zoomPercentage: number) => `Ampliación al ${zoomPercentage} por ciento`,
    mapViewLabel: 'Plano',
    listViewLabel: 'Lista',
    viewSwitchLabel: 'Forma de consultar el plano',
    compassNorthLetter: 'N',
    compassSouthLetter: 'S',
    compassEastLetter: 'E',
    compassWestLetter: 'O',
    scaleBarLabel: '500 km',
    seaLabel: 'MAR DEL OESTE',
    mountainLabel: 'SIERRA',
    plainLabel: 'LLANURA',
    stylizedNotice: 'Plano de trabajo · Sin escala oficial',
    searchRadiusLabel: (kilometers: number) => `Radio de búsqueda · ${formatThousands(kilometers)} km`,
    globalReachLabel: 'Radio de búsqueda · Alcance global',
    unlocatedSignalLabel: 'Señal sin ubicar',
    unlocatedSignalHint: 'Onda corta · origen desconocido',
  },
  searchRadius: {
    title: 'Radio de búsqueda',
    limitedDescription: (kilometers: number, upcomingArchiveNumber: number) =>
      `Para el Archivo ${upcomingArchiveNumber}, los Susurros llegan desde un máximo de ${formatThousands(kilometers)} km alrededor de la residencia.`,
    globalDescription: 'Los Susurros llegan ya desde cualquier lugar del mundo. El compás no alcanza a trazarlo.',
    beyondPaperNotice: 'El círculo ya no cabe en este pliego: continúa más allá del borde del papel.',
  },
  filters: {
    groupLabel: 'Qué se muestra en el plano',
    whispers: 'Susurros',
    visitedPlaces: 'Lugares visitados',
    knownPlaces: 'Lugares conocidos',
    unexplainedMarks: 'Marcas sin explicar',
    searchRadius: 'Radio de búsqueda',
    shownState: 'visible',
    hiddenState: 'oculto',
  },
  markerKindLabels: {
    residence: 'Residencia',
    whisper: 'Susurro',
    visited_place: 'Lugar visitado',
    known_place: 'Lugar conocido',
    unexplained_mark: 'Marca sin explicar',
    unlocated_signal: 'Señal sin ubicar',
  },
  markerAccessibleName: (kindLabel: string, markerName: string, distanceText: string | null) =>
    distanceText ? `${kindLabel}: ${markerName}, a ${distanceText}` : `${kindLabel}: ${markerName}`,
  detail: {
    panelTitle: 'Ficha del alfiler',
    emptyTitle: 'Ningún alfiler elegido',
    emptyDescription:
      'Al elegir un alfiler del plano o una línea de la lista, aquí aparece lo que se sabe de ese punto y cuánto costaría llegar.',
    closeLabel: 'Soltar el alfiler',
    regionLabel: 'Región',
    distanceLabel: 'Distancia desde la residencia',
    unknownDistance: 'Sin determinar',
    accessLabel: 'Accesos',
    knownFactsLabel: 'Qué se sabe',
    knowledgeLabel: 'Cómo se sabe',
    lastVisitLabel: 'Última visita',
    neverVisited: 'Nunca',
    visitInProgress: 'Ahora mismo · Archivo abierto',
    visitDuringClosedArchive: 'Durante el Archivo 01',
    visitHereNow: 'El registro dice que está aquí ahora.',
    visitRecorded: 'El registro lo marca como pisado.',
    unmappedPlaceRegion: 'Fuera del plano de papel',
    unmappedPlaceFacts:
      'Este lugar entra porque el Archivo ya lo pisó. El plano de papel no tiene un punto para él.',
    unmappedPlaceAccess: 'Solo el camino que el Archivo ya recorrió.',
    livesHere: 'A diario',
    whisperSourceLabel: 'Fuente del Susurro',
    whisperRumorLabel: 'Lo que se dice',
    whisperSphereLabel: 'Esfera',
    whisperToneLabel: 'Tono',
    whisperThreatLabel: 'Amenaza aparente',
    whisperAlreadyInvestigated: 'Este Susurro ya fue investigado.',
    travelTitle: 'Viaje estimado',
    travelDuration: (travelHours: number) => (travelHours === 1 ? 'Alrededor de 1 hora' : `Alrededor de ${travelHours} horas`),
    travelCost: (operationalFundsCost: number) => `Unos ${formatThousands(operationalFundsCost)} de fondos operativos`,
    travelDurationLabel: 'Tiempo',
    travelCostLabel: 'Coste',
    travelDisclaimer:
      'Estimación de demostración. Desde esta mesa no se emprende ningún viaje ni se descuenta nada: los fondos operativos solo existen dentro de un Archivo sancionado.',
    noRouteKnown: 'No hay ruta conocida hasta este punto.',
    encodedSignalFacts:
      'La transmisión se repite cada noche a la misma hora. Sin triangulación no hay manera de clavarle un alfiler: podría venir de cualquier parte dentro del radio, o de fuera.',
    residenceHeading: (residenceName: string) => residenceName,
  },
  list: {
    sectionTitle: 'Todo lo que hay en el plano',
    columnDescription: 'Cada línea abre la misma ficha que su alfiler.',
    hiddenByFilters: 'Los filtros actuales no dejan nada a la vista.',
    selectedState: 'elegido',
  },
  worldAdvances: {
    sectionTitle: 'El mundo sigue',
    sectionLead: 'Recortes y rumores de los últimos días, en el orden en que llegaron a la mesa.',
    whisperClippingKind: 'Rumor',
    pressClippingKind: 'Prensa',
    showOnMapLabel: 'Ver en el plano',
    daysAgoLabel: (daysAgo: number) => (daysAgo === 0 ? 'Hoy' : daysAgo === 1 ? 'Ayer' : `Hace ${daysAgo} días`),
  },
  knownPlaces: {
    sectionTitle: 'Lugares conocidos',
    sectionLead: 'Solo lo percibido. Lo que se sabe de oídas queda anotado como tal.',
    showOnMapLabel: 'Ver en el plano',
  },
  epochClimate: {
    sectionTitle: 'Clima de época',
    sectionLead: 'Lo que se respira al abrir el periódico y encender la radio.',
    headlinesLabel: 'Titulares de esta semana',
  },
  placeCopyByIdentifier,
  knowledgeLabelByKnowledge,
  clippingCopyByIdentifier,
  epochClimateCopyByStageName,
} as const

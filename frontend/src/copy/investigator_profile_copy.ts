import type {
  ChronicleThreadStateName,
  LocalServiceIdentifier,
  ProfileConnectionIdentifier,
  ProfileConnectionStateName,
  SavedChronicleKindName,
} from '../demonstration/investigator_profile_data'

const connectionNames: Record<ProfileConnectionIdentifier, string> = {
  narrative_intelligence: 'Inteligencia narrativa',
  voice_intelligence: 'Inteligencia de voz',
}

const connectionPurposes: Record<ProfileConnectionIdentifier, string> = {
  narrative_intelligence: 'Le presta la pluma al Director: sopesa cada acción y narra lo que el mundo responde.',
  voice_intelligence: 'Le presta la garganta al Director: lee la narración en voz alta cuando así se pide.',
}

const connectionStateLabels: Record<ProfileConnectionStateName, string> = {
  connected: 'En línea',
  demonstration: 'Modo demostración',
  not_configured: 'Sin configurar',
  unavailable: 'No disponible',
}

const connectionStateExplanations: Record<ProfileConnectionStateName, string> = {
  connected: 'Responde con normalidad.',
  demonstration: 'Las respuestas salen de un guion preparado; nada viaja fuera de este dispositivo.',
  not_configured: 'Nadie ocupa este puesto todavía. La crónica sigue su curso sin él.',
  unavailable: 'Este dispositivo no lo permite por ahora.',
}

const localServiceNames: Record<LocalServiceIdentifier, string> = {
  chronicle_storage: 'Fichero de crónicas',
  director_engine: 'Mesa del Director',
  browser_speech: 'Voz de este dispositivo',
  sound_library: 'Fonoteca',
}

const localServicePurposes: Record<LocalServiceIdentifier, string> = {
  chronicle_storage: 'Guarda cada crónica en este dispositivo, sin cuentas ni nube.',
  director_engine: 'Lleva el reglamento, el reloj del mundo y las consecuencias de cada turno.',
  browser_speech: 'Voces instaladas en el dispositivo, útiles cuando no hay otra voz contratada.',
  sound_library: 'Efectos, ambientes y música que acompañan la lectura.',
}

const savedChronicleKindLabels: Record<SavedChronicleKindName, string> = {
  automatic: 'Guardado automático',
  manual: 'Guardado a mano',
  archive_closure: 'Cierre de Archivo',
}

const chronicleThreadStateLabels: Record<ChronicleThreadStateName, string> = {
  in_progress: 'Crónica en curso',
  closed: 'Crónica cerrada',
}

export const investigatorProfileCopy = {
  presentation: {
    chapterLabel: 'Fichero personal',
    chapterTitle: 'Perfil',
    detailLine: 'Conexiones, guardados e hilos de cada crónica',
  },
  header: {
    boardLabel: 'Fichero personal · Solo en este dispositivo',
    title: 'Perfil',
    introduction:
      'Todo lo que sostiene las crónicas vive en este fichero: quién le presta voz al Director, qué Investigadores tienen expediente abierto y de qué hilo tira cada quien.',
    returnButton: 'Volver',
  },
  sections: {
    navigationLabel: 'Secciones del Perfil',
    connections: 'Conexiones',
    investigators: 'Investigadores',
    chronicleThreads: 'Hilos',
    countLabel: (count: number) => `${count} en esta sección`,
  },
  connections: {
    intelligencesTitle: 'Quién le presta voz al Director',
    localServicesTitle: 'Servicios de este dispositivo',
    connectionNames,
    connectionPurposes,
    connectionStateLabels,
    connectionStateExplanations,
    localServiceNames,
    localServicePurposes,
    providerLabel: 'Proveedor',
    optionLabel: 'Modelo o voz',
    accessKeyLabel: 'Clave',
    accessKeyAbsent: 'No hace falta',
    noProviderChosen: 'Ninguno elegido',
    checkButton: 'Probar conexión',
    checkAllButton: 'Probar todo',
    checkingNotice: 'Se escucha la línea…',
    lastCheckLabel: (formattedMoment: string) => `Última prueba: ${formattedMoment}`,
    neverCheckedLabel: 'Sin pruebas en esta visita',
    checkAnnouncement: (connectionName: string, stateLabel: string) => `${connectionName}: ${stateLabel}.`,
    demonstrationNotice:
      'En esta demostración las pruebas son simuladas, salvo el fichero de crónicas y la voz del dispositivo, que se comprueban de verdad.',
    reconfigurationNotice:
      'El cambio de proveedor se hace desde la pantalla de conexiones que aparece al abrir el juego por primera vez.',
  },
  investigators: {
    activeTitle: 'Con expediente abierto',
    fallenTitle: 'Crónicas cerradas',
    fallenExplanation: 'De quien ya no vuelve solo quedan las cuentas. El resto se fue con su crónica.',
    currentInvestigatorTag: 'Crónica en uso',
    fallenTag: 'Crónica cerrada',
    levelLabel: 'Nivel',
    resolvedArchivesLabel: 'Archivos resueltos',
    investigatedWhispersLabel: 'Susurros investigados',
    seriousWoundsLabel: 'Heridas Graves',
    threadLabel: 'Hilo',
    showSavedChronicles: (count: number) => (count === 1 ? 'Ver 1 guardado' : `Ver ${count} guardados`),
    hideSavedChronicles: 'Cerrar guardados',
    savedChroniclesListLabel: (investigatorFullName: string) => `Guardados de ${investigatorFullName}`,
    savedChronicleKindLabels,
    betweenArchives: 'Entre Archivos',
    savedAtLabel: 'Guardado el',
    worldClockLabel: 'Hora en el mundo',
    turnCountLabel: (count: number) => (count === 1 ? '1 turno confirmado' : `${count} turnos confirmados`),
    chooseSaveButton: 'Retomar desde aquí',
    chosenSaveButton: 'Marcado para retomar',
    noActiveInvestigators: 'Ningún Investigador tiene expediente abierto todavía.',
  },
  chronicleThreads: {
    inProgressTitle: 'Hilos en curso',
    closedTitle: 'Hilos cerrados',
    chronicleThreadStateLabels,
    currentThreadTitle: (investigatorFullName: string) => `La crónica de ${investigatorFullName}`,
    closedThreadTitle: (investigatorFullName: string) => `La última crónica de ${investigatorFullName}`,
    currentThreadTag: 'En uso ahora',
    currentThreadSynopsis: 'El hilo que está sobre la mesa en este momento. Todo lo que ocurra se guarda aquí.',
    closedThreadSynopsis: 'Este hilo ya no se puede retomar. Se conservan únicamente sus cuentas.',
    investigatorsLabel: 'Quién tira de este hilo',
    fallenInvestigatorSuffix: 'crónica cerrada',
    lastPlayedLabel: 'Última sesión',
    resolvedArchivesLabel: 'Archivos resueltos',
    investigatedWhispersLabel: 'Susurros investigados',
    investigatorCountLabel: 'Investigadores',
    chooseThreadButton: 'Continuar este hilo',
    chosenThreadButton: 'Hilo marcado',
    closedThreadRefusal: 'Un hilo cerrado no se retoma.',
  },
  continuation: {
    regionLabel: 'Crónica marcada para continuar',
    emptyLabel: 'Nada marcado',
    emptyExplanation: 'Al elegir un hilo o un guardado, queda sellado aquí antes de abrirse.',
    stampText: 'Marcado',
    selectedThreadLabel: 'Hilo',
    selectedSaveLabel: 'Punto de regreso',
    latestSaveFallback: 'El guardado más reciente',
    currentChronicleExplanation: 'Es la crónica que ya está sobre la mesa. Se puede seguir ahora mismo.',
    demonstrationExplanation:
      'Este expediente pertenece al fichero de demostración: queda marcado, pero la crónica en uso no cambia ni se pierde nada.',
    resumeButton: 'Seguir la crónica',
    clearButton: 'Quitar la marca',
    selectionAnnouncement: (threadTitle: string) => `Marcado para continuar: ${threadTitle}.`,
    clearedAnnouncement: 'Se quitó la marca.',
  },
}

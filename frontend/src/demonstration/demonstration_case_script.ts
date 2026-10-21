export type CanonicalBelongingIdentifier = 'signal_flare' | 'hand_lantern' | 'sealed_evidence_bag'
export type BelongingIdentifier = string

export type ResourceCost =
  | { kind: 'belonging'; belongingIdentifier: BelongingIdentifier; units: number }
  | { kind: 'operational_funds'; amount: number }

export type WhisperCardContent = {
  identifier: string
  ordinalLabel: string
  headline: string
  sourceLabel: string
  rumorText: string
  distanceText: string
  sphereText: string
  toneText: string
  threatText: string
  rewardText: string
  isEncoded: boolean
  isPlayableInDemonstration: boolean
}

export type BelongingDefinition = {
  identifier: BelongingIdentifier
  visibleName: string
  visibleUnitDescription: string
}

export const belongingDefinitions: Record<string, BelongingDefinition> = {
  signal_flare: {
    identifier: 'signal_flare',
    visibleName: 'Bengalas',
    visibleUnitDescription: 'unidades',
  },
  hand_lantern: {
    identifier: 'hand_lantern',
    visibleName: 'Linterna de mano',
    visibleUnitDescription: 'unidad',
  },
  sealed_evidence_bag: {
    identifier: 'sealed_evidence_bag',
    visibleName: 'Bolsas de evidencia',
    visibleUnitDescription: 'unidades',
  },
}

export function readBelongingVisibleName(
  belongingIdentifier: string,
  liveDefinitions?: Record<string, { visibleName: string }> | null,
): string {
  return (
    liveDefinitions?.[belongingIdentifier]?.visibleName ??
    belongingDefinitions[belongingIdentifier]?.visibleName ??
    belongingIdentifier.replaceAll('_', ' ')
  )
}

export const initialInvestigatorState = {
  investigatorName: 'Quien investiga',
  level: 1,
  seriousWoundsSuffered: 0,
  operationalFunds: 1800,
  personalFunds: 420,
  belongingUnits: {
    signal_flare: 2,
    hand_lantern: 1,
    sealed_evidence_bag: 4,
  } as Record<string, number>,
  placeName: 'Punta Ánimas · Muelle viejo',
  worldClockMinutes: 3 * 60 + 12,
}

export const demonstrationArchive = {
  archiveNumberLabel: '01',
  archiveTitle: 'El faro que cuenta de más',
  sanctionLabel: 'Sanción de la OICNAU · Plazo: tres noches',
  openingNarrationParagraphs: [
    'La lancha deja a {{nombre_completo}} en el muelle viejo de Punta Ánimas a las tres y doce de la madrugada. El lanchero no apaga el motor. Mira el faro, no a quien acaba de desembarcar.',
    'El faro lleva apagado desde 1987. Aun así, sobre el agua negra, un destello blanco barre la bahía. Luego otro. {{nombre}} los cuenta sin querer: nueve. Una pausa larga, como si alguien tomara aire. [[pausa:700]]Y un [[décimo]].',
    'El dosier de la OICNAU cabe en media página: un faro que no debería alumbrar, un hombre que subió anoche y no ha bajado, tres noches de plazo, y cuatro encargos escritos a máquina. Saber de dónde sale el décimo destello. Encontrar al hombre. Que no falte nadie más. Que no salga en los periódicos.',
    'Al final del muelle espera una mujer con un abrigo demasiado grande. Sostiene una libreta contra el pecho. La puerta del faro, a cuarenta metros, está entreabierta. Pegada a la torre, una escalera exterior de hierro sube hasta la galería, roja de óxido bajo cada destello.',
  ],
}

export const whisperCards: WhisperCardContent[] = [
  {
    identifier: 'lighthouse_counts_one_more',
    ordinalLabel: 'I',
    headline: 'El faro que cuenta de más',
    sourceLabel: 'Radio de pescadores · Banda costera',
    rumorText:
      'El faro de Punta Ánimas lleva apagado desde 1987. Los pescadores juran que da nueve destellos cada madrugada. Anoche dio diez. Esta mañana faltaba un hombre.',
    distanceText: '340 km',
    sphereText: 'Rural aislada',
    toneText: 'Misterio',
    threatText: 'Local',
    rewardText: 'Moderada',
    isEncoded: false,
    isPlayableInDemonstration: true,
  },
  {
    identifier: 'night_shift_fourth_floor',
    ordinalLabel: 'II',
    headline: 'Turno de noche en la planta cuatro',
    sourceLabel: 'Foro de vigilantes · Hilo borrado',
    rumorText:
      'Una farmacéutica paga horas extra a quien acepte no mirar las cámaras del nivel cuatro. Tres guardias renunciaron la misma semana. Ninguno recuerda por qué.',
    distanceText: '710 km',
    sphereText: 'Instalación corporativa',
    toneText: 'Terror psicológico',
    threatText: 'Local',
    rewardText: 'Alta',
    isEncoded: false,
    isPlayableInDemonstration: false,
  },
  {
    identifier: 'procession_nobody_called',
    ordinalLabel: 'III',
    headline: 'La procesión que nadie convocó',
    sourceLabel: 'Nota breve · Diario regional',
    rumorText:
      'A las tres de la madrugada una procesión recorre la calle del Arco. No figura en ningún programa de la parroquia. Los vecinos dicen que cada noche lleva un cargador más.',
    distanceText: '925 km',
    sphereText: 'Sitio histórico',
    toneText: 'Intriga social',
    threatText: 'Local',
    rewardText: 'Moderada',
    isEncoded: false,
    isPlayableInDemonstration: false,
  },
  {
    identifier: 'encoded_whisper',
    ordinalLabel: 'IV',
    headline: '▓▓▓ ▓▓▓▓▓▓ ▓▓ ▓▓▓▓▓',
    sourceLabel: 'Origen desconocido',
    rumorText:
      'Transmisión interceptada en onda corta. Se repite cada noche a la misma hora. Nadie ha reclamado su autoría.',
    distanceText: '▓▓▓ km',
    sphereText: 'Desconocida',
    toneText: 'Desconocido',
    threatText: 'Oculta',
    rewardText: 'Oculta',
    isEncoded: true,
    isPlayableInDemonstration: false,
  },
]

export const archiveClosureReportCopy = {
  performanceStampTextByRatingName: {
    excellent: 'Excelente',
    satisfactory: 'Satisfactorio',
    disappointing: 'Decepcionante',
  },
  experienceFormula: (performanceStampText: string, experienceGained: number) =>
    `Rendimiento ${performanceStampText} · ${experienceGained} de experiencia`,
  rewardFormula: (previouslyResolvedArchiveCount: number, formattedRewardBase: string) =>
    `((1 + ${previouslyResolvedArchiveCount} ${
      previouslyResolvedArchiveCount === 1 ? 'caso resuelto' : 'casos resueltos'
    }) ÷ 2) × ${formattedRewardBase}`,
  rewardWithheldFormula: 'Cierre sin sanción: no hay recompensa personal',
  promotionReachedDescription: (reachedLevel: number, remainingExperience: number) =>
    `Nivel ${reachedLevel} alcanzado. ${
      remainingExperience === 1 ? 'Queda 1 punto' : `Quedan ${remainingExperience}`
    } de experiencia. Dos atributos suben un punto.`,
  promotionNotReachedTitle: 'Experiencia acumulada',
  promotionNotReachedDescription: (accumulatedExperience: number, requiredExperience: number) =>
    `${accumulatedExperience} de ${requiredExperience} de experiencia para el siguiente nivel. Esta vez no hay ascenso: la experiencia queda guardada en la Crónica.`,
  recordClosureButton: 'Registrar el cierre',
  closureRecorded: 'Cierre registrado. El mundo vuelve a murmurar.',
}

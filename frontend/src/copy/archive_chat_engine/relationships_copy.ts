export const relationshipsCopy = {
  presentPersonsPanelTitle: 'Personas presentes',
  closePanelButton: 'Cerrar',
  nobodyPresentNotice: 'Nadie más a la vista.',
  presentPersonsCountLabel: (presentPersonCount: number) =>
    presentPersonCount === 0
      ? 'La escena está sola'
      : presentPersonCount === 1
        ? 'Una persona a la vista'
        : `${presentPersonCount} personas a la vista`,
  presentPersonsOrderNotice: 'En el orden en que fueron apareciendo en la escena.',
  pulseHeading: 'El trato cambia',
  pulseHeadingUnchanged: 'El trato se sostiene',
  directionLabels: {
    from_investigator: (investigatorShortName: string, personVisibleName: string) =>
      `${investigatorShortName} → ${personVisibleName}`,
    toward_investigator_as_perceived: (investigatorShortName: string, personVisibleName: string) =>
      `${personVisibleName} → ${investigatorShortName}, según lo percibido`,
  },
  directionSectionHeadings: {
    from_investigator: (investigatorShortName: string, personVisibleName: string) =>
      `Cómo ve ${investigatorShortName} a ${personVisibleName}`,
    toward_investigator_as_perceived: (investigatorShortName: string, personVisibleName: string) =>
      `Cómo parece ver ${personVisibleName} a ${investigatorShortName}`,
  },
  asPerceivedTag: 'Según lo percibido',
  ownRegardTag: 'Apreciación propia',
  tendencyLabels: {
    strengthens: 'se afianza',
    cools: 'se enfría',
    unchanged: 'sin cambio',
  },
  qualitativeBandLabels: {
    barely_known: 'Apenas se conocen',
    acquainted: 'Trato incipiente',
    trusted: 'Confianza ganada',
    close_ally: 'Lealtad estrecha',
    unconditional: 'Vínculo incondicional',
  },
  qualitativeBandPostureTexts: {
    from_investigator: {
      barely_known: 'Todavía es alguien ajeno.',
      acquainted: 'Hay un trato que recién empieza.',
      trusted: 'Hay confianza puesta en esta persona.',
      close_ally: 'Es alguien con quien se cuenta.',
      unconditional: 'Se respondería por esta persona sin preguntar.',
    },
    toward_investigator_as_perceived: {
      barely_known: 'Mantiene la distancia y mide cada palabra.',
      acquainted: 'Acepta el trato, sin bajar la guardia.',
      trusted: 'Habla con confianza y sostiene la mirada.',
      close_ally: 'Se pone de este lado sin que nadie se lo pida.',
      unconditional: 'Respondería sin preguntar por qué.',
    },
  },
  standingFigureDescriptions: {
    barely_known: 'Las dos figuras, lejos una de otra.',
    acquainted: 'Las dos figuras, a unos pasos de distancia.',
    trusted: 'Las dos figuras, a distancia de conversación.',
    close_ally: 'Las dos figuras, una junto a la otra.',
    unconditional: 'Las dos figuras, hombro con hombro.',
  },
  dimensionLabels: {
    kinship: 'Parentesco',
    employment: 'Empleo',
    debt: 'Deuda',
    affection: 'Afecto',
  },
  activeDimensionHeading: 'Lo que los une',
  unknownNameTag: 'Sin nombre conocido',
  consultedPersonTag: 'Persona consultada',
  noSignalsYetNotice: 'Sin señales todavía.',
  latestCausesHeading: 'Últimas señales',
  causeDirectionShortLabels: {
    from_investigator: 'De ida',
    toward_investigator_as_perceived: 'De vuelta, según lo percibido',
  },
  openPersonDetailLabel: (personVisibleName: string) => `Ver a ${personVisibleName} entre las personas presentes`,
  pulseAccessibleSummary: (
    directionText: string,
    tendencyText: string,
    qualitativeBandText: string,
    perceptibleCauseText: string,
  ) => `${directionText}: ${tendencyText}. ${qualitativeBandText}. ${perceptibleCauseText}`,
  summaryLineChangedWithOnePerson: (personVisibleName: string) => `El trato cambia con ${personVisibleName}`,
  summaryLineUnchangedWithOnePerson: (personVisibleName: string) => `El trato se sostiene con ${personVisibleName}`,
  summaryLineChangedWithSeveralPersons: (personCount: number) => `El trato cambia con ${personCount} personas`,
  summaryLineUnchangedWithSeveralPersons: (personCount: number) => `El trato se sostiene con ${personCount} personas`,
  unfoldRelationshipDetailLabel: 'Detalle',
  foldRelationshipDetailLabel: 'Plegar',
  relationshipDetailListLabel: 'Detalle del trato, persona por persona',
  fullRecordFooter: 'Ver el expediente completo en Organizaciones y aliados',
}

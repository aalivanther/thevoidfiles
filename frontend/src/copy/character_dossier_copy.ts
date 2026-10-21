import type { InvestigatorAttributeName, OicnauStance } from '../game_state/chronicle_state'

const spanishMonthNames = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

export const characterDossierCopy = {
  screenTitle: 'Ficha',
  presentationCard: {
    chapterLabel: 'Expediente personal',
    chapterTitle: 'La ficha',
    detailLine: 'Identidad · Atributos · Pertenencias · Fondos · Estado',
  },
  folder: {
    recordNumberLabel: 'Expediente n.º',
    unnamedInvestigator: 'Sin nombre registrado',
    readOnlyNotice:
      'Documento de consulta. Desde esta carpeta solo se reordena lo que se lleva encima; nada más se modifica aquí.',
    insideArchiveNotice: (archiveTitle: string, placeName: string, worldClock: string) =>
      `Archivo abierto: «${archiveTitle}». ${placeName}, ${worldClock}.`,
    outsideArchiveNotice: 'Ningún Archivo abierto. La carpeta muestra solo lo que persiste entre casos.',
    tabListLabel: 'Hojas del expediente',
    sheetNumbering: (sheetNumber: number, sheetCount: number) => `Hoja ${sheetNumber} de ${sheetCount}`,
    completeTypingHint: 'Tocar la hoja completa el mecanografiado',
    confidentialStamp: 'Reservado',
  },
  sheetNames: {
    identity: 'Identidad',
    attributes: 'Atributos',
    belongings: 'Pertenencias',
    funds: 'Fondos',
    condition: 'Estado',
  },
  identity: {
    sheetTitle: 'Datos de identidad',
    missingRegistrationTitle: 'Hoja en blanco',
    missingRegistrationText:
      'Todavía no existe un registro de identidad en esta Crónica. La hoja se llena cuando la persona pasa por la mesa de admisión.',
    fullNameLabel: 'Nombre completo',
    genderLabel: 'Género registrado',
    birthDateLabel: 'Fecha de nacimiento',
    ageLabel: 'Edad',
    originLabel: 'Origen',
    residenceLabel: 'Residencia',
    formatBirthDate: (day: number, month: number, year: number) => `${day} de ${spanishMonthNames[month - 1]} de ${year}`,
    formatAge: (ageInYears: number) => `${ageInYears} años`,
    photographCaption: 'Fotografía pendiente',
    milestoneLabel: 'Hito de progresión',
    milestoneLevelRange: (firstLevel: number, lastLevel: number) => `Niveles ${firstLevel} a ${lastLevel}`,
    milestoneCurrentLevel: (level: number) => `Nivel actual: ${level}`,
    milestoneLadderLabel: 'Escalafón completo',
    milestoneReachedMark: 'Hito actual',
    milestoneNames: {
      investigator: 'Investigador',
      elite_agent: 'Agente de Élite',
      great_board_player: 'Jugador en el Gran Tablero',
      sovereign_power: 'Poder Soberano',
    },
    milestoneStartingCondition: 'Comienza como persona mortal y mundana.',
    anchorSectionTitle: 'Ancla Relacional',
    anchorPersonLabel: 'Persona',
    anchorBondLabel: 'Vínculo',
    anchorBlessingTitle: 'Bendición',
    anchorBlessingText:
      'Una vez por sesión, un recuerdo significativo del Ancla concede ventaja en la siguiente prueba de IM contra miedo, desesperación o manipulación.',
    anchorCurseTitle: 'Maldición',
    anchorCurseText:
      'Un fallo crítico mental puede producir una Alucinación de Vínculo Roto y Desorientación durante el turno siguiente.',
    anchorIsPersonReminder: 'El Ancla es una persona con un vínculo concreto, nunca un lugar.',
    uprootedStamp: 'Desarraigado',
    uprootedTitle: 'Sin Ancla Relacional',
    uprootedText:
      'Nadie figura como Ancla. No recibe la Bendición y es inmune a la Maldición del vínculo roto. Conserva el resto de sus vulnerabilidades.',
    uprootedBlessingStatus: 'Bendición: no aplica',
    uprootedCurseStatus: 'Maldición del vínculo roto: inmune',
  },
  attributes: {
    sheetTitle: 'Perfil de atributos',
    missingEvaluationTitle: 'Observación pendiente',
    missingEvaluationText:
      'Los atributos se anotan cuando termina la Observación. Hasta entonces esta hoja no tiene nada que medir.',
    luckAttribute: { abbreviation: 'S', name: 'Suerte' },
    profileChartTitle: 'Perfil trazado',
    profileChartDescription: (attributeSummaries: string[]) =>
      `Perfil de los siete atributos. ${attributeSummaries.join('. ')}.`,
    attributeSummary: (attributeName: string, attributeValue: number) => `${attributeName}: ${attributeValue}`,
    initialRangeLegend: 'Tramo inicial, de 1 a 10',
    fullScaleLegend: 'Escala completa hasta 50',
    scaleMaximumLabel: 'Máximo 50',
    currentValueLabel: 'Valor actual',
    improvementCount: (improvementCount: number) =>
      improvementCount === 0
        ? 'Sin mejoras todavía'
        : improvementCount === 1
          ? '1 mejora acumulada'
          : `${improvementCount} mejoras acumuladas`,
    initialTotalLabel: 'Suma de atributos',
    initialTotalRule: 'Al empezar, la suma no supera 30 y la Suerte vale exactamente 2.',
    selectAttributeHint: 'Elegir un atributo lo resalta en el perfil.',
    sceneEffortLine: (remainingCount: number, maximumCount: number) =>
      `Esfuerzo en la escena: ${remainingCount} de ${maximumCount}. No es una tirada. Se gasta al forzar, descifrar o intentar un mecanismo, y vuelve al cambiar de lugar.`,
    attributePurposes: {
      im: 'Resistencia psíquica y capacidad de procesar lo imposible sin quebrarse.',
      if: 'Resistencia y capacidad física. No equivale por sí sola a una reserva de vida.',
      c: 'Conocimiento y profundidad de comprensión de lo que se estudia.',
      o: 'Detalle perceptivo y detección de señales que otros pasan por alto.',
      co: 'Interrogar, negociar, mentir, intimidar y consolar.',
      m: 'Sensibilidad y capacidades arcanas, acordes a la evolución del personaje.',
      s: 'Coincidencias favorables y azar. Rara vez se ofrece como mejora.',
    } satisfies Record<InvestigatorAttributeName, string>,
    progressionTitle: 'Progresión',
    levelLabel: 'Nivel',
    maximumLevelNote: 'de 99',
    unspentExperienceLabel: 'Experiencia disponible',
    lifetimeExperienceLabel: 'Experiencia histórica',
    requiredExperienceLabel: 'Necesaria para el siguiente nivel',
    requiredExperienceFormula: '(Nivel + 10 + Casos Resueltos) × 2',
    requiredExperienceCalculation: (level: number, resolvedArchiveCount: number, requiredExperience: number) =>
      `(${level} + 10 + ${resolvedArchiveCount}) × 2 = ${requiredExperience}`,
    experienceProgressDescription: (unspentExperience: number, requiredExperience: number) =>
      `${unspentExperience} de ${requiredExperience} puntos de experiencia para el siguiente nivel`,
    remainingExperience: (remainingExperience: number) =>
      remainingExperience <= 0 ? 'Ascenso al alcance' : `Faltan ${remainingExperience}`,
    resolvedArchivesLabel: 'Archivos resueltos',
    resolvedArchivesTotal: 'de 99',
    ascentReminder: 'En cada Ascenso se eligen dos atributos para mejorar en un punto, con tope de 50.',
    skillsTitle: 'Habilidades',
    skillsEmptyTitle: 'Ninguna habilidad adquirida',
    skillsEmptyText:
      'Cada cinco niveles se ofrecen tres habilidades nacidas de la experiencia y se elige una. Son herramientas con límites, nunca una solución universal.',
    nextSkillOffer: (level: number) => `Próxima oferta: nivel ${level}`,
    skillSlotLabel: (level: number) => `Nivel ${level}`,
    skillSlotEmpty: 'Por elegir',
  },
  belongings: {
    sheetTitle: 'Relación de pertenencias',
    viewModeLabel: 'Forma de ver la relación',
    listViewLabel: 'Lista',
    cardsViewLabel: 'Tarjetas',
    boardLabel: 'Pertenencias del personaje, por sitio',
    carriedSectionTitle: 'Encima',
    carriedSectionNote:
      'Lo que viaja con el personaje. Lo que va a mano se alcanza al instante; lo de la mochila pide un momento.',
    storedSectionTitle: 'Guardado en casa',
    storedSectionNote:
      'No está disponible durante una misión: un equipo guardado en casa no sirve de nada dentro de una cueva. Se mueve desde la Casa.',
    outOfReachRejection: 'Lo guardado en casa se mueve desde la Casa, con el personaje presente.',
    carriedStatus: 'Encima',
    storedStatus: 'Guardado',
    exhaustedStatus: 'Agotado',
    quantityLabel: 'Cantidad',
    formatUnitDescription: (quantity: number, pluralUnitDescription: string) =>
      quantity !== 1
        ? pluralUnitDescription
        : pluralUnitDescription.endsWith('des')
          ? pluralUnitDescription.slice(0, -2)
          : pluralUnitDescription.endsWith('s')
            ? pluralUnitDescription.slice(0, -1)
            : pluralUnitDescription,
    nameColumnLabel: 'Objeto',
    statusColumnLabel: 'Dónde está',
    openDetailLabel: (belongingName: string) => `Abrir la ficha de ${belongingName}`,
    openDetailAction: 'Ver ficha',
    consumedNote: (previousQuantity: number, consumedQuantity: number, currentQuantity: number) =>
      `Antes ${previousQuantity} · Consumido ${consumedQuantity} · Ahora ${currentQuantity}`,
    detail: {
      sheetLabel: 'Ficha de objeto',
      closeLabel: 'Cerrar la ficha',
      kindLabel: 'Tipo',
      descriptionLabel: 'Descripción',
      quantityLabel: 'Cantidad',
      locationLabel: 'Ubicación',
      stateLabel: 'Estado',
      knownUsesLabel: 'Usos conocidos',
      limitsLabel: 'Límites',
      provenanceLabel: 'Procedencia',
      referenceValueLabel: 'Valor de referencia',
      referenceValueNote:
        'Es una orientación general. No es una tasación ni un precio ofertado: eso lo fija quien compra o vende, en su lugar y momento.',
      offersLabel: 'Ofertas recibidas',
      offersEmpty: 'Nadie ha hecho una oferta concreta por este objeto.',
      consumptionLabel: 'Consumo en este Archivo',
      consumptionNone: 'Sin consumo confirmado.',
      unlistedUsesNote:
        'Un uso que no figure aquí se adjudica a partir de las propiedades del objeto. Un uso ingenioso no le concede capacidades nuevas.',
    },
    locationTexts: {
      at_hand: 'A mano, disponible al instante',
      in_bag: 'En la mochila, disponible',
      home_shelf: 'En casa, en los estantes. Fuera de alcance durante la misión',
      home_trunk: 'En casa, dentro del baúl. Fuera de alcance durante la misión',
    },
  },
  belongingsBoard: {
    containerNames: {
      at_hand: 'A mano',
      in_bag: 'Mochila',
      home_shelf: 'Estantes',
      home_trunk: 'Baúl',
    },
    containerNotes: {
      at_hand: 'Bolsillos, cinturón y manos. Se alcanza sin abrir nada.',
      in_bag: 'Va a la espalda. Se llena por volumen, no por piezas.',
      home_shelf: 'A la vista y en orden. Cada pieza ocupa un sitio.',
      home_trunk: 'Para lo que abulta. Se llena por volumen, no por piezas.',
    },
    emptyContainerTexts: {
      at_hand: 'Nada a mano.',
      in_bag: 'La mochila está vacía.',
      home_shelf: 'Los estantes están vacíos.',
      home_trunk: 'El baúl está vacío.',
    },
    fullContainerRejections: {
      at_hand: (belongingName: string) => `No queda dónde llevar ${belongingName} a mano: todos los sitios están ocupados.`,
      in_bag: (belongingName: string) => `${belongingName} no cabe en la mochila: habría que sacar algo antes.`,
      home_shelf: (belongingName: string) => `No queda sitio en los estantes para ${belongingName}.`,
      home_trunk: (belongingName: string) => `${belongingName} no cabe en el baúl: habría que sacar algo antes.`,
    },
    piecesCapacityReadout: (occupiedAmount: number, capacity: number) => `${occupiedAmount} de ${capacity} sitios ocupados`,
    bulkCapacityReadout: (occupiedAmount: number, capacity: number) => `${occupiedAmount} de ${capacity} huecos ocupados`,
    reservedBulkNote: (reservedAmount: number) =>
      `${reservedAmount} huecos quedan apartados para el equipo de misión que entrega cada Archivo.`,
    loadStamps: {
      roomy: 'Con sitio',
      tight: 'Casi sin sitio',
      full: 'Sin sitio',
      overloaded: 'Sobrecarga',
    },
    freePlaceLabel: 'Sitio libre',
    lockedContainerTag: 'Solo consulta',
    bulkLabel: (bulk: number) => (bulk === 0 ? 'No ocupa sitio' : bulk === 1 ? 'Ocupa 1 hueco' : `Ocupa ${bulk} huecos`),
    quantityBadge: (quantity: number) => `×${quantity}`,
    missionEquipmentTag: 'Equipo de misión',
    personalBelongingTag: 'Propio',
    exhaustedTag: 'Agotado',
    wornTag: 'Con desgaste',
    pileLabel: (belongingName: string, quantityText: string, containerName: string) =>
      `${belongingName}. ${quantityText}. Está en: ${containerName}.`,
    draggableRoleDescription: 'objeto que se puede mover',
    keyboardInstructions:
      'Para mover este objeto con el teclado: barra espaciadora para levantarlo, flechas para pasar de un sitio a otro, barra espaciadora para soltarlo y Escape para cancelar. Con Intro se abre su ficha.',
    movingHint:
      'Se arrastra con el ratón, o manteniendo el dedo un instante. Con teclado: barra espaciadora, flechas y barra espaciadora. Tocar un objeto abre su ficha, que también permite moverlo.',
    dropHints: {
      fits: 'Cabe aquí',
      doesNotFit: 'No cabe',
      alreadyHere: 'Ya está aquí',
      outOfReach: 'Fuera de alcance',
    },
    rejectionStamps: {
      destination_full: 'No cabe',
      place_out_of_reach: 'Fuera de alcance',
      unknown_pile: 'No está',
    },
    unknownPileRejection: 'Ese objeto ya no está donde estaba.',
    announcements: {
      pickedUp: (belongingName: string, containerName: string) => `Se levanta ${belongingName}. Estaba en: ${containerName}.`,
      overContainer: (belongingName: string, containerName: string, dropHint: string) =>
        `${belongingName} sobre: ${containerName}. ${dropHint}.`,
      overNothing: (belongingName: string) => `${belongingName} no está sobre ningún sitio.`,
      moved: (belongingName: string, containerName: string) => `${belongingName} pasa a: ${containerName}.`,
      movedUnits: (unitCount: number, belongingName: string, containerName: string) =>
        unitCount === 1
          ? `Una unidad de ${belongingName} pasa a: ${containerName}.`
          : `${unitCount} unidades de ${belongingName} pasan a: ${containerName}.`,
      returned: (belongingName: string) => `${belongingName} vuelve a su sitio.`,
      cancelled: (belongingName: string) => `Movimiento cancelado. ${belongingName} vuelve a su sitio.`,
    },
    inspection: {
      occupiedSpaceLabel: 'Espacio que ocupa',
      originLabel: 'Pertenece a',
      moveSectionLabel: 'Mover',
      moveToButton: (containerName: string) => `Pasar a: ${containerName}`,
      unitCountLabel: 'Unidades que se mueven',
      decreaseUnitCountLabel: 'Mover una unidad menos',
      increaseUnitCountLabel: 'Mover una unidad más',
      unitCountReadout: (unitCount: number, totalUnits: number) => `${unitCount} de ${totalUnits}`,
      lockedMoveNote: 'Lo guardado en casa se mueve desde la Casa, con el personaje presente.',
    },
  },
  funds: {
    sheetTitle: 'Libro de fondos',
    separationNotice: 'Dos bolsillos distintos. Lo operativo nunca se mezcla con lo personal.',
    personalTitle: 'Fondos personales',
    personalNote: 'Persisten entre casos: premios, gastos propios, el Santuario, salarios y lo que exceda un presupuesto.',
    operationalTitle: 'Fondos operativos',
    operationalNote:
      'Se conceden por misión para viaje, alojamiento, equipo, sobornos e informadores. No se acumulan y el sobrante se devuelve al cierre.',
    operationalEmptyTitle: 'Sin asignación vigente',
    operationalEmptyText:
      'Los fondos operativos solo existen dentro de un Archivo con sanción. No se gasta lo que todavía no se ha concedido.',
    balanceLabel: 'Saldo',
    balanceDerivedNote: 'El saldo sale de sumar los movimientos. Nunca se corrige a mano.',
    ledgerTitle: 'Movimientos',
    ledgerConceptColumn: 'Concepto',
    ledgerAmountColumn: 'Importe',
    ledgerBalanceColumn: 'Saldo',
    ledgerMomentColumn: 'Momento',
    incomingMovement: 'Entrada',
    outgoingMovement: 'Salida',
    neutralMovement: 'Asiento sin importe',
    personalOpeningConcept: 'Ahorros propios al abrir la Crónica',
    personalOpeningMoment: 'Apertura',
    personalRewardConcept: (archiveOrdinal: number) => `Recompensa personal · Archivo ${archiveOrdinal} cerrado`,
    personalRewardMoment: 'Cierre',
    personalOtherConcept: 'Otros movimientos confirmados',
    personalHomePurchaseConcept: (upgradeName: string) => `Obra en casa · ${upgradeName}`,
    personalHomePurchaseMoment: 'Casa',
    personalOtherMoment: 'Registro',
    operationalOpeningConceptByStance: {
      sanctioned_operative: 'Asignación de la OICNAU · sanción completa',
      independent_ally: 'Asignación de la OICNAU · colaboración independiente',
      refused_offer: 'Sin sanción de la OICNAU · asignación nula',
    } satisfies Record<OicnauStance, string>,
    operationalOpeningMoment: (worldClock: string) => `Apertura · ${worldClock}`,
    operationalBoatmanConcept: 'Pago al lanchero para que espere hasta el amanecer',
    operationalOtherConcept: 'Gastos de misión confirmados',
    operationalTurnMoment: (turnNumber: number) => `Turno ${turnNumber}`,
    operationalUnknownMoment: 'En misión',
    operationalReturnReminder: (remainingAmount: string) =>
      `Al cierre del Archivo se devuelven ${remainingAmount}. No pasan a los fondos personales.`,
    refusedOfferNotice:
      'La oferta fue rechazada: este Archivo se trabaja sin presupuesto ajeno. Todo gasto tendría que salir del bolsillo personal, con confirmación previa.',
    debtsTitle: 'Deudas y reclamaciones',
    debtsEmptyTitle: 'Nada pendiente',
    debtsEmptyText: 'Ninguna deuda registrada. Una deuda solo existe con fuente, límite y aceptación expresa.',
  },
  condition: {
    sheetTitle: 'Estado físico',
    seriousWoundsTitle: 'Heridas Graves',
    seriousWoundsCount: (sufferedCount: number) => `${sufferedCount} de 5`,
    seriousWoundsDescription: (sufferedCount: number) =>
      sufferedCount === 0
        ? 'Ninguna Herida Grave registrada de cinco posibles.'
        : `${sufferedCount} de cinco Heridas Graves registradas.`,
    woundOrdinals: ['Primera', 'Segunda', 'Tercera', 'Cuarta', 'Quinta'],
    woundSufferedStatus: 'Registrada',
    woundAbsentStatus: 'Sin registrar',
    fifthWoundWarning: 'Muerte definitiva',
    irreversibleNotice:
      'Cinco Heridas Graves causan la muerte y la Crónica se cierra. Un rasguño no cuenta. Cambiar de caso no cura ninguna.',
    outsideArchiveNotice: 'Sin Archivo abierto no hay parte médico en curso. Se muestra lo último que consta.',
    noWoundsStamp: 'Sin heridas',
    woundedStamp: 'Con heridas',
    criticalStamp: 'Al límite',
    deceasedStamp: 'Crónica cerrada',
    attributesAreNotLifeNotice: 'IF e IM son atributos. Ninguno de los dos funciona como reserva de vida que se gasta.',
    conditionsTitle: 'Condiciones',
    conditionsEmptyTitle: 'Ninguna condición activa',
    conditionsEmptyText:
      'Cuando exista una, aquí constará su origen, su efecto, su duración o salida y su tratamiento.',
    conditionFieldLabels: ['Origen', 'Efecto', 'Duración o salida', 'Tratamiento'],
    conditionFieldEmpty: 'Sin anotar',
  },
} as const

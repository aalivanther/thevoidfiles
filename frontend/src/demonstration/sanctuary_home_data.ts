export type SanctuaryRoomIdentifier = 'desk' | 'archive' | 'workshop' | 'bedroom' | 'storage'

export type SanctuaryExposureLevel = 'none' | 'slight' | 'noticeable'

export type SanctuaryRoomDefinition = {
  identifier: SanctuaryRoomIdentifier
  visibleName: string
  initialStateDescription: string
}

export type SanctuaryUpgradeDefinition = {
  identifier: string
  roomIdentifier: SanctuaryRoomIdentifier
  visibleName: string
  visibleDescription: string
  personalFundsCost: number
  downtimeDays: number
  monthlyMaintenanceCost: number
  enabledCapabilityDescription: string
  exposureLevel: SanctuaryExposureLevel
  exposureSignalWhenInstalled: string | null
  installedRoomDescription: string
}

export type StoredBelongingDefinition = {
  identifier: string
  visibleName: string
  units: number
  visibleUnitDescription: string
  conditionDescription: string
  isInGoodCondition: boolean
  storagePlaceDescription: string
  bulk: number
  isConsumable: boolean
  initialPlacement: HomeBelongingPlacement
  visibleKind: string
  visibleDescription: string
  knownUses: string[]
  limits: string[]
  visibleProvenance: string
  referenceValue: number
}

export type CarriedBelongingPlacement = 'at_hand' | 'in_bag'

export type HomeBelongingPlacement = 'home_shelf' | 'home_trunk'

export type BelongingPlacement = CarriedBelongingPlacement | HomeBelongingPlacement

export const belongingPlacements: readonly BelongingPlacement[] = ['at_hand', 'in_bag', 'home_shelf', 'home_trunk']

export type BelongingContainerDefinition = {
  placement: BelongingPlacement
  capacityMeasure: 'pieces' | 'bulk'
  capacity: number
}

export const sanctuaryRoomDefinitions: SanctuaryRoomDefinition[] = [
  {
    identifier: 'desk',
    visibleName: 'Escritorio',
    initialStateDescription: 'Una mesa heredada, una lámpara de brazo y una máquina de escribir con la tecla de la eñe floja.',
  },
  {
    identifier: 'archive',
    visibleName: 'Archivo',
    initialStateDescription: 'Dos cajas de cartón con recortes y carpetas sin etiquetar, apiladas junto a la pared.',
  },
  {
    identifier: 'workshop',
    visibleName: 'Taller',
    initialStateDescription: 'La mesa de la cocina hace de taller cuando no hay platos encima.',
  },
  {
    identifier: 'bedroom',
    visibleName: 'Dormitorio',
    initialStateDescription: 'Una cama estrecha, una persiana que no cierra del todo y el ruido de la calle.',
  },
  {
    identifier: 'storage',
    visibleName: 'Almacén',
    initialStateDescription: 'Un trastero bajo la escalera, con un candado que cualquiera abriría con paciencia.',
  },
]

export const sanctuaryUpgradeDefinitions: SanctuaryUpgradeDefinition[] = [
  {
    identifier: 'cork_board_wall',
    roomIdentifier: 'desk',
    visibleName: 'Pared de corcho',
    visibleDescription: 'Un panel de corcho de pared a pared, chinchetas e hilo rojo para tener el caso entero a la vista.',
    personalFundsCost: 45,
    downtimeDays: 1,
    monthlyMaintenanceCost: 0,
    enabledCapabilityDescription: 'Permite dejar montadas las conexiones de un caso entre una visita y la siguiente.',
    exposureLevel: 'none',
    exposureSignalWhenInstalled: null,
    installedRoomDescription: 'Sobre la mesa, una pared de corcho espera recortes, fotos e hilo rojo.',
  },
  {
    identifier: 'locking_filing_cabinet',
    roomIdentifier: 'archive',
    visibleName: 'Archivador con cerradura',
    visibleDescription: 'Un archivador metálico de cuatro cajones, de segunda mano, con llave propia.',
    personalFundsCost: 90,
    downtimeDays: 1,
    monthlyMaintenanceCost: 0,
    enabledCapabilityDescription: 'Los documentos de casos cerrados quedan ordenados y bajo llave frente a una visita curiosa.',
    exposureLevel: 'none',
    exposureSignalWhenInstalled: null,
    installedRoomDescription: 'Un archivador metálico con llave sustituye a las cajas de cartón.',
  },
  {
    identifier: 'reinforced_door_lock',
    roomIdentifier: 'bedroom',
    visibleName: 'Cerradura reforzada',
    visibleDescription: 'Cerrojo de seguridad, mirilla y una cadena que sí aguanta un empujón.',
    personalFundsCost: 120,
    downtimeDays: 1,
    monthlyMaintenanceCost: 0,
    enabledCapabilityDescription: 'Entrar a la fuerza deja de ser cosa de un minuto y de hacerse en silencio.',
    exposureLevel: 'none',
    exposureSignalWhenInstalled: null,
    installedRoomDescription: 'La puerta tiene cerrojo nuevo y la persiana, por fin, cierra.',
  },
  {
    identifier: 'work_bench',
    roomIdentifier: 'workshop',
    visibleName: 'Banco de trabajo',
    visibleDescription: 'Un banco macizo con tornillo de mesa, soldador, lupa con luz y herramienta de mano.',
    personalFundsCost: 140,
    downtimeDays: 2,
    monthlyMaintenanceCost: 5,
    enabledCapabilityDescription: 'Reparar y adaptar equipo en casa, siempre que haya piezas, recursos y tiempo.',
    exposureLevel: 'slight',
    exposureSignalWhenInstalled: 'Alguien del edificio comentó los golpes y el olor a estaño a deshoras.',
    installedRoomDescription: 'Un banco de trabajo con tornillo de mesa ocupa el rincón de la cocina.',
  },
  {
    identifier: 'photographic_darkroom',
    roomIdentifier: 'workshop',
    visibleName: 'Cuarto oscuro de revelado',
    visibleDescription: 'El baño pequeño, sellado a la luz, con ampliadora, cubetas y una bombilla roja.',
    personalFundsCost: 260,
    downtimeDays: 4,
    monthlyMaintenanceCost: 15,
    enabledCapabilityDescription: 'Revelar y ampliar película propia sin que un laboratorio vea los negativos.',
    exposureLevel: 'slight',
    exposureSignalWhenInstalled: 'La droguería de la esquina ya conoce de memoria el pedido mensual de químicos.',
    installedRoomDescription: 'Tras la puerta del baño pequeño asoma la luz roja del cuarto oscuro.',
  },
  {
    identifier: 'secure_telephone_line',
    roomIdentifier: 'desk',
    visibleName: 'Línea telefónica segura',
    visibleDescription: 'Una segunda línea a nombre de otra persona, con un aparato que avisa si alguien escucha.',
    personalFundsCost: 310,
    downtimeDays: 6,
    monthlyMaintenanceCost: 25,
    enabledCapabilityDescription: 'Hablar con contactos desde casa sin que la llamada lleve al nombre del Investigador.',
    exposureLevel: 'noticeable',
    exposureSignalWhenInstalled: 'Una técnica de la compañía telefónica anotó algo al ver el cableado del rellano.',
    installedRoomDescription: 'Un segundo teléfono negro, sin número en el disco, descansa junto a la lámpara.',
  },
  {
    identifier: 'floor_safe',
    roomIdentifier: 'storage',
    visibleName: 'Caja fuerte empotrada',
    visibleDescription: 'Una caja fuerte de combinación, anclada al suelo del trastero bajo una tabla suelta.',
    personalFundsCost: 380,
    downtimeDays: 3,
    monthlyMaintenanceCost: 0,
    enabledCapabilityDescription: 'Guardar piezas únicas o comprometedoras donde un registro rápido no las encuentra.',
    exposureLevel: 'slight',
    exposureSignalWhenInstalled: 'Los operarios que subieron la caja por la escalera no fueron discretos.',
    installedRoomDescription: 'Bajo una tabla suelta del trastero duerme una caja fuerte de combinación.',
  },
]

export const baselineExposureSignal = 'Nadie mira dos veces este edificio. Las cortinas del resto de la cuadra siguen quietas.'

export const storedBelongingDefinitions: StoredBelongingDefinition[] = [
  {
    identifier: 'reflex_camera',
    visibleName: 'Cámara réflex de 35 mm',
    units: 1,
    visibleUnitDescription: 'unidad',
    conditionDescription: 'Buen estado, obturador recién engrasado',
    isInGoodCondition: true,
    storagePlaceDescription: 'Cajón del escritorio',
    bulk: 2,
    isConsumable: false,
    initialPlacement: 'home_shelf',
    visibleKind: 'Equipo de registro',
    visibleDescription: 'Cámara mecánica con objetivo de 50 mm y estuche de cuero con correa.',
    knownUses: ['Fotografiar escenas y documentos', 'Obtener negativos difíciles de alterar'],
    limits: ['Sin película no registra nada', 'Sin flash apenas sirve de noche'],
    visibleProvenance: 'Herencia familiar. Nunca se declaró como equipo de misión.',
    referenceValue: 240,
  },
  {
    identifier: 'film_rolls',
    visibleName: 'Rollos de película',
    units: 3,
    visibleUnitDescription: 'rollos',
    conditionDescription: 'Sin exponer ni abrir, caducan el año próximo',
    isInGoodCondition: true,
    storagePlaceDescription: 'Cajón del escritorio',
    bulk: 1,
    isConsumable: true,
    initialPlacement: 'home_shelf',
    visibleKind: 'Consumible de registro',
    visibleDescription: 'Rollos de 35 mm de sensibilidad media, de treinta y seis exposiciones cada uno.',
    knownUses: ['Cargar la cámara réflex', 'Entregar un negativo como prueba material'],
    limits: ['Cada rollo se expone una sola vez', 'Revelarlos cuesta tiempo y dinero', 'La luz directa los arruina'],
    visibleProvenance: 'Comprados por caja en una tienda de fotografía del centro.',
    referenceValue: 9,
  },
  {
    identifier: 'cassette_recorder',
    visibleName: 'Grabadora de casete',
    units: 1,
    visibleUnitDescription: 'unidad',
    conditionDescription: 'Funciona, pero el cabezal arrastra un zumbido',
    isInGoodCondition: false,
    storagePlaceDescription: 'Estante del archivo',
    bulk: 2,
    isConsumable: false,
    initialPlacement: 'home_shelf',
    visibleKind: 'Equipo de registro',
    visibleDescription: 'Grabadora portátil de periodista, con micrófono incorporado y una cinta a medio usar.',
    knownUses: ['Grabar un testimonio', 'Reproducir una cinta ajena'],
    limits: ['El zumbido del cabezal ensucia lo grabado', 'Depende de pilas', 'Una grabación auténtica puede contener una mentira'],
    visibleProvenance: 'Comprada de segunda mano a un reportero que dejaba el oficio.',
    referenceValue: 60,
  },
  {
    identifier: 'climbing_rope',
    visibleName: 'Cuerda de escalada',
    units: 20,
    visibleUnitDescription: 'metros',
    conditionDescription: 'Buen estado, sin roces',
    isInGoodCondition: true,
    storagePlaceDescription: 'Trastero',
    bulk: 3,
    isConsumable: false,
    initialPlacement: 'home_trunk',
    visibleKind: 'Equipo de acceso',
    visibleDescription: 'Cuerda dinámica de diez milímetros, enrollada y atada con su propia punta.',
    knownUses: ['Asegurar un descenso', 'Atar o remolcar', 'Marcar un camino de vuelta'],
    limits: ['Sin anclaje firme no sostiene a nadie', 'Un filo la corta', 'Cortarla la acorta para siempre'],
    visibleProvenance: 'Quedó de una temporada de montaña, hace años.',
    referenceValue: 85,
  },
  {
    identifier: 'household_first_aid_kit',
    visibleName: 'Botiquín doméstico',
    units: 1,
    visibleUnitDescription: 'unidad',
    conditionDescription: 'Incompleto: faltan vendas y el alcohol está por la mitad',
    isInGoodCondition: false,
    storagePlaceDescription: 'Armario del dormitorio',
    bulk: 2,
    isConsumable: false,
    initialPlacement: 'home_shelf',
    visibleKind: 'Material sanitario',
    visibleDescription: 'Caja de lata con antiséptico, esparadrapo, tijeras y analgésicos corrientes.',
    knownUses: ['Limpiar y cubrir cortes y raspones', 'Aliviar un dolor leve'],
    limits: ['No trata una Herida Grave', 'Lo que se gasta hay que reponerlo'],
    visibleProvenance: 'Comprado en una farmacia de barrio.',
    referenceValue: 28,
  },
  {
    identifier: 'shortwave_radio',
    visibleName: 'Radio de onda corta',
    units: 1,
    visibleUnitDescription: 'unidad',
    conditionDescription: 'Sintoniza, aunque pierde la señal con la lluvia',
    isInGoodCondition: false,
    storagePlaceDescription: 'Mesa de la cocina',
    bulk: 3,
    isConsumable: false,
    initialPlacement: 'home_shelf',
    visibleKind: 'Equipo de escucha',
    visibleDescription: 'Receptor de sobremesa con antena telescópica y dial anotado a lápiz.',
    knownUses: ['Escuchar emisiones lejanas', 'Seguir partes meteorológicos y marítimos'],
    limits: ['Solo recibe, no transmite', 'Necesita corriente o pilas grandes', 'La lluvia le roba la señal'],
    visibleProvenance: 'Rescatada de un mercadillo y reparada a ratos.',
    referenceValue: 110,
  },
  {
    identifier: 'waterproof_coat',
    visibleName: 'Abrigo impermeable',
    units: 1,
    visibleUnitDescription: 'unidad',
    conditionDescription: 'Buen estado, un botón cosido con otro hilo',
    isInGoodCondition: true,
    storagePlaceDescription: 'Perchero de la entrada',
    bulk: 2,
    isConsumable: false,
    initialPlacement: 'home_trunk',
    visibleKind: 'Ropa de abrigo',
    visibleDescription: 'Abrigo largo de lona encerada, con capucha y bolsillos interiores hondos.',
    knownUses: ['Aguantar lluvia y viento', 'Llevar papeles secos en los bolsillos interiores'],
    limits: ['Pesa cuando se empapa', 'No protege de nada que no sea el clima'],
    visibleProvenance: 'Comprado en una tienda de efectos navales.',
    referenceValue: 70,
  },
  {
    identifier: 'hand_tool_box',
    visibleName: 'Caja de herramientas',
    units: 1,
    visibleUnitDescription: 'caja',
    conditionDescription: 'Completa salvo la llave del diez',
    isInGoodCondition: true,
    storagePlaceDescription: 'Trastero',
    bulk: 3,
    isConsumable: false,
    initialPlacement: 'home_trunk',
    visibleKind: 'Herramientas',
    visibleDescription: 'Caja metálica con destornilladores, alicates, martillo, sierra corta y cinta aislante.',
    knownUses: ['Desmontar, forzar o reparar lo corriente', 'Improvisar un arreglo de urgencia'],
    limits: ['Hace ruido y pesa', 'No sustituye a una herramienta especializada'],
    visibleProvenance: 'Reunida pieza a pieza con los años.',
    referenceValue: 95,
  },
]

export const belongingContainerDefinitions: Record<BelongingPlacement, BelongingContainerDefinition> = {
  at_hand: { placement: 'at_hand', capacityMeasure: 'pieces', capacity: 4 },
  in_bag: { placement: 'in_bag', capacityMeasure: 'bulk', capacity: 10 },
  home_shelf: { placement: 'home_shelf', capacityMeasure: 'pieces', capacity: 6 },
  home_trunk: { placement: 'home_trunk', capacityMeasure: 'bulk', capacity: 12 },
}

export const demonstrationConstructionMillisecondsPerDowntimeDay = 4000

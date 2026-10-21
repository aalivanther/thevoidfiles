import type { BelongingIdentifier } from './demonstration_case_script'

export type BelongingRecordDetail = {
  visibleKind: string
  visibleDescription: string
  visibleState: string
  knownUses: string[]
  limits: string[]
  visibleProvenance: string
  referenceValue: number
}

export const carriedBelongingDetails: Record<BelongingIdentifier, BelongingRecordDetail> = {
  signal_flare: {
    visibleKind: 'Consumible de señalización',
    visibleDescription: 'Bengalas náuticas de mano, de luz roja, con tapa de fricción. Arden alrededor de un minuto.',
    visibleState: 'Selladas, dentro de fecha',
    knownUses: ['Señalar una posición de noche', 'Iluminar un espacio durante un momento', 'Prender algo que arda con facilidad'],
    limits: [
      'Cada bengala sirve una sola vez',
      'Delata la posición de quien la enciende',
      'No se apaga a voluntad y quema si se sujeta mal',
    ],
    visibleProvenance: 'Compradas en una tienda náutica antes de embarcar, con recibo a nombre propio.',
    referenceValue: 18,
  },
  hand_lantern: {
    visibleKind: 'Herramienta de iluminación',
    visibleDescription: 'Linterna de mano de carcasa metálica, con foco regulable y correa.',
    visibleState: 'Pilas nuevas al salir. La carga no se mide en unidades de linterna.',
    knownUses: ['Alumbrar en interiores y pasos estrechos', 'Hacer señales de luz a distancia corta', 'Revisar marcas y superficies de cerca'],
    limits: [
      'Depende de sus pilas, y cambiarlas exige tener repuesto y tiempo',
      'No resiste una inmersión prolongada',
      'Ocupa una mano mientras se usa',
    ],
    visibleProvenance: 'Propia desde hace años. Ya venía en la mochila antes del primer Susurro.',
    referenceValue: 35,
  },
  sealed_evidence_bag: {
    visibleKind: 'Material de custodia',
    visibleDescription: 'Bolsas transparentes con cierre inviolable y franja para anotar fecha, lugar y firma.',
    visibleState: 'Sin usar',
    knownUses: ['Guardar una muestra sin contaminarla', 'Dejar constancia de quién recogió qué y cuándo', 'Proteger papel o tela de la humedad'],
    limits: [
      'Una vez sellada no se reabre sin dejar rastro',
      'No aísla de nada que no sea material',
      'Solo caben objetos pequeños',
    ],
    visibleProvenance: 'Incluidas en el dosier de la sanción. La OICNAU facilita el contacto del proveedor, no las regala.',
    referenceValue: 3,
  },
}

export const missionBelongingCarryingTraits: Record<BelongingIdentifier, { bulk: number; isConsumable: boolean }> = {
  signal_flare: { bulk: 1, isConsumable: true },
  hand_lantern: { bulk: 1, isConsumable: false },
  sealed_evidence_bag: { bulk: 1, isConsumable: true },
}

export const dossierRecordSerialPrefix = 'TVF'

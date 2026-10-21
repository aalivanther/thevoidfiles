import {
  formatAmount,
  operationalFundsByOicnauStance,
  personalizeNarrativeText,
} from '../game_state/chronicle_state'
import type { ConfirmedRelationshipChange } from '../game_state/archive_turn_contract'
import type { ArchiveRunState, ChronicleState, OicnauStance } from '../game_state/chronicle_state'

export type FactionIdentifier = 'oicnau' | 'the_court' | 'court_of_chaos'

export type PostureSignalKind = 'trust' | 'suspicion'

export type PostureSignal = {
  identifier: string
  kind: PostureSignalKind
  signalText: string
  causeText: string
}

export type DatedInteraction = {
  identifier: string
  fictionalDateLabel: string
  descriptionText: string
}

export type FactionKnowledgeDepth = 'witnessed_contact' | 'name_and_rumor' | 'no_contact'

export type KnownFaction = {
  identifier: FactionIdentifier
  factionName: string
  epithetName: string
  doctrineText: string
  knowledgeDepth: FactionKnowledgeDepth
  knowledgeParagraphs: string[]
  knowledgeSourceText: string
  postureSummaryText: string | null
  postureSignals: PostureSignal[]
  interactions: DatedInteraction[]
}

export type OicnauBondDefinition = {
  oicnauStance: OicnauStance
  bondName: string
  bondSummaryText: string
  operationalFundsPerArchive: number
  receivedTerms: string[]
  owedTerms: string[]
  exposureTerms: string[]
}

export type LighthouseExperience = {
  isRenataNameKnown: boolean
  hasSpokenWithRenata: boolean
  hasAskedRenataAboutBrother: boolean
  hasBrotherReturned: boolean
  hasEvacuatedRenata: boolean
  hasPaidBoatmanToWait: boolean
  hasHeardBoatmanMurmur: boolean
  hasArchiveBeenClosed: boolean
}

export type RelationshipDimensionName = 'kinship' | 'employment' | 'debt' | 'affection'

export type RelationshipChangeCause = {
  identifier: string
  fictionalDateLabel: string
  causeText: string
  levelChange: number
}

export type DirectedRelationship = {
  level: number
  changeCauses: RelationshipChangeCause[]
}

export type ContactSilhouetteName = 'close_figure' | 'seated_figure' | 'long_coat_figure' | 'capped_figure'

export type KnownContact = {
  identifier: string
  displayName: string
  isNameKnown: boolean
  roleText: string
  silhouetteName: ContactSilhouetteName
  firstSeenText: string
  knowledgeParagraphs: string[]
  affiliatedFactionIdentifier: FactionIdentifier | null
  relationshipFromInvestigator: DirectedRelationship
  relationshipTowardInvestigator: DirectedRelationship
  dimensionTexts: Record<RelationshipDimensionName, string | null>
}

export type RelationshipLinkKindName =
  | 'sanction'
  | 'alliance'
  | 'refusal'
  | 'surveillance'
  | 'support'
  | 'rumor'
  | 'employment'
  | 'hire'
  | 'anchor'
  | 'acquaintance'
  | 'debt'

export type RelationshipNetworkNodeKind = 'investigator' | 'faction' | 'contact'

export type RelationshipNetworkNode = {
  identifier: string
  kind: RelationshipNetworkNodeKind
  displayName: string
  captionText: string
  factionIdentifier: FactionIdentifier | null
}

export type RelationshipNetworkLink = {
  identifier: string
  originNodeIdentifier: string
  destinationNodeIdentifier: string
  kindName: RelationshipLinkKindName
  level: number | null
  isUnconfirmed: boolean
}

export type KnownRelationshipBoard = {
  factions: KnownFaction[]
  contacts: KnownContact[]
  networkNodes: RelationshipNetworkNode[]
  networkLinks: RelationshipNetworkLink[]
}

export const investigatorNetworkNodeIdentifier = 'investigator'
export const lieutenantMinimumRelationshipLevel = 12
export const lieutenantMaximumRelationshipLevel = 15
export const highestDrawnRelationshipLevel = 16

const fictionalDateLabels = {
  beforeChronicle: 'Antes de la Crónica',
  envelopeArrival: 'Día 4 · mañana',
  cafeteriaMeeting: 'Día 4 · 17:30',
  cafeteriaRumor: 'Día 4 · 17:50',
  bridgeGraffiti: 'Día 6 · noche',
  archiveOpening: 'Día 9 · 03:12',
  archiveNight: 'Día 9 · madrugada',
  archiveDawn: 'Día 9 · amanecer',
}

export const oicnauBondDefinitions: Record<OicnauStance, OicnauBondDefinition> = {
  sanctioned_operative: {
    oicnauStance: 'sanctioned_operative',
    bondName: 'Bajo sanción',
    bondSummaryText: '{{nombre}} firmó. Investiga con el respaldo de la OICNAU y responde ante ella.',
    operationalFundsPerArchive: operationalFundsByOicnauStance.sanctioned_operative,
    receivedTerms: [
      'Dosier completo y plazo en cada Archivo',
      `${formatAmount(operationalFundsByOicnauStance.sanctioned_operative)} de fondos operativos por Archivo`,
      'Contactos facilitados por la organización. El equipo no se regala',
    ],
    owedTerms: [
      'Informes obligatorios al cierre de cada Archivo',
      'Órdenes que no siempre podrán discutirse',
      'Devolver el sobrante de los fondos operativos al cierre',
    ],
    exposureTerms: ['La OICNAU sabe dónde está {{nombre}} y qué investiga'],
  },
  independent_ally: {
    oicnauStance: 'independent_ally',
    bondName: 'Alianza sin subordinación',
    bondSummaryText: '{{nombre}} trabaja con la OICNAU, no para ella. Nadie da órdenes. Nadie promete nada.',
    operationalFundsPerArchive: operationalFundsByOicnauStance.independent_ally,
    receivedTerms: [
      'Dosier parcial: lo que la OICNAU decida compartir',
      `${formatAmount(operationalFundsByOicnauStance.independent_ally)} de fondos operativos por Archivo`,
      'Un teléfono sin marca que suena cuando conviene a las dos partes',
    ],
    owedTerms: ['Compartir hallazgos cuando {{nombre}} lo considere justo', 'Ninguna orden que obedecer'],
    exposureTerms: ['Sin rescates garantizados', 'Vigilancia discreta mientras dure el acuerdo'],
  },
  refused_offer: {
    oicnauStance: 'refused_offer',
    bondName: 'Sin vínculo',
    bondSummaryText: '{{nombre}} dijo que no. Investiga por su cuenta y no le debe nada a nadie.',
    operationalFundsPerArchive: operationalFundsByOicnauStance.refused_offer,
    receivedTerms: ['Sin dosier, sin plazo y sin fondos operativos'],
    owedTerms: ['Nada. Libertad total para decidir qué hacer con lo que encuentre'],
    exposureTerms: ['La OICNAU anotó su nombre en otra lista', 'Otras facciones sabrán que dijo que no'],
  },
}

export const oicnauStanceDisplayOrder: readonly OicnauStance[] = [
  'sanctioned_operative',
  'independent_ally',
  'refused_offer',
]

const lighthouseOriginIdentifiers = {
  spokenWithRenata: 'speak_with_waiting_woman',
  askedAboutBrother: 'ask_renata_about_brother',
  evacuatedRenata: 'evacuate_renata_and_withdraw',
  paidBoatman: 'pay_boatman_to_wait',
  boatmanMurmurVariants: ['count_flashes_from_boat', 'listen_to_boatman_warning'],
}

const lighthouseBrotherFreedFlagName = 'brother_was_freed'

export function readLighthouseExperienceFromArchiveRun(archiveRun: ArchiveRunState): LighthouseExperience {
  const hasWitnessedOrigin = (originIdentifier: string) =>
    archiveRun.witnessedOrigins.some((witnessedOrigin) => witnessedOrigin.originIdentifier === originIdentifier)
  return {
    isRenataNameKnown: archiveRun.knownPersonIdentifiers.includes('renata_oquendo'),
    hasSpokenWithRenata: hasWitnessedOrigin(lighthouseOriginIdentifiers.spokenWithRenata),
    hasAskedRenataAboutBrother: hasWitnessedOrigin(lighthouseOriginIdentifiers.askedAboutBrother),
    hasBrotherReturned: archiveRun.livedExperienceFlagNames.includes(lighthouseBrotherFreedFlagName),
    hasEvacuatedRenata: hasWitnessedOrigin(lighthouseOriginIdentifiers.evacuatedRenata),
    hasPaidBoatmanToWait: hasWitnessedOrigin(lighthouseOriginIdentifiers.paidBoatman),
    hasHeardBoatmanMurmur: lighthouseOriginIdentifiers.boatmanMurmurVariants.some(hasWitnessedOrigin),
    hasArchiveBeenClosed: archiveRun.archiveOutcome?.kind === 'archive_ended_alive',
  }
}

export function resolveKnownLighthouseExperience(
  chronicleState: ChronicleState,
  rememberedLighthouseExperience: LighthouseExperience | null,
): LighthouseExperience | null {
  if (chronicleState.chosenWhisperIdentifier !== null && chronicleState.archiveRun.currentScenePresentation !== null) {
    return readLighthouseExperienceFromArchiveRun(chronicleState.archiveRun)
  }
  return rememberedLighthouseExperience
}

function buildConfirmedDirectedRelationship(
  confirmedRelationshipChanges: readonly ConfirmedRelationshipChange[],
  personIdentifier: string,
  directionName: ConfirmedRelationshipChange['directionName'],
): DirectedRelationship | null {
  const changesOfDirection = confirmedRelationshipChanges.filter(
    (relationshipChange) =>
      relationshipChange.personIdentifier === personIdentifier && relationshipChange.directionName === directionName,
  )
  const latestChange = changesOfDirection[changesOfDirection.length - 1]
  if (!latestChange) {
    return null
  }
  return {
    level: Math.max(1, latestChange.resultingLevel),
    changeCauses: changesOfDirection.map((relationshipChange) => ({
      identifier: relationshipChange.identifier,
      fictionalDateLabel: relationshipChange.levelChange === 0 ? fictionalDateLabels.archiveOpening : fictionalDateLabels.archiveNight,
      causeText: relationshipChange.perceptibleCauseText,
      levelChange: relationshipChange.levelChange,
    })),
  }
}

function buildOicnauInteractions(
  oicnauStance: OicnauStance,
  lighthouseExperience: LighthouseExperience | null,
): DatedInteraction[] {
  const interactions: DatedInteraction[] = [
    {
      identifier: 'envelope_under_the_door',
      fictionalDateLabel: fictionalDateLabels.envelopeArrival,
      descriptionText:
        'Alguien desliza un sobre bajo la puerta de {{nombre}}. Dentro, una tarjeta gris con seis letras, una dirección y una hora.',
    },
    {
      identifier: 'cafeteria_offer',
      fictionalDateLabel: fictionalDateLabels.cafeteriaMeeting,
      descriptionText:
        'Una mujer que no da su nombre ofrece expedientes, plazos y fondos a cambio de informes y obediencia. Aclara que también se puede decir que no, o proponer otra cosa.',
    },
  ]
  if (oicnauStance === 'sanctioned_operative') {
    interactions.push({
      identifier: 'stance_answer',
      fictionalDateLabel: fictionalDateLabels.cafeteriaMeeting,
      descriptionText: '{{nombre}} acepta la sanción. La mujer empuja una carpeta sobre la mesa.',
    })
  }
  if (oicnauStance === 'independent_ally') {
    interactions.push({
      identifier: 'stance_answer',
      fictionalDateLabel: fictionalDateLabels.cafeteriaMeeting,
      descriptionText:
        '{{nombre}} propone trabajar con la OICNAU y no para ella. La mujer guarda la carpeta y deja un teléfono sin marca.',
    })
  }
  if (oicnauStance === 'refused_offer') {
    interactions.push({
      identifier: 'stance_answer',
      fictionalDateLabel: fictionalDateLabels.cafeteriaMeeting,
      descriptionText:
        '{{nombre}} se niega. La mujer paga los dos cafés y se va sin despedirse. En la mesa del fondo alguien cierra un periódico.',
    })
  }
  if (lighthouseExperience) {
    interactions.push({
      identifier: 'lighthouse_archive_opening',
      fictionalDateLabel: fictionalDateLabels.archiveOpening,
      descriptionText:
        oicnauStance === 'sanctioned_operative'
          ? 'Archivo 01 abierto con sanción: dosier completo, plazo de tres noches y fondos operativos entregados.'
          : oicnauStance === 'independent_ally'
            ? 'Archivo 01 abierto con un dosier parcial y la mitad de los fondos. Nadie dio instrucciones.'
            : 'Archivo 01 abierto sin respaldo. Si la OICNAU lo sabe, no lo ha dicho.',
    })
    if (lighthouseExperience.hasArchiveBeenClosed && oicnauStance === 'sanctioned_operative') {
      interactions.push({
        identifier: 'lighthouse_closing_report',
        fictionalDateLabel: fictionalDateLabels.archiveDawn,
        descriptionText:
          '{{nombre}} redacta en la lancha el informe obligatorio de cierre y deja en blanco lo que todavía no sabe explicar.',
      })
    }
  }
  return interactions
}

function buildOicnauPostureSignals(
  oicnauStance: OicnauStance,
  lighthouseExperience: LighthouseExperience | null,
): PostureSignal[] {
  const postureSignals: PostureSignal[] = []
  if (oicnauStance === 'sanctioned_operative') {
    postureSignals.push(
      {
        identifier: 'folder_handed_over',
        kind: 'trust',
        signalText: 'Entregó la carpeta sin condiciones añadidas.',
        causeText: 'Responde a la firma de la sanción.',
      },
      {
        identifier: 'first_to_know',
        kind: 'trust',
        signalText: '«Usted estará entre quienes primero lo sepan. Y entre quienes primero respondan.»',
        causeText: 'Palabras de la mujer de la cafetería.',
      },
    )
  }
  if (oicnauStance === 'independent_ally') {
    postureSignals.push(
      {
        identifier: 'unmarked_telephone',
        kind: 'trust',
        signalText: 'Dejó un teléfono sin marca sobre la mesa.',
        causeText: 'Responde a la propuesta de alianza.',
      },
      {
        identifier: 'kept_the_folder',
        kind: 'suspicion',
        signalText: 'Guardó la carpeta. «Procure que siga conviniéndonos.»',
        causeText: 'La alianza no es lo habitual y lo dijo.',
      },
    )
  }
  if (oicnauStance === 'refused_offer') {
    postureSignals.push(
      {
        identifier: 'name_on_another_list',
        kind: 'suspicion',
        signalText: '«Lo que vio seguirá ahí, y ahora sabemos que usted también.»',
        causeText: 'Responde a la negativa.',
      },
      {
        identifier: 'closed_newspaper',
        kind: 'suspicion',
        signalText: 'Al salir, alguien en la mesa del fondo cerró un periódico.',
        causeText: 'Visto por {{nombre}} en la cafetería.',
      },
    )
  }
  if (lighthouseExperience?.hasArchiveBeenClosed && oicnauStance === 'sanctioned_operative') {
    postureSignals.push({
      identifier: 'report_delivered',
      kind: 'trust',
      signalText: 'Informe de cierre del Archivo 01 entregado en plazo.',
      causeText: 'Responde a un informe. Aún no hay respuesta de la OICNAU.',
    })
  }
  return postureSignals
}

const oicnauPostureSummaryTextByStance: Record<OicnauStance, string> = {
  sanctioned_operative: 'Confianza inicial alta',
  independent_ally: 'Confianza moderada · Vigilancia discreta',
  refused_offer: 'Sospecha inicial',
}

function buildKnownFactions(
  oicnauStance: OicnauStance | null,
  lighthouseExperience: LighthouseExperience | null,
): KnownFaction[] {
  const oicnauFaction: KnownFaction =
    oicnauStance === null
      ? {
          identifier: 'oicnau',
          factionName: 'OICNAU',
          epithetName: 'El Carcelero',
          doctrineText: 'Encierra lo anómalo',
          knowledgeDepth: 'no_contact',
          knowledgeParagraphs: [],
          knowledgeSourceText: '',
          postureSummaryText: null,
          postureSignals: [],
          interactions: [],
        }
      : {
          identifier: 'oicnau',
          factionName: 'OICNAU',
          epithetName: 'El Carcelero',
          doctrineText: 'Encierra lo anómalo',
          knowledgeDepth: 'witnessed_contact',
          knowledgeParagraphs: [
            'Existe para encerrar lo que no debería existir. Tiene celdas que no figuran en ningún plano y fondos que ningún parlamento aprobó.',
            'Una sola doctrina: lo anómalo se contiene. Quienes la conocen de cerca la llaman el Carcelero, y no siempre es un insulto.',
            'Se presentó con un sobre sin remitente y una mujer que no dio su nombre.',
          ],
          knowledgeSourceText: 'Lo que {{nombre}} vio y escuchó en la cafetería.',
          postureSummaryText: oicnauPostureSummaryTextByStance[oicnauStance],
          postureSignals: buildOicnauPostureSignals(oicnauStance, lighthouseExperience),
          interactions: buildOicnauInteractions(oicnauStance, lighthouseExperience),
        }
  if (oicnauStance === null) {
    return [oicnauFaction]
  }
  return [
    oicnauFaction,
    {
      identifier: 'the_court',
      factionName: 'La Corte',
      epithetName: 'Los Curadores',
      doctrineText: 'Conserva lo anómalo',
      knowledgeDepth: 'name_and_rumor',
      knowledgeParagraphs: [
        'Dicen que compran lo que otros quemarían, y que en alguna parte hay salas donde lo imposible descansa tras un cristal, con su etiqueta.',
      ],
      knowledgeSourceText:
        'Rumor. La mujer de la cafetería nombró a «los Curadores» como quien nombra a un vecino molesto, y no explicó más.',
      postureSummaryText: null,
      postureSignals: [],
      interactions: [
        {
          identifier: 'curators_mentioned',
          fictionalDateLabel: fictionalDateLabels.cafeteriaRumor,
          descriptionText: '{{nombre}} oye el nombre por primera vez. Ningún contacto.',
        },
      ],
    },
    {
      identifier: 'court_of_chaos',
      factionName: 'La Corte del Caos',
      epithetName: 'Los Liberadores',
      doctrineText: 'Libera lo anómalo',
      knowledgeDepth: 'name_and_rumor',
      knowledgeParagraphs: [
        'Una cadena abierta pintada bajo el puente. Alguien comentó que son los que abren las puertas que otros cierran, y cambió de tema.',
      ],
      knowledgeSourceText: 'Rumor de calle. Nadie que {{nombre}} conozca admite haberlos visto.',
      postureSummaryText: null,
      postureSignals: [],
      interactions: [
        {
          identifier: 'open_chain_graffiti',
          fictionalDateLabel: fictionalDateLabels.bridgeGraffiti,
          descriptionText: '{{nombre}} ve la pintada y escucha el nombre. Ningún contacto.',
        },
      ],
    },
  ]
}

function sumRelationshipLevel(baseLevel: number, changeCauses: RelationshipChangeCause[]): number {
  return changeCauses.reduce((accumulatedLevel, changeCause) => accumulatedLevel + changeCause.levelChange, baseLevel)
}

function buildDirectedRelationship(baseLevel: number, changeCauses: RelationshipChangeCause[]): DirectedRelationship {
  return { level: Math.max(1, sumRelationshipLevel(baseLevel, changeCauses)), changeCauses }
}

function buildRelationalAnchorContact(chronicleState: ChronicleState): KnownContact | null {
  const relationalAnchor = chronicleState.investigatorRegistration?.relationalAnchor
  if (!relationalAnchor || relationalAnchor.kind !== 'person' || relationalAnchor.personName.trim().length === 0) {
    return null
  }
  return {
    identifier: 'relational_anchor',
    displayName: relationalAnchor.personName.trim(),
    isNameKnown: true,
    roleText: 'Ancla Relacional',
    silhouetteName: 'close_figure',
    firstSeenText: 'Consta en el registro de {{nombre}} desde antes de la Crónica.',
    knowledgeParagraphs: [
      'La persona que ata a {{nombre}} al mundo de siempre. No sabe nada de sobres grises ni de faros que cuentan.',
    ],
    affiliatedFactionIdentifier: null,
    relationshipFromInvestigator: buildDirectedRelationship(8, [
      {
        identifier: 'declared_bond',
        fictionalDateLabel: fictionalDateLabels.beforeChronicle,
        causeText: 'Vínculo anterior a la Crónica, declarado en el registro.',
        levelChange: 0,
      },
    ]),
    relationshipTowardInvestigator: buildDirectedRelationship(8, [
      {
        identifier: 'declared_bond',
        fictionalDateLabel: fictionalDateLabels.beforeChronicle,
        causeText: 'Vínculo anterior a la Crónica. Nada lo ha puesto a prueba todavía.',
        levelChange: 0,
      },
    ]),
    dimensionTexts: {
      kinship: null,
      employment: 'Ninguno.',
      debt: null,
      affection: relationalAnchor.bondDescription.trim().length > 0 ? relationalAnchor.bondDescription.trim() : null,
    },
  }
}

function buildCafeteriaWomanContact(oicnauStance: OicnauStance): KnownContact {
  const towardInvestigatorCauseByStance: Record<OicnauStance, RelationshipChangeCause> = {
    sanctioned_operative: {
      identifier: 'stance_answer',
      fictionalDateLabel: fictionalDateLabels.cafeteriaMeeting,
      causeText: '{{nombre}} aceptó la sanción. Ella asintió sin sonreír y entregó la carpeta.',
      levelChange: 2,
    },
    independent_ally: {
      identifier: 'stance_answer',
      fictionalDateLabel: fictionalDateLabels.cafeteriaMeeting,
      causeText: '{{nombre}} propuso una alianza. «No es lo habitual.» Dejó el teléfono.',
      levelChange: 1,
    },
    refused_offer: {
      identifier: 'stance_answer',
      fictionalDateLabel: fictionalDateLabels.cafeteriaMeeting,
      causeText: '{{nombre}} se negó. Ella pagó los dos cafés y no se despidió.',
      levelChange: 0,
    },
  }
  const employmentTextByStance: Record<OicnauStance, string> = {
    sanctioned_operative: 'Trabaja para la OICNAU. {{nombre}} responde ante la organización a través de ella.',
    independent_ally: 'Trabaja para la OICNAU. Es quien llama al teléfono sin marca. No da órdenes a {{nombre}}.',
    refused_offer: 'Trabaja para la OICNAU. Ningún trato con {{nombre}}.',
  }
  return {
    identifier: 'cafeteria_woman',
    displayName: 'La mujer de la cafetería',
    isNameKnown: false,
    roleText: 'Contacto de la OICNAU',
    silhouetteName: 'seated_figure',
    firstSeenText: 'Esperaba en la cafetería de la dirección del sobre.',
    knowledgeParagraphs: [
      'No dio su nombre. Habla como quien ha hecho la misma oferta muchas veces y deja la taza sobre el plato antes de decir lo importante.',
    ],
    affiliatedFactionIdentifier: 'oicnau',
    relationshipFromInvestigator: buildDirectedRelationship(1, [
      {
        identifier: 'nameless_meeting',
        fictionalDateLabel: fictionalDateLabels.cafeteriaMeeting,
        causeText: 'Un solo encuentro. No dio su nombre.',
        levelChange: 0,
      },
    ]),
    relationshipTowardInvestigator: buildDirectedRelationship(1, [towardInvestigatorCauseByStance[oicnauStance]]),
    dimensionTexts: {
      kinship: 'Ninguno.',
      employment: employmentTextByStance[oicnauStance],
      debt: oicnauStance === 'refused_offer' ? 'Ella pagó los dos cafés. No pareció un favor.' : 'Ninguna conocida.',
      affection: null,
    },
  }
}

function buildRenataContact(
  lighthouseExperience: LighthouseExperience,
  confirmedRelationshipChanges: readonly ConfirmedRelationshipChange[],
): KnownContact {
  const towardInvestigatorCauses: RelationshipChangeCause[] = []
  const fromInvestigatorCauses: RelationshipChangeCause[] = [
    {
      identifier: 'seen_on_the_pier',
      fictionalDateLabel: fictionalDateLabels.archiveOpening,
      causeText: 'Esperaba al final del muelle viejo con una libreta contra el pecho.',
      levelChange: 0,
    },
  ]
  if (lighthouseExperience.hasSpokenWithRenata) {
    towardInvestigatorCauses.push({
      identifier: 'showed_the_notebook',
      fictionalDateLabel: fictionalDateLabels.archiveNight,
      causeText: 'Contó que su hermano subió a contar destellos y abrió la libreta ante {{nombre}}.',
      levelChange: 1,
    })
    fromInvestigatorCauses.push({
      identifier: 'account_matches_what_was_seen',
      fictionalDateLabel: fictionalDateLabels.archiveNight,
      causeText: 'Su relato coincidió con los diez destellos que {{nombre}} contó al desembarcar.',
      levelChange: 1,
    })
  }
  if (lighthouseExperience.hasAskedRenataAboutBrother) {
    towardInvestigatorCauses.push({
      identifier: 'confided_about_her_mother',
      fictionalDateLabel: fictionalDateLabels.archiveNight,
      causeText: 'Confió lo de su madre, la que se llevó el mar en 1987.',
      levelChange: 1,
    })
  }
  if (lighthouseExperience.hasEvacuatedRenata) {
    towardInvestigatorCauses.push({
      identifier: 'led_out_of_the_lighthouse',
      fictionalDateLabel: fictionalDateLabels.archiveNight,
      causeText: 'Salió del faro del brazo de {{nombre}} y vio pasar el décimo destello desde la lancha.',
      levelChange: 1,
    })
  }
  if (lighthouseExperience.hasBrotherReturned) {
    towardInvestigatorCauses.push({
      identifier: 'brother_came_down',
      fictionalDateLabel: fictionalDateLabels.archiveNight,
      causeText: 'Su hermano volvió a bajar la escalera del faro.',
      levelChange: 2,
    })
  }
  if (towardInvestigatorCauses.length === 0) {
    towardInvestigatorCauses.push({
      identifier: 'watched_from_the_pier',
      fictionalDateLabel: fictionalDateLabels.archiveOpening,
      causeText: 'Vio desembarcar a {{nombre}}. No cruzaron palabra.',
      levelChange: 0,
    })
  }
  const knowledgeParagraphs = lighthouseExperience.hasSpokenWithRenata
    ? [
        'Fue la última aprendiz del farero de Punta Ánimas. Habla bajo y no deja de mirar la linterna apagada.',
        'Lleva una libreta con columnas de palitos, noche tras noche, siempre nueve. La última página tiene diez.',
      ]
    : ['Una mujer con un abrigo demasiado grande. Sostiene una libreta contra el pecho y no se aparta del muelle.']
  return {
    identifier: 'renata_oquendo',
    displayName: lighthouseExperience.hasSpokenWithRenata
      ? 'Renata Oquendo'
      : lighthouseExperience.isRenataNameKnown
        ? 'Renata'
        : 'La mujer de la libreta',
    isNameKnown: lighthouseExperience.isRenataNameKnown,
    roleText: lighthouseExperience.hasSpokenWithRenata ? 'Testigo · Punta Ánimas' : 'Vista en Punta Ánimas',
    silhouetteName: 'long_coat_figure',
    firstSeenText: 'Muelle viejo de Punta Ánimas, Archivo 01.',
    knowledgeParagraphs,
    affiliatedFactionIdentifier: null,
    relationshipFromInvestigator:
      buildConfirmedDirectedRelationship(confirmedRelationshipChanges, 'renata_oquendo', 'from_investigator') ??
      buildDirectedRelationship(1, fromInvestigatorCauses),
    relationshipTowardInvestigator:
      buildConfirmedDirectedRelationship(confirmedRelationshipChanges, 'renata_oquendo', 'toward_investigator_as_perceived') ??
      buildDirectedRelationship(1, towardInvestigatorCauses),
    dimensionTexts: {
      kinship: lighthouseExperience.hasSpokenWithRenata ? 'Ninguno con {{nombre}}. Tiene un hermano.' : null,
      employment: 'Ninguno.',
      debt: lighthouseExperience.hasBrotherReturned
        ? 'Renata siente que le debe a {{nombre}} el regreso de su hermano. Nadie ha hablado de cobrarlo.'
        : 'Ninguna conocida.',
      affection: null,
    },
  }
}

function buildBoatmanContact(
  lighthouseExperience: LighthouseExperience,
  confirmedRelationshipChanges: readonly ConfirmedRelationshipChange[],
): KnownContact {
  const towardInvestigatorCauses: RelationshipChangeCause[] = [
    {
      identifier: 'ferried_to_the_pier',
      fictionalDateLabel: fictionalDateLabels.archiveOpening,
      causeText: 'Dejó a {{nombre}} en el muelle viejo sin apagar el motor. Miraba el faro.',
      levelChange: 0,
    },
  ]
  if (lighthouseExperience.hasHeardBoatmanMurmur) {
    towardInvestigatorCauses.push({
      identifier: 'spoke_unprompted',
      fictionalDateLabel: fictionalDateLabels.archiveNight,
      causeText: 'Se santiguó y habló sin que nadie le preguntara: «Antes no hacía eso».',
      levelChange: 0,
    })
  }
  if (lighthouseExperience.hasPaidBoatmanToWait) {
    towardInvestigatorCauses.push({
      identifier: 'paid_to_wait',
      fictionalDateLabel: fictionalDateLabels.archiveNight,
      causeText: 'Aceptó el pago, apagó el motor y dio un consejo que nadie le pidió.',
      levelChange: 1,
    })
  }
  return {
    identifier: 'punta_animas_boatman',
    displayName: 'El lanchero',
    isNameKnown: false,
    roleText: 'Lanchero de Punta Ánimas',
    silhouetteName: 'capped_figure',
    firstSeenText: 'Travesía nocturna hasta Punta Ánimas, Archivo 01.',
    knowledgeParagraphs: lighthouseExperience.hasPaidBoatmanToWait
      ? [
          'No dijo su nombre. Cuenta los billetes dos veces. «Si oye que el faro dice su nombre, no conteste.»',
          '{{nombre}} no le había dicho su nombre a nadie en ese pueblo.',
        ]
      : ['No dijo su nombre. Conoce la bahía y prefiere no mirarla de noche.'],
    affiliatedFactionIdentifier: null,
    relationshipFromInvestigator:
      buildConfirmedDirectedRelationship(confirmedRelationshipChanges, 'punta_animas_boatman', 'from_investigator') ??
      buildDirectedRelationship(1, [
        {
          identifier: 'a_single_crossing',
          fictionalDateLabel: fictionalDateLabels.archiveOpening,
          causeText: 'Una sola travesía. Cumplió con llevar a {{nombre}} hasta el muelle.',
          levelChange: 0,
        },
      ]),
    relationshipTowardInvestigator:
      buildConfirmedDirectedRelationship(
        confirmedRelationshipChanges,
        'punta_animas_boatman',
        'toward_investigator_as_perceived',
      ) ?? buildDirectedRelationship(1, towardInvestigatorCauses),
    dimensionTexts: {
      kinship: 'Ninguno.',
      employment: lighthouseExperience.hasPaidBoatmanToWait
        ? 'Contratado una noche: 120 de fondos operativos por esperar hasta que clareara. Encargo terminado.'
        : 'Solo la travesía de ida. Nada pendiente.',
      debt: 'Ninguna conocida.',
      affection: null,
    },
  }
}

function buildFreedBrotherContact(confirmedRelationshipChanges: readonly ConfirmedRelationshipChange[]): KnownContact {
  const isNameKnown = confirmedRelationshipChanges.some(
    (relationshipChange) =>
      relationshipChange.personIdentifier === 'renata_brother' && relationshipChange.personVisibleName === 'Tomás Oquendo',
  )
  return {
    identifier: 'renata_brother',
    displayName: isNameKnown ? 'Tomás Oquendo' : 'El hombre descalzo de la escalera',
    isNameKnown,
    roleText: 'Salió del faro · Punta Ánimas',
    silhouetteName: 'close_figure',
    firstSeenText: 'Faro de Punta Ánimas, Archivo 01.',
    knowledgeParagraphs: [
      'Hermano de Renata Oquendo. Subió al faro a contar destellos y pasó una noche entera en un peldaño que no figura en el plano.',
    ],
    affiliatedFactionIdentifier: null,
    relationshipFromInvestigator:
      buildConfirmedDirectedRelationship(confirmedRelationshipChanges, 'renata_brother', 'from_investigator') ??
      buildDirectedRelationship(1, [
        {
          identifier: 'seen_coming_down',
          fictionalDateLabel: fictionalDateLabels.archiveNight,
          causeText: 'Bajó la escalera del faro por su propio pie.',
          levelChange: 0,
        },
      ]),
    relationshipTowardInvestigator:
      buildConfirmedDirectedRelationship(confirmedRelationshipChanges, 'renata_brother', 'toward_investigator_as_perceived') ??
      buildDirectedRelationship(1, [
        {
          identifier: 'out_of_the_tower',
          fictionalDateLabel: fictionalDateLabels.archiveNight,
          causeText: 'Salió de la torre la noche en que {{nombre}} estuvo en Punta Ánimas.',
          levelChange: 0,
        },
      ]),
    dimensionTexts: {
      kinship: 'Ninguno con {{nombre}}. Hermano de Renata Oquendo.',
      employment: 'Ninguno.',
      debt: confirmedRelationshipChanges.some(
        (relationshipChange) => relationshipChange.personIdentifier === 'renata_brother' && relationshipChange.dimensionName === 'debt',
      )
        ? 'Dice deberle a {{nombre}} haber salido de la torre. Nadie ha hablado de cobrarlo.'
        : 'Ninguna conocida.',
      affection: null,
    },
  }
}

function personalizeContact(knownContact: KnownContact, personalize: (narrativeText: string) => string): KnownContact {
  const personalizeRelationship = (directedRelationship: DirectedRelationship): DirectedRelationship => ({
    ...directedRelationship,
    changeCauses: directedRelationship.changeCauses.map((changeCause) => ({
      ...changeCause,
      causeText: personalize(changeCause.causeText),
    })),
  })
  return {
    ...knownContact,
    firstSeenText: personalize(knownContact.firstSeenText),
    knowledgeParagraphs: knownContact.knowledgeParagraphs.map(personalize),
    relationshipFromInvestigator: personalizeRelationship(knownContact.relationshipFromInvestigator),
    relationshipTowardInvestigator: personalizeRelationship(knownContact.relationshipTowardInvestigator),
    dimensionTexts: {
      kinship: knownContact.dimensionTexts.kinship ? personalize(knownContact.dimensionTexts.kinship) : null,
      employment: knownContact.dimensionTexts.employment ? personalize(knownContact.dimensionTexts.employment) : null,
      debt: knownContact.dimensionTexts.debt ? personalize(knownContact.dimensionTexts.debt) : null,
      affection: knownContact.dimensionTexts.affection,
    },
  }
}

function personalizeFaction(knownFaction: KnownFaction, personalize: (narrativeText: string) => string): KnownFaction {
  return {
    ...knownFaction,
    knowledgeParagraphs: knownFaction.knowledgeParagraphs.map(personalize),
    knowledgeSourceText: personalize(knownFaction.knowledgeSourceText),
    postureSignals: knownFaction.postureSignals.map((postureSignal) => ({
      ...postureSignal,
      signalText: personalize(postureSignal.signalText),
      causeText: personalize(postureSignal.causeText),
    })),
    interactions: knownFaction.interactions.map((interaction) => ({
      ...interaction,
      descriptionText: personalize(interaction.descriptionText),
    })),
  }
}

function buildNetworkLinks(
  oicnauStance: OicnauStance | null,
  knownFactions: KnownFaction[],
  knownContacts: KnownContact[],
  lighthouseExperience: LighthouseExperience | null,
): RelationshipNetworkLink[] {
  const networkLinks: RelationshipNetworkLink[] = []
  if (oicnauStance !== null) {
    const investigatorTowardOicnauKindByStance: Record<OicnauStance, RelationshipLinkKindName> = {
      sanctioned_operative: 'sanction',
      independent_ally: 'alliance',
      refused_offer: 'refusal',
    }
    const oicnauTowardInvestigatorKindByStance: Record<OicnauStance, RelationshipLinkKindName> = {
      sanctioned_operative: 'support',
      independent_ally: 'surveillance',
      refused_offer: 'surveillance',
    }
    networkLinks.push(
      {
        identifier: 'investigator_toward_oicnau',
        originNodeIdentifier: investigatorNetworkNodeIdentifier,
        destinationNodeIdentifier: 'oicnau',
        kindName: investigatorTowardOicnauKindByStance[oicnauStance],
        level: null,
        isUnconfirmed: false,
      },
      {
        identifier: 'oicnau_toward_investigator',
        originNodeIdentifier: 'oicnau',
        destinationNodeIdentifier: investigatorNetworkNodeIdentifier,
        kindName: oicnauTowardInvestigatorKindByStance[oicnauStance],
        level: null,
        isUnconfirmed: false,
      },
    )
  }
  for (const knownFaction of knownFactions) {
    if (knownFaction.knowledgeDepth === 'name_and_rumor') {
      networkLinks.push({
        identifier: `investigator_toward_${knownFaction.identifier}`,
        originNodeIdentifier: investigatorNetworkNodeIdentifier,
        destinationNodeIdentifier: knownFaction.identifier,
        kindName: 'rumor',
        level: null,
        isUnconfirmed: true,
      })
    }
  }
  for (const knownContact of knownContacts) {
    const isRelationalAnchor = knownContact.identifier === 'relational_anchor'
    const isIndebtedContact = knownContact.identifier === 'renata_oquendo' && lighthouseExperience?.hasBrotherReturned === true
    const wasHiredByInvestigator =
      knownContact.identifier === 'punta_animas_boatman' && lighthouseExperience?.hasPaidBoatmanToWait === true
    networkLinks.push(
      {
        identifier: `investigator_toward_${knownContact.identifier}`,
        originNodeIdentifier: investigatorNetworkNodeIdentifier,
        destinationNodeIdentifier: knownContact.identifier,
        kindName: isRelationalAnchor ? 'anchor' : wasHiredByInvestigator ? 'hire' : 'acquaintance',
        level: knownContact.relationshipFromInvestigator.level,
        isUnconfirmed: false,
      },
      {
        identifier: `${knownContact.identifier}_toward_investigator`,
        originNodeIdentifier: knownContact.identifier,
        destinationNodeIdentifier: investigatorNetworkNodeIdentifier,
        kindName: isRelationalAnchor ? 'anchor' : isIndebtedContact ? 'debt' : 'acquaintance',
        level: knownContact.relationshipTowardInvestigator.level,
        isUnconfirmed: false,
      },
    )
    if (knownContact.affiliatedFactionIdentifier !== null) {
      networkLinks.push({
        identifier: `${knownContact.identifier}_toward_${knownContact.affiliatedFactionIdentifier}`,
        originNodeIdentifier: knownContact.identifier,
        destinationNodeIdentifier: knownContact.affiliatedFactionIdentifier,
        kindName: 'employment',
        level: null,
        isUnconfirmed: false,
      })
    }
  }
  return networkLinks
}

export function buildKnownRelationshipBoard(
  chronicleState: ChronicleState,
  rememberedLighthouseExperience: LighthouseExperience | null,
  investigatorNodeCaptionText: string,
): KnownRelationshipBoard {
  const personalize = (narrativeText: string) =>
    personalizeNarrativeText(narrativeText, chronicleState.investigatorRegistration)
  const lighthouseExperience = resolveKnownLighthouseExperience(chronicleState, rememberedLighthouseExperience)
  const knownFactions = buildKnownFactions(chronicleState.oicnauStance, lighthouseExperience).map((knownFaction) =>
    personalizeFaction(knownFaction, personalize),
  )
  const unpersonalizedContacts: KnownContact[] = []
  const relationalAnchorContact = buildRelationalAnchorContact(chronicleState)
  if (relationalAnchorContact) {
    unpersonalizedContacts.push(relationalAnchorContact)
  }
  if (chronicleState.oicnauStance !== null) {
    unpersonalizedContacts.push(buildCafeteriaWomanContact(chronicleState.oicnauStance))
  }
  if (lighthouseExperience) {
    const confirmedRelationshipChanges =
      chronicleState.chosenWhisperIdentifier !== null ? chronicleState.archiveRun.relationshipChanges : []
    unpersonalizedContacts.push(
      buildRenataContact(lighthouseExperience, confirmedRelationshipChanges),
      buildBoatmanContact(lighthouseExperience, confirmedRelationshipChanges),
    )
    if (lighthouseExperience.hasBrotherReturned) {
      unpersonalizedContacts.push(buildFreedBrotherContact(confirmedRelationshipChanges))
    }
  }
  const knownContacts = unpersonalizedContacts.map((knownContact) => personalizeContact(knownContact, personalize))
  const networkNodes: RelationshipNetworkNode[] = [
    {
      identifier: investigatorNetworkNodeIdentifier,
      kind: 'investigator',
      displayName: personalize('{{nombre}}'),
      captionText: investigatorNodeCaptionText,
      factionIdentifier: null,
    },
    ...knownFactions
      .filter((knownFaction) => knownFaction.knowledgeDepth !== 'no_contact')
      .map(
        (knownFaction): RelationshipNetworkNode => ({
          identifier: knownFaction.identifier,
          kind: 'faction',
          displayName: knownFaction.factionName,
          captionText: knownFaction.epithetName,
          factionIdentifier: knownFaction.identifier,
        }),
      ),
    ...knownContacts.map(
      (knownContact): RelationshipNetworkNode => ({
        identifier: knownContact.identifier,
        kind: 'contact',
        displayName: knownContact.displayName,
        captionText: knownContact.roleText,
        factionIdentifier: null,
      }),
    ),
  ]
  return {
    factions: knownFactions,
    contacts: knownContacts,
    networkNodes,
    networkLinks: buildNetworkLinks(chronicleState.oicnauStance, knownFactions, knownContacts, lighthouseExperience),
  }
}

export function personalizeOicnauBondDefinition(
  oicnauBondDefinition: OicnauBondDefinition,
  chronicleState: ChronicleState,
): OicnauBondDefinition {
  const personalize = (narrativeText: string) =>
    personalizeNarrativeText(narrativeText, chronicleState.investigatorRegistration)
  return {
    ...oicnauBondDefinition,
    bondSummaryText: personalize(oicnauBondDefinition.bondSummaryText),
    receivedTerms: oicnauBondDefinition.receivedTerms.map(personalize),
    owedTerms: oicnauBondDefinition.owedTerms.map(personalize),
    exposureTerms: oicnauBondDefinition.exposureTerms.map(personalize),
  }
}

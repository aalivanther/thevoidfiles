import type { LighthouseExperience } from '../../demonstration/organizations_allies_data'

export type RelationshipBoardSectionName = 'factions' | 'contacts' | 'cell' | 'network'

export type RelationshipNetworkViewName = 'board' | 'list'

export type AcknowledgedRelationshipLevels = {
  fromInvestigatorLevel: number
  towardInvestigatorLevel: number
}

export type OrganizationsAlliesRecord = {
  recordFormatVersion: 1
  lastVisitedSectionName: RelationshipBoardSectionName
  preferredNetworkViewName: RelationshipNetworkViewName
  playerNotesByContactIdentifier: Record<string, string>
  rememberedLighthouseExperience: LighthouseExperience | null
  acknowledgedRelationshipLevelsByContactIdentifier: Record<string, AcknowledgedRelationshipLevels>
  acknowledgedPostureSignalIdentifiersByFactionIdentifier: Record<string, string[]>
}

export const maximumPlayerNoteLength = 600

const relationshipBoardSectionNames: readonly RelationshipBoardSectionName[] = ['factions', 'contacts', 'cell', 'network']
const relationshipNetworkViewNames: readonly RelationshipNetworkViewName[] = ['board', 'list']

const lighthouseExperienceFieldNames: ReadonlyArray<keyof LighthouseExperience> = [
  'isRenataNameKnown',
  'hasSpokenWithRenata',
  'hasAskedRenataAboutBrother',
  'hasBrotherReturned',
  'hasEvacuatedRenata',
  'hasPaidBoatmanToWait',
  'hasHeardBoatmanMurmur',
  'hasArchiveBeenClosed',
]

export function createEmptyOrganizationsAlliesRecord(): OrganizationsAlliesRecord {
  return {
    recordFormatVersion: 1,
    lastVisitedSectionName: 'factions',
    preferredNetworkViewName: 'board',
    playerNotesByContactIdentifier: {},
    rememberedLighthouseExperience: null,
    acknowledgedRelationshipLevelsByContactIdentifier: {},
    acknowledgedPostureSignalIdentifiersByFactionIdentifier: {},
  }
}

function isPlainObject(candidate: unknown): candidate is Record<string, unknown> {
  return typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate)
}

function readLighthouseExperience(candidate: unknown): LighthouseExperience | null {
  if (!isPlainObject(candidate)) {
    return null
  }
  const hasEveryField = lighthouseExperienceFieldNames.every((fieldName) => typeof candidate[fieldName] === 'boolean')
  if (!hasEveryField) {
    return null
  }
  return Object.fromEntries(
    lighthouseExperienceFieldNames.map((fieldName) => [fieldName, candidate[fieldName] === true]),
  ) as LighthouseExperience
}

function readPlayerNotes(candidate: unknown): Record<string, string> {
  if (!isPlainObject(candidate)) {
    return {}
  }
  const playerNotesByContactIdentifier: Record<string, string> = {}
  for (const [contactIdentifier, noteCandidate] of Object.entries(candidate)) {
    if (typeof noteCandidate === 'string' && noteCandidate.length > 0) {
      playerNotesByContactIdentifier[contactIdentifier] = noteCandidate.slice(0, maximumPlayerNoteLength)
    }
  }
  return playerNotesByContactIdentifier
}

function readAcknowledgedRelationshipLevels(candidate: unknown): Record<string, AcknowledgedRelationshipLevels> {
  if (!isPlainObject(candidate)) {
    return {}
  }
  const acknowledgedLevelsByContactIdentifier: Record<string, AcknowledgedRelationshipLevels> = {}
  for (const [contactIdentifier, levelsCandidate] of Object.entries(candidate).slice(0, 80)) {
    if (
      isPlainObject(levelsCandidate) &&
      typeof levelsCandidate.fromInvestigatorLevel === 'number' &&
      typeof levelsCandidate.towardInvestigatorLevel === 'number' &&
      Number.isFinite(levelsCandidate.fromInvestigatorLevel) &&
      Number.isFinite(levelsCandidate.towardInvestigatorLevel)
    ) {
      acknowledgedLevelsByContactIdentifier[contactIdentifier] = {
        fromInvestigatorLevel: levelsCandidate.fromInvestigatorLevel,
        towardInvestigatorLevel: levelsCandidate.towardInvestigatorLevel,
      }
    }
  }
  return acknowledgedLevelsByContactIdentifier
}

function readAcknowledgedPostureSignalIdentifiers(candidate: unknown): Record<string, string[]> {
  if (!isPlainObject(candidate)) {
    return {}
  }
  const acknowledgedIdentifiersByFactionIdentifier: Record<string, string[]> = {}
  for (const [factionIdentifier, identifiersCandidate] of Object.entries(candidate).slice(0, 20)) {
    if (Array.isArray(identifiersCandidate)) {
      acknowledgedIdentifiersByFactionIdentifier[factionIdentifier] = identifiersCandidate
        .filter((identifierCandidate): identifierCandidate is string => typeof identifierCandidate === 'string')
        .slice(0, 80)
    }
  }
  return acknowledgedIdentifiersByFactionIdentifier
}

export function readOrganizationsAlliesRecord(candidate: unknown): OrganizationsAlliesRecord {
  const emptyRecord = createEmptyOrganizationsAlliesRecord()
  if (!isPlainObject(candidate) || candidate.recordFormatVersion !== 1) {
    return emptyRecord
  }
  const lastVisitedSectionName = relationshipBoardSectionNames.find(
    (sectionName) => sectionName === candidate.lastVisitedSectionName,
  )
  const preferredNetworkViewName = relationshipNetworkViewNames.find(
    (viewName) => viewName === candidate.preferredNetworkViewName,
  )
  return {
    recordFormatVersion: 1,
    lastVisitedSectionName: lastVisitedSectionName ?? emptyRecord.lastVisitedSectionName,
    preferredNetworkViewName: preferredNetworkViewName ?? emptyRecord.preferredNetworkViewName,
    playerNotesByContactIdentifier: readPlayerNotes(candidate.playerNotesByContactIdentifier),
    rememberedLighthouseExperience: readLighthouseExperience(candidate.rememberedLighthouseExperience),
    acknowledgedRelationshipLevelsByContactIdentifier: readAcknowledgedRelationshipLevels(
      candidate.acknowledgedRelationshipLevelsByContactIdentifier,
    ),
    acknowledgedPostureSignalIdentifiersByFactionIdentifier: readAcknowledgedPostureSignalIdentifiers(
      candidate.acknowledgedPostureSignalIdentifiersByFactionIdentifier,
    ),
  }
}

export function areLighthouseExperiencesEqual(
  firstExperience: LighthouseExperience | null,
  secondExperience: LighthouseExperience | null,
): boolean {
  if (firstExperience === null || secondExperience === null) {
    return firstExperience === secondExperience
  }
  return lighthouseExperienceFieldNames.every((fieldName) => firstExperience[fieldName] === secondExperience[fieldName])
}

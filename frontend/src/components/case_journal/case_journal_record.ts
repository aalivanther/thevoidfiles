import type { WitnessedOrigin } from '../../demonstration/case_journal_data'

export type PlayerHypothesisStanding = 'open' | 'reinforced' | 'refuted'

export type PlayerHypothesis = {
  identifier: string
  statementText: string
  standing: PlayerHypothesisStanding
  standingReasonText: string
  linkedClueIdentifiers: string[]
  writtenAtWorldClockMinutes: number
  standingChangedAtWorldClockMinutes: number | null
}

export type PlayerFreeNote = {
  identifier: string
  noteText: string
  writtenAtWorldClockMinutes: number
}

export type EvidenceBoardPosition = {
  horizontalFraction: number
  verticalFraction: number
}

export type ClueThreadLink = {
  firstClueIdentifier: string
  secondClueIdentifier: string
}

export type ClueViewName = 'board' | 'list'

export type ArchiveCasework = {
  confirmedFactTexts?: string[]
  archiveTitle: string
  wasArchiveFinished: boolean
  witnessedOrigins: WitnessedOrigin[]
  ownAnalysisTextByClueIdentifier: Record<string, string>
  hypotheses: PlayerHypothesis[]
  freeNotes: PlayerFreeNote[]
  createdItemCount: number
  evidenceBoardPositionByClueIdentifier: Record<string, EvidenceBoardPosition>
  clueThreadLinks: ClueThreadLink[]
  preferredClueViewName: ClueViewName
}

export type CaseJournalRecord = {
  caseworkByArchiveSequence: Record<string, ArchiveCasework>
}

export const playerTextLengthLimits = {
  ownAnalysis: 400,
  hypothesisStatement: 240,
  standingReason: 200,
  freeNote: 600,
} as const

export const maximumHypothesisCount = 12
export const maximumFreeNoteCount = 24
export const maximumClueThreadLinkCount = 40

const lineFeedCodePoint = 10
const forbiddenInvisibleCodePointRanges: ReadonlyArray<readonly [number, number]> = [
  [0, 9],
  [11, 31],
  [127, 159],
  [8203, 8207],
  [8234, 8238],
  [8288, 8297],
  [65279, 65279],
]

function isCodePointAllowedInPlayerText(codePoint: number): boolean {
  return !forbiddenInvisibleCodePointRanges.some(
    ([firstForbiddenCodePoint, lastForbiddenCodePoint]) =>
      codePoint >= firstForbiddenCodePoint && codePoint <= lastForbiddenCodePoint,
  )
}

export function sanitizePlayerWrittenText(playerWrittenText: string, maximumLength: number): string {
  const allowedCharacters = Array.from(playerWrittenText.replace(/\r\n?/g, '\n')).filter((writtenCharacter) => {
    const codePoint = writtenCharacter.codePointAt(0) ?? lineFeedCodePoint
    return isCodePointAllowedInPlayerText(codePoint)
  })
  return Array.from(allowedCharacters.join('').replace(/\n{3,}/g, '\n\n'))
    .slice(0, maximumLength)
    .join('')
}

export function countPlayerWrittenCharacters(playerWrittenText: string): number {
  return Array.from(playerWrittenText).length
}

export function createEmptyArchiveCasework(archiveTitle: string): ArchiveCasework {
  return {
    archiveTitle,
    wasArchiveFinished: false,
    witnessedOrigins: [],
    ownAnalysisTextByClueIdentifier: {},
    hypotheses: [],
    freeNotes: [],
    createdItemCount: 0,
    evidenceBoardPositionByClueIdentifier: {},
    clueThreadLinks: [],
    preferredClueViewName: 'board',
  }
}

export function areClueThreadLinksEqual(firstLink: ClueThreadLink, secondLink: ClueThreadLink): boolean {
  return (
    (firstLink.firstClueIdentifier === secondLink.firstClueIdentifier &&
      firstLink.secondClueIdentifier === secondLink.secondClueIdentifier) ||
    (firstLink.firstClueIdentifier === secondLink.secondClueIdentifier &&
      firstLink.secondClueIdentifier === secondLink.firstClueIdentifier)
  )
}

export function clampBoardFraction(candidateFraction: number): number {
  return Math.min(1, Math.max(0, candidateFraction))
}

function isPlainObject(candidate: unknown): candidate is Record<string, unknown> {
  return typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate)
}

function readFiniteNumber(candidate: unknown, fallbackNumber: number): number {
  return typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : fallbackNumber
}

function readShortIdentifier(candidate: unknown): string | null {
  return typeof candidate === 'string' && candidate.length > 0 && candidate.length <= 80 ? candidate : null
}

function readHypothesisStanding(candidate: unknown): PlayerHypothesisStanding {
  return candidate === 'reinforced' || candidate === 'refuted' ? candidate : 'open'
}

function readWitnessedOrigins(candidate: unknown): WitnessedOrigin[] {
  if (!Array.isArray(candidate)) {
    return []
  }
  const witnessedOrigins: WitnessedOrigin[] = []
  candidate.slice(0, 40).forEach((possibleOrigin) => {
    if (!isPlainObject(possibleOrigin)) {
      return
    }
    const originIdentifier = readShortIdentifier(possibleOrigin.originIdentifier)
    if (!originIdentifier || typeof possibleOrigin.placeName !== 'string') {
      return
    }
    witnessedOrigins.push({
      originIdentifier,
      placeName: sanitizePlayerWrittenText(possibleOrigin.placeName, 120),
      worldClockMinutes: readFiniteNumber(possibleOrigin.worldClockMinutes, 0),
    })
  })
  return witnessedOrigins
}

function readHypotheses(candidate: unknown): PlayerHypothesis[] {
  if (!Array.isArray(candidate)) {
    return []
  }
  const hypotheses: PlayerHypothesis[] = []
  candidate.slice(0, maximumHypothesisCount).forEach((possibleHypothesis) => {
    if (!isPlainObject(possibleHypothesis)) {
      return
    }
    const identifier = readShortIdentifier(possibleHypothesis.identifier)
    if (!identifier || typeof possibleHypothesis.statementText !== 'string') {
      return
    }
    if (hypotheses.some((existingHypothesis) => existingHypothesis.identifier === identifier)) {
      return
    }
    const linkedClueIdentifiers: string[] = []
    if (Array.isArray(possibleHypothesis.linkedClueIdentifiers)) {
      possibleHypothesis.linkedClueIdentifiers.slice(0, 60).forEach((possibleClueIdentifier) => {
        const clueIdentifier = readShortIdentifier(possibleClueIdentifier)
        if (clueIdentifier && !linkedClueIdentifiers.includes(clueIdentifier)) {
          linkedClueIdentifiers.push(clueIdentifier)
        }
      })
    }
    hypotheses.push({
      identifier,
      statementText: sanitizePlayerWrittenText(
        possibleHypothesis.statementText,
        playerTextLengthLimits.hypothesisStatement,
      ),
      standing: readHypothesisStanding(possibleHypothesis.standing),
      standingReasonText:
        typeof possibleHypothesis.standingReasonText === 'string'
          ? sanitizePlayerWrittenText(possibleHypothesis.standingReasonText, playerTextLengthLimits.standingReason)
          : '',
      linkedClueIdentifiers,
      writtenAtWorldClockMinutes: readFiniteNumber(possibleHypothesis.writtenAtWorldClockMinutes, 0),
      standingChangedAtWorldClockMinutes:
        typeof possibleHypothesis.standingChangedAtWorldClockMinutes === 'number'
          ? readFiniteNumber(possibleHypothesis.standingChangedAtWorldClockMinutes, 0)
          : null,
    })
  })
  return hypotheses
}

function readFreeNotes(candidate: unknown): PlayerFreeNote[] {
  if (!Array.isArray(candidate)) {
    return []
  }
  const freeNotes: PlayerFreeNote[] = []
  candidate.slice(0, maximumFreeNoteCount).forEach((possibleNote) => {
    if (!isPlainObject(possibleNote)) {
      return
    }
    const identifier = readShortIdentifier(possibleNote.identifier)
    if (!identifier || typeof possibleNote.noteText !== 'string') {
      return
    }
    if (freeNotes.some((existingNote) => existingNote.identifier === identifier)) {
      return
    }
    freeNotes.push({
      identifier,
      noteText: sanitizePlayerWrittenText(possibleNote.noteText, playerTextLengthLimits.freeNote),
      writtenAtWorldClockMinutes: readFiniteNumber(possibleNote.writtenAtWorldClockMinutes, 0),
    })
  })
  return freeNotes
}

function readOwnAnalysisTexts(candidate: unknown): Record<string, string> {
  if (!isPlainObject(candidate)) {
    return {}
  }
  const ownAnalysisTextByClueIdentifier: Record<string, string> = {}
  Object.entries(candidate)
    .slice(0, 80)
    .forEach(([possibleClueIdentifier, possibleAnalysisText]) => {
      const clueIdentifier = readShortIdentifier(possibleClueIdentifier)
      if (clueIdentifier && typeof possibleAnalysisText === 'string') {
        ownAnalysisTextByClueIdentifier[clueIdentifier] = sanitizePlayerWrittenText(
          possibleAnalysisText,
          playerTextLengthLimits.ownAnalysis,
        )
      }
    })
  return ownAnalysisTextByClueIdentifier
}

function readEvidenceBoardPositions(candidate: unknown): Record<string, EvidenceBoardPosition> {
  if (!isPlainObject(candidate)) {
    return {}
  }
  const evidenceBoardPositionByClueIdentifier: Record<string, EvidenceBoardPosition> = {}
  Object.entries(candidate)
    .slice(0, 80)
    .forEach(([possibleClueIdentifier, possiblePosition]) => {
      const clueIdentifier = readShortIdentifier(possibleClueIdentifier)
      if (
        clueIdentifier &&
        isPlainObject(possiblePosition) &&
        typeof possiblePosition.horizontalFraction === 'number' &&
        typeof possiblePosition.verticalFraction === 'number' &&
        Number.isFinite(possiblePosition.horizontalFraction) &&
        Number.isFinite(possiblePosition.verticalFraction)
      ) {
        evidenceBoardPositionByClueIdentifier[clueIdentifier] = {
          horizontalFraction: clampBoardFraction(possiblePosition.horizontalFraction),
          verticalFraction: clampBoardFraction(possiblePosition.verticalFraction),
        }
      }
    })
  return evidenceBoardPositionByClueIdentifier
}

function readClueThreadLinks(candidate: unknown): ClueThreadLink[] {
  if (!Array.isArray(candidate)) {
    return []
  }
  const clueThreadLinks: ClueThreadLink[] = []
  candidate.slice(0, maximumClueThreadLinkCount).forEach((possibleLink) => {
    if (!isPlainObject(possibleLink)) {
      return
    }
    const firstClueIdentifier = readShortIdentifier(possibleLink.firstClueIdentifier)
    const secondClueIdentifier = readShortIdentifier(possibleLink.secondClueIdentifier)
    if (!firstClueIdentifier || !secondClueIdentifier || firstClueIdentifier === secondClueIdentifier) {
      return
    }
    const readLink = { firstClueIdentifier, secondClueIdentifier }
    if (!clueThreadLinks.some((existingLink) => areClueThreadLinksEqual(existingLink, readLink))) {
      clueThreadLinks.push(readLink)
    }
  })
  return clueThreadLinks
}

function readArchiveCasework(candidate: unknown): ArchiveCasework | null {
  if (!isPlainObject(candidate) || typeof candidate.archiveTitle !== 'string') {
    return null
  }
  const hypotheses = readHypotheses(candidate.hypotheses)
  const freeNotes = readFreeNotes(candidate.freeNotes)
  return {
    archiveTitle: sanitizePlayerWrittenText(candidate.archiveTitle, 120),
    confirmedFactTexts: Array.isArray(candidate.confirmedFactTexts) ? candidate.confirmedFactTexts.filter((text): text is string => typeof text === 'string') : [],
    wasArchiveFinished: candidate.wasArchiveFinished === true,
    witnessedOrigins: readWitnessedOrigins(candidate.witnessedOrigins),
    ownAnalysisTextByClueIdentifier: readOwnAnalysisTexts(candidate.ownAnalysisTextByClueIdentifier),
    hypotheses,
    freeNotes,
    createdItemCount: Math.max(
      readFiniteNumber(candidate.createdItemCount, 0),
      hypotheses.length + freeNotes.length,
    ),
    evidenceBoardPositionByClueIdentifier: readEvidenceBoardPositions(candidate.evidenceBoardPositionByClueIdentifier),
    clueThreadLinks: readClueThreadLinks(candidate.clueThreadLinks),
    preferredClueViewName: candidate.preferredClueViewName === 'list' ? 'list' : 'board',
  }
}

export function readCaseJournalRecord(storedModuleRecord: unknown): CaseJournalRecord {
  const caseworkByArchiveSequence: Record<string, ArchiveCasework> = {}
  if (!isPlainObject(storedModuleRecord) || !isPlainObject(storedModuleRecord.caseworkByArchiveSequence)) {
    return { caseworkByArchiveSequence }
  }
  Object.entries(storedModuleRecord.caseworkByArchiveSequence)
    .slice(0, 60)
    .forEach(([possibleArchiveSequence, possibleCasework]) => {
      if (!/^\d{1,4}$/.test(possibleArchiveSequence)) {
        return
      }
      const archiveCasework = readArchiveCasework(possibleCasework)
      if (archiveCasework) {
        caseworkByArchiveSequence[possibleArchiveSequence] = archiveCasework
      }
    })
  return { caseworkByArchiveSequence }
}

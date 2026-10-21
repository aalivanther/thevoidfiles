import { listClosedChronicles } from '../game_service/profile_chronicle_snapshot_requests'
import type { ChronicleDeathCauseName, ChronicleDeathNatureName } from './archive_turn_contract'

export type ChronicleClosureRecord = {
  closureIdentifier: string
  deathNatureName: ChronicleDeathNatureName
  deathCauseName: ChronicleDeathCauseName
  perceptibleCauseText: string
  epitaphRewriteText: string | null
  intrusiveOptionText: string | null
  investigatorFullName: string
  level: number
  resolvedArchiveCount: number
  investigatedWhisperCount: number
  archiveNumberLabel: string
  archiveTitle: string
  placeName: string
  worldClockMinutes: number
  seriousWoundsSuffered: number
  confirmedTurnCountInLastArchive: number
  conservedClueCount: number
  conservedKnownPersonCount: number
  hasClosureSequenceBeenWitnessed: boolean
}

const closedChronicleArchiveStorageKey = 'the_void_files_closed_chronicle_archive'
const maximumStoredClosedChronicleCount = 24

function isUsableChronicleClosureRecord(candidate: unknown): candidate is ChronicleClosureRecord {
  if (typeof candidate !== 'object' || candidate === null) {
    return false
  }
  const possibleRecord = candidate as Partial<ChronicleClosureRecord>
  return (
    typeof possibleRecord.closureIdentifier === 'string' &&
    typeof possibleRecord.investigatorFullName === 'string' &&
    typeof possibleRecord.perceptibleCauseText === 'string' &&
    typeof possibleRecord.archiveTitle === 'string' &&
    typeof possibleRecord.placeName === 'string' &&
    typeof possibleRecord.level === 'number' &&
    typeof possibleRecord.resolvedArchiveCount === 'number' &&
    typeof possibleRecord.worldClockMinutes === 'number' &&
    typeof possibleRecord.seriousWoundsSuffered === 'number' &&
    typeof possibleRecord.conservedClueCount === 'number' &&
    typeof possibleRecord.conservedKnownPersonCount === 'number' &&
    (possibleRecord.deathNatureName === 'physical' || possibleRecord.deathNatureName === 'psychological') &&
    (possibleRecord.deathCauseName === 'critical_failure' || possibleRecord.deathCauseName === 'fifth_serious_wound')
  )
}

let closedChroniclesKeptByGameService: ChronicleClosureRecord[] | null = null

export async function refreshClosedChroniclesFromGameService(profileIdentifier: string): Promise<void> {
  const listingResult = await listClosedChronicles(profileIdentifier)
  if (!listingResult.wasSuccessful) {
    return
  }
  const closureRecordCandidates: unknown[] = listingResult.value.map((closedChronicle) => closedChronicle.closureRecord)
  closedChroniclesKeptByGameService = closureRecordCandidates.filter(isUsableChronicleClosureRecord)
}

function readClosedChronicleArchiveFromBrowserStorage(): ChronicleClosureRecord[] {
  try {
    const storedText = window.localStorage.getItem(closedChronicleArchiveStorageKey)
    if (!storedText) {
      return []
    }
    const parsedCandidate: unknown = JSON.parse(storedText)
    return Array.isArray(parsedCandidate) ? parsedCandidate.filter(isUsableChronicleClosureRecord) : []
  } catch {
    return []
  }
}

export function readClosedChronicleArchive(): ChronicleClosureRecord[] {
  return closedChroniclesKeptByGameService ?? readClosedChronicleArchiveFromBrowserStorage()
}

export function saveClosedChronicleInArchive(chronicleClosureRecord: ChronicleClosureRecord) {
  if (closedChroniclesKeptByGameService !== null) {
    closedChroniclesKeptByGameService = [
      ...closedChroniclesKeptByGameService.filter(
        (keptRecord) => keptRecord.closureIdentifier !== chronicleClosureRecord.closureIdentifier,
      ),
      chronicleClosureRecord,
    ]
  }
  const recordsOfOtherClosures = readClosedChronicleArchiveFromBrowserStorage().filter(
    (storedRecord) => storedRecord.closureIdentifier !== chronicleClosureRecord.closureIdentifier,
  )
  const updatedArchive = [...recordsOfOtherClosures, chronicleClosureRecord].slice(-maximumStoredClosedChronicleCount)
  try {
    window.localStorage.setItem(closedChronicleArchiveStorageKey, JSON.stringify(updatedArchive))
  } catch {
    return
  }
}

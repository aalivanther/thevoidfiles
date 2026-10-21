import { sendGameServiceRequest } from './game_service_client'
import type { GameServiceResult } from './game_service_client'
import { isServiceAnswerRecord, unexpectedProfileServiceAnswer } from './profile_catalogue_requests'

export type StoredChronicleSnapshot =
  | { hasSnapshot: false; stateVersion: 0 }
  | {
      hasSnapshot: true
      stateVersion: number
      storageFormatVersion: number
      contentHash: string
      firstSavedAtUtc: string
      lastSavedAtUtc: string
      chronicleState: Record<string, unknown>
    }

export type ChronicleSnapshotReceipt = {
  stateVersion: number
  storageFormatVersion: number
  contentHash: string
  lastSavedAtUtc: string
}

export type StoredClosedChronicle = {
  closureIdentifier: string
  firstSavedAtUtc: string
  lastSavedAtUtc: string
  closureRecord: Record<string, unknown>
}

export const chronicleSnapshotVersionConflictFailureName = 'chronicle_snapshot_version_conflict'

function buildProfileChroniclePath(profileIdentifier: string, finalPathPart: string): string {
  return `/api/profiles/${encodeURIComponent(profileIdentifier)}/${finalPathPart}`
}

export async function readChronicleSnapshot(
  profileIdentifier: string,
): Promise<GameServiceResult<StoredChronicleSnapshot>> {
  const result = await sendGameServiceRequest(buildProfileChroniclePath(profileIdentifier, 'chronicle-snapshot'), {
    method: 'GET',
  })
  if (!result.wasSuccessful) {
    return result
  }
  const snapshotRecord = result.value
  if (!isServiceAnswerRecord(snapshotRecord)) {
    return unexpectedProfileServiceAnswer
  }
  if (snapshotRecord.has_snapshot === false) {
    return { wasSuccessful: true, value: { hasSnapshot: false, stateVersion: 0 } }
  }
  if (
    snapshotRecord.has_snapshot !== true ||
    typeof snapshotRecord.state_version !== 'number' ||
    typeof snapshotRecord.storage_format_version !== 'number' ||
    typeof snapshotRecord.content_hash !== 'string' ||
    typeof snapshotRecord.first_saved_at_utc !== 'string' ||
    typeof snapshotRecord.last_saved_at_utc !== 'string' ||
    !isServiceAnswerRecord(snapshotRecord.chronicle_state)
  ) {
    return unexpectedProfileServiceAnswer
  }
  return {
    wasSuccessful: true,
    value: {
      hasSnapshot: true,
      stateVersion: snapshotRecord.state_version,
      storageFormatVersion: snapshotRecord.storage_format_version,
      contentHash: snapshotRecord.content_hash,
      firstSavedAtUtc: snapshotRecord.first_saved_at_utc,
      lastSavedAtUtc: snapshotRecord.last_saved_at_utc,
      chronicleState: snapshotRecord.chronicle_state,
    },
  }
}

export async function saveChronicleSnapshot(
  profileIdentifier: string,
  expectedStateVersion: number,
  chronicleState: { storageFormatVersion: number },
  cancellationSignal?: AbortSignal,
): Promise<GameServiceResult<ChronicleSnapshotReceipt>> {
  const result = await sendGameServiceRequest(buildProfileChroniclePath(profileIdentifier, 'chronicle-snapshot'), {
    method: 'PUT',
    jsonBody: {
      expected_state_version: expectedStateVersion,
      storage_format_version: chronicleState.storageFormatVersion,
      chronicle_state: chronicleState,
    },
    cancellationSignal,
  })
  if (!result.wasSuccessful) {
    return result
  }
  const receiptRecord = result.value
  if (
    !isServiceAnswerRecord(receiptRecord) ||
    typeof receiptRecord.state_version !== 'number' ||
    typeof receiptRecord.storage_format_version !== 'number' ||
    typeof receiptRecord.content_hash !== 'string' ||
    typeof receiptRecord.last_saved_at_utc !== 'string'
  ) {
    return unexpectedProfileServiceAnswer
  }
  return {
    wasSuccessful: true,
    value: {
      stateVersion: receiptRecord.state_version,
      storageFormatVersion: receiptRecord.storage_format_version,
      contentHash: receiptRecord.content_hash,
      lastSavedAtUtc: receiptRecord.last_saved_at_utc,
    },
  }
}

export async function listClosedChronicles(
  profileIdentifier: string,
): Promise<GameServiceResult<StoredClosedChronicle[]>> {
  const result = await sendGameServiceRequest(buildProfileChroniclePath(profileIdentifier, 'closed-chronicles'), {
    method: 'GET',
  })
  if (!result.wasSuccessful) {
    return result
  }
  if (!isServiceAnswerRecord(result.value) || !Array.isArray(result.value.closed_chronicles)) {
    return unexpectedProfileServiceAnswer
  }
  const closedChronicles: StoredClosedChronicle[] = []
  for (const closedChronicleCandidate of result.value.closed_chronicles) {
    if (
      !isServiceAnswerRecord(closedChronicleCandidate) ||
      typeof closedChronicleCandidate.closure_identifier !== 'string' ||
      typeof closedChronicleCandidate.first_saved_at_utc !== 'string' ||
      typeof closedChronicleCandidate.last_saved_at_utc !== 'string' ||
      !isServiceAnswerRecord(closedChronicleCandidate.closure_record)
    ) {
      return unexpectedProfileServiceAnswer
    }
    closedChronicles.push({
      closureIdentifier: closedChronicleCandidate.closure_identifier,
      firstSavedAtUtc: closedChronicleCandidate.first_saved_at_utc,
      lastSavedAtUtc: closedChronicleCandidate.last_saved_at_utc,
      closureRecord: closedChronicleCandidate.closure_record,
    })
  }
  return { wasSuccessful: true, value: closedChronicles }
}

export async function saveClosedChronicle(
  profileIdentifier: string,
  closureRecord: { closureIdentifier: string },
): Promise<GameServiceResult<{ closureIdentifier: string }>> {
  const result = await sendGameServiceRequest(
    buildProfileChroniclePath(
      profileIdentifier,
      `closed-chronicles/${encodeURIComponent(closureRecord.closureIdentifier)}`,
    ),
    { method: 'PUT', jsonBody: { closure_record: closureRecord } },
  )
  if (!result.wasSuccessful) {
    return result
  }
  return { wasSuccessful: true, value: { closureIdentifier: closureRecord.closureIdentifier } }
}

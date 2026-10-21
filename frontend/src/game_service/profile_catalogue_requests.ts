import { sendGameServiceRequest } from './game_service_client'
import type { GameServiceFailure, GameServiceResult } from './game_service_client'

export type ProfileDescription = {
  profileIdentifier: string
  displayName: string
  createdAtUtc: string
  lastOpenedAtUtc: string | null
  archivedAtUtc: string | null
  isArchived: boolean
}

export const unexpectedProfileServiceAnswer: GameServiceFailure = {
  wasSuccessful: false,
  failureName: 'unexpected_service_answer',
  responseStatusCode: null,
}

export function isServiceAnswerRecord(candidate: unknown): candidate is Record<string, unknown> {
  return typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate)
}

function isTextOrAbsent(candidate: unknown): candidate is string | null {
  return candidate === null || typeof candidate === 'string'
}

function readProfileDescription(candidate: unknown): ProfileDescription | null {
  if (
    !isServiceAnswerRecord(candidate) ||
    typeof candidate.profile_identifier !== 'string' ||
    typeof candidate.display_name !== 'string' ||
    typeof candidate.created_at_utc !== 'string' ||
    !isTextOrAbsent(candidate.last_opened_at_utc) ||
    !isTextOrAbsent(candidate.archived_at_utc) ||
    typeof candidate.is_archived !== 'boolean'
  ) {
    return null
  }
  return {
    profileIdentifier: candidate.profile_identifier,
    displayName: candidate.display_name,
    createdAtUtc: candidate.created_at_utc,
    lastOpenedAtUtc: candidate.last_opened_at_utc,
    archivedAtUtc: candidate.archived_at_utc,
    isArchived: candidate.is_archived,
  }
}

function readProfileDescriptionResult(result: GameServiceResult<unknown>): GameServiceResult<ProfileDescription> {
  if (!result.wasSuccessful) {
    return result
  }
  const profileDescription = readProfileDescription(result.value)
  return profileDescription === null
    ? unexpectedProfileServiceAnswer
    : { wasSuccessful: true, value: profileDescription }
}

function buildProfilePath(profileIdentifier: string): string {
  return `/api/profiles/${encodeURIComponent(profileIdentifier)}`
}

export async function listProfiles(
  areArchivedProfilesIncluded = false,
): Promise<GameServiceResult<ProfileDescription[]>> {
  const result = await sendGameServiceRequest(
    areArchivedProfilesIncluded ? '/api/profiles?include_archived=true' : '/api/profiles',
    { method: 'GET' },
  )
  if (!result.wasSuccessful) {
    return result
  }
  if (!isServiceAnswerRecord(result.value) || !Array.isArray(result.value.profiles)) {
    return unexpectedProfileServiceAnswer
  }
  const profileDescriptions: ProfileDescription[] = []
  for (const profileCandidate of result.value.profiles) {
    const profileDescription = readProfileDescription(profileCandidate)
    if (profileDescription === null) {
      return unexpectedProfileServiceAnswer
    }
    profileDescriptions.push(profileDescription)
  }
  return { wasSuccessful: true, value: profileDescriptions }
}

export async function createProfile(
  displayName: string,
  requestedProfileIdentifier: string | null = null,
): Promise<GameServiceResult<ProfileDescription>> {
  return readProfileDescriptionResult(
    await sendGameServiceRequest('/api/profiles', {
      method: 'POST',
      jsonBody:
        requestedProfileIdentifier === null
          ? { display_name: displayName }
          : { display_name: displayName, profile_identifier: requestedProfileIdentifier },
    }),
  )
}

export async function readProfile(profileIdentifier: string): Promise<GameServiceResult<ProfileDescription>> {
  return readProfileDescriptionResult(await sendGameServiceRequest(buildProfilePath(profileIdentifier), { method: 'GET' }))
}

export async function renameProfile(
  profileIdentifier: string,
  displayName: string,
): Promise<GameServiceResult<ProfileDescription>> {
  return readProfileDescriptionResult(
    await sendGameServiceRequest(buildProfilePath(profileIdentifier), {
      method: 'PATCH',
      jsonBody: { display_name: displayName },
    }),
  )
}

export async function openProfile(profileIdentifier: string): Promise<GameServiceResult<ProfileDescription>> {
  return readProfileDescriptionResult(
    await sendGameServiceRequest(`${buildProfilePath(profileIdentifier)}/open`, { method: 'POST' }),
  )
}

export async function archiveProfile(profileIdentifier: string): Promise<GameServiceResult<ProfileDescription>> {
  return readProfileDescriptionResult(
    await sendGameServiceRequest(buildProfilePath(profileIdentifier), { method: 'DELETE' }),
  )
}

export async function restoreArchivedProfile(
  profileIdentifier: string,
): Promise<GameServiceResult<ProfileDescription>> {
  return readProfileDescriptionResult(
    await sendGameServiceRequest(`${buildProfilePath(profileIdentifier)}/restore`, { method: 'POST' }),
  )
}

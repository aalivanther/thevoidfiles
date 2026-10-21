import type { InteractivePieceAssistanceRequest, InteractivePieceAttemptRequest, InvestigatorActionRequest } from './archive_turn_contract'
import { readArchiveDirectorRunNote } from '../game_service/archive_director_run_note'

export type RetriableDirectorRequest =
  | { kind: 'investigator_action'; actionRequest: InvestigatorActionRequest }
  | { kind: 'interactive_piece_attempt'; attemptRequest: InteractivePieceAttemptRequest }
  | { kind: 'interactive_piece_assistance'; assistanceRequest: InteractivePieceAssistanceRequest }

function storageKey(): string | null {
  const note = readArchiveDirectorRunNote()
  return note?.directorKindName === 'game_service'
    ? `the_void_files_pending_request_${note.profileIdentifier}_${note.archiveCaseIdentifier}`
    : null
}

export function readRequestActionKey(request: RetriableDirectorRequest): string {
  return request.kind === 'investigator_action' ? request.actionRequest.actionKey
    : request.kind === 'interactive_piece_attempt' ? request.attemptRequest.actionKey : request.assistanceRequest.actionKey
}

export function storePendingArchiveRequest(request: RetriableDirectorRequest): void {
  const key = storageKey()
  if (key) {
    window.localStorage.setItem(key, JSON.stringify(request))
  }
}

export function readPendingArchiveRequest(): RetriableDirectorRequest | null {
  const key = storageKey()
  if (!key) return null
  try {
    const candidate = JSON.parse(window.localStorage.getItem(key) ?? 'null') as RetriableDirectorRequest | null
    if (!candidate || !['investigator_action', 'interactive_piece_attempt', 'interactive_piece_assistance'].includes(candidate.kind)) return null
    return typeof readRequestActionKey(candidate) === 'string' ? candidate : null
  } catch {
    return null
  }
}

export function clearPendingArchiveRequest(actionKey: string): void {
  const key = storageKey()
  const pending = readPendingArchiveRequest()
  if (key && pending && readRequestActionKey(pending) === actionKey) {
    window.localStorage.removeItem(key)
  }
}

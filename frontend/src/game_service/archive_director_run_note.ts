export type ArchiveDirectorRunNote =
  | { directorKindName: 'demonstration' }
  | {
      directorKindName: 'game_service'
      profileIdentifier: string
      whisperIdentifier: string
      archiveCaseIdentifier: string
      stateVersionOffset: number
    }

const archiveDirectorRunNoteStorageKey = 'the_void_files_archive_director_run_note'

let archiveDirectorRunNoteKeptInMemory: ArchiveDirectorRunNote | null = null

export function readArchiveDirectorRunNote(): ArchiveDirectorRunNote | null {
  return archiveDirectorRunNoteKeptInMemory ?? readArchiveDirectorRunNoteFromBrowserStorage()
}

function readArchiveDirectorRunNoteFromBrowserStorage(): ArchiveDirectorRunNote | null {
  try {
    const storedText = window.sessionStorage.getItem(archiveDirectorRunNoteStorageKey)
    if (!storedText) {
      return null
    }
    const parsedCandidate: unknown = JSON.parse(storedText)
    if (typeof parsedCandidate !== 'object' || parsedCandidate === null) {
      return null
    }
    const possibleNote = parsedCandidate as Record<string, unknown>
    if (possibleNote.directorKindName === 'demonstration') {
      return { directorKindName: 'demonstration' }
    }
    if (
      possibleNote.directorKindName === 'game_service' &&
      typeof possibleNote.profileIdentifier === 'string' &&
      typeof possibleNote.whisperIdentifier === 'string' &&
      typeof possibleNote.archiveCaseIdentifier === 'string' &&
      typeof possibleNote.stateVersionOffset === 'number'
    ) {
      return {
        directorKindName: 'game_service',
        profileIdentifier: possibleNote.profileIdentifier,
        whisperIdentifier: possibleNote.whisperIdentifier,
        archiveCaseIdentifier: possibleNote.archiveCaseIdentifier,
        stateVersionOffset: possibleNote.stateVersionOffset,
      }
    }
    return null
  } catch {
    return null
  }
}

export function writeArchiveDirectorRunNote(archiveDirectorRunNote: ArchiveDirectorRunNote) {
  archiveDirectorRunNoteKeptInMemory = archiveDirectorRunNote
  try {
    window.sessionStorage.setItem(archiveDirectorRunNoteStorageKey, JSON.stringify(archiveDirectorRunNote))
  } catch {
    return
  }
}

export function clearArchiveDirectorRunNote() {
  archiveDirectorRunNoteKeptInMemory = null
  try {
    window.sessionStorage.removeItem(archiveDirectorRunNoteStorageKey)
  } catch {
    return
  }
}

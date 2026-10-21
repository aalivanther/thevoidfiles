import { readArchiveDirectorRunNote, writeArchiveDirectorRunNote } from '../game_service/archive_director_run_note'
import { readingLogCopy } from '../copy/archive_chat_engine/reading_log_copy'
import { readGameServicePresence } from '../game_service/game_service_presence'
import type { GameServicePresence } from '../game_service/game_service_presence'
import type { ArchiveOpeningFallbackReasonName } from '../game_service/remote_archive_director_service'
import type { ArchiveDirectorService } from './archive_turn_contract'
import { readLatestChronicleState } from './chronicle_state'

let pendingDemonstrationArchiveDirectorService: Promise<ArchiveDirectorService> | null = null
let pendingRemoteArchiveDirectorService: Promise<ArchiveDirectorService> | null = null
let pendingArchiveDirectorService: Promise<ArchiveDirectorService> | null = null

function loadDemonstrationArchiveDirectorService(): Promise<ArchiveDirectorService> {
  if (!pendingDemonstrationArchiveDirectorService) {
    pendingDemonstrationArchiveDirectorService = import('../demonstration/demonstration_archive_director_service')
      .then((loadedModule) => loadedModule.createDemonstrationArchiveDirectorService())
      .catch((loadingError: unknown) => {
        pendingDemonstrationArchiveDirectorService = null
        throw loadingError
      })
  }
  return pendingDemonstrationArchiveDirectorService
}

function loadRemoteArchiveDirectorService(): Promise<ArchiveDirectorService> {
  if (!pendingRemoteArchiveDirectorService) {
    pendingRemoteArchiveDirectorService = Promise.all([
      import('../game_service/remote_archive_director_service'),
      readGameServicePresence(),
    ])
      .then(([loadedModule, gameServicePresence]) => loadedModule.createRemoteArchiveDirectorService(gameServicePresence))
      .catch((loadingError: unknown) => {
        pendingRemoteArchiveDirectorService = null
        throw loadingError
      })
  }
  return pendingRemoteArchiveDirectorService
}

async function chooseArchiveDirectorServiceForRunInProgress(): Promise<ArchiveDirectorService> {
  const chronicleState = readLatestChronicleState()
  const archiveDirectorRunNote = readArchiveDirectorRunNote()
  if (archiveDirectorRunNote?.directorKindName === 'demonstration') {
    return chronicleState.chosenWhisperIdentifier === demonstrationLighthouseWhisperIdentifier
      ? loadDemonstrationArchiveDirectorService()
      : loadRemoteArchiveDirectorService()
  }
  if (archiveDirectorRunNote?.directorKindName === 'game_service') {
    return archiveDirectorRunNote.whisperIdentifier === chronicleState.chosenWhisperIdentifier
      ? loadRemoteArchiveDirectorService()
      : loadDemonstrationArchiveDirectorService()
  }
  try {
    const gameServicePresence = await readGameServicePresence()
    if (gameServicePresence.activeProfileIdentifier !== null && chronicleState.chosenWhisperIdentifier !== null) {
      const loadedModule = await import('../game_service/remote_archive_director_service')
      const wasRemoteRunRecovered = await loadedModule.recoverRemoteArchiveRunInProgress(
        gameServicePresence.activeProfileIdentifier,
        chronicleState.chosenWhisperIdentifier,
      )
      if (wasRemoteRunRecovered) {
        return loadRemoteArchiveDirectorService()
      }
    }
  } catch {
    if (chronicleState.chosenWhisperIdentifier !== null) {
      return loadRemoteArchiveDirectorService()
    }
    return loadDemonstrationArchiveDirectorService()
  }
  if (chronicleState.chosenWhisperIdentifier !== null) {
    return loadRemoteArchiveDirectorService()
  }
  writeArchiveDirectorRunNote({ directorKindName: 'demonstration' })
  return loadDemonstrationArchiveDirectorService()
}

const demonstrationLighthouseWhisperIdentifier = 'lighthouse_counts_one_more'

const knownFallbackReasonNames: readonly ArchiveOpeningFallbackReasonName[] = [
  'access_key_missing',
  'provider_rejected',
  'provider_unavailable',
  'whisper_material_missing',
  'whisper_absent_from_service_offer',
  'service_unavailable',
]

function readFallbackReasonName(openingError: unknown): ArchiveOpeningFallbackReasonName {
  const candidateReasonName =
    typeof openingError === 'object' && openingError !== null && 'fallbackReasonName' in openingError
      ? openingError.fallbackReasonName
      : null
  return knownFallbackReasonNames.find((knownReasonName) => knownReasonName === candidateReasonName) ?? 'service_unavailable'
}

function shouldOpenDemonstrationArchive(
  whisperIdentifier: string,
  gameServicePresence: GameServicePresence | null,
): boolean {
  return (
    whisperIdentifier === demonstrationLighthouseWhisperIdentifier &&
    (gameServicePresence === null ||
      gameServicePresence.activeProfileIdentifier === null ||
      gameServicePresence.providerModeName !== 'real')
  )
}

function createChoosingArchiveDirectorService(): ArchiveDirectorService {
  return {
    async openArchive(whisperIdentifier) {
      let fallbackReasonName: ArchiveOpeningFallbackReasonName | null = null
      let gameServicePresence: GameServicePresence | null = null
      try {
        gameServicePresence = await readGameServicePresence()
        if (gameServicePresence.activeProfileIdentifier !== null) {
          const remoteArchiveDirectorService = await loadRemoteArchiveDirectorService()
          return await remoteArchiveDirectorService.openArchive(whisperIdentifier)
        }
      } catch (openingError: unknown) {
        pendingRemoteArchiveDirectorService = null
        fallbackReasonName = readFallbackReasonName(openingError)
        if (!shouldOpenDemonstrationArchive(whisperIdentifier, gameServicePresence)) {
          throw openingError
        }
      }
      if (!shouldOpenDemonstrationArchive(whisperIdentifier, gameServicePresence)) {
        throw new Error('archive_opening_unavailable')
      }
      writeArchiveDirectorRunNote({ directorKindName: 'demonstration' })
      const demonstrationArchiveDirectorService = await loadDemonstrationArchiveDirectorService()
      const demonstrationOpeningResolution = await demonstrationArchiveDirectorService.openArchive(whisperIdentifier)
      if (fallbackReasonName === null) {
        return demonstrationOpeningResolution
      }
      return {
        ...demonstrationOpeningResolution,
        openingEntries: [
          {
            voice: 'system_notice',
            noticeKindName: 'demonstration_limit',
            plainParagraphs: [readingLogCopy.demonstrationFallbackNotices[fallbackReasonName]],
          },
          ...demonstrationOpeningResolution.openingEntries,
        ],
      }
    },
    async resolveInvestigatorAction(actionRequest, reportDirectorTurnPhase) {
      const chosenArchiveDirectorService = await chooseArchiveDirectorServiceForRunInProgress()
      return chosenArchiveDirectorService.resolveInvestigatorAction(actionRequest, reportDirectorTurnPhase)
    },
    async attemptInteractivePiece(attemptRequest, reportDirectorTurnPhase) {
      const chosenArchiveDirectorService = await chooseArchiveDirectorServiceForRunInProgress()
      return chosenArchiveDirectorService.attemptInteractivePiece(attemptRequest, reportDirectorTurnPhase)
    },
    async requestInteractivePieceAssistance(assistanceRequest) {
      const chosenArchiveDirectorService = await chooseArchiveDirectorServiceForRunInProgress()
      return chosenArchiveDirectorService.requestInteractivePieceAssistance(assistanceRequest)
    },
  }
}

export function loadArchiveDirectorService(): Promise<ArchiveDirectorService> {
  pendingArchiveDirectorService ??= Promise.resolve(createChoosingArchiveDirectorService())
  return pendingArchiveDirectorService
}

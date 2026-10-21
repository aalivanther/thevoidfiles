import { convertMarkedParagraphToSpeakableText, splitSpeakableTextIntoRequests } from './speakable_narration_text'
import { requestSpeechAudio } from './voice_service_client'
import type { VoiceServiceFailureName, VoiceServiceResult } from './voice_service_client'

export type NarrationVoiceOutcome = 'finished' | 'stopped' | VoiceServiceFailureName | 'playback_blocked'

export type NarrationVoiceRequest = {
  ownerIdentifier: string
  voiceIdentifier: string
  markedParagraphs: readonly string[]
  onPlaybackStarted?: () => void
  onSettled?: (narrationVoiceOutcome: NarrationVoiceOutcome) => void
}

type QueuedSpeechPiece = {
  speechBatch: SpeechBatch
  text: string
  cancellationController: AbortController
  audioResultPromise: Promise<VoiceServiceResult<Blob>> | null
}

type SpeechBatch = {
  ownerIdentifier: string
  voiceIdentifier: string
  remainingPieceCount: number
  hasSettled: boolean
  onPlaybackStarted: (() => void) | null
  onSettled: ((narrationVoiceOutcome: NarrationVoiceOutcome) => void) | null
}

const maximumSpeechRequestLength = 2400
const absentServiceQuietPeriodMilliseconds = 30000

let queuedSpeechPieces: QueuedSpeechPiece[] = []
let speechPieceBeingPlayed: QueuedSpeechPiece | null = null
let audioElementBeingPlayed: HTMLAudioElement | null = null
let audioAddressBeingPlayed: string | null = null
let narrationVoiceVolume = 0.8
let absentServiceQuietPeriodEndTimestamp = 0
const speakingStateListeners = new Set<() => void>()

function notifySpeakingStateListeners() {
  speakingStateListeners.forEach((speakingStateListener) => speakingStateListener())
}

export function subscribeToNarrationVoiceSpeakingState(speakingStateListener: () => void): () => void {
  speakingStateListeners.add(speakingStateListener)
  return () => {
    speakingStateListeners.delete(speakingStateListener)
  }
}

export function readNarrationVoiceSpeakingOwnerIdentifier(): string | null {
  return speechPieceBeingPlayed?.speechBatch.ownerIdentifier ?? null
}

function settleSpeechBatch(speechBatch: SpeechBatch, narrationVoiceOutcome: NarrationVoiceOutcome) {
  if (speechBatch.hasSettled) {
    return
  }
  speechBatch.hasSettled = true
  speechBatch.onSettled?.(narrationVoiceOutcome)
}

function releaseAudioBeingPlayed() {
  if (audioElementBeingPlayed) {
    audioElementBeingPlayed.onended = null
    audioElementBeingPlayed.onerror = null
    audioElementBeingPlayed.pause()
    audioElementBeingPlayed.removeAttribute('src')
    audioElementBeingPlayed = null
  }
  if (audioAddressBeingPlayed) {
    URL.revokeObjectURL(audioAddressBeingPlayed)
    audioAddressBeingPlayed = null
  }
}

function startAudioRequest(queuedSpeechPiece: QueuedSpeechPiece) {
  if (!queuedSpeechPiece.audioResultPromise) {
    queuedSpeechPiece.audioResultPromise = requestSpeechAudio(
      queuedSpeechPiece.text,
      queuedSpeechPiece.speechBatch.voiceIdentifier,
      queuedSpeechPiece.cancellationController.signal,
    )
  }
  return queuedSpeechPiece.audioResultPromise
}

function discardSpeechPieces(shouldDiscard: (queuedSpeechPiece: QueuedSpeechPiece) => boolean, narrationVoiceOutcome: NarrationVoiceOutcome) {
  const discardedSpeechPieces = queuedSpeechPieces.filter(shouldDiscard)
  queuedSpeechPieces = queuedSpeechPieces.filter((queuedSpeechPiece) => !shouldDiscard(queuedSpeechPiece))
  if (speechPieceBeingPlayed && shouldDiscard(speechPieceBeingPlayed)) {
    discardedSpeechPieces.push(speechPieceBeingPlayed)
    speechPieceBeingPlayed = null
    releaseAudioBeingPlayed()
  }
  discardedSpeechPieces.forEach((discardedSpeechPiece) => {
    discardedSpeechPiece.cancellationController.abort()
    settleSpeechBatch(discardedSpeechPiece.speechBatch, narrationVoiceOutcome)
  })
  return discardedSpeechPieces.length > 0
}

function finishSpeechPieceBeingPlayed(finishedSpeechPiece: QueuedSpeechPiece) {
  if (speechPieceBeingPlayed !== finishedSpeechPiece) {
    return
  }
  speechPieceBeingPlayed = null
  releaseAudioBeingPlayed()
  finishedSpeechPiece.speechBatch.remainingPieceCount -= 1
  if (finishedSpeechPiece.speechBatch.remainingPieceCount <= 0) {
    settleSpeechBatch(finishedSpeechPiece.speechBatch, 'finished')
  }
  void playNextSpeechPiece()
}

function abandonEverySpeechPiece(narrationVoiceOutcome: NarrationVoiceOutcome) {
  discardSpeechPieces(() => true, narrationVoiceOutcome)
  notifySpeakingStateListeners()
}

async function playNextSpeechPiece() {
  if (speechPieceBeingPlayed) {
    return
  }
  const nextSpeechPiece = queuedSpeechPieces.shift()
  if (!nextSpeechPiece) {
    notifySpeakingStateListeners()
    return
  }
  speechPieceBeingPlayed = nextSpeechPiece
  notifySpeakingStateListeners()
  const audioResult = await startAudioRequest(nextSpeechPiece)
  if (speechPieceBeingPlayed !== nextSpeechPiece) {
    return
  }
  if (!audioResult.wasSuccessful) {
    if (audioResult.failureName === 'service_absent') {
      absentServiceQuietPeriodEndTimestamp = Date.now() + absentServiceQuietPeriodMilliseconds
    }
    abandonEverySpeechPiece(audioResult.failureName)
    return
  }
  if (queuedSpeechPieces.length > 0) {
    void startAudioRequest(queuedSpeechPieces[0])
  }
  const audioElement = new Audio()
  audioAddressBeingPlayed = URL.createObjectURL(audioResult.value)
  audioElementBeingPlayed = audioElement
  audioElement.volume = narrationVoiceVolume
  audioElement.onended = () => finishSpeechPieceBeingPlayed(nextSpeechPiece)
  audioElement.onerror = () => finishSpeechPieceBeingPlayed(nextSpeechPiece)
  audioElement.src = audioAddressBeingPlayed
  try {
    await audioElement.play()
    if (speechPieceBeingPlayed === nextSpeechPiece) {
      nextSpeechPiece.speechBatch.onPlaybackStarted?.()
    }
  } catch {
    if (speechPieceBeingPlayed === nextSpeechPiece) {
      abandonEverySpeechPiece('playback_blocked')
    }
  }
}

export function changeNarrationVoiceVolume(volume: number) {
  narrationVoiceVolume = Math.min(1, Math.max(0, Number.isFinite(volume) ? volume : 0))
  if (audioElementBeingPlayed) {
    audioElementBeingPlayed.volume = narrationVoiceVolume
  }
}

export function enqueueNarrationVoice(narrationVoiceRequest: NarrationVoiceRequest) {
  const speechTexts = narrationVoiceRequest.markedParagraphs.flatMap((markedParagraphText) =>
    splitSpeakableTextIntoRequests(convertMarkedParagraphToSpeakableText(markedParagraphText), maximumSpeechRequestLength),
  )
  const speechBatch: SpeechBatch = {
    ownerIdentifier: narrationVoiceRequest.ownerIdentifier,
    voiceIdentifier: narrationVoiceRequest.voiceIdentifier,
    remainingPieceCount: speechTexts.length,
    hasSettled: false,
    onPlaybackStarted: narrationVoiceRequest.onPlaybackStarted ?? null,
    onSettled: narrationVoiceRequest.onSettled ?? null,
  }
  if (speechTexts.length === 0) {
    settleSpeechBatch(speechBatch, 'finished')
    return
  }
  if (Date.now() < absentServiceQuietPeriodEndTimestamp) {
    settleSpeechBatch(speechBatch, 'service_absent')
    return
  }
  speechTexts.forEach((text) => {
    queuedSpeechPieces.push({
      speechBatch,
      text,
      cancellationController: new AbortController(),
      audioResultPromise: null,
    })
  })
  void playNextSpeechPiece()
}

export function forgetAbsentVoiceServiceQuietPeriod() {
  absentServiceQuietPeriodEndTimestamp = 0
}

export function stopNarrationVoiceOwnedBy(ownerIdentifier: string) {
  const wasAnythingDiscarded = discardSpeechPieces(
    (queuedSpeechPiece) => queuedSpeechPiece.speechBatch.ownerIdentifier === ownerIdentifier,
    'stopped',
  )
  if (wasAnythingDiscarded) {
    notifySpeakingStateListeners()
    void playNextSpeechPiece()
  }
}

export function stopEveryNarrationVoice() {
  abandonEverySpeechPiece('stopped')
}

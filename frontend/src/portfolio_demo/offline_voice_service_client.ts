import type * as RealVoiceServiceClient from '../voice/voice_service_client'

export type {
  AvailableNarrationVoice,
  VoiceServiceFailureName,
  VoiceServiceResult,
  VoiceServiceStatus,
} from '../voice/voice_service_client'

const absentVoiceServiceFailure = { wasSuccessful: false, failureName: 'service_absent' } as const

export const readVoiceServiceStatus: typeof RealVoiceServiceClient.readVoiceServiceStatus = async () =>
  absentVoiceServiceFailure

export const storeVoiceAccessKey: typeof RealVoiceServiceClient.storeVoiceAccessKey = async () => absentVoiceServiceFailure

export const deleteVoiceAccessKey: typeof RealVoiceServiceClient.deleteVoiceAccessKey = async () => absentVoiceServiceFailure

export const listAvailableNarrationVoices: typeof RealVoiceServiceClient.listAvailableNarrationVoices = async () =>
  absentVoiceServiceFailure

export const requestSpeechAudio: typeof RealVoiceServiceClient.requestSpeechAudio = async (_text, _voiceIdentifier, cancellationSignal) =>
  cancellationSignal.aborted ? { wasSuccessful: false, failureName: 'request_cancelled' } : absentVoiceServiceFailure

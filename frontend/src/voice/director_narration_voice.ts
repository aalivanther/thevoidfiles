import { useEffect, useRef, useState } from 'react'
import type { ArchiveLogEntry } from '../game_state/archive_turn_contract'
import { usePlayerSettings } from '../settings/player_settings'
import { readNarrationVoicePreference, saveNarrationVoicePreference } from './narration_voice_preference'
import { changeNarrationVoiceVolume, enqueueNarrationVoice, stopEveryNarrationVoice, stopNarrationVoiceOwnedBy } from './narration_voice_player'
import { listAvailableNarrationVoices } from './voice_service_client'

const narrationVoiceStartDelayMilliseconds = 120
const alreadySpokenLogEntryIdentifiers = new Set<string>()
let pendingNarrationVoiceIdentifier: Promise<string | null> | null = null

async function resolveNarrationVoiceIdentifier(): Promise<string | null> {
  const storedPreference = readNarrationVoicePreference()
  if (storedPreference.hasPlayerDecidedNarrationVoiceUse && !storedPreference.isNarrationVoiceEnabled) {
    return null
  }
  if (storedPreference.chosenVoiceIdentifier && storedPreference.isNarrationVoiceEnabled) {
    return storedPreference.chosenVoiceIdentifier
  }
  const voicesResult = await listAvailableNarrationVoices()
  if (!voicesResult.wasSuccessful || voicesResult.value.length === 0) {
    return storedPreference.chosenVoiceIdentifier
  }
  const chosenVoice =
    voicesResult.value.find((availableVoice) => availableVoice.speaksSpanish) ?? voicesResult.value[0]
  saveNarrationVoicePreference({
    isNarrationVoiceEnabled: true,
    chosenVoiceIdentifier: chosenVoice.voiceIdentifier,
    chosenVoiceVisibleName: chosenVoice.visibleName,
    hasPlayerDecidedNarrationVoiceUse: storedPreference.hasPlayerDecidedNarrationVoiceUse,
  })
  return chosenVoice.voiceIdentifier
}

function readOrResolveNarrationVoiceIdentifier(): Promise<string | null> {
  pendingNarrationVoiceIdentifier ??= resolveNarrationVoiceIdentifier().finally(() => {
    pendingNarrationVoiceIdentifier = null
  })
  return pendingNarrationVoiceIdentifier
}

export function useDirectorNarrationVoice(logEntry: ArchiveLogEntry, isEntryBeingRevealed: boolean) {
  const { playerSettings } = usePlayerSettings()
  const { isSoundEnabled, soundVolume } = playerSettings
  const logEntryIdentifier = logEntry.identifier
  const markedParagraphs = logEntry.voice === 'director_narration' ? logEntry.markedParagraphs : null
  const markedParagraphsContentKey = markedParagraphs ? markedParagraphs.join('\n') : null
  const latestMarkedParagraphs = useRef(markedParagraphs)
  const [hasRevealStarted, setHasRevealStarted] = useState(isEntryBeingRevealed)
  if (isEntryBeingRevealed && !hasRevealStarted) {
    setHasRevealStarted(true)
  }

  useEffect(() => {
    latestMarkedParagraphs.current = markedParagraphs
  }, [markedParagraphs])

  useEffect(() => {
    changeNarrationVoiceVolume(isSoundEnabled ? soundVolume : 0)
    if (!isSoundEnabled) {
      stopEveryNarrationVoice()
    }
  }, [isSoundEnabled, soundVolume])

  useEffect(() => {
    if (
      markedParagraphsContentKey === null ||
      logEntry.turnIdentifier !== null ||
      !hasRevealStarted ||
      !isSoundEnabled ||
      alreadySpokenLogEntryIdentifiers.has(logEntryIdentifier)
    ) {
      return
    }
    const startTimeoutIdentifier = window.setTimeout(() => {
      void readOrResolveNarrationVoiceIdentifier().then((voiceIdentifier) => {
        if (!voiceIdentifier || alreadySpokenLogEntryIdentifiers.has(logEntryIdentifier)) {
          return
        }
        const markedParagraphsToSpeak = latestMarkedParagraphs.current
        if (!markedParagraphsToSpeak) {
          return
        }
        alreadySpokenLogEntryIdentifiers.add(logEntryIdentifier)
        enqueueNarrationVoice({
          ownerIdentifier: logEntryIdentifier,
          voiceIdentifier,
          markedParagraphs: markedParagraphsToSpeak,
        })
      })
    }, narrationVoiceStartDelayMilliseconds)
    return () => window.clearTimeout(startTimeoutIdentifier)
  }, [markedParagraphsContentKey, hasRevealStarted, isSoundEnabled, logEntryIdentifier, logEntry.turnIdentifier])

  useEffect(() => {
    return () => stopNarrationVoiceOwnedBy(logEntryIdentifier)
  }, [logEntryIdentifier])
}

export type NarrationVoicePreference = {
  isNarrationVoiceEnabled: boolean
  chosenVoiceIdentifier: string | null
  chosenVoiceVisibleName: string | null
  hasPlayerDecidedNarrationVoiceUse: boolean
}

const narrationVoicePreferenceStorageKey = 'the_void_files_narration_voice_preference'

export const silentNarrationVoicePreference: NarrationVoicePreference = {
  isNarrationVoiceEnabled: false,
  chosenVoiceIdentifier: null,
  chosenVoiceVisibleName: null,
  hasPlayerDecidedNarrationVoiceUse: false,
}

export function readNarrationVoicePreference(): NarrationVoicePreference {
  try {
    const storedText = window.localStorage.getItem(narrationVoicePreferenceStorageKey)
    if (!storedText) {
      return silentNarrationVoicePreference
    }
    const parsedCandidate: unknown = JSON.parse(storedText)
    if (typeof parsedCandidate !== 'object' || parsedCandidate === null) {
      return silentNarrationVoicePreference
    }
    const storedPreference = parsedCandidate as Partial<NarrationVoicePreference>
    const chosenVoiceIdentifier =
      typeof storedPreference.chosenVoiceIdentifier === 'string' && storedPreference.chosenVoiceIdentifier.length > 0
        ? storedPreference.chosenVoiceIdentifier
        : null
    const hasPlayerDecidedNarrationVoiceUse = storedPreference.hasPlayerDecidedNarrationVoiceUse === true
    return {
      isNarrationVoiceEnabled:
        chosenVoiceIdentifier !== null &&
        (storedPreference.isNarrationVoiceEnabled === true || !hasPlayerDecidedNarrationVoiceUse),
      hasPlayerDecidedNarrationVoiceUse,
      chosenVoiceIdentifier,
      chosenVoiceVisibleName:
        chosenVoiceIdentifier !== null && typeof storedPreference.chosenVoiceVisibleName === 'string'
          ? storedPreference.chosenVoiceVisibleName
          : null,
    }
  } catch {
    return silentNarrationVoicePreference
  }
}

export function saveNarrationVoicePreference(narrationVoicePreference: NarrationVoicePreference) {
  try {
    window.localStorage.setItem(narrationVoicePreferenceStorageKey, JSON.stringify(narrationVoicePreference))
  } catch {
    return
  }
}

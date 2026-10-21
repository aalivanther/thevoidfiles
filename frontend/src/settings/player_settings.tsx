import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type TextRevealSpeed = 'calm' | 'brisk' | 'instant'
export type NarrativeTextSize = 'small' | 'medium' | 'large'
export type ScreenEffectsIntensity = 'full' | 'softened' | 'minimal'

export type PlayerSettings = {
  textRevealSpeed: TextRevealSpeed
  narrativeTextSize: NarrativeTextSize
  isReducedMotionRequested: boolean
  screenEffectsIntensity: ScreenEffectsIntensity
  isDreamFogEnabled: boolean
  areUnsettlingApparitionsEnabled: boolean
  isWeatherSoundEnabled: boolean
  isMusicEnabled: boolean
  musicVolume: number
  isSoundEnabled: boolean
  soundVolume: number
  isKeySoundEnabled: boolean
  isHapticFeedbackEnabled: boolean
}

export const charactersPerSecondByTextRevealSpeed: Record<TextRevealSpeed, number> = {
  calm: 32,
  brisk: 70,
  instant: Number.POSITIVE_INFINITY,
}

const playerSettingsStorageKey = 'the_void_files_player_settings'

const defaultPlayerSettings: PlayerSettings = {
  textRevealSpeed: 'calm',
  narrativeTextSize: 'medium',
  isReducedMotionRequested: false,
  screenEffectsIntensity: 'full',
  isDreamFogEnabled: true,
  areUnsettlingApparitionsEnabled: true,
  isWeatherSoundEnabled: true,
  isMusicEnabled: true,
  musicVolume: 0.55,
  isSoundEnabled: true,
  soundVolume: 0.8,
  isKeySoundEnabled: true,
  isHapticFeedbackEnabled: true,
}

function readStoredPlayerSettings(): PlayerSettings {
  try {
    const storedText = window.localStorage.getItem(playerSettingsStorageKey)
    if (!storedText) {
      return defaultPlayerSettings
    }
    const parsedCandidate: unknown = JSON.parse(storedText)
    if (typeof parsedCandidate !== 'object' || parsedCandidate === null) {
      return defaultPlayerSettings
    }
    const storedSettings = parsedCandidate as Partial<PlayerSettings>
    return {
      textRevealSpeed:
        storedSettings.textRevealSpeed && storedSettings.textRevealSpeed in charactersPerSecondByTextRevealSpeed
          ? storedSettings.textRevealSpeed
          : defaultPlayerSettings.textRevealSpeed,
      narrativeTextSize:
        storedSettings.narrativeTextSize === 'small' ||
        storedSettings.narrativeTextSize === 'medium' ||
        storedSettings.narrativeTextSize === 'large'
          ? storedSettings.narrativeTextSize
          : defaultPlayerSettings.narrativeTextSize,
      isReducedMotionRequested: storedSettings.isReducedMotionRequested === true,
      screenEffectsIntensity:
        storedSettings.screenEffectsIntensity === 'full' ||
        storedSettings.screenEffectsIntensity === 'softened' ||
        storedSettings.screenEffectsIntensity === 'minimal'
          ? storedSettings.screenEffectsIntensity
          : defaultPlayerSettings.screenEffectsIntensity,
      isDreamFogEnabled: storedSettings.isDreamFogEnabled !== false,
      areUnsettlingApparitionsEnabled: storedSettings.areUnsettlingApparitionsEnabled !== false,
      isWeatherSoundEnabled: storedSettings.isWeatherSoundEnabled !== false,
      isMusicEnabled: storedSettings.isMusicEnabled !== false,
      musicVolume:
        typeof storedSettings.musicVolume === 'number' && storedSettings.musicVolume >= 0 && storedSettings.musicVolume <= 1
          ? storedSettings.musicVolume
          : defaultPlayerSettings.musicVolume,
      isSoundEnabled: storedSettings.isSoundEnabled !== false,
      soundVolume:
        typeof storedSettings.soundVolume === 'number' && storedSettings.soundVolume >= 0 && storedSettings.soundVolume <= 1
          ? storedSettings.soundVolume
          : defaultPlayerSettings.soundVolume,
      isKeySoundEnabled: storedSettings.isKeySoundEnabled !== false,
      isHapticFeedbackEnabled: storedSettings.isHapticFeedbackEnabled !== false,
    }
  } catch {
    return defaultPlayerSettings
  }
}

function readOperatingSystemReducedMotionPreference(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

type PlayerSettingsContextValue = {
  playerSettings: PlayerSettings
  shouldReduceMotion: boolean
  updatePlayerSettings: (changedSettings: Partial<PlayerSettings>) => void
}

const PlayerSettingsContext = createContext<PlayerSettingsContextValue | null>(null)

export function PlayerSettingsProvider({ children }: { children: ReactNode }) {
  const [playerSettings, setPlayerSettings] = useState<PlayerSettings>(readStoredPlayerSettings)
  const [doesOperatingSystemReduceMotion, setDoesOperatingSystemReduceMotion] = useState(
    readOperatingSystemReducedMotionPreference,
  )

  useEffect(() => {
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handlePreferenceChange = () => setDoesOperatingSystemReduceMotion(reducedMotionQuery.matches)
    reducedMotionQuery.addEventListener('change', handlePreferenceChange)
    return () => reducedMotionQuery.removeEventListener('change', handlePreferenceChange)
  }, [])

  const shouldReduceMotion = playerSettings.isReducedMotionRequested || doesOperatingSystemReduceMotion

  useEffect(() => {
    document.documentElement.dataset.textSize = playerSettings.narrativeTextSize
    document.documentElement.dataset.reducedMotion = String(shouldReduceMotion)
    document.documentElement.dataset.screenEffectsIntensity = playerSettings.screenEffectsIntensity
    try {
      window.localStorage.setItem(playerSettingsStorageKey, JSON.stringify(playerSettings))
    } catch {
      return
    }
  }, [playerSettings, shouldReduceMotion])

  const updatePlayerSettings = useCallback((changedSettings: Partial<PlayerSettings>) => {
    setPlayerSettings((previousSettings) => ({ ...previousSettings, ...changedSettings }))
  }, [])

  const contextValue = useMemo(
    () => ({ playerSettings, shouldReduceMotion, updatePlayerSettings }),
    [playerSettings, shouldReduceMotion, updatePlayerSettings],
  )

  return <PlayerSettingsContext.Provider value={contextValue}>{children}</PlayerSettingsContext.Provider>
}

export function usePlayerSettings(): PlayerSettingsContextValue {
  const contextValue = useContext(PlayerSettingsContext)
  if (!contextValue) {
    throw new Error('usePlayerSettings requires PlayerSettingsProvider')
  }
  return contextValue
}

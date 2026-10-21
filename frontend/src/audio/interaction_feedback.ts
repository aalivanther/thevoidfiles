import { Howl, Howler } from 'howler'
import { useCallback, useEffect, useRef } from 'react'
import { usePlayerSettings } from '../settings/player_settings'

export type InteractionSoundName =
  | 'option_click'
  | 'option_hover'
  | 'typewriter_key'
  | 'action_sent'
  | 'panel_open'
  | 'panel_close'
  | 'confirmation'
  | 'stamp_impact'
  | 'anomaly_glitch'
  | 'rejection'
  | 'screen_tear'
  | 'distant_presence'
  | 'rising_whoosh'
  | 'falling_whoosh'
  | 'heavy_impact'
  | 'mind_fracture'
  | 'final_toll'
  | 'heartbeat'
  | 'high_pitch'
  | 'pen_scratch'

export type InteractionFeedbackPlaybackOptions = {
  playbackRateMultiplier?: number
  volumeMultiplier?: number
}

const volumeByInteractionSoundName: Record<InteractionSoundName, number> = {
  option_click: 0.5,
  option_hover: 0.12,
  typewriter_key: 0.22,
  action_sent: 0.4,
  panel_open: 0.35,
  panel_close: 0.3,
  confirmation: 0.4,
  stamp_impact: 0.8,
  anomaly_glitch: 0.35,
  rejection: 0.4,
  screen_tear: 0.3,
  distant_presence: 0.34,
  rising_whoosh: 0.4,
  falling_whoosh: 0.4,
  heavy_impact: 0.85,
  mind_fracture: 0.4,
  final_toll: 0.8,
  heartbeat: 0.55,
  high_pitch: 0.22,
  pen_scratch: 0.3,
}

const playbackRateByInteractionSoundName: Partial<Record<InteractionSoundName, number>> = {
  mind_fracture: 0.5,
}

const soundFileNamesByInteractionSoundName: Record<InteractionSoundName, string[]> = {
  option_click: ['option_click.ogg'],
  option_hover: ['option_hover.ogg'],
  typewriter_key: [
    'typewriter_key.ogg',
    'typewriter_key_second.ogg',
    'typewriter_key_third.ogg',
    'typewriter_key_fourth.ogg',
  ],
  action_sent: ['action_sent.ogg'],
  panel_open: ['panel_open.ogg'],
  panel_close: ['panel_close.ogg'],
  confirmation: ['confirmation.ogg'],
  stamp_impact: ['stamp_impact.ogg'],
  anomaly_glitch: ['anomaly_glitch.ogg'],
  rejection: ['rejection.ogg'],
  screen_tear: ['screen_tear_first.ogg', 'screen_tear_second.ogg', 'screen_tear_third.ogg', 'anomaly_glitch.ogg'],
  distant_presence: [
    'distant_scrape_first.ogg',
    'distant_scrape_second.ogg',
    'distant_toll.ogg',
    'distant_pluck.ogg',
    'distant_knock.ogg',
  ],
  rising_whoosh: ['rising_whoosh.ogg'],
  falling_whoosh: ['falling_whoosh.ogg'],
  heavy_impact: ['body_impact.ogg'],
  mind_fracture: ['anomaly_glitch.ogg'],
  final_toll: ['final_toll.ogg'],
  heartbeat: ['heartbeat.m4a'],
  high_pitch: ['high_pitch.m4a'],
  pen_scratch: ['pen_scratch.m4a'],
}

const simultaneousLayerSoundNamesByInteractionSoundName: Partial<Record<InteractionSoundName, InteractionSoundName[]>> = {
  mind_fracture: ['high_pitch'],
}

const interactionSoundNamesPreloadedAtStart: InteractionSoundName[] = ['typewriter_key', 'screen_tear', 'distant_presence']

const vibrationPatternByInteractionSoundName: Partial<Record<InteractionSoundName, number | number[]>> = {
  option_click: 10,
  action_sent: 14,
  confirmation: [12, 40, 12],
  stamp_impact: [30, 30, 60],
  anomaly_glitch: [8, 24, 8, 24, 8],
  rejection: [20, 50, 20],
  heavy_impact: [45, 25, 80],
  mind_fracture: [6, 18, 6, 18, 6, 18, 40],
  final_toll: [120, 60, 220],
  heartbeat: [26, 110, 38],
  high_pitch: [4, 12, 4],
  pen_scratch: 6,
}

const loadedSoundByFileName = new Map<string, Howl>()
const minimumMillisecondsBetweenRepeatsByName: Partial<Record<InteractionSoundName, number>> = {
  typewriter_key: 16,
  option_hover: 70,
}
const lastPlayedTimestampByName = new Map<InteractionSoundName, number>()

function obtainLoadedSound(interactionSoundName: InteractionSoundName): Howl {
  const candidateFileNames = soundFileNamesByInteractionSoundName[interactionSoundName]
  const chosenFileName = candidateFileNames[Math.floor(Math.random() * candidateFileNames.length)]
  const alreadyLoadedSound = loadedSoundByFileName.get(chosenFileName)
  if (alreadyLoadedSound) {
    return alreadyLoadedSound
  }
  const newlyLoadedSound = new Howl({
    src: [`${import.meta.env.BASE_URL}sounds/${chosenFileName}`],
    volume: volumeByInteractionSoundName[interactionSoundName],
    preload: true,
    pool: 14,
  })
  loadedSoundByFileName.set(chosenFileName, newlyLoadedSound)
  return newlyLoadedSound
}

export function changeLiveSoundVolume(soundVolume: number) {
  Howler.volume(soundVolume)
}

export function preloadFrequentInteractionSounds() {
  for (const interactionSoundName of interactionSoundNamesPreloadedAtStart) {
    for (const fileName of soundFileNamesByInteractionSoundName[interactionSoundName]) {
      if (!loadedSoundByFileName.has(fileName)) {
        loadedSoundByFileName.set(
          fileName,
          new Howl({ src: [`${import.meta.env.BASE_URL}sounds/${fileName}`], volume: 0.3, preload: true, pool: 14 }),
        )
      }
    }
  }
}

function hasEnoughTimePassedSinceLastPlay(interactionSoundName: InteractionSoundName): boolean {
  const minimumMilliseconds = minimumMillisecondsBetweenRepeatsByName[interactionSoundName]
  if (!minimumMilliseconds) {
    return true
  }
  const currentTimestamp = performance.now()
  const lastPlayedTimestamp = lastPlayedTimestampByName.get(interactionSoundName) ?? 0
  if (currentTimestamp - lastPlayedTimestamp < minimumMilliseconds) {
    return false
  }
  lastPlayedTimestampByName.set(interactionSoundName, currentTimestamp)
  return true
}

function playLoadedInteractionSound(
  interactionSoundName: InteractionSoundName,
  playbackOptions: InteractionFeedbackPlaybackOptions | undefined,
) {
  const isPitchVaried =
    interactionSoundName === 'typewriter_key' ||
    interactionSoundName === 'distant_presence' ||
    interactionSoundName === 'screen_tear' ||
    interactionSoundName === 'pen_scratch'
  const randomPitchVariation = isPitchVaried ? 0.86 + Math.random() * 0.28 : 1
  const requestedPlaybackRate =
    randomPitchVariation *
    (playbackRateByInteractionSoundName[interactionSoundName] ?? 1) *
    (playbackOptions?.playbackRateMultiplier ?? 1)
  const requestedVolume =
    volumeByInteractionSoundName[interactionSoundName] * Math.max(0, playbackOptions?.volumeMultiplier ?? 1)
  const loadedSound = obtainLoadedSound(interactionSoundName)
  const playbackIdentifier = loadedSound.play()
  loadedSound.volume(Math.min(1, requestedVolume), playbackIdentifier)
  loadedSound.rate(Math.min(4, Math.max(0.5, requestedPlaybackRate)), playbackIdentifier)
}

export function useInteractionFeedback() {
  const { playerSettings } = usePlayerSettings()
  const latestPlayerSettings = useRef(playerSettings)

  useEffect(() => {
    latestPlayerSettings.current = playerSettings
    Howler.volume(playerSettings.soundVolume)
  }, [playerSettings])

  return useCallback(
    (interactionSoundName: InteractionSoundName, playbackOptions?: InteractionFeedbackPlaybackOptions) => {
      const { isSoundEnabled, isKeySoundEnabled, isHapticFeedbackEnabled } = latestPlayerSettings.current
      const isKeySound = interactionSoundName === 'typewriter_key'
      const isThisSoundAllowed = isSoundEnabled && (!isKeySound || isKeySoundEnabled)
      if (isThisSoundAllowed && hasEnoughTimePassedSinceLastPlay(interactionSoundName)) {
        playLoadedInteractionSound(interactionSoundName, playbackOptions)
        for (const layerSoundName of simultaneousLayerSoundNamesByInteractionSoundName[interactionSoundName] ?? []) {
          playLoadedInteractionSound(layerSoundName, { volumeMultiplier: playbackOptions?.volumeMultiplier })
        }
      }
      const vibrationPattern = vibrationPatternByInteractionSoundName[interactionSoundName]
      if (isHapticFeedbackEnabled && vibrationPattern && 'vibrate' in navigator) {
        try {
          navigator.vibrate(vibrationPattern)
        } catch {
          return
        }
      }
    },
    [],
  )
}

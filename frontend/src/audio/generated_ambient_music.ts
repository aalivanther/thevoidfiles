import { useEffect } from 'react'
import { usePlayerSettings } from '../settings/player_settings'
import {
  changeRecordedMusicMood,
  changeRecordedMusicVolume,
  notifyRecordedMusicOfPlayerGesture,
} from './recorded_music_director'

export type AmbientMusicMood =
  | 'cosmic_origin'
  | 'clinical_observation'
  | 'noir_whispers'
  | 'archive_tension'
  | 'archive_closure'

type AmbientMoodRecipe = {
  rootFrequency: number
  scaleSemitones: number[]
  droneFilterFrequency: number
  droneLevel: number
  windLevel: number
  windFilterFrequency: number
  bellLevel: number
  shortestBellPauseSeconds: number
  longestBellPauseSeconds: number
  bellOctaveMultiplier: number
}

const recipeByAmbientMood: Record<AmbientMusicMood, AmbientMoodRecipe> = {
  cosmic_origin: {
    rootFrequency: 55,
    scaleSemitones: [0, 7, 12, 14, 19],
    droneFilterFrequency: 520,
    droneLevel: 0.34,
    windLevel: 0.1,
    windFilterFrequency: 380,
    bellLevel: 0.16,
    shortestBellPauseSeconds: 5,
    longestBellPauseSeconds: 11,
    bellOctaveMultiplier: 4,
  },
  clinical_observation: {
    rootFrequency: 65.41,
    scaleSemitones: [0, 1, 7, 8, 12],
    droneFilterFrequency: 300,
    droneLevel: 0.26,
    windLevel: 0.05,
    windFilterFrequency: 1400,
    bellLevel: 0.13,
    shortestBellPauseSeconds: 3.5,
    longestBellPauseSeconds: 8,
    bellOctaveMultiplier: 8,
  },
  noir_whispers: {
    rootFrequency: 73.42,
    scaleSemitones: [0, 3, 5, 7, 10, 12, 15],
    droneFilterFrequency: 420,
    droneLevel: 0.24,
    windLevel: 0.16,
    windFilterFrequency: 2600,
    bellLevel: 0.2,
    shortestBellPauseSeconds: 2.5,
    longestBellPauseSeconds: 6.5,
    bellOctaveMultiplier: 4,
  },
  archive_tension: {
    rootFrequency: 49,
    scaleSemitones: [0, 1, 6, 7, 13],
    droneFilterFrequency: 240,
    droneLevel: 0.36,
    windLevel: 0.12,
    windFilterFrequency: 520,
    bellLevel: 0.09,
    shortestBellPauseSeconds: 7,
    longestBellPauseSeconds: 16,
    bellOctaveMultiplier: 4,
  },
  archive_closure: {
    rootFrequency: 61.74,
    scaleSemitones: [0, 4, 7, 11, 12, 16],
    droneFilterFrequency: 640,
    droneLevel: 0.28,
    windLevel: 0.06,
    windFilterFrequency: 900,
    bellLevel: 0.2,
    shortestBellPauseSeconds: 3,
    longestBellPauseSeconds: 7,
    bellOctaveMultiplier: 4,
  },
}

const moodTransitionSeconds = 5
const generatedBedShareOfMusicVolume = 0.42
const volumeTransitionSeconds = 0.6
const silenceBeforeSuspendingMilliseconds = 2400

type AmbientMusicEngine = {
  audioContext: AudioContext
  masterGain: GainNode
  droneGain: GainNode
  droneFilter: BiquadFilterNode
  droneOscillators: OscillatorNode[]
  windGain: GainNode
  windFilter: BiquadFilterNode
  bellInput: GainNode
  bellTimeoutIdentifier: number
  activeRecipe: AmbientMoodRecipe
}

let ambientMusicEngine: AmbientMusicEngine | null = null
let requestedMood: AmbientMusicMood = 'cosmic_origin'
let requestedVolume = 0
let ambientDuckingShare = 1
let suspensionTimeoutIdentifier = 0
const duckingTransitionSeconds = 0.18

function createBrownNoiseBuffer(audioContext: AudioContext): AudioBuffer {
  const bufferDurationSeconds = 6
  const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * bufferDurationSeconds, audioContext.sampleRate)
  const channelSamples = noiseBuffer.getChannelData(0)
  let previousSample = 0
  for (let sampleIndex = 0; sampleIndex < channelSamples.length; sampleIndex += 1) {
    const whiteSample = Math.random() * 2 - 1
    previousSample = (previousSample + 0.02 * whiteSample) / 1.02
    channelSamples[sampleIndex] = previousSample * 3.5
  }
  return noiseBuffer
}

function scheduleNextBell(engine: AmbientMusicEngine) {
  const { activeRecipe, audioContext } = engine
  const pauseSeconds =
    activeRecipe.shortestBellPauseSeconds +
    Math.random() * (activeRecipe.longestBellPauseSeconds - activeRecipe.shortestBellPauseSeconds)
  engine.bellTimeoutIdentifier = window.setTimeout(() => {
    if (ambientMusicEngine !== engine) {
      return
    }
    if (audioContext.state === 'running' && requestedVolume > 0) {
      const chosenSemitone =
        engine.activeRecipe.scaleSemitones[Math.floor(Math.random() * engine.activeRecipe.scaleSemitones.length)]
      const bellFrequency =
        engine.activeRecipe.rootFrequency * engine.activeRecipe.bellOctaveMultiplier * Math.pow(2, chosenSemitone / 12)
      const startTime = audioContext.currentTime + 0.05
      const ringSeconds = 5 + Math.random() * 4
      const bellOscillator = audioContext.createOscillator()
      const bellEnvelope = audioContext.createGain()
      bellOscillator.type = Math.random() < 0.5 ? 'sine' : 'triangle'
      bellOscillator.frequency.value = bellFrequency
      bellEnvelope.gain.setValueAtTime(0.0001, startTime)
      bellEnvelope.gain.exponentialRampToValueAtTime(engine.activeRecipe.bellLevel, startTime + 0.6)
      bellEnvelope.gain.exponentialRampToValueAtTime(0.0001, startTime + ringSeconds)
      bellOscillator.connect(bellEnvelope).connect(engine.bellInput)
      bellOscillator.start(startTime)
      bellOscillator.stop(startTime + ringSeconds + 0.1)
    }
    scheduleNextBell(engine)
  }, pauseSeconds * 1000)
}

function applyRecipeToEngine(engine: AmbientMusicEngine, recipe: AmbientMoodRecipe, transitionSeconds: number) {
  const arrivalTime = engine.audioContext.currentTime + transitionSeconds
  const droneFrequencyRatios = [1, 1.004, 0.5, 1.498]
  engine.droneOscillators.forEach((droneOscillator, oscillatorIndex) => {
    droneOscillator.frequency.linearRampToValueAtTime(
      recipe.rootFrequency * droneFrequencyRatios[oscillatorIndex],
      arrivalTime,
    )
  })
  engine.droneFilter.frequency.linearRampToValueAtTime(recipe.droneFilterFrequency, arrivalTime)
  engine.droneGain.gain.linearRampToValueAtTime(recipe.droneLevel, arrivalTime)
  engine.windFilter.frequency.linearRampToValueAtTime(recipe.windFilterFrequency, arrivalTime)
  engine.windGain.gain.linearRampToValueAtTime(recipe.windLevel, arrivalTime)
  engine.activeRecipe = recipe
}

function createAmbientMusicEngine(): AmbientMusicEngine | null {
  const AudioContextConstructor = window.AudioContext
  if (!AudioContextConstructor) {
    return null
  }
  const audioContext = new AudioContextConstructor()
  const initialRecipe = recipeByAmbientMood[requestedMood]

  const masterGain = audioContext.createGain()
  masterGain.gain.value = 0
  const dynamicsLimiter = audioContext.createDynamicsCompressor()
  masterGain.connect(dynamicsLimiter).connect(audioContext.destination)

  const droneFilter = audioContext.createBiquadFilter()
  droneFilter.type = 'lowpass'
  droneFilter.frequency.value = initialRecipe.droneFilterFrequency
  droneFilter.Q.value = 0.8
  const droneGain = audioContext.createGain()
  droneGain.gain.value = initialRecipe.droneLevel
  droneFilter.connect(droneGain).connect(masterGain)

  const droneOscillatorTypes: OscillatorType[] = ['sawtooth', 'sawtooth', 'sine', 'triangle']
  const droneOscillatorLevels = [0.22, 0.22, 0.5, 0.12]
  const droneOscillators = droneOscillatorTypes.map((oscillatorType, oscillatorIndex) => {
    const droneOscillator = audioContext.createOscillator()
    const oscillatorLevel = audioContext.createGain()
    droneOscillator.type = oscillatorType
    droneOscillator.frequency.value = initialRecipe.rootFrequency
    oscillatorLevel.gain.value = droneOscillatorLevels[oscillatorIndex]
    droneOscillator.connect(oscillatorLevel).connect(droneFilter)
    droneOscillator.start()
    return droneOscillator
  })

  const slowFilterSweep = audioContext.createOscillator()
  const slowFilterSweepDepth = audioContext.createGain()
  slowFilterSweep.frequency.value = 0.037
  slowFilterSweepDepth.gain.value = 140
  slowFilterSweep.connect(slowFilterSweepDepth).connect(droneFilter.frequency)
  slowFilterSweep.start()

  const windSource = audioContext.createBufferSource()
  windSource.buffer = createBrownNoiseBuffer(audioContext)
  windSource.loop = true
  const windFilter = audioContext.createBiquadFilter()
  windFilter.type = 'bandpass'
  windFilter.frequency.value = initialRecipe.windFilterFrequency
  windFilter.Q.value = 0.6
  const windGain = audioContext.createGain()
  windGain.gain.value = initialRecipe.windLevel
  const windSwell = audioContext.createOscillator()
  const windSwellDepth = audioContext.createGain()
  windSwell.frequency.value = 0.061
  windSwellDepth.gain.value = 0.04
  windSwell.connect(windSwellDepth).connect(windGain.gain)
  windSwell.start()
  windSource.connect(windFilter).connect(windGain).connect(masterGain)
  windSource.start()

  const bellInput = audioContext.createGain()
  const echoDelay = audioContext.createDelay(2)
  echoDelay.delayTime.value = 0.71
  const echoFeedback = audioContext.createGain()
  echoFeedback.gain.value = 0.46
  const echoDarkening = audioContext.createBiquadFilter()
  echoDarkening.type = 'lowpass'
  echoDarkening.frequency.value = 1800
  bellInput.connect(masterGain)
  bellInput.connect(echoDelay)
  echoDelay.connect(echoDarkening).connect(echoFeedback).connect(echoDelay)
  echoFeedback.connect(masterGain)

  const engine: AmbientMusicEngine = {
    audioContext,
    masterGain,
    droneGain,
    droneFilter,
    droneOscillators,
    windGain,
    windFilter,
    bellInput,
    bellTimeoutIdentifier: 0,
    activeRecipe: initialRecipe,
  }
  applyRecipeToEngine(engine, initialRecipe, 0.05)
  scheduleNextBell(engine)
  return engine
}

function suspendEngineOnceSilent(engine: AmbientMusicEngine) {
  window.clearTimeout(suspensionTimeoutIdentifier)
  suspensionTimeoutIdentifier = window.setTimeout(() => {
    suspensionTimeoutIdentifier = 0
    if (ambientMusicEngine !== engine || requestedVolume > 0) {
      return
    }
    window.clearTimeout(engine.bellTimeoutIdentifier)
    engine.bellTimeoutIdentifier = 0
    void engine.audioContext.suspend()
  }, silenceBeforeSuspendingMilliseconds)
}

function resumeEngineWhenAudible(engine: AmbientMusicEngine) {
  window.clearTimeout(suspensionTimeoutIdentifier)
  suspensionTimeoutIdentifier = 0
  if (engine.audioContext.state === 'suspended') {
    void engine.audioContext.resume()
  }
  if (engine.bellTimeoutIdentifier === 0) {
    scheduleNextBell(engine)
  }
}

function applyRequestedVolume() {
  if (!ambientMusicEngine) {
    return
  }
  const { audioContext, masterGain } = ambientMusicEngine
  masterGain.gain.cancelScheduledValues(audioContext.currentTime)
  masterGain.gain.setTargetAtTime(
    requestedVolume * generatedBedShareOfMusicVolume * ambientDuckingShare,
    audioContext.currentTime,
    (ambientDuckingShare < 1 ? duckingTransitionSeconds : volumeTransitionSeconds) / 3,
  )
  if (requestedVolume > 0) {
    resumeEngineWhenAudible(ambientMusicEngine)
  } else {
    suspendEngineOnceSilent(ambientMusicEngine)
  }
}

export function changeGeneratedAmbientMusicDuckingShare(duckingShare: number) {
  ambientDuckingShare = Math.min(1, Math.max(0, duckingShare))
  applyRequestedVolume()
}

export function changeLiveMusicVolume(musicVolume: number) {
  requestedVolume = musicVolume
  applyRequestedVolume()
  changeRecordedMusicVolume(musicVolume)
}

function startAmbientMusicAfterPlayerGesture() {
  notifyRecordedMusicOfPlayerGesture()
  if (requestedVolume <= 0) {
    return
  }
  if (!ambientMusicEngine) {
    ambientMusicEngine = createAmbientMusicEngine()
  }
  applyRequestedVolume()
}

export function useGeneratedAmbientMusic(ambientMusicMood: AmbientMusicMood) {
  const { playerSettings } = usePlayerSettings()
  const { isMusicEnabled, musicVolume } = playerSettings

  useEffect(() => {
    requestedVolume = isMusicEnabled ? musicVolume : 0
    if (requestedVolume > 0 && ambientMusicEngine) {
      startAmbientMusicAfterPlayerGesture()
    }
    applyRequestedVolume()
    changeRecordedMusicVolume(requestedVolume)
  }, [isMusicEnabled, musicVolume])

  useEffect(() => {
    requestedMood = ambientMusicMood
    changeRecordedMusicMood(ambientMusicMood)
    if (ambientMusicEngine) {
      applyRecipeToEngine(ambientMusicEngine, recipeByAmbientMood[ambientMusicMood], moodTransitionSeconds)
    }
  }, [ambientMusicMood])

  useEffect(() => {
    const handlePlayerGesture = () => startAmbientMusicAfterPlayerGesture()
    window.addEventListener('pointerdown', handlePlayerGesture)
    window.addEventListener('keydown', handlePlayerGesture)
    return () => {
      window.removeEventListener('pointerdown', handlePlayerGesture)
      window.removeEventListener('keydown', handlePlayerGesture)
    }
  }, [])
}

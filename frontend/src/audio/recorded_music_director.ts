import type { AmbientMusicMood } from './generated_ambient_music'

type RecordedTrackName =
  | 'cosmic_navigation'
  | 'aurora'
  | 'cirrus'
  | 'terminus'
  | 'eyes_in_the_void'
  | 'haunting_piano'
  | 'first_light_particles'
  | 'a_new_start'
  | 'signs_to_nowhere'
  | 'dark_ambient_loop_13'

type MoodPlaylist = {
  leadingTrackNames: RecordedTrackName[]
  leadingLayerLevel: number
  undercurrentTrackNames: RecordedTrackName[]
  undercurrentLayerLevel: number
}

const playlistByMood: Record<AmbientMusicMood, MoodPlaylist> = {
  cosmic_origin: {
    leadingTrackNames: ['cosmic_navigation', 'aurora', 'cirrus'],
    leadingLayerLevel: 0.8,
    undercurrentTrackNames: [],
    undercurrentLayerLevel: 0,
  },
  clinical_observation: {
    leadingTrackNames: ['haunting_piano', 'first_light_particles'],
    leadingLayerLevel: 0.62,
    undercurrentTrackNames: ['dark_ambient_loop_13'],
    undercurrentLayerLevel: 0.22,
  },
  noir_whispers: {
    leadingTrackNames: ['signs_to_nowhere', 'cirrus', 'first_light_particles'],
    leadingLayerLevel: 0.7,
    undercurrentTrackNames: ['dark_ambient_loop_13', 'cosmic_navigation'],
    undercurrentLayerLevel: 0.2,
  },
  archive_tension: {
    leadingTrackNames: ['dark_ambient_loop_13', 'eyes_in_the_void', 'cosmic_navigation'],
    leadingLayerLevel: 0.72,
    undercurrentTrackNames: ['haunting_piano', 'first_light_particles'],
    undercurrentLayerLevel: 0.16,
  },
  archive_closure: {
    leadingTrackNames: ['a_new_start', 'terminus', 'aurora'],
    leadingLayerLevel: 0.78,
    undercurrentTrackNames: [],
    undercurrentLayerLevel: 0,
  },
}

const crossfadeMilliseconds = 4200
const fadeStepMilliseconds = 60
const secondsBeforeEndToStartNextTrack = 5

type MusicLayerName = 'leading' | 'undercurrent'

type PlayingTrack = {
  trackName: RecordedTrackName
  audioElement: HTMLAudioElement
  fadeShare: number
  fadeDirection: 1 | -1
  layerLevel: number
}

const playingTracksByLayer: Record<MusicLayerName, PlayingTrack[]> = { leading: [], undercurrent: [] }
const remainingShuffledTrackNamesByKey = new Map<string, RecordedTrackName[]>()
const lastPlayedTrackNameByKey = new Map<string, RecordedTrackName>()

let currentMood: AmbientMusicMood | null = null
let currentMusicVolume = 0
let recordedMusicDuckingShare = 1
let hasPlayerGestureHappened = false
let fadeIntervalIdentifier = 0

function drawNextTrackName(shuffleKey: string, candidateTrackNames: RecordedTrackName[]): RecordedTrackName | null {
  if (candidateTrackNames.length === 0) {
    return null
  }
  let remainingTrackNames = remainingShuffledTrackNamesByKey.get(shuffleKey) ?? []
  if (remainingTrackNames.length === 0) {
    remainingTrackNames = [...candidateTrackNames].sort(() => Math.random() - 0.5)
    const lastPlayedTrackName = lastPlayedTrackNameByKey.get(shuffleKey)
    if (remainingTrackNames.length > 1 && remainingTrackNames[0] === lastPlayedTrackName) {
      remainingTrackNames.push(remainingTrackNames.shift() as RecordedTrackName)
    }
  }
  const nextTrackName = remainingTrackNames.shift() as RecordedTrackName
  remainingShuffledTrackNamesByKey.set(shuffleKey, remainingTrackNames)
  lastPlayedTrackNameByKey.set(shuffleKey, nextTrackName)
  return nextTrackName
}

function applyVolumeToTrack(playingTrack: PlayingTrack) {
  const easedFadeShare = playingTrack.fadeShare * playingTrack.fadeShare * (3 - 2 * playingTrack.fadeShare)
  playingTrack.audioElement.volume = Math.min(
    1,
    Math.max(0, currentMusicVolume * playingTrack.layerLevel * easedFadeShare * recordedMusicDuckingShare),
  )
}

function fadeOutLayer(layerName: MusicLayerName) {
  for (const playingTrack of playingTracksByLayer[layerName]) {
    playingTrack.fadeDirection = -1
  }
  if (playingTracksByLayer[layerName].length > 0) {
    ensureFadeLoopIsRunning()
  }
}

function isTrackApproachingItsEnd(audioElement: HTMLAudioElement): boolean {
  return (
    !audioElement.loop &&
    Number.isFinite(audioElement.duration) &&
    audioElement.duration - audioElement.currentTime < secondsBeforeEndToStartNextTrack
  )
}

function handOverTrackWhenEnding(layerName: MusicLayerName, playingTrack: PlayingTrack) {
  const { audioElement } = playingTrack
  if (playingTrack.fadeDirection === 1 && (isTrackApproachingItsEnd(audioElement) || audioElement.ended)) {
    playingTrack.fadeDirection = -1
    ensureFadeLoopIsRunning()
    if (currentMood && currentMusicVolume > 0) {
      startTrackOnLayer(layerName, currentMood)
    }
  }
}

function isAnyTrackStillFading(): boolean {
  return [...playingTracksByLayer.leading, ...playingTracksByLayer.undercurrent].some(
    (playingTrack) => playingTrack.fadeDirection === -1 || playingTrack.fadeShare < 1,
  )
}

function startTrackOnLayer(layerName: MusicLayerName, mood: AmbientMusicMood) {
  const moodPlaylist = playlistByMood[mood]
  const candidateTrackNames =
    layerName === 'leading' ? moodPlaylist.leadingTrackNames : moodPlaylist.undercurrentTrackNames
  const alreadyAudibleTrackNames = [...playingTracksByLayer.leading, ...playingTracksByLayer.undercurrent]
    .filter((playingTrack) => playingTrack.fadeDirection === 1)
    .map((playingTrack) => playingTrack.trackName)
  const availableTrackNames = candidateTrackNames.filter((trackName) => !alreadyAudibleTrackNames.includes(trackName))
  const nextTrackName = drawNextTrackName(`${mood}_${layerName}`, availableTrackNames)
  if (!nextTrackName) {
    return
  }
  const audioElement = new Audio(`${import.meta.env.BASE_URL}music/${nextTrackName}.m4a`)
  audioElement.preload = 'auto'
  audioElement.loop = layerName === 'undercurrent'
  audioElement.volume = 0
  const playingTrack: PlayingTrack = {
    trackName: nextTrackName,
    audioElement,
    fadeShare: 0,
    fadeDirection: 1,
    layerLevel: layerName === 'leading' ? moodPlaylist.leadingLayerLevel : moodPlaylist.undercurrentLayerLevel,
  }
  playingTracksByLayer[layerName].push(playingTrack)
  if (!audioElement.loop) {
    const handOverThisTrack = () => handOverTrackWhenEnding(layerName, playingTrack)
    audioElement.addEventListener('timeupdate', handOverThisTrack)
    audioElement.addEventListener('ended', handOverThisTrack)
  }
  ensureFadeLoopIsRunning()
  void audioElement.play().catch(() => {
    playingTrack.fadeDirection = -1
    playingTrack.fadeShare = 0
    ensureFadeLoopIsRunning()
  })
}

function advanceFadesAndPlaylist() {
  const fadeStepShare = fadeStepMilliseconds / crossfadeMilliseconds
  for (const layerName of ['leading', 'undercurrent'] as const) {
    const playingTracks = playingTracksByLayer[layerName]
    for (const playingTrack of playingTracks) {
      playingTrack.fadeShare = Math.min(1, Math.max(0, playingTrack.fadeShare + fadeStepShare * playingTrack.fadeDirection))
      applyVolumeToTrack(playingTrack)
      handOverTrackWhenEnding(layerName, playingTrack)
    }
    playingTracksByLayer[layerName] = playingTracks.filter((playingTrack) => {
      const isSilentAndLeaving = playingTrack.fadeDirection === -1 && playingTrack.fadeShare <= 0
      if (isSilentAndLeaving) {
        playingTrack.audioElement.pause()
        playingTrack.audioElement.removeAttribute('src')
        playingTrack.audioElement.load()
      }
      return !isSilentAndLeaving
    })
  }
  if (!isAnyTrackStillFading()) {
    window.clearInterval(fadeIntervalIdentifier)
    fadeIntervalIdentifier = 0
  }
}

function ensureFadeLoopIsRunning() {
  if (fadeIntervalIdentifier === 0) {
    fadeIntervalIdentifier = window.setInterval(advanceFadesAndPlaylist, fadeStepMilliseconds)
  }
}

function startPlaylistForCurrentMood() {
  if (!currentMood || !hasPlayerGestureHappened || currentMusicVolume <= 0) {
    return
  }
  ensureFadeLoopIsRunning()
  fadeOutLayer('leading')
  fadeOutLayer('undercurrent')
  startTrackOnLayer('leading', currentMood)
  startTrackOnLayer('undercurrent', currentMood)
}

export function changeRecordedMusicMood(mood: AmbientMusicMood) {
  if (mood === currentMood) {
    return
  }
  currentMood = mood
  startPlaylistForCurrentMood()
}

export function changeRecordedMusicVolume(musicVolume: number) {
  const wasSilent = currentMusicVolume <= 0
  currentMusicVolume = musicVolume
  for (const layerName of ['leading', 'undercurrent'] as const) {
    playingTracksByLayer[layerName].forEach(applyVolumeToTrack)
  }
  if (musicVolume <= 0) {
    fadeOutLayer('leading')
    fadeOutLayer('undercurrent')
    return
  }
  const isNothingAudible = ![...playingTracksByLayer.leading, ...playingTracksByLayer.undercurrent].some(
    (playingTrack) => playingTrack.fadeDirection === 1,
  )
  if (wasSilent || isNothingAudible) {
    startPlaylistForCurrentMood()
  }
}

export function changeRecordedMusicDuckingShare(duckingShare: number) {
  recordedMusicDuckingShare = Math.min(1, Math.max(0, duckingShare))
  for (const layerName of ['leading', 'undercurrent'] as const) {
    playingTracksByLayer[layerName].forEach(applyVolumeToTrack)
  }
}

export function notifyRecordedMusicOfPlayerGesture() {
  if (hasPlayerGestureHappened) {
    return
  }
  hasPlayerGestureHappened = true
  startPlaylistForCurrentMood()
}

import { changeGeneratedAmbientMusicDuckingShare } from './generated_ambient_music'
import { changeWeatherSoundDuckingShare } from './generated_weather_sound'
import { changeRecordedMusicDuckingShare } from './recorded_music_director'

const longestAmbientSilenceMilliseconds = 12000

let ambientSilenceEndTimestamp = 0
let ambientRestorationTimeoutIdentifier = 0

function applyDuckingShareToEveryAmbientSource(duckingShare: number) {
  changeRecordedMusicDuckingShare(duckingShare)
  changeGeneratedAmbientMusicDuckingShare(duckingShare)
  changeWeatherSoundDuckingShare(duckingShare)
}

export function restoreAmbientSoundImmediately() {
  window.clearTimeout(ambientRestorationTimeoutIdentifier)
  ambientRestorationTimeoutIdentifier = 0
  ambientSilenceEndTimestamp = 0
  applyDuckingShareToEveryAmbientSource(1)
}

export function requestAmbientSilence(durationMilliseconds: number) {
  if (!Number.isFinite(durationMilliseconds) || durationMilliseconds <= 0) {
    return
  }
  const limitedDurationMilliseconds = Math.min(longestAmbientSilenceMilliseconds, durationMilliseconds)
  const requestedEndTimestamp = Date.now() + limitedDurationMilliseconds
  if (requestedEndTimestamp <= ambientSilenceEndTimestamp) {
    return
  }
  ambientSilenceEndTimestamp = requestedEndTimestamp
  applyDuckingShareToEveryAmbientSource(0)
  window.clearTimeout(ambientRestorationTimeoutIdentifier)
  ambientRestorationTimeoutIdentifier = window.setTimeout(restoreAmbientSoundImmediately, limitedDurationMilliseconds)
}

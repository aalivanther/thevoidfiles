export type WeatherSoundScene = 'coastal_night'

type WeatherSoundEngine = {
  audioContext: AudioContext
  masterGain: GainNode
  gustTimeoutIdentifier: number
  windFilter: BiquadFilterNode
  windGain: GainNode
}

let weatherSoundEngine: WeatherSoundEngine | null = null
let requestedWeatherVolume = 0
let weatherDuckingShare = 1
let suspensionTimeoutIdentifier = 0
const silenceBeforeSuspendingMilliseconds = 6000

function createNoiseBuffer(audioContext: AudioContext, smoothing: number): AudioBuffer {
  const bufferDurationSeconds = 7
  const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * bufferDurationSeconds, audioContext.sampleRate)
  const channelSamples = noiseBuffer.getChannelData(0)
  let previousSample = 0
  for (let sampleIndex = 0; sampleIndex < channelSamples.length; sampleIndex += 1) {
    const whiteSample = Math.random() * 2 - 1
    previousSample = previousSample * smoothing + whiteSample * (1 - smoothing)
    channelSamples[sampleIndex] = previousSample
  }
  return noiseBuffer
}

function createLoopingNoiseSource(audioContext: AudioContext, smoothing: number): AudioBufferSourceNode {
  const noiseSource = audioContext.createBufferSource()
  noiseSource.buffer = createNoiseBuffer(audioContext, smoothing)
  noiseSource.loop = true
  noiseSource.start()
  return noiseSource
}

function scheduleNextWindGust(engine: WeatherSoundEngine) {
  engine.gustTimeoutIdentifier = window.setTimeout(
    () => {
      if (weatherSoundEngine !== engine) {
        return
      }
      const { audioContext, windFilter, windGain } = engine
      const gustStartTime = audioContext.currentTime
      const gustSeconds = 3 + Math.random() * 5
      const gustPeakFrequency = 420 + Math.random() * 520
      windFilter.frequency.cancelScheduledValues(gustStartTime)
      windFilter.frequency.setTargetAtTime(gustPeakFrequency, gustStartTime, gustSeconds / 4)
      windFilter.frequency.setTargetAtTime(260, gustStartTime + gustSeconds / 2, gustSeconds / 3)
      windGain.gain.cancelScheduledValues(gustStartTime)
      windGain.gain.setTargetAtTime(0.5 + Math.random() * 0.4, gustStartTime, gustSeconds / 4)
      windGain.gain.setTargetAtTime(0.16, gustStartTime + gustSeconds / 2, gustSeconds / 3)
      scheduleNextWindGust(engine)
    },
    4000 + Math.random() * 9000,
  )
}

function createCoastalNightEngine(): WeatherSoundEngine | null {
  const AudioContextConstructor = window.AudioContext
  if (!AudioContextConstructor) {
    return null
  }
  const audioContext = new AudioContextConstructor()
  const masterGain = audioContext.createGain()
  masterGain.gain.value = 0
  masterGain.connect(audioContext.destination)

  const seaFilter = audioContext.createBiquadFilter()
  seaFilter.type = 'lowpass'
  seaFilter.frequency.value = 520
  const seaGain = audioContext.createGain()
  seaGain.gain.value = 0.34
  const seaSwell = audioContext.createOscillator()
  const seaSwellDepth = audioContext.createGain()
  seaSwell.frequency.value = 0.11
  seaSwellDepth.gain.value = 0.28
  seaSwell.connect(seaSwellDepth).connect(seaGain.gain)
  seaSwell.start()
  const seaBrightnessSwell = audioContext.createOscillator()
  const seaBrightnessDepth = audioContext.createGain()
  seaBrightnessSwell.frequency.value = 0.11
  seaBrightnessDepth.gain.value = 300
  seaBrightnessSwell.connect(seaBrightnessDepth).connect(seaFilter.frequency)
  seaBrightnessSwell.start()
  createLoopingNoiseSource(audioContext, 0.985).connect(seaFilter).connect(seaGain).connect(masterGain)

  const windFilter = audioContext.createBiquadFilter()
  windFilter.type = 'bandpass'
  windFilter.frequency.value = 260
  windFilter.Q.value = 1.6
  const windGain = audioContext.createGain()
  windGain.gain.value = 0.16
  createLoopingNoiseSource(audioContext, 0.93).connect(windFilter).connect(windGain).connect(masterGain)

  const drizzleFilter = audioContext.createBiquadFilter()
  drizzleFilter.type = 'highpass'
  drizzleFilter.frequency.value = 3800
  const drizzleGain = audioContext.createGain()
  drizzleGain.gain.value = 0.045
  createLoopingNoiseSource(audioContext, 0).connect(drizzleFilter).connect(drizzleGain).connect(masterGain)

  const engine: WeatherSoundEngine = { audioContext, masterGain, gustTimeoutIdentifier: 0, windFilter, windGain }
  scheduleNextWindGust(engine)
  return engine
}

export function changeWeatherSoundVolume(weatherVolume: number) {
  requestedWeatherVolume = weatherVolume
  if (weatherVolume > 0 && !weatherSoundEngine) {
    weatherSoundEngine = createCoastalNightEngine()
  }
  if (!weatherSoundEngine) {
    return
  }
  const engine = weatherSoundEngine
  const { audioContext, masterGain } = engine
  window.clearTimeout(suspensionTimeoutIdentifier)
  suspensionTimeoutIdentifier = 0
  if (weatherVolume > 0 && audioContext.state === 'suspended') {
    void audioContext.resume()
  }
  if (weatherVolume > 0 && engine.gustTimeoutIdentifier === 0) {
    scheduleNextWindGust(engine)
  }
  masterGain.gain.cancelScheduledValues(audioContext.currentTime)
  masterGain.gain.setTargetAtTime(requestedWeatherVolume * weatherDuckingShare, audioContext.currentTime, 0.9)
  if (weatherVolume <= 0) {
    suspensionTimeoutIdentifier = window.setTimeout(() => {
      suspensionTimeoutIdentifier = 0
      if (weatherSoundEngine !== engine || requestedWeatherVolume > 0) {
        return
      }
      window.clearTimeout(engine.gustTimeoutIdentifier)
      engine.gustTimeoutIdentifier = 0
      void audioContext.suspend()
    }, silenceBeforeSuspendingMilliseconds)
  }
}

export function changeWeatherSoundDuckingShare(duckingShare: number) {
  weatherDuckingShare = Math.min(1, Math.max(0, duckingShare))
  if (!weatherSoundEngine) {
    return
  }
  const { audioContext, masterGain } = weatherSoundEngine
  masterGain.gain.cancelScheduledValues(audioContext.currentTime)
  masterGain.gain.setTargetAtTime(
    requestedWeatherVolume * weatherDuckingShare,
    audioContext.currentTime,
    weatherDuckingShare < 1 ? 0.06 : 0.35,
  )
}

export function silenceWeatherSound() {
  changeWeatherSoundVolume(0)
}

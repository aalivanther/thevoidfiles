import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { randomNumberBetween } from '../animation/animation_variety'
import { changeWeatherSoundVolume, silenceWeatherSound } from '../audio/generated_weather_sound'
import { useInteractionFeedback } from '../audio/interaction_feedback'
import { usePlayerSettings } from '../settings/player_settings'

type WatchingEyesApparition = {
  occurrenceNumber: number
  horizontalPercentage: number
  verticalPercentage: number
  eyeScale: number
  gazeHorizontalOffset: number
  isArcaneColored: boolean
}

type ScreenTearApparition = {
  occurrenceNumber: number
  tearBands: Array<{ topPercentage: number; heightPercentage: number; horizontalShift: number }>
}

const watchingEyesVisibleMilliseconds = 3600
const screenTearVisibleMilliseconds = 340
const weatherShareOfSoundVolume = 0.5

function chooseEdgePosition(): { horizontalPercentage: number; verticalPercentage: number } {
  const isOnVerticalEdge = Math.random() < 0.7
  if (isOnVerticalEdge) {
    return {
      horizontalPercentage: Math.random() < 0.5 ? randomNumberBetween(2, 11) : randomNumberBetween(86, 95),
      verticalPercentage: randomNumberBetween(14, 82),
    }
  }
  return { horizontalPercentage: randomNumberBetween(10, 88), verticalPercentage: randomNumberBetween(10, 18) }
}

export function ArchiveImmersionLayer({ dreadLevel }: { dreadLevel: number }) {
  const { playerSettings, shouldReduceMotion } = usePlayerSettings()
  const playInteractionFeedback = useInteractionFeedback()
  const [watchingEyes, setWatchingEyes] = useState<WatchingEyesApparition | null>(null)
  const [screenTear, setScreenTear] = useState<ScreenTearApparition | null>(null)
  const feedbackCallback = useRef(playInteractionFeedback)
  const currentDreadLevel = useRef(dreadLevel)

  useEffect(() => {
    feedbackCallback.current = playInteractionFeedback
    currentDreadLevel.current = dreadLevel
  }, [playInteractionFeedback, dreadLevel])

  useEffect(() => {
    const weatherVolume =
      playerSettings.isWeatherSoundEnabled && playerSettings.isSoundEnabled
        ? playerSettings.soundVolume * weatherShareOfSoundVolume
        : 0
    changeWeatherSoundVolume(weatherVolume)
  }, [playerSettings.isWeatherSoundEnabled, playerSettings.isSoundEnabled, playerSettings.soundVolume])

  useEffect(() => silenceWeatherSound, [])

  useEffect(() => {
    if (!playerSettings.areUnsettlingApparitionsEnabled) {
      return
    }
    const pendingTimeoutIdentifiers: number[] = []
    let occurrenceCounter = 0
    let isDisposed = false

    const calmFactor = () => Math.max(0.4, 1 - currentDreadLevel.current * 0.18)

    const scheduleWatchingEyes = () => {
      pendingTimeoutIdentifiers.push(
        window.setTimeout(
          () => {
            if (isDisposed) {
              return
            }
            occurrenceCounter += 1
            const edgePosition = chooseEdgePosition()
            setWatchingEyes({
              occurrenceNumber: occurrenceCounter,
              ...edgePosition,
              eyeScale: randomNumberBetween(0.7, 1.5),
              gazeHorizontalOffset: edgePosition.horizontalPercentage < 50 ? 22 : -22,
              isArcaneColored: Math.random() < 0.35,
            })
            if (Math.random() < 0.5) {
              feedbackCallback.current('distant_presence')
            }
            pendingTimeoutIdentifiers.push(window.setTimeout(() => setWatchingEyes(null), watchingEyesVisibleMilliseconds))
            scheduleWatchingEyes()
          },
          randomNumberBetween(13000, 30000) * calmFactor(),
        ),
      )
    }

    const scheduleScreenTear = () => {
      pendingTimeoutIdentifiers.push(
        window.setTimeout(
          () => {
            if (isDisposed) {
              return
            }
            if (!shouldReduceMotion) {
              occurrenceCounter += 1
              setScreenTear({
                occurrenceNumber: occurrenceCounter,
                tearBands: Array.from({ length: 3 + Math.floor(Math.random() * 3) }, () => ({
                  topPercentage: randomNumberBetween(4, 90),
                  heightPercentage: randomNumberBetween(1.2, 8),
                  horizontalShift: randomNumberBetween(-46, 46),
                })),
              })
              document.documentElement.dataset.screenTearing = 'true'
              feedbackCallback.current('screen_tear')
              pendingTimeoutIdentifiers.push(
                window.setTimeout(() => {
                  setScreenTear(null)
                  delete document.documentElement.dataset.screenTearing
                }, screenTearVisibleMilliseconds),
              )
            }
            scheduleScreenTear()
          },
          randomNumberBetween(19000, 44000) * calmFactor(),
        ),
      )
    }

    const scheduleDistantPresence = () => {
      pendingTimeoutIdentifiers.push(
        window.setTimeout(
          () => {
            if (isDisposed) {
              return
            }
            feedbackCallback.current('distant_presence')
            scheduleDistantPresence()
          },
          randomNumberBetween(16000, 38000) * calmFactor(),
        ),
      )
    }

    scheduleWatchingEyes()
    scheduleScreenTear()
    scheduleDistantPresence()
    return () => {
      isDisposed = true
      pendingTimeoutIdentifiers.forEach((timeoutIdentifier) => window.clearTimeout(timeoutIdentifier))
      delete document.documentElement.dataset.screenTearing
    }
  }, [playerSettings.areUnsettlingApparitionsEnabled, shouldReduceMotion])

  return (
    <div className="archive-immersion-layer" aria-hidden="true">
      {watchingEyes ? (
        <div
          key={watchingEyes.occurrenceNumber}
          className="watching-eyes-pair"
          data-arcane={watchingEyes.isArcaneColored ? 'true' : 'false'}
          style={
            {
              left: `${watchingEyes.horizontalPercentage}%`,
              top: `${watchingEyes.verticalPercentage}%`,
              '--eye-scale': watchingEyes.eyeScale,
              '--gaze-offset': `${watchingEyes.gazeHorizontalOffset}%`,
            } as CSSProperties
          }
        >
          <span className="watching-eye">
            <span className="watching-eye-pupil" />
          </span>
          <span className="watching-eye">
            <span className="watching-eye-pupil" />
          </span>
        </div>
      ) : null}
      {screenTear
        ? screenTear.tearBands.map((tearBand, bandIndex) => (
            <span
              key={`${screenTear.occurrenceNumber}_${bandIndex}`}
              className="screen-tear-band"
              style={
                {
                  top: `${tearBand.topPercentage}%`,
                  height: `${tearBand.heightPercentage}%`,
                  '--tear-shift': `${tearBand.horizontalShift}px`,
                } as CSSProperties
              }
            />
          ))
        : null}
    </div>
  )
}

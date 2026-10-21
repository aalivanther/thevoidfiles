import { ArrowsClockwise, CaretDown, CircleDashed, Flask, MonitorPlay, PlugsConnected } from '@phosphor-icons/react'
import { useEffect, useId, useRef, useState } from 'react'
import { useInteractionFeedback } from '../../audio/interaction_feedback'
import { refreshGameServicePresence } from '../../game_service/game_service_presence'
import { spanishInterfaceCopy } from '../../spanish_interface_copy'
import { LocalServiceConnectionSection } from './LocalServiceConnectionSection'
import { useGameServicePresence } from './use_game_service_presence'

const runModeIndicatorCopy = spanishInterfaceCopy.runModeIndicator

type RunModeName = 'searching' | 'local_service_real' | 'local_service_synthetic' | 'demonstration'

const runModeTextByName: Record<RunModeName, string> = {
  searching: runModeIndicatorCopy.searching,
  local_service_real: runModeIndicatorCopy.localServiceWithRealProviders,
  local_service_synthetic: runModeIndicatorCopy.localServiceWithSyntheticProviders,
  demonstration: runModeIndicatorCopy.demonstrationWithoutService,
}

export function GameServiceRunModeIndicator({
  shouldProbeWhenShown = false,
  canManageAccessKeys = false,
}: {
  shouldProbeWhenShown?: boolean
  canManageAccessKeys?: boolean
}) {
  const playInteractionFeedback = useInteractionFeedback()
  const gameServicePresence = useGameServicePresence()
  const accessKeysRegionIdentifier = useId()
  const [isProbing, setIsProbing] = useState(false)
  const [areAccessKeysShown, setAreAccessKeysShown] = useState(false)
  const isIndicatorMounted = useRef(true)

  const probeAgain = async () => {
    setIsProbing(true)
    await refreshGameServicePresence()
    if (isIndicatorMounted.current) {
      setIsProbing(false)
    }
  }

  useEffect(() => {
    isIndicatorMounted.current = true
    const probeTimeoutIdentifier = shouldProbeWhenShown ? window.setTimeout(() => void probeAgain(), 0) : null
    return () => {
      isIndicatorMounted.current = false
      if (probeTimeoutIdentifier !== null) {
        window.clearTimeout(probeTimeoutIdentifier)
      }
    }
  }, [shouldProbeWhenShown])

  const runModeName: RunModeName =
    gameServicePresence === null
      ? 'searching'
      : !gameServicePresence.isServicePresent
        ? 'demonstration'
        : gameServicePresence.providerModeName === 'real'
          ? 'local_service_real'
          : 'local_service_synthetic'
  const isLocalServicePresent = runModeName === 'local_service_real' || runModeName === 'local_service_synthetic'

  return (
    <div className="game-service-run-mode" data-run-mode-name={runModeName}>
      <div className="game-service-run-mode-line">
        <p className="game-service-run-mode-label" role="status" aria-label={runModeIndicatorCopy.accessibleLabel}>
          {runModeName === 'local_service_real' ? (
            <PlugsConnected size={16} weight="bold" aria-hidden="true" />
          ) : runModeName === 'local_service_synthetic' ? (
            <Flask size={16} weight="bold" aria-hidden="true" />
          ) : runModeName === 'demonstration' ? (
            <MonitorPlay size={16} weight="bold" aria-hidden="true" />
          ) : (
            <CircleDashed size={16} weight="bold" aria-hidden="true" />
          )}
          <span>{isProbing ? runModeIndicatorCopy.searching : runModeTextByName[runModeName]}</span>
        </p>
        <button
          type="button"
          className="quiet-action-button game-service-run-mode-button"
          aria-label={runModeIndicatorCopy.probeAgainButton}
          title={runModeIndicatorCopy.probeAgainButton}
          disabled={isProbing}
          onClick={() => {
            playInteractionFeedback('option_click')
            void probeAgain()
          }}
        >
          <ArrowsClockwise size={18} weight="bold" aria-hidden="true" />
        </button>
        {canManageAccessKeys && isLocalServicePresent ? (
          <button
            type="button"
            className="quiet-action-button game-service-run-mode-button"
            aria-expanded={areAccessKeysShown}
            aria-controls={accessKeysRegionIdentifier}
            aria-label={
              areAccessKeysShown ? runModeIndicatorCopy.hideAccessKeysButton : runModeIndicatorCopy.showAccessKeysButton
            }
            title={areAccessKeysShown ? runModeIndicatorCopy.hideAccessKeysButton : runModeIndicatorCopy.showAccessKeysButton}
            onClick={() => {
              playInteractionFeedback(areAccessKeysShown ? 'panel_close' : 'option_click')
              setAreAccessKeysShown((wereShown) => !wereShown)
            }}
          >
            <CaretDown size={18} weight="bold" aria-hidden="true" data-turned={areAccessKeysShown} />
          </button>
        ) : null}
      </div>
      {canManageAccessKeys && isLocalServicePresent && areAccessKeysShown ? (
        <div id={accessKeysRegionIdentifier} className="game-service-run-mode-access-keys">
          <LocalServiceConnectionSection />
        </div>
      ) : null}
    </div>
  )
}

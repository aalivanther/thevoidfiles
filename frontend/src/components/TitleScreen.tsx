import { ArrowRight, FastForward } from '@phosphor-icons/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useInteractionFeedback } from '../audio/interaction_feedback'
import { usePlayerSettings } from '../settings/player_settings'
import { spanishInterfaceCopy } from '../spanish_interface_copy'
import { CosmicTitleFormation, expansionDurationMilliseconds } from './CosmicTitleFormation'
import type { CosmicFormationPhase } from './CosmicTitleFormation'

const cosmicOriginWitnessedStorageKey = 'the_void_files_cosmic_origin_witnessed'
const formationSafetyMilliseconds = 2900
const gatheringSafetyMilliseconds = 10500
const upperTitleLine = 'The Void'
const lowerTitleLine = 'Files'

function hasCosmicOriginBeenWitnessedInThisSession(): boolean {
  try {
    return window.sessionStorage.getItem(cosmicOriginWitnessedStorageKey) === 'true'
  } catch {
    return false
  }
}

type TitleScreenProperties = {
  hasChronicleInProgress: boolean
  onAcknowledgementsRequested: () => void
  onProfileRequested: () => void
  onChronicleOpened: () => void
}

export function TitleScreen({
  hasChronicleInProgress,
  onAcknowledgementsRequested,
  onProfileRequested,
  onChronicleOpened,
}: TitleScreenProperties) {
  const titleScreenCopy = spanishInterfaceCopy.titleScreen
  const cosmicOriginCopy = spanishInterfaceCopy.cosmicOrigin
  const playInteractionFeedback = useInteractionFeedback()
  const { shouldReduceMotion } = usePlayerSettings()
  const [isCanvasAnimationAvailable, setIsCanvasAnimationAvailable] = useState(true)
  const [formationPhase, setFormationPhase] = useState<CosmicFormationPhase>(() =>
    hasCosmicOriginBeenWitnessedInThisSession() ? 'title_formation' : 'solitary_particle',
  )
  const [isTitleInterfaceRevealed, setIsTitleInterfaceRevealed] = useState(false)
  const pendingTimeoutIdentifiers = useRef<number[]>([])
  const chronicleButton = useRef<HTMLButtonElement>(null)
  const awakeningButton = useRef<HTMLButtonElement>(null)

  const shouldUseStaticTitle = shouldReduceMotion || !isCanvasAnimationAvailable
  const isInterfaceVisible = isTitleInterfaceRevealed || shouldUseStaticTitle

  const revealTitleInterface = useCallback(() => {
    setIsTitleInterfaceRevealed(true)
    try {
      window.sessionStorage.setItem(cosmicOriginWitnessedStorageKey, 'true')
    } catch {
      return
    }
  }, [])

  useEffect(() => {
    const timeoutIdentifiers = pendingTimeoutIdentifiers.current
    return () => timeoutIdentifiers.forEach((timeoutIdentifier) => window.clearTimeout(timeoutIdentifier))
  }, [])

  useEffect(() => {
    if (formationPhase !== 'title_formation') {
      return
    }
    const safetyTimeoutIdentifier = window.setTimeout(revealTitleInterface, formationSafetyMilliseconds)
    return () => window.clearTimeout(safetyTimeoutIdentifier)
  }, [formationPhase, revealTitleInterface])

  useEffect(() => {
    if (isInterfaceVisible) {
      chronicleButton.current?.focus({ preventScroll: true })
    }
  }, [isInterfaceVisible])

  const isWaitingForAwakening = formationPhase === 'solitary_particle' && !shouldUseStaticTitle

  const beginSlowGathering = useCallback(() => {
    setFormationPhase((currentPhase) => (currentPhase === 'solitary_particle' ? 'slow_gathering' : currentPhase))
    playInteractionFeedback('distant_presence')
    playInteractionFeedback('rising_whoosh')
  }, [playInteractionFeedback])

  useEffect(() => {
    if (!isWaitingForAwakening) {
      return
    }
    awakeningButton.current?.focus({ preventScroll: true })
    const handleAwakeningKey = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key !== 'Enter' && keyboardEvent.key !== ' ') {
        return
      }
      if (keyboardEvent.target instanceof HTMLElement && keyboardEvent.target !== document.body) {
        return
      }
      keyboardEvent.preventDefault()
      beginSlowGathering()
    }
    window.addEventListener('keydown', handleAwakeningKey)
    return () => window.removeEventListener('keydown', handleAwakeningKey)
  }, [isWaitingForAwakening, beginSlowGathering])

  const latestFormationPhase = useRef<CosmicFormationPhase>(formationPhase)
  useEffect(() => {
    latestFormationPhase.current = formationPhase
  }, [formationPhase])

  const releaseTheExpansion = () => {
    if (latestFormationPhase.current !== 'slow_gathering') {
      return
    }
    latestFormationPhase.current = 'expansion'
    playInteractionFeedback('stamp_impact')
    setFormationPhase('expansion')
    pendingTimeoutIdentifiers.current.push(
      window.setTimeout(() => setFormationPhase('title_formation'), expansionDurationMilliseconds),
    )
  }

  const releaseTheExpansionWhenFramesStall = useRef(releaseTheExpansion)
  useEffect(() => {
    releaseTheExpansionWhenFramesStall.current = releaseTheExpansion
  })

  useEffect(() => {
    if (formationPhase !== 'slow_gathering') {
      return
    }
    const gatheringSafetyTimeoutIdentifier = window.setTimeout(() => {
      if (latestFormationPhase.current === 'slow_gathering') {
        releaseTheExpansionWhenFramesStall.current()
      }
    }, gatheringSafetyMilliseconds)
    return () => window.clearTimeout(gatheringSafetyTimeoutIdentifier)
  }, [formationPhase])

  const skipCosmicOrigin = () => {
    pendingTimeoutIdentifiers.current.forEach((timeoutIdentifier) => window.clearTimeout(timeoutIdentifier))
    setFormationPhase('title_formation')
    revealTitleInterface()
  }

  return (
    <main id="main-content" className="relative mx-auto flex h-dvh min-h-[34rem] w-full flex-col overflow-hidden">
      {shouldUseStaticTitle ? null : (
        <div
          className="cosmic-void-backdrop"
          data-visible={!isInterfaceVisible}
          aria-hidden="true"
        />
      )}
      {shouldUseStaticTitle ? null : (
        <CosmicTitleFormation
          formationPhase={formationPhase}
          upperTitleLine={upperTitleLine}
          lowerTitleLine={lowerTitleLine}
          onCriticalMassReached={releaseTheExpansion}
          onFormationSettled={revealTitleInterface}
          onAnimationUnavailable={() => setIsCanvasAnimationAvailable(false)}
        />
      )}

      <h1
        className={
          shouldUseStaticTitle
            ? 'display-title relative mt-[18dvh] px-5 text-center text-[clamp(3.5rem,16vw,10rem)]'
            : 'visually-hidden-text'
        }
      >
        <span className="block">{upperTitleLine}</span>
        <span className="block text-blood-accent">{lowerTitleLine}</span>
      </h1>

      {isWaitingForAwakening ? (
        <button
          ref={awakeningButton}
          type="button"
          className="solitary-particle-awakening-button absolute inset-0 flex cursor-pointer flex-col items-center justify-end gap-2 bg-transparent px-5 pb-[20dvh] text-center"
          aria-label={cosmicOriginCopy.awakenAccessibleLabel}
          onClick={beginSlowGathering}
        >
          <span className="solitary-particle-instruction dossier-label">{cosmicOriginCopy.awakenInstruction}</span>
          <span className="solitary-particle-instruction solitary-particle-instruction-late text-xs text-paper-muted">
            {cosmicOriginCopy.keyboardHint}
          </span>
        </button>
      ) : null}

      {formationPhase !== 'solitary_particle' && !isInterfaceVisible ? (
        <button
          type="button"
          className="quiet-action-button absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 !bg-void-base"
          onClick={skipCosmicOrigin}
        >
          <FastForward size={18} weight="fill" aria-hidden="true" />
          {cosmicOriginCopy.skipButton}
        </button>
      ) : null}

      {isInterfaceVisible ? (
        <div className="relative mt-auto flex flex-col items-center px-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] text-center">
          <p
            className="entrance-from-below font-[family-name:var(--font-dossier)] text-sm tracking-[0.12em] text-paper-muted uppercase"
            style={{ '--entrance-order': 0 } as CSSProperties}
          >
            {titleScreenCopy.tagline}
          </p>
          <p
            className="narrative-prose entrance-from-below mt-4 max-w-xl italic"
            style={{ '--entrance-order': 1 } as CSSProperties}
          >
            {titleScreenCopy.openingParagraph}
          </p>
          <button
            ref={chronicleButton}
            type="button"
            className="primary-action-button entrance-from-below mt-7 text-xl"
            style={{ '--entrance-order': 2 } as CSSProperties}
            onClick={() => {
              playInteractionFeedback('confirmation')
              onChronicleOpened()
            }}
          >
            {hasChronicleInProgress ? titleScreenCopy.continueChronicleButton : titleScreenCopy.startButton}
            <ArrowRight size={22} weight="bold" aria-hidden="true" />
          </button>
          <p
            className="entrance-from-below mt-6 max-w-md text-xs text-paper-muted"
            style={{ '--entrance-order': 3 } as CSSProperties}
          >
            {titleScreenCopy.demonstrationNotice}
          </p>
          <p className="dossier-label mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <span>{spanishInterfaceCopy.versionLabel}</span>
            <button
              type="button"
              className="min-h-[44px] px-2 underline decoration-ink-line underline-offset-4 hover:text-paper-text"
              onClick={onAcknowledgementsRequested}
            >
              {titleScreenCopy.acknowledgementsLink}
            </button>
            <button
              type="button"
              className="min-h-[44px] px-2 underline decoration-ink-line underline-offset-4 hover:text-paper-text"
              onClick={onProfileRequested}
            >
              {titleScreenCopy.profileLink}
            </button>
          </p>
        </div>
      ) : null}
    </main>
  )
}

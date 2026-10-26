import { ArrowRight, FastForward } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { chooseAnimationVariantName } from '../animation/animation_variety'
import { alphaPaintedLikeColorString } from '../animation/canvas_alpha'
import { useInteractionFeedback } from '../audio/interaction_feedback'
import type { NarrationPanel } from '../demonstration/threshold_narration_script'
import { personalizeNarrativeText } from '../game_state/chronicle_state'
import type { InvestigatorRegistration } from '../game_state/chronicle_state'
import { usePlayerSettings } from '../settings/player_settings'
import { spanishInterfaceCopy } from '../spanish_interface_copy'
import { PresentationTitleCard } from './PresentationTitleCard'
import { TypewriterNarration } from './TypewriterNarration'

const panelEntranceVariantNames = ['slide_from_left', 'drop_from_above', 'unfold_from_center', 'tilt_from_right'] as const

type DriftingStar = {
  horizontalShare: number
  verticalShare: number
  depth: number
  twinkleOffset: number
  isArcaneColored: boolean
}

function DriftingStarfieldBackdrop({ driftAcceleration }: { driftAcceleration: number }) {
  const { shouldReduceMotion } = usePlayerSettings()
  const starfieldCanvas = useRef<HTMLCanvasElement>(null)
  const currentDriftAcceleration = useRef(driftAcceleration)

  useEffect(() => {
    currentDriftAcceleration.current = driftAcceleration > 0 ? 1 : 0
  }, [driftAcceleration])

  useEffect(() => {
    const canvasElement = starfieldCanvas.current
    const drawingContext = canvasElement?.getContext('2d')
    if (!canvasElement || !drawingContext) {
      return
    }
    const driftingStars: DriftingStar[] = Array.from({ length: 190 }, () => ({
      horizontalShare: Math.random(),
      verticalShare: Math.random(),
      depth: 0.2 + Math.random() * 0.8,
      twinkleOffset: Math.random() * Math.PI * 2,
      isArcaneColored: Math.random() < 0.08,
    }))
    let animationFrameIdentifier = 0
    let previousTimestamp = performance.now()
    let currentSpeedBoost = 0

    const fitCanvasToViewport = () => {
      const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      canvasElement.width = Math.floor(canvasElement.clientWidth * devicePixelRatio)
      canvasElement.height = Math.floor(canvasElement.clientHeight * devicePixelRatio)
      drawingContext.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
    }

    const drawStarfield = (frameTimestamp: number) => {
      const elapsedSeconds = Math.min(0.1, (frameTimestamp - previousTimestamp) / 1000)
      previousTimestamp = frameTimestamp
      const canvasWidth = canvasElement.clientWidth
      const canvasHeight = canvasElement.clientHeight
      currentSpeedBoost += (currentDriftAcceleration.current - currentSpeedBoost) * Math.min(1, elapsedSeconds * 3)
      currentDriftAcceleration.current *= Math.pow(0.04, elapsedSeconds)
      drawingContext.clearRect(0, 0, canvasWidth, canvasHeight)
      let paintedStarColor = ''
      for (const driftingStar of driftingStars) {
        driftingStar.verticalShare += elapsedSeconds * driftingStar.depth * (0.006 + currentSpeedBoost * 0.5)
        if (driftingStar.verticalShare > 1.02) {
          driftingStar.verticalShare = -0.02
          driftingStar.horizontalShare = Math.random()
        }
        const twinkle = 0.55 + Math.sin(frameTimestamp / 600 + driftingStar.twinkleOffset) * 0.45
        const starLength = 1 + driftingStar.depth * 1.6 + currentSpeedBoost * driftingStar.depth * 46
        const starColor = driftingStar.isArcaneColored ? 'rgb(94, 230, 208)' : 'rgb(232, 230, 225)'
        if (starColor !== paintedStarColor) {
          drawingContext.fillStyle = starColor
          paintedStarColor = starColor
        }
        drawingContext.globalAlpha = alphaPaintedLikeColorString(
          driftingStar.isArcaneColored ? 0.5 * twinkle : 0.55 * twinkle * driftingStar.depth,
        )
        drawingContext.fillRect(
          driftingStar.horizontalShare * canvasWidth,
          driftingStar.verticalShare * canvasHeight,
          1 + driftingStar.depth * 1.2,
          starLength,
        )
      }
      drawingContext.globalAlpha = 1
      if (!shouldReduceMotion) {
        animationFrameIdentifier = window.requestAnimationFrame(drawStarfield)
      }
    }

    fitCanvasToViewport()
    animationFrameIdentifier = window.requestAnimationFrame(drawStarfield)
    window.addEventListener('resize', fitCanvasToViewport)
    return () => {
      window.cancelAnimationFrame(animationFrameIdentifier)
      window.removeEventListener('resize', fitCanvasToViewport)
    }
  }, [shouldReduceMotion])

  return <canvas ref={starfieldCanvas} className="fixed inset-0 -z-[1] h-full w-full" aria-hidden="true" />
}

type PanelNarrationScreenProperties = {
  chapterLabel: string
  chapterTitle: string
  narrationPanels: NarrationPanel[]
  finishButtonText: string
  shouldShowStarfield: boolean
  investigatorRegistration: InvestigatorRegistration | null
  onNarrationFinished: () => void
}

export function PanelNarrationScreen({
  chapterLabel,
  chapterTitle,
  narrationPanels,
  finishButtonText,
  shouldShowStarfield,
  investigatorRegistration,
  onNarrationFinished,
}: PanelNarrationScreenProperties) {
  const thresholdCopy = spanishInterfaceCopy.thresholdNarration
  const panelEntranceVariantName = useRef(chooseAnimationVariantName('narration_panel', panelEntranceVariantNames))
  const playInteractionFeedback = useInteractionFeedback()
  const [isPresentationCardVisible, setIsPresentationCardVisible] = useState(true)
  const [currentPanelIndex, setCurrentPanelIndex] = useState(0)
  const [isPanelRevealFinished, setIsPanelRevealFinished] = useState(false)
  const [isImmediateCompletionRequested, setIsImmediateCompletionRequested] = useState(false)
  const [starfieldDriftAcceleration, setStarfieldDriftAcceleration] = useState(0)
  const advanceButton = useRef<HTMLButtonElement>(null)

  const currentPanel = narrationPanels[currentPanelIndex]
  const isLastPanel = currentPanelIndex === narrationPanels.length - 1

  useEffect(() => {
    if (!isPresentationCardVisible) {
      advanceButton.current?.focus({ preventScroll: true })
    }
  }, [isPresentationCardVisible, currentPanelIndex])

  const advanceNarration = () => {
    if (!isPanelRevealFinished) {
      setIsImmediateCompletionRequested(true)
      return
    }
    if (isLastPanel) {
      playInteractionFeedback('stamp_impact')
      onNarrationFinished()
      return
    }
    playInteractionFeedback('panel_open')
    panelEntranceVariantName.current = chooseAnimationVariantName('narration_panel', panelEntranceVariantNames)
    setStarfieldDriftAcceleration((previousAcceleration) => previousAcceleration + 1)
    setIsPanelRevealFinished(false)
    setIsImmediateCompletionRequested(false)
    setCurrentPanelIndex((previousIndex) => previousIndex + 1)
  }

  if (isPresentationCardVisible) {
    return (
      <PresentationTitleCard
        chapterLabel={chapterLabel}
        chapterTitle={chapterTitle}
        onPresentationFinished={() => setIsPresentationCardVisible(false)}
      />
    )
  }

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center px-4 pt-16 pb-10 sm:px-8"
    >
      {shouldShowStarfield ? <DriftingStarfieldBackdrop driftAcceleration={starfieldDriftAcceleration} /> : null}

      <div className="flex items-baseline justify-between gap-4">
        <p className="dossier-label !text-blood-accent-text">{chapterLabel}</p>
        <p className="dossier-label" aria-live="polite">
          {thresholdCopy.panelCounter(currentPanelIndex + 1, narrationPanels.length)}
        </p>
      </div>

      <section
        key={currentPanel.identifier}
        data-entrance-variant={panelEntranceVariantName.current}
        className="comic-panel comic-panel-cut-corner narration-panel-entrance mt-3 min-h-[15rem] cursor-pointer p-5 sm:min-h-[13rem] sm:p-8"
        onClick={() => setIsImmediateCompletionRequested(true)}
      >
        <h1 className="display-title text-3xl sm:text-4xl">{currentPanel.captionLabel}</h1>
        <div className="narrative-prose mt-4 text-[1.1875rem]" aria-live="polite">
          <TypewriterNarration
            paragraphs={[personalizeNarrativeText(currentPanel.paragraphText, investigatorRegistration)]}
            shouldAnimateReveal
            isImmediateCompletionRequested={isImmediateCompletionRequested}
            onRevealCompleted={() => setIsPanelRevealFinished(true)}
            onRevealProgressed={() => undefined}
          />
        </div>
      </section>

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        {isLastPanel ? (
          <span />
        ) : (
          <button
            type="button"
            className="quiet-action-button"
            onClick={() => {
              playInteractionFeedback('option_click')
              onNarrationFinished()
            }}
          >
            <FastForward size={18} weight="fill" aria-hidden="true" />
            {thresholdCopy.skipButton}
          </button>
        )}
        <button ref={advanceButton} type="button" className="primary-action-button" onClick={advanceNarration}>
          {!isPanelRevealFinished
            ? thresholdCopy.completeTextButton
            : isLastPanel
              ? finishButtonText
              : thresholdCopy.continueButton}
          <ArrowRight size={22} weight="bold" aria-hidden="true" />
        </button>
      </div>
    </main>
  )
}

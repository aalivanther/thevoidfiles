import { ArrowRight, ArrowsClockwise, Eye } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { useInteractionFeedback } from '../audio/interaction_feedback'
import {
  deriveInvestigatorAttributesFromAnswers,
  evaluationReadingByDominantAttribute,
  evaluationVignettes,
} from '../demonstration/investigator_evaluation_script'
import type {
  ChosenEvaluationAnswer,
  EvaluatedAttributeName,
} from '../demonstration/investigator_evaluation_script'
import type { InvestigatorAttributes } from '../game_state/chronicle_state'
import { spanishInterfaceCopy } from '../spanish_interface_copy'
import { PresentationTitleCard } from './PresentationTitleCard'

const evaluatedAttributeDisplayOrder: EvaluatedAttributeName[] = ['im', 'if', 'c', 'o', 'co', 'm']
const maximumInitialAttributeValue = 10
const answerAcknowledgementMilliseconds = 420
const profileReadingInterludeMilliseconds = 3400
const radarChartRadius = 78
const radarChartCenter = 100

type InkblotShape = { horizontalCenter: number; verticalCenter: number; radius: number }

function createSymmetricalInkblotShapes(): InkblotShape[] {
  const inkblotShapes: InkblotShape[] = []
  const shapeCount = 26
  for (let shapeIndex = 0; shapeIndex < shapeCount; shapeIndex += 1) {
    const distanceFromAxis = Math.pow(Math.random(), 0.8) * 74
    inkblotShapes.push({
      horizontalCenter: distanceFromAxis,
      verticalCenter: 18 + Math.random() * 124,
      radius: 5 + Math.random() * (22 - distanceFromAxis * 0.16),
    })
  }
  return inkblotShapes
}

function SymmetricalInkblotFigure() {
  const inkblotShapes = useMemo(createSymmetricalInkblotShapes, [])
  return (
    <div className="aged-paper-document entrance-stamp-pop mx-auto w-full max-w-[13.5rem] rotate-[0.8deg] p-2.5">
      <svg
        viewBox="0 0 200 160"
        role="img"
        aria-label={spanishInterfaceCopy.evaluation.inkblotAccessibleLabel}
        className="block w-full"
      >
        <defs>
          <filter id="inkblot-merging-filter">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4.2" result="blurredInk" />
            <feColorMatrix in="blurredInk" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10" result="mergedInk" />
            <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" result="inkGrain" />
            <feDisplacementMap in="mergedInk" in2="inkGrain" scale="9" />
          </filter>
        </defs>
        <g filter="url(#inkblot-merging-filter)" fill="#14110d">
          {inkblotShapes.map((inkblotShape, shapeIndex) => (
            <g key={shapeIndex}>
              <circle cx={100 + inkblotShape.horizontalCenter} cy={inkblotShape.verticalCenter} r={inkblotShape.radius} />
              <circle cx={100 - inkblotShape.horizontalCenter} cy={inkblotShape.verticalCenter} r={inkblotShape.radius} />
            </g>
          ))}
        </g>
      </svg>
    </div>
  )
}

function calculateRadarPoint(axisIndex: number, axisCount: number, shareOfRadius: number): string {
  const axisAngle = (Math.PI * 2 * axisIndex) / axisCount - Math.PI / 2
  const horizontalPosition = radarChartCenter + Math.cos(axisAngle) * radarChartRadius * shareOfRadius
  const verticalPosition = radarChartCenter + Math.sin(axisAngle) * radarChartRadius * shareOfRadius
  return `${horizontalPosition.toFixed(1)},${verticalPosition.toFixed(1)}`
}

function AttributeRadarChart({ investigatorAttributes }: { investigatorAttributes: InvestigatorAttributes }) {
  const axisCount = evaluatedAttributeDisplayOrder.length
  const profilePoints = evaluatedAttributeDisplayOrder
    .map((attributeName, axisIndex) =>
      calculateRadarPoint(axisIndex, axisCount, investigatorAttributes[attributeName] / maximumInitialAttributeValue),
    )
    .join(' ')
  return (
    <svg viewBox="0 0 200 200" className="profile-radar-chart mx-auto block w-full max-w-[17rem]" aria-hidden="true">
      {[0.25, 0.5, 0.75, 1].map((ringShare) => (
        <polygon
          key={ringShare}
          className="profile-radar-ring"
          points={evaluatedAttributeDisplayOrder
            .map((_, axisIndex) => calculateRadarPoint(axisIndex, axisCount, ringShare))
            .join(' ')}
        />
      ))}
      {evaluatedAttributeDisplayOrder.map((attributeName, axisIndex) => {
        const [labelHorizontalPosition, labelVerticalPosition] = calculateRadarPoint(axisIndex, axisCount, 1.19).split(',')
        const [axisEndHorizontalPosition, axisEndVerticalPosition] = calculateRadarPoint(axisIndex, axisCount, 1).split(',')
        return (
          <g key={attributeName}>
            <line
              className="profile-radar-axis"
              x1={radarChartCenter}
              y1={radarChartCenter}
              x2={axisEndHorizontalPosition}
              y2={axisEndVerticalPosition}
              style={{ '--entrance-order': axisIndex } as CSSProperties}
            />
            <text className="profile-radar-label" x={labelHorizontalPosition} y={labelVerticalPosition}>
              {spanishInterfaceCopy.attributes[attributeName].abbreviation}
            </text>
          </g>
        )
      })}
      <polygon className="profile-radar-shape" points={profilePoints} />
      <line className="profile-radar-sweep" x1={radarChartCenter} y1={radarChartCenter} x2={radarChartCenter} y2={radarChartCenter - radarChartRadius} />
    </svg>
  )
}

function ProfileReadingInterlude() {
  const evaluationCopy = spanishInterfaceCopy.evaluation
  const [flickeringAbbreviations, setFlickeringAbbreviations] = useState<string[]>([])

  useEffect(() => {
    const abbreviationPool = evaluatedAttributeDisplayOrder.map(
      (attributeName) => spanishInterfaceCopy.attributes[attributeName].abbreviation,
    )
    const flickerIntervalIdentifier = window.setInterval(() => {
      setFlickeringAbbreviations(
        Array.from({ length: 9 }, () => abbreviationPool[Math.floor(Math.random() * abbreviationPool.length)]),
      )
    }, 110)
    return () => window.clearInterval(flickerIntervalIdentifier)
  }, [])

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center px-5 py-16 text-center"
      role="status"
    >
      <div className="profile-reading-eye" aria-hidden="true">
        <span className="profile-reading-eye-iris" />
      </div>
      <p className="display-title mt-8 text-3xl sm:text-4xl">{evaluationCopy.readingInterludeTitle}</p>
      <p className="mt-3 text-sm text-paper-muted">{evaluationCopy.readingInterludeHint}</p>
      <p
        className="mt-6 grid grid-cols-9 gap-2 font-[family-name:var(--font-dossier)] text-sm font-bold text-blood-accent-text"
        aria-hidden="true"
      >
        {flickeringAbbreviations.map((abbreviation, abbreviationIndex) => (
          <span key={abbreviationIndex}>{abbreviation}</span>
        ))}
      </p>
      <div className="profile-reading-progress mt-6" aria-hidden="true" />
    </main>
  )
}

function AttributeReadingRow({
  abbreviation,
  name,
  attributeValue,
  rowIndex,
}: {
  abbreviation: string
  name: string
  attributeValue: number
  rowIndex: number
}) {
  return (
    <div
      className="entrance-from-left grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-3 border-t border-ink-line py-2.5"
      style={{ '--entrance-order': rowIndex * 2 } as CSSProperties}
    >
      <span className="display-title text-2xl">{abbreviation}</span>
      <div className="min-w-0">
        <p className="truncate text-sm text-paper-muted">{name}</p>
        <div
          className="mt-1 flex gap-1"
          role="img"
          aria-label={spanishInterfaceCopy.evaluation.attributeScaleDescription(attributeValue)}
        >
          {Array.from({ length: maximumInitialAttributeValue }, (_, segmentIndex) => (
            <span
              key={segmentIndex}
              className={`attribute-scale-segment h-2.5 flex-1 ${segmentIndex < attributeValue ? 'bg-blood-accent' : 'bg-ink-line'}`}
              style={{ '--entrance-order': rowIndex * 2 + segmentIndex } as CSSProperties}
            />
          ))}
        </div>
      </div>
      <span className="font-[family-name:var(--font-dossier)] text-xl font-bold tabular-nums">{attributeValue}</span>
    </div>
  )
}

type InvestigatorEvaluationScreenProperties = {
  existingAttributes: InvestigatorAttributes | null
  onEvaluationCompleted: (investigatorAttributes: InvestigatorAttributes) => void
  onEvaluationDiscarded: () => void
  onReadingAccepted: () => void
}

export function InvestigatorEvaluationScreen({
  existingAttributes,
  onEvaluationCompleted,
  onEvaluationDiscarded,
  onReadingAccepted,
}: InvestigatorEvaluationScreenProperties) {
  const evaluationCopy = spanishInterfaceCopy.evaluation
  const playInteractionFeedback = useInteractionFeedback()
  const [isPresentationCardVisible, setIsPresentationCardVisible] = useState(existingAttributes === null)
  const [hasObservationBegun, setHasObservationBegun] = useState(false)
  const [chosenAnswers, setChosenAnswers] = useState<ChosenEvaluationAnswer[]>([])
  const [isReadingInterludeVisible, setIsReadingInterludeVisible] = useState(false)
  const [answerIdentifierBeingAcknowledged, setAnswerIdentifierBeingAcknowledged] = useState<string | null>(null)

  const currentVignette = evaluationVignettes[chosenAnswers.length] ?? null
  const shuffledAnswers = useMemo(
    () => (currentVignette ? [...currentVignette.answers].sort(() => Math.random() - 0.5) : []),
    [currentVignette],
  )

  useEffect(() => {
    if (answerIdentifierBeingAcknowledged === null || !currentVignette) {
      return
    }
    const acknowledgedAnswer = currentVignette.answers.find(
      (candidateAnswer) => candidateAnswer.identifier === answerIdentifierBeingAcknowledged,
    )
    const acknowledgementTimeoutIdentifier = window.setTimeout(() => {
      setAnswerIdentifierBeingAcknowledged(null)
      if (!acknowledgedAnswer) {
        return
      }
      const answersIncludingThisOne = [
        ...chosenAnswers,
        { evaluationVignette: currentVignette, evaluationAnswer: acknowledgedAnswer },
      ]
      setChosenAnswers(answersIncludingThisOne)
      if (answersIncludingThisOne.length === evaluationVignettes.length) {
        playInteractionFeedback('rising_whoosh')
        setIsReadingInterludeVisible(true)
      }
    }, answerAcknowledgementMilliseconds)
    return () => window.clearTimeout(acknowledgementTimeoutIdentifier)
  }, [answerIdentifierBeingAcknowledged, chosenAnswers, currentVignette, onEvaluationCompleted, playInteractionFeedback])

  useEffect(() => {
    if (!isReadingInterludeVisible) {
      return
    }
    const interludeTimeoutIdentifier = window.setTimeout(() => {
      playInteractionFeedback('stamp_impact')
      setIsReadingInterludeVisible(false)
      onEvaluationCompleted(deriveInvestigatorAttributesFromAnswers(chosenAnswers))
    }, profileReadingInterludeMilliseconds)
    return () => window.clearTimeout(interludeTimeoutIdentifier)
  }, [isReadingInterludeVisible, chosenAnswers, onEvaluationCompleted, playInteractionFeedback])

  if (isReadingInterludeVisible) {
    return <ProfileReadingInterlude />
  }

  if (isPresentationCardVisible) {
    return (
      <PresentationTitleCard
        chapterLabel={evaluationCopy.chapterLabel}
        chapterTitle={evaluationCopy.chapterTitle}
        onPresentationFinished={() => setIsPresentationCardVisible(false)}
      />
    )
  }

  if (existingAttributes) {
    const dominantAttributeName = evaluatedAttributeDisplayOrder.reduce((strongestName, candidateName) =>
      existingAttributes[candidateName] > existingAttributes[strongestName] ? candidateName : strongestName,
    )
    const attributeTotal = Object.values(existingAttributes).reduce(
      (runningTotal, attributeValue) => runningTotal + attributeValue,
      0,
    )
    return (
      <main id="main-content" className="mx-auto w-full max-w-2xl px-4 pt-16 pb-16 sm:px-8 lg:pt-20">
        <p className="dossier-label !text-blood-accent-text">{evaluationCopy.resultLabel}</p>
        <h1 className="display-title mt-2 text-5xl sm:text-6xl">{evaluationCopy.resultTitle}</h1>
        <p className="narrative-prose entrance-from-below mt-4 italic">
          {evaluationReadingByDominantAttribute[dominantAttributeName]}
        </p>

        <div className="mt-6">
          <AttributeRadarChart investigatorAttributes={existingAttributes} />
        </div>

        <div className="comic-panel mt-6 px-4 pt-1 pb-3 sm:px-5">
          {evaluatedAttributeDisplayOrder.map((attributeName, rowIndex) => (
            <AttributeReadingRow
              key={attributeName}
              abbreviation={spanishInterfaceCopy.attributes[attributeName].abbreviation}
              name={spanishInterfaceCopy.attributes[attributeName].name}
              attributeValue={existingAttributes[attributeName]}
              rowIndex={rowIndex}
            />
          ))}
          <AttributeReadingRow
            abbreviation={evaluationCopy.luckAbbreviation}
            name={evaluationCopy.luckName}
            attributeValue={existingAttributes.s}
            rowIndex={evaluatedAttributeDisplayOrder.length}
          />
          <p className="mt-2 text-xs text-paper-muted">{evaluationCopy.luckExplanation}</p>
          <p className="dossier-label mt-3 text-right">
            {evaluationCopy.totalLabel}: <span className="text-paper-text">{attributeTotal}</span>
          </p>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            className="quiet-action-button"
            onClick={() => {
              playInteractionFeedback('option_click')
              setChosenAnswers([])
              setHasObservationBegun(true)
              onEvaluationDiscarded()
            }}
          >
            <ArrowsClockwise size={18} weight="bold" aria-hidden="true" />
            {evaluationCopy.repeatButton}
          </button>
          <button
            type="button"
            className="primary-action-button"
            onClick={() => {
              playInteractionFeedback('confirmation')
              onReadingAccepted()
            }}
          >
            {evaluationCopy.acceptButton}
            <ArrowRight size={22} weight="bold" aria-hidden="true" />
          </button>
        </div>
      </main>
    )
  }

  if (!hasObservationBegun) {
    return (
      <main
        id="main-content"
        className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-start justify-center px-5 py-16 sm:px-8"
      >
        <Eye size={44} weight="fill" className="entrance-stamp-pop text-blood-accent" aria-hidden="true" />
        <h1 className="display-title entrance-from-below mt-4 text-4xl sm:text-5xl">{evaluationCopy.chapterTitle}</h1>
        <p className="narrative-prose entrance-from-below mt-4" style={{ '--entrance-order': 1 } as CSSProperties}>
          {evaluationCopy.introduction}
        </p>
        <button
          type="button"
          className="primary-action-button entrance-from-below mt-7"
          style={{ '--entrance-order': 2 } as CSSProperties}
          onClick={() => {
            playInteractionFeedback('confirmation')
            setHasObservationBegun(true)
          }}
        >
          {evaluationCopy.beginButton}
          <ArrowRight size={22} weight="bold" aria-hidden="true" />
        </button>
      </main>
    )
  }

  if (!currentVignette) {
    return null
  }

  return (
    <main id="main-content" className="mx-auto w-full max-w-2xl px-4 pt-16 pb-16 sm:px-8 lg:pt-20">
      <div className="flex items-baseline justify-between gap-4">
        <p className="dossier-label !text-blood-accent-text">{evaluationCopy.chapterLabel}</p>
        <p className="dossier-label" aria-live="polite">
          {evaluationCopy.sceneCounter(chosenAnswers.length + 1, evaluationVignettes.length)}
        </p>
      </div>
      <div className="mt-1 flex gap-1.5" aria-hidden="true">
        {evaluationVignettes.map((evaluationVignette, vignetteIndex) => (
          <span
            key={evaluationVignette.identifier}
            className={`h-1.5 flex-1 transition-colors duration-200 ${
              vignetteIndex <= chosenAnswers.length ? 'bg-blood-accent' : 'bg-ink-line'
            }`}
          />
        ))}
      </div>

      <div key={currentVignette.identifier} className="mt-6">
        {currentVignette.figureKind === 'inkblot' ? <SymmetricalInkblotFigure /> : null}
        <p className="narrative-prose entrance-from-below mt-5">{currentVignette.sceneText}</p>
        <h1
          className="entrance-from-below mt-4 font-[family-name:var(--font-narrative)] text-2xl leading-snug font-semibold"
          style={{ '--entrance-order': 1 } as CSSProperties}
        >
          {currentVignette.questionText}
        </h1>
        <ol className="mt-5 flex flex-col gap-2.5">
          {shuffledAnswers.map((evaluationAnswer, answerIndex) => {
            const isBeingAcknowledged = evaluationAnswer.identifier === answerIdentifierBeingAcknowledged
            return (
              <li
                key={evaluationAnswer.identifier}
                className="entrance-from-left"
                style={{ '--entrance-order': answerIndex + 3 } as CSSProperties}
              >
                <button
                  type="button"
                  className={`suggested-action-button !grid-cols-[auto_1fr] ${
                    isBeingAcknowledged ? '!border-blood-accent-text !bg-void-elevated' : ''
                  }`}
                  disabled={answerIdentifierBeingAcknowledged !== null && !isBeingAcknowledged}
                  onPointerEnter={(pointerEvent) => {
                    if (pointerEvent.pointerType === 'mouse') {
                      playInteractionFeedback('option_hover')
                    }
                  }}
                  onClick={() => {
                    if (answerIdentifierBeingAcknowledged === null) {
                      playInteractionFeedback('option_click')
                      setAnswerIdentifierBeingAcknowledged(evaluationAnswer.identifier)
                    }
                  }}
                >
                  <span className="suggested-action-number" aria-hidden="true">
                    {String.fromCharCode(65 + answerIndex)}
                  </span>
                  <span className="min-w-0 [overflow-wrap:anywhere]">{evaluationAnswer.visibleText}</span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>
    </main>
  )
}

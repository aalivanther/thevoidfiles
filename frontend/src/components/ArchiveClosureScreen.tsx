import { useGSAP } from '@gsap/react'
import { CheckSquare, Square, XSquare } from '@phosphor-icons/react'
import gsap from 'gsap'
import { useEffect, useRef, useState } from 'react'
import { useInteractionFeedback } from '../audio/interaction_feedback'
import { archiveClosureReportCopy, demonstrationArchive } from '../demonstration/demonstration_case_script'
import type { ArchiveObjectiveResult, ArchivePerformanceRatingName } from '../game_state/archive_turn_contract'
import {
  calculateExperienceRequiredForNextLevel,
  calculatePersonalRewardForClosedArchive,
  experienceGainedByPerformanceRatingName,
  formatAmount,
  personalRewardBaseByPerformanceRatingName,
  useChronicleState,
} from '../game_state/chronicle_state'
import { usePlayerSettings } from '../settings/player_settings'
import { spanishInterfaceCopy } from '../spanish_interface_copy'

gsap.registerPlugin(useGSAP)

type ImprovableAttributeName = keyof typeof spanishInterfaceCopy.attributes

const requiredImprovementCount = 2
const noObjectiveResults: ArchiveObjectiveResult[] = []
const closureSequenceSafetyMilliseconds = 3200

export function ArchiveClosureScreen({ onReturnToWhispersRequested }: { onReturnToWhispersRequested: () => void }) {
  const archiveClosureCopy = spanishInterfaceCopy.archiveClosure
  const { chronicleState, changeChronicleState } = useChronicleState()
  const { shouldReduceMotion } = usePlayerSettings()
  const playInteractionFeedback = useInteractionFeedback()
  const closureDocument = useRef<HTMLDivElement>(null)
  const [chosenAttributeNames, setChosenAttributeNames] = useState<ImprovableAttributeName[]>([])
  const returnedOperationalFunds = chronicleState.investigator.operationalFunds
  const { archiveOutcome } = chronicleState.archiveRun
  const aliveArchiveOutcome = archiveOutcome?.kind === 'archive_ended_alive' ? archiveOutcome : null
  const performanceRatingName: ArchivePerformanceRatingName = aliveArchiveOutcome?.performanceRatingName ?? 'disappointing'
  const objectiveResults = aliveArchiveOutcome?.objectiveResults ?? noObjectiveResults
  const countsAsSanctionedClosure = aliveArchiveOutcome?.countsAsSanctionedClosure ?? false
  const performanceStampText = archiveClosureReportCopy.performanceStampTextByRatingName[performanceRatingName]
  const experienceGained = experienceGainedByPerformanceRatingName[performanceRatingName]
  const { investigatorProgression, haveImprovementsBeenConfirmed } = chronicleState
  const [progressionBeforeClosure] = useState(() => ({
    level: investigatorProgression.level,
    unspentExperiencePoints: investigatorProgression.unspentExperiencePoints,
    resolvedArchiveCount: investigatorProgression.resolvedArchiveCount,
    wasClosureAlreadyRecorded: haveImprovementsBeenConfirmed,
  }))
  const previouslyResolvedArchiveCount = progressionBeforeClosure.wasClosureAlreadyRecorded
    ? Math.max(0, progressionBeforeClosure.resolvedArchiveCount - (countsAsSanctionedClosure ? 1 : 0))
    : progressionBeforeClosure.resolvedArchiveCount
  const closureRegister = aliveArchiveOutcome?.closureRegister
  const closingPlaceName = closureRegister?.placeName || chronicleState.investigator.placeName
  const closingWoundCount = closureRegister?.seriousWoundCount ?? chronicleState.investigator.seriousWoundsSuffered
  const closingWoundCause =
    closureRegister?.woundCauseText ??
    (chronicleState.investigator.seriousWoundsSuffered > 0 ? chronicleState.archiveRun.lastSeriousWoundCauseText : null)
  const solvedPieceNames =
    closureRegister?.solvedPieceNames ?? chronicleState.archiveRun.revealedFacts.map((revealedFact) => revealedFact.visibleName)
  const visitedPlaceNames =
    closureRegister?.visitedPlaceNames ?? chronicleState.archiveRun.visitedPlaces.map((visitedPlace) => visitedPlace.placeName)
  const personalReward = countsAsSanctionedClosure
    ? calculatePersonalRewardForClosedArchive(performanceRatingName, previouslyResolvedArchiveCount)
    : 0
  const experienceRequiredForNextLevel = calculateExperienceRequiredForNextLevel(
    progressionBeforeClosure.level,
    previouslyResolvedArchiveCount + (countsAsSanctionedClosure ? 1 : 0),
  )
  const experienceAfterReward = progressionBeforeClosure.unspentExperiencePoints + experienceGained
  const isPromotionReached = progressionBeforeClosure.wasClosureAlreadyRecorded
    ? false
    : experienceAfterReward >= experienceRequiredForNextLevel

  useGSAP(
    () => {
      const countedAmountElements = gsap.utils.toArray<HTMLElement>('[data-counted-amount]')
      if (shouldReduceMotion) {
        countedAmountElements.forEach((countedAmountElement) => {
          countedAmountElement.textContent = formatAmount(Number(countedAmountElement.dataset.countedAmount))
        })
        return
      }
      const closureTimeline = gsap.timeline({ defaults: { ease: 'power3.out' } })
      closureTimeline
        .from('[data-closure-reveal]', { opacity: 0, y: 22, duration: 0.35, stagger: 0.09 })
        .fromTo(
          '[data-performance-stamp]',
          { opacity: 0, scale: 3.2, rotate: -24 },
          {
            opacity: 1,
            scale: 1,
            rotate: -7,
            duration: 0.42,
            ease: 'back.out(1.6)',
            onStart: () => {
              window.setTimeout(() => playInteractionFeedback('stamp_impact'), 260)
            },
          },
          '+=0.1',
        )
        .fromTo(
          closureDocument.current,
          { x: 0, y: 0 },
          { x: 5, y: 3, duration: 0.05, repeat: 3, yoyo: true, ease: 'none' },
          '-=0.12',
        )
      countedAmountElements.forEach((countedAmountElement, elementIndex) => {
        const countingState = { displayedAmount: 0 }
        closureTimeline.to(
          countingState,
          {
            displayedAmount: Number(countedAmountElement.dataset.countedAmount),
            duration: 1.1,
            ease: 'power4.out',
            onUpdate: () => {
              countedAmountElement.textContent = formatAmount(Math.round(countingState.displayedAmount))
            },
          },
          elementIndex === 0 ? '+=0.05' : '<0.15',
        )
      })
    },
    { scope: closureDocument, dependencies: [shouldReduceMotion] },
  )

  useEffect(() => {
    const showFinalAmounts = () => {
      const documentElement = closureDocument.current
      if (!documentElement) {
        return
      }
      gsap.getTweensOf('*').forEach((runningTween) => runningTween.progress(1))
      gsap.set(documentElement.querySelectorAll('[data-closure-reveal], [data-performance-stamp]'), {
        opacity: 1,
      })
      documentElement.querySelectorAll<HTMLElement>('[data-counted-amount]').forEach((countedAmountElement) => {
        countedAmountElement.textContent = formatAmount(Number(countedAmountElement.dataset.countedAmount))
      })
    }
    const safetyTimeoutIdentifier = window.setTimeout(showFinalAmounts, closureSequenceSafetyMilliseconds)
    return () => window.clearTimeout(safetyTimeoutIdentifier)
  }, [],
  )

  const toggleAttributeChoice = (attributeName: ImprovableAttributeName) => {
    if (chronicleState.haveImprovementsBeenConfirmed) {
      return
    }
    playInteractionFeedback('option_click')
    setChosenAttributeNames((previousNames) => {
      if (previousNames.includes(attributeName)) {
        return previousNames.filter((previousName) => previousName !== attributeName)
      }
      if (previousNames.length >= requiredImprovementCount) {
        return previousNames
      }
      return [...previousNames, attributeName]
    })
  }

  return (
    <main id="main-content" className="mx-auto w-full max-w-3xl px-4 pt-6 pb-20 sm:px-8">
      <div ref={closureDocument} className="aged-paper-document relative overflow-hidden p-5 sm:p-8">
        <div data-closure-reveal>
          <p className="font-[family-name:var(--font-dossier)] text-xs font-bold tracking-[0.14em] uppercase opacity-70">
            {archiveClosureCopy.eyebrow} · {spanishInterfaceCopy.playScreen.archiveLabel}{' '}
            {chronicleState.archiveRun.archiveNumberLabel ?? demonstrationArchive.archiveNumberLabel}
          </p>
          <h1 className="display-title mt-2 text-4xl sm:text-6xl">
            {chronicleState.archiveRun.archiveTitle ?? demonstrationArchive.archiveTitle}
          </h1>
        </div>

        <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <section data-closure-reveal aria-labelledby="closure-objectives-title" className="min-w-0">
            <h2
              id="closure-objectives-title"
              className="font-[family-name:var(--font-dossier)] text-sm font-bold tracking-[0.1em] uppercase"
            >
              {archiveClosureCopy.objectivesTitle}
            </h2>
            <ul className="mt-2 flex flex-col gap-1.5">
              {objectiveResults.map((objective) => (
                <li key={objective.visibleText} className="flex items-start gap-2 text-[0.9688rem]">
                  {objective.wasAchieved ? (
                    <CheckSquare size={20} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <XSquare size={20} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
                  )}
                  <span>{objective.visibleText}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="shrink-0 self-center sm:self-start" data-performance-stamp>
            <p className="visually-hidden-text">{archiveClosureCopy.performanceLabel}</p>
            <p className="stamp-mark">{performanceStampText}</p>
          </div>
        </div>

        <section data-closure-reveal aria-labelledby="closure-calculation-title" className="mt-7 border-t-2 border-black/80 pt-4">
          <h2
            id="closure-calculation-title"
            className="font-[family-name:var(--font-dossier)] text-sm font-bold tracking-[0.1em] uppercase"
          >
            {archiveClosureCopy.calculationTitle}
          </h2>
          <dl className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm font-semibold">{archiveClosureCopy.experienceLabel}</dt>
              <dd className="display-title text-5xl tabular-nums">
                +<span data-counted-amount={experienceGained}>0</span>
              </dd>
              <dd className="font-[family-name:var(--font-dossier)] text-xs opacity-75">
                {archiveClosureReportCopy.experienceFormula(performanceStampText, experienceGained)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold">{archiveClosureCopy.personalRewardLabel}</dt>
              <dd className="display-title text-5xl tabular-nums">
                +<span data-counted-amount={personalReward}>0</span>
              </dd>
              <dd className="font-[family-name:var(--font-dossier)] text-xs opacity-75">
                {countsAsSanctionedClosure
                  ? archiveClosureReportCopy.rewardFormula(
                      previouslyResolvedArchiveCount,
                      formatAmount(personalRewardBaseByPerformanceRatingName[performanceRatingName]),
                    )
                  : archiveClosureReportCopy.rewardWithheldFormula}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold">{archiveClosureCopy.returnedFundsLabel}</dt>
              <dd className="display-title text-5xl tabular-nums">
                <span data-counted-amount={returnedOperationalFunds}>0</span>
              </dd>
            </div>
          </dl>
        </section>

        <section data-closure-reveal aria-labelledby="closure-register-title" className="mt-7 border-t-2 border-black/80 pt-4">
          <h2
            id="closure-register-title"
            className="font-[family-name:var(--font-dossier)] text-sm font-bold tracking-[0.1em] uppercase"
          >
            {archiveClosureCopy.registerTitle}
          </h2>
          <dl className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-semibold">{archiveClosureCopy.registerPlaceLabel}</dt>
              <dd className="[overflow-wrap:anywhere]">{closingPlaceName}</dd>
            </div>
            <div>
              <dt className="text-sm font-semibold">{archiveClosureCopy.registerWoundsLabel}</dt>
              <dd>
                {closingWoundCount > 0
                  ? archiveClosureCopy.registerWoundCount(closingWoundCount)
                  : archiveClosureCopy.registerNoWounds}
              </dd>
              {closingWoundCause ? (
                <dd className="mt-1 text-sm [overflow-wrap:anywhere]">
                  <span className="font-semibold">{archiveClosureCopy.registerWoundCauseLabel}. </span>
                  {closingWoundCause}
                </dd>
              ) : closingWoundCount > 0 ? (
                <dd className="mt-1 text-sm">{archiveClosureCopy.registerNoWoundCause}</dd>
              ) : null}
            </div>
            <div>
              <dt className="text-sm font-semibold">{archiveClosureCopy.registerSolvedPiecesLabel}</dt>
              <dd className="[overflow-wrap:anywhere]">
                {solvedPieceNames.length > 0 ? solvedPieceNames.join('; ') : archiveClosureCopy.registerNoSolvedPieces}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold">{archiveClosureCopy.registerVisitedPlacesLabel}</dt>
              <dd className="[overflow-wrap:anywhere]">
                {visitedPlaceNames.length > 0 ? visitedPlaceNames.join('; ') : closingPlaceName}
              </dd>
            </div>
          </dl>
        </section>

        <p data-closure-reveal className="mt-6 border-l-4 border-black/70 pl-3 font-[family-name:var(--font-narrative)] text-sm italic">
          {archiveClosureCopy.undiscoveredNotice}
        </p>
      </div>

      <section className="comic-panel mt-8 p-5 sm:p-6" aria-labelledby="closure-promotion-title">
        <h2 id="closure-promotion-title" className="display-title text-3xl text-blood-accent-text">
          {isPromotionReached ? archiveClosureCopy.promotionTitle : archiveClosureReportCopy.promotionNotReachedTitle}
        </h2>
        <p className="mt-1 text-sm text-paper-muted">
          {isPromotionReached
            ? archiveClosureReportCopy.promotionReachedDescription(
                progressionBeforeClosure.level + 1,
                experienceAfterReward - experienceRequiredForNextLevel,
              )
            : progressionBeforeClosure.wasClosureAlreadyRecorded
              ? archiveClosureReportCopy.closureRecorded
              : archiveClosureReportCopy.promotionNotReachedDescription(experienceAfterReward, experienceRequiredForNextLevel)}
        </p>

        <div className={isPromotionReached ? 'mt-4 flex items-baseline justify-between gap-3' : 'hidden'}>
          <p className="text-sm font-semibold">{archiveClosureCopy.promotionInstruction}</p>
          <p className="dossier-label" aria-live="polite">
            {archiveClosureCopy.promotionChosenCount(chosenAttributeNames.length)}
          </p>
        </div>
        <div className={isPromotionReached ? 'mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3' : 'hidden'}>
          {(Object.keys(spanishInterfaceCopy.attributes) as ImprovableAttributeName[]).map((attributeName) => {
            const isChosen = chosenAttributeNames.includes(attributeName)
            const isChoiceBlocked =
              chronicleState.haveImprovementsBeenConfirmed ||
              (!isChosen && chosenAttributeNames.length >= requiredImprovementCount)
            return (
              <button
                key={attributeName}
                type="button"
                className={`suggested-action-button !grid-cols-[auto_1fr] ${
                  isChosen ? '!border-blood-accent-text !bg-void-elevated' : ''
                }`}
                aria-pressed={isChosen}
                disabled={isChoiceBlocked && !isChosen}
                onClick={() => toggleAttributeChoice(attributeName)}
              >
                {isChosen ? (
                  <CheckSquare size={22} weight="fill" className="text-blood-accent-text" aria-hidden="true" />
                ) : (
                  <Square size={22} weight="bold" className="text-paper-muted" aria-hidden="true" />
                )}
                <span>
                  <span className="display-title block text-xl">
                    {spanishInterfaceCopy.attributes[attributeName].abbreviation}
                    {isChosen ? <span className="text-blood-accent-text"> +1</span> : null}
                  </span>
                  <span className="block text-xs text-paper-muted">
                    {spanishInterfaceCopy.attributes[attributeName].name}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-5 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-success" role="status">
            {chronicleState.haveImprovementsBeenConfirmed
              ? isPromotionReached
                ? archiveClosureCopy.improvementsConfirmed
                : archiveClosureReportCopy.closureRecorded
              : ''}
          </p>
          {chronicleState.haveImprovementsBeenConfirmed ? (
            <button type="button" className="primary-action-button" onClick={onReturnToWhispersRequested}>
              {archiveClosureCopy.returnToWhispersButton}
            </button>
          ) : (
            <button
              type="button"
              className="primary-action-button"
              disabled={isPromotionReached && chosenAttributeNames.length !== requiredImprovementCount}
              onClick={() => {
                playInteractionFeedback('confirmation')
                changeChronicleState({
                  kind: 'improvements_confirmed',
                  improvedAttributeNames: isPromotionReached ? chosenAttributeNames : [],
                })
              }}
            >
              {isPromotionReached ? archiveClosureCopy.confirmImprovementsButton : archiveClosureReportCopy.recordClosureButton}
            </button>
          )}
        </div>
      </section>
    </main>
  )
}

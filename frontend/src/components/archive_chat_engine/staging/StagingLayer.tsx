import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { chooseAnimationVariantName, randomNumberBetween } from '../../../animation/animation_variety'
import { requestAmbientSilence } from '../../../audio/ambient_sound_ducking'
import { useInteractionFeedback } from '../../../audio/interaction_feedback'
import { stagingCopy } from '../../../copy/archive_chat_engine/staging_copy'
import type {
  ChronicleClosedByDeathOutcome,
  FalsifiedStatusReading,
  SceneTensionTierName,
  StagingEvent,
} from '../../../game_state/archive_turn_contract'
import { useChronicleState } from '../../../game_state/chronicle_state'
import { usePlayerSettings } from '../../../settings/player_settings'
import { useArchiveTurnFlow } from '../archive_turn_flow_context'
import { ReducedChronicleDeathPlate } from './ReducedChronicleDeathPlate'
import { StagedMomentScene } from './StagedMomentScene'
import type { StagedMoment } from './StagedMomentScene'
import { chooseStagingVariant, noteStagingTurnNumber, requestScreenFlashPermission } from './staging_director'
import type { PlayerStagingPreferences, StagingMomentName, StagingVariantChoice } from './staging_director'
import { stagingMomentCatalog } from './staging_moment_catalog'

export type StagingLayerProperties = {
  sceneTensionTierName: SceneTensionTierName
  falsifiedStatusReadingChanged: (falsifiedStatusReading: FalsifiedStatusReading | null) => void
}

export type ChronicleDeathSequenceHostProperties = {
  archiveOutcome: ChronicleClosedByDeathOutcome
  onChronicleClosureWitnessed: () => void
}

type AlteredPerceptionReceipt = { occurrenceNumber: number; receiptText: string }

const loadPhysicalDeathSequence = () => import('./chronicle_death/PhysicalDeathSequence')
const loadPsychologicalDeathSequence = () => import('./chronicle_death/PsychologicalDeathSequence')
const LazilyLoadedPhysicalDeathSequence = lazy(loadPhysicalDeathSequence)
const LazilyLoadedPsychologicalDeathSequence = lazy(loadPsychologicalDeathSequence)

const deathSequencePreloadDelayMilliseconds = 20000
const deathSequenceSafetyMilliseconds = 16000
const stagingReadinessPollMilliseconds = 120
const longestWaitForAnchorRevealMilliseconds = 9000
const millisecondsPerAnchorParagraph = 1400
const longestAnchorParagraphDelayMilliseconds = 4200
const alteredPerceptionReceiptVisibleMilliseconds = 5200
const seriousWoundStampDelayMilliseconds = 450
const minimumTurnsBetweenTensionMoments = 3

const visibleMillisecondsByMomentName: Partial<Record<StagingMomentName, number>> = {
  attack_received: 1500,
  attack_delivered: 1000,
  critical_failure: 2600,
  mental_attack: 2400,
  anomaly_manifested: 3200,
  scene_changed: 2600,
  tension_rose: 2400,
}

const tensionRankBySceneTensionTierName: Record<SceneTensionTierName, number> = {
  calm: 0,
  uneasy: 1,
  threatening: 2,
  lethal: 3,
}

const momentNameByStagingEventKind: Record<StagingEvent['kind'], StagingMomentName> = {
  attack_received: 'attack_received',
  attack_delivered: 'attack_delivered',
  critical_failure: 'critical_failure',
  mental_attack: 'mental_attack',
  anomaly_manifested: 'anomaly_manifested',
  scene_changed: 'scene_changed',
}

function resolveMentalAttackVariantChoice(variantChoice: StagingVariantChoice, stagingEvent: StagingEvent): StagingVariantChoice {
  if (stagingEvent.kind !== 'mental_attack' || variantChoice.intensityName === 'sober') {
    return variantChoice
  }
  if (variantChoice.variantName === 'lying_clock' && !stagingEvent.falsifiedStatusReading) {
    return { ...variantChoice, variantName: stagingEvent.rewrittenPastPhrase ? 'rewritten_memory' : 'returning_echo' }
  }
  if (variantChoice.variantName === 'rewritten_memory' && !stagingEvent.rewrittenPastPhrase) {
    return { ...variantChoice, variantName: stagingEvent.falsifiedStatusReading ? 'lying_clock' : 'returning_echo' }
  }
  return variantChoice
}

function describeAlteredPerception(variantName: string, stagingEvent: StagingEvent): string {
  if (stagingEvent.kind !== 'mental_attack') {
    return stagingCopy.alteredEchoReceiptText
  }
  if (variantName === 'lying_clock' && stagingEvent.falsifiedStatusReading) {
    return stagingEvent.falsifiedStatusReading.statusFieldName === 'world_clock'
      ? stagingCopy.alteredClockReceiptText
      : stagingCopy.alteredPlaceReceiptText
  }
  if (variantName === 'rewritten_memory' && stagingEvent.rewrittenPastPhrase) {
    return stagingCopy.alteredMemoryReceiptText
  }
  return stagingCopy.alteredEchoReceiptText
}

function composeRandomisedStyle(): CSSProperties {
  return {
    '--staging-vertical-position': `${randomNumberBetween(18, 68).toFixed(1)}%`,
    '--staging-horizontal-position': `${randomNumberBetween(8, 72).toFixed(1)}%`,
    '--staging-tilt': `${randomNumberBetween(-9, 9).toFixed(1)}deg`,
    '--staging-scale': randomNumberBetween(0.85, 1.2).toFixed(2),
  } as CSSProperties
}

export function StagingLayer({ sceneTensionTierName, falsifiedStatusReadingChanged }: StagingLayerProperties) {
  const playInteractionFeedback = useInteractionFeedback()
  const { playerSettings, shouldReduceMotion } = usePlayerSettings()
  const { chronicleState } = useChronicleState()
  const { pendingStagingEvents, acknowledgeStagingEvent, revealPlaybackState } = useArchiveTurnFlow()
  const [stagedMoment, setStagedMoment] = useState<StagedMoment | null>(null)
  const [alteredPerceptionReceipt, setAlteredPerceptionReceipt] = useState<AlteredPerceptionReceipt | null>(null)
  const alreadyStagedEvents = useRef(new WeakSet<StagingEvent>())
  const firstSeenTimestampByStagingEvent = useRef(new WeakMap<StagingEvent, number>())
  const revealStartTimestampByStagingEvent = useRef(new WeakMap<StagingEvent, number>())
  const occurrenceCounter = useRef(0)
  const isMomentBeingStaged = useRef(false)
  const pendingTimeoutIdentifiers = useRef(new Set<number>())
  const previousTensionRank = useRef(tensionRankBySceneTensionTierName[sceneTensionTierName])
  const lastTensionMomentTurnNumber = useRef(-minimumTurnsBetweenTensionMoments)
  const isTensionMomentRequested = useRef(false)
  const latestValues = useRef({
    sceneTensionTierName,
    falsifiedStatusReadingChanged,
    acknowledgeStagingEvent,
    revealPlaybackState,
    pendingStagingEvents,
    confirmedTurnCount: chronicleState.confirmedTurnCount,
    playerStagingPreferences: {
      screenEffectsIntensity: playerSettings.screenEffectsIntensity,
      shouldReduceMotion,
      areUnsettlingApparitionsEnabled: playerSettings.areUnsettlingApparitionsEnabled,
    } as PlayerStagingPreferences,
  })

  useEffect(() => {
    latestValues.current = {
      sceneTensionTierName,
      falsifiedStatusReadingChanged,
      acknowledgeStagingEvent,
      revealPlaybackState,
      pendingStagingEvents,
      confirmedTurnCount: chronicleState.confirmedTurnCount,
      playerStagingPreferences: {
        screenEffectsIntensity: playerSettings.screenEffectsIntensity,
        shouldReduceMotion,
        areUnsettlingApparitionsEnabled: playerSettings.areUnsettlingApparitionsEnabled,
      },
    }
    noteStagingTurnNumber(chronicleState.confirmedTurnCount)
  })

  useEffect(() => {
    const tensionRank = tensionRankBySceneTensionTierName[sceneTensionTierName]
    const hasTensionRisenIntoDanger = tensionRank > previousTensionRank.current && tensionRank >= 2
    previousTensionRank.current = tensionRank
    if (hasTensionRisenIntoDanger) {
      isTensionMomentRequested.current = true
    }
  }, [sceneTensionTierName])

  const scheduleTrackedTimeout = useCallback((timeoutCallback: () => void, delayMilliseconds: number) => {
    const timeoutIdentifier = window.setTimeout(() => {
      pendingTimeoutIdentifiers.current.delete(timeoutIdentifier)
      timeoutCallback()
    }, delayMilliseconds)
    pendingTimeoutIdentifiers.current.add(timeoutIdentifier)
  }, [])

  const playMomentSounds = useCallback(
    (variantChoice: StagingVariantChoice, stagingEvent: StagingEvent | null) => {
      const { momentName, variantName } = variantChoice
      if (momentName === 'attack_received') {
        requestAmbientSilence(800)
        playInteractionFeedback('heavy_impact')
        if (stagingEvent?.kind === 'attack_received' && stagingEvent.causedSeriousWound) {
          scheduleTrackedTimeout(() => playInteractionFeedback('stamp_impact'), seriousWoundStampDelayMilliseconds)
        }
      }
      if (momentName === 'attack_delivered') {
        playInteractionFeedback('rising_whoosh')
        scheduleTrackedTimeout(() => playInteractionFeedback('option_click'), 260)
      }
      if (momentName === 'critical_failure') {
        requestAmbientSilence(3200)
        scheduleTrackedTimeout(() => playInteractionFeedback('stamp_impact', { playbackRateMultiplier: 0.7 }), 500)
      }
      if (momentName === 'mental_attack') {
        playInteractionFeedback('mind_fracture')
      }
      if (momentName === 'anomaly_manifested') {
        if (variantName === 'screen_tear_bands') {
          playInteractionFeedback('screen_tear')
        } else if (variantName === 'watching_eyes_pair' || variantName === 'many_eyes_blink') {
          playInteractionFeedback('distant_presence')
        } else {
          playInteractionFeedback('anomaly_glitch', { volumeMultiplier: 0.6 })
        }
      }
      if (momentName === 'scene_changed') {
        playInteractionFeedback(variantName === 'stamped_place_card' ? 'stamp_impact' : 'panel_open', {
          playbackRateMultiplier: randomNumberBetween(0.9, 1.1),
        })
      }
      if (momentName === 'tension_rose') {
        playInteractionFeedback('heartbeat', { volumeMultiplier: 0.8 })
        if (variantName === 'heartbeat_vignette') {
          scheduleTrackedTimeout(() => playInteractionFeedback('heartbeat', { volumeMultiplier: 0.55 }), 900)
        }
      }
    },
    [playInteractionFeedback, scheduleTrackedTimeout],
  )

  const stageMoment = useCallback(
    (momentName: StagingMomentName, stagingEvent: StagingEvent | null, shouldSkipVisualStaging: boolean) => {
      const currentValues = latestValues.current
      const drawnVariantChoice = chooseStagingVariant(
        momentName,
        currentValues.sceneTensionTierName,
        currentValues.playerStagingPreferences,
      )
      const variantChoice = stagingEvent ? resolveMentalAttackVariantChoice(drawnVariantChoice, stagingEvent) : drawnVariantChoice
      const variantDefinition = stagingMomentCatalog[momentName].variants.find(
        (candidateVariant) => candidateVariant.variantName === variantChoice.variantName,
      )
      const isFullIntensity = currentValues.playerStagingPreferences.screenEffectsIntensity === 'full'
      occurrenceCounter.current += 1
      const occurrenceNumber = occurrenceCounter.current

      if (stagingEvent?.kind === 'mental_attack') {
        setAlteredPerceptionReceipt({
          occurrenceNumber,
          receiptText: describeAlteredPerception(variantChoice.variantName, stagingEvent),
        })
        scheduleTrackedTimeout(
          () =>
            setAlteredPerceptionReceipt((currentReceipt) =>
              currentReceipt?.occurrenceNumber === occurrenceNumber ? null : currentReceipt,
            ),
          alteredPerceptionReceiptVisibleMilliseconds,
        )
      }
      if (shouldSkipVisualStaging) {
        return
      }
      const visibleMilliseconds =
        variantChoice.variantName === 'screen_tear_bands' ? 700 : (visibleMillisecondsByMomentName[momentName] ?? 1500)
      isMomentBeingStaged.current = true
      setStagedMoment({
        occurrenceNumber,
        variantChoice,
        stagingEvent,
        usesScreenShake: Boolean(variantDefinition?.usesScreenShake) && isFullIntensity,
        isScreenFlashGranted:
          Boolean(variantDefinition?.usesScreenFlash) && isFullIntensity && requestScreenFlashPermission(Date.now()),
        marginSideName: Math.random() < 0.5 ? 'left' : 'right',
        randomisedStyle: composeRandomisedStyle(),
        onomatopoeiaText: chooseAnimationVariantName('staging_onomatopoeia', stagingCopy.attackOnomatopoeiaTexts),
        sceneChangeEyebrowText: chooseAnimationVariantName('staging_scene_change_eyebrow', stagingCopy.sceneChangeEyebrows),
        visibleMilliseconds,
      })
      playMomentSounds(variantChoice, stagingEvent)
      scheduleTrackedTimeout(() => {
        isMomentBeingStaged.current = false
        setStagedMoment((currentMoment) => (currentMoment?.occurrenceNumber === occurrenceNumber ? null : currentMoment))
      }, visibleMilliseconds)
    },
    [playMomentSounds, scheduleTrackedTimeout],
  )

  useEffect(() => {
    const trackedTimeoutIdentifiers = pendingTimeoutIdentifiers.current
    const readinessIntervalIdentifier = window.setInterval(() => {
      if (isMomentBeingStaged.current) {
        return
      }
      const currentValues = latestValues.current
      const currentTimestamp = Date.now()
      const nextStagingEvent = currentValues.pendingStagingEvents.find(
        (pendingEvent) => !alreadyStagedEvents.current.has(pendingEvent),
      )
      if (!nextStagingEvent) {
        if (
          isTensionMomentRequested.current &&
          currentValues.revealPlaybackState.logEntryIdentifierBeingRevealed === null
        ) {
          isTensionMomentRequested.current = false
          if (currentValues.confirmedTurnCount - lastTensionMomentTurnNumber.current >= minimumTurnsBetweenTensionMoments) {
            lastTensionMomentTurnNumber.current = currentValues.confirmedTurnCount
            stageMoment('tension_rose', null, false)
          }
        }
        return
      }
      if (!firstSeenTimestampByStagingEvent.current.has(nextStagingEvent)) {
        firstSeenTimestampByStagingEvent.current.set(nextStagingEvent, currentTimestamp)
      }
      const firstSeenTimestamp = firstSeenTimestampByStagingEvent.current.get(nextStagingEvent) ?? currentTimestamp
      const hasWaitedTooLong = currentTimestamp - firstSeenTimestamp > longestWaitForAnchorRevealMilliseconds
      const { revealPlaybackState: currentRevealPlaybackState } = currentValues
      if (nextStagingEvent.kind !== 'scene_changed' && !hasWaitedTooLong && !currentRevealPlaybackState.isImmediateCompletionRequested) {
        const anchorIdentifier = nextStagingEvent.anchorLogEntryIdentifier
        if (currentRevealPlaybackState.logEntryIdentifiersAwaitingReveal.includes(anchorIdentifier)) {
          return
        }
        if (currentRevealPlaybackState.logEntryIdentifierBeingRevealed === anchorIdentifier) {
          if (!revealStartTimestampByStagingEvent.current.has(nextStagingEvent)) {
            revealStartTimestampByStagingEvent.current.set(nextStagingEvent, currentTimestamp)
          }
          const revealStartTimestamp = revealStartTimestampByStagingEvent.current.get(nextStagingEvent) ?? currentTimestamp
          const anchorParagraphDelayMilliseconds = Math.min(
            longestAnchorParagraphDelayMilliseconds,
            nextStagingEvent.anchorParagraphIndex * millisecondsPerAnchorParagraph,
          )
          if (currentTimestamp - revealStartTimestamp < anchorParagraphDelayMilliseconds) {
            return
          }
        }
      }
      alreadyStagedEvents.current.add(nextStagingEvent)
      stageMoment(
        momentNameByStagingEventKind[nextStagingEvent.kind],
        nextStagingEvent,
        currentRevealPlaybackState.isImmediateCompletionRequested,
      )
      currentValues.acknowledgeStagingEvent(nextStagingEvent)
    }, stagingReadinessPollMilliseconds)
    return () => {
      window.clearInterval(readinessIntervalIdentifier)
      for (const timeoutIdentifier of trackedTimeoutIdentifiers) {
        window.clearTimeout(timeoutIdentifier)
      }
      trackedTimeoutIdentifiers.clear()
      isMomentBeingStaged.current = false
      latestValues.current.falsifiedStatusReadingChanged(null)
    }
  }, [stageMoment])

  useEffect(() => {
    const preloadTimeoutIdentifier = window.setTimeout(() => {
      void loadPhysicalDeathSequence().catch(() => undefined)
      void loadPsychologicalDeathSequence().catch(() => undefined)
    }, deathSequencePreloadDelayMilliseconds)
    return () => window.clearTimeout(preloadTimeoutIdentifier)
  }, [])

  return (
    <div className="staging-layer" data-scene-tension-tier={sceneTensionTierName}>
      <div className="staging-tension-edge" aria-hidden="true" />
      <div aria-hidden="true">{stagedMoment ? <StagedMomentScene stagedMoment={stagedMoment} /> : null}</div>
      <div className="staging-receipt-region" role="status" aria-live="polite">
        {alteredPerceptionReceipt ? (
          <p key={alteredPerceptionReceipt.occurrenceNumber} className="staging-altered-perception-receipt">
            {alteredPerceptionReceipt.receiptText}
          </p>
        ) : null}
      </div>
    </div>
  )
}

class DeathSequenceLoadingBoundary extends Component<
  { fallbackContent: ReactNode; children: ReactNode },
  { hasLoadingFailed: boolean }
> {
  state = { hasLoadingFailed: false }

  static getDerivedStateFromError() {
    return { hasLoadingFailed: true }
  }

  render() {
    return this.state.hasLoadingFailed ? this.props.fallbackContent : this.props.children
  }
}

export function ChronicleDeathSequenceHost({ archiveOutcome, onChronicleClosureWitnessed }: ChronicleDeathSequenceHostProperties) {
  const { playerSettings, shouldReduceMotion } = usePlayerSettings()
  const { chronicleState } = useChronicleState()
  const hostElement = useRef<HTMLDivElement>(null)
  const closureWitnessedCallback = useRef(onChronicleClosureWitnessed)
  const hasClosureBeenWitnessed = useRef(false)
  const isPsychologicalDeath = archiveOutcome.deathNatureName === 'psychological'
  const [deathVariantChoice] = useState(() =>
    chooseStagingVariant(isPsychologicalDeath ? 'psychological_death' : 'physical_death', 'lethal', {
      screenEffectsIntensity: playerSettings.screenEffectsIntensity,
      shouldReduceMotion,
      areUnsettlingApparitionsEnabled: playerSettings.areUnsettlingApparitionsEnabled,
    }),
  )

  useEffect(() => {
    closureWitnessedCallback.current = onChronicleClosureWitnessed
  }, [onChronicleClosureWitnessed])

  const witnessClosureOnce = useCallback(() => {
    if (hasClosureBeenWitnessed.current) {
      return
    }
    hasClosureBeenWitnessed.current = true
    closureWitnessedCallback.current()
  }, [])

  useEffect(() => {
    hostElement.current?.focus()
    const safetyTimeoutIdentifier = window.setTimeout(witnessClosureOnce, deathSequenceSafetyMilliseconds)
    return () => window.clearTimeout(safetyTimeoutIdentifier)
  }, [witnessClosureOnce])

  const reducedPlate = <ReducedChronicleDeathPlate archiveOutcome={archiveOutcome} onSequenceCompleted={witnessClosureOnce} />
  const shouldUseReducedPlate = shouldReduceMotion || deathVariantChoice.intensityName === 'sober'

  return (
    <div
      ref={hostElement}
      className="chronicle-death-sequence-host"
      data-death-nature={archiveOutcome.deathNatureName}
      role="alertdialog"
      aria-modal="true"
      aria-label={stagingCopy.deathSequenceAccessibleTitle}
      aria-describedby="chronicle-death-perceptible-cause"
      tabIndex={-1}
    >
      <p id="chronicle-death-perceptible-cause" className="sr-only">
        {archiveOutcome.perceptibleCauseText}
      </p>
      {shouldUseReducedPlate ? (
        reducedPlate
      ) : (
        <DeathSequenceLoadingBoundary fallbackContent={reducedPlate}>
          <Suspense fallback={<div className="chronicle-death-loading-frame" aria-hidden="true" />}>
            {isPsychologicalDeath ? (
              <LazilyLoadedPsychologicalDeathSequence
                archiveOutcome={archiveOutcome}
                inkVariantName={deathVariantChoice.variantName}
                worldClockMinutes={chronicleState.chronicleClosure?.worldClockMinutes ?? 0}
                placeName={chronicleState.chronicleClosure?.placeName ?? stagingCopy.erasedPlaceText}
                onSequenceCompleted={witnessClosureOnce}
              />
            ) : (
              <LazilyLoadedPhysicalDeathSequence
                archiveOutcome={archiveOutcome}
                crackVariantName={deathVariantChoice.variantName}
                onSequenceCompleted={witnessClosureOnce}
              />
            )}
          </Suspense>
        </DeathSequenceLoadingBoundary>
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { chooseAnimationVariantName, randomNumberBetween } from '../../animation/animation_variety'
import { useInteractionFeedback } from '../../audio/interaction_feedback'
import { chronicleClosedCopy } from '../../copy/archive_chat_engine/chronicle_closed_copy'
import { formatWorldClock, useChronicleState } from '../../game_state/chronicle_state'
import { readClosedChronicleArchive } from '../../game_state/closed_chronicle_archive_storage'
import type { ChronicleClosureRecord } from '../../game_state/closed_chronicle_archive_storage'
import { usePlayerSettings } from '../../settings/player_settings'
import { ArchiveReadingLog } from '../archive_chat_engine/reading_log/ArchiveReadingLog'
import { useTimedProgressShare } from '../archive_chat_engine/staging/use_timed_sequence'
import { HiddenScrollbarRegion } from '../scroll_affordance/HiddenScrollbarRegion'

export type ChronicleClosedScreenProperties = {
  onSuccessorChronicleStarted: () => void
  onReturnToTitleRequested: () => void
}

const closureActEntranceVariantNames = ['laid_on_desk', 'slid_from_folder', 'unfolded_sheet', 'dropped_from_above'] as const
const countTallyMilliseconds = 1100
const closureStampSoundDelayMilliseconds = 700

function ignoreReadingLogRequest() {
  return undefined
}

function chooseStableEpitaphLine(chronicleClosure: ChronicleClosureRecord): string {
  const epitaphLines =
    chronicleClosure.deathNatureName === 'psychological'
      ? chronicleClosedCopy.psychologicalEpitaphLines
      : chronicleClosedCopy.physicalEpitaphLines
  let identifierChecksum = 0
  for (const identifierCharacter of chronicleClosure.closureIdentifier) {
    identifierChecksum = (identifierChecksum + identifierCharacter.charCodeAt(0)) % 9973
  }
  return epitaphLines[identifierChecksum % epitaphLines.length](chronicleClosure.investigatorFullName)
}

function countEarlierClosedChronicles(closureIdentifier: string): number {
  return readClosedChronicleArchive().filter((storedRecord) => storedRecord.closureIdentifier !== closureIdentifier).length
}

export function ChronicleClosedScreen({ onSuccessorChronicleStarted, onReturnToTitleRequested }: ChronicleClosedScreenProperties) {
  const { chronicleState } = useChronicleState()
  const { shouldReduceMotion } = usePlayerSettings()
  const playInteractionFeedback = useInteractionFeedback()
  const [isLastArchiveLogVisible, setIsLastArchiveLogVisible] = useState(false)
  const [isSuccessorConfirmationVisible, setIsSuccessorConfirmationVisible] = useState(false)
  const [closureActEntranceVariantName] = useState(() =>
    chooseAnimationVariantName('chronicle_closure_act_entrance', closureActEntranceVariantNames),
  )
  const [closureStampStyle] = useState(
    () =>
      ({
        '--closure-stamp-tilt': `${randomNumberBetween(-11, -3).toFixed(1)}deg`,
        '--closure-stamp-offset': `${randomNumberBetween(0, 14).toFixed(0)}px`,
      }) as CSSProperties,
  )
  const { chronicleClosure, archiveRun } = chronicleState
  const closureIdentifier = chronicleClosure?.closureIdentifier ?? ''
  const [earlierClosedChronicleCount] = useState(() => countEarlierClosedChronicles(closureIdentifier))
  const tallyProgressShare = useTimedProgressShare(true, countTallyMilliseconds)
  const confirmSuccessorButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const stampSoundTimeoutIdentifier = window.setTimeout(
      () => playInteractionFeedback('stamp_impact', { playbackRateMultiplier: 0.8 }),
      closureStampSoundDelayMilliseconds,
    )
    return () => window.clearTimeout(stampSoundTimeoutIdentifier)
  }, [playInteractionFeedback])

  useEffect(() => {
    if (isSuccessorConfirmationVisible) {
      confirmSuccessorButton.current?.focus()
    }
  }, [isSuccessorConfirmationVisible])

  if (!chronicleClosure) {
    return null
  }

  const shownTallyShare = shouldReduceMotion ? 1 : tallyProgressShare
  const closureFacts: Array<[string, string]> = [
    [chronicleClosedCopy.investigatorLabel, chronicleClosure.investigatorFullName],
    [chronicleClosedCopy.levelLabel, String(chronicleClosure.level)],
    [
      chronicleClosedCopy.deathNatureLabel,
      chronicleClosure.deathNatureName === 'psychological'
        ? chronicleClosedCopy.psychologicalDeathNatureText
        : chronicleClosedCopy.physicalDeathNatureText,
    ],
    [
      chronicleClosedCopy.deathCauseLabel,
      chronicleClosure.deathCauseName === 'fifth_serious_wound'
        ? chronicleClosedCopy.fifthSeriousWoundCauseText
        : chronicleClosedCopy.criticalFailureCauseText,
    ],
    [chronicleClosedCopy.archiveInProgressLabel, `${chronicleClosure.archiveNumberLabel} · ${chronicleClosure.archiveTitle}`],
    [chronicleClosedCopy.placeLabel, chronicleClosure.placeName],
    [chronicleClosedCopy.hourLabel, formatWorldClock(chronicleClosure.worldClockMinutes)],
    [chronicleClosedCopy.seriousWoundsLabel, chronicleClosedCopy.seriousWoundsValue(chronicleClosure.seriousWoundsSuffered)],
  ]
  const conservedCounts: Array<[string, number]> = [
    [chronicleClosedCopy.resolvedArchivesCountLabel, chronicleClosure.resolvedArchiveCount],
    [chronicleClosedCopy.investigatedWhispersCountLabel, chronicleClosure.investigatedWhisperCount ?? 0],
    [chronicleClosedCopy.confirmedTurnsCountLabel, chronicleClosure.confirmedTurnCountInLastArchive ?? 0],
    [chronicleClosedCopy.conservedCluesCountLabel, chronicleClosure.conservedClueCount],
    [chronicleClosedCopy.conservedKnownPersonsCountLabel, chronicleClosure.conservedKnownPersonCount],
    [chronicleClosedCopy.earlierClosedChroniclesCountLabel, earlierClosedChronicleCount],
  ]

  return (
    <main
      id="main-content"
      className="chronicle-closed-screen"
      data-death-nature={chronicleClosure.deathNatureName}
      data-closure-act-entrance={closureActEntranceVariantName}
    >
      <section className="chronicle-closure-act aged-paper-document" aria-labelledby="chronicle-closed-title">
        <p className="chronicle-closure-act-eyebrow">{chronicleClosedCopy.eyebrow}</p>
        <h1 id="chronicle-closed-title" className="chronicle-closure-act-title display-title">
          {chronicleClosedCopy.title}
        </h1>
        <span className="chronicle-closure-stamp display-title" style={closureStampStyle} aria-hidden="true">
          {chronicleClosedCopy.closureStampText}
        </span>
        <h2 className="chronicle-closure-act-heading">{chronicleClosedCopy.epitaphHeading}</h2>
        <p className="chronicle-closure-epitaph">{chooseStableEpitaphLine(chronicleClosure)}</p>
        <h2 className="chronicle-closure-act-heading">{chronicleClosedCopy.perceptibleCauseLabel}</h2>
        <p className="chronicle-closure-perceptible-cause">{chronicleClosure.perceptibleCauseText}</p>
        <dl className="chronicle-closure-facts">
          {closureFacts.map(([factLabel, factValue]) => (
            <div key={factLabel} className="chronicle-closure-fact">
              <dt>{factLabel}</dt>
              <dd>{factValue}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="chronicle-conserved-panel comic-panel" aria-labelledby="chronicle-closed-conserved-title">
        <h2 id="chronicle-closed-conserved-title" className="chronicle-conserved-title display-title">
          {chronicleClosedCopy.conservedHeading}
        </h2>
        <p className="chronicle-conserved-explanation">{chronicleClosedCopy.conservedExplanation}</p>
        <dl className="chronicle-conserved-counts">
          {conservedCounts.map(([countLabel, countValue], countIndex) => (
            <div key={countLabel} className="chronicle-conserved-count" style={{ '--entrance-order': countIndex } as CSSProperties}>
              <dt>{countLabel}</dt>
              <dd>{Math.round(countValue * shownTallyShare)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="chronicle-begin-again-panel comic-panel comic-panel-cut-corner" aria-labelledby="chronicle-begin-again-title">
        <h2 id="chronicle-begin-again-title" className="chronicle-conserved-title display-title">
          {chronicleClosedCopy.beginAgainHeading}
        </h2>
        <p className="chronicle-conserved-explanation">{chronicleClosedCopy.beginAgainExplanation}</p>
        {isSuccessorConfirmationVisible ? (
          <div className="chronicle-successor-confirmation" role="group" aria-labelledby="chronicle-successor-confirmation-text">
            <p id="chronicle-successor-confirmation-text">{chronicleClosedCopy.successorConfirmationText}</p>
            <div className="chronicle-closed-actions">
              <button
                ref={confirmSuccessorButton}
                type="button"
                className="primary-action-button"
                onClick={() => {
                  playInteractionFeedback('confirmation')
                  onSuccessorChronicleStarted()
                }}
              >
                {chronicleClosedCopy.confirmSuccessorChronicleButton}
              </button>
              <button
                type="button"
                className="quiet-action-button"
                onClick={() => {
                  playInteractionFeedback('panel_close')
                  setIsSuccessorConfirmationVisible(false)
                }}
              >
                {chronicleClosedCopy.cancelSuccessorChronicleButton}
              </button>
            </div>
          </div>
        ) : (
          <div className="chronicle-closed-actions">
            <button
              type="button"
              className="primary-action-button"
              onClick={() => {
                playInteractionFeedback('option_click')
                setIsSuccessorConfirmationVisible(true)
              }}
            >
              {chronicleClosedCopy.startSuccessorChronicleButton}
            </button>
            <button
              type="button"
              className="quiet-action-button"
              aria-expanded={isLastArchiveLogVisible}
              onClick={() => {
                playInteractionFeedback(isLastArchiveLogVisible ? 'panel_close' : 'panel_open')
                setIsLastArchiveLogVisible(!isLastArchiveLogVisible)
              }}
            >
              {isLastArchiveLogVisible ? chronicleClosedCopy.hideLastArchiveLogButton : chronicleClosedCopy.readLastArchiveLogButton}
            </button>
            <button
              type="button"
              className="quiet-action-button"
              onClick={() => {
                playInteractionFeedback('option_click')
                onReturnToTitleRequested()
              }}
            >
              {chronicleClosedCopy.returnToTitleButton}
            </button>
          </div>
        )}
      </section>

      {isLastArchiveLogVisible ? (
        <HiddenScrollbarRegion regionLabel={chronicleClosedCopy.lastArchiveLogRegionLabel} className="chronicle-last-archive-log comic-panel">
          <ArchiveReadingLog
            logEntries={archiveRun.logEntries}
            interactivePiecePublicDefinitions={archiveRun.interactivePiecePublicDefinitions}
            interactivePieceRuntimeStates={archiveRun.interactivePieceRuntimeStates}
            isReadOnly
            onPersonDetailRequested={ignoreReadingLogRequest}
            onRevealProgressed={ignoreReadingLogRequest}
          />
        </HiddenScrollbarRegion>
      ) : null}
    </main>
  )
}

export default ChronicleClosedScreen

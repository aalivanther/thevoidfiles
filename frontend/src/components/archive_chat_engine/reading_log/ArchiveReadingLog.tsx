import { useState } from 'react'
import { chooseAnimationVariantName } from '../../../animation/animation_variety'
import { readingLogCopy } from '../../../copy/archive_chat_engine/reading_log_copy'
import type {
  ArchiveLogEntry,
  InteractivePiecePublicDefinition,
  InteractivePieceRuntimeState,
} from '../../../game_state/archive_turn_contract'
import { formatWorldClock, useChronicleState } from '../../../game_state/chronicle_state'
import {
  ArchiveTurnFlowContext,
  inertArchiveTurnFlowContextValue,
  useArchiveTurnFlow,
} from '../archive_turn_flow_context'
import { usePendingInvestigatorDeclaration } from '../turn_flow/pending_investigator_declaration_context'
import { ArchiveLogEntryRenderer } from './ArchiveLogEntryRenderer'
import { CompletedTextAnnouncer } from './CompletedTextAnnouncer'
import { ReadingLogEntryFrame } from './ReadingLogEntryFrame'
import { pendingInvestigatorDeclarationAnchorIdentifier } from './use_reading_line_scroll'
import { InvestigatorEntryBlock } from './voices/InvestigatorEntryBlock'

export type ArchiveReadingLogProperties = {
  logEntries: ArchiveLogEntry[]
  interactivePiecePublicDefinitions: Record<string, InteractivePiecePublicDefinition>
  interactivePieceRuntimeStates: Record<string, InteractivePieceRuntimeState>
  isReadOnly: boolean
  onPersonDetailRequested: (personIdentifier: string) => void
  onRevealProgressed: () => void
}

type ReadingLogSegment = {
  segmentKey: string
  isTurnGroup: boolean
  worldClockMinutes: number
  logEntries: ArchiveLogEntry[]
}

const turnRuleDrawVariantNames = ['pen_stroke', 'panel_cut', 'dotted_line'] as const

function readSpeakerKey(logEntry: ArchiveLogEntry): string {
  switch (logEntry.voice) {
    case 'character_dialogue':
      return `character_dialogue_${logEntry.speakerVisibleName}`
    case 'system_notice':
    case 'consequence_receipt':
    case 'relationship_pulse':
      return 'archive_record'
    default:
      return logEntry.voice
  }
}

function groupLogEntriesIntoSegments(logEntries: ArchiveLogEntry[]): ReadingLogSegment[] {
  const segments: ReadingLogSegment[] = []
  let previousLogEntry: ArchiveLogEntry | null = null
  for (const logEntry of logEntries) {
    const currentSegment = segments[segments.length - 1]
    const opensLooseExchange = logEntry.turnIdentifier === null && logEntry.voice === 'investigator_entry'
    const continuesCurrentSegment =
      currentSegment !== undefined &&
      previousLogEntry !== null &&
      previousLogEntry.turnIdentifier === logEntry.turnIdentifier &&
      !opensLooseExchange
    if (continuesCurrentSegment) {
      currentSegment.logEntries.push(logEntry)
    } else {
      segments.push({
        segmentKey: logEntry.identifier,
        isTurnGroup: logEntry.turnIdentifier !== null || opensLooseExchange,
        worldClockMinutes: logEntry.worldClockMinutes,
        logEntries: [logEntry],
      })
    }
    previousLogEntry = logEntry
  }
  return segments
}

function ReadingLogTurnRule({ worldClockMinutes, shouldDraw }: { worldClockMinutes: number; shouldDraw: boolean }) {
  const [drawVariantName] = useState(() =>
    shouldDraw ? chooseAnimationVariantName('reading_log_turn_rule_draw', turnRuleDrawVariantNames) : turnRuleDrawVariantNames[0],
  )
  return (
    <p className="reading-log-turn-rule" aria-hidden="true" data-should-draw={shouldDraw} data-draw-variant={drawVariantName}>
      <span className="reading-log-turn-rule-line" data-line-side="leading" />
      <span className="reading-log-turn-rule-moment">{readingLogCopy.turnMomentLabel(formatWorldClock(worldClockMinutes))}</span>
      <span className="reading-log-turn-rule-line" data-line-side="trailing" />
    </p>
  )
}

function ArchiveReadingLogEntries({
  logEntries,
  interactivePiecePublicDefinitions,
  interactivePieceRuntimeStates,
  isReadOnly,
  onPersonDetailRequested,
  onRevealProgressed,
}: ArchiveReadingLogProperties) {
  const { revealPlaybackState } = useArchiveTurnFlow()
  const { chronicleState } = useChronicleState()
  const pendingInvestigatorDeclaration = usePendingInvestigatorDeclaration()
  const [logEntryIdentifiersPresentAtMount] = useState(() => new Set(logEntries.map((logEntry) => logEntry.identifier)))

  const revealedEntryIndex = logEntries.findIndex(
    (logEntry) => logEntry.identifier === revealPlaybackState.logEntryIdentifierBeingRevealed,
  )
  const visibleLogEntries = revealedEntryIndex >= 0 ? logEntries.slice(0, revealedEntryIndex + 1) : logEntries
  const completedLogEntries = revealedEntryIndex >= 0 ? logEntries.slice(0, revealedEntryIndex) : logEntries
  const visibleSegments = groupLogEntriesIntoSegments(visibleLogEntries)

  const renderSegmentEntries = (segment: ReadingLogSegment) =>
    segment.logEntries.map((logEntry, entryIndex) => {
      const previousLogEntry = entryIndex > 0 ? segment.logEntries[entryIndex - 1] : null
      const isFirstDirectorNarrationOfTurn =
        segment.isTurnGroup &&
        logEntry.voice === 'director_narration' &&
        segment.logEntries.findIndex((candidateEntry) => candidateEntry.voice === 'director_narration') === entryIndex
      return (
        <ReadingLogEntryFrame
          key={logEntry.identifier}
          logEntry={logEntry}
          hasArrivedDuringThisVisit={!isReadOnly && !logEntryIdentifiersPresentAtMount.has(logEntry.identifier)}
          continuesPreviousSpeaker={previousLogEntry !== null && readSpeakerKey(previousLogEntry) === readSpeakerKey(logEntry)}
          shouldAnnounceDirectorLegend={isFirstDirectorNarrationOfTurn}
        >
          <ArchiveLogEntryRenderer
            logEntry={logEntry}
            interactivePiecePublicDefinitions={interactivePiecePublicDefinitions}
            interactivePieceRuntimeStates={interactivePieceRuntimeStates}
            isReadOnly={isReadOnly}
            onPersonDetailRequested={onPersonDetailRequested}
            onRevealProgressed={onRevealProgressed}
          />
        </ReadingLogEntryFrame>
      )
    })

  return (
    <div
      className="reading-log"
      role="group"
      aria-label={isReadOnly ? readingLogCopy.readOnlyReadingLogRegionLabel : readingLogCopy.readingLogRegionLabel}
      data-is-read-only={isReadOnly}
    >
      {visibleSegments.map((segment) =>
        segment.isTurnGroup ? (
          <div
            key={segment.segmentKey}
            className="reading-log-turn"
            role="group"
            aria-label={readingLogCopy.turnGroupLabel(formatWorldClock(segment.worldClockMinutes))}
          >
            <ReadingLogTurnRule worldClockMinutes={segment.worldClockMinutes} shouldDraw={false} />
            {renderSegmentEntries(segment)}
          </div>
        ) : (
          <div key={segment.segmentKey} className="reading-log-loose-entries">
            {renderSegmentEntries(segment)}
          </div>
        ),
      )}
      {!isReadOnly && pendingInvestigatorDeclaration ? (
        <div
          key={pendingInvestigatorDeclaration.declarationKey}
          className="reading-log-turn"
          role="group"
          aria-label={readingLogCopy.turnGroupLabel(formatWorldClock(chronicleState.investigator.worldClockMinutes))}
        >
          <ReadingLogTurnRule worldClockMinutes={chronicleState.investigator.worldClockMinutes} shouldDraw />
          <div
            className="reading-log-entry"
            data-log-entry-identifier={pendingInvestigatorDeclarationAnchorIdentifier}
            data-voice-name="investigator_entry"
            data-should-play-entrance="true"
            data-entrance-variant="filed_from_below"
          >
            <InvestigatorEntryBlock
              declaredSteps={pendingInvestigatorDeclaration.declaredPlanSteps.map((declaredPlanStep, stepIndex) => ({
                stepKey: declaredPlanStep.stepIdentifier,
                stepNumber: pendingInvestigatorDeclaration.alreadyExecutedStepCount + stepIndex + 1,
                actionText: declaredPlanStep.actionText,
                conditionText: declaredPlanStep.conditionText,
                compositionOriginName: null,
              }))}
              declaredPlanStepCount={pendingInvestigatorDeclaration.declaredPlanStepCount}
              declarationStatusName={
                pendingInvestigatorDeclaration.hasDirectorFailedToAnswer ? 'unanswered_by_director' : 'awaiting_director'
              }
            />
          </div>
        </div>
      ) : null}
      {isReadOnly ? null : <CompletedTextAnnouncer completedLogEntries={completedLogEntries} />}
    </div>
  )
}

export function ArchiveReadingLog(readingLogProperties: ArchiveReadingLogProperties) {
  if (!readingLogProperties.isReadOnly) {
    return <ArchiveReadingLogEntries {...readingLogProperties} />
  }
  return (
    <ArchiveTurnFlowContext.Provider value={inertArchiveTurnFlowContextValue}>
      <ArchiveReadingLogEntries {...readingLogProperties} />
    </ArchiveTurnFlowContext.Provider>
  )
}

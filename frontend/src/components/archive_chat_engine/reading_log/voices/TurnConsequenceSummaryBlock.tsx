import { useId, useState } from 'react'
import { chooseAnimationVariantName } from '../../../../animation/animation_variety'
import { readingLogCopy } from '../../../../copy/archive_chat_engine/reading_log_copy'
import type {
  ArchiveLogEntry,
  ConsequenceReceiptEntry,
  RelationshipPulseEntry,
} from '../../../../game_state/archive_turn_contract'
import { useChronicleState } from '../../../../game_state/chronicle_state'
import { useArchiveTurnFlowOrInertValue } from '../../interactive_pieces/fresh_turn_detection'
import { RelationshipSummaryLine } from '../../relationships/RelationshipSummaryLine'
import { ConsequenceReceiptLines } from './ConsequenceReceiptBlock'
import { consequenceLineTickVariantNames } from './consequence_line_tick_variants'
import '../../../../styles/archive_chat_engine/consequence_summary.css'

type ConsequenceRecordEntry = ConsequenceReceiptEntry | RelationshipPulseEntry

export type TurnConsequenceSummaryBlockProperties = {
  logEntry: ConsequenceRecordEntry
  isReadOnly: boolean
  onPersonDetailRequested: (personIdentifier: string) => void
}

function isConsequenceRecordEntry(logEntry: ArchiveLogEntry): logEntry is ConsequenceRecordEntry {
  return logEntry.voice === 'consequence_receipt' || logEntry.voice === 'relationship_pulse'
}

function readVisibleRecordEntriesOfSameTurn(
  logEntry: ConsequenceRecordEntry,
  allLogEntries: ArchiveLogEntry[],
  logEntryIdentifierBeingRevealed: string | null,
): ConsequenceRecordEntry[] {
  if (logEntry.turnIdentifier === null || !allLogEntries.some((candidateEntry) => candidateEntry.identifier === logEntry.identifier)) {
    return [logEntry]
  }
  const revealedEntryIndex = allLogEntries.findIndex(
    (candidateEntry) => candidateEntry.identifier === logEntryIdentifierBeingRevealed,
  )
  const visibleLogEntries = revealedEntryIndex >= 0 ? allLogEntries.slice(0, revealedEntryIndex + 1) : allLogEntries
  const recordEntriesOfSameTurn = visibleLogEntries
    .filter(isConsequenceRecordEntry)
    .filter((candidateEntry) => candidateEntry.turnIdentifier === logEntry.turnIdentifier)
  return recordEntriesOfSameTurn.some((candidateEntry) => candidateEntry.identifier === logEntry.identifier)
    ? recordEntriesOfSameTurn
    : [logEntry]
}

export function TurnConsequenceSummaryBlock({ logEntry, isReadOnly, onPersonDetailRequested }: TurnConsequenceSummaryBlockProperties) {
  const { chronicleState } = useChronicleState()
  const { revealPlaybackState } = useArchiveTurnFlowOrInertValue()
  const headingIdentifier = useId()
  const [firstLineTickVariantName] = useState(() =>
    chooseAnimationVariantName('consequence_summary_line_tick', consequenceLineTickVariantNames),
  )
  const recordEntriesOfSameTurn = readVisibleRecordEntriesOfSameTurn(
    logEntry,
    chronicleState.archiveRun.logEntries,
    isReadOnly ? null : revealPlaybackState.logEntryIdentifierBeingRevealed,
  )

  if (recordEntriesOfSameTurn[0].identifier !== logEntry.identifier) {
    return <span className="consequence-summary-absorbed-entry" hidden />
  }

  const receiptEntries = recordEntriesOfSameTurn.filter(
    (recordEntry): recordEntry is ConsequenceReceiptEntry => recordEntry.voice === 'consequence_receipt',
  )
  const relationshipPulseEntries = recordEntriesOfSameTurn.filter(
    (recordEntry): recordEntry is RelationshipPulseEntry => recordEntry.voice === 'relationship_pulse',
  )
  const receiptFirstLineOrders = receiptEntries.map((_receiptEntry, receiptIndex) =>
    receiptEntries
      .slice(0, receiptIndex)
      .reduce((runningLineCount, previousReceiptEntry) => runningLineCount + previousReceiptEntry.confirmedEffects.length, 0),
  )
  const confirmedEffectLineCount = receiptEntries.reduce(
    (runningLineCount, receiptEntry) => runningLineCount + receiptEntry.confirmedEffects.length,
    0,
  )

  return (
    <section className="consequence-summary-block aged-paper-document" aria-labelledby={headingIdentifier}>
      <h3 id={headingIdentifier} className="dossier-label consequence-summary-heading">
        {readingLogCopy.consequenceReceiptCaptionLabel}
      </h3>
      <ul className="consequence-summary-lines" aria-labelledby={headingIdentifier}>
        {receiptEntries.map((receiptEntry, receiptIndex) => (
          <ConsequenceReceiptLines
            key={receiptEntry.identifier}
            receiptEntry={receiptEntry}
            firstLineOrder={receiptFirstLineOrders[receiptIndex]}
            firstLineTickVariantName={firstLineTickVariantName}
          />
        ))}
        {relationshipPulseEntries.length > 0 ? (
          <RelationshipSummaryLine
            relationshipPulseEntries={relationshipPulseEntries}
            lineOrder={confirmedEffectLineCount}
            firstLineTickVariantName={firstLineTickVariantName}
            isReadOnly={isReadOnly}
            onPersonDetailRequested={onPersonDetailRequested}
          />
        ) : null}
      </ul>
    </section>
  )
}

import { CaretDown, Handshake } from '@phosphor-icons/react'
import { useEffect, useId, useRef, useState } from 'react'
import { useInteractionFeedback } from '../../../audio/interaction_feedback'
import { relationshipsCopy } from '../../../copy/archive_chat_engine/relationships_copy'
import type { RelationshipPulseEntry } from '../../../game_state/archive_turn_contract'
import { ConsequenceSummaryLine } from '../reading_log/voices/ConsequenceSummaryLine'
import type { ConsequenceLineTickVariantName } from '../reading_log/voices/consequence_line_tick_variants'
import { RelationshipPulseBlock } from './RelationshipPulseBlock'

const freshlyArrivedLogEntrySelector = '.reading-log-entry[data-should-play-entrance="true"]'
const summaryKeysWithArrivalSoundPlayed = new Set<string>()

export type RelationshipSummaryLineProperties = {
  relationshipPulseEntries: RelationshipPulseEntry[]
  lineOrder: number
  firstLineTickVariantName: ConsequenceLineTickVariantName
  isReadOnly: boolean
  onPersonDetailRequested: (personIdentifier: string) => void
}

function composeSummaryText(relationshipPulseEntries: RelationshipPulseEntry[]): string {
  const relationshipPulses = relationshipPulseEntries.map((pulseEntry) => pulseEntry.relationshipPulse)
  const distinctPersonIdentifiers = new Set(relationshipPulses.map((relationshipPulse) => relationshipPulse.personIdentifier))
  const hasAnyChange = relationshipPulses.some((relationshipPulse) => relationshipPulse.tendencyName !== 'unchanged')
  if (distinctPersonIdentifiers.size === 1) {
    return hasAnyChange
      ? relationshipsCopy.summaryLineChangedWithOnePerson(relationshipPulses[0].personVisibleName)
      : relationshipsCopy.summaryLineUnchangedWithOnePerson(relationshipPulses[0].personVisibleName)
  }
  return hasAnyChange
    ? relationshipsCopy.summaryLineChangedWithSeveralPersons(distinctPersonIdentifiers.size)
    : relationshipsCopy.summaryLineUnchangedWithSeveralPersons(distinctPersonIdentifiers.size)
}

export function RelationshipSummaryLine({
  relationshipPulseEntries,
  lineOrder,
  firstLineTickVariantName,
  isReadOnly,
  onPersonDetailRequested,
}: RelationshipSummaryLineProperties) {
  const playInteractionFeedback = useInteractionFeedback()
  const toggleButtonReference = useRef<HTMLButtonElement | null>(null)
  const [isDetailExpanded, setIsDetailExpanded] = useState(false)
  const detailRegionIdentifier = useId()
  const firstPulseEntry = relationshipPulseEntries[0]
  const summaryKey = firstPulseEntry.identifier
  const doesAnyRelationshipCool = relationshipPulseEntries.some(
    (pulseEntry) => pulseEntry.relationshipPulse.tendencyName === 'cools',
  )
  const singleQualitativeBandText =
    relationshipPulseEntries.length === 1
      ? relationshipsCopy.qualitativeBandLabels[firstPulseEntry.relationshipPulse.resultingQualitativeBandName]
      : null

  useEffect(() => {
    const freshlyArrivedLogEntryElement = toggleButtonReference.current?.closest(freshlyArrivedLogEntrySelector) ?? null
    const hasArrivedDuringThisVisit = freshlyArrivedLogEntryElement !== null
    if (!hasArrivedDuringThisVisit || summaryKeysWithArrivalSoundPlayed.has(summaryKey)) {
      return
    }
    summaryKeysWithArrivalSoundPlayed.add(summaryKey)
    playInteractionFeedback('pen_scratch', {
      volumeMultiplier: 0.55,
      playbackRateMultiplier: doesAnyRelationshipCool ? 0.8 : 1.05,
    })
  }, [summaryKey, doesAnyRelationshipCool, playInteractionFeedback])

  return (
    <ConsequenceSummaryLine
      sourceLogEntryIdentifier={relationshipPulseEntries.map((pulseEntry) => pulseEntry.identifier).join(' ')}
      sourceVoiceName="relationship_pulse"
      lineOrder={lineOrder}
      firstLineTickVariantName={firstLineTickVariantName}
      effectKindName="relationship_changed"
      lineIcon={<Handshake size={16} weight="fill" aria-hidden="true" />}
    >
      <button
        ref={toggleButtonReference}
        type="button"
        className="consequence-summary-relationship-toggle"
        aria-expanded={isDetailExpanded}
        aria-controls={detailRegionIdentifier}
        onClick={() => {
          playInteractionFeedback(isDetailExpanded ? 'panel_close' : 'panel_open', { volumeMultiplier: 0.6 })
          setIsDetailExpanded(!isDetailExpanded)
        }}
      >
        <span className="consequence-summary-relationship-toggle-texts">
          <span className="consequence-summary-line-text">{composeSummaryText(relationshipPulseEntries)}</span>
          {singleQualitativeBandText ? (
            <span className="consequence-summary-relationship-band">{singleQualitativeBandText}</span>
          ) : null}
        </span>
        <span className="consequence-summary-relationship-toggle-hint">
          {isDetailExpanded ? relationshipsCopy.foldRelationshipDetailLabel : relationshipsCopy.unfoldRelationshipDetailLabel}
          <CaretDown size={14} weight="bold" aria-hidden="true" />
        </span>
      </button>
      <ul
        id={detailRegionIdentifier}
        className="consequence-summary-relationship-details"
        aria-label={relationshipsCopy.relationshipDetailListLabel}
        hidden={!isDetailExpanded}
      >
        {relationshipPulseEntries.map((pulseEntry) => (
          <li key={pulseEntry.identifier} data-consequence-source-entry-identifier={pulseEntry.identifier}>
            <RelationshipPulseBlock
              relationshipPulse={pulseEntry.relationshipPulse}
              isReadOnly={isReadOnly}
              onPersonDetailRequested={onPersonDetailRequested}
            />
          </li>
        ))}
      </ul>
    </ConsequenceSummaryLine>
  )
}

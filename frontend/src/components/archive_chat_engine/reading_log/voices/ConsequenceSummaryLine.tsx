import type { CSSProperties, ReactNode } from 'react'
import { consequenceLineTickVariantNames } from './consequence_line_tick_variants'
import type { ConsequenceLineTickVariantName } from './consequence_line_tick_variants'
import type { ArchiveLogEntry } from '../../../../game_state/archive_turn_contract'


export type ConsequenceSummaryLineProperties = {
  sourceLogEntryIdentifier: string
  sourceVoiceName: ArchiveLogEntry['voice']
  lineOrder: number
  firstLineTickVariantName: ConsequenceLineTickVariantName
  effectKindName: string
  lineIcon: ReactNode
  children: ReactNode
}

export function ConsequenceSummaryLine({
  sourceLogEntryIdentifier,
  sourceVoiceName,
  lineOrder,
  firstLineTickVariantName,
  effectKindName,
  lineIcon,
  children,
}: ConsequenceSummaryLineProperties) {
  const tickVariantName =
    consequenceLineTickVariantNames[
      (consequenceLineTickVariantNames.indexOf(firstLineTickVariantName) + lineOrder) % consequenceLineTickVariantNames.length
    ]
  return (
    <li
      className="consequence-summary-line"
      data-consequence-source-entry-identifier={sourceLogEntryIdentifier}
      data-consequence-source-voice-name={sourceVoiceName}
      data-effect-kind={effectKindName}
      data-tick-variant={tickVariantName}
      style={{ '--consequence-line-order': lineOrder } as CSSProperties}
    >
      <span className="consequence-summary-line-icon">{lineIcon}</span>
      <span className="consequence-summary-line-body">{children}</span>
    </li>
  )
}

import {
  Bandaids,
  BookBookmark,
  Lightbulb,
  Clock,
  Coins,
  Eye,
  Flame,
  MapPin,
  Package,
  ShieldCheck,
  ShieldWarning,
  UserFocus,
  WarningOctagon,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import type { ConfirmedEffect, ConsequenceReceiptEntry } from '../../../../game_state/archive_turn_contract'
import { describeConfirmedEffect } from '../confirmed_effect_description'
import { ConsequenceSummaryLine } from './ConsequenceSummaryLine'
import type { ConsequenceLineTickVariantName } from './consequence_line_tick_variants'

const effectIconByEffectKind: Record<ConfirmedEffect['kind'], Icon> = {
  world_clock_advanced: Clock,
  place_changed: MapPin,
  operational_funds_spent: Coins,
  belonging_units_consumed: Package,
  belonging_units_gained: Package,
  personal_funds_spent: Coins,
  serious_wound_suffered: Bandaids,
  condition_gained: ShieldWarning,
  condition_ended: ShieldCheck,
  person_became_known: UserFocus,
  journal_updated: BookBookmark,
  knowledge_gained: Lightbulb,
  effort_spent: Flame,
  perception_was_altered: Eye,
  critical_failure_recorded: WarningOctagon,
}

export type ConsequenceReceiptLinesProperties = {
  receiptEntry: ConsequenceReceiptEntry
  firstLineOrder: number
  firstLineTickVariantName: ConsequenceLineTickVariantName
}

export function ConsequenceReceiptLines({ receiptEntry, firstLineOrder, firstLineTickVariantName }: ConsequenceReceiptLinesProperties) {
  return (
    <>
      {receiptEntry.confirmedEffects.map((confirmedEffect, effectIndex) => {
        const EffectIcon = effectIconByEffectKind[confirmedEffect.kind]
        return (
          <ConsequenceSummaryLine
            key={`${receiptEntry.identifier}_${effectIndex}`}
            sourceLogEntryIdentifier={receiptEntry.identifier}
            sourceVoiceName={receiptEntry.voice}
            lineOrder={firstLineOrder + effectIndex}
            firstLineTickVariantName={firstLineTickVariantName}
            effectKindName={confirmedEffect.kind}
            lineIcon={<EffectIcon size={16} weight="fill" aria-hidden="true" />}
          >
            <span className="consequence-summary-line-text">{describeConfirmedEffect(confirmedEffect)}</span>
          </ConsequenceSummaryLine>
        )
      })}
    </>
  )
}

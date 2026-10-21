import { readingLogCopy } from '../../../copy/archive_chat_engine/reading_log_copy'
import { readBelongingVisibleName } from '../../../demonstration/demonstration_case_script'
import type { ConfirmedEffect } from '../../../game_state/archive_turn_contract'
import { formatAmount, formatWorldClock } from '../../../game_state/chronicle_state'

export function describeConfirmedEffect(confirmedEffect: ConfirmedEffect): string {
  const effectLines = readingLogCopy.confirmedEffectLines
  switch (confirmedEffect.kind) {
    case 'world_clock_advanced':
      return effectLines.worldClockAdvanced(formatWorldClock(confirmedEffect.resultingWorldClockMinutes))
    case 'place_changed':
      return effectLines.placeChanged(confirmedEffect.resultingPlaceName)
    case 'operational_funds_spent':
      return effectLines.operationalFundsSpent(
        formatAmount(confirmedEffect.resultingAmount + confirmedEffect.amount),
        formatAmount(confirmedEffect.resultingAmount),
      )
    case 'belonging_units_consumed':
      return effectLines.belongingUnitsConsumed(
        readBelongingVisibleName(confirmedEffect.belongingIdentifier),
        confirmedEffect.resultingUnits + confirmedEffect.units,
        confirmedEffect.resultingUnits,
      )
    case 'belonging_units_gained':
      return effectLines.belongingUnitsGained(
        confirmedEffect.visibleName || readBelongingVisibleName(confirmedEffect.belongingIdentifier),
        confirmedEffect.resultingUnits - confirmedEffect.units,
        confirmedEffect.resultingUnits,
      )
    case 'personal_funds_spent':
      return effectLines.personalFundsSpent(formatAmount(confirmedEffect.amount))
    case 'serious_wound_suffered':
      return effectLines.seriousWoundSuffered(confirmedEffect.perceptibleCauseText, confirmedEffect.resultingSeriousWoundCount)
    case 'condition_gained':
      return effectLines.conditionGained(confirmedEffect.condition.visibleName)
    case 'condition_ended':
      return effectLines.conditionEnded(confirmedEffect.visibleName)
    case 'person_became_known':
      return effectLines.personBecameKnown(confirmedEffect.visibleName)
    case 'journal_updated':
      return effectLines.journalUpdated
    case 'knowledge_gained':
      return effectLines.knowledgeGained(confirmedEffect.visibleName)
    case 'effort_spent':
      return effectLines.effortSpent(confirmedEffect.resultingEffort)
    case 'perception_was_altered':
      return effectLines.perceptionWasAltered(confirmedEffect.clarificationText)
    case 'critical_failure_recorded':
      return effectLines.criticalFailureRecorded(confirmedEffect.perceptibleCauseText)
  }
}

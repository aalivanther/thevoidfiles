import { relationshipsCopy } from '../../copy/archive_chat_engine/relationships_copy'
import { caseJournalCopy } from '../../copy/case_journal_copy'
import type { RelationshipQualitativeBandName } from '../../game_state/archive_turn_contract'

type JournalRelationPulse = {
  personIdentifier: string
  resultingQualitativeBandName: RelationshipQualitativeBandName
}

export function readJournalRelationLevelText(
  personIdentifier: string,
  relationshipPulses: readonly JournalRelationPulse[],
): string {
  let matchedBandName: RelationshipQualitativeBandName | null = null
  for (const relationshipPulse of relationshipPulses) {
    if (relationshipPulse.personIdentifier === personIdentifier) {
      matchedBandName = relationshipPulse.resultingQualitativeBandName
    }
  }
  if (matchedBandName === null) {
    return caseJournalCopy.persons.relationLevelUnknown
  }
  return relationshipsCopy.qualitativeBandLabels[matchedBandName]
}

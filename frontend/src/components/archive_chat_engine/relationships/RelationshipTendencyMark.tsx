import { ArrowsInLineHorizontal, ArrowsOutLineHorizontal, Equals } from '@phosphor-icons/react'
import { relationshipsCopy } from '../../../copy/archive_chat_engine/relationships_copy'
import type { RelationshipTendencyName } from '../../../game_state/archive_turn_contract'

export function RelationshipTendencyMark({ tendencyName }: { tendencyName: RelationshipTendencyName }) {
  return (
    <span className="relationship-tendency-mark" data-tendency={tendencyName}>
      {tendencyName === 'strengthens' ? <ArrowsInLineHorizontal size={16} weight="bold" aria-hidden="true" /> : null}
      {tendencyName === 'cools' ? <ArrowsOutLineHorizontal size={16} weight="bold" aria-hidden="true" /> : null}
      {tendencyName === 'unchanged' ? <Equals size={16} weight="bold" aria-hidden="true" /> : null}
      {relationshipsCopy.tendencyLabels[tendencyName]}
    </span>
  )
}

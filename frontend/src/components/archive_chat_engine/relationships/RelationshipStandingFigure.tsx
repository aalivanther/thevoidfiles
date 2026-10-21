import { relationshipsCopy } from '../../../copy/archive_chat_engine/relationships_copy'
import type {
  PersonSilhouetteName,
  RelationshipDirectionName,
  RelationshipQualitativeBandName,
  RelationshipTendencyName,
} from '../../../game_state/archive_turn_contract'
import { InvestigatorOutlineFigure, PersonSilhouetteFigure } from './PersonSilhouetteFigure'

export type RelationshipStandingFigureProperties = {
  personSilhouetteName: PersonSilhouetteName
  directionName: RelationshipDirectionName
  qualitativeBandName: RelationshipQualitativeBandName
  tendencyName: RelationshipTendencyName
  shouldPlayApproach: boolean
}

export function RelationshipStandingFigure({
  personSilhouetteName,
  directionName,
  qualitativeBandName,
  tendencyName,
  shouldPlayApproach,
}: RelationshipStandingFigureProperties) {
  return (
    <span
      className="relationship-standing-figure"
      role="img"
      aria-label={relationshipsCopy.standingFigureDescriptions[qualitativeBandName]}
      data-qualitative-band={qualitativeBandName}
      data-direction={directionName}
      data-tendency={tendencyName}
      data-should-play-approach={shouldPlayApproach}
    >
      <span className="relationship-standing-lamp-glow" aria-hidden="true" />
      <span className="relationship-standing-person" data-is-investigator="true">
        <InvestigatorOutlineFigure />
      </span>
      <span className="relationship-standing-gap" aria-hidden="true">
        <span className="relationship-standing-thread" />
      </span>
      <span className="relationship-standing-person" data-is-investigator="false">
        <PersonSilhouetteFigure silhouetteName={personSilhouetteName} />
      </span>
    </span>
  )
}

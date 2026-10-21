import { relationshipsCopy } from '../../../copy/archive_chat_engine/relationships_copy'
import type { RelationshipPulse } from '../../../game_state/archive_turn_contract'
import { readInvestigatorShortName, useChronicleState } from '../../../game_state/chronicle_state'
import { PersonSilhouetteFigure } from './PersonSilhouetteFigure'
import { RelationshipStandingFigure } from './RelationshipStandingFigure'
import { RelationshipTendencyMark } from './RelationshipTendencyMark'

export type RelationshipPulseBlockProperties = {
  relationshipPulse: RelationshipPulse
  isReadOnly: boolean
  onPersonDetailRequested: (personIdentifier: string) => void
}

export function RelationshipPulseBlock({ relationshipPulse, isReadOnly, onPersonDetailRequested }: RelationshipPulseBlockProperties) {
  const { chronicleState } = useChronicleState()
  const investigatorShortName = readInvestigatorShortName(chronicleState.investigatorRegistration)
  const directionText = relationshipsCopy.directionLabels[relationshipPulse.directionName](
    investigatorShortName,
    relationshipPulse.personVisibleName,
  )
  const qualitativeBandText = relationshipsCopy.qualitativeBandLabels[relationshipPulse.resultingQualitativeBandName]
  const pulseContent = (
    <>
      <span className="relationship-pulse-portrait" aria-hidden="true">
        <PersonSilhouetteFigure silhouetteName={relationshipPulse.personSilhouetteName} />
      </span>
      <span className="relationship-pulse-texts">
        <span className="relationship-pulse-heading">
          {relationshipPulse.tendencyName === 'unchanged'
            ? relationshipsCopy.pulseHeadingUnchanged
            : relationshipsCopy.pulseHeading}
        </span>
        <span className="relationship-pulse-direction">{directionText}</span>
        <span className="relationship-pulse-cause">{relationshipPulse.perceptibleCauseText}</span>
        <span className="relationship-pulse-marks">
          <RelationshipTendencyMark tendencyName={relationshipPulse.tendencyName} />
          <span className="relationship-band-words">{qualitativeBandText}</span>
          {relationshipPulse.dimensionName ? (
            <span className="relationship-dimension-tag">
              {relationshipsCopy.dimensionLabels[relationshipPulse.dimensionName]}
            </span>
          ) : null}
        </span>
      </span>
      <RelationshipStandingFigure
        personSilhouetteName={relationshipPulse.personSilhouetteName}
        directionName={relationshipPulse.directionName}
        qualitativeBandName={relationshipPulse.resultingQualitativeBandName}
        tendencyName={relationshipPulse.tendencyName}
        shouldPlayApproach
      />
    </>
  )
  const accessibleSummary = relationshipsCopy.pulseAccessibleSummary(
    directionText,
    relationshipsCopy.tendencyLabels[relationshipPulse.tendencyName],
    qualitativeBandText,
    relationshipPulse.perceptibleCauseText,
  )

  if (isReadOnly) {
    return (
      <div className="relationship-pulse-block" data-tendency={relationshipPulse.tendencyName} data-is-read-only="true">
        {pulseContent}
      </div>
    )
  }
  return (
    <button
      type="button"
      className="relationship-pulse-block"
      data-tendency={relationshipPulse.tendencyName}
      aria-label={`${accessibleSummary} ${relationshipsCopy.openPersonDetailLabel(relationshipPulse.personVisibleName)}`}
      onClick={() => onPersonDetailRequested(relationshipPulse.personIdentifier)}
    >
      {pulseContent}
    </button>
  )
}

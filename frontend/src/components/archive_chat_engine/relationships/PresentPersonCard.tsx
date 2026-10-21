import { Eye, UserFocus } from '@phosphor-icons/react'
import type { CSSProperties, Ref } from 'react'
import { relationshipsCopy } from '../../../copy/archive_chat_engine/relationships_copy'
import type {
  RelationshipDirectionName,
  RelationshipPulse,
  ScenePresentPerson,
} from '../../../game_state/archive_turn_contract'
import { PersonSilhouetteFigure } from './PersonSilhouetteFigure'
import { RelationshipStandingFigure } from './RelationshipStandingFigure'
import { RelationshipTendencyMark } from './RelationshipTendencyMark'

const relationshipDirectionNamesInOrder: RelationshipDirectionName[] = ['from_investigator', 'toward_investigator_as_perceived']
const shownLatestCauseCount = 2

export type PresentPersonCardProperties = {
  presentPerson: ScenePresentPerson
  relationshipPulsesOfPerson: RelationshipPulse[]
  investigatorShortName: string
  isConsultedPerson: boolean
  entranceClassName: string
  entranceOrder: number
  cardReference?: Ref<HTMLLIElement>
}

export function PresentPersonCard({
  presentPerson,
  relationshipPulsesOfPerson,
  investigatorShortName,
  isConsultedPerson,
  entranceClassName,
  entranceOrder,
  cardReference,
}: PresentPersonCardProperties) {
  const latestPulseWithDimension = relationshipPulsesOfPerson.findLast(
    (relationshipPulse) => relationshipPulse.dimensionName !== null,
  )
  const latestPulses = relationshipPulsesOfPerson.slice(-shownLatestCauseCount).reverse()
  return (
    <li
      ref={cardReference}
      tabIndex={-1}
      className={`present-person-card ${entranceClassName}`}
      style={{ '--entrance-order': entranceOrder } as CSSProperties}
      data-is-consulted-person={isConsultedPerson}
    >
      <div className="present-person-card-header">
        <span className="present-person-portrait" aria-hidden="true">
          <PersonSilhouetteFigure silhouetteName={presentPerson.silhouetteName} />
        </span>
        <div className="present-person-card-header-texts">
          {isConsultedPerson ? (
            <p className="present-person-consulted-tag">
              <UserFocus size={14} weight="bold" aria-hidden="true" />
              {relationshipsCopy.consultedPersonTag}
            </p>
          ) : null}
          <h3 className="present-person-name">{presentPerson.visibleName}</h3>
          {presentPerson.isNameKnown ? null : <p className="present-person-unknown-name-tag">{relationshipsCopy.unknownNameTag}</p>}
          <p className="present-person-presence">{presentPerson.presenceText}</p>
        </div>
      </div>
      {latestPulseWithDimension?.dimensionName ? (
        <p className="present-person-dimension">
          <span className="dossier-label">{relationshipsCopy.activeDimensionHeading}</span>
          <span className="relationship-dimension-tag">
            {relationshipsCopy.dimensionLabels[latestPulseWithDimension.dimensionName]}
          </span>
        </p>
      ) : null}
      <div className="present-person-directions">
        {relationshipDirectionNamesInOrder.map((directionName) => {
          const latestPulseInDirection = relationshipPulsesOfPerson.findLast(
            (relationshipPulse) => relationshipPulse.directionName === directionName,
          )
          return (
            <section key={directionName} className="present-person-direction" data-direction={directionName}>
              <h4 className="present-person-direction-heading">
                {relationshipsCopy.directionSectionHeadings[directionName](investigatorShortName, presentPerson.visibleName)}
              </h4>
              <p className="present-person-direction-tag">
                {directionName === 'toward_investigator_as_perceived' ? (
                  <Eye size={13} weight="bold" aria-hidden="true" />
                ) : null}
                {directionName === 'toward_investigator_as_perceived'
                  ? relationshipsCopy.asPerceivedTag
                  : relationshipsCopy.ownRegardTag}
              </p>
              {latestPulseInDirection ? (
                <>
                  <RelationshipStandingFigure
                    personSilhouetteName={presentPerson.silhouetteName}
                    directionName={directionName}
                    qualitativeBandName={latestPulseInDirection.resultingQualitativeBandName}
                    tendencyName={latestPulseInDirection.tendencyName}
                    shouldPlayApproach={false}
                  />
                  <p className="relationship-band-words">
                    {relationshipsCopy.qualitativeBandLabels[latestPulseInDirection.resultingQualitativeBandName]}
                  </p>
                  <p className="present-person-posture">
                    {
                      relationshipsCopy.qualitativeBandPostureTexts[directionName][
                        latestPulseInDirection.resultingQualitativeBandName
                      ]
                    }
                  </p>
                  <RelationshipTendencyMark tendencyName={latestPulseInDirection.tendencyName} />
                </>
              ) : (
                <p className="present-person-no-signals">{relationshipsCopy.noSignalsYetNotice}</p>
              )}
            </section>
          )
        })}
      </div>
      {latestPulses.length > 0 ? (
        <div className="present-person-causes">
          <h4 className="dossier-label">{relationshipsCopy.latestCausesHeading}</h4>
          <ul>
            {latestPulses.map((relationshipPulse) => (
              <li key={relationshipPulse.identifier}>
                <span className="present-person-cause-context">
                  {relationshipPulse.fictionalDateLabel}
                  {' · '}
                  {relationshipsCopy.causeDirectionShortLabels[relationshipPulse.directionName]}
                </span>
                <span>{relationshipPulse.perceptibleCauseText}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  )
}

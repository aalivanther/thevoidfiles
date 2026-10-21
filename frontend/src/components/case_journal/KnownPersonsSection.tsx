import { MagnifyingGlass, UserCircle } from '@phosphor-icons/react'
import { useState } from 'react'
import type { CSSProperties } from 'react'
import { chooseAnimationVariantName } from '../../animation/animation_variety'
import { useInteractionFeedback } from '../../audio/interaction_feedback'
import { caseJournalCopy } from '../../copy/case_journal_copy'
import { formatWorldClock } from '../../game_state/chronicle_state'
import type { RelationshipPulse } from '../../game_state/archive_turn_contract'
import type { CaseJournalSectionProperties } from './case_journal_section_properties'
import { readJournalRelationLevelText } from './journal_relation_level'
import { calculateStableTiltDegrees } from './journal_paper_layout'

const photographDevelopVariantNames = ['develop_evenly', 'develop_from_corner', 'develop_in_blotches'] as const

type KnownPersonsSectionProperties = CaseJournalSectionProperties & {
  onPersonCluesRequested: (personIdentifier: string) => void
  relationshipPulses: readonly RelationshipPulse[]
}

export function KnownPersonsSection({
  livedCaseJournal,
  personalizeJournalText,
  onPersonCluesRequested,
  relationshipPulses,
}: KnownPersonsSectionProperties) {
  const personsCopy = caseJournalCopy.persons
  const playInteractionFeedback = useInteractionFeedback()
  const [developVariantName] = useState(() =>
    chooseAnimationVariantName('journal_photograph_develop', photographDevelopVariantNames),
  )

  return (
    <section aria-labelledby="journal-persons-heading">
      <h2 id="journal-persons-heading" className="journal-section-heading">
        {personsCopy.sectionHeading}
      </h2>
      <p className="journal-section-introduction">{personsCopy.sectionIntroduction}</p>
      <ul className="journal-person-grid mt-6">
        {livedCaseJournal.knownPersons.map((knownPerson, personIndex) => {
          const relatedClueCount = livedCaseJournal.clues.filter((perceivedClue) =>
            perceivedClue.personIdentifiers.includes(knownPerson.identifier),
          ).length
          return (
            <li
              key={knownPerson.identifier}
              className="journal-paper-sheet journal-person-card"
              style={
                {
                  '--paper-tilt': `${calculateStableTiltDegrees(knownPerson.identifier, 0.9)}deg`,
                  '--entrance-order': personIndex,
                } as CSSProperties
              }
            >
              <div className="journal-person-card-top">
                <div
                  className="journal-person-photograph"
                  data-develop-variant={developVariantName}
                  style={{ '--paper-tilt': `${calculateStableTiltDegrees(`${knownPerson.identifier}_photograph`, 4)}deg` } as CSSProperties}
                  aria-hidden="true"
                >
                  <span className="journal-person-photograph-image">
                    <UserCircle size={54} weight="fill" />
                  </span>
                  <span className="journal-person-photograph-caption">{personsCopy.photographPendingCaption}</span>
                </div>
                <div className="min-w-0">
                  <h3 className="journal-paper-heading">{knownPerson.displayName}</h3>
                  {knownPerson.isNameKnown ? null : (
                    <p className="journal-person-name-note">{personsCopy.nameStillUnknown}</p>
                  )}
                  <p className="journal-person-first-seen">
                    {personsCopy.firstSeen(knownPerson.firstSeenPlaceName, formatWorldClock(knownPerson.firstSeenWorldClockMinutes))}
                  </p>
                </div>
              </div>

              {knownPerson.bondTexts.length > 0 ? (
                <>
                  <h4 className="journal-paper-label mt-4">{personsCopy.bondLabel}</h4>
                  {knownPerson.bondTexts.map((bondText) => (
                    <p key={bondText} className="journal-paper-prose">
                      {personalizeJournalText(bondText)}
                    </p>
                  ))}
                </>
              ) : null}

              <h4 className="journal-paper-label mt-4">{personsCopy.relationLevelLabel}</h4>
              <p className="journal-paper-prose">{readJournalRelationLevelText(knownPerson.identifier, relationshipPulses)}</p>

              {knownPerson.impressions.length > 0 ? (
                <>
                  <h4 className="journal-paper-label mt-4">{personsCopy.impressionLabel}</h4>
                  <ul className="journal-person-entry-list">
                    {knownPerson.impressions.map((personImpression) => (
                      <li key={personImpression.impressionText}>
                        <p className="journal-paper-prose">{personalizeJournalText(personImpression.impressionText)}</p>
                        <p className="journal-person-entry-moment">
                          {personsCopy.impressionMoment(formatWorldClock(personImpression.worldClockMinutes))}
                        </p>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              <h4 className="journal-paper-label mt-4">{personsCopy.statementsLabel}</h4>
              {knownPerson.statements.length === 0 ? (
                <p className="journal-paper-prose">{personsCopy.noStatements}</p>
              ) : (
                <ul className="journal-person-entry-list">
                  {knownPerson.statements.map((personStatement) => (
                    <li key={personStatement.quotedText}>
                      <blockquote className="journal-perceived-text">{personStatement.quotedText}</blockquote>
                      <p className="journal-person-entry-moment">
                        {personalizeJournalText(personStatement.addresseeText)} ·{' '}
                        {personsCopy.statementMoment(personStatement.placeName, formatWorldClock(personStatement.worldClockMinutes))}
                      </p>
                    </li>
                  ))}
                </ul>
              )}

              {relatedClueCount > 0 ? (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <p className="journal-person-entry-moment">
                    {personsCopy.relatedCluesLabel}: {personsCopy.relatedCluesCount(relatedClueCount)}
                  </p>
                  <button
                    type="button"
                    className="journal-paper-button"
                    onClick={() => {
                      playInteractionFeedback('option_click')
                      onPersonCluesRequested(knownPerson.identifier)
                    }}
                  >
                    <MagnifyingGlass size={16} weight="bold" aria-hidden="true" />
                    {personsCopy.showRelatedClues}
                    <span className="visually-hidden-text"> · {knownPerson.displayName}</span>
                  </button>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

import { organizationsAlliesCopy } from '../../copy/organizations_allies_copy'
import { relationshipsCopy } from '../../copy/archive_chat_engine/relationships_copy'
import type { RelationshipPulse } from '../../game_state/archive_turn_contract'
import type { ArchiveRunState } from '../../game_state/archive_run_state'

export type CaseRelationshipPerson = {
  personIdentifier: string
  visibleName: string
  fromInvestigator: RelationshipPulse | null
  towardInvestigator: RelationshipPulse | null
}

function latestPulseInDirection(
  relationshipPulses: RelationshipPulse[],
  personIdentifier: string,
  directionName: RelationshipPulse['directionName'],
): RelationshipPulse | null {
  for (let pulseIndex = relationshipPulses.length - 1; pulseIndex >= 0; pulseIndex -= 1) {
    const relationshipPulse = relationshipPulses[pulseIndex]
    if (
      relationshipPulse.personIdentifier === personIdentifier &&
      relationshipPulse.directionName === directionName
    ) {
      return relationshipPulse
    }
  }
  return null
}

export function readCaseRelationshipPeople(archiveRun: ArchiveRunState): CaseRelationshipPerson[] {
  const visibleNameByPersonIdentifier = new Map<string, string>()
  for (const knownPerson of archiveRun.knownPersons) {
    const visibleName = knownPerson.visibleName.trim()
    if (visibleName !== '') {
      visibleNameByPersonIdentifier.set(knownPerson.personIdentifier, visibleName)
    }
  }
  for (const relationshipPulse of archiveRun.relationshipPulses) {
    const visibleName = relationshipPulse.personVisibleName.trim()
    if (visibleName !== '') {
      visibleNameByPersonIdentifier.set(relationshipPulse.personIdentifier, visibleName)
    }
  }
  return [...visibleNameByPersonIdentifier.entries()]
    .map(([personIdentifier, visibleName]) => ({
      personIdentifier,
      visibleName,
      fromInvestigator: latestPulseInDirection(archiveRun.relationshipPulses, personIdentifier, 'from_investigator'),
      towardInvestigator: latestPulseInDirection(
        archiveRun.relationshipPulses,
        personIdentifier,
        'toward_investigator_as_perceived',
      ),
    }))
    .sort((leftPerson, rightPerson) => leftPerson.visibleName.localeCompare(rightPerson.visibleName, 'es'))
}

function RelationshipDirectionLine({
  investigatorShortName,
  visibleName,
  relationshipPulse,
  directionName,
}: {
  investigatorShortName: string
  visibleName: string
  relationshipPulse: RelationshipPulse | null
  directionName: RelationshipPulse['directionName']
}) {
  const registerCopy = organizationsAlliesCopy.header.caseRegister
  return (
    <div>
      <p className="text-sm text-paper-muted">
        {relationshipsCopy.directionSectionHeadings[directionName](investigatorShortName, visibleName)}
      </p>
      {relationshipPulse ? (
        <p className="text-sm leading-relaxed [overflow-wrap:anywhere]">
          {relationshipsCopy.qualitativeBandLabels[relationshipPulse.resultingQualitativeBandName]}.{' '}
          {relationshipsCopy.tendencyLabels[relationshipPulse.tendencyName]}.
          {relationshipPulse.perceptibleCauseText.trim() !== '' ? (
            <>
              {' '}
              <span className="text-paper-muted">{registerCopy.causeLabel}. </span>
              {relationshipPulse.perceptibleCauseText}
            </>
          ) : null}
        </p>
      ) : (
        <p className="text-sm text-paper-muted">{registerCopy.noSignal}</p>
      )}
    </div>
  )
}

export function CaseArchiveRelationships({
  archiveRun,
  investigatorShortName,
}: {
  archiveRun: ArchiveRunState
  investigatorShortName: string
}) {
  const registerCopy = organizationsAlliesCopy.header.caseRegister
  const caseRelationshipPeople = readCaseRelationshipPeople(archiveRun)
  return (
    <section className="mb-8" aria-labelledby="case-relationship-register-title">
      <h2 id="case-relationship-register-title" className="display-title text-2xl">
        {registerCopy.heading}
      </h2>
      <p className="mt-1 max-w-[68ch] text-sm text-paper-muted">{registerCopy.introduction}</p>
      {caseRelationshipPeople.length > 0 ? (
        <ul className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3">
          {caseRelationshipPeople.map((caseRelationshipPerson) => (
            <li key={caseRelationshipPerson.personIdentifier} className="comic-panel p-4">
              <h3 className="text-base font-semibold [overflow-wrap:anywhere]">{caseRelationshipPerson.visibleName}</h3>
              <div className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-2">
                <RelationshipDirectionLine
                  investigatorShortName={investigatorShortName}
                  visibleName={caseRelationshipPerson.visibleName}
                  relationshipPulse={caseRelationshipPerson.fromInvestigator}
                  directionName="from_investigator"
                />
                <RelationshipDirectionLine
                  investigatorShortName={investigatorShortName}
                  visibleName={caseRelationshipPerson.visibleName}
                  relationshipPulse={caseRelationshipPerson.towardInvestigator}
                  directionName="toward_investigator_as_perceived"
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-paper-muted">{registerCopy.empty}</p>
      )}
    </section>
  )
}

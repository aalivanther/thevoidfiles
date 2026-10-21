import { caseJournalCopy } from '../../copy/case_journal_copy'
import { rememberKnownPerson } from '../../game_state/archive_run_state'
import type { ArchiveRunState, KnownJournalPerson } from '../../game_state/archive_run_state'

function readJournalPeople(archiveRun: ArchiveRunState): KnownJournalPerson[] {
  return archiveRun.relationshipPulses.reduce(
    (knownPersons, relationshipPulse) =>
      archiveRun.knownPersonIdentifiers.includes(relationshipPulse.personIdentifier)
        ? rememberKnownPerson(knownPersons, relationshipPulse.personIdentifier, relationshipPulse.personVisibleName)
        : knownPersons,
    archiveRun.knownPersons,
  )
}

export function JournalEngineFacts({ archiveRun }: { archiveRun: ArchiveRunState }) {
  const cluesCopy = caseJournalCopy.clues
  const knownPeople = readJournalPeople(archiveRun)
  const hasAnyFact =
    archiveRun.revealedFacts.length > 0 ||
    archiveRun.visitedPlaces.length > 0 ||
    knownPeople.length > 0 ||
    archiveRun.activeConditions.length > 0 ||
    archiveRun.lastSeriousWoundCauseText !== null ||
    archiveRun.heardLines.length > 0 ||
    archiveRun.threatLines.length > 0 ||
    archiveRun.completedObjectiveTexts.length > 0

  return (
    <section className="mb-6" aria-labelledby="journal-engine-facts-title">
      <h3 id="journal-engine-facts-title" className="dossier-label">
        {cluesCopy.solvedFactsHeading}
      </h3>
      {hasAnyFact ? (
        <ul className="mt-2 flex flex-col gap-3 text-sm">
          {archiveRun.revealedFacts.map((revealedFact) => (
            <li key={revealedFact.factIdentifier} className="[overflow-wrap:anywhere]">
              {cluesCopy.engineFactSolved(revealedFact.visibleName)}
            </li>
          ))}
          {archiveRun.completedObjectiveTexts.map((completedObjectiveText) => (
            <li key={completedObjectiveText} className="[overflow-wrap:anywhere]">
              {cluesCopy.engineFactEncargo(completedObjectiveText)}
            </li>
          ))}
          {archiveRun.visitedPlaces.map((visitedPlace) => (
            <li key={visitedPlace.sceneIdentifier} className="[overflow-wrap:anywhere]">
              {cluesCopy.engineFactPlace(visitedPlace.placeName)}
            </li>
          ))}
          {knownPeople.map((knownPerson) => (
            <li key={knownPerson.personIdentifier} className="[overflow-wrap:anywhere]">
              {cluesCopy.engineFactPerson(knownPerson.visibleName)}
            </li>
          ))}
          {archiveRun.lastSeriousWoundCauseText ? (
            <li className="[overflow-wrap:anywhere]">{cluesCopy.engineFactWound(archiveRun.lastSeriousWoundCauseText)}</li>
          ) : null}
          {archiveRun.heardLines.map((heardLine, heardLineIndex) => (
            <li key={`${heardLineIndex}-${heardLine}`} className="[overflow-wrap:anywhere]">
              {cluesCopy.engineFactSpoken(heardLine)}
            </li>
          ))}
          {archiveRun.threatLines.map((threatLine, threatLineIndex) => (
            <li key={`${threatLineIndex}-${threatLine}`} className="[overflow-wrap:anywhere]">
              {cluesCopy.engineFactThreat(threatLine)}
            </li>
          ))}
          {archiveRun.activeConditions.map((activeCondition) => (
            <li key={activeCondition.conditionIdentifier} className="[overflow-wrap:anywhere]">
              <p>{cluesCopy.engineFactCondition(activeCondition.visibleName)}</p>
              <p className="text-paper-muted">{cluesCopy.engineFactEffect(activeCondition.effectText)}</p>
              <p className="text-paper-muted">{cluesCopy.engineFactExit(activeCondition.exitText)}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-paper-muted">{cluesCopy.engineFactsEmpty}</p>
      )}
    </section>
  )
}

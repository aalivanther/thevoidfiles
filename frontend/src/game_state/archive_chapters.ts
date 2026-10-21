import { caseJournalCopy } from '../copy/case_journal_copy'
import { createEmptyArchiveCasework, readCaseJournalRecord } from '../components/case_journal/case_journal_record'
import { chronicleHistoryCopy } from '../copy/chronicle_history_copy'
import { limitSummaryParagraphsToOnePage } from '../demonstration/chronicle_history_data'
import type { ChronicleChapter, ChapterHighlight } from '../demonstration/chronicle_history_data'
import type { ChronicleState } from './chronicle_state'

export function buildCurrentArchiveChapter(state: ChronicleState): ChronicleChapter | null {
  const run = state.archiveRun
  if (!state.chosenWhisperIdentifier || !run.archiveTitle) return null
  const sequence = Number(run.archiveNumberLabel?.replace(/\D/g, '')) || state.investigatorProgression.resolvedArchiveCount + 1
  const narration = run.logEntries.filter((entry) => entry.voice === 'director_narration')
    .flatMap((entry) => entry.voice === 'director_narration' ? entry.markedParagraphs : [])
  const lastAction = run.logEntries.findLast((entry) => entry.voice === 'investigator_entry')
  const highlights: ChapterHighlight[] = []
  if (lastAction?.voice === 'investigator_entry') {
    highlights.push({ highlightKindName: 'key_decision', highlightText: lastAction.attemptedSteps.map((step) => step.actionText).join('; ') })
  }
  for (const person of run.knownPersons.slice(0, 2)) {
    highlights.push({ highlightKindName: 'person_met', highlightText: person.visibleName })
  }
  if (run.lastSeriousWoundCauseText) {
    highlights.push({ highlightKindName: 'scar_left', highlightText: run.lastSeriousWoundCauseText })
  }
  const outcome = run.archiveOutcome
  const closingParagraphs = outcome?.kind === 'archive_ended_alive'
    ? outcome.objectiveResults.filter((result) => result.wasAchieved).map((result) => result.visibleText)
    : outcome?.kind === 'chronicle_closed_by_death' ? [outcome.perceptibleCauseText] : []
  return {
    chapterIdentifier: run.archiveCaseIdentifier ?? `${state.chosenWhisperIdentifier}_${sequence}`,
    chapterSequence: sequence,
    chapterTitle: run.archiveTitle,
    placeName: state.investigator.placeName,
    seasonLine: outcome ? chronicleHistoryCopy.record.closed : chronicleHistoryCopy.record.inProgress,
    writingStateName: outcome ? 'written' : 'in_progress',
    summaryParagraphs: limitSummaryParagraphsToOnePage([...closingParagraphs, ...narration.slice(-2)]),
    highlights,
    pageLayoutName: 'highlights_below',
  }
}

export function readArchiveChapters(state: ChronicleState): ChronicleChapter[] {
  const current = buildCurrentArchiveChapter(state)
  const chapters = state.archiveChapters ?? []
  return (current ? [...chapters.filter((chapter) => chapter.chapterIdentifier !== current.chapterIdentifier), current] : chapters)
    .toSorted((left, right) => left.chapterSequence - right.chapterSequence)
}

export function retainClosedArchiveChapter(state: ChronicleState): ChronicleState {
  const chapter = buildCurrentArchiveChapter(state)
  if (chapter?.writingStateName !== 'written') return state
  const journal = readCaseJournalRecord(state.moduleRecords.case_journal)
  const key = String(chapter.chapterSequence - 1)
  const existing = journal.caseworkByArchiveSequence[key] ?? createEmptyArchiveCasework(chapter.chapterTitle)
  const run = state.archiveRun
  const copy = caseJournalCopy.clues
  const confirmedFactTexts = [
    ...run.revealedFacts.map((fact) => copy.engineFactSolved(fact.visibleName)),
    ...(run.completedObjectiveTexts ?? []).map((completedObjectiveText) => copy.engineFactEncargo(completedObjectiveText)),
    ...run.visitedPlaces.map((place) => copy.engineFactPlace(place.placeName)),
    ...run.knownPersons.map((person) => copy.engineFactPerson(person.visibleName)),
    ...(run.lastSeriousWoundCauseText ? [copy.engineFactWound(run.lastSeriousWoundCauseText)] : []),
    ...(run.heardLines ?? []).map((heardLine) => copy.engineFactSpoken(heardLine)),
    ...(run.threatLines ?? []).map((threatLine) => copy.engineFactThreat(threatLine)),
  ]
  return {
    ...state,
    archiveChapters: readArchiveChapters(state),
    moduleRecords: { ...state.moduleRecords, case_journal: {
      caseworkByArchiveSequence: { ...journal.caseworkByArchiveSequence, [key]: {
        ...existing, archiveTitle: chapter.chapterTitle, wasArchiveFinished: true,
        witnessedOrigins: run.witnessedOrigins, confirmedFactTexts,
      } },
    } },
  }
}

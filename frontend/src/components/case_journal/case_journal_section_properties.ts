import type { LivedCaseJournal } from '../../demonstration/case_journal_data'
import type { ArchiveCasework } from './case_journal_record'

export type CaseJournalSectionProperties = {
  livedCaseJournal: LivedCaseJournal
  archiveCasework: ArchiveCasework
  changeArchiveCasework: (createChangedCasework: (previousCasework: ArchiveCasework) => ArchiveCasework) => void
  currentWorldClockMinutes: number
  personalizeJournalText: (journalText: string) => string
}

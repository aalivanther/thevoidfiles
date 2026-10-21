import { Archive, Notebook, NotePencil, Path, PushPin, Users } from '@phosphor-icons/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { chooseAnimationVariantName } from '../../animation/animation_variety'
import { useInteractionFeedback } from '../../audio/interaction_feedback'
import { caseJournalCopy } from '../../copy/case_journal_copy'
import {
  buildLivedCaseJournal,
  readWitnessedOriginsFromArchiveRun,
} from '../../demonstration/case_journal_data'
import { formatWorldClock, personalizeNarrativeText, useChronicleState } from '../../game_state/chronicle_state'
import { PresentationTitleCard } from '../PresentationTitleCard'
import { createEmptyArchiveCasework, readCaseJournalRecord } from './case_journal_record'
import type { ArchiveCasework, CaseJournalRecord } from './case_journal_record'
import type { CaseJournalSectionProperties } from './case_journal_section_properties'
import { ClosedArchivesSection } from './ClosedArchivesSection'
import { ClueSection } from './ClueSection'
import { JournalEngineFacts } from './JournalEngineFacts'
import { FreeNotesSection } from './FreeNotesSection'
import { HandDrawnUnderline } from './HandDrawnUnderline'
import { HypothesisBoardSection } from './HypothesisBoardSection'
import { KnownPersonsSection } from './KnownPersonsSection'
import { OpenThreadsSection } from './OpenThreadsSection'

type JournalSectionName = 'clues' | 'hypotheses' | 'persons' | 'threads' | 'notes' | 'closed_archives'

const pageTurnVariantNames = ['page_flip_from_spine', 'page_slide_from_below', 'page_settle_with_tilt'] as const

function areWitnessedOriginsEqual(
  firstOrigins: ArchiveCasework['witnessedOrigins'],
  secondOrigins: ArchiveCasework['witnessedOrigins'],
): boolean {
  return (
    firstOrigins.length === secondOrigins.length &&
    firstOrigins.every(
      (firstOrigin, originIndex) =>
        firstOrigin.originIdentifier === secondOrigins[originIndex].originIdentifier &&
        firstOrigin.worldClockMinutes === secondOrigins[originIndex].worldClockMinutes &&
        firstOrigin.placeName === secondOrigins[originIndex].placeName,
    )
  )
}

function doStoredOriginsBelongToThisRun(
  storedOrigins: ArchiveCasework['witnessedOrigins'],
  liveOrigins: ArchiveCasework['witnessedOrigins'],
): boolean {
  return (
    storedOrigins.length <= liveOrigins.length &&
    areWitnessedOriginsEqual(storedOrigins, liveOrigins.slice(0, storedOrigins.length))
  )
}

export function CaseJournalScreen() {
  const { chronicleState, changeChronicleState } = useChronicleState()
  const currentArchiveTitle = chronicleState.archiveRun.archiveTitle ?? caseJournalCopy.closedArchives.untitledArchive
  const currentArchiveNumberLabel = chronicleState.archiveRun.archiveNumberLabel ?? ''
  const isDemonstrationArchiveFinished = chronicleState.archiveRun.archiveOutcome !== null
  const playInteractionFeedback = useInteractionFeedback()
  const [isPresentationVisible, setIsPresentationVisible] = useState(true)
  const hasOpenArchive = chronicleState.chosenWhisperIdentifier !== null
  const resolvedArchiveCount = chronicleState.investigatorProgression.resolvedArchiveCount
  const currentArchiveSequence = hasOpenArchive
    ? Math.max(0, (Number(currentArchiveNumberLabel.replace(/\D/g, '')) || resolvedArchiveCount + 1) - 1)
    : null
  const [activeSectionName, setActiveSectionName] = useState<JournalSectionName>(
    hasOpenArchive ? 'clues' : 'closed_archives',
  )
  const [pageTurnVariantName, setPageTurnVariantName] = useState(() =>
    chooseAnimationVariantName('journal_page_turn', pageTurnVariantNames),
  )
  const [cluePersonFilterIdentifier, setCluePersonFilterIdentifier] = useState<string | null>(null)
  const sectionTabElements = useRef(new Map<JournalSectionName, HTMLButtonElement>())

  const caseJournalRecord = useMemo(
    () => readCaseJournalRecord(chronicleState.moduleRecords.case_journal),
    [chronicleState.moduleRecords.case_journal],
  )
  const latestCaseJournalRecord = useRef<CaseJournalRecord>(caseJournalRecord)

  useEffect(() => {
    latestCaseJournalRecord.current = caseJournalRecord
  }, [caseJournalRecord])

  const liveWitnessedOrigins = useMemo(
    () =>
      readWitnessedOriginsFromArchiveRun(
        chronicleState.archiveRun,
        hasOpenArchive,
        chronicleState.chosenWhisperIdentifier,
      ),
    [chronicleState.archiveRun, hasOpenArchive, chronicleState.chosenWhisperIdentifier],
  )
  const livedCaseJournal = useMemo(() => buildLivedCaseJournal(liveWitnessedOrigins), [liveWitnessedOrigins])

  const storedArchiveCasework =
    currentArchiveSequence === null ? undefined : caseJournalRecord.caseworkByArchiveSequence[String(currentArchiveSequence)]
  const doesStoredCaseworkBelongToThisRun =
    storedArchiveCasework !== undefined &&
    doStoredOriginsBelongToThisRun(storedArchiveCasework.witnessedOrigins, liveWitnessedOrigins)
  const archiveCasework = useMemo(
    () =>
      storedArchiveCasework && doesStoredCaseworkBelongToThisRun
        ? storedArchiveCasework
        : createEmptyArchiveCasework(currentArchiveTitle),
    [storedArchiveCasework, doesStoredCaseworkBelongToThisRun, currentArchiveTitle],
  )

  const saveArchiveCasework = useCallback(
    (archiveSequence: number, changedCasework: ArchiveCasework) => {
      const changedRecord: CaseJournalRecord = {
        caseworkByArchiveSequence: {
          ...latestCaseJournalRecord.current.caseworkByArchiveSequence,
          [String(archiveSequence)]: changedCasework,
        },
      }
      latestCaseJournalRecord.current = changedRecord
      changeChronicleState({ kind: 'module_record_saved', moduleName: 'case_journal', moduleRecord: changedRecord })
    },
    [changeChronicleState],
  )

  const changeArchiveCasework = useCallback<CaseJournalSectionProperties['changeArchiveCasework']>(
    (createChangedCasework) => {
      if (currentArchiveSequence === null) {
        return
      }
      const latestStoredCasework = latestCaseJournalRecord.current.caseworkByArchiveSequence[String(currentArchiveSequence)]
      const previousCasework =
        latestStoredCasework && doStoredOriginsBelongToThisRun(latestStoredCasework.witnessedOrigins, liveWitnessedOrigins)
          ? latestStoredCasework
          : createEmptyArchiveCasework(currentArchiveTitle)
      saveArchiveCasework(currentArchiveSequence, {
        ...createChangedCasework(previousCasework),
        archiveTitle: currentArchiveTitle,
        witnessedOrigins: liveWitnessedOrigins,
        wasArchiveFinished: isDemonstrationArchiveFinished,
      })
    },
    [currentArchiveSequence, currentArchiveTitle, liveWitnessedOrigins, isDemonstrationArchiveFinished, saveArchiveCasework],
  )

  useEffect(() => {
    if (currentArchiveSequence === null) {
      return
    }
    const isSnapshotCurrent =
      doesStoredCaseworkBelongToThisRun &&
      storedArchiveCasework !== undefined &&
      areWitnessedOriginsEqual(storedArchiveCasework.witnessedOrigins, liveWitnessedOrigins) &&
      storedArchiveCasework.wasArchiveFinished === isDemonstrationArchiveFinished &&
      storedArchiveCasework.archiveTitle === currentArchiveTitle
    if (!isSnapshotCurrent) {
      changeArchiveCasework((previousCasework) => previousCasework)
    }
  }, [
    currentArchiveSequence,
    currentArchiveTitle,
    doesStoredCaseworkBelongToThisRun,
    storedArchiveCasework,
    liveWitnessedOrigins,
    isDemonstrationArchiveFinished,
    changeArchiveCasework,
  ])

  const personalizeJournalText = useCallback(
    (journalText: string) => personalizeNarrativeText(journalText, chronicleState.investigatorRegistration),
    [chronicleState.investigatorRegistration],
  )

  const sectionsCopy = caseJournalCopy.sections
  const availableSections: Array<{ sectionName: JournalSectionName; label: string; icon: ReactNode }> = [
    ...(hasOpenArchive
      ? ([
          { sectionName: 'clues', label: sectionsCopy.clues, icon: <Notebook size={18} weight="fill" aria-hidden="true" /> },
          {
            sectionName: 'hypotheses',
            label: sectionsCopy.hypotheses,
            icon: <PushPin size={18} weight="fill" aria-hidden="true" />,
          },
          { sectionName: 'persons', label: sectionsCopy.persons, icon: <Users size={18} weight="fill" aria-hidden="true" /> },
          { sectionName: 'threads', label: sectionsCopy.threads, icon: <Path size={18} weight="bold" aria-hidden="true" /> },
          { sectionName: 'notes', label: sectionsCopy.notes, icon: <NotePencil size={18} weight="fill" aria-hidden="true" /> },
        ] as const)
      : []),
    {
      sectionName: 'closed_archives',
      label: sectionsCopy.closedArchives,
      icon: <Archive size={18} weight="fill" aria-hidden="true" />,
    },
  ]
  const displayedSectionName = availableSections.some((availableSection) => availableSection.sectionName === activeSectionName)
    ? activeSectionName
    : availableSections[0].sectionName

  const openSection = (sectionName: JournalSectionName) => {
    if (sectionName === displayedSectionName) {
      return
    }
    playInteractionFeedback('panel_open')
    setPageTurnVariantName(chooseAnimationVariantName('journal_page_turn', pageTurnVariantNames))
    setActiveSectionName(sectionName)
  }

  const handleSectionTabKeyDown = (keyboardEvent: KeyboardEvent<HTMLButtonElement>, sectionIndex: number) => {
    const lastSectionIndex = availableSections.length - 1
    const targetSectionIndexByKey: Record<string, number> = {
      ArrowRight: sectionIndex === lastSectionIndex ? 0 : sectionIndex + 1,
      ArrowLeft: sectionIndex === 0 ? lastSectionIndex : sectionIndex - 1,
      Home: 0,
      End: lastSectionIndex,
    }
    const targetSectionIndex = targetSectionIndexByKey[keyboardEvent.key]
    if (targetSectionIndex === undefined) {
      return
    }
    keyboardEvent.preventDefault()
    const targetSectionName = availableSections[targetSectionIndex].sectionName
    openSection(targetSectionName)
    sectionTabElements.current.get(targetSectionName)?.focus()
  }

  if (isPresentationVisible) {
    return (
      <PresentationTitleCard
        chapterLabel={caseJournalCopy.presentation.chapterLabel}
        chapterTitle={caseJournalCopy.presentation.chapterTitle}
        detailLine={
          hasOpenArchive
            ? caseJournalCopy.presentation.detailLineWithArchive(currentArchiveTitle)
            : caseJournalCopy.presentation.detailLineWithoutArchive
        }
        onPresentationFinished={() => setIsPresentationVisible(false)}
      />
    )
  }

  const sectionProperties: CaseJournalSectionProperties = {
    livedCaseJournal,
    archiveCasework,
    changeArchiveCasework,
    currentWorldClockMinutes: chronicleState.investigator.worldClockMinutes,
    personalizeJournalText,
  }

  return (
    <main id="main-content" className="case-journal-screen mx-auto w-full max-w-6xl px-4 pt-6 pb-20 sm:px-8">
      <header className="case-journal-header entrance-from-left">
        <p className="dossier-label">
          {hasOpenArchive
            ? `${caseJournalCopy.header.notebookLabel} · ${caseJournalCopy.header.archiveLabel(currentArchiveNumberLabel)}`
            : caseJournalCopy.header.notebookLabel}
        </p>
        <h1 className="display-title case-journal-title text-[clamp(2rem,6vw,3.5rem)]">
          {hasOpenArchive ? currentArchiveTitle : caseJournalCopy.outsideArchive.emptyHeading}
          <HandDrawnUnderline animationName="screen_title" />
        </h1>
        {hasOpenArchive ? (
          <p className="mt-2 font-[family-name:var(--font-dossier)] text-sm text-paper-muted">
            {caseJournalCopy.header.placeAndHour(
              chronicleState.investigator.placeName,
              formatWorldClock(chronicleState.investigator.worldClockMinutes),
            )}
          </p>
        ) : null}
        <p className="case-journal-honesty-notice mt-3 max-w-[68ch] text-sm text-paper-muted">
          {hasOpenArchive && isDemonstrationArchiveFinished
            ? caseJournalCopy.header.finishedArchiveNotice
            : caseJournalCopy.header.honestyNotice}
        </p>
      </header>

      {hasOpenArchive ? null : (
        <section className="journal-paper-sheet journal-blank-notebook entrance-from-below mt-6" aria-labelledby="journal-blank-heading">
          <span className="journal-tape-strip" aria-hidden="true" />
          <h2 id="journal-blank-heading" className="journal-paper-heading">
            {caseJournalCopy.outsideArchive.emptyHeading}
          </h2>
          <p className="journal-paper-prose mt-2">{caseJournalCopy.outsideArchive.emptyExplanation}</p>
          <p className="journal-paper-prose mt-2">{caseJournalCopy.outsideArchive.emptyNextStep}</p>
        </section>
      )}

      <div className="journal-section-tabs mt-6" role="tablist" aria-label={sectionsCopy.navigationLabel}>
        {availableSections.map((availableSection, sectionIndex) => (
          <button
            key={availableSection.sectionName}
            ref={(tabElement) => {
              if (tabElement) {
                sectionTabElements.current.set(availableSection.sectionName, tabElement)
              } else {
                sectionTabElements.current.delete(availableSection.sectionName)
              }
            }}
            type="button"
            role="tab"
            id={`journal-tab-${availableSection.sectionName}`}
            aria-selected={availableSection.sectionName === displayedSectionName}
            aria-controls="journal-section-panel"
            tabIndex={availableSection.sectionName === displayedSectionName ? 0 : -1}
            className="journal-section-tab"
            onClick={() => openSection(availableSection.sectionName)}
            onKeyDown={(keyboardEvent) => handleSectionTabKeyDown(keyboardEvent, sectionIndex)}
            onPointerEnter={(pointerEvent) => {
              if (pointerEvent.pointerType === 'mouse' && availableSection.sectionName !== displayedSectionName) {
                playInteractionFeedback('option_hover')
              }
            }}
          >
            {availableSection.icon}
            {availableSection.label}
          </button>
        ))}
      </div>

      <div
        key={displayedSectionName}
        id="journal-section-panel"
        role="tabpanel"
        aria-labelledby={`journal-tab-${displayedSectionName}`}
        className="journal-section-panel"
        data-page-turn-variant={pageTurnVariantName}
      >
        {displayedSectionName === 'clues' ? <JournalEngineFacts archiveRun={chronicleState.archiveRun} /> : null}
        {displayedSectionName === 'clues' ? (
          <ClueSection
            {...sectionProperties}
            personFilterIdentifier={cluePersonFilterIdentifier}
            onPersonFilterChanged={setCluePersonFilterIdentifier}
          />
        ) : null}
        {displayedSectionName === 'hypotheses' ? <HypothesisBoardSection {...sectionProperties} /> : null}
        {displayedSectionName === 'persons' ? (
          <KnownPersonsSection
            {...sectionProperties}
            relationshipPulses={chronicleState.archiveRun.relationshipPulses}
            onPersonCluesRequested={(personIdentifier) => {
              setCluePersonFilterIdentifier(personIdentifier)
              openSection('clues')
            }}
          />
        ) : null}
        {displayedSectionName === 'threads' ? (
          <OpenThreadsSection {...sectionProperties} isArchiveFinished={isDemonstrationArchiveFinished} />
        ) : null}
        {displayedSectionName === 'notes' ? <FreeNotesSection {...sectionProperties} /> : null}
        {displayedSectionName === 'closed_archives' ? (
          <ClosedArchivesSection
            caseJournalRecord={caseJournalRecord}
            personalizeJournalText={personalizeJournalText}
          />
        ) : null}
      </div>
    </main>
  )
}

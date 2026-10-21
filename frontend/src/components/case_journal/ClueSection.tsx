import { ArrowsClockwise, CaretDown, Check, Funnel, ListBullets, NotePencil, Path, PushPin, Scissors, SquaresFour, X } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { chooseAnimationVariantName } from '../../animation/animation_variety'
import { useInteractionFeedback } from '../../audio/interaction_feedback'
import { caseJournalCopy } from '../../copy/case_journal_copy'
import { clueSupportKindNames } from '../../demonstration/case_journal_data'
import type { ClueSupportKind, PerceivedClue } from '../../demonstration/case_journal_data'
import { formatWorldClock, readInvestigatorShortName, useChronicleState } from '../../game_state/chronicle_state'
import { areClueThreadLinksEqual, maximumClueThreadLinkCount, playerTextLengthLimits } from './case_journal_record'
import type { ClueViewName } from './case_journal_record'
import type { CaseJournalSectionProperties } from './case_journal_section_properties'
import { ClueEvidenceBoard } from './ClueEvidenceBoard'
import { ClueSupportIcon } from './clue_support_presentation'
import { HandDrawnUnderline } from './HandDrawnUnderline'
import { calculateStableTiltDegrees, useIsWideJournalLayout } from './journal_paper_layout'
import { JournalWritingField } from './JournalWritingField'
import { SeenHandoutObject } from './SeenHandoutObject'

const pinEntranceVariantNames = ['pin_swing_settle', 'pin_press_in', 'pin_flutter'] as const
const savedMarkDelayMilliseconds = 700

type ClueSectionProperties = CaseJournalSectionProperties & {
  personFilterIdentifier: string | null
  onPersonFilterChanged: (personIdentifier: string | null) => void
}

type ClueDetailProperties = {
  perceivedClue: PerceivedClue
  ownAnalysisText: string
  involvedPersonNames: string[]
  supportingDocumentTitle: string | null
  personalizeJournalText: (journalText: string) => string
  onOwnAnalysisChanged: (ownAnalysisText: string) => void
  onCloseRequested: () => void
}

function ClueDetail({
  perceivedClue,
  ownAnalysisText,
  involvedPersonNames,
  supportingDocumentTitle,
  personalizeJournalText,
  onOwnAnalysisChanged,
  onCloseRequested,
}: ClueDetailProperties) {
  const cluesCopy = caseJournalCopy.clues
  const { chronicleState } = useChronicleState()
  const [savedMarkState, setSavedMarkState] = useState<'idle' | 'pending' | 'saved'>('idle')
  const savedMarkTimeoutIdentifier = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (savedMarkTimeoutIdentifier.current !== null) {
        window.clearTimeout(savedMarkTimeoutIdentifier.current)
      }
    },
    [],
  )

  return (
    <article className="journal-paper-sheet journal-clue-detail" aria-labelledby={`clue-detail-${perceivedClue.identifier}`}>
      <span className="journal-tape-strip" aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <h3 id={`clue-detail-${perceivedClue.identifier}`} className="journal-paper-heading">
          {cluesCopy.detailHeading} {perceivedClue.chronologicalOrder}
        </h3>
        <button type="button" className="journal-paper-button" aria-label={cluesCopy.closeClue} onClick={onCloseRequested}>
          <X size={18} weight="bold" aria-hidden="true" />
        </button>
      </div>
      <dl className="journal-clue-facts">
        <div>
          <dt>{cluesCopy.supportLabel}</dt>
          <dd className="inline-flex items-center gap-1.5">
            <ClueSupportIcon supportKind={perceivedClue.supportKind} size={16} />
            {caseJournalCopy.supportKinds[perceivedClue.supportKind]}
          </dd>
        </div>
        <div>
          <dt>{cluesCopy.hourLabel}</dt>
          <dd>
            {perceivedClue.wasPerceivedBeforeArrival
              ? cluesCopy.beforeArrival
              : formatWorldClock(perceivedClue.worldClockMinutes)}
          </dd>
        </div>
        <div>
          <dt>{cluesCopy.placeLabel}</dt>
          <dd>{perceivedClue.wasPerceivedBeforeArrival ? cluesCopy.beforeArrival : perceivedClue.placeName}</dd>
        </div>
        <div>
          <dt>{cluesCopy.discovererLabel}</dt>
          <dd>{readInvestigatorShortName(chronicleState.investigatorRegistration)}</dd>
        </div>
      </dl>
      <h4 className="journal-paper-label mt-4">{cluesCopy.perceivedTextLabel}</h4>
      <blockquote className="journal-perceived-text">{personalizeJournalText(perceivedClue.perceivedText)}</blockquote>
      <h4 className="journal-paper-label mt-4">{cluesCopy.sourceLabel}</h4>
      <p className="journal-paper-prose">{personalizeJournalText(perceivedClue.sourceText)}</p>
      {supportingDocumentTitle ? (
        <>
          <h4 className="journal-paper-label mt-4">{cluesCopy.supportingDocumentLabel}</h4>
          <p className="journal-paper-prose">{supportingDocumentTitle}</p>
        </>
      ) : null}
      {involvedPersonNames.length > 0 ? (
        <>
          <h4 className="journal-paper-label mt-4">{cluesCopy.involvedPersonsLabel}</h4>
          <p className="journal-paper-prose">{involvedPersonNames.join(' · ')}</p>
        </>
      ) : null}
      <div className="mt-5">
        <JournalWritingField
          fieldLabel={cluesCopy.ownAnalysisLabel}
          fieldHint={cluesCopy.ownAnalysisHint}
          placeholderText={cluesCopy.ownAnalysisPlaceholder}
          writtenText={ownAnalysisText}
          maximumLength={playerTextLengthLimits.ownAnalysis}
          rowCount={4}
          paperTone="paper"
          onWrittenTextChanged={(writtenText) => {
            onOwnAnalysisChanged(writtenText)
            setSavedMarkState('pending')
            if (savedMarkTimeoutIdentifier.current !== null) {
              window.clearTimeout(savedMarkTimeoutIdentifier.current)
            }
            savedMarkTimeoutIdentifier.current = window.setTimeout(
              () => setSavedMarkState('saved'),
              savedMarkDelayMilliseconds,
            )
          }}
        />
        <p className="journal-saved-mark" role="status" data-saved-mark-state={savedMarkState}>
          {savedMarkState === 'saved' ? (
            <>
              <Check size={14} weight="bold" aria-hidden="true" />
              <span className="relative">
                {cluesCopy.ownAnalysisSaved}
                <HandDrawnUnderline animationName="saved_mark" />
              </span>
            </>
          ) : null}
          {savedMarkState === 'pending' ? cluesCopy.ownAnalysisPending : null}
        </p>
      </div>
    </article>
  )
}

export function ClueSection({
  livedCaseJournal,
  archiveCasework,
  changeArchiveCasework,
  personalizeJournalText,
  personFilterIdentifier,
  onPersonFilterChanged,
}: ClueSectionProperties) {
  const cluesCopy = caseJournalCopy.clues
  const playInteractionFeedback = useInteractionFeedback()
  const isWideJournalLayout = useIsWideJournalLayout()
  const [supportFilterKind, setSupportFilterKind] = useState<ClueSupportKind | null>(null)
  const [placeFilterName, setPlaceFilterName] = useState<string | null>(null)
  const [openClueIdentifier, setOpenClueIdentifier] = useState<string | null>(null)
  const [pinEntranceVariantName, setPinEntranceVariantName] = useState(() =>
    chooseAnimationVariantName('journal_clue_pin', pinEntranceVariantNames),
  )

  const [threadOriginClueIdentifier, setThreadOriginClueIdentifier] = useState<string | null>(null)
  const [boardStatusText, setBoardStatusText] = useState('')
  const boardCopy = caseJournalCopy.evidenceBoard
  const clueViewName = archiveCasework.preferredClueViewName
  const clueThreadLinks = archiveCasework.clueThreadLinks.filter((clueThreadLink) =>
    [clueThreadLink.firstClueIdentifier, clueThreadLink.secondClueIdentifier].every((linkedClueIdentifier) =>
      livedCaseJournal.clues.some((perceivedClue) => perceivedClue.identifier === linkedClueIdentifier),
    ),
  )

  const shownClues = livedCaseJournal.clues.filter(
    (perceivedClue) =>
      (supportFilterKind === null || perceivedClue.supportKind === supportFilterKind) &&
      (placeFilterName === null || (!perceivedClue.wasPerceivedBeforeArrival && perceivedClue.placeName === placeFilterName)) &&
      (personFilterIdentifier === null || perceivedClue.personIdentifiers.includes(personFilterIdentifier)),
  )
  const openClue = shownClues.find((perceivedClue) => perceivedClue.identifier === openClueIdentifier) ?? null
  const hasAnyFilter = supportFilterKind !== null || placeFilterName !== null || personFilterIdentifier !== null

  const renewPinEntrance = () =>
    setPinEntranceVariantName(chooseAnimationVariantName('journal_clue_pin', pinEntranceVariantNames))

  const readClueSpokenName = (clueIdentifier: string) =>
    boardCopy.clueSpokenName(
      livedCaseJournal.clues.find((perceivedClue) => perceivedClue.identifier === clueIdentifier)?.chronologicalOrder ?? 0,
    )

  const chooseClueView = (chosenViewName: ClueViewName) => {
    if (chosenViewName === clueViewName) {
      return
    }
    playInteractionFeedback('panel_open')
    renewPinEntrance()
    changeArchiveCasework((previousCasework) => ({ ...previousCasework, preferredClueViewName: chosenViewName }))
  }

  const cutClueThread = (firstClueIdentifier: string, secondClueIdentifier: string) => {
    playInteractionFeedback('screen_tear', { volumeMultiplier: 0.6 })
    setBoardStatusText(boardCopy.threadCutStatus(readClueSpokenName(firstClueIdentifier), readClueSpokenName(secondClueIdentifier)))
    changeArchiveCasework((previousCasework) => ({
      ...previousCasework,
      clueThreadLinks: previousCasework.clueThreadLinks.filter(
        (existingLink) => !areClueThreadLinksEqual(existingLink, { firstClueIdentifier, secondClueIdentifier }),
      ),
    }))
  }

  const handleClueChosen = (clueIdentifier: string) => {
    if (threadOriginClueIdentifier === null) {
      const isAlreadyOpen = clueIdentifier === openClueIdentifier
      playInteractionFeedback(isAlreadyOpen ? 'panel_close' : 'panel_open')
      setOpenClueIdentifier(isAlreadyOpen ? null : clueIdentifier)
      return
    }
    if (clueIdentifier === threadOriginClueIdentifier) {
      playInteractionFeedback('panel_close')
      setThreadOriginClueIdentifier(null)
      setBoardStatusText(boardCopy.threadTyingCancelledStatus)
      return
    }
    const requestedLink = { firstClueIdentifier: threadOriginClueIdentifier, secondClueIdentifier: clueIdentifier }
    setThreadOriginClueIdentifier(null)
    if (clueThreadLinks.some((existingLink) => areClueThreadLinksEqual(existingLink, requestedLink))) {
      cutClueThread(requestedLink.firstClueIdentifier, requestedLink.secondClueIdentifier)
      return
    }
    if (archiveCasework.clueThreadLinks.length >= maximumClueThreadLinkCount) {
      playInteractionFeedback('rejection')
      setBoardStatusText(boardCopy.noMoreThreadsStatus(maximumClueThreadLinkCount))
      return
    }
    playInteractionFeedback('confirmation')
    setBoardStatusText(
      boardCopy.threadTiedStatus(readClueSpokenName(requestedLink.firstClueIdentifier), readClueSpokenName(requestedLink.secondClueIdentifier)),
    )
    changeArchiveCasework((previousCasework) => ({
      ...previousCasework,
      clueThreadLinks: [
        ...previousCasework.clueThreadLinks.filter((existingLink) => !areClueThreadLinksEqual(existingLink, requestedLink)),
        requestedLink,
      ],
    }))
  }

  const clueIdentifiersWithOwnAnalysis = new Set(
    Object.entries(archiveCasework.ownAnalysisTextByClueIdentifier)
      .filter(([, ownAnalysisText]) => ownAnalysisText.trim().length > 0)
      .map(([clueIdentifier]) => clueIdentifier),
  )
  const hasArrangedBoard = Object.keys(archiveCasework.evidenceBoardPositionByClueIdentifier).length > 0

  const renderClueDetail = (perceivedClue: PerceivedClue) => (
    <ClueDetail
      key={perceivedClue.identifier}
      perceivedClue={perceivedClue}
      ownAnalysisText={archiveCasework.ownAnalysisTextByClueIdentifier[perceivedClue.identifier] ?? ''}
      involvedPersonNames={livedCaseJournal.knownPersons
        .filter((knownPerson) => perceivedClue.personIdentifiers.includes(knownPerson.identifier))
        .map((knownPerson) => knownPerson.displayName)}
      supportingDocumentTitle={
        livedCaseJournal.handouts.find((seenHandout) => seenHandout.identifier === perceivedClue.handoutIdentifier)
          ?.titleText ?? null
      }
      personalizeJournalText={personalizeJournalText}
      onOwnAnalysisChanged={(ownAnalysisText) =>
        changeArchiveCasework((previousCasework) => ({
          ...previousCasework,
          ownAnalysisTextByClueIdentifier: {
            ...previousCasework.ownAnalysisTextByClueIdentifier,
            [perceivedClue.identifier]: ownAnalysisText,
          },
        }))
      }
      onCloseRequested={() => {
        playInteractionFeedback('panel_close')
        setOpenClueIdentifier(null)
      }}
    />
  )

  return (
    <section aria-labelledby="journal-clues-heading">
      <h2 id="journal-clues-heading" className="journal-section-heading">
        {cluesCopy.sectionHeading}
      </h2>
      <p className="journal-section-introduction">{cluesCopy.sectionIntroduction}</p>

      {livedCaseJournal.handouts.length > 0 ? (
        <div className="mt-6">
          <h3 className="dossier-label">{cluesCopy.seenDocumentsHeading}</h3>
          <p className="mt-1 max-w-[68ch] text-sm text-paper-muted">{cluesCopy.seenDocumentsIntroduction}</p>
          <ul className="journal-handout-strip mt-4">
            {livedCaseJournal.handouts.map((seenHandout, handoutIndex) => (
              <SeenHandoutObject
                key={seenHandout.identifier}
                seenHandout={seenHandout}
                entranceOrder={handoutIndex}
                personalizeJournalText={personalizeJournalText}
              />
            ))}
          </ul>
        </div>
      ) : null}

      <fieldset className="journal-clue-filters mt-8">
        <legend className="dossier-label inline-flex items-center gap-2">
          <Funnel size={14} weight="fill" aria-hidden="true" />
          {cluesCopy.filtersLabel}
        </legend>
        <div className="journal-clue-filter-row" role="group" aria-label={cluesCopy.supportFilterLabel}>
          <button
            type="button"
            className="journal-filter-chip"
            aria-pressed={supportFilterKind === null}
            onClick={() => {
              playInteractionFeedback('option_click')
              setSupportFilterKind(null)
              renewPinEntrance()
            }}
          >
            {cluesCopy.everySupport}
          </button>
          {clueSupportKindNames.map((supportKindName) => (
            <button
              key={supportKindName}
              type="button"
              className="journal-filter-chip"
              aria-pressed={supportFilterKind === supportKindName}
              onClick={() => {
                playInteractionFeedback('option_click')
                setSupportFilterKind(supportFilterKind === supportKindName ? null : supportKindName)
                renewPinEntrance()
              }}
            >
              <ClueSupportIcon supportKind={supportKindName} size={16} />
              {caseJournalCopy.supportKinds[supportKindName]}
            </button>
          ))}
        </div>
        <div className="journal-clue-filter-selects">
          <label className="journal-filter-select">
            <span className="dossier-label">{cluesCopy.placeFilterLabel}</span>
            <span className="journal-filter-select-frame">
              <select
                value={placeFilterName ?? ''}
                onChange={(changeEvent) => {
                  playInteractionFeedback('option_click')
                  setPlaceFilterName(changeEvent.target.value === '' ? null : changeEvent.target.value)
                  renewPinEntrance()
                }}
              >
                <option value="">{cluesCopy.everyPlace}</option>
                {livedCaseJournal.placeNames.map((placeName) => (
                  <option key={placeName} value={placeName}>
                    {placeName}
                  </option>
                ))}
              </select>
              <CaretDown size={14} weight="bold" aria-hidden="true" />
            </span>
          </label>
          <label className="journal-filter-select">
            <span className="dossier-label">{cluesCopy.personFilterLabel}</span>
            <span className="journal-filter-select-frame">
              <select
                value={personFilterIdentifier ?? ''}
                onChange={(changeEvent) => {
                  playInteractionFeedback('option_click')
                  onPersonFilterChanged(changeEvent.target.value === '' ? null : changeEvent.target.value)
                  renewPinEntrance()
                }}
              >
                <option value="">{cluesCopy.everyPerson}</option>
                {livedCaseJournal.knownPersons.map((knownPerson) => (
                  <option key={knownPerson.identifier} value={knownPerson.identifier}>
                    {knownPerson.displayName}
                  </option>
                ))}
              </select>
              <CaretDown size={14} weight="bold" aria-hidden="true" />
            </span>
          </label>
          {hasAnyFilter ? (
            <button
              type="button"
              className="quiet-action-button self-end"
              onClick={() => {
                playInteractionFeedback('panel_close')
                setSupportFilterKind(null)
                setPlaceFilterName(null)
                onPersonFilterChanged(null)
                renewPinEntrance()
              }}
            >
              <X size={16} weight="bold" aria-hidden="true" />
              {cluesCopy.clearFilters}
            </button>
          ) : null}
        </div>
        <p className="mt-3 font-[family-name:var(--font-dossier)] text-xs text-paper-muted" role="status">
          {cluesCopy.shownCount(shownClues.length)}
        </p>
      </fieldset>

      <div className="journal-evidence-toolbar mt-6">
        <div className="journal-view-switch" role="group" aria-label={boardCopy.viewSwitchLabel}>
          <button
            type="button"
            className="journal-view-switch-option"
            aria-pressed={clueViewName === 'board'}
            onClick={() => chooseClueView('board')}
          >
            <SquaresFour size={16} weight="fill" aria-hidden="true" />
            {boardCopy.boardViewName}
          </button>
          <button
            type="button"
            className="journal-view-switch-option"
            aria-pressed={clueViewName === 'list'}
            onClick={() => chooseClueView('list')}
          >
            <ListBullets size={16} weight="bold" aria-hidden="true" />
            {boardCopy.listViewName}
          </button>
        </div>
        <button
          type="button"
          className="quiet-action-button"
          aria-pressed={threadOriginClueIdentifier !== null}
          disabled={openClue === null && threadOriginClueIdentifier === null}
          onClick={() => {
            if (threadOriginClueIdentifier !== null) {
              playInteractionFeedback('panel_close')
              setThreadOriginClueIdentifier(null)
              setBoardStatusText(boardCopy.threadTyingCancelledStatus)
              return
            }
            if (openClue) {
              playInteractionFeedback('option_click')
              setThreadOriginClueIdentifier(openClue.identifier)
              setBoardStatusText(boardCopy.threadTyingStartedStatus(readClueSpokenName(openClue.identifier)))
            }
          }}
        >
          <Path size={16} weight="bold" aria-hidden="true" />
          {threadOriginClueIdentifier !== null
            ? boardCopy.cancelThreadTying
            : openClue
              ? boardCopy.tieThreadFrom(openClue.chronologicalOrder)
              : boardCopy.tieThreadNeedsOpenClue}
        </button>
        {clueViewName === 'board' && hasArrangedBoard ? (
          <button
            type="button"
            className="quiet-action-button"
            onClick={() => {
              playInteractionFeedback('falling_whoosh')
              renewPinEntrance()
              setBoardStatusText(boardCopy.boardTidiedStatus)
              changeArchiveCasework((previousCasework) => ({ ...previousCasework, evidenceBoardPositionByClueIdentifier: {} }))
            }}
          >
            <ArrowsClockwise size={16} weight="bold" aria-hidden="true" />
            {boardCopy.tidyBoard}
          </button>
        ) : null}
      </div>
      <p className="journal-evidence-hint mt-2">
        {threadOriginClueIdentifier !== null
          ? boardCopy.threadTyingHint
          : clueViewName === 'board'
            ? boardCopy.boardHint
            : boardCopy.listHint}
      </p>
      <p className="visually-hidden-text" role="status" aria-live="polite">
        {boardStatusText}
      </p>

      <div className="journal-clue-layout mt-4">
        {clueViewName === 'board' ? (
          <div className="min-w-0">
            {shownClues.length === 0 ? <p className="journal-empty-line mb-4">{cluesCopy.noClueMatchesFilters}</p> : null}
            <ClueEvidenceBoard
              everyClue={livedCaseJournal.clues}
              shownClues={shownClues}
              evidenceBoardPositionByClueIdentifier={archiveCasework.evidenceBoardPositionByClueIdentifier}
              clueThreadLinks={clueThreadLinks}
              clueIdentifiersWithOwnAnalysis={clueIdentifiersWithOwnAnalysis}
              openClueIdentifier={openClueIdentifier}
              threadOriginClueIdentifier={threadOriginClueIdentifier}
              pinEntranceVariantName={pinEntranceVariantName}
              personalizeJournalText={personalizeJournalText}
              onClueChosen={handleClueChosen}
              onCluePinnedAt={(clueIdentifier, boardPosition) =>
                changeArchiveCasework((previousCasework) => ({
                  ...previousCasework,
                  evidenceBoardPositionByClueIdentifier: {
                    ...previousCasework.evidenceBoardPositionByClueIdentifier,
                    [clueIdentifier]: boardPosition,
                  },
                }))
              }
              onThreadTyingCancelled={() => {
                playInteractionFeedback('panel_close')
                setThreadOriginClueIdentifier(null)
                setBoardStatusText(boardCopy.threadTyingCancelledStatus)
              }}
            />
            {openClue && !isWideJournalLayout ? <div className="mt-4">{renderClueDetail(openClue)}</div> : null}
          </div>
        ) : (
          <ol className="journal-clue-list" aria-label={cluesCopy.listLabel}>
            {shownClues.length === 0 ? (
              <li className="journal-empty-line">{cluesCopy.noClueMatchesFilters}</li>
            ) : null}
            {shownClues.map((perceivedClue, clueIndex) => {
              const isOpen = perceivedClue.identifier === openClueIdentifier
              const hasOwnAnalysis =
                (archiveCasework.ownAnalysisTextByClueIdentifier[perceivedClue.identifier] ?? '').trim().length > 0
              return (
                <li key={perceivedClue.identifier}>
                  <button
                    type="button"
                    className="journal-clue-card"
                    data-pin-entrance-variant={pinEntranceVariantName}
                    data-support-kind={perceivedClue.supportKind}
                    aria-expanded={isOpen}
                    style={
                      {
                        '--paper-tilt': `${calculateStableTiltDegrees(perceivedClue.identifier, 1.1)}deg`,
                        '--entrance-order': Math.min(clueIndex, 10),
                      } as CSSProperties
                    }
                    data-is-thread-origin={perceivedClue.identifier === threadOriginClueIdentifier}
                    onClick={() => handleClueChosen(perceivedClue.identifier)}
                    onPointerEnter={(pointerEvent) => {
                      if (pointerEvent.pointerType === 'mouse') {
                        playInteractionFeedback('option_hover')
                      }
                    }}
                  >
                    <span className="journal-pin-head" aria-hidden="true">
                      <PushPin size={14} weight="fill" />
                    </span>
                    <span className="visually-hidden-text">{isOpen ? cluesCopy.closeClue : cluesCopy.openClue}</span>
                    <span className="journal-clue-card-meta">
                      <span className="journal-clue-card-order">{String(perceivedClue.chronologicalOrder).padStart(2, '0')}</span>
                      <span className="inline-flex items-center gap-1.5">
                        <ClueSupportIcon supportKind={perceivedClue.supportKind} size={15} />
                        {caseJournalCopy.supportKinds[perceivedClue.supportKind]}
                      </span>
                      <span>
                        {perceivedClue.wasPerceivedBeforeArrival
                          ? cluesCopy.beforeArrival
                          : `${formatWorldClock(perceivedClue.worldClockMinutes)} · ${perceivedClue.placeName}`}
                      </span>
                    </span>
                    <span className="journal-clue-card-text">{personalizeJournalText(perceivedClue.perceivedText)}</span>
                    {hasOwnAnalysis ? (
                      <span className="journal-clue-card-analysis-mark">
                        <NotePencil size={14} weight="fill" aria-hidden="true" />
                        {cluesCopy.hasOwnAnalysisMark}
                      </span>
                    ) : null}
                  </button>
                  {isOpen && !isWideJournalLayout ? <div className="mt-3">{renderClueDetail(perceivedClue)}</div> : null}
                </li>
              )
            })}
          </ol>
        )}
        {isWideJournalLayout ? (
          <aside className="journal-clue-detail-rail">
            {openClue ? (
              renderClueDetail(openClue)
            ) : (
              <p className="journal-detail-placeholder">{cluesCopy.detailPlaceholder}</p>
            )}
          </aside>
        ) : null}
      </div>
      <div className="journal-tied-threads mt-8">
        <h3 className="dossier-label inline-flex items-center gap-2">
          <Path size={14} weight="bold" aria-hidden="true" />
          {boardCopy.tiedThreadsHeading}
        </h3>
        <p className="mt-1 max-w-[68ch] text-sm text-paper-muted">{boardCopy.tiedThreadsIntroduction}</p>
        {clueThreadLinks.length === 0 ? <p className="journal-empty-line mt-3">{boardCopy.noTiedThreads}</p> : null}
        <ul className="journal-tied-thread-list mt-3">
          {clueThreadLinks.map((clueThreadLink) => (
            <li
              key={`${clueThreadLink.firstClueIdentifier}__${clueThreadLink.secondClueIdentifier}`}
              className="journal-tied-thread"
            >
              <span className="journal-tied-thread-knot" aria-hidden="true" />
              <span className="journal-tied-thread-names">
                {boardCopy.tiedThreadLabel(
                  readClueSpokenName(clueThreadLink.firstClueIdentifier),
                  readClueSpokenName(clueThreadLink.secondClueIdentifier),
                )}
              </span>
              <button
                type="button"
                className="quiet-action-button"
                aria-label={boardCopy.cutThreadSpoken(
                  readClueSpokenName(clueThreadLink.firstClueIdentifier),
                  readClueSpokenName(clueThreadLink.secondClueIdentifier),
                )}
                onClick={() => cutClueThread(clueThreadLink.firstClueIdentifier, clueThreadLink.secondClueIdentifier)}
              >
                <Scissors size={16} weight="bold" aria-hidden="true" />
                {boardCopy.cutThread}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

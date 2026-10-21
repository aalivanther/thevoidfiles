import { CheckCircle, CircleDashed, LockKey, PenNib } from '@phosphor-icons/react'
import {
  ThematicPersonIcon,
  ThematicScalesIcon,
  ThematicSignpostIcon,
  ThematicWoundIcon,
} from '../../assets/thematic_icons/thematic_icons'
import type { ReactNode } from 'react'
import { chronicleHistoryCopy } from '../../copy/chronicle_history_copy'
import {
  chapterSummaryWordLimit,
  completeWorkArchiveCount,
  completeWorkSample,
  countSummaryWords,
} from '../../demonstration/chronicle_history_data'
import type {
  ChapterHighlight,
  ChapterHighlightKindName,
  ChapterWritingStateName,
  ChronicleChapter,
} from '../../demonstration/chronicle_history_data'
import type { ChronicleBookPage } from './chronicle_book_pages'

export type ChronicleBookPageContentProperties = {
  chronicleBookPage: ChronicleBookPage
  pageNumber: number
  chronicleChapters: readonly ChronicleChapter[]
  investigatorFullName: string
  personalizeChronicleText: (chronicleText: string) => string
  isDecorativeCopy: boolean
  sealRefusalVariantName: string | null
  hasSealBeenRefused: boolean
  onChapterRequested: (chapterIdentifier: string) => void
  onCompleteWorkRequested: () => void
  onBookOpened: () => void
  onSealPressed: () => void
  onEntryHovered: () => void
}

const highlightIconByKindName: Record<ChapterHighlightKindName, ReactNode> = {
  key_decision: <ThematicSignpostIcon size={20} />,
  cost_paid: <ThematicScalesIcon size={20} />,
  person_met: <ThematicPersonIcon size={20} />,
  scar_left: <ThematicWoundIcon size={20} />,
}

const writingStateIconByStateName: Record<ChapterWritingStateName, ReactNode> = {
  written: <CheckCircle size="1.1em" weight="fill" aria-hidden="true" />,
  in_progress: <PenNib size="1.1em" weight="fill" aria-hidden="true" />,
  unwritten: <CircleDashed size="1.1em" weight="bold" aria-hidden="true" />,
}

const blankRuledLineCountByWritingStateName: Record<ChapterWritingStateName, number> = {
  written: 0,
  in_progress: 9,
  unwritten: 14,
}

function ChapterHighlightEntry({
  chapterHighlight,
  personalizeChronicleText,
}: {
  chapterHighlight: ChapterHighlight
  personalizeChronicleText: (chronicleText: string) => string
}) {
  return (
    <li className="history-highlight" data-highlight-kind={chapterHighlight.highlightKindName}>
      <span className="history-highlight-label">
        {highlightIconByKindName[chapterHighlight.highlightKindName]}
        {chronicleHistoryCopy.chapterPage.highlightKindLabels[chapterHighlight.highlightKindName]}
      </span>
      <span className="history-highlight-text">{personalizeChronicleText(chapterHighlight.highlightText)}</span>
    </li>
  )
}

function ChapterPageContent({
  chronicleChapter,
  headingIdentifier,
  personalizeChronicleText,
}: {
  chronicleChapter: ChronicleChapter
  headingIdentifier: string | undefined
  personalizeChronicleText: (chronicleText: string) => string
}) {
  const chapterPageCopy = chronicleHistoryCopy.chapterPage
  const isWritten = chronicleChapter.writingStateName === 'written'
  const keyDecisionHighlight = chronicleChapter.highlights.find(
    (chapterHighlight) => chapterHighlight.highlightKindName === 'key_decision',
  )
  const usesPullQuote = chronicleChapter.pageLayoutName === 'decision_as_pull_quote' && keyDecisionHighlight !== undefined
  const listedHighlights = usesPullQuote
    ? chronicleChapter.highlights.filter((chapterHighlight) => chapterHighlight !== keyDecisionHighlight)
    : chronicleChapter.highlights
  const blankRuledLineCount = blankRuledLineCountByWritingStateName[chronicleChapter.writingStateName]

  return (
    <div
      className="history-chapter-layout"
      data-page-layout={isWritten ? chronicleChapter.pageLayoutName : 'highlights_below'}
      data-writing-state={chronicleChapter.writingStateName}
    >
      <header className="history-chapter-header">
        <p className="history-running-head">
          {chapterPageCopy.runningHead(chronicleChapter.chapterSequence, chronicleChapter.placeName)}
        </p>
        <h2 id={headingIdentifier} className="history-chapter-title">
          {chronicleChapter.chapterTitle}
        </h2>
        <p className="history-season-line">{chronicleChapter.seasonLine}</p>
      </header>

      <div className="history-chapter-prose">
        {chronicleChapter.summaryParagraphs.map((summaryParagraph, paragraphIndex) => (
          <p key={summaryParagraph} className="history-prose-paragraph" data-opens-chapter={paragraphIndex === 0}>
            {personalizeChronicleText(summaryParagraph)}
          </p>
        ))}
        {usesPullQuote && isWritten ? (
          <p className="history-pull-quote">
            <span className="history-highlight-label">
              {highlightIconByKindName.key_decision}
              {chapterPageCopy.highlightKindLabels.key_decision}
            </span>
            <span className="history-pull-quote-text">{personalizeChronicleText(keyDecisionHighlight.highlightText)}</span>
          </p>
        ) : null}
        {isWritten ? null : (
          <div className="history-pending-note">
            <p className="history-pending-heading">
              {writingStateIconByStateName[chronicleChapter.writingStateName]}
              {chronicleChapter.writingStateName === 'in_progress'
                ? chapterPageCopy.inProgressHeading
                : chapterPageCopy.unwrittenHeading}
            </p>
            <p className="history-pending-explanation">
              {chronicleChapter.writingStateName === 'in_progress'
                ? chapterPageCopy.inProgressExplanation
                : chapterPageCopy.unwrittenExplanation}
            </p>
            <div className="history-blank-ruled-lines" aria-hidden="true">
              {Array.from({ length: blankRuledLineCount }, (_unusedValue, ruledLineIndex) => (
                <span key={ruledLineIndex} className="history-blank-ruled-line" />
              ))}
            </div>
          </div>
        )}
      </div>

      {isWritten ? (
        <section className="history-highlights" aria-label={chapterPageCopy.highlightsHeading}>
          <p className="history-highlights-heading">{chapterPageCopy.highlightsHeading}</p>
          <ul className="history-highlight-list">
            {listedHighlights.map((chapterHighlight) => (
              <ChapterHighlightEntry
                key={chapterHighlight.highlightKindName}
                chapterHighlight={chapterHighlight}
                personalizeChronicleText={personalizeChronicleText}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

export function ChronicleBookPageContent({
  chronicleBookPage,
  pageNumber,
  chronicleChapters,
  investigatorFullName,
  personalizeChronicleText,
  isDecorativeCopy,
  sealRefusalVariantName,
  hasSealBeenRefused,
  onChapterRequested,
  onCompleteWorkRequested,
  onBookOpened,
  onSealPressed,
  onEntryHovered,
}: ChronicleBookPageContentProperties) {
  const headingIdentifier = isDecorativeCopy ? undefined : 'history-page-heading'
  const writtenChapterCount = chronicleChapters.filter(
    (chronicleChapter) => chronicleChapter.writingStateName === 'written',
  ).length

  if (chronicleBookPage.pageKind === 'cover') {
    const coverCopy = chronicleHistoryCopy.cover
    return (
      <div className="history-page-sheet" data-page-kind="cover">
        <div className="history-cover-frame">
          <p className="history-running-head">{coverCopy.volumeLabel}</p>
          <h2 id={headingIdentifier} className="history-cover-title">
            {coverCopy.bookTitle}
          </h2>
          <p className="history-cover-owner">{coverCopy.chronicleOwnerLine(investigatorFullName)}</p>
          <span className="history-cover-ornament" aria-hidden="true" />
          <p className="history-cover-epigraph">{coverCopy.epigraph}</p>
          <p className="history-cover-writer">{coverCopy.writerLine}</p>
          <p className="history-cover-progress">
            {chronicleHistoryCopy.progressMark.progressSummary(writtenChapterCount, completeWorkArchiveCount)}
          </p>
          <button type="button" className="history-paper-button" onClick={onBookOpened}>
            {coverCopy.openBookButton}
          </button>
        </div>
      </div>
    )
  }

  if (chronicleBookPage.pageKind === 'index') {
    const indexCopy = chronicleHistoryCopy.index
    return (
      <div className="history-page-sheet" data-page-kind="index">
        <header className="history-chapter-header">
          <p className="history-running-head">{chronicleHistoryCopy.cover.chronicleOwnerLine(investigatorFullName)}</p>
          <h2 id={headingIdentifier} className="history-chapter-title">
            {indexCopy.pageTitle}
          </h2>
        </header>
        <ol className="history-index-list">
          {chronicleChapters.map((chronicleChapter) => (
            <li key={chronicleChapter.chapterIdentifier}>
              <button
                type="button"
                className="history-index-entry"
                data-writing-state={chronicleChapter.writingStateName}
                onClick={() => onChapterRequested(chronicleChapter.chapterIdentifier)}
                onPointerEnter={(pointerEvent) => {
                  if (pointerEvent.pointerType === 'mouse') {
                    onEntryHovered()
                  }
                }}
              >
                <span className="history-index-entry-numeral">{indexCopy.chapterEntryLabel(chronicleChapter.chapterSequence)}</span>
                <span className="history-index-entry-title">{chronicleChapter.chapterTitle}</span>
                <span className="history-index-entry-state">
                  {writingStateIconByStateName[chronicleChapter.writingStateName]}
                  {indexCopy.writingStateLabels[chronicleChapter.writingStateName]}
                </span>
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              className="history-index-entry"
              data-writing-state="sealed"
              onClick={onCompleteWorkRequested}
              onPointerEnter={(pointerEvent) => {
                if (pointerEvent.pointerType === 'mouse') {
                  onEntryHovered()
                }
              }}
            >
              <span className="history-index-entry-numeral">{indexCopy.completeWorkEntryNumeral}</span>
              <span className="history-index-entry-title">{indexCopy.completeWorkEntryTitle}</span>
              <span className="history-index-entry-state">
                <LockKey size="1.1em" weight="fill" aria-hidden="true" />
                {indexCopy.completeWorkEntryState}
              </span>
            </button>
          </li>
        </ol>
        <p className="history-index-pending-line">
          {indexCopy.pendingChaptersLine(Math.max(0, completeWorkArchiveCount - writtenChapterCount))}
        </p>
        <p className="history-page-footer">
          <span>{pageNumber}</span>
        </p>
      </div>
    )
  }

  if (chronicleBookPage.pageKind === 'complete_work') {
    const completeWorkCopy = chronicleHistoryCopy.completeWork
    return (
      <div className="history-page-sheet" data-page-kind="complete_work">
        <header className="history-chapter-header">
          <p className="history-running-head">{completeWorkCopy.pageLabel}</p>
          <h2 id={headingIdentifier} className="history-chapter-title">
            {completeWorkCopy.pageTitle}
          </h2>
        </header>
        <p className="history-complete-work-explanation">{completeWorkCopy.lockedExplanation}</p>
        <div className="history-complete-work-sample">
          <p className="history-highlights-heading">{completeWorkCopy.sampleLabel}</p>
          <div className="history-complete-work-sample-body">
            <div className="history-complete-work-sample-prose">
              <p className="history-complete-work-sample-title">{completeWorkSample.sampleTitle}</p>
              {completeWorkSample.sampleParagraphs.map((sampleParagraph) => (
                <p key={sampleParagraph} className="history-prose-paragraph">
                  {personalizeChronicleText(sampleParagraph)}
                </p>
              ))}
            </div>
            <aside className="history-complete-work-margin" aria-label={completeWorkCopy.sampleMarginHeading}>
              <p className="history-highlight-label">{completeWorkCopy.sampleMarginHeading}</p>
              <ul className="history-complete-work-margin-list">
                {completeWorkSample.sampleHighlightNotes.map((sampleHighlightNote) => (
                  <li key={sampleHighlightNote.chapterReference}>
                    <span className="history-complete-work-margin-reference">{sampleHighlightNote.chapterReference}</span>
                    <span>{personalizeChronicleText(sampleHighlightNote.noteText)}</span>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
          <span className="history-complete-work-fade" aria-hidden="true" />
        </div>
        <div className="history-seal-row">
          <button
            type="button"
            className="history-seal-button"
            data-seal-refusal-variant={sealRefusalVariantName ?? undefined}
            onClick={onSealPressed}
          >
            <LockKey size="1.4em" weight="fill" aria-hidden="true" />
            <span>
              <span className="history-seal-state">{completeWorkCopy.lockedStateLabel}</span>
              <span className="history-seal-action">{completeWorkCopy.sealButton}</span>
            </span>
          </button>
          <p className="history-seal-refusal" role={isDecorativeCopy ? undefined : 'status'}>
            {hasSealBeenRefused ? completeWorkCopy.sealRefusalNotice : ''}
          </p>
        </div>
      </div>
    )
  }

  const chronicleChapter = chronicleBookPage.chronicleChapter
  return (
    <div className="history-page-sheet" data-page-kind="chapter">
      <ChapterPageContent
        chronicleChapter={chronicleChapter}
        headingIdentifier={headingIdentifier}
        personalizeChronicleText={personalizeChronicleText}
      />
      <p className="history-page-footer">
        <span className="history-one-page-seal">{chronicleHistoryCopy.chapterPage.onePageSeal}</span>
        {chronicleChapter.writingStateName === 'written' ? (
          <span>
            {chronicleHistoryCopy.chapterPage.wordCountLine(
              countSummaryWords(chronicleChapter.summaryParagraphs),
              chapterSummaryWordLimit,
            )}
          </span>
        ) : null}
        <span>{pageNumber}</span>
      </p>
    </div>
  )
}

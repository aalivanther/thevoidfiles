import {
  CaretDown,
  CircleDashed,
  LinkSimple,
  PencilSimple,
  Prohibit,
  PushPin,
  Scissors,
  ShieldCheck,
} from '@phosphor-icons/react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { chooseAnimationVariantName } from '../../animation/animation_variety'
import { useInteractionFeedback } from '../../audio/interaction_feedback'
import { caseJournalCopy } from '../../copy/case_journal_copy'
import type { PerceivedClue } from '../../demonstration/case_journal_data'
import { formatWorldClock } from '../../game_state/chronicle_state'
import { maximumHypothesisCount, playerTextLengthLimits } from './case_journal_record'
import type { PlayerHypothesis, PlayerHypothesisStanding } from './case_journal_record'
import type { CaseJournalSectionProperties } from './case_journal_section_properties'
import { ClueSupportIcon } from './clue_support_presentation'
import { createHandDrawnThreadPaths } from './hand_drawn_thread'
import { calculateStableTiltDegrees, useIsWideJournalLayout } from './journal_paper_layout'
import { JournalWritingField } from './JournalWritingField'

const pinEntranceVariantNames = ['pin_swing_settle', 'pin_press_in', 'pin_flutter'] as const
const threadTensionVariantNames = ['thread_drawn_from_pin', 'thread_snapped_taut', 'thread_swinging_loose'] as const
const pageTearVariantNames = ['tear_upward', 'tear_sideways', 'tear_crumpled'] as const
const hypothesisStandingNames: readonly PlayerHypothesisStanding[] = ['open', 'reinforced', 'refuted']
const pageTearMilliseconds = 460
const pinPositionSettleMilliseconds = [350, 900]

type PinPosition = { horizontal: number; vertical: number }

function HypothesisStandingIcon({ standing }: { standing: PlayerHypothesisStanding }) {
  if (standing === 'reinforced') {
    return <ShieldCheck size={16} weight="fill" aria-hidden="true" />
  }
  if (standing === 'refuted') {
    return <Prohibit size={16} weight="bold" aria-hidden="true" />
  }
  return <CircleDashed size={16} weight="bold" aria-hidden="true" />
}

type BoardThreadProperties = {
  threadKey: string
  startPosition: PinPosition
  endPosition: PinPosition
  standing: PlayerHypothesisStanding
}

function BoardThread({ threadKey, startPosition, endPosition, standing }: BoardThreadProperties) {
  const [threadTensionVariantName] = useState(() =>
    chooseAnimationVariantName('journal_thread_tension', threadTensionVariantNames),
  )
  const threadPaths = useMemo(
    () => createHandDrawnThreadPaths(startPosition, endPosition, standing === 'refuted', threadKey),
    [startPosition, endPosition, standing, threadKey],
  )
  return (
    <g data-standing={standing}>
      {threadPaths.map((threadPath, threadPathIndex) => (
        <path key={`shadow-${threadPathIndex}`} className="journal-board-thread-shadow" d={threadPath} />
      ))}
      {threadPaths.map((threadPath, threadPathIndex) => (
        <path
          key={`thread-${threadPathIndex}`}
          className="journal-board-thread"
          data-thread-tension-variant={threadTensionVariantName}
          d={threadPath}
          pathLength={1}
        />
      ))}
    </g>
  )
}

type HypothesisCardProperties = {
  playerHypothesis: PlayerHypothesis
  ordinalNumber: number
  perceivedClues: PerceivedClue[]
  isAlwaysExpanded: boolean
  isBeingTorn: boolean
  pageTearVariantName: string
  pinEntranceVariantName: string
  currentWorldClockMinutes: number
  personalizeJournalText: (journalText: string) => string
  registerPinElement: (pinElement: HTMLSpanElement | null) => void
  onHypothesisChanged: (createChangedHypothesis: (previousHypothesis: PlayerHypothesis) => PlayerHypothesis) => void
  onTearRequested: () => void
}

function HypothesisCard({
  playerHypothesis,
  ordinalNumber,
  perceivedClues,
  isAlwaysExpanded,
  isBeingTorn,
  pageTearVariantName,
  pinEntranceVariantName,
  currentWorldClockMinutes,
  personalizeJournalText,
  registerPinElement,
  onHypothesisChanged,
  onTearRequested,
}: HypothesisCardProperties) {
  const hypothesesCopy = caseJournalCopy.hypotheses
  const playInteractionFeedback = useInteractionFeedback()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isChoosingLinkedClues, setIsChoosingLinkedClues] = useState(false)
  const [isEditingStatement, setIsEditingStatement] = useState(false)
  const [statementDraftText, setStatementDraftText] = useState(playerHypothesis.statementText)
  const [isConfirmingTear, setIsConfirmingTear] = useState(false)
  const isContentVisible = isAlwaysExpanded || isExpanded
  const linkedClues = perceivedClues.filter((perceivedClue) =>
    playerHypothesis.linkedClueIdentifiers.includes(perceivedClue.identifier),
  )
  const canBeTorn = playerHypothesis.standing === 'open' && linkedClues.length === 0
  const canStatementBeEdited = playerHypothesis.standing === 'open'
  const cardHeadingIdentifier = `hypothesis-heading-${playerHypothesis.identifier}`
  const cardContentIdentifier = `hypothesis-content-${playerHypothesis.identifier}`

  const headingContent: ReactNode = (
    <>
      <span className="journal-hypothesis-ordinal">{hypothesesCopy.hypothesisCardLabel(ordinalNumber)}</span>
      <span className="journal-standing-stamp" data-standing={playerHypothesis.standing}>
        <HypothesisStandingIcon standing={playerHypothesis.standing} />
        {hypothesesCopy.standingNames[playerHypothesis.standing]}
      </span>
    </>
  )

  return (
    <li
      className="journal-hypothesis-card"
      data-standing={playerHypothesis.standing}
      data-being-torn={isBeingTorn}
      data-page-tear-variant={pageTearVariantName}
      data-pin-entrance-variant={pinEntranceVariantName}
      style={{ '--paper-tilt': `${calculateStableTiltDegrees(playerHypothesis.identifier, 1.6)}deg` } as CSSProperties}
    >
      <span ref={registerPinElement} className="journal-pin-head" data-pin-tone="hypothesis" aria-hidden="true">
        <PushPin size={14} weight="fill" />
      </span>
      {isAlwaysExpanded ? (
        <h3 id={cardHeadingIdentifier} className="journal-hypothesis-heading">
          {headingContent}
        </h3>
      ) : (
        <h3 id={cardHeadingIdentifier}>
          <button
            type="button"
            className="journal-hypothesis-heading journal-hypothesis-heading-toggle"
            aria-expanded={isExpanded}
            aria-controls={cardContentIdentifier}
            onClick={() => {
              playInteractionFeedback(isExpanded ? 'panel_close' : 'panel_open')
              setIsExpanded(!isExpanded)
            }}
          >
            {headingContent}
            <span className="visually-hidden-text">
              {isExpanded ? hypothesesCopy.collapseHypothesis : hypothesesCopy.expandHypothesis}
            </span>
            <CaretDown
              size={16}
              weight="bold"
              aria-hidden="true"
              className="journal-hypothesis-caret"
              data-expanded={isExpanded}
            />
          </button>
        </h3>
      )}

      {isEditingStatement && canStatementBeEdited ? (
        <div className="mt-3">
          <JournalWritingField
            fieldLabel={hypothesesCopy.statementLabel}
            placeholderText={hypothesesCopy.newHypothesisPlaceholder}
            writtenText={statementDraftText}
            maximumLength={playerTextLengthLimits.hypothesisStatement}
            rowCount={3}
            paperTone="paper"
            onWrittenTextChanged={(writtenText) => {
              setStatementDraftText(writtenText)
              if (writtenText.trim().length > 0) {
                onHypothesisChanged((previousHypothesis) => ({ ...previousHypothesis, statementText: writtenText.trim() }))
              }
            }}
          />
        </div>
      ) : (
        <p className="journal-hypothesis-statement">{playerHypothesis.statementText}</p>
      )}

      <p className="journal-hypothesis-relations">
        <strong>{hypothesesCopy.linkedCluesLabel}:</strong>{' '}
        {linkedClues.length === 0 ? hypothesesCopy.noLinkedClues : null}
      </p>
      {linkedClues.length > 0 ? (
        <ul className="journal-hypothesis-relation-list">
          {linkedClues.map((linkedClue) => (
            <li key={linkedClue.identifier} className="journal-relation-tag">
              <ClueSupportIcon supportKind={linkedClue.supportKind} size={14} />
              <span>
                {hypothesesCopy.clueShortLabel(
                  linkedClue.chronologicalOrder,
                  caseJournalCopy.supportKinds[linkedClue.supportKind],
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {isContentVisible ? (
        <div id={cardContentIdentifier} className="journal-hypothesis-content">
          <p className="journal-hypothesis-moment">
            {hypothesesCopy.writtenAt(formatWorldClock(playerHypothesis.writtenAtWorldClockMinutes))}
            {playerHypothesis.standingChangedAtWorldClockMinutes !== null
              ? ` · ${hypothesesCopy.standingOwnership[playerHypothesis.standing]} · ${hypothesesCopy.standingChangedAt(
                  formatWorldClock(playerHypothesis.standingChangedAtWorldClockMinutes),
                )}`
              : ''}
          </p>

          <div className="journal-hypothesis-actions">
            <button
              type="button"
              className="journal-paper-button"
              aria-expanded={isChoosingLinkedClues}
              onClick={() => {
                playInteractionFeedback(isChoosingLinkedClues ? 'panel_close' : 'panel_open')
                setIsChoosingLinkedClues(!isChoosingLinkedClues)
              }}
            >
              <LinkSimple size={16} weight="bold" aria-hidden="true" />
              {isChoosingLinkedClues ? hypothesesCopy.finishChoosingLinkedClues : hypothesesCopy.chooseLinkedClues}
            </button>
            {canStatementBeEdited ? (
              <button
                type="button"
                className="journal-paper-button"
                aria-pressed={isEditingStatement}
                onClick={() => {
                  playInteractionFeedback('option_click')
                  setStatementDraftText(playerHypothesis.statementText)
                  setIsEditingStatement(!isEditingStatement)
                }}
              >
                <PencilSimple size={16} weight="bold" aria-hidden="true" />
                {isEditingStatement ? hypothesesCopy.finishEditingStatement : hypothesesCopy.editStatement}
              </button>
            ) : null}
          </div>

          {isChoosingLinkedClues ? (
            <fieldset className="journal-linked-clue-chooser">
              <legend className="journal-paper-label">{hypothesesCopy.linkedCluesChooserLegend}</legend>
              {perceivedClues.length === 0 ? <p className="journal-paper-prose">{hypothesesCopy.noCluesToLink}</p> : null}
              {perceivedClues.map((perceivedClue) => {
                const isLinked = playerHypothesis.linkedClueIdentifiers.includes(perceivedClue.identifier)
                return (
                  <label key={perceivedClue.identifier} className="journal-linked-clue-option">
                    <input
                      type="checkbox"
                      checked={isLinked}
                      onChange={() => {
                        playInteractionFeedback(isLinked ? 'option_click' : 'confirmation')
                        onHypothesisChanged((previousHypothesis) => ({
                          ...previousHypothesis,
                          linkedClueIdentifiers: isLinked
                            ? previousHypothesis.linkedClueIdentifiers.filter(
                                (linkedClueIdentifier) => linkedClueIdentifier !== perceivedClue.identifier,
                              )
                            : [...previousHypothesis.linkedClueIdentifiers, perceivedClue.identifier],
                        }))
                      }}
                    />
                    <span>
                      <strong>
                        {hypothesesCopy.clueShortLabel(
                          perceivedClue.chronologicalOrder,
                          caseJournalCopy.supportKinds[perceivedClue.supportKind],
                        )}
                      </strong>{' '}
                      {personalizeJournalText(perceivedClue.perceivedText)}
                    </span>
                  </label>
                )
              })}
            </fieldset>
          ) : null}

          <div className="journal-standing-chooser" role="radiogroup" aria-label={hypothesesCopy.standingLabel}>
            {hypothesisStandingNames.map((standingName) => (
              <button
                key={standingName}
                type="button"
                role="radio"
                aria-checked={playerHypothesis.standing === standingName}
                className="journal-standing-option"
                data-standing={standingName}
                onClick={() => {
                  if (playerHypothesis.standing === standingName) {
                    return
                  }
                  playInteractionFeedback('stamp_impact')
                  setIsEditingStatement(false)
                  onHypothesisChanged((previousHypothesis) => ({
                    ...previousHypothesis,
                    standing: standingName,
                    standingChangedAtWorldClockMinutes: currentWorldClockMinutes,
                  }))
                }}
              >
                <HypothesisStandingIcon standing={standingName} />
                {hypothesesCopy.standingNames[standingName]}
              </button>
            ))}
          </div>

          {playerHypothesis.standing !== 'open' ? (
            <div className="mt-3">
              <JournalWritingField
                fieldLabel={hypothesesCopy.standingReasonLabel}
                fieldHint={playerHypothesis.standing === 'refuted' ? hypothesesCopy.refutedKeepsRecord : undefined}
                placeholderText={hypothesesCopy.standingReasonPlaceholder}
                writtenText={playerHypothesis.standingReasonText}
                maximumLength={playerTextLengthLimits.standingReason}
                rowCount={2}
                paperTone="paper"
                onWrittenTextChanged={(writtenText) =>
                  onHypothesisChanged((previousHypothesis) => ({ ...previousHypothesis, standingReasonText: writtenText }))
                }
              />
            </div>
          ) : null}

          {canBeTorn ? (
            <div className="journal-tear-controls">
              {isConfirmingTear ? (
                <>
                  <button
                    type="button"
                    className="journal-paper-button"
                    data-button-tone="destructive"
                    onClick={() => {
                      setIsConfirmingTear(false)
                      onTearRequested()
                    }}
                  >
                    <Scissors size={16} weight="bold" aria-hidden="true" />
                    {hypothesesCopy.confirmTearDraft}
                  </button>
                  <button
                    type="button"
                    className="journal-paper-button"
                    onClick={() => {
                      playInteractionFeedback('panel_close')
                      setIsConfirmingTear(false)
                    }}
                  >
                    {hypothesesCopy.cancelTearDraft}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="journal-paper-button"
                  onClick={() => {
                    playInteractionFeedback('option_click')
                    setIsConfirmingTear(true)
                  }}
                >
                  <Scissors size={16} weight="bold" aria-hidden="true" />
                  {hypothesesCopy.tearDraft}
                </button>
              )}
              <p className="journal-tear-explanation">{hypothesesCopy.tearDraftExplanation}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}

export function HypothesisBoardSection({
  livedCaseJournal,
  archiveCasework,
  changeArchiveCasework,
  currentWorldClockMinutes,
  personalizeJournalText,
}: CaseJournalSectionProperties) {
  const hypothesesCopy = caseJournalCopy.hypotheses
  const playInteractionFeedback = useInteractionFeedback()
  const isWideJournalLayout = useIsWideJournalLayout()
  const [draftStatementText, setDraftStatementText] = useState('')
  const [formRejectionText, setFormRejectionText] = useState<string | null>(null)
  const [rejectionShakeCount, setRejectionShakeCount] = useState(0)
  const [tornHypothesisIdentifier, setTornHypothesisIdentifier] = useState<string | null>(null)
  const [pageTearVariantName, setPageTearVariantName] = useState<string>(pageTearVariantNames[0])
  const [pinEntranceVariantName, setPinEntranceVariantName] = useState(() =>
    chooseAnimationVariantName('journal_hypothesis_pin', pinEntranceVariantNames),
  )
  const [pinPositionByKey, setPinPositionByKey] = useState<Record<string, PinPosition>>({})
  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 })
  const boardElement = useRef<HTMLDivElement>(null)
  const pinElementByKey = useRef(new Map<string, HTMLSpanElement>())
  const lastMeasurementSignature = useRef('')
  const pageTearTimeoutIdentifier = useRef<number | null>(null)

  const measurePinPositions = useCallback(() => {
    const currentBoardElement = boardElement.current
    if (!currentBoardElement) {
      return
    }
    const boardRectangle = currentBoardElement.getBoundingClientRect()
    const measuredPositionByKey: Record<string, PinPosition> = {}
    pinElementByKey.current.forEach((pinElement, pinKey) => {
      const pinRectangle = pinElement.getBoundingClientRect()
      measuredPositionByKey[pinKey] = {
        horizontal: Math.round(pinRectangle.left + pinRectangle.width / 2 - boardRectangle.left - currentBoardElement.clientLeft),
        vertical: Math.round(pinRectangle.top + pinRectangle.height / 2 - boardRectangle.top - currentBoardElement.clientTop),
      }
    })
    const measuredBoardSize = { width: currentBoardElement.clientWidth, height: currentBoardElement.clientHeight }
    const measurementSignature = JSON.stringify([measuredPositionByKey, measuredBoardSize])
    if (measurementSignature !== lastMeasurementSignature.current) {
      lastMeasurementSignature.current = measurementSignature
      setPinPositionByKey(measuredPositionByKey)
      setBoardSize(measuredBoardSize)
    }
  }, [])

  useLayoutEffect(() => {
    if (isWideJournalLayout) {
      measurePinPositions()
    }
  })

  useEffect(() => {
    if (!isWideJournalLayout || !boardElement.current) {
      return
    }
    const boardResizeObserver = new ResizeObserver(measurePinPositions)
    boardResizeObserver.observe(boardElement.current)
    window.addEventListener('resize', measurePinPositions)
    const settleTimeoutIdentifiers = pinPositionSettleMilliseconds.map((settleMilliseconds) =>
      window.setTimeout(measurePinPositions, settleMilliseconds),
    )
    return () => {
      boardResizeObserver.disconnect()
      window.removeEventListener('resize', measurePinPositions)
      settleTimeoutIdentifiers.forEach((settleTimeoutIdentifier) => window.clearTimeout(settleTimeoutIdentifier))
    }
  }, [isWideJournalLayout, measurePinPositions, archiveCasework.hypotheses.length])

  useEffect(
    () => () => {
      if (pageTearTimeoutIdentifier.current !== null) {
        window.clearTimeout(pageTearTimeoutIdentifier.current)
      }
    },
    [],
  )

  const registerPinElement = (pinKey: string) => (pinElement: HTMLSpanElement | null) => {
    if (pinElement) {
      pinElementByKey.current.set(pinKey, pinElement)
    } else {
      pinElementByKey.current.delete(pinKey)
    }
  }

  const rejectForm = (rejectionText: string) => {
    playInteractionFeedback('rejection')
    setFormRejectionText(rejectionText)
    setRejectionShakeCount((previousCount) => previousCount + 1)
  }

  const pinNewHypothesis = () => {
    const statementText = draftStatementText.trim()
    if (statementText.length === 0) {
      rejectForm(hypothesesCopy.emptyHypothesisRejected)
      return
    }
    if (archiveCasework.hypotheses.length >= maximumHypothesisCount) {
      rejectForm(hypothesesCopy.boardIsFull(maximumHypothesisCount))
      return
    }
    playInteractionFeedback('stamp_impact')
    setPinEntranceVariantName(chooseAnimationVariantName('journal_hypothesis_pin', pinEntranceVariantNames))
    setFormRejectionText(null)
    setDraftStatementText('')
    changeArchiveCasework((previousCasework) => {
      let createdItemCount = previousCasework.createdItemCount + 1
      while (
        previousCasework.hypotheses.some(
          (existingHypothesis) => existingHypothesis.identifier === `hypothesis_${createdItemCount}`,
        )
      ) {
        createdItemCount += 1
      }
      return {
        ...previousCasework,
        createdItemCount,
        hypotheses: [
          ...previousCasework.hypotheses,
          {
            identifier: `hypothesis_${createdItemCount}`,
            statementText,
            standing: 'open',
            standingReasonText: '',
            linkedClueIdentifiers: [],
            writtenAtWorldClockMinutes: currentWorldClockMinutes,
            standingChangedAtWorldClockMinutes: null,
          },
        ],
      }
    })
  }

  const changeHypothesis =
    (hypothesisIdentifier: string): HypothesisCardProperties['onHypothesisChanged'] =>
    (createChangedHypothesis) => {
      changeArchiveCasework((previousCasework) => ({
        ...previousCasework,
        hypotheses: previousCasework.hypotheses.map((existingHypothesis) =>
          existingHypothesis.identifier === hypothesisIdentifier
            ? createChangedHypothesis(existingHypothesis)
            : existingHypothesis,
        ),
      }))
    }

  const tearHypothesis = (hypothesisIdentifier: string) => {
    if (tornHypothesisIdentifier !== null) {
      return
    }
    playInteractionFeedback('screen_tear')
    setPageTearVariantName(chooseAnimationVariantName('journal_page_tear', pageTearVariantNames))
    setTornHypothesisIdentifier(hypothesisIdentifier)
    pageTearTimeoutIdentifier.current = window.setTimeout(() => {
      pageTearTimeoutIdentifier.current = null
      setTornHypothesisIdentifier(null)
      changeArchiveCasework((previousCasework) => ({
        ...previousCasework,
        hypotheses: previousCasework.hypotheses.filter(
          (existingHypothesis) =>
            existingHypothesis.identifier !== hypothesisIdentifier ||
            existingHypothesis.standing !== 'open' ||
            existingHypothesis.linkedClueIdentifiers.length > 0,
        ),
      }))
    }, pageTearMilliseconds)
  }

  const perceivedClues = livedCaseJournal.clues
  const boardThreads = archiveCasework.hypotheses.flatMap((playerHypothesis) =>
    playerHypothesis.linkedClueIdentifiers
      .filter((linkedClueIdentifier) => perceivedClues.some((perceivedClue) => perceivedClue.identifier === linkedClueIdentifier))
      .map((linkedClueIdentifier) => ({
        threadKey: `${playerHypothesis.identifier}__${linkedClueIdentifier}`,
        hypothesisPinKey: `hypothesis__${playerHypothesis.identifier}`,
        cluePinKey: `clue__${linkedClueIdentifier}`,
        standing: playerHypothesis.standing,
      })),
  )

  const renderBoardClueColumn = (columnClues: PerceivedClue[], columnSide: 'left' | 'right') => (
    <ul className="journal-board-clue-column" data-column-side={columnSide}>
      {columnClues.map((perceivedClue) => (
        <li
          key={perceivedClue.identifier}
          className="journal-board-clue-note"
          data-pin-entrance-variant={pinEntranceVariantName}
          style={{ '--paper-tilt': `${calculateStableTiltDegrees(perceivedClue.identifier, 2.2)}deg` } as CSSProperties}
        >
          <span
            ref={registerPinElement(`clue__${perceivedClue.identifier}`)}
            className="journal-pin-head"
            data-pin-tone="clue"
            aria-hidden="true"
          >
            <PushPin size={12} weight="fill" />
          </span>
          <span className="journal-board-clue-note-label">
            <ClueSupportIcon supportKind={perceivedClue.supportKind} size={13} />
            {hypothesesCopy.clueShortLabel(
              perceivedClue.chronologicalOrder,
              caseJournalCopy.supportKinds[perceivedClue.supportKind],
            )}
          </span>
          <span className="journal-board-clue-note-text">{personalizeJournalText(perceivedClue.perceivedText)}</span>
        </li>
      ))}
    </ul>
  )

  const hypothesisList = (
    <ol className="journal-hypothesis-list" aria-label={hypothesesCopy.sectionHeading}>
      {archiveCasework.hypotheses.map((playerHypothesis, hypothesisIndex) => (
        <HypothesisCard
          key={playerHypothesis.identifier}
          playerHypothesis={playerHypothesis}
          ordinalNumber={hypothesisIndex + 1}
          perceivedClues={perceivedClues}
          isAlwaysExpanded={isWideJournalLayout}
          isBeingTorn={tornHypothesisIdentifier === playerHypothesis.identifier}
          pageTearVariantName={pageTearVariantName}
          pinEntranceVariantName={pinEntranceVariantName}
          currentWorldClockMinutes={currentWorldClockMinutes}
          personalizeJournalText={personalizeJournalText}
          registerPinElement={registerPinElement(`hypothesis__${playerHypothesis.identifier}`)}
          onHypothesisChanged={changeHypothesis(playerHypothesis.identifier)}
          onTearRequested={() => tearHypothesis(playerHypothesis.identifier)}
        />
      ))}
    </ol>
  )

  return (
    <section aria-labelledby="journal-hypotheses-heading">
      <h2 id="journal-hypotheses-heading" className="journal-section-heading">
        {hypothesesCopy.sectionHeading}
      </h2>
      <p className="journal-section-introduction">{hypothesesCopy.sectionIntroduction}</p>

      <form
        className="journal-paper-sheet journal-new-entry-form mt-6"
        data-rejection-shake={formRejectionText ? (rejectionShakeCount % 2 === 0 ? 'even' : 'odd') : 'none'}
        onSubmit={(submitEvent) => {
          submitEvent.preventDefault()
          pinNewHypothesis()
        }}
      >
        <span className="journal-tape-strip" aria-hidden="true" />
        <JournalWritingField
          fieldLabel={hypothesesCopy.newHypothesisLabel}
          fieldHint={hypothesesCopy.newHypothesisHint}
          placeholderText={hypothesesCopy.newHypothesisPlaceholder}
          writtenText={draftStatementText}
          maximumLength={playerTextLengthLimits.hypothesisStatement}
          rowCount={3}
          paperTone="paper"
          onWrittenTextChanged={(writtenText) => {
            setDraftStatementText(writtenText)
            setFormRejectionText(null)
          }}
          onSubmitRequested={pinNewHypothesis}
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="submit" className="primary-action-button">
            <PushPin size={18} weight="fill" aria-hidden="true" />
            {hypothesesCopy.pinHypothesis}
          </button>
          <p className="journal-form-rejection" role="alert">
            {formRejectionText}
          </p>
        </div>
      </form>

      {archiveCasework.hypotheses.length === 0 ? (
        <p className="journal-empty-line mt-6">{hypothesesCopy.emptyBoard}</p>
      ) : null}

      {isWideJournalLayout ? (
        <div ref={boardElement} className="journal-cork-board mt-6" aria-label={hypothesesCopy.boardLabel} role="group">
          {renderBoardClueColumn(
            perceivedClues.filter((_, clueIndex) => clueIndex % 2 === 0),
            'left',
          )}
          {hypothesisList}
          {renderBoardClueColumn(
            perceivedClues.filter((_, clueIndex) => clueIndex % 2 === 1),
            'right',
          )}
          <svg
            className="journal-board-threads"
            width={boardSize.width}
            height={boardSize.height}
            viewBox={`0 0 ${Math.max(1, boardSize.width)} ${Math.max(1, boardSize.height)}`}
            aria-hidden="true"
            focusable="false"
          >
            {boardThreads.map((boardThread) => {
              const hypothesisPinPosition = pinPositionByKey[boardThread.hypothesisPinKey]
              const cluePinPosition = pinPositionByKey[boardThread.cluePinKey]
              if (!hypothesisPinPosition || !cluePinPosition) {
                return null
              }
              return (
                <BoardThread
                  key={boardThread.threadKey}
                  threadKey={boardThread.threadKey}
                  startPosition={hypothesisPinPosition}
                  endPosition={cluePinPosition}
                  standing={boardThread.standing}
                />
              )
            })}
          </svg>
          <p className="visually-hidden-text">{hypothesesCopy.threadCountSpoken(boardThreads.length)}</p>
        </div>
      ) : (
        <div className="mt-6">{hypothesisList}</div>
      )}
    </section>
  )
}

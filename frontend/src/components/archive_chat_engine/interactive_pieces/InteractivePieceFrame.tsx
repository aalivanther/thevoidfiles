import {
  ArrowsInSimple,
  ArrowsOutSimple,
  ChatText,
  CheckCircle,
  FolderOpen,
  Hourglass,
  LinkBreak,
  MagnifyingGlass,
  PuzzlePiece,
  SealQuestion,
  Tray,
  Wrench,
  X,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { Dialog } from 'radix-ui'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { chooseAnimationVariantName } from '../../../animation/animation_variety'
import { useInteractionFeedback } from '../../../audio/interaction_feedback'
import { interactivePiecesCopy } from '../../../copy/archive_chat_engine/interactive_pieces_copy'
import type {
  InteractivePieceLifecycleStatusName,
  InteractivePiecePublicDefinition,
  InteractivePieceRuntimeState,
  InteractivePieceSubmittedValue,
} from '../../../game_state/archive_turn_contract'
import { useChronicleState } from '../../../game_state/chronicle_state'
import { useDirectorQuestionRuling } from '../turn_flow/director_question_ruling_context'
import { AssistanceRequestControls } from './AssistanceRequestControls'
import { AttemptHistoryList } from './AttemptHistoryList'
import { InteractivePieceWidgetHost } from './InteractivePieceWidgetHost'
import { useArchiveTurnFlowOrInertValue, useWasMountedDuringFreshTurn } from './fresh_turn_detection'
import { areSubmittedValuesEqual, readEffectiveWorkingValue } from './interactive_piece_working_values'
import { findNearestVerticallyScrollingAncestor, useIsPhoneViewport } from './phone_viewport_detection'

const pieceEntranceVariantNames = ['unfolds_from_fold', 'slides_across_desk', 'drops_onto_desk'] as const
const rejectedAttemptVariantNames = ['rattles', 'jolts_sideways', 'recoils'] as const
const acceptedAttemptVariantNames = ['stamp_slams', 'stamp_tilts', 'stamp_drops'] as const
const pieceUnfoldVariantNames = ['envelope_flap_lifts', 'document_unfolds', 'folder_cover_opens'] as const
const pieceCollapseVariantNames = ['folder_cover_closes', 'envelope_flap_seals', 'document_folds'] as const
const freshAttemptHighlightMilliseconds = 1800
const presentationChangeSettlingMilliseconds = 180
const attemptResponseSafetyTimeoutMilliseconds = 20000

export type InteractivePieceFrameProperties = {
  publicDefinition: InteractivePiecePublicDefinition
  runtimeState: InteractivePieceRuntimeState
  isReadOnly: boolean
}

type FreshAttemptHighlight = { attemptIdentifier: string; wasAccepted: boolean; variantName: string }
type PieceUnfoldVariantName = (typeof pieceUnfoldVariantNames)[number]
type PieceCollapseVariantName = (typeof pieceCollapseVariantNames)[number]
type FrameScrollAnchor = { edgeName: 'top' | 'bottom'; viewportPosition: number }

function readFrameScrollAnchor(frame: HTMLElement | null): FrameScrollAnchor | null {
  if (!frame) {
    return null
  }
  const scrollingAncestor = findNearestVerticallyScrollingAncestor(frame)
  if (!scrollingAncestor) {
    return null
  }
  const frameBounds = frame.getBoundingClientRect()
  return frameBounds.top >= scrollingAncestor.getBoundingClientRect().top
    ? { edgeName: 'top', viewportPosition: frameBounds.top }
    : { edgeName: 'bottom', viewportPosition: frameBounds.bottom }
}

const lifecycleStatusIcons: Record<InteractivePieceLifecycleStatusName, Icon> = {
  presented: PuzzlePiece,
  in_progress: Wrench,
  resolved: CheckCircle,
  set_aside: Tray,
  broken: LinkBreak,
}

export function InteractivePieceFrame({ publicDefinition, runtimeState, isReadOnly }: InteractivePieceFrameProperties) {
  const playInteractionFeedback = useInteractionFeedback()
  const { changeChronicleState } = useChronicleState()
  const {
    directorTurnPhaseName,
    hasDirectorServiceFailed,
    isReplyDeskAvailable,
    submitInteractivePieceAttempt,
    requestInteractivePieceAssistance,
    setInteractivePieceAside,
    focusReplyDeskReferencingInteractivePiece,
  } = useArchiveTurnFlowOrInertValue()
  const { isEverythingElseBlockedByOpenDirectorQuestion } = useDirectorQuestionRuling()
  const wasMountedDuringFreshTurn = useWasMountedDuringFreshTurn()
  const [entranceVariantName] = useState(() =>
    wasMountedDuringFreshTurn ? chooseAnimationVariantName('interactive_piece_entrance', pieceEntranceVariantNames) : null,
  )
  const isPhoneViewport = useIsPhoneViewport()
  const unfoldedRegionIdentifier = useId()
  const [isFullSheetOpen, setIsFullSheetOpen] = useState(false)
  const [isUnfoldedByPlayer, setIsUnfoldedByPlayer] = useState(false)
  const [isHeldOpenAfterClosure, setIsHeldOpenAfterClosure] = useState(false)
  const [unfoldVariantName, setUnfoldVariantName] = useState<PieceUnfoldVariantName | null>(null)
  const [collapseVariantName, setCollapseVariantName] = useState<PieceCollapseVariantName | null>(null)
  const [isCostConfirmationOpen, setIsCostConfirmationOpen] = useState(false)
  const [attemptCountWhenSubmitted, setAttemptCountWhenSubmitted] = useState<number | null>(null)
  const [freshAttemptHighlight, setFreshAttemptHighlight] = useState<FreshAttemptHighlight | null>(null)
  const knownAttemptCount = useRef(runtimeState.attempts.length)
  const knownLifecycleStatusName = useRef(runtimeState.lifecycleStatusName)
  const freshAttemptTimeoutIdentifier = useRef<number | null>(null)
  const attemptSafetyTimeoutIdentifier = useRef<number | null>(null)
  const frameElement = useRef<HTMLElement | null>(null)
  const fullSheetTitleElement = useRef<HTMLHeadingElement | null>(null)
  const compactCardButtonElement = useRef<HTMLButtonElement | null>(null)
  const collapseButtonElement = useRef<HTMLButtonElement | null>(null)
  const fullSheetButtonElement = useRef<HTMLButtonElement | null>(null)
  const frameAnchorBeforePresentationChange = useRef<FrameScrollAnchor | null>(null)
  const shouldFocusPresentationToggle = useRef(false)
  const shouldSkipFocusReturnAfterSheet = useRef(false)
  const hasDirectorBeenIdleSinceClosure = useRef(false)

  const { interactivePieceIdentifier, publicState, attemptElapsedMinutes } = publicDefinition
  const lifecycleStatusName = runtimeState.lifecycleStatusName
  const isPieceFinished = lifecycleStatusName === 'resolved' || lifecycleStatusName === 'broken'
  const isPieceSetAside = lifecycleStatusName === 'set_aside'
  const isPieceClosed = isReadOnly || isPieceFinished
  const workingValue = readEffectiveWorkingValue(publicState, runtimeState.workingValue)
  const isAttemptPending =
    attemptCountWhenSubmitted !== null &&
    runtimeState.attempts.length <= attemptCountWhenSubmitted &&
    !hasDirectorServiceFailed
  const isAttemptAllowed =
    !isPieceClosed &&
    !isAttemptPending &&
    directorTurnPhaseName === 'idle' &&
    isReplyDeskAvailable &&
    !isEverythingElseBlockedByOpenDirectorQuestion
  const isPieceCollapsible = isPieceClosed || isPieceSetAside
  const isCompactCardShown = isPhoneViewport || (isPieceCollapsible && !isUnfoldedByPlayer && !isHeldOpenAfterClosure)
  const LifecycleStatusIcon = lifecycleStatusIcons[lifecycleStatusName]
  const wasWorkingValueAlreadyRejected = runtimeState.attempts.some(
    (attemptRecord) => !attemptRecord.wasAccepted && areSubmittedValuesEqual(attemptRecord.submittedValue, workingValue),
  )

  useEffect(
    () => () => {
      if (freshAttemptTimeoutIdentifier.current !== null) {
        window.clearTimeout(freshAttemptTimeoutIdentifier.current)
      }
      if (attemptSafetyTimeoutIdentifier.current !== null) {
        window.clearTimeout(attemptSafetyTimeoutIdentifier.current)
      }
    },
    [],
  )

  useEffect(() => {
    const attemptCount = runtimeState.attempts.length
    if (attemptCount <= knownAttemptCount.current) {
      knownAttemptCount.current = attemptCount
      return
    }
    knownAttemptCount.current = attemptCount
    const latestAttempt = runtimeState.attempts[attemptCount - 1]
    playInteractionFeedback(latestAttempt.wasAccepted ? 'stamp_impact' : 'rejection')
    setAttemptCountWhenSubmitted(null)
    setFreshAttemptHighlight({
      attemptIdentifier: latestAttempt.attemptIdentifier,
      wasAccepted: latestAttempt.wasAccepted,
      variantName: latestAttempt.wasAccepted
        ? chooseAnimationVariantName('interactive_piece_attempt_accepted', acceptedAttemptVariantNames)
        : chooseAnimationVariantName('interactive_piece_attempt_rejected', rejectedAttemptVariantNames),
    })
    if (freshAttemptTimeoutIdentifier.current !== null) {
      window.clearTimeout(freshAttemptTimeoutIdentifier.current)
    }
    freshAttemptTimeoutIdentifier.current = window.setTimeout(() => {
      freshAttemptTimeoutIdentifier.current = null
      setFreshAttemptHighlight(null)
    }, freshAttemptHighlightMilliseconds)
  }, [runtimeState.attempts, playInteractionFeedback])

  useEffect(() => {
    if (knownLifecycleStatusName.current === lifecycleStatusName) {
      return
    }
    knownLifecycleStatusName.current = lifecycleStatusName
    if (lifecycleStatusName === 'resolved' || lifecycleStatusName === 'broken') {
      hasDirectorBeenIdleSinceClosure.current = false
      setIsHeldOpenAfterClosure(true)
    }
    if (lifecycleStatusName === 'broken') {
      playInteractionFeedback('heavy_impact', { volumeMultiplier: 0.7 })
    }
    if (lifecycleStatusName === 'resolved') {
      playInteractionFeedback('confirmation')
    }
  }, [lifecycleStatusName, playInteractionFeedback])

  useEffect(() => {
    if (!isHeldOpenAfterClosure) {
      return
    }
    if (directorTurnPhaseName === 'idle') {
      hasDirectorBeenIdleSinceClosure.current = true
      return
    }
    if (!hasDirectorBeenIdleSinceClosure.current) {
      return
    }
    frameAnchorBeforePresentationChange.current = readFrameScrollAnchor(frameElement.current)
    setCollapseVariantName(chooseAnimationVariantName('interactive_piece_collapse', pieceCollapseVariantNames))
    setIsHeldOpenAfterClosure(false)
  }, [directorTurnPhaseName, isHeldOpenAfterClosure])

  useLayoutEffect(() => {
    const anchorBeforeChange = frameAnchorBeforePresentationChange.current
    frameAnchorBeforePresentationChange.current = null
    const frame = frameElement.current
    let settlingSizeObserver: ResizeObserver | null = null
    let settlingTimeoutIdentifier: number | null = null
    if (frame && anchorBeforeChange !== null) {
      const restoreAnchorPosition = () => {
        const scrollingAncestor = findNearestVerticallyScrollingAncestor(frame)
        if (!scrollingAncestor) {
          return
        }
        const frameBounds = frame.getBoundingClientRect()
        const positionAfterChange = anchorBeforeChange.edgeName === 'top' ? frameBounds.top : frameBounds.bottom
        const positionDifference = positionAfterChange - anchorBeforeChange.viewportPosition
        if (Math.abs(positionDifference) >= 1) {
          scrollingAncestor.scrollTop += positionDifference
        }
      }
      restoreAnchorPosition()
      if (typeof ResizeObserver !== 'undefined') {
        settlingSizeObserver = new ResizeObserver(restoreAnchorPosition)
        settlingSizeObserver.observe(frame)
      }
      settlingTimeoutIdentifier = window.setTimeout(() => {
        settlingTimeoutIdentifier = null
        restoreAnchorPosition()
        settlingSizeObserver?.disconnect()
        settlingSizeObserver = null
      }, presentationChangeSettlingMilliseconds)
    }
    if (shouldFocusPresentationToggle.current) {
      shouldFocusPresentationToggle.current = false
      const toggleElement = isCompactCardShown ? compactCardButtonElement.current : collapseButtonElement.current
      toggleElement?.focus({ preventScroll: true })
    }
    return () => {
      settlingSizeObserver?.disconnect()
      if (settlingTimeoutIdentifier !== null) {
        window.clearTimeout(settlingTimeoutIdentifier)
      }
    }
  }, [isCompactCardShown])

  const rememberFrameHeightBeforePresentationChange = () => {
    if (isPhoneViewport) {
      return
    }
    frameAnchorBeforePresentationChange.current = readFrameScrollAnchor(frameElement.current)
  }

  const openFullSheet = () => {
    playInteractionFeedback('panel_open')
    setUnfoldVariantName(chooseAnimationVariantName('interactive_piece_unfold', pieceUnfoldVariantNames))
    setIsFullSheetOpen(true)
  }

  const unfoldInline = () => {
    playInteractionFeedback('panel_open')
    rememberFrameHeightBeforePresentationChange()
    shouldFocusPresentationToggle.current = true
    setUnfoldVariantName(chooseAnimationVariantName('interactive_piece_unfold', pieceUnfoldVariantNames))
    setIsUnfoldedByPlayer(true)
  }

  const collapseInline = () => {
    playInteractionFeedback('panel_close')
    rememberFrameHeightBeforePresentationChange()
    shouldFocusPresentationToggle.current = true
    setCollapseVariantName(chooseAnimationVariantName('interactive_piece_collapse', pieceCollapseVariantNames))
    setIsUnfoldedByPlayer(false)
    setIsHeldOpenAfterClosure(false)
  }

  const changeWorkingValue = (nextWorkingValue: InteractivePieceSubmittedValue) => {
    if (isPieceClosed) {
      return
    }
    setIsCostConfirmationOpen(false)
    changeChronicleState({
      kind: 'interactive_piece_working_value_changed',
      interactivePieceIdentifier,
      workingValue: nextWorkingValue,
    })
  }

  const submitAttempt = () => {
    if (!isAttemptAllowed) {
      return
    }
    playInteractionFeedback('action_sent')
    setIsCostConfirmationOpen(false)
    setAttemptCountWhenSubmitted(runtimeState.attempts.length)
    if (attemptSafetyTimeoutIdentifier.current !== null) {
      window.clearTimeout(attemptSafetyTimeoutIdentifier.current)
    }
    attemptSafetyTimeoutIdentifier.current = window.setTimeout(() => {
      attemptSafetyTimeoutIdentifier.current = null
      setAttemptCountWhenSubmitted(null)
    }, attemptResponseSafetyTimeoutMilliseconds)
    submitInteractivePieceAttempt(interactivePieceIdentifier, workingValue)
  }

  const requestAttempt = () => {
    if (!isAttemptAllowed) {
      return
    }
    if (attemptElapsedMinutes > 0) {
      playInteractionFeedback('option_click')
      setIsCostConfirmationOpen(true)
      return
    }
    submitAttempt()
  }

  const attemptAnnouncement = (
    <p className="interactive-piece-announcement" role="status">
      {freshAttemptHighlight
        ? freshAttemptHighlight.wasAccepted
          ? interactivePiecesCopy.attemptAcceptedAnnouncement
          : interactivePiecesCopy.attemptRejectedAnnouncement
        : ''}
    </p>
  )

  const pieceBody = (
    <div className="interactive-piece-body">
      <div className="interactive-piece-rules">
        <h4 className="dossier-label">{interactivePiecesCopy.pieceRulesHeading}</h4>
        <ul>
          {publicDefinition.visibleRuleTexts.map((visibleRuleText) => (
            <li key={visibleRuleText}>{visibleRuleText}</li>
          ))}
        </ul>
      </div>
      <div
        className="interactive-piece-workbench"
        data-rejected-attempt-variant={
          freshAttemptHighlight && !freshAttemptHighlight.wasAccepted ? freshAttemptHighlight.variantName : undefined
        }
      >
        <InteractivePieceWidgetHost
          publicState={publicState}
          workingValue={workingValue}
          isInteractionDisabled={isPieceClosed || isAttemptPending}
          onWorkingValueChanged={changeWorkingValue}
        />
        {isPieceFinished ? (
          <span
            className="interactive-piece-stamp"
            data-lifecycle-status={lifecycleStatusName}
            data-accepted-attempt-variant={
              freshAttemptHighlight && freshAttemptHighlight.wasAccepted ? freshAttemptHighlight.variantName : undefined
            }
            aria-hidden="true"
          >
            {lifecycleStatusName === 'resolved' ? interactivePiecesCopy.resolvedStampText : interactivePiecesCopy.brokenStampText}
          </span>
        ) : null}
      </div>
      {attemptAnnouncement}
      {lifecycleStatusName === 'resolved' ? (
        <p className="interactive-piece-closing-notice">{interactivePiecesCopy.resolvedNotice}</p>
      ) : null}
      {lifecycleStatusName === 'broken' ? (
        <p className="interactive-piece-closing-notice">
          {runtimeState.brokenReasonPublicText ?? interactivePiecesCopy.brokenNoticeFallback}
        </p>
      ) : null}
      {isReadOnly && !isPieceFinished ? (
        <p className="interactive-piece-closing-notice">{interactivePiecesCopy.readOnlyNotice}</p>
      ) : null}
      {isPieceClosed ? null : (
        <div className="interactive-piece-attempt-area">
          <p className="interactive-piece-instructions">{interactivePiecesCopy.freeManipulationNotice}</p>
          {wasWorkingValueAlreadyRejected ? (
            <p className="interactive-piece-already-tried-notice">{interactivePiecesCopy.attemptAlreadyTriedNotice}</p>
          ) : null}
          {isCostConfirmationOpen ? (
            <div className="interactive-piece-inline-confirmation" role="group">
              <p>{interactivePiecesCopy.attemptCostConfirmationQuestion(attemptElapsedMinutes)}</p>
              <div className="interactive-piece-inline-confirmation-buttons">
                <button type="button" className="primary-action-button" disabled={!isAttemptAllowed} onClick={submitAttempt}>
                  {interactivePiecesCopy.attemptCostConfirmButton}
                </button>
                <button
                  type="button"
                  className="quiet-action-button"
                  onClick={() => {
                    playInteractionFeedback('panel_close')
                    setIsCostConfirmationOpen(false)
                  }}
                >
                  {interactivePiecesCopy.attemptCostCancelButton}
                </button>
              </div>
            </div>
          ) : (
            <div className="interactive-piece-attempt-row">
              <button type="button" className="primary-action-button" disabled={!isAttemptAllowed} onClick={requestAttempt}>
                {interactivePiecesCopy.attemptButton}
              </button>
              <span className="cost-tag">
                <Hourglass size={13} weight="bold" aria-hidden="true" />
                {attemptElapsedMinutes > 0
                  ? interactivePiecesCopy.attemptCostTag(attemptElapsedMinutes)
                  : interactivePiecesCopy.attemptFreeTag}
              </span>
            </div>
          )}
          {isEverythingElseBlockedByOpenDirectorQuestion ? (
            <p className="interactive-piece-director-question-notice">
              <SealQuestion size={16} weight="bold" aria-hidden="true" />
              <span>{interactivePiecesCopy.attemptBlockedByDirectorQuestionNotice}</span>
            </p>
          ) : null}
          {isAttemptPending ? (
            <p className="interactive-piece-pending-notice" role="status">
              {interactivePiecesCopy.attemptPendingNotice}
            </p>
          ) : null}
        </div>
      )}
      <AttemptHistoryList
        publicState={publicState}
        attempts={runtimeState.attempts}
        freshAttemptIdentifier={freshAttemptHighlight?.attemptIdentifier ?? null}
        freshAttemptVariantName={freshAttemptHighlight?.variantName ?? ''}
      />
      <AssistanceRequestControls
        assistanceGiven={runtimeState.assistanceGiven}
        isRequestingAllowed={!isPieceClosed}
        onAssistanceRequested={(levelName) => requestInteractivePieceAssistance(interactivePieceIdentifier, levelName)}
      />
      {isPieceClosed ? null : (
        <div className="interactive-piece-exit-row">
          <button
            type="button"
            className="quiet-action-button"
            title={interactivePiecesCopy.resolveAnotherWayExplanation}
            onClick={() => {
              playInteractionFeedback('option_click')
              shouldSkipFocusReturnAfterSheet.current = isFullSheetOpen
              setIsFullSheetOpen(false)
              focusReplyDeskReferencingInteractivePiece(interactivePieceIdentifier)
            }}
          >
            <ChatText size={16} weight="bold" aria-hidden="true" />
            {interactivePiecesCopy.resolveAnotherWayButton}
          </button>
          <button
            type="button"
            className="quiet-action-button"
            onClick={() => {
              playInteractionFeedback('panel_close')
              rememberFrameHeightBeforePresentationChange()
              shouldFocusPresentationToggle.current = !isFullSheetOpen && !isPhoneViewport
              setCollapseVariantName(chooseAnimationVariantName('interactive_piece_collapse', pieceCollapseVariantNames))
              setIsUnfoldedByPlayer(false)
              setIsFullSheetOpen(false)
              setInteractivePieceAside(interactivePieceIdentifier)
            }}
          >
            <Tray size={16} weight="bold" aria-hidden="true" />
            {interactivePiecesCopy.setAsideButton}
          </button>
        </div>
      )}
    </div>
  )

  const setAsideContent = (
    <div className="interactive-piece-set-aside">
      <p>{interactivePiecesCopy.setAsideNotice}</p>
      <button
        type="button"
        className="quiet-action-button"
        onClick={() => {
          playInteractionFeedback('panel_open')
          setIsUnfoldedByPlayer(false)
          changeWorkingValue(workingValue)
        }}
      >
        {interactivePiecesCopy.resumePieceButton}
      </button>
      <button
        type="button"
        className="quiet-action-button"
        onClick={() => {
          playInteractionFeedback('option_click')
          shouldSkipFocusReturnAfterSheet.current = isFullSheetOpen
          setIsFullSheetOpen(false)
          focusReplyDeskReferencingInteractivePiece(interactivePieceIdentifier)
        }}
      >
        <ChatText size={16} weight="bold" aria-hidden="true" />
        {interactivePiecesCopy.resolveAnotherWayButton}
      </button>
    </div>
  )

  const unfoldedContent = isPieceSetAside && !isReadOnly ? setAsideContent : pieceBody

  return (
    <section
      ref={frameElement}
      className="interactive-piece-frame"
      aria-label={publicDefinition.visibleTitle}
      data-lifecycle-status={lifecycleStatusName}
      data-presentation={isCompactCardShown ? 'compact_card' : 'unfolded'}
      data-entrance-variant={entranceVariantName ?? undefined}
    >
      {isCompactCardShown ? (
        <div
          className="interactive-piece-compact-card"
          data-lifecycle-status={lifecycleStatusName}
          data-collapse-variant={collapseVariantName ?? undefined}
          data-fresh-attempt-outcome={
            freshAttemptHighlight ? (freshAttemptHighlight.wasAccepted ? 'accepted' : 'rejected') : undefined
          }
        >
          <div className="interactive-piece-compact-card-status-row">
            <span className="interactive-piece-compact-card-status" data-lifecycle-status={lifecycleStatusName}>
              <LifecycleStatusIcon size={16} weight="bold" aria-hidden="true" />
              {interactivePiecesCopy.lifecycleStatusLabels[lifecycleStatusName]}
            </span>
            <span className="interactive-piece-compact-card-tally">
              {interactivePiecesCopy.attemptTallyLabel(runtimeState.attempts.length)}
            </span>
          </div>
          <h3 className="display-title interactive-piece-compact-card-title">{publicDefinition.visibleTitle}</h3>
          <p className="interactive-piece-compact-card-purpose">{publicDefinition.diegeticPurposeText}</p>
          {isPhoneViewport ? (
            <button
              ref={compactCardButtonElement}
              type="button"
              className="interactive-piece-compact-card-button"
              aria-haspopup="dialog"
              onClick={openFullSheet}
            >
              <MagnifyingGlass size={18} weight="bold" aria-hidden="true" />
              {interactivePiecesCopy.examinePieceButton}
            </button>
          ) : (
            <button
              ref={compactCardButtonElement}
              type="button"
              className="interactive-piece-compact-card-button"
              aria-expanded={false}
              onClick={unfoldInline}
            >
              <FolderOpen size={18} weight="bold" aria-hidden="true" />
              {interactivePiecesCopy.unfoldPieceButton}
            </button>
          )}
          {isFullSheetOpen ? null : attemptAnnouncement}
        </div>
      ) : (
        <>
          <header className="interactive-piece-header">
            <span className="interactive-piece-header-icon" aria-hidden="true">
              <PuzzlePiece size={22} weight="fill" />
            </span>
            <div className="interactive-piece-header-texts">
              <p className="dossier-label interactive-piece-header-status">
                {interactivePiecesCopy.familyLabels[publicDefinition.familyName]}
                {' · '}
                <LifecycleStatusIcon size={13} weight="bold" aria-hidden="true" />
                {interactivePiecesCopy.lifecycleStatusLabels[lifecycleStatusName]}
              </p>
              <h3 className="display-title interactive-piece-title">{publicDefinition.visibleTitle}</h3>
            </div>
            <div className="interactive-piece-header-controls">
              {isPieceCollapsible ? (
                <button
                  ref={collapseButtonElement}
                  type="button"
                  className="quiet-action-button"
                  aria-expanded={true}
                  aria-controls={unfoldedRegionIdentifier}
                  aria-label={interactivePiecesCopy.collapsePieceButton}
                  title={interactivePiecesCopy.collapsePieceButton}
                  onClick={collapseInline}
                >
                  <ArrowsInSimple size={18} weight="bold" aria-hidden="true" />
                </button>
              ) : null}
              {isPieceSetAside ? null : (
                <button
                  ref={fullSheetButtonElement}
                  type="button"
                  className="quiet-action-button interactive-piece-full-sheet-button"
                  aria-label={interactivePiecesCopy.openFullSheetButton}
                  title={interactivePiecesCopy.openFullSheetButton}
                  aria-haspopup="dialog"
                  onClick={openFullSheet}
                >
                  <ArrowsOutSimple size={18} weight="bold" aria-hidden="true" />
                </button>
              )}
            </div>
          </header>
          <p className="interactive-piece-purpose">{publicDefinition.diegeticPurposeText}</p>
          <div
            id={unfoldedRegionIdentifier}
            className="interactive-piece-unfolded-region"
            data-unfold-variant={isPieceCollapsible && unfoldVariantName ? unfoldVariantName : undefined}
          >
            {isFullSheetOpen ? (
              <p className="interactive-piece-closing-notice">{interactivePiecesCopy.fullSheetInlineNotice}</p>
            ) : (
              unfoldedContent
            )}
          </div>
        </>
      )}
      <Dialog.Root
        open={isFullSheetOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            playInteractionFeedback('panel_close')
          }
          setIsFullSheetOpen(isOpen)
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="interactive-piece-full-sheet-veil" />
          <Dialog.Content
            className="interactive-piece-full-sheet"
            aria-describedby={undefined}
            data-unfold-variant={unfoldVariantName ?? undefined}
            onOpenAutoFocus={(focusEvent) => {
              focusEvent.preventDefault()
              fullSheetTitleElement.current?.focus({ preventScroll: true })
            }}
            onCloseAutoFocus={(focusEvent) => {
              focusEvent.preventDefault()
              if (shouldSkipFocusReturnAfterSheet.current) {
                shouldSkipFocusReturnAfterSheet.current = false
                return
              }
              const returnElement =
                compactCardButtonElement.current ?? fullSheetButtonElement.current ?? collapseButtonElement.current
              returnElement?.focus({ preventScroll: true })
            }}
          >
            <div className="interactive-piece-full-sheet-header">
              <div className="interactive-piece-header-texts">
                <p className="dossier-label interactive-piece-header-status">
                  <LifecycleStatusIcon size={13} weight="bold" aria-hidden="true" />
                  {interactivePiecesCopy.lifecycleStatusLabels[lifecycleStatusName]}
                </p>
                <Dialog.Title ref={fullSheetTitleElement} tabIndex={-1} className="display-title interactive-piece-title">
                  {publicDefinition.visibleTitle}
                </Dialog.Title>
              </div>
              <Dialog.Close asChild>
                <button type="button" className="quiet-action-button interactive-piece-full-sheet-close-button">
                  <X size={18} weight="bold" aria-hidden="true" />
                  {interactivePiecesCopy.closeFullSheetButton}
                </button>
              </Dialog.Close>
            </div>
            <div className="interactive-piece-full-sheet-scroller">
              <p className="interactive-piece-purpose">{publicDefinition.diegeticPurposeText}</p>
              {isFullSheetOpen ? unfoldedContent : null}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  )
}

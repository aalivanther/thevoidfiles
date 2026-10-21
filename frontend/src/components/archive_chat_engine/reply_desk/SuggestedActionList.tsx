import { ArrowsClockwise, CaretDown, CheckSquare, FolderOpen, HourglassMedium, WarningDiamond } from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react'
import { chooseAnimationVariantName } from '../../../animation/animation_variety'
import { useInteractionFeedback } from '../../../audio/interaction_feedback'
import { readingLogCopy } from '../../../copy/archive_chat_engine/reading_log_copy'
import { replyDeskCopy } from '../../../copy/archive_chat_engine/reply_desk_copy'
import type { SuggestedInvestigatorAction } from '../../../game_state/archive_turn_contract'
import { canInvestigatorAffordResourceCost, useChronicleState } from '../../../game_state/chronicle_state'
import type { InvestigatorState } from '../../../game_state/chronicle_state'
import { useDirectorQuestionRuling } from '../turn_flow/director_question_ruling_context'
import { describeResourceCost } from './resource_cost_description'
import { useReplyDraft } from './reply_draft_context'
import {
  arrangeSuggestedActions,
  createSuggestionSetSignature,
  readSuggestedActionsConsumedLastTurn,
  visibleSuggestionCapacityOnNarrowScreens,
  visibleSuggestionCapacityOnWideScreens,
  wideScreenMediaQueryText,
} from './suggested_action_grouping'
import type { ArrangedSuggestedAction } from './suggested_action_grouping'
import { useSuggestionDrawerKey } from './use_suggestion_number_keys'

export type SuggestedActionListProperties = {
  suggestedActions: SuggestedInvestigatorAction[]
  investigator: InvestigatorState
}

type SuggestedActionEntranceVariantName = 'entrance-from-left' | 'entrance-from-below' | 'suggested-action-dealt-onto-desk'
type SuggestedActionDrawerOpeningVariantName = 'folder_opening' | 'dealt_index_cards' | 'sliding_drawer'

const suggestedActionEntranceVariantNames: readonly SuggestedActionEntranceVariantName[] = [
  'entrance-from-left',
  'entrance-from-below',
  'suggested-action-dealt-onto-desk',
]
const suggestedActionDrawerOpeningVariantNames: readonly SuggestedActionDrawerOpeningVariantName[] = [
  'folder_opening',
  'dealt_index_cards',
  'sliding_drawer',
]
const minimumMillisecondsBetweenActivationsOfOneSuggestion = 350
const suggestedActionDrawerPanelIdentifier = 'suggested-action-drawer-panel'

function subscribeToWideScreenChanges(notifyChange: () => void): () => void {
  const wideScreenMediaQueryList = window.matchMedia(wideScreenMediaQueryText)
  wideScreenMediaQueryList.addEventListener('change', notifyChange)
  window.addEventListener('resize', notifyChange)
  return () => {
    wideScreenMediaQueryList.removeEventListener('change', notifyChange)
    window.removeEventListener('resize', notifyChange)
  }
}

function readIsWideScreen(): boolean {
  return window.matchMedia(wideScreenMediaQueryText).matches
}

function readIsWideScreenWithoutWindow(): boolean {
  return false
}

type SuggestedActionCardProperties = {
  arrangedAction: ArrangedSuggestedAction
  stepIndexInPlan: number
  onHovered: (pointerType: string, arrangedAction: ArrangedSuggestedAction) => void
  onActivated: (clickEvent: ReactMouseEvent<HTMLButtonElement>, arrangedAction: ArrangedSuggestedAction) => void
}

function SuggestedActionCard({ arrangedAction, stepIndexInPlan, onHovered, onActivated }: SuggestedActionCardProperties) {
  const { chronicleState } = useChronicleState()
  const { suggestedAction, suggestionNumber, hasNumberKey, isExit, isInPlan, canAfford, hasBeenAttemptedBefore } = arrangedAction
  const actionLabel = isInPlan
    ? replyDeskCopy.removeSuggestionFromPlanLabel(suggestionNumber)
    : replyDeskCopy.addSuggestionToPlanLabel(suggestionNumber)
  const spokenLabel = hasBeenAttemptedBefore
    ? `${actionLabel}: ${suggestedAction.visibleText}, ${replyDeskCopy.attemptedBeforeSpokenNote}`
    : `${actionLabel}: ${suggestedAction.visibleText}`
  return (
    <button
      type="button"
      className="suggested-action-button suggested-action-card"
      data-suggested-action-identifier={suggestedAction.identifier}
      data-presentation={isExit ? 'exit' : 'course'}
      data-is-in-plan={isInPlan ? 'true' : 'false'}
      disabled={!canAfford && !isInPlan}
      aria-pressed={isInPlan}
      aria-label={spokenLabel}
      aria-keyshortcuts={hasNumberKey ? String(suggestionNumber) : undefined}
      onPointerEnter={(pointerEvent) => onHovered(pointerEvent.pointerType, arrangedAction)}
      onClick={(clickEvent) => onActivated(clickEvent, arrangedAction)}
    >
      <span
        className={
          hasNumberKey ? 'suggested-action-number suggested-action-keycap' : 'suggested-action-number suggested-action-plain-number'
        }
        aria-hidden="true"
      >
        {suggestionNumber}
      </span>
      <span className="suggested-action-card-text">{suggestedAction.visibleText}</span>
      <span className="suggested-action-card-marks">
        {suggestedAction.resourceCost ? (
          <span className="cost-tag">
            {canAfford || isInPlan ? (
              describeResourceCost(suggestedAction.resourceCost, chronicleState.archiveRun.belongingDefinitions)
            ) : (
              <>
                <WarningDiamond size={12} weight="fill" aria-hidden="true" />
                {replyDeskCopy.insufficientResource}
              </>
            )}
          </span>
        ) : null}
        {hasBeenAttemptedBefore ? (
          <span className="suggested-action-again-mark">
            <ArrowsClockwise size={12} weight="bold" aria-hidden="true" />
            {replyDeskCopy.attemptedBeforeMark}
          </span>
        ) : null}
        {isInPlan ? (
          <span className="suggested-action-plan-badge">
            <CheckSquare size={14} weight="fill" aria-hidden="true" />
            {replyDeskCopy.suggestionPlacedInPlanBadge(stepIndexInPlan + 1)}
          </span>
        ) : null}
      </span>
    </button>
  )
}

export function SuggestedActionList({ suggestedActions, investigator }: SuggestedActionListProperties) {
  const playInteractionFeedback = useInteractionFeedback()
  const { declaredPlanSteps, toggleSuggestedActionInPlan } = useReplyDraft()
  const { isEverythingElseBlockedByOpenDirectorQuestion } = useDirectorQuestionRuling()
  const latestActivationTimeBySuggestionIdentifier = useRef(new Map<string, number>())
  const suggestedActionIdentifierAwaitingFocus = useRef<string | null>(null)
  const suggestedActionSectionElement = useRef<HTMLElement | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [drawerOpeningVariantName, setDrawerOpeningVariantName] = useState<SuggestedActionDrawerOpeningVariantName>(
    suggestedActionDrawerOpeningVariantNames[0],
  )
  const isWideScreen = useSyncExternalStore(subscribeToWideScreenChanges, readIsWideScreen, readIsWideScreenWithoutWindow)
  const suggestionSetSignature = createSuggestionSetSignature(suggestedActions)
  const entranceVariantName = useMemo(
    () =>
      suggestionSetSignature.length > 0
        ? chooseAnimationVariantName('reply_desk_suggested_action_entrance', suggestedActionEntranceVariantNames)
        : suggestedActionEntranceVariantNames[0],
    [suggestionSetSignature],
  )
  const suggestedActionArrangement = useMemo(
    () =>
      arrangeSuggestedActions({
        suggestedActions,
        suggestedActionIdentifiersInPlan: new Set(
          declaredPlanSteps.flatMap((planStep) =>
            planStep.originSuggestedActionIdentifier === null ? [] : [planStep.originSuggestedActionIdentifier],
          ),
        ),
        canAffordSuggestedAction: (suggestedAction) => canInvestigatorAffordResourceCost(investigator, suggestedAction.resourceCost),
        visibleSuggestionCapacity: isWideScreen ? visibleSuggestionCapacityOnWideScreens : visibleSuggestionCapacityOnNarrowScreens,
      }),
    [suggestedActions, declaredPlanSteps, investigator, isWideScreen],
  )
  const suggestedActionsConsumedLastTurn = readSuggestedActionsConsumedLastTurn(suggestedActions)
  const hasDrawer = suggestedActionArrangement.drawerActionCount > 0
  const isDrawerShownOpen = isDrawerOpen && hasDrawer

  const toggleDrawer = () => {
    if (!hasDrawer) {
      return
    }
    if (isDrawerShownOpen) {
      playInteractionFeedback('panel_close')
      setIsDrawerOpen(false)
      return
    }
    playInteractionFeedback('panel_open')
    setDrawerOpeningVariantName(
      chooseAnimationVariantName('reply_desk_suggested_action_drawer_opening', suggestedActionDrawerOpeningVariantNames),
    )
    setIsDrawerOpen(true)
  }

  useSuggestionDrawerKey(suggestedActions.length > 0 && !isEverythingElseBlockedByOpenDirectorQuestion, toggleDrawer)

  useEffect(() => {
    const awaitedIdentifier = suggestedActionIdentifierAwaitingFocus.current
    suggestedActionIdentifierAwaitingFocus.current = null
    if (awaitedIdentifier === null || suggestedActionSectionElement.current === null) {
      return
    }
    const focusedElement = document.activeElement
    if (focusedElement !== null && focusedElement !== document.body) {
      return
    }
    const risenCardElement = [...suggestedActionSectionElement.current.querySelectorAll<HTMLButtonElement>('button[data-suggested-action-identifier]')].find(
      (cardElement) => cardElement.dataset.suggestedActionIdentifier === awaitedIdentifier,
    )
    risenCardElement?.focus({ preventScroll: true })
  }, [declaredPlanSteps])

  if (suggestedActions.length === 0) {
    return null
  }

  if (isEverythingElseBlockedByOpenDirectorQuestion) {
    return (
      <p className="suggested-action-waiting-line">
        <HourglassMedium size={16} weight="fill" aria-hidden="true" />
        <span>{readingLogCopy.directorQuestionRulesTheTurn.waitingCoursesOfActionLine(suggestedActions.length)}</span>
      </p>
    )
  }

  const readStepIndexInPlan = (arrangedAction: ArrangedSuggestedAction) =>
    declaredPlanSteps.findIndex((planStep) => planStep.originSuggestedActionIdentifier === arrangedAction.suggestedAction.identifier)

  const handleCardHovered = (pointerType: string, arrangedAction: ArrangedSuggestedAction) => {
    if (pointerType === 'mouse' && (arrangedAction.canAfford || arrangedAction.isInPlan)) {
      playInteractionFeedback('option_hover')
    }
  }

  const handleCardActivated = (clickEvent: ReactMouseEvent<HTMLButtonElement>, arrangedAction: ArrangedSuggestedAction) => {
    clickEvent.stopPropagation()
    const suggestedActionIdentifier = arrangedAction.suggestedAction.identifier
    const latestActivationTime = latestActivationTimeBySuggestionIdentifier.current.get(suggestedActionIdentifier)
    if (
      latestActivationTime !== undefined &&
      clickEvent.timeStamp - latestActivationTime < minimumMillisecondsBetweenActivationsOfOneSuggestion
    ) {
      return
    }
    latestActivationTimeBySuggestionIdentifier.current.set(suggestedActionIdentifier, clickEvent.timeStamp)
    suggestedActionIdentifierAwaitingFocus.current = suggestedActionIdentifier
    playInteractionFeedback(arrangedAction.isInPlan ? 'panel_close' : 'option_click')
    toggleSuggestedActionInPlan(arrangedAction.suggestedAction, arrangedAction.suggestionNumber)
  }

  const renderCardItem = (arrangedAction: ArrangedSuggestedAction, entranceOrder: number, entranceClassName: string | undefined) => (
    <li
      key={arrangedAction.suggestedAction.identifier}
      className={entranceClassName}
      style={{ '--entrance-order': entranceOrder } as CSSProperties}
    >
      <SuggestedActionCard
        arrangedAction={arrangedAction}
        stepIndexInPlan={readStepIndexInPlan(arrangedAction)}
        onHovered={handleCardHovered}
        onActivated={handleCardActivated}
      />
    </li>
  )

  const visibleCourseCount = suggestedActionArrangement.visibleCourseActions.length

  return (
    <section
      ref={suggestedActionSectionElement}
      aria-labelledby="suggested-actions-title"
      className="suggested-action-section"
    >
      <div className="suggested-action-heading">
        <h2 id="suggested-actions-title" className="display-title text-xl">
          {replyDeskCopy.suggestedActionsTitle}
        </h2>
        <p className="suggested-action-hint">{replyDeskCopy.suggestedActionsHint}</p>
      </div>
      {visibleCourseCount > 0 ? (
        <ol className="suggested-action-list">
          {suggestedActionArrangement.visibleCourseActions.map((arrangedAction, actionIndex) =>
            renderCardItem(arrangedAction, actionIndex, entranceVariantName),
          )}
        </ol>
      ) : null}
      {suggestedActionArrangement.visibleExitActions.length > 0 ? (
        <div className="suggested-action-exits">
          <h3 id="suggested-action-exits-title" className="dossier-label suggested-action-group-title">
            {replyDeskCopy.exitsRowTitle}
          </h3>
          <ol className="suggested-action-exit-row" aria-labelledby="suggested-action-exits-title">
            {suggestedActionArrangement.visibleExitActions.map((arrangedAction, actionIndex) =>
              renderCardItem(arrangedAction, visibleCourseCount + actionIndex, entranceVariantName),
            )}
          </ol>
        </div>
      ) : null}
      {suggestedActionsConsumedLastTurn.length > 0 ? (
        <ul className="suggested-action-consumed-list" aria-label={replyDeskCopy.consumedCoursesTitle}>
          {suggestedActionsConsumedLastTurn.map((consumedAction) => (
            <li key={consumedAction.identifier} className="suggested-action-consumed-line">
              <CheckSquare size={14} weight="fill" aria-hidden="true" />
              <s>{consumedAction.visibleText}</s>
              <span className="suggested-action-consumed-mark">{replyDeskCopy.consumedCourseMark}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {hasDrawer ? (
        <div className="suggested-action-drawer" data-is-open={isDrawerShownOpen ? 'true' : 'false'}>
          <button
            type="button"
            className="suggested-action-drawer-toggle"
            aria-expanded={isDrawerShownOpen}
            aria-controls={suggestedActionDrawerPanelIdentifier}
            aria-keyshortcuts="0"
            onClick={(clickEvent) => {
              clickEvent.stopPropagation()
              toggleDrawer()
            }}
          >
            <FolderOpen size={18} weight="fill" aria-hidden="true" />
            <span className="suggested-action-drawer-toggle-label">
              {replyDeskCopy.otherCoursesDrawerLabel(suggestedActionArrangement.drawerActionCount)}
            </span>
            <span className="suggested-action-drawer-key-hint" aria-hidden="true">
              {replyDeskCopy.otherCoursesDrawerKeyHint}
            </span>
            <CaretDown className="suggested-action-drawer-caret" size={16} weight="bold" aria-hidden="true" />
          </button>
          <div
            id={suggestedActionDrawerPanelIdentifier}
            role="region"
            aria-label={replyDeskCopy.otherCoursesDrawerRegionLabel}
            className="suggested-action-drawer-panel"
            data-opening-variant={drawerOpeningVariantName}
            hidden={!isDrawerShownOpen}
          >
            {suggestedActionArrangement.drawerGroups.map((drawerGroup, groupIndex) => {
              const groupTitleIdentifier = `suggested-action-drawer-group-${drawerGroup.groupName}`
              const entranceOrderOffset = suggestedActionArrangement.drawerGroups
                .slice(0, groupIndex)
                .reduce((runningCount, earlierGroup) => runningCount + earlierGroup.arrangedActions.length, 0)
              return (
                <div key={drawerGroup.groupName} className="suggested-action-drawer-group">
                  <h3 id={groupTitleIdentifier} className="dossier-label suggested-action-group-title">
                    {replyDeskCopy.suggestedActionGroupTitles[drawerGroup.groupName]}
                  </h3>
                  <ol
                    className={
                      drawerGroup.groupName === 'move' || drawerGroup.groupName === 'withdraw'
                        ? 'suggested-action-exit-row'
                        : 'suggested-action-list'
                    }
                    aria-labelledby={groupTitleIdentifier}
                  >
                    {drawerGroup.arrangedActions.map((arrangedAction, actionIndex) =>
                      renderCardItem(arrangedAction, entranceOrderOffset + actionIndex, 'suggested-action-drawer-item'),
                    )}
                  </ol>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </section>
  )
}

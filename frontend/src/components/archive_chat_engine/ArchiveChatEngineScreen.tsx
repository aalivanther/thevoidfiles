import { BookBookmark, FastForward, HandPalm, IdentificationCard, Stamp, UsersThree } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react'
import { useInteractionFeedback } from '../../audio/interaction_feedback'
import { readingLogCopy } from '../../copy/archive_chat_engine/reading_log_copy'
import { directorOperationFailureCopy, readDirectorOperationFailureText } from '../../copy/director_operation_failure_copy'
import { relationshipsCopy } from '../../copy/archive_chat_engine/relationships_copy'
import { demonstrationArchive } from '../../demonstration/demonstration_case_script'
import type { FalsifiedStatusReading } from '../../game_state/archive_turn_contract'
import { formatWorldClock, useChronicleState } from '../../game_state/chronicle_state'
import type { ScreenName } from '../../navigation/screen_navigation'
import { usePlayerSettings } from '../../settings/player_settings'
import { spanishInterfaceCopy } from '../../spanish_interface_copy'
import { ArchiveImmersionLayer } from '../ArchiveImmersionLayer'
import { CaseStatusPanel, CompactCaseStatusStrip } from '../CaseStatusPanel'
import { PresentationTitleCard } from '../PresentationTitleCard'
import { stopEveryNarrationVoice } from '../../voice/narration_voice_player'
import { HiddenScrollbarRegion } from '../scroll_affordance/HiddenScrollbarRegion'
import { useArchiveTurnFlow } from './archive_turn_flow_context'
import { DirectorThinkingIndicator } from './director_waiting/DirectorThinkingIndicator'
import { ArchiveReadingLog } from './reading_log/ArchiveReadingLog'
import { ReturnToPresentButton } from './reading_log/ReturnToPresentButton'
import { useKeyboardInset } from './reading_log/use_keyboard_inset'
import { useReadingLineScroll } from './reading_log/use_reading_line_scroll'
import { PresentPersonsPanel } from './relationships/PresentPersonsPanel'
import { PlanRailPanel } from './reply_desk/PlanRailPanel'
import { ReplyDesk } from './reply_desk/ReplyDesk'
import { ReplyDraftProvider } from './reply_desk/ReplyDraftProvider'
import { SuggestedActionList } from './reply_desk/SuggestedActionList'
import { ChronicleDeathSequenceHost, StagingLayer } from './staging/StagingLayer'
import { ArchiveTurnFlowProvider } from './turn_flow/ArchiveTurnFlowProvider'
import {
  readDirectorQuestionAnswerElementIdentifier,
  useDirectorQuestionRuling,
} from './turn_flow/director_question_ruling_context'
import { usePendingInvestigatorDeclaration } from './turn_flow/pending_investigator_declaration_context'
import '../../styles/archive_chat_engine/director_question.css'

const minimumMillisecondsBetweenRefusedReplyDeskAttempts = 450
const replyDeskUnavailableLineElementIdentifier = 'reply-desk-unavailable-line'

export type ArchiveChatEngineScreenProperties = {
  onArchiveClosureRequested: () => void
  onChronicleWindowRequested: (screenName: ScreenName) => void
}

function ArchiveChatEngineLayout({ onArchiveClosureRequested, onChronicleWindowRequested }: ArchiveChatEngineScreenProperties) {
  const { chronicleState, changeChronicleState } = useChronicleState()
  const { archiveRun, investigator } = chronicleState
  const playInteractionFeedback = useInteractionFeedback()
  const {
    directorTurnPhaseName,
    generationWaitStageName,
    directorWaitStageName,
    hasDirectorServiceFailed,
    directorServiceFailureName,
    revealPlaybackState,
    requestImmediateRevealCompletion,
    retrySameAction,
  } = useArchiveTurnFlow()
  const [isPresentPersonsPanelOpen, setIsPresentPersonsPanelOpen] = useState(false)
  const [focusedPersonIdentifier, setFocusedPersonIdentifier] = useState<string | null>(null)
  const [falsifiedStatusReading, setFalsifiedStatusReading] = useState<FalsifiedStatusReading | null>(null)
  const { shouldReduceMotion } = usePlayerSettings()
  const pendingInvestigatorDeclaration = usePendingInvestigatorDeclaration()
  const { openDirectorQuestionEntryIdentifier, isEverythingElseBlockedByOpenDirectorQuestion } = useDirectorQuestionRuling()
  const [refusedReplyDeskAttemptCount, setRefusedReplyDeskAttemptCount] = useState(0)
  const latestRefusedReplyDeskAttemptTimestamp = useRef(0)
  const screenElementReference = useRef<HTMLDivElement>(null)
  const scrollContainerReference = useRef<HTMLDivElement>(null)
  const readingColumnReference = useRef<HTMLDivElement>(null)
  const presentMarkerReference = useRef<HTMLDivElement>(null)
  const readingRunwayReference = useRef<HTMLDivElement>(null)

  const isDirectorBusy = directorTurnPhaseName !== 'idle'
  const isRevealInProgress = revealPlaybackState.logEntryIdentifierBeingRevealed !== null
  const scenePresentation = archiveRun.currentScenePresentation
  const sceneTensionTierName = scenePresentation?.tensionTierName ?? 'calm'
  const archiveOutcome = archiveRun.archiveOutcome
  const investigatorShownInStatus = {
    ...investigator,
    placeName:
      falsifiedStatusReading?.statusFieldName === 'place_name' ? falsifiedStatusReading.falseVisibleText : investigator.placeName,
  }
  const falsifiedWorldClockText =
    falsifiedStatusReading?.statusFieldName === 'world_clock' ? falsifiedStatusReading.falseVisibleText : null

  useKeyboardInset(screenElementReference)
  const { isReturnToPresentOffered, newEntryCountBelow, followRevealProgress, returnToPresent } = useReadingLineScroll({
    scrollContainerReference,
    readingColumnReference,
    presentMarkerReference,
    readingRunwayReference,
    logEntries: archiveRun.logEntries,
    logEntryIdentifierBeingRevealed: revealPlaybackState.logEntryIdentifierBeingRevealed,
    isImmediateCompletionRequested: revealPlaybackState.isImmediateCompletionRequested,
    pendingDeclarationKey: pendingInvestigatorDeclaration?.declarationKey ?? null,
    isDirectorBusy,
    shouldReduceMotion,
  })

  const completeRevealWhenProseIsTouched = (clickEvent: ReactMouseEvent<HTMLDivElement>) => {
    const isInteractiveElementTouched =
      clickEvent.target instanceof Element && clickEvent.target.closest('button, a, input, textarea, select, [role="button"]')
    if (isRevealInProgress && !isInteractiveElementTouched) {
      requestImmediateRevealCompletion()
    }
  }

  const refuseReplyDeskAttempt = () => {
    const currentTimestamp = Date.now()
    if (currentTimestamp - latestRefusedReplyDeskAttemptTimestamp.current < minimumMillisecondsBetweenRefusedReplyDeskAttempts) {
      return
    }
    latestRefusedReplyDeskAttemptTimestamp.current = currentTimestamp
    playInteractionFeedback('rejection')
    setRefusedReplyDeskAttemptCount((previousCount) => previousCount + 1)
  }

  const refuseReplyDeskClickWhileDirectorAwaitsAnswer = (clickEvent: ReactMouseEvent<HTMLDivElement>) => {
    if (!isEverythingElseBlockedByOpenDirectorQuestion || !(clickEvent.target instanceof Element)) {
      return
    }
    if (clickEvent.target.closest('button, a, select, input, [role="button"]') === null) {
      return
    }
    clickEvent.preventDefault()
    clickEvent.stopPropagation()
    refuseReplyDeskAttempt()
  }

  const refuseReplyDeskKeyWhileDirectorAwaitsAnswer = (keyboardEvent: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!isEverythingElseBlockedByOpenDirectorQuestion || !(keyboardEvent.target instanceof Element)) {
      return
    }
    const isTextFieldTarget = keyboardEvent.target.closest('textarea, input') !== null
    const isActivationKey =
      (keyboardEvent.key === 'Enter' && !keyboardEvent.shiftKey) || (keyboardEvent.key === ' ' && !isTextFieldTarget)
    if (!isActivationKey) {
      return
    }
    keyboardEvent.preventDefault()
    keyboardEvent.stopPropagation()
    refuseReplyDeskAttempt()
  }

  const goToOpenDirectorQuestion = () => {
    if (openDirectorQuestionEntryIdentifier === null) {
      return
    }
    playInteractionFeedback('option_click')
    const firstAnswerElement = document.getElementById(
      readDirectorQuestionAnswerElementIdentifier(openDirectorQuestionEntryIdentifier, 1),
    )
    firstAnswerElement?.scrollIntoView({ block: 'center', behavior: shouldReduceMotion ? 'auto' : 'smooth' })
    firstAnswerElement?.focus({ preventScroll: true })
  }

  const openPresentPersonsPanel = (personIdentifier: string | null) => {
    playInteractionFeedback('panel_open')
    setFocusedPersonIdentifier(personIdentifier)
    setIsPresentPersonsPanelOpen(true)
  }

  return (
    <div
      ref={screenElementReference}
      className="archive-chat-engine-screen mx-auto grid w-full max-w-7xl grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-x-8 lg:px-8"
      data-scene-tension-tier={sceneTensionTierName}
    >
      <header className="col-span-full flex min-w-0 items-center gap-3 border-b-2 border-ink-line bg-void-base/95 py-2.5 pr-[4.5rem] pl-4 lg:pr-16 lg:pl-0">
        <div className="min-w-0 shrink">
          <p className="dossier-label truncate">
            {readingLogCopy.archiveLabel} {archiveRun.archiveNumberLabel ?? demonstrationArchive.archiveNumberLabel}
          </p>
          <h1 className="display-title pt-1 text-lg text-balance sm:text-2xl">
            {archiveRun.archiveTitle ?? demonstrationArchive.archiveTitle}
          </h1>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            className="quiet-action-button"
            aria-label={`${relationshipsCopy.presentPersonsPanelTitle}: ${scenePresentation?.presentPersons.length ?? 0}`}
            title={relationshipsCopy.presentPersonsPanelTitle}
            onClick={() => openPresentPersonsPanel(null)}
          >
            <UsersThree size={20} weight="fill" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="quiet-action-button"
            disabled={isDirectorBusy}
            aria-label={spanishInterfaceCopy.chronicleHub.dossier}
            title={spanishInterfaceCopy.chronicleHub.dossier}
            onClick={() => {
              playInteractionFeedback('panel_open')
              onChronicleWindowRequested('character_dossier')
            }}
          >
            <IdentificationCard size={20} weight="fill" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="quiet-action-button"
            disabled={isDirectorBusy}
            aria-label={spanishInterfaceCopy.chronicleHub.journal}
            title={spanishInterfaceCopy.chronicleHub.journal}
            onClick={() => {
              playInteractionFeedback('panel_open')
              onChronicleWindowRequested('case_journal')
            }}
          >
            <BookBookmark size={20} weight="fill" aria-hidden="true" />
          </button>
        </div>
        <div className="hidden min-w-0 shrink-[2] items-center gap-3 sm:flex lg:hidden">
          <CompactCaseStatusStrip investigator={investigatorShownInStatus} falsifiedWorldClockText={falsifiedWorldClockText} />
        </div>
      </header>

      <main id="main-content" data-confirmed-state-version={archiveRun.stateVersion} data-last-confirmed-action-key={archiveRun.lastConfirmedActionKey ?? undefined} className="flex min-h-0 min-w-0 flex-col">
        <HiddenScrollbarRegion
          regionLabel={readingLogCopy.readingLogRegionLabel}
          className="archive-reading-log-region flex-1"
          scrollContainerReference={scrollContainerReference}
        >
          <div
            ref={readingColumnReference}
            className="archive-reading-column mx-auto flex w-full max-w-[68ch] flex-col gap-6 px-4 pt-6 pb-52 lg:px-0"
            onClick={completeRevealWhenProseIsTouched}
          >
            <p className="dossier-label border-b border-ink-line pb-2">
              {spanishInterfaceCopy.oicnauContact.archiveConditionByStance[chronicleState.oicnauStance ?? 'sanctioned_operative']}
            </p>
            <ArchiveReadingLog
              logEntries={archiveRun.logEntries}
              interactivePiecePublicDefinitions={archiveRun.interactivePiecePublicDefinitions}
              interactivePieceRuntimeStates={archiveRun.interactivePieceRuntimeStates}
              isReadOnly={false}
              onPersonDetailRequested={openPresentPersonsPanel}
              onRevealProgressed={followRevealProgress}
            />
            <DirectorThinkingIndicator
              directorTurnPhaseName={directorTurnPhaseName}
              directorWaitStageName={directorWaitStageName}
              generationWaitStageName={generationWaitStageName}
              sceneTensionTierName={sceneTensionTierName}
            />
            {hasDirectorServiceFailed || directorWaitStageName === 'retry_offered' ? (
              <div className="reading-log-retry-notice" role="alert">
                <p>
                  {hasDirectorServiceFailed
                    ? `${directorOperationFailureCopy.turnFailedTitle}. ${readDirectorOperationFailureText(directorServiceFailureName)} ${directorOperationFailureCopy.retryHint}`
                    : readingLogCopy.longWaitRetryNotice}
                </p>
                <button
                  type="button"
                  className="quiet-action-button mt-2"
                  onClick={() => {
                    playInteractionFeedback('option_click')
                    retrySameAction()
                  }}
                >
                  {readingLogCopy.retrySameActionButton}
                </button>
              </div>
            ) : null}
            {!isDirectorBusy && !isRevealInProgress && scenePresentation && archiveOutcome === null ? (
              <SuggestedActionList suggestedActions={scenePresentation.suggestedActions} investigator={investigator} />
            ) : null}
            {archiveOutcome?.kind === 'archive_ended_alive' && !isRevealInProgress && !isDirectorBusy ? (
              <div className="entrance-stamp-pop mt-2 flex justify-center">
                <button
                  type="button"
                  className="primary-action-button text-xl"
                  onClick={() => {
                    playInteractionFeedback('confirmation')
                    onArchiveClosureRequested()
                  }}
                >
                  <Stamp size={24} weight="fill" aria-hidden="true" />
                  {readingLogCopy.closeArchiveButton}
                </button>
              </div>
            ) : null}
            <div ref={presentMarkerReference} className="reading-log-present-marker" aria-hidden="true" />
          </div>
          <div ref={readingRunwayReference} className="reading-log-runway" aria-hidden="true" />
        </HiddenScrollbarRegion>

        <div className="archive-reply-desk-dock border-t-2 border-ink-line bg-void-base px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:px-0">
          {isRevealInProgress || isReturnToPresentOffered ? (
            <div className="reading-log-floating-controls">
              {isReturnToPresentOffered ? (
                <ReturnToPresentButton newEntryCountBelow={newEntryCountBelow} onReturnToPresentRequested={returnToPresent} />
              ) : null}
              {isRevealInProgress ? (
                <button
                  type="button"
                  className="quiet-action-button reading-log-complete-text-button"
                  onClick={() => {
                    playInteractionFeedback('option_click')
                    requestImmediateRevealCompletion()
                  }}
                >
                  <FastForward size={18} weight="fill" aria-hidden="true" />
                  {readingLogCopy.completeTextButton}
                </button>
              ) : null}
            </div>
          ) : null}
          {isEverythingElseBlockedByOpenDirectorQuestion ? (
            <div className="director-question-desk-notice">
              <p
                key={refusedReplyDeskAttemptCount}
                id={replyDeskUnavailableLineElementIdentifier}
                className="director-question-desk-notice-line"
                data-was-attempt-refused={refusedReplyDeskAttemptCount > 0}
              >
                <HandPalm size={18} weight="fill" aria-hidden="true" />
                <span>{readingLogCopy.directorQuestionRulesTheTurn.replyDeskUnavailableLine}</span>
              </p>
              {isDirectorBusy || isRevealInProgress ? null : (
                <button type="button" className="quiet-action-button" onClick={goToOpenDirectorQuestion}>
                  {readingLogCopy.directorQuestionRulesTheTurn.goToQuestionButton}
                </button>
              )}
            </div>
          ) : null}
          <HiddenScrollbarRegion regionLabel={readingLogCopy.replyDeskRegionLabel} className="archive-reply-desk-region">
            <div
              className="archive-reply-desk-availability"
              role="group"
              aria-label={
                isEverythingElseBlockedByOpenDirectorQuestion
                  ? readingLogCopy.directorQuestionRulesTheTurn.replyDeskUnavailableGroupLabel
                  : readingLogCopy.replyDeskRegionLabel
              }
              aria-disabled={isEverythingElseBlockedByOpenDirectorQuestion}
              aria-describedby={isEverythingElseBlockedByOpenDirectorQuestion ? replyDeskUnavailableLineElementIdentifier : undefined}
              data-is-awaiting-director-answer={isEverythingElseBlockedByOpenDirectorQuestion}
              onClickCapture={refuseReplyDeskClickWhileDirectorAwaitsAnswer}
              onKeyDownCapture={refuseReplyDeskKeyWhileDirectorAwaitsAnswer}
            >
              <ReplyDesk
                scenePresentation={scenePresentation}
                investigator={investigator}
                pendingActionPlan={archiveRun.pendingActionPlan}
              />
            </div>
          </HiddenScrollbarRegion>
        </div>
      </main>

      <aside className="hidden min-h-0 border-l-2 border-ink-line py-6 pl-6 lg:flex lg:flex-col">
        <HiddenScrollbarRegion regionLabel={spanishInterfaceCopy.caseStatus.title}>
          <PlanRailPanel />
          <CaseStatusPanel
            investigator={investigatorShownInStatus}
            investigatorFullName={chronicleState.investigatorRegistration?.fullName ?? investigator.investigatorName}
            oicnauStance={chronicleState.oicnauStance}
            falsifiedWorldClockText={falsifiedWorldClockText}
          />
        </HiddenScrollbarRegion>
      </aside>

      <PresentPersonsPanel
        isOpen={isPresentPersonsPanelOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            playInteractionFeedback('panel_close')
          }
          setIsPresentPersonsPanelOpen(isOpen)
        }}
        presentPersons={scenePresentation?.presentPersons ?? []}
        relationshipPulses={archiveRun.relationshipPulses}
        focusedPersonIdentifier={focusedPersonIdentifier}
        onFullRecordRequested={
          isDirectorBusy
            ? undefined
            : () => {
                playInteractionFeedback('panel_open')
                setIsPresentPersonsPanelOpen(false)
                onChronicleWindowRequested('organizations_allies')
              }
        }
      />

      <StagingLayer sceneTensionTierName={sceneTensionTierName} falsifiedStatusReadingChanged={setFalsifiedStatusReading} />
      <ArchiveImmersionLayer dreadLevel={chronicleState.confirmedTurnCount} />

      {archiveOutcome?.kind === 'chronicle_closed_by_death' && !isRevealInProgress ? (
        <ChronicleDeathSequenceHost
          archiveOutcome={archiveOutcome}
          onChronicleClosureWitnessed={() => changeChronicleState({ kind: 'chronicle_closure_sequence_witnessed' })}
        />
      ) : null}
    </div>
  )
}

export function ArchiveChatEngineScreen(screenProperties: ArchiveChatEngineScreenProperties) {
  const { chronicleState } = useChronicleState()
  const { archiveRun, investigator } = chronicleState
  const [isArchivePresentationVisible, setIsArchivePresentationVisible] = useState(
    () => archiveRun.stateVersion === 0 && archiveRun.logEntries.every((logEntry) => logEntry.turnIdentifier === null && logEntry.voice !== 'investigator_entry'),
  )

  useEffect(() => {
    return () => stopEveryNarrationVoice()
  }, [])

  if (isArchivePresentationVisible) {
    return (
      <PresentationTitleCard
        chapterLabel={readingLogCopy.archivePresentationLabel(
          archiveRun.archiveNumberLabel ?? demonstrationArchive.archiveNumberLabel,
        )}
        chapterTitle={archiveRun.archiveTitle ?? demonstrationArchive.archiveTitle}
        detailLine={`${investigator.placeName} · ${formatWorldClock(investigator.worldClockMinutes)}`}
        onPresentationFinished={() => setIsArchivePresentationVisible(false)}
      />
    )
  }

  return (
    <ArchiveTurnFlowProvider>
      <ReplyDraftProvider>
        <ArchiveChatEngineLayout {...screenProperties} />
      </ReplyDraftProvider>
    </ArchiveTurnFlowProvider>
  )
}

export default ArchiveChatEngineScreen

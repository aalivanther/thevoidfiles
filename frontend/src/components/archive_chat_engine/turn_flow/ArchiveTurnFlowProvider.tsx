import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { loadArchiveDirectorService } from '../../../game_state/archive_director_service_loading'
import { resolveStagingEventsOfConfirmedTurn } from '../../../game_state/archive_run_state'
import type { ArchiveRunState } from '../../../game_state/archive_run_state'
import type {
  ArchiveLogEntry,
  ConfirmedArchiveTurn,
  DirectorQuestionEntry,
  DirectorTurnPhaseName,
  InvestigatorActionRequest,
  PlannedActionStep,
  StagingEvent,
} from '../../../game_state/archive_turn_contract'
import { readLatestChronicleState, useChronicleState } from '../../../game_state/chronicle_state'
import { ArchiveTurnFlowContext } from '../archive_turn_flow_context'
import type { ArchiveTurnFlowContextValue, ReplyDeskFocusRequest } from '../archive_turn_flow_context'
import { DirectorQuestionRulingContext, doesOpenDirectorQuestionBlockEverythingElse } from './director_question_ruling_context'
import type { DirectorQuestionRuling } from './director_question_ruling_context'
import { PendingInvestigatorDeclarationContext } from './pending_investigator_declaration_context'
import type { PendingInvestigatorDeclaration } from './pending_investigator_declaration_context'
import { recoverRemoteArchiveState, RemoteDirectorTurnUnavailableError } from '../../../game_service/remote_archive_director_service'
import { useDirectorGenerationWait } from '../../director_generation_wait/use_director_generation_wait'
import { useDirectorWaitTiming } from './use_director_wait_timing'

import { clearPendingArchiveRequest, readPendingArchiveRequest, readRequestActionKey, storePendingArchiveRequest } from '../../../game_state/pending_archive_request'
import type { RetriableDirectorRequest } from '../../../game_state/pending_archive_request'

const confirmedTurnAcceptanceCheckMilliseconds = 600
const revealSafetyMillisecondsPerCharacter = 90
const revealSafetyBaseMilliseconds = 12000

type StagingEventSchedule = {
  eventsAwaitingRevealAnchor: StagingEvent[]
  eventsReadyForStaging: StagingEvent[]
}

type PendingDeclarationWithoutFailure = Omit<PendingInvestigatorDeclaration, 'hasDirectorFailedToAnswer'>

function isLogEntryRevealedProgressively(logEntry: ArchiveLogEntry): boolean {
  return (
    logEntry.voice === 'director_narration' || logEntry.voice === 'character_dialogue' || logEntry.voice === 'inner_thought'
  )
}

function hasArchiveJustBeenOpened(archiveRun: ArchiveRunState): boolean {
  return (
    archiveRun.stateVersion === 0 &&
    archiveRun.logEntries.every((logEntry) => logEntry.turnIdentifier === null && logEntry.voice !== 'investigator_entry')
  )
}

function readProgressivelyRevealedEntryIdentifiers(logEntries: readonly ArchiveLogEntry[]): string[] {
  return logEntries.filter(isLogEntryRevealedProgressively).map((logEntry) => logEntry.identifier)
}

function countCharactersOfLogEntry(logEntry: ArchiveLogEntry | undefined): number {
  if (!logEntry || !('markedParagraphs' in logEntry)) {
    return 0
  }
  return logEntry.markedParagraphs.reduce((characterCount, markedParagraph) => characterCount + markedParagraph.length, 0)
}

function readOpenDirectorQuestionEntry(archiveRun: ArchiveRunState): DirectorQuestionEntry | null {
  const openQuestionEntryIdentifier = archiveRun.unansweredDirectorQuestionEntryIdentifier
  if (openQuestionEntryIdentifier === null || archiveRun.archiveOutcome !== null) {
    return null
  }
  const openQuestionEntry = archiveRun.logEntries.find((logEntry) => logEntry.identifier === openQuestionEntryIdentifier)
  return openQuestionEntry && openQuestionEntry.voice === 'director_question' && openQuestionEntry.answeredOptionIdentifier === null
    ? openQuestionEntry
    : null
}

function isEverythingElseBlockedByOpenDirectorQuestion(archiveRun: ArchiveRunState): boolean {
  return doesOpenDirectorQuestionBlockEverythingElse && readOpenDirectorQuestionEntry(archiveRun) !== null
}

function rebuildLastActionRequestFromLog(archiveRun: ArchiveRunState, actionKey: string): InvestigatorActionRequest | null {
  const lastInvestigatorEntry = archiveRun.logEntries.findLast((logEntry) => logEntry.voice === 'investigator_entry')
  const currentScenePresentation = archiveRun.currentScenePresentation
  if (!lastInvestigatorEntry || lastInvestigatorEntry.voice !== 'investigator_entry' || !currentScenePresentation) {
    return null
  }
  const rebuiltPlanSteps: PlannedActionStep[] = lastInvestigatorEntry.attemptedSteps.map((attemptedStep) => ({
    stepIdentifier: `rebuilt_step_${lastInvestigatorEntry.identifier}_${attemptedStep.stepNumber}`,
    actionText: attemptedStep.actionText,
    conditionText: attemptedStep.conditionText,
    originSuggestedActionIdentifier: null,
    wasTextEditedByPlayer: attemptedStep.compositionOriginName !== 'suggested_action',
    declaredResourceCost: null,
  }))
  if (rebuiltPlanSteps.length === 0) {
    return null
  }
  return {
    actionKey,
    expectedStateVersion: archiveRun.stateVersion,
    sceneIdentifier: currentScenePresentation.sceneIdentifier,
    remainingPlanSteps: rebuiltPlanSteps,
    declaredPlanStepCount: lastInvestigatorEntry.declaredPlanStepCount ?? rebuiltPlanSteps.length,
    alreadyExecutedStepCount: 0,
    isPlayerInsistingAfterDirectorVeto: false,
    referencedInteractivePieceIdentifier: null,
  }
}

export function ArchiveTurnFlowProvider({ children }: { children: ReactNode }) {
  const { chronicleState, changeChronicleState } = useChronicleState()
  const { archiveRun } = chronicleState

  const [directorTurnPhaseName, setDirectorTurnPhaseName] = useState<DirectorTurnPhaseName>('weighing_action')
  const [directorWaitStartedAtTimestamp, setDirectorWaitStartedAtTimestamp] = useState<number | null>(null)
  const [hasDirectorServiceFailed, setHasDirectorServiceFailed] = useState(false)
  const [directorServiceFailureName, setDirectorServiceFailureName] = useState<string | null>(null)
  const [trackedLogEntries, setTrackedLogEntries] = useState(archiveRun.logEntries)
  const [logEntryIdentifiersInRevealQueue, setLogEntryIdentifiersInRevealQueue] = useState<string[]>(() =>
    hasArchiveJustBeenOpened(archiveRun) ? readProgressivelyRevealedEntryIdentifiers(archiveRun.logEntries) : [],
  )
  const [isImmediateCompletionRequested, setIsImmediateCompletionRequested] = useState(false)
  const [stagingEventSchedule, setStagingEventSchedule] = useState<StagingEventSchedule>({
    eventsAwaitingRevealAnchor: [],
    eventsReadyForStaging: [],
  })
  const [pendingDeclaration, setPendingDeclaration] = useState<PendingDeclarationWithoutFailure | null>(null)
  const [replyDeskFocusRequest, setReplyDeskFocusRequest] = useState<ReplyDeskFocusRequest>({
    requestSequenceNumber: 0,
    referencedInteractivePieceIdentifier: null,
    restoredDraftText: null,
    shouldOpenPendingPlanForEditing: false,
  })

  const directorWaitStageName = useDirectorWaitTiming(directorWaitStartedAtTimestamp)
  const { waitStageName: generationWaitStageName, beginGeneration, markGenerationCompletedAndWaitForSequence } =
    useDirectorGenerationWait()

  if (trackedLogEntries !== archiveRun.logEntries) {
    const alreadyTrackedIdentifiers = new Set(trackedLogEntries.map((logEntry) => logEntry.identifier))
    const newlyArrivedRevealableIdentifiers = readProgressivelyRevealedEntryIdentifiers(
      archiveRun.logEntries.filter((logEntry) => !alreadyTrackedIdentifiers.has(logEntry.identifier)),
    )
    setTrackedLogEntries(archiveRun.logEntries)
    if (newlyArrivedRevealableIdentifiers.length > 0) {
      setIsImmediateCompletionRequested(false)
      setLogEntryIdentifiersInRevealQueue((previousQueue) => [...previousQueue, ...newlyArrivedRevealableIdentifiers])
    }
  }

  const isProviderMounted = useRef(true)
  const isDirectorBusy = useRef(true)
  const [isArchiveRecovered, setIsArchiveRecovered] = useState(false)
  const activeRequestSequenceNumber = useRef(0)
  const lastRetriableRequest = useRef<RetriableDirectorRequest | null>(null)
  const confirmedTurnAwaitingStaging = useRef<ConfirmedArchiveTurn | null>(null)
  const referencedInteractivePieceIdentifier = useRef<string | null>(null)
  const scheduledTimeoutIdentifiers = useRef(new Set<number>())

  useEffect(() => {
    isProviderMounted.current = true
    const timeoutIdentifiers = scheduledTimeoutIdentifiers.current
    return () => {
      isProviderMounted.current = false
      timeoutIdentifiers.forEach((timeoutIdentifier) => window.clearTimeout(timeoutIdentifier))
      timeoutIdentifiers.clear()
    }
  }, [])

  const logEntryIdentifierBeingRevealed = logEntryIdentifiersInRevealQueue[0] ?? null

  const reportRevealCompleted = useCallback((logEntryIdentifier: string) => {
    setLogEntryIdentifiersInRevealQueue((previousQueue) =>
      previousQueue.includes(logEntryIdentifier)
        ? previousQueue.filter((queuedIdentifier) => queuedIdentifier !== logEntryIdentifier)
        : previousQueue,
    )
  }, [])

  useEffect(() => {
    if (logEntryIdentifierBeingRevealed === null) {
      return
    }
    const logEntryBeingRevealed = archiveRun.logEntries.find(
      (logEntry) => logEntry.identifier === logEntryIdentifierBeingRevealed,
    )
    const revealSafetyTimeoutIdentifier = window.setTimeout(
      () => reportRevealCompleted(logEntryIdentifierBeingRevealed),
      logEntryBeingRevealed
        ? revealSafetyBaseMilliseconds + countCharactersOfLogEntry(logEntryBeingRevealed) * revealSafetyMillisecondsPerCharacter
        : 0,
    )
    return () => window.clearTimeout(revealSafetyTimeoutIdentifier)
  }, [archiveRun.logEntries, logEntryIdentifierBeingRevealed, reportRevealCompleted])

  useEffect(() => {
    const confirmedTurn = confirmedTurnAwaitingStaging.current
    if (!confirmedTurn || confirmedTurn.resultingStateVersion !== archiveRun.stateVersion) {
      return
    }
    confirmedTurnAwaitingStaging.current = null
    const resolvedStagingEvents = resolveStagingEventsOfConfirmedTurn(archiveRun.logEntries, confirmedTurn)
    if (resolvedStagingEvents.length > 0) {
      setStagingEventSchedule((previousSchedule) => ({
        ...previousSchedule,
        eventsAwaitingRevealAnchor: [...previousSchedule.eventsAwaitingRevealAnchor, ...resolvedStagingEvents],
      }))
    }
  }, [archiveRun.logEntries, archiveRun.stateVersion])

  const releaseStagingEvents = useCallback((shouldReleaseStagingEvent: (stagingEvent: StagingEvent) => boolean) => {
    setStagingEventSchedule((previousSchedule) => {
      const releasedEvents = previousSchedule.eventsAwaitingRevealAnchor.filter(shouldReleaseStagingEvent)
      if (releasedEvents.length === 0) {
        return previousSchedule
      }
      return {
        eventsAwaitingRevealAnchor: previousSchedule.eventsAwaitingRevealAnchor.filter(
          (stagingEvent) => !releasedEvents.includes(stagingEvent),
        ),
        eventsReadyForStaging: [...previousSchedule.eventsReadyForStaging, ...releasedEvents],
      }
    })
  }, [])

  useEffect(() => {
    if (stagingEventSchedule.eventsAwaitingRevealAnchor.length === 0) {
      return
    }
    releaseStagingEvents(
      (stagingEvent) =>
        !('anchorLogEntryIdentifier' in stagingEvent) ||
        !logEntryIdentifiersInRevealQueue.includes(stagingEvent.anchorLogEntryIdentifier),
    )
  }, [logEntryIdentifiersInRevealQueue, releaseStagingEvents, stagingEventSchedule.eventsAwaitingRevealAnchor])

  const reportRevealReachedParagraph = useCallback(
    (logEntryIdentifier: string, paragraphIndex: number) => {
      releaseStagingEvents(
        (stagingEvent) =>
          'anchorLogEntryIdentifier' in stagingEvent &&
          stagingEvent.anchorLogEntryIdentifier === logEntryIdentifier &&
          stagingEvent.anchorParagraphIndex <= paragraphIndex,
      )
    },
    [releaseStagingEvents],
  )

  const scheduleTimeout = useCallback((timeoutCallback: () => void, delayMilliseconds: number) => {
    const timeoutIdentifier = window.setTimeout(() => {
      scheduledTimeoutIdentifiers.current.delete(timeoutIdentifier)
      if (isProviderMounted.current) {
        timeoutCallback()
      }
    }, delayMilliseconds)
    scheduledTimeoutIdentifiers.current.add(timeoutIdentifier)
  }, [])

  const verifyConfirmedTurnWasAccepted = useCallback(
    (confirmedTurn: ConfirmedArchiveTurn) => {
      scheduleTimeout(() => {
        const latestArchiveRun = readLatestChronicleState().archiveRun
        if (latestArchiveRun.stateVersion < confirmedTurn.resultingStateVersion) {
          confirmedTurnAwaitingStaging.current = null
          setHasDirectorServiceFailed(true)
        } else {
          clearPendingArchiveRequest(confirmedTurn.actionKey)
        }
      }, confirmedTurnAcceptanceCheckMilliseconds)
    },
    [scheduleTimeout],
  )

  const readTurnFailureName = (turnError: unknown) =>
    turnError instanceof RemoteDirectorTurnUnavailableError ? turnError.failureName : 'unexpected_service_answer'

  const finishDirectorTurn = useCallback((hasServiceFailed: boolean, failureName: string | null = null) => {
    isDirectorBusy.current = false
    if (!isProviderMounted.current) {
      return
    }
    setDirectorTurnPhaseName('idle')
    setDirectorWaitStartedAtTimestamp(null)
    setHasDirectorServiceFailed(hasServiceFailed)
    setDirectorServiceFailureName(hasServiceFailed ? failureName : null)
    if (!hasServiceFailed) {
      setPendingDeclaration(null)
    }
  }, [])

  const createActionKey = useCallback(() => {
    return `archive_action_${crypto.randomUUID()}`
  }, [])

  const runRetriableDirectorRequest = useCallback(
    async (retriableRequest: RetriableDirectorRequest, isRetryOfSameRequest: boolean) => {
      if (!isRetryOfSameRequest && (isDirectorBusy.current || readPendingArchiveRequest() !== null)) {
        return
      }
      activeRequestSequenceNumber.current += 1
      const requestSequenceNumber = activeRequestSequenceNumber.current
      const isRequestStillActive = () => requestSequenceNumber === activeRequestSequenceNumber.current
      const reportDirectorTurnPhase = (reportedPhaseName: DirectorTurnPhaseName) => {
        if (isProviderMounted.current && isRequestStillActive() && reportedPhaseName !== 'idle') {
          setDirectorTurnPhaseName(reportedPhaseName)
        }
      }

      lastRetriableRequest.current = retriableRequest
      isDirectorBusy.current = true
      setHasDirectorServiceFailed(false)
      setDirectorWaitStartedAtTimestamp(Date.now())
      setDirectorTurnPhaseName('weighing_action')
      beginGeneration()
      if (retriableRequest.kind === 'investigator_action') {
        const { actionRequest } = retriableRequest
        setPendingDeclaration({
          declarationKey: actionRequest.actionKey,
          declaredPlanSteps: actionRequest.remainingPlanSteps,
          declaredPlanStepCount: actionRequest.declaredPlanStepCount,
          alreadyExecutedStepCount: actionRequest.alreadyExecutedStepCount,
        })
      } else {
        setPendingDeclaration(null)
      }

      try {
        storePendingArchiveRequest(retriableRequest)
        const archiveDirectorService = await loadArchiveDirectorService()
        if (retriableRequest.kind === 'interactive_piece_assistance') {
          const assistanceRecord = await archiveDirectorService.requestInteractivePieceAssistance(retriableRequest.assistanceRequest)
          if (!isRequestStillActive()) return
          await markGenerationCompletedAndWaitForSequence()
          if (!isRequestStillActive()) return
          changeChronicleState({ kind: 'interactive_piece_assistance_confirmed', interactivePieceIdentifier: retriableRequest.assistanceRequest.interactivePieceIdentifier, assistanceRecord })
          clearPendingArchiveRequest(retriableRequest.assistanceRequest.actionKey)
          finishDirectorTurn(false)
          return
        }
        if (retriableRequest.kind === 'investigator_action') {
          const directorTurnResolution = await archiveDirectorService.resolveInvestigatorAction(
            retriableRequest.actionRequest,
            reportDirectorTurnPhase,
          )
          if (!isRequestStillActive()) {
            return
          }
          await markGenerationCompletedAndWaitForSequence()
          if (!isRequestStillActive()) {
            return
          }
          if (directorTurnResolution.dispositionName === 'resolved') {
            confirmedTurnAwaitingStaging.current = directorTurnResolution.confirmedTurn
            changeChronicleState({ kind: 'archive_turn_confirmed', confirmedTurn: directorTurnResolution.confirmedTurn })
            verifyConfirmedTurnWasAccepted(directorTurnResolution.confirmedTurn)
          }
          if (directorTurnResolution.dispositionName === 'question_asked') {
            clearPendingArchiveRequest(retriableRequest.actionRequest.actionKey)
            changeChronicleState({
              kind: 'director_question_recorded',
              investigatorEntry: directorTurnResolution.investigatorEntry,
              questionEntry: directorTurnResolution.questionEntry,
            })
          }
          finishDirectorTurn(directorTurnResolution.dispositionName === 'service_failed')
          return
        }
        const attemptResolution = await archiveDirectorService.attemptInteractivePiece(
          retriableRequest.attemptRequest,
          reportDirectorTurnPhase,
        )
        if (!isRequestStillActive()) {
          return
        }
        await markGenerationCompletedAndWaitForSequence()
        if (!isRequestStillActive()) {
          return
        }
        confirmedTurnAwaitingStaging.current = attemptResolution.confirmedTurn
        changeChronicleState({ kind: 'interactive_piece_attempt_confirmed', attemptResolution })
        verifyConfirmedTurnWasAccepted(attemptResolution.confirmedTurn)
        finishDirectorTurn(false)
      } catch (turnError: unknown) {
        if (isRequestStillActive() && turnError instanceof RemoteDirectorTurnUnavailableError && turnError.failureName === 'state_version_conflict') {
          try {
            const recovery = await recoverRemoteArchiveState()
            if (isRequestStillActive() && recovery) {
              changeChronicleState({ kind: 'archive_recovered', recovery })
              clearPendingArchiveRequest(readRequestActionKey(retriableRequest))
              lastRetriableRequest.current = null
            }
          } catch {
            setIsArchiveRecovered(false)
          }
        }
        if (isRequestStillActive()) {
          await markGenerationCompletedAndWaitForSequence()
        }
        if (isRequestStillActive()) {
          finishDirectorTurn(true, readTurnFailureName(turnError))
        }
      }
    },
    [beginGeneration, changeChronicleState, finishDirectorTurn, markGenerationCompletedAndWaitForSequence, verifyConfirmedTurnWasAccepted],
  )

  const requestReplyDeskFocus = useCallback((focusDetails: Omit<ReplyDeskFocusRequest, 'requestSequenceNumber'>) => {
    referencedInteractivePieceIdentifier.current = focusDetails.referencedInteractivePieceIdentifier
    setReplyDeskFocusRequest((previousRequest) => ({
      ...focusDetails,
      requestSequenceNumber: previousRequest.requestSequenceNumber + 1,
    }))
  }, [])

  const submitInvestigatorPlan = useCallback(
    (planSteps: PlannedActionStep[]) => {
      const latestArchiveRun = readLatestChronicleState().archiveRun
      const currentScenePresentation = latestArchiveRun.currentScenePresentation
      if (
        isDirectorBusy.current ||
        planSteps.length === 0 ||
        !currentScenePresentation ||
        latestArchiveRun.archiveOutcome ||
        isEverythingElseBlockedByOpenDirectorQuestion(latestArchiveRun)
      ) {
        return
      }
      if (planSteps.length > 1 || latestArchiveRun.pendingActionPlan) {
        changeChronicleState({
          kind: 'action_plan_stored',
          pendingActionPlan: planSteps.length > 1 ? { steps: planSteps, executedStepCount: 0 } : null,
        })
      }
      const referencedPieceIdentifier = referencedInteractivePieceIdentifier.current
      referencedInteractivePieceIdentifier.current = null
      void runRetriableDirectorRequest(
        {
          kind: 'investigator_action',
          actionRequest: {
            actionKey: createActionKey(),
            expectedStateVersion: latestArchiveRun.stateVersion,
            sceneIdentifier: currentScenePresentation.sceneIdentifier,
            remainingPlanSteps: planSteps,
            declaredPlanStepCount: planSteps.length,
            alreadyExecutedStepCount: 0,
            isPlayerInsistingAfterDirectorVeto: false,
            referencedInteractivePieceIdentifier: referencedPieceIdentifier,
          },
        },
        false,
      )
    },
    [changeChronicleState, createActionKey, runRetriableDirectorRequest],
  )

  const answerDirectorQuestion = useCallback(
    (questionEntryIdentifier: string, answerOptionIdentifier: string, shouldKeepCurrentReplyDraft = false) => {
      const latestArchiveRun = readLatestChronicleState().archiveRun
      const questionEntry = latestArchiveRun.logEntries.find((logEntry) => logEntry.identifier === questionEntryIdentifier)
      if (isDirectorBusy.current || !questionEntry || questionEntry.voice !== 'director_question') {
        return
      }
      const chosenAnswerOption = questionEntry.answerOptions.find(
        (answerOption) => answerOption.identifier === answerOptionIdentifier,
      )
      if (!chosenAnswerOption || questionEntry.answeredOptionIdentifier !== null) {
        return
      }
      changeChronicleState({ kind: 'director_question_answered', questionEntryIdentifier, answerOptionIdentifier })
      const { pendingActionPlan, currentScenePresentation } = latestArchiveRun
      const lastActionRequest =
        lastRetriableRequest.current?.kind === 'investigator_action'
          ? lastRetriableRequest.current.actionRequest
          : rebuildLastActionRequestFromLog(latestArchiveRun, createActionKey())
      switch (chosenAnswerOption.answerEffectName) {
        case 'continue_pending_plan':
          if (pendingActionPlan && currentScenePresentation) {
            void runRetriableDirectorRequest(
              {
                kind: 'investigator_action',
                actionRequest: {
                  actionKey: createActionKey(),
                  expectedStateVersion: latestArchiveRun.stateVersion,
                  sceneIdentifier: currentScenePresentation.sceneIdentifier,
                  remainingPlanSteps: pendingActionPlan.steps.slice(pendingActionPlan.executedStepCount),
                  declaredPlanStepCount: pendingActionPlan.steps.length,
                  alreadyExecutedStepCount: pendingActionPlan.executedStepCount,
                  isPlayerInsistingAfterDirectorVeto: false,
                  referencedInteractivePieceIdentifier: null,
                },
              },
              false,
            )
          }
          break
        case 'modify_pending_plan':
          requestReplyDeskFocus({
            referencedInteractivePieceIdentifier: null,
            restoredDraftText: null,
            shouldOpenPendingPlanForEditing: true,
          })
          break
        case 'return_to_reply_desk':
          requestReplyDeskFocus({
            referencedInteractivePieceIdentifier: null,
            restoredDraftText: shouldKeepCurrentReplyDraft ? null : (lastActionRequest?.remainingPlanSteps[0]?.actionText ?? null),
            shouldOpenPendingPlanForEditing: false,
          })
          break
        case 'proceed_with_pending_action':
          if (lastActionRequest) {
            void runRetriableDirectorRequest(
              {
                kind: 'investigator_action',
                actionRequest: {
                  ...lastActionRequest,
                  actionKey: createActionKey(),
                  expectedStateVersion: latestArchiveRun.stateVersion,
                  isPlayerInsistingAfterDirectorVeto: true,
                },
              },
              false,
            )
          }
          break
        case 'discard_pending_plan':
          break
      }
    },
    [changeChronicleState, createActionKey, requestReplyDeskFocus, runRetriableDirectorRequest],
  )

  const submitInteractivePieceAttempt = useCallback<ArchiveTurnFlowContextValue['submitInteractivePieceAttempt']>(
    (interactivePieceIdentifier, submittedValue) => {
      const latestArchiveRun = readLatestChronicleState().archiveRun
      if (
        isDirectorBusy.current ||
        latestArchiveRun.archiveOutcome ||
        isEverythingElseBlockedByOpenDirectorQuestion(latestArchiveRun)
      ) {
        return
      }
      void runRetriableDirectorRequest(
        {
          kind: 'interactive_piece_attempt',
          attemptRequest: {
            actionKey: createActionKey(),
            expectedStateVersion: latestArchiveRun.stateVersion,
            interactivePieceIdentifier,
            submittedValue,
          },
        },
        false,
      )
    },
    [createActionKey, runRetriableDirectorRequest],
  )

  const requestInteractivePieceAssistance = useCallback<ArchiveTurnFlowContextValue['requestInteractivePieceAssistance']>(
    (interactivePieceIdentifier, levelName) => {
      if (isDirectorBusy.current) return
      void runRetriableDirectorRequest({
        kind: 'interactive_piece_assistance',
        assistanceRequest: {
          actionKey: createActionKey(),
          expectedStateVersion: readLatestChronicleState().archiveRun.stateVersion,
          interactivePieceIdentifier,
          requestedLevelName: levelName,
          isScopeLimitedToThisPieceConfirmed: true,
        },
      }, false)
    },
    [createActionKey, runRetriableDirectorRequest],
  )

  const setInteractivePieceAside = useCallback(
    (interactivePieceIdentifier: string) => changeChronicleState({ kind: 'interactive_piece_set_aside', interactivePieceIdentifier }),
    [changeChronicleState],
  )

  const focusReplyDeskReferencingInteractivePiece = useCallback(
    (interactivePieceIdentifier: string) =>
      requestReplyDeskFocus({
        referencedInteractivePieceIdentifier: interactivePieceIdentifier,
        restoredDraftText: null,
        shouldOpenPendingPlanForEditing: false,
      }),
    [requestReplyDeskFocus],
  )

  const requestImmediateRevealCompletion = useCallback(() => setIsImmediateCompletionRequested(true), [])

  const acknowledgeStagingEvent = useCallback(
    (acknowledgedEvent: StagingEvent) =>
      setStagingEventSchedule((previousSchedule) =>
        previousSchedule.eventsReadyForStaging.includes(acknowledgedEvent)
          ? {
              ...previousSchedule,
              eventsReadyForStaging: previousSchedule.eventsReadyForStaging.filter(
                (pendingEvent) => pendingEvent !== acknowledgedEvent,
              ),
            }
          : previousSchedule,
      ),
    [],
  )

  const recoverArchive = useCallback(async () => {
    isDirectorBusy.current = true
    setDirectorTurnPhaseName('weighing_action')
    try {
      const recovery = await recoverRemoteArchiveState()
      if (!isProviderMounted.current) return
      if (recovery) changeChronicleState({ kind: 'archive_recovered', recovery })
      const pending = readPendingArchiveRequest()
      const pendingVersion = pending?.kind === 'investigator_action' ? pending.actionRequest.expectedStateVersion
        : pending?.kind === 'interactive_piece_attempt' ? pending.attemptRequest.expectedStateVersion
        : pending?.assistanceRequest.expectedStateVersion
      if (pending && recovery && pendingVersion !== recovery.archiveRun.stateVersion && !recovery.confirmedActionKeys.includes(readRequestActionKey(pending))) {
        clearPendingArchiveRequest(readRequestActionKey(pending))
        lastRetriableRequest.current = null
        setIsArchiveRecovered(true)
        finishDirectorTurn(true, 'state_version_conflict')
        return
      }
      setIsArchiveRecovered(true)
      if (pending && !recovery?.confirmedActionKeys.includes(readRequestActionKey(pending))) {
        lastRetriableRequest.current = pending
        void runRetriableDirectorRequest(pending, true)
      } else {
        if (pending) clearPendingArchiveRequest(readRequestActionKey(pending))
        lastRetriableRequest.current = null
        finishDirectorTurn(false)
      }
    } catch (error) {
      if (isProviderMounted.current) {
        setIsArchiveRecovered(false)
        finishDirectorTurn(true, readTurnFailureName(error))
        isDirectorBusy.current = true
      }
    }
  }, [changeChronicleState, finishDirectorTurn, runRetriableDirectorRequest])

  useEffect(() => {
    void recoverArchive()
  }, [recoverArchive])

  const retrySameAction = useCallback(() => {
    if (!isArchiveRecovered || !lastRetriableRequest.current) {
      void recoverArchive()
    } else {
      void runRetriableDirectorRequest(lastRetriableRequest.current, true)
    }
  }, [isArchiveRecovered, recoverArchive, runRetriableDirectorRequest])

  const isReplyDeskAvailable =
    isArchiveRecovered &&
    archiveRun.currentScenePresentation !== null &&
    archiveRun.archiveOutcome === null &&
    chronicleState.chronicleClosure === null

  const contextValue = useMemo<ArchiveTurnFlowContextValue>(
    () => ({
      directorTurnPhaseName,
      directorWaitStageName,
      generationWaitStageName,
      hasDirectorServiceFailed,
      directorServiceFailureName,
      revealPlaybackState: {
        logEntryIdentifierBeingRevealed: logEntryIdentifiersInRevealQueue[0] ?? null,
        logEntryIdentifiersAwaitingReveal: logEntryIdentifiersInRevealQueue.slice(1),
        isImmediateCompletionRequested,
      },
      pendingStagingEvents: stagingEventSchedule.eventsReadyForStaging,
      isReplyDeskAvailable,
      replyDeskFocusRequest,
      submitInvestigatorPlan,
      answerDirectorQuestion,
      submitInteractivePieceAttempt,
      requestInteractivePieceAssistance,
      setInteractivePieceAside,
      focusReplyDeskReferencingInteractivePiece,
      requestImmediateRevealCompletion,
      reportRevealReachedParagraph,
      reportRevealCompleted,
      acknowledgeStagingEvent,
      retrySameAction,
    }),
    [
      directorTurnPhaseName,
      directorWaitStageName,
      generationWaitStageName,
      hasDirectorServiceFailed,
      directorServiceFailureName,
      logEntryIdentifiersInRevealQueue,
      isImmediateCompletionRequested,
      stagingEventSchedule.eventsReadyForStaging,
      isReplyDeskAvailable,
      replyDeskFocusRequest,
      submitInvestigatorPlan,
      answerDirectorQuestion,
      submitInteractivePieceAttempt,
      requestInteractivePieceAssistance,
      setInteractivePieceAside,
      focusReplyDeskReferencingInteractivePiece,
      requestImmediateRevealCompletion,
      reportRevealReachedParagraph,
      reportRevealCompleted,
      acknowledgeStagingEvent,
      retrySameAction,
    ],
  )

  const openDirectorQuestionEntry = readOpenDirectorQuestionEntry(archiveRun)
  const openDirectorQuestionEntryIdentifier = openDirectorQuestionEntry?.identifier ?? null
  const openDirectorQuestionAnswerCount = openDirectorQuestionEntry?.answerOptions.length ?? 0
  const answerDirectorQuestionKeepingReplyDraft = useCallback(
    (questionEntryIdentifier: string, answerOptionIdentifier: string) =>
      answerDirectorQuestion(questionEntryIdentifier, answerOptionIdentifier, true),
    [answerDirectorQuestion],
  )
  const directorQuestionRuling = useMemo<DirectorQuestionRuling>(
    () => ({
      openDirectorQuestionEntryIdentifier,
      openDirectorQuestionAnswerCount,
      isEverythingElseBlockedByOpenDirectorQuestion:
        doesOpenDirectorQuestionBlockEverythingElse && openDirectorQuestionEntryIdentifier !== null,
      answerDirectorQuestionKeepingReplyDraft,
    }),
    [answerDirectorQuestionKeepingReplyDraft, openDirectorQuestionAnswerCount, openDirectorQuestionEntryIdentifier],
  )

  const pendingInvestigatorDeclaration = useMemo<PendingInvestigatorDeclaration | null>(
    () => (pendingDeclaration ? { ...pendingDeclaration, hasDirectorFailedToAnswer: hasDirectorServiceFailed } : null),
    [hasDirectorServiceFailed, pendingDeclaration],
  )

  return (
    <ArchiveTurnFlowContext.Provider value={contextValue}>
      <PendingInvestigatorDeclarationContext.Provider value={pendingInvestigatorDeclaration}>
        <DirectorQuestionRulingContext.Provider value={directorQuestionRuling}>{children}</DirectorQuestionRulingContext.Provider>
      </PendingInvestigatorDeclarationContext.Provider>
    </ArchiveTurnFlowContext.Provider>
  )
}

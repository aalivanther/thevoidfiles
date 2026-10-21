import { ArrowCounterClockwise, PaperPlaneRight, Plus, Stack, Trash } from '@phosphor-icons/react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { chooseAnimationVariantName } from '../../../animation/animation_variety'
import { useInteractionFeedback } from '../../../audio/interaction_feedback'
import { replyDeskCopy } from '../../../copy/archive_chat_engine/reply_desk_copy'
import type { IntentionFacetName } from '../../../copy/archive_chat_engine/reply_desk_copy'
import { maximumPlanStepsExecutedPerDirectorBatch } from '../../../game_state/archive_turn_contract'
import type {
  ArchiveScenePresentation,
  PendingActionPlan,
  PlannedActionStep,
} from '../../../game_state/archive_turn_contract'
import { canInvestigatorAffordResourceCost } from '../../../game_state/chronicle_state'
import type { InvestigatorState } from '../../../game_state/chronicle_state'
import { usePlayerSettings } from '../../../settings/player_settings'
import { useArchiveTurnFlow } from '../archive_turn_flow_context'
import { ActionPlanStrip } from './ActionPlanStrip'
import { IntentionFacetChips } from './IntentionFacetChips'
import { PendingPlanSummary } from './PendingPlanSummary'
import { ResourceCostLedgerSlip } from './ResourceCostLedgerSlip'
import type { ResourceCostLedgerSlipVariantName } from './ResourceCostLedgerSlip'
import { recogniseFreePlanText } from './free_plan_text_recognition'
import { intentionFacetNamesInOrder } from './intention_facet_names'
import { readSpentAmountsByResourceKey, totalResourceCostsOfPlanSteps } from './plan_resource_cost_totals'
import { useReplyDraft } from './reply_draft_context'
import type { NewPlanStepDescription } from './reply_draft_context'
import { useSuggestionNumberKeys } from './use_suggestion_number_keys'

export type ReplyDeskProperties = {
  scenePresentation: ArchiveScenePresentation | null
  investigator: InvestigatorState
  pendingActionPlan: PendingActionPlan | null
}

type SentReplySlipVariantName = 'filed_straight_up' | 'filed_tilted_left' | 'filed_tilted_right'

type DraftFieldGrowthVariantName = 'spring_settle' | 'paper_unroll' | 'carriage_knock'

type SentReplySlip = {
  slipSequenceNumber: number
  slipText: string
  variantName: SentReplySlipVariantName
}

const maximumDraftLength = 600
const remainingCharacterCountThatShowsCounter = 80
const keyPulseDurationMilliseconds = 120
const rejectionShakeDurationMilliseconds = 340
const sentReplySlipDurationMilliseconds = 520
const sentReplySlipVariantNames: readonly SentReplySlipVariantName[] = [
  'filed_straight_up',
  'filed_tilted_left',
  'filed_tilted_right',
]
const resourceCostLedgerSlipVariantNames: readonly ResourceCostLedgerSlipVariantName[] = [
  'slip_tilted_left',
  'slip_tilted_right',
  'slip_dropped_flat',
]
const draftFieldGrowthDurationMilliseconds = 320
const draftFieldBorderHeightInPixels = 4
const minimumGrowthInPixelsThatAnimates = 12
const compactLayoutMediaQuery = '(max-width: 639.98px)'
const draftFieldGrowthVariantNames: readonly DraftFieldGrowthVariantName[] = ['spring_settle', 'paper_unroll', 'carriage_knock']
const objectiveIndicatedPattern = /\bpara\s+\S/iu

function describePlanSignature(planSteps: PlannedActionStep[]): string {
  return planSteps
    .map((planStep) => `${planStep.stepIdentifier}:${planStep.actionText}:${planStep.conditionText ?? ''}`)
    .join('|')
}

export function ReplyDesk({ scenePresentation, investigator, pendingActionPlan }: ReplyDeskProperties) {
  const playInteractionFeedback = useInteractionFeedback()
  const { playerSettings, shouldReduceMotion } = usePlayerSettings()
  const { directorTurnPhaseName, isReplyDeskAvailable, replyDeskFocusRequest, submitInvestigatorPlan } = useArchiveTurnFlow()
  const {
    draftText,
    declaredPlanSteps,
    canUndoReferenceConversion,
    sentReplyRecords,
    planAnnouncement,
    changeDraftText,
    toggleSuggestedActionInPlan,
    addOwnWordsStepToPlan,
    replaceDeclaredPlanSteps,
    convertDraftIntoPlanSteps,
    undoReferenceConversion,
    restoreSentReplyRecord,
    rememberSentReply,
    clearReplyDraft,
  } = useReplyDraft()
  const [rejectionMessage, setRejectionMessage] = useState<string | null>(null)
  const [informationMessage, setInformationMessage] = useState<string | null>(null)
  const [planSignatureAwaitingCostConfirmation, setPlanSignatureAwaitingCostConfirmation] = useState<string | null>(null)
  const [resourceCostLedgerSlipVariantName, setResourceCostLedgerSlipVariantName] =
    useState<ResourceCostLedgerSlipVariantName>('slip_dropped_flat')
  const [openFacetName, setOpenFacetName] = useState<IntentionFacetName | null>(null)
  const [isRefinementSheetOpen, setIsRefinementSheetOpen] = useState(false)
  const [insertedFragmentByFacetName, setInsertedFragmentByFacetName] = useState<Partial<Record<IntentionFacetName, string>>>({})
  const [browsedSentReplyIndex, setBrowsedSentReplyIndex] = useState<number | null>(null)
  const [isKeyPulseActive, setIsKeyPulseActive] = useState(false)
  const [isRejectionShakeActive, setIsRejectionShakeActive] = useState(false)
  const [sentReplySlip, setSentReplySlip] = useState<SentReplySlip | null>(null)
  const replyDeskElement = useRef<HTMLElement>(null)
  const draftField = useRef<HTMLTextAreaElement>(null)
  const pendingCaretPosition = useRef<number | null>(null)
  const handledFocusRequestSequenceNumber = useRef(replyDeskFocusRequest.requestSequenceNumber)
  const keyPulseTimer = useRef<number | null>(null)
  const rejectionShakeTimer = useRef<number | null>(null)
  const sentReplySlipTimer = useRef<number | null>(null)
  const sentReplySlipCount = useRef(0)
  const draftFieldGrowthTimer = useRef<number | null>(null)
  const previousDraftFieldHeight = useRef<number | null>(null)

  useEffect(
    () => () => {
      for (const activeTimer of [
        keyPulseTimer.current,
        rejectionShakeTimer.current,
        sentReplySlipTimer.current,
        draftFieldGrowthTimer.current,
      ]) {
        if (activeTimer !== null) {
          window.clearTimeout(activeTimer)
        }
      }
    },
    [],
  )

  useEffect(() => {
    if (handledFocusRequestSequenceNumber.current === replyDeskFocusRequest.requestSequenceNumber) {
      return
    }
    handledFocusRequestSequenceNumber.current = replyDeskFocusRequest.requestSequenceNumber
    if (replyDeskFocusRequest.restoredDraftText !== null) {
      changeDraftText(replyDeskFocusRequest.restoredDraftText.slice(0, maximumDraftLength))
    }
    if (replyDeskFocusRequest.shouldOpenPendingPlanForEditing && pendingActionPlan) {
      replaceDeclaredPlanSteps(pendingActionPlan.steps.slice(pendingActionPlan.executedStepCount))
    }
    draftField.current?.focus()
  }, [replyDeskFocusRequest, pendingActionPlan, changeDraftText, replaceDeclaredPlanSteps])

  const isDeskRendered = scenePresentation !== null && isReplyDeskAvailable

  useLayoutEffect(() => {
    const replyDesk = replyDeskElement.current
    const replyDeskDock = replyDesk?.closest<HTMLElement>('.archive-reply-desk-dock') ?? null
    const dockContainer = replyDeskDock?.parentElement ?? null
    if (!replyDesk || !replyDeskDock || !dockContainer || typeof ResizeObserver === 'undefined') {
      return
    }
    const writeAvailableHeight = () => {
      const dockStyle = window.getComputedStyle(replyDeskDock)
      const maximumHeightFraction = dockStyle.maxHeight.endsWith('%') ? Number.parseFloat(dockStyle.maxHeight) / 100 : Number.NaN
      if (!Number.isFinite(maximumHeightFraction) || dockContainer.clientHeight === 0) {
        replyDesk.style.removeProperty('--reply-desk-available-height')
        return
      }
      const dockFrameHeight =
        Number.parseFloat(dockStyle.paddingTop) + Number.parseFloat(dockStyle.paddingBottom) + Number.parseFloat(dockStyle.borderTopWidth)
      const availableHeight = Math.floor(dockContainer.clientHeight * maximumHeightFraction - dockFrameHeight)
      replyDesk.style.setProperty('--reply-desk-available-height', `${Math.max(0, availableHeight)}px`)
    }
    writeAvailableHeight()
    const dockContainerSizeObserver = new ResizeObserver(writeAvailableHeight)
    dockContainerSizeObserver.observe(dockContainer)
    return () => {
      dockContainerSizeObserver.disconnect()
      replyDesk.style.removeProperty('--reply-desk-available-height')
    }
  }, [isDeskRendered])

  useLayoutEffect(() => {
    const draftFieldElement = draftField.current
    if (!draftFieldElement) {
      return
    }
    if (draftText.length === 0) {
      draftFieldElement.style.height = ''
    } else {
      draftFieldElement.style.height = 'auto'
      draftFieldElement.style.height = `${draftFieldElement.scrollHeight + draftFieldBorderHeightInPixels}px`
    }
    const settledHeight = draftFieldElement.offsetHeight
    const heightBeforeChange = previousDraftFieldHeight.current
    previousDraftFieldHeight.current = settledHeight
    const shouldAnimateGrowth =
      heightBeforeChange !== null &&
      settledHeight - heightBeforeChange >= minimumGrowthInPixelsThatAnimates &&
      !shouldReduceMotion &&
      playerSettings.screenEffectsIntensity !== 'minimal'
    if (shouldAnimateGrowth) {
      if (draftFieldGrowthTimer.current !== null) {
        window.clearTimeout(draftFieldGrowthTimer.current)
      }
      delete draftFieldElement.dataset.growthVariant
      draftFieldElement.style.setProperty('--draft-field-height-before-growth', `${heightBeforeChange}px`)
      draftFieldElement.style.setProperty('--draft-field-height-after-growth', `${settledHeight}px`)
      void draftFieldElement.offsetHeight
      draftFieldElement.dataset.growthVariant = chooseAnimationVariantName('reply_desk_draft_field_growth', draftFieldGrowthVariantNames)
      draftFieldGrowthTimer.current = window.setTimeout(() => {
        draftFieldGrowthTimer.current = null
        delete draftFieldElement.dataset.growthVariant
      }, draftFieldGrowthDurationMilliseconds)
    }
    if (pendingCaretPosition.current !== null) {
      draftFieldElement.setSelectionRange(pendingCaretPosition.current, pendingCaretPosition.current)
      pendingCaretPosition.current = null
    }
  }, [draftText, isDeskRendered, shouldReduceMotion, playerSettings.screenEffectsIntensity])

  const suggestedActions = useMemo(() => scenePresentation?.suggestedActions ?? [], [scenePresentation])
  const freePlanTextRecognition = useMemo(
    () => recogniseFreePlanText(draftText, suggestedActions.length),
    [draftText, suggestedActions.length],
  )
  const isDirectorBusy = directorTurnPhaseName !== 'idle'
  const isDeskUsable = scenePresentation !== null && isReplyDeskAvailable
  const trimmedDraftText = draftText.trim()
  const isDigitOnlyDraft = /^\d{1,2}$/u.test(trimmedDraftText)
  const ownWordsLetterCount = [...trimmedDraftText].filter((character) => /\p{L}/u.test(character)).length
  const shouldAppendOwnWordsDraft =
    trimmedDraftText.length > 0 && !isDigitOnlyDraft && (declaredPlanSteps.length === 0 || ownWordsLetterCount >= 8)

  const stepsReadyToSend = useMemo<PlannedActionStep[]>(() => {
    if (
      isDigitOnlyDraft &&
      declaredPlanSteps.length === 0 &&
      suggestedActions[Number.parseInt(trimmedDraftText, 10) - 1]
    ) {
      const numberedSuggestedAction = suggestedActions[Number.parseInt(trimmedDraftText, 10) - 1]
      return [
        {
          stepIdentifier: `plan_step_${numberedSuggestedAction.identifier}`,
          actionText: numberedSuggestedAction.visibleText,
          conditionText: null,
          originSuggestedActionIdentifier: numberedSuggestedAction.identifier,
          wasTextEditedByPlayer: false,
          declaredResourceCost: numberedSuggestedAction.resourceCost,
        },
      ]
    }
    if (shouldAppendOwnWordsDraft) {
      return [
        ...declaredPlanSteps,
        {
          stepIdentifier: `plan_step_own_words_${declaredPlanSteps.length + 1}`,
          actionText: trimmedDraftText,
          conditionText: null,
          originSuggestedActionIdentifier: null,
          wasTextEditedByPlayer: false,
          declaredResourceCost: null,
        },
      ]
    }
    return declaredPlanSteps
  }, [declaredPlanSteps, isDigitOnlyDraft, shouldAppendOwnWordsDraft, suggestedActions, trimmedDraftText])
  const firstBatchCostTotals = totalResourceCostsOfPlanSteps(
    stepsReadyToSend.slice(0, maximumPlanStepsExecutedPerDirectorBatch),
    investigator,
  )
  const laterBatchesCostTotals = totalResourceCostsOfPlanSteps(
    stepsReadyToSend.slice(maximumPlanStepsExecutedPerDirectorBatch),
    investigator,
    readSpentAmountsByResourceKey(firstBatchCostTotals),
  )
  const wholePlanCostTotals = totalResourceCostsOfPlanSteps(stepsReadyToSend, investigator)
  const isCostAwaitingConfirmation =
    planSignatureAwaitingCostConfirmation !== null &&
    wholePlanCostTotals.length > 0 &&
    planSignatureAwaitingCostConfirmation === describePlanSignature(stepsReadyToSend)

  const rejectWithMessage = useCallback(
    (message: string) => {
      setRejectionMessage(message)
      setInformationMessage(null)
      playInteractionFeedback('rejection')
      if (rejectionShakeTimer.current !== null) {
        window.clearTimeout(rejectionShakeTimer.current)
      }
      setIsRejectionShakeActive(true)
      rejectionShakeTimer.current = window.setTimeout(() => {
        rejectionShakeTimer.current = null
        setIsRejectionShakeActive(false)
      }, rejectionShakeDurationMilliseconds)
    },
    [playInteractionFeedback],
  )

  const forgetPendingConfirmation = useCallback(() => {
    setPlanSignatureAwaitingCostConfirmation(null)
    setRejectionMessage(null)
  }, [])

  const convertRecognisedDraftIntoPlanSteps = (informationMessageAfterConversion: string) => {
    const unaffordableSuggestionNumbers: number[] = []
    const newPlanStepDescriptions = freePlanTextRecognition.fragments.flatMap<NewPlanStepDescription>((recognisedFragment) => {
      if (recognisedFragment.kind === 'own_words') {
        return [
          {
            actionText: recognisedFragment.actionText,
            conditionText: recognisedFragment.conditionText,
            originSuggestedAction: null,
          },
        ]
      }
      const referencedSuggestedAction = suggestedActions[recognisedFragment.suggestionNumber - 1]
      if (!referencedSuggestedAction) {
        return []
      }
      if (!canInvestigatorAffordResourceCost(investigator, referencedSuggestedAction.resourceCost)) {
        unaffordableSuggestionNumbers.push(recognisedFragment.suggestionNumber)
        return []
      }
      return [
        {
          actionText: referencedSuggestedAction.visibleText,
          conditionText: recognisedFragment.conditionText,
          originSuggestedAction: referencedSuggestedAction,
        },
      ]
    })
    convertDraftIntoPlanSteps(newPlanStepDescriptions)
    forgetPendingConfirmation()
    setBrowsedSentReplyIndex(null)
    playInteractionFeedback('pen_scratch')
    setInformationMessage(
      unaffordableSuggestionNumbers.length > 0
        ? `${informationMessageAfterConversion} ${replyDeskCopy.unaffordableReferencesNotice(unaffordableSuggestionNumbers)}`
        : informationMessageAfterConversion,
    )
  }

  const addDraftToPlanAsStep = () => {
    if (freePlanTextRecognition.referencedSuggestionNumbers.length > 0) {
      convertRecognisedDraftIntoPlanSteps(replyDeskCopy.referencesConvertedNotice)
      return
    }
    if (trimmedDraftText.length === 0) {
      rejectWithMessage(replyDeskCopy.emptyDraftCannotBecomeStepRejection)
      draftField.current?.focus()
      return
    }
    playInteractionFeedback('option_click')
    addOwnWordsStepToPlan(trimmedDraftText, null)
    forgetPendingConfirmation()
    setInformationMessage(null)
    setBrowsedSentReplyIndex(null)
    draftField.current?.focus()
  }

  const showSentReplySlip = (slipText: string) => {
    if (shouldReduceMotion || playerSettings.screenEffectsIntensity === 'minimal') {
      return
    }
    if (sentReplySlipTimer.current !== null) {
      window.clearTimeout(sentReplySlipTimer.current)
    }
    sentReplySlipCount.current += 1
    setSentReplySlip({
      slipSequenceNumber: sentReplySlipCount.current,
      slipText,
      variantName: chooseAnimationVariantName('reply_desk_sent_reply_slip', sentReplySlipVariantNames),
    })
    sentReplySlipTimer.current = window.setTimeout(() => {
      sentReplySlipTimer.current = null
      setSentReplySlip(null)
    }, sentReplySlipDurationMilliseconds)
  }

  const attemptToSendReply = () => {
    if (isDirectorBusy) {
      return
    }
    if (freePlanTextRecognition.referencedSuggestionNumbers.length > 0) {
      convertRecognisedDraftIntoPlanSteps(replyDeskCopy.referencesConvertedOnSendNotice)
      return
    }
    if (stepsReadyToSend.length === 0) {
      rejectWithMessage(replyDeskCopy.emptyActionRejection)
      draftField.current?.focus()
      return
    }
    const emptyStepIndex = stepsReadyToSend.findIndex((planStep) => planStep.actionText.trim().length === 0)
    if (emptyStepIndex >= 0) {
      rejectWithMessage(replyDeskCopy.emptyPlanStepRejection(emptyStepIndex + 1))
      return
    }
    const unaffordableCostTotal = wholePlanCostTotals.find((resourceCostTotal) => !resourceCostTotal.isAffordable)
    if (unaffordableCostTotal) {
      rejectWithMessage(replyDeskCopy.planExceedsResourcesRejection(unaffordableCostTotal.resourceVisibleName.toLowerCase()))
      return
    }
    if (wholePlanCostTotals.length > 0 && !isCostAwaitingConfirmation) {
      setResourceCostLedgerSlipVariantName(
        chooseAnimationVariantName('reply_desk_resource_cost_ledger_slip', resourceCostLedgerSlipVariantNames),
      )
      setPlanSignatureAwaitingCostConfirmation(describePlanSignature(stepsReadyToSend))
      setRejectionMessage(null)
      setInformationMessage(null)
      playInteractionFeedback('panel_open')
      return
    }
    const normalisedPlanSteps = stepsReadyToSend.map((planStep) => ({
      ...planStep,
      actionText: planStep.actionText.trim(),
      conditionText: planStep.conditionText && planStep.conditionText.trim().length > 0 ? planStep.conditionText.trim() : null,
    }))
    playInteractionFeedback(isCostAwaitingConfirmation ? 'confirmation' : 'action_sent')
    rememberSentReply({ draftText, declaredPlanSteps })
    showSentReplySlip(normalisedPlanSteps.map((planStep) => planStep.actionText).join(' · '))
    setPlanSignatureAwaitingCostConfirmation(null)
    setRejectionMessage(null)
    setInformationMessage(null)
    setBrowsedSentReplyIndex(null)
    setInsertedFragmentByFacetName({})
    submitInvestigatorPlan(normalisedPlanSteps)
    clearReplyDraft()
    draftField.current?.focus()
  }

  const dismissCostConfirmation = () => {
    playInteractionFeedback('panel_close')
    setPlanSignatureAwaitingCostConfirmation(null)
    draftField.current?.focus()
  }

  const insertFacetFragmentAtCaret = (facetName: IntentionFacetName, insertedFragment: string) => {
    const draftFieldElement = draftField.current
    const caretStartIndex = draftFieldElement ? draftFieldElement.selectionStart : draftText.length
    const caretEndIndex = draftFieldElement ? draftFieldElement.selectionEnd : draftText.length
    const textBeforeCaret = draftText.slice(0, caretStartIndex)
    const textAfterCaret = draftText.slice(caretEndIndex)
    const leadingSpace = textBeforeCaret.length > 0 && !/\s$/u.test(textBeforeCaret) ? ' ' : ''
    const trailingSpace = textAfterCaret.length > 0 && !/^\s/u.test(textAfterCaret) && !/\s$/u.test(insertedFragment) ? ' ' : ''
    const nextDraftText = `${textBeforeCaret}${leadingSpace}${insertedFragment}${trailingSpace}${textAfterCaret}`
    if (nextDraftText.length > maximumDraftLength) {
      rejectWithMessage(replyDeskCopy.remainingCharactersNotice(Math.max(0, maximumDraftLength - draftText.length)))
      return
    }
    pendingCaretPosition.current = textBeforeCaret.length + leadingSpace.length + insertedFragment.length
    setInsertedFragmentByFacetName((previousFragments) => ({ ...previousFragments, [facetName]: insertedFragment }))
    changeDraftText(nextDraftText)
    forgetPendingConfirmation()
    setOpenFacetName(null)
    setIsRefinementSheetOpen(false)
    window.setTimeout(() => draftField.current?.focus(), 0)
  }

  const focusDraftField = () => {
    draftField.current?.focus()
  }

  const changeRefinementSheetOpen = (isOpen: boolean) => {
    setIsRefinementSheetOpen(isOpen)
    if (!isOpen) {
      setOpenFacetName(null)
    }
  }

  const browseSentReplies = (browsingStep: -1 | 1): boolean => {
    if (browsingStep === -1) {
      const isDeskEmpty = draftText.length === 0 && declaredPlanSteps.length === 0
      if ((!isDeskEmpty && browsedSentReplyIndex === null) || sentReplyRecords.length === 0) {
        return false
      }
      const nextBrowsedIndex = (browsedSentReplyIndex ?? sentReplyRecords.length) - 1
      if (nextBrowsedIndex < 0) {
        return true
      }
      restoreSentReplyRecord(sentReplyRecords[nextBrowsedIndex])
      setBrowsedSentReplyIndex(nextBrowsedIndex)
      setInformationMessage(replyDeskCopy.restoredFromHistoryNotice)
      playInteractionFeedback('panel_open', { volumeMultiplier: 0.5 })
      return true
    }
    if (browsedSentReplyIndex === null) {
      return false
    }
    const nextBrowsedIndex = browsedSentReplyIndex + 1
    if (nextBrowsedIndex >= sentReplyRecords.length) {
      clearReplyDraft()
      setBrowsedSentReplyIndex(null)
      setInformationMessage(null)
    } else {
      restoreSentReplyRecord(sentReplyRecords[nextBrowsedIndex])
      setBrowsedSentReplyIndex(nextBrowsedIndex)
    }
    playInteractionFeedback('panel_close', { volumeMultiplier: 0.5 })
    return true
  }

  const handleDraftFieldKeyDown = (keyboardEvent: KeyboardEvent<HTMLTextAreaElement>) => {
    if (keyboardEvent.nativeEvent.isComposing) {
      return
    }
    if (keyboardEvent.key === 'Enter' && (keyboardEvent.ctrlKey || keyboardEvent.metaKey)) {
      keyboardEvent.preventDefault()
      addDraftToPlanAsStep()
      return
    }
    if (keyboardEvent.key === 'Enter' && !keyboardEvent.shiftKey) {
      keyboardEvent.preventDefault()
      attemptToSendReply()
      return
    }
    if (keyboardEvent.key === 'Escape' && isCostAwaitingConfirmation) {
      keyboardEvent.preventDefault()
      dismissCostConfirmation()
      return
    }
    if (keyboardEvent.altKey && !keyboardEvent.ctrlKey && !keyboardEvent.metaKey) {
      const facetDigitMatch = /^Digit([1-5])$/u.exec(keyboardEvent.code)
      if (facetDigitMatch) {
        keyboardEvent.preventDefault()
        playInteractionFeedback('panel_open')
        if (typeof window.matchMedia === 'function' && window.matchMedia(compactLayoutMediaQuery).matches) {
          setIsRefinementSheetOpen(true)
        }
        setOpenFacetName(intentionFacetNamesInOrder[Number.parseInt(facetDigitMatch[1], 10) - 1])
      }
      return
    }
    if (keyboardEvent.key === 'ArrowUp' && browseSentReplies(-1)) {
      keyboardEvent.preventDefault()
      return
    }
    if (keyboardEvent.key === 'ArrowDown' && browseSentReplies(1)) {
      keyboardEvent.preventDefault()
    }
  }

  useSuggestionNumberKeys(isDeskUsable, (suggestionNumber) => {
    const suggestedAction = suggestedActions[suggestionNumber - 1]
    if (!suggestedAction) {
      return
    }
    const isAlreadyInPlan = declaredPlanSteps.some(
      (planStep) => planStep.originSuggestedActionIdentifier === suggestedAction.identifier,
    )
    if (!isAlreadyInPlan && !canInvestigatorAffordResourceCost(investigator, suggestedAction.resourceCost)) {
      rejectWithMessage(replyDeskCopy.insufficientResourceExplanation)
      return
    }
    playInteractionFeedback(isAlreadyInPlan ? 'panel_close' : 'option_click')
    toggleSuggestedActionInPlan(suggestedAction, suggestionNumber)
    forgetPendingConfirmation()
  })

  if (!scenePresentation || !isReplyDeskAvailable) {
    return null
  }

  const remainingCharacterCount = maximumDraftLength - draftText.length
  const indicatedFacetNames = intentionFacetNamesInOrder.filter((facetName) => {
    const insertedFragment = insertedFragmentByFacetName[facetName]
    if (!insertedFragment) {
      return false
    }
    return facetName === 'objective' ? objectiveIndicatedPattern.test(draftText) : draftText.includes(insertedFragment.trim())
  })
  const hasRecognisedReferences = freePlanTextRecognition.referencedSuggestionNumbers.length > 0
  const isPendingPlanVisible =
    declaredPlanSteps.length === 0 &&
    pendingActionPlan !== null &&
    pendingActionPlan.executedStepCount < pendingActionPlan.steps.length
  const isPapersAreaEmpty =
    !isPendingPlanVisible &&
    declaredPlanSteps.length === 0 &&
    !hasRecognisedReferences &&
    !canUndoReferenceConversion &&
    !isCostAwaitingConfirmation
  const sendButtonText = stepsReadyToSend.length > 1 ? replyDeskCopy.sendPlanButton : replyDeskCopy.sendActionButton
  const isDeskEmpty = draftText.length === 0 && declaredPlanSteps.length === 0
  const noticeText =
    rejectionMessage ??
    informationMessage ??
    (isCostAwaitingConfirmation
      ? replyDeskCopy.costAwaitingConfirmationNotice
      : isDirectorBusy
        ? replyDeskCopy.directorBusyNotice
        : replyDeskFocusRequest.referencedInteractivePieceIdentifier
          ? replyDeskCopy.referencedInteractivePieceNotice
          : remainingCharacterCount < remainingCharacterCountThatShowsCounter
            ? replyDeskCopy.remainingCharactersNotice(remainingCharacterCount)
            : null)

  return (
    <section ref={replyDeskElement} className="reply-desk" aria-label={replyDeskCopy.replyDeskLabel}>
      <p className="visually-hidden-text" aria-live="polite">
        {planAnnouncement.announcementText}
      </p>
      {sentReplySlip ? (
        <p
          key={sentReplySlip.slipSequenceNumber}
          className="reply-desk-sent-slip"
          data-variant={sentReplySlip.variantName}
          aria-hidden="true"
        >
          {sentReplySlip.slipText}
        </p>
      ) : null}
      <div className="reply-desk-papers" data-is-empty={isPapersAreaEmpty ? 'true' : 'false'}>
        {isPendingPlanVisible && pendingActionPlan ? (
          <PendingPlanSummary
            pendingActionPlan={pendingActionPlan}
            onModificationRequested={() => {
              playInteractionFeedback('panel_open')
              replaceDeclaredPlanSteps(pendingActionPlan.steps.slice(pendingActionPlan.executedStepCount))
              draftField.current?.focus()
            }}
          />
        ) : null}
        {declaredPlanSteps.length > 0 ? (
          <ActionPlanStrip
            declaredPlanSteps={declaredPlanSteps}
            suggestedActions={suggestedActions}
            onPlanChanged={forgetPendingConfirmation}
          />
        ) : null}
        {hasRecognisedReferences || canUndoReferenceConversion ? (
          <div className="reply-desk-recognition" data-kind={hasRecognisedReferences ? 'recognised' : 'converted'}>
            <Stack size={16} weight="bold" aria-hidden="true" />
            <p className="reply-desk-recognition-text">
              {hasRecognisedReferences
                ? replyDeskCopy.recognisedReferencesNotice(freePlanTextRecognition.referencedSuggestionNumbers)
                : replyDeskCopy.referencesConvertedNotice}
            </p>
            {hasRecognisedReferences ? (
              <button
                type="button"
                className="quiet-action-button reply-desk-recognition-button"
                onClick={() => convertRecognisedDraftIntoPlanSteps(replyDeskCopy.referencesConvertedNotice)}
              >
                {replyDeskCopy.convertReferencesButton}
              </button>
            ) : (
              <button
                type="button"
                className="quiet-action-button reply-desk-recognition-button"
                onClick={() => {
                  playInteractionFeedback('panel_close')
                  undoReferenceConversion()
                  setInformationMessage(replyDeskCopy.conversionUndoneNotice)
                  draftField.current?.focus()
                }}
              >
                <ArrowCounterClockwise size={16} weight="bold" aria-hidden="true" />
                {replyDeskCopy.undoConversionButton}
              </button>
            )}
          </div>
        ) : null}
        {isCostAwaitingConfirmation ? (
          <ResourceCostLedgerSlip
            firstBatchCostTotals={firstBatchCostTotals}
            laterBatchesCostTotals={laterBatchesCostTotals}
            variantName={resourceCostLedgerSlipVariantName}
            isConfirmationDisabled={isDirectorBusy}
            onConfirmed={attemptToSendReply}
            onDismissed={dismissCostConfirmation}
          />
        ) : null}
      </div>
      <div className="reply-desk-composer">
        <label htmlFor="reply-desk-draft-field" className="visually-hidden-text">
          {replyDeskCopy.draftFieldLabel}
        </label>
        <textarea
          id="reply-desk-draft-field"
          ref={draftField}
          className={[
            'free-action-field reply-desk-draft-field',
            isKeyPulseActive ? 'free-action-field-key-pulse' : '',
            isRejectionShakeActive ? 'rejection-shake' : '',
          ].join(' ')}
          rows={1}
          value={draftText}
          maxLength={maximumDraftLength}
          placeholder={
            declaredPlanSteps.length > 0 ? replyDeskCopy.draftFieldPlaceholderWithPlan : replyDeskCopy.draftFieldPlaceholder
          }
          aria-describedby="reply-desk-notices"
          aria-keyshortcuts="Enter Control+Enter"
          autoComplete="off"
          spellCheck
          enterKeyHint="send"
          onChange={(changeEvent) => {
            if (changeEvent.target.value.length > draftText.length) {
              playInteractionFeedback('typewriter_key')
              if (!shouldReduceMotion) {
                if (keyPulseTimer.current !== null) {
                  window.clearTimeout(keyPulseTimer.current)
                }
                setIsKeyPulseActive(true)
                keyPulseTimer.current = window.setTimeout(() => {
                  keyPulseTimer.current = null
                  setIsKeyPulseActive(false)
                }, keyPulseDurationMilliseconds)
              }
            }
            forgetPendingConfirmation()
            setInformationMessage(null)
            setBrowsedSentReplyIndex(null)
            changeDraftText(changeEvent.target.value.slice(0, maximumDraftLength))
          }}
          onKeyDown={handleDraftFieldKeyDown}
        />
        <IntentionFacetChips
          presentationName="refinement_sheet"
          isRefinementSheetOpen={isRefinementSheetOpen}
          scenePresentation={scenePresentation}
          investigator={investigator}
          openFacetName={openFacetName}
          indicatedFacetNames={indicatedFacetNames}
          onOpenFacetChanged={setOpenFacetName}
          onRefinementSheetOpenChanged={changeRefinementSheetOpen}
          onRefinementSheetClosedFocusRequested={focusDraftField}
          onFragmentChosen={insertFacetFragmentAtCaret}
        />
        <button
          type="button"
          className="primary-action-button reply-desk-send-button"
          disabled={isDirectorBusy}
          aria-label={sendButtonText}
          onClick={attemptToSendReply}
        >
          <PaperPlaneRight size={22} weight="fill" aria-hidden="true" />
          <span className="reply-desk-send-button-text">{sendButtonText}</span>
        </button>
      </div>
      <div className="reply-desk-secondary-row" data-is-desk-empty={isDeskEmpty ? 'true' : 'false'}>
        <IntentionFacetChips
          presentationName="visible_row"
          isRefinementSheetOpen={isRefinementSheetOpen}
          onRefinementSheetOpenChanged={changeRefinementSheetOpen}
          onRefinementSheetClosedFocusRequested={focusDraftField}
          scenePresentation={scenePresentation}
          investigator={investigator}
          openFacetName={openFacetName}
          indicatedFacetNames={indicatedFacetNames}
          onOpenFacetChanged={setOpenFacetName}
          onFragmentChosen={insertFacetFragmentAtCaret}
        />
        <div className="reply-desk-secondary-actions">
          <button
            type="button"
            className="quiet-action-button"
            disabled={trimmedDraftText.length === 0}
            aria-keyshortcuts="Control+Enter"
            title={replyDeskCopy.addDraftAsStepShortcutHint}
            onClick={addDraftToPlanAsStep}
          >
            <Plus size={16} weight="bold" aria-hidden="true" />
            {replyDeskCopy.addDraftAsStepButton}
          </button>
          <button
            type="button"
            className="quiet-action-button"
            disabled={isDeskEmpty}
            onClick={() => {
              playInteractionFeedback('panel_close')
              clearReplyDraft()
              forgetPendingConfirmation()
              setInformationMessage(null)
              setBrowsedSentReplyIndex(null)
              setInsertedFragmentByFacetName({})
              draftField.current?.focus()
            }}
          >
            <Trash size={16} weight="bold" aria-hidden="true" />
            {replyDeskCopy.clearDraftButton}
          </button>
        </div>
      </div>
      <p
        id="reply-desk-notices"
        className="reply-desk-notices"
        data-kind={rejectionMessage ? 'rejection' : 'information'}
        data-has-notice={noticeText === null ? 'false' : 'true'}
        aria-live="polite"
      >
        {noticeText ?? <span className="reply-desk-keyboard-help">{replyDeskCopy.keyboardHelpNotice}</span>}
      </p>
    </section>
  )
}

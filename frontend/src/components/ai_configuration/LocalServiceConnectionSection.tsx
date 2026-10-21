import {
  ArrowsClockwise,
  CheckCircle,
  CircleDashed,
  Eye,
  EyeSlash,
  Flask,
  FloppyDisk,
  PlugsConnected,
  Trash,
  WarningCircle,
} from '@phosphor-icons/react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { CSSProperties, FormEvent, PointerEvent as ReactPointerEvent } from 'react'
import { useInteractionFeedback } from '../../audio/interaction_feedback'
import { aiConfigurationCopy } from '../../copy/ai_configuration_copy'
import type { AiRoleName } from '../../demonstration/ai_configuration_data'
import {
  readStoredAccessKeyDescriptions,
  removeAccessKeyThroughGameService,
  saveAccessKeyThroughGameService,
} from '../../game_service/access_key_requests'
import type { AccessKeyName, StoredAccessKeyDescription } from '../../game_service/access_key_requests'
import {
  checkStoryConnectionThroughGameService,
  readDirectorProviderStatus,
} from '../../game_service/director_provider_status_requests'
import type { DirectorProviderStatus, ProviderRoleStatus } from '../../game_service/director_provider_status_requests'
import {
  readStoryProviderCatalog,
  readStoryProviderSelection,
  saveStoryProviderSelectionThroughGameService,
} from '../../game_service/story_provider_selection_requests'
import type { StoryProviderCatalogEntry, StoryProviderName } from '../../game_service/story_provider_selection_requests'
import { readActiveProfileIdentifier } from '../../game_service/game_service_presence'
import { listAvailableNarrationVoices } from '../../voice/voice_service_client'
import { readLocalServiceFailureMessage } from './local_service_failure_messages'

const localServiceCopy = aiConfigurationCopy.localService
const minimumServiceAccessKeyLength = 20
const removalConfirmationWindowMilliseconds = 6000
const roleNames: readonly AiRoleName[] = ['story', 'voice']

function readAccessKeyNameForRole(roleName: AiRoleName, providerName: string): AccessKeyName {
  if (roleName === 'voice') {
    return 'elevenlabs'
  }
  if (providerName === 'deepseek') {
    return 'deepseek'
  }
  if (providerName === 'openai') {
    return 'openai'
  }
  if (providerName === 'groq') {
    return 'groq'
  }
  return 'gemini'
}

type RoleTaskName = 'idle' | 'saving' | 'removing' | 'checking' | 'applying_model'
type RoleNotice = { tone: 'confirmation' | 'failure'; text: string }
type SectionLoadStateName = 'loading' | 'ready' | 'failed'

export type LocalServiceRoleSummary = {
  isReady: boolean
  providerModeName: ProviderRoleStatus['providerModeName']
  visibleEnding: string | null
  wasConnectionChecked: boolean
}

export type LocalServiceConnectionSummary = Record<AiRoleName, LocalServiceRoleSummary>

type LocalServiceRoleCardProperties = {
  roleName: AiRoleName
  roleStatus: ProviderRoleStatus
  storedAccessKeyDescription: StoredAccessKeyDescription | null
  entranceOrder: number
  isLocked: boolean
  storyProviderCatalog: StoryProviderCatalogEntry[]
  chosenStoryProviderName: StoryProviderName
  chosenStoryModelIdentifier: string
  hasStoryConnectionPassed: boolean
  onStoryProviderChosen: (providerName: StoryProviderName) => void
  onStoryModelChosen: (modelIdentifier: string) => void
  onAccessKeyChanged: (roleName: AiRoleName) => void
  onConnectionCheckSettled: (roleName: AiRoleName, wasConnectionConfirmed: boolean) => void
}

function LocalServiceRoleCard({
  roleName,
  roleStatus,
  storedAccessKeyDescription,
  entranceOrder,
  isLocked,
  storyProviderCatalog,
  chosenStoryProviderName,
  chosenStoryModelIdentifier,
  hasStoryConnectionPassed,
  onStoryProviderChosen,
  onStoryModelChosen,
  onAccessKeyChanged,
  onConnectionCheckSettled,
}: LocalServiceRoleCardProperties) {
  const roleCopy = localServiceCopy.roles[roleName]
  const playInteractionFeedback = useInteractionFeedback()
  const fieldIdentifierPrefix = useId()
  const [accessKeyDraft, setAccessKeyDraft] = useState('')
  const [isAccessKeyVisible, setIsAccessKeyVisible] = useState(false)
  const [roleTaskName, setRoleTaskName] = useState<RoleTaskName>('idle')
  const [roleNotice, setRoleNotice] = useState<RoleNotice | null>(null)
  const [isRemovalAwaitingConfirmation, setIsRemovalAwaitingConfirmation] = useState(false)
  const isCardMounted = useRef(true)
  const removalConfirmationTimeoutIdentifier = useRef<number | null>(null)
  const connectionCheckAbortController = useRef<AbortController | null>(null)

  const isAccessKeyStored = storedAccessKeyDescription?.isAccessKeyStored === true
  const isSyntheticMode = roleStatus.providerModeName === 'synthetic'
  const chosenStoryCatalogEntry =
    storyProviderCatalog.find((catalogEntry) => catalogEntry.providerName === chosenStoryProviderName) ?? null
  const isStoryDirectorManagerVisible = roleName === 'story' && !isSyntheticMode && storyProviderCatalog.length > 0
  const isRoleReady = !roleStatus.isAccessKeyRequired || isAccessKeyStored
  const isBusy = roleTaskName !== 'idle'
  const headingIdentifier = `${fieldIdentifierPrefix}-heading`
  const accessKeyFieldIdentifier = `${fieldIdentifierPrefix}-access-key`
  const accessKeyHelpIdentifier = `${fieldIdentifierPrefix}-access-key-help`

  const clearRemovalConfirmationTimeout = () => {
    if (removalConfirmationTimeoutIdentifier.current !== null) {
      window.clearTimeout(removalConfirmationTimeoutIdentifier.current)
      removalConfirmationTimeoutIdentifier.current = null
    }
  }

  useEffect(() => {
    isCardMounted.current = true
    return () => {
      isCardMounted.current = false
      connectionCheckAbortController.current?.abort()
      if (removalConfirmationTimeoutIdentifier.current !== null) {
        window.clearTimeout(removalConfirmationTimeoutIdentifier.current)
      }
    }
  }, [])

  const playHoverFeedback = (pointerEvent: ReactPointerEvent) => {
    if (pointerEvent.pointerType === 'mouse') {
      playInteractionFeedback('option_hover')
    }
  }

  const showFailure = (failureName: string) => {
    playInteractionFeedback('rejection')
    setRoleNotice({ tone: 'failure', text: readLocalServiceFailureMessage(failureName) })
  }

  const saveAccessKey = async (submitEvent: FormEvent) => {
    submitEvent.preventDefault()
    if (isBusy || isLocked) {
      return
    }
    if (accessKeyDraft.length < minimumServiceAccessKeyLength) {
      showFailure('access_key_malformed')
      return
    }
    playInteractionFeedback('action_sent')
    setRoleNotice(null)
    setRoleTaskName('saving')
    const savingResult = await saveAccessKeyThroughGameService(
      readAccessKeyNameForRole(roleName, roleName === 'story' ? chosenStoryProviderName : roleStatus.providerName),
      accessKeyDraft,
    )
    if (!isCardMounted.current) {
      return
    }
    setRoleTaskName('idle')
    if (!savingResult.wasSuccessful) {
      showFailure(savingResult.failureName)
      return
    }
    setAccessKeyDraft('')
    setIsAccessKeyVisible(false)
    playInteractionFeedback('confirmation')
    setRoleNotice({ tone: 'confirmation', text: localServiceCopy.confirmations.saved })
    onAccessKeyChanged(roleName)
  }

  const removeAccessKey = async () => {
    if (isBusy || isLocked) {
      return
    }
    if (!isRemovalAwaitingConfirmation) {
      playInteractionFeedback('option_click')
      setIsRemovalAwaitingConfirmation(true)
      clearRemovalConfirmationTimeout()
      removalConfirmationTimeoutIdentifier.current = window.setTimeout(
        () => setIsRemovalAwaitingConfirmation(false),
        removalConfirmationWindowMilliseconds,
      )
      return
    }
    clearRemovalConfirmationTimeout()
    setIsRemovalAwaitingConfirmation(false)
    playInteractionFeedback('action_sent')
    setRoleNotice(null)
    setRoleTaskName('removing')
    const removalResult = await removeAccessKeyThroughGameService(
      readAccessKeyNameForRole(roleName, roleName === 'story' ? chosenStoryProviderName : roleStatus.providerName),
    )
    if (!isCardMounted.current) {
      return
    }
    setRoleTaskName('idle')
    if (!removalResult.wasSuccessful) {
      showFailure(removalResult.failureName)
      return
    }
    playInteractionFeedback('confirmation')
    setRoleNotice({ tone: 'confirmation', text: localServiceCopy.confirmations.removed })
    onAccessKeyChanged(roleName)
  }

  const runConnectionCheck = async () => {
    if (isBusy || isLocked) {
      return
    }
    if (!isRoleReady) {
      onConnectionCheckSettled(roleName, false)
      showFailure('access_key_missing')
      return
    }
    playInteractionFeedback('action_sent')
    setRoleNotice(null)
    setRoleTaskName('checking')
    let confirmationText: string | null = null
    let failureName: string | null = null
    if (roleName === 'story') {
      const activeProfileIdentifier = readActiveProfileIdentifier()
      if (activeProfileIdentifier === null) {
        failureName = 'profile_identifier_required'
      } else {
        const checkAbortController = new AbortController()
        connectionCheckAbortController.current = checkAbortController
        if (isStoryDirectorManagerVisible) {
          const modelIdentifierToApply =
            chosenStoryCatalogEntry?.modelIdentifiers.includes(chosenStoryModelIdentifier) === true
              ? chosenStoryModelIdentifier
              : (chosenStoryCatalogEntry?.defaultModelIdentifier ?? chosenStoryModelIdentifier)
          const selectionResult = await saveStoryProviderSelectionThroughGameService(
            chosenStoryProviderName,
            modelIdentifierToApply,
          )
          if (!selectionResult.wasSuccessful) {
            failureName = selectionResult.failureName
          } else {
            onStoryModelChosen(selectionResult.value.modelIdentifier)
          }
        }
        const checkResult =
          failureName === null
            ? await checkStoryConnectionThroughGameService(activeProfileIdentifier, checkAbortController.signal)
            : null
        if (checkResult !== null && !checkResult.wasSuccessful) {
          failureName = checkResult.failureName
        } else if (checkResult !== null && !checkResult.value.isDirectorListening) {
          failureName = 'unexpected_service_answer'
        } else if (checkResult !== null) {
          confirmationText =
            checkResult.value.providerModeName === 'synthetic'
              ? localServiceCopy.confirmations.storyCheckPassedInSyntheticMode
              : localServiceCopy.confirmations.storyCheckPassed
        }
      }
    } else {
      const voicesResult = await listAvailableNarrationVoices()
      if (!voicesResult.wasSuccessful) {
        failureName = voicesResult.failureName
      } else {
        confirmationText = isSyntheticMode
          ? localServiceCopy.confirmations.voiceCheckPassedInSyntheticMode
          : localServiceCopy.confirmations.voiceCheckPassed(voicesResult.value.length)
      }
    }
    if (!isCardMounted.current) {
      return
    }
    setRoleTaskName('idle')
    onConnectionCheckSettled(roleName, confirmationText !== null)
    if (confirmationText !== null) {
      playInteractionFeedback('confirmation')
      setRoleNotice({ tone: 'confirmation', text: confirmationText })
      return
    }
    if (failureName === 'unexpected_service_answer') {
      playInteractionFeedback('rejection')
      setRoleNotice({ tone: 'failure', text: localServiceCopy.failures.unexpected_answer })
      return
    }
    showFailure(failureName ?? 'unexpected_service_answer')
  }

  const applyChosenStoryModel = async () => {
    if (isBusy || isLocked || !hasStoryConnectionPassed || chosenStoryCatalogEntry === null) {
      return
    }
    playInteractionFeedback('action_sent')
    setRoleNotice(null)
    setRoleTaskName('applying_model')
    const selectionResult = await saveStoryProviderSelectionThroughGameService(
      chosenStoryProviderName,
      chosenStoryModelIdentifier,
    )
    if (!isCardMounted.current) {
      return
    }
    setRoleTaskName('idle')
    if (!selectionResult.wasSuccessful) {
      showFailure(selectionResult.failureName)
      return
    }
    onStoryModelChosen(selectionResult.value.modelIdentifier)
    playInteractionFeedback('confirmation')
    setRoleNotice({ tone: 'confirmation', text: localServiceCopy.roles.story.modelAppliedConfirmation })
  }

  return (
    <section
      className="ai-configuration-block"
      aria-labelledby={headingIdentifier}
      data-complete={isRoleReady}
      data-outline-variant="drawn_from_left"
      style={{ '--entrance-order': entranceOrder } as CSSProperties}
    >
      <span className="ai-configuration-block-outline" aria-hidden="true" />
      <header className="ai-configuration-block-header">
        <span className="ai-configuration-block-number" aria-hidden="true">
          {roleCopy.blockNumber}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={headingIdentifier} className="ai-configuration-block-title">
            {roleCopy.title}
          </h2>
          <p className="ai-configuration-block-description">
            {roleName === 'story'
              ? localServiceCopy.roles.story.descriptionForProvider(
                  localServiceCopy.roles.story.realProviderNames[roleStatus.providerName] ??
                    roleCopy.realProviderName,
                )
              : roleCopy.description}
          </p>
        </div>
        <span className="ai-configuration-status-chip" data-complete={isRoleReady}>
          {isRoleReady ? (
            <CheckCircle size={16} weight="fill" aria-hidden="true" />
          ) : (
            <CircleDashed size={16} weight="bold" aria-hidden="true" />
          )}
          {isRoleReady ? aiConfigurationCopy.progress.complete : aiConfigurationCopy.progress.pending}
        </span>
      </header>

      <div className="ai-configuration-detail-fields">
        <p className="ai-configuration-service-mode-line" data-provider-mode-name={roleStatus.providerModeName}>
          {isSyntheticMode ? (
            <Flask size={18} weight="bold" aria-hidden="true" />
          ) : (
            <PlugsConnected size={18} weight="bold" aria-hidden="true" />
          )}
          <span>
            <strong>{localServiceCopy.modeLabels[roleStatus.providerModeName]}.</strong>{' '}
            {localServiceCopy.modeLines[roleStatus.providerModeName]}
          </span>
        </p>

        {isStoryDirectorManagerVisible ? (
          <fieldset className="ai-configuration-provider-fieldset">
            <legend className="ai-configuration-field-label">{localServiceCopy.roles.story.providerLegend}</legend>
            <div className="ai-configuration-provider-grid">
              {storyProviderCatalog.map((catalogEntry) => {
                const isChosen = catalogEntry.providerName === chosenStoryProviderName
                return (
                  <label
                    key={catalogEntry.providerName}
                    className="ai-configuration-provider-choice"
                    data-chosen={isChosen}
                    onPointerEnter={playHoverFeedback}
                  >
                    <input
                      className="ai-configuration-provider-radio"
                      type="radio"
                      name={`${fieldIdentifierPrefix}-story-provider`}
                      checked={isChosen}
                      disabled={isLocked || isBusy}
                      onChange={() => {
                        playInteractionFeedback('option_click')
                        onStoryProviderChosen(catalogEntry.providerName)
                      }}
                    />
                    <span className="ai-configuration-provider-marker" aria-hidden="true" />
                    <span>
                      <span className="ai-configuration-provider-name">
                        {localServiceCopy.roles.story.realProviderNames[catalogEntry.providerName] ??
                          catalogEntry.providerName}
                      </span>
                      <span className="ai-configuration-provider-note">
                        {localServiceCopy.roles.story.providerNotes[catalogEntry.providerName] ?? ''}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        ) : null}

        <p className="ai-configuration-service-key-state" data-stored={isAccessKeyStored}>
          {isAccessKeyStored ? (
            <CheckCircle size={18} weight="fill" aria-hidden="true" />
          ) : roleStatus.isAccessKeyRequired ? (
            <WarningCircle size={18} weight="fill" aria-hidden="true" />
          ) : (
            <CircleDashed size={18} weight="bold" aria-hidden="true" />
          )}
          <span className={isAccessKeyStored ? 'ai-configuration-masked-ending' : undefined}>
            {isAccessKeyStored
              ? storedAccessKeyDescription?.visibleEnding
                ? localServiceCopy.keyStates.stored(storedAccessKeyDescription.visibleEnding)
                : localServiceCopy.keyStates.storedWithoutEnding
              : roleStatus.isAccessKeyRequired
                ? localServiceCopy.keyStates.missing
                : localServiceCopy.keyStates.notNeeded}
          </span>
        </p>

        {roleStatus.isAccessKeyRequired ? (
          <form className="ai-configuration-field" onSubmit={(submitEvent) => void saveAccessKey(submitEvent)}>
            <label className="ai-configuration-field-label" htmlFor={accessKeyFieldIdentifier}>
              {isAccessKeyStored ? localServiceCopy.accessKeyReplacementLabel : localServiceCopy.accessKeyLabel}
            </label>
            <div className="ai-configuration-access-key-row">
              <input
                id={accessKeyFieldIdentifier}
                className="ai-configuration-access-key-input"
                type={isAccessKeyVisible ? 'text' : 'password'}
                value={accessKeyDraft}
                placeholder={localServiceCopy.accessKeyPlaceholder}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                maxLength={200}
                disabled={isLocked || isBusy}
                aria-describedby={accessKeyHelpIdentifier}
                onChange={(changeEvent) => setAccessKeyDraft(changeEvent.target.value.replace(/\s+/g, ''))}
              />
              <button
                type="button"
                className="quiet-action-button ai-configuration-visibility-button"
                aria-pressed={isAccessKeyVisible}
                aria-label={isAccessKeyVisible ? aiConfigurationCopy.accessKey.hideButton : aiConfigurationCopy.accessKey.showButton}
                title={isAccessKeyVisible ? aiConfigurationCopy.accessKey.hideButton : aiConfigurationCopy.accessKey.showButton}
                disabled={isLocked}
                onPointerEnter={playHoverFeedback}
                onClick={() => {
                  playInteractionFeedback('option_click')
                  setIsAccessKeyVisible((wasVisible) => !wasVisible)
                }}
              >
                {isAccessKeyVisible ? (
                  <EyeSlash size={20} weight="bold" aria-hidden="true" />
                ) : (
                  <Eye size={20} weight="bold" aria-hidden="true" />
                )}
              </button>
            </div>
            <p id={accessKeyHelpIdentifier} className="ai-configuration-field-help">
              {localServiceCopy.accessKeyHelper}
            </p>
            <div className="ai-configuration-service-actions">
              <button
                type="submit"
                className="quiet-action-button"
                disabled={isLocked || isBusy || accessKeyDraft.length === 0}
                onPointerEnter={playHoverFeedback}
              >
                <FloppyDisk size={18} weight="bold" aria-hidden="true" />
                {roleTaskName === 'saving' ? localServiceCopy.savingButton : localServiceCopy.saveButton}
              </button>
            </div>
          </form>
        ) : null}

        {isStoryDirectorManagerVisible && chosenStoryCatalogEntry !== null ? (
          <div className="ai-configuration-field">
            <label className="ai-configuration-field-label" htmlFor={`${fieldIdentifierPrefix}-story-model`}>
              {localServiceCopy.roles.story.modelLabel}
            </label>
            <select
              id={`${fieldIdentifierPrefix}-story-model`}
              className="ai-configuration-select"
              value={chosenStoryModelIdentifier}
              disabled={isLocked || isBusy || !hasStoryConnectionPassed}
              onChange={(changeEvent) => onStoryModelChosen(changeEvent.target.value)}
            >
              {chosenStoryCatalogEntry.modelIdentifiers.map((modelIdentifier) => (
                <option key={modelIdentifier} value={modelIdentifier}>
                  {localServiceCopy.roles.story.modelNames[modelIdentifier] ?? modelIdentifier}
                </option>
              ))}
            </select>
            <p className="ai-configuration-field-help">
              {hasStoryConnectionPassed
                ? localServiceCopy.roles.story.modelUnlockedHelp
                : localServiceCopy.roles.story.modelLockedHelp}
            </p>
            {hasStoryConnectionPassed ? (
              <div className="ai-configuration-service-actions">
                <button
                  type="button"
                  className="quiet-action-button"
                  disabled={isLocked || isBusy}
                  onPointerEnter={playHoverFeedback}
                  onClick={() => void applyChosenStoryModel()}
                >
                  {roleTaskName === 'applying_model'
                    ? localServiceCopy.roles.story.applyingModelButton
                    : localServiceCopy.roles.story.applyModelButton}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="ai-configuration-check-row">
          <div className="ai-configuration-check-actions">
            <button
              type="button"
              className="quiet-action-button"
              disabled={isLocked || isBusy || (isStoryDirectorManagerVisible && !isAccessKeyStored)}
              onPointerEnter={playHoverFeedback}
              onClick={() => void runConnectionCheck()}
            >
              <PlugsConnected size={18} weight="bold" aria-hidden="true" />
              {roleTaskName === 'checking' ? localServiceCopy.checkingButton : localServiceCopy.checkButton}
            </button>
            {isAccessKeyStored ? (
              <button
                type="button"
                className="quiet-action-button"
                disabled={isLocked || isBusy}
                onPointerEnter={playHoverFeedback}
                onClick={() => void removeAccessKey()}
              >
                <Trash size={18} weight="bold" aria-hidden="true" />
                <span aria-live="polite">
                  {roleTaskName === 'removing'
                    ? localServiceCopy.removingButton
                    : isRemovalAwaitingConfirmation
                      ? localServiceCopy.confirmRemoveButton
                      : localServiceCopy.removeButton}
                </span>
              </button>
            ) : null}
            <span className="ai-configuration-check-tag">
              {isSyntheticMode ? localServiceCopy.syntheticCheckTag : localServiceCopy.realCheckTag}
            </span>
          </div>
          <div className="ai-configuration-check-status" role="status" aria-live="polite">
            {roleTaskName === 'checking' ? (
              <p className="ai-configuration-waiting-line">
                <span className="ai-configuration-waiting-signal" data-signal-variant="relay_dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                {localServiceCopy.checkingLine}
              </p>
            ) : roleNotice?.tone === 'confirmation' ? (
              <p className="ai-configuration-success-line">
                <CheckCircle size={16} weight="fill" aria-hidden="true" />
                {roleNotice.text}
              </p>
            ) : roleNotice?.tone === 'failure' ? (
              <p className="ai-configuration-service-failure-line">
                <WarningCircle size={16} weight="fill" aria-hidden="true" />
                {roleNotice.text}
              </p>
            ) : null}
          </div>
          {!isSyntheticMode && roleName === 'story' ? (
            <p className="ai-configuration-field-help">{localServiceCopy.realCheckCostNotice}</p>
          ) : null}
          {roleName === 'voice' ? <p className="ai-configuration-field-help">{localServiceCopy.voiceChoiceHint}</p> : null}
        </div>
      </div>
    </section>
  )
}

export function LocalServiceConnectionSection({
  isLocked = false,
  firstEntranceOrder = 1,
  onConnectionSummaryChanged,
  onAccessKeyChanged,
}: {
  isLocked?: boolean
  firstEntranceOrder?: number
  onConnectionSummaryChanged?: (connectionSummary: LocalServiceConnectionSummary | null) => void
  onAccessKeyChanged?: (roleName: AiRoleName) => void
}) {
  const playInteractionFeedback = useInteractionFeedback()
  const [sectionLoadStateName, setSectionLoadStateName] = useState<SectionLoadStateName>('loading')
  const [loadFailureText, setLoadFailureText] = useState<string | null>(null)
  const [directorProviderStatus, setDirectorProviderStatus] = useState<DirectorProviderStatus | null>(null)
  const [storedAccessKeyDescriptions, setStoredAccessKeyDescriptions] = useState<StoredAccessKeyDescription[]>([])
  const [checkedRoleNames, setCheckedRoleNames] = useState<readonly AiRoleName[]>([])
  const [storyProviderCatalog, setStoryProviderCatalog] = useState<StoryProviderCatalogEntry[]>([])
  const [chosenStoryProviderName, setChosenStoryProviderName] = useState<StoryProviderName>('gemini')
  const [chosenStoryModelIdentifier, setChosenStoryModelIdentifier] = useState('')
  const [hasStoryConnectionPassed, setHasStoryConnectionPassed] = useState(false)
  const isSectionMounted = useRef(true)
  const latestLoadNumber = useRef(0)

  const loadServiceState = useCallback(async (shouldShowLoadingLine: boolean) => {
    const loadNumber = latestLoadNumber.current + 1
    latestLoadNumber.current = loadNumber
    if (shouldShowLoadingLine) {
      setSectionLoadStateName('loading')
    }
    const [providerStatusResult, accessKeysResult, catalogResult, selectionResult] = await Promise.all([
      readDirectorProviderStatus(),
      readStoredAccessKeyDescriptions(),
      readStoryProviderCatalog(),
      readStoryProviderSelection(),
    ])
    if (!isSectionMounted.current || latestLoadNumber.current !== loadNumber) {
      return
    }
    if (!providerStatusResult.wasSuccessful) {
      setLoadFailureText(readLocalServiceFailureMessage(providerStatusResult.failureName))
      setSectionLoadStateName('failed')
      return
    }
    setDirectorProviderStatus(providerStatusResult.value)
    setStoredAccessKeyDescriptions(accessKeysResult.wasSuccessful ? accessKeysResult.value : [])
    setStoryProviderCatalog(catalogResult.wasSuccessful ? catalogResult.value : [])
    if (selectionResult.wasSuccessful) {
      setChosenStoryProviderName(selectionResult.value.providerName)
      setChosenStoryModelIdentifier(selectionResult.value.modelIdentifier)
    } else if (catalogResult.wasSuccessful && catalogResult.value[0]) {
      setChosenStoryProviderName(catalogResult.value[0].providerName)
      setChosenStoryModelIdentifier(catalogResult.value[0].defaultModelIdentifier)
    }
    setLoadFailureText(accessKeysResult.wasSuccessful ? null : readLocalServiceFailureMessage(accessKeysResult.failureName))
    setSectionLoadStateName('ready')
  }, [])

  useEffect(() => {
    isSectionMounted.current = true
    const firstLoadTimeoutIdentifier = window.setTimeout(() => void loadServiceState(true), 0)
    return () => {
      isSectionMounted.current = false
      window.clearTimeout(firstLoadTimeoutIdentifier)
    }
  }, [loadServiceState])

  const connectionSummary = useMemo<LocalServiceConnectionSummary | null>(() => {
    if (sectionLoadStateName !== 'ready' || directorProviderStatus === null) {
      return null
    }
    const summarizeRole = (roleName: AiRoleName): LocalServiceRoleSummary => {
      const storedAccessKeyDescription = storedAccessKeyDescriptions.find(
        (candidateDescription) =>
          candidateDescription.accessKeyName ===
          readAccessKeyNameForRole(
            roleName,
            roleName === 'story' ? chosenStoryProviderName : directorProviderStatus[roleName].providerName,
          ),
      )
      const isAccessKeyStored = storedAccessKeyDescription?.isAccessKeyStored === true
      return {
        isReady: !directorProviderStatus[roleName].isAccessKeyRequired || isAccessKeyStored,
        providerModeName: directorProviderStatus[roleName].providerModeName,
        visibleEnding: isAccessKeyStored ? (storedAccessKeyDescription?.visibleEnding ?? null) : null,
        wasConnectionChecked: checkedRoleNames.includes(roleName),
      }
    }
    return { story: summarizeRole('story'), voice: summarizeRole('voice') }
  }, [
    sectionLoadStateName,
    directorProviderStatus,
    storedAccessKeyDescriptions,
    checkedRoleNames,
    chosenStoryProviderName,
    hasStoryConnectionPassed,
  ])

  useEffect(() => {
    onConnectionSummaryChanged?.(connectionSummary)
  }, [connectionSummary, onConnectionSummaryChanged])

  const absorbAccessKeyChange = (roleName: AiRoleName) => {
    setCheckedRoleNames((currentRoleNames) => currentRoleNames.filter((checkedRoleName) => checkedRoleName !== roleName))
    onAccessKeyChanged?.(roleName)
    void loadServiceState(false)
  }

  const absorbConnectionCheck = (roleName: AiRoleName, wasConnectionConfirmed: boolean) => {
    setCheckedRoleNames((currentRoleNames) => {
      const otherRoleNames = currentRoleNames.filter((checkedRoleName) => checkedRoleName !== roleName)
      return wasConnectionConfirmed ? [...otherRoleNames, roleName] : otherRoleNames
    })
  }

  return (
    <section className="ai-configuration-service-section" aria-label={localServiceCopy.sectionLabel}>
      {sectionLoadStateName === 'loading' ? (
        <p className="ai-configuration-field-help ai-configuration-console-prompt" role="status">
          <span className="ai-configuration-prompt-caret" aria-hidden="true" />
          {localServiceCopy.loadingLine}
        </p>
      ) : null}
      {loadFailureText !== null && sectionLoadStateName !== 'loading' ? (
        <p className="ai-configuration-service-failure-line" role="status">
          <WarningCircle size={16} weight="fill" aria-hidden="true" />
          <span>
            {sectionLoadStateName === 'failed' ? `${localServiceCopy.loadFailedLine} ` : null}
            {loadFailureText}
          </span>
        </p>
      ) : null}
      {sectionLoadStateName === 'ready' && directorProviderStatus !== null ? (
        <div className="ai-configuration-block-grid">
          {roleNames.map((roleName, roleIndex) => (
            <LocalServiceRoleCard
              key={roleName}
              roleName={roleName}
              roleStatus={directorProviderStatus[roleName]}
              storedAccessKeyDescription={
                storedAccessKeyDescriptions.find(
                  (candidateDescription) =>
                    candidateDescription.accessKeyName ===
                    readAccessKeyNameForRole(
                      roleName,
                      roleName === 'story' ? chosenStoryProviderName : directorProviderStatus[roleName].providerName,
                    ),
                ) ?? null
              }
              entranceOrder={firstEntranceOrder + roleIndex}
              isLocked={isLocked}
              storyProviderCatalog={storyProviderCatalog}
              chosenStoryProviderName={chosenStoryProviderName}
              chosenStoryModelIdentifier={chosenStoryModelIdentifier}
              hasStoryConnectionPassed={hasStoryConnectionPassed}
              onStoryProviderChosen={(providerName) => {
                const catalogEntry = storyProviderCatalog.find((entry) => entry.providerName === providerName)
                setChosenStoryProviderName(providerName)
                setChosenStoryModelIdentifier(catalogEntry?.defaultModelIdentifier ?? '')
                setHasStoryConnectionPassed(false)
                setCheckedRoleNames((currentRoleNames) =>
                  currentRoleNames.filter((checkedRoleName) => checkedRoleName !== 'story'),
                )
              }}
              onStoryModelChosen={setChosenStoryModelIdentifier}
              onAccessKeyChanged={absorbAccessKeyChange}
              onConnectionCheckSettled={(roleName, wasConnectionConfirmed) => {
                if (roleName === 'story') {
                  setHasStoryConnectionPassed(wasConnectionConfirmed)
                }
                absorbConnectionCheck(roleName, wasConnectionConfirmed)
              }}
            />
          ))}
        </div>
      ) : null}
      {sectionLoadStateName !== 'loading' ? (
        <div className="ai-configuration-service-actions">
          <button
            type="button"
            className="quiet-action-button"
            disabled={isLocked}
            onClick={() => {
              playInteractionFeedback('option_click')
              void loadServiceState(true)
            }}
          >
            <ArrowsClockwise size={18} weight="bold" aria-hidden="true" />
            {localServiceCopy.refreshButton}
          </button>
        </div>
      ) : null}
    </section>
  )
}

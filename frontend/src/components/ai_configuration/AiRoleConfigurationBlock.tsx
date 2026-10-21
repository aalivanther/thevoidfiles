import { CheckCircle, CircleDashed, Eye, EyeSlash, PlugsConnected, SpeakerHigh, Stop } from '@phosphor-icons/react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { chooseAnimationVariantIndex, chooseAnimationVariantName, randomNumberBetween } from '../../animation/animation_variety'
import { useInteractionFeedback } from '../../audio/interaction_feedback'
import { aiConfigurationCopy } from '../../copy/ai_configuration_copy'
import {
  browserDefaultVoiceOptionIdentifier,
  longestSimulatedCheckMilliseconds,
  minimumAccessKeyLength,
  providerDefinitionsByRoleName,
  shortestSimulatedCheckMilliseconds,
} from '../../demonstration/ai_configuration_data'
import type { AiProviderOption, AiRoleName } from '../../demonstration/ai_configuration_data'
import { isAccessKeyAcceptable, isAiRoleSelectionComplete, maskAccessKeyEnding } from './ai_configuration_record'
import type { AiRoleSelection } from './ai_configuration_record'
import { isBrowserSpeechSupported, useSpanishBrowserVoices } from './browser_speech_voices'

const blockOutlineVariantNames = ['drawn_from_left', 'drawn_from_center', 'drawn_from_corners'] as const
const waitingSignalVariantNames = ['signal_sweep', 'relay_dots', 'filling_bar'] as const
const browserSpeechSafetyMilliseconds = 24000

type ConnectionCheckState = 'idle' | 'checking' | 'succeeded'
type BrowserSpeechState = 'idle' | 'speaking' | 'finished' | 'failed'

type AiRoleConfigurationBlockProperties = {
  roleName: AiRoleName
  roleSelection: AiRoleSelection
  entranceOrder: number
  isLocked: boolean
  onRoleSelectionChanged: (roleSelection: AiRoleSelection) => void
}

export function AiRoleConfigurationBlock({
  roleName,
  roleSelection,
  entranceOrder,
  isLocked,
  onRoleSelectionChanged,
}: AiRoleConfigurationBlockProperties) {
  const roleCopy = aiConfigurationCopy.roles[roleName]
  const playInteractionFeedback = useInteractionFeedback()
  const spanishBrowserVoices = useSpanishBrowserVoices()
  const fieldIdentifierPrefix = useId()
  const [blockOutlineVariantName] = useState(() =>
    chooseAnimationVariantName('ai_configuration_block_outline', blockOutlineVariantNames),
  )
  const [isAccessKeyVisible, setIsAccessKeyVisible] = useState(false)
  const [hasAccessKeyBeenLeft, setHasAccessKeyBeenLeft] = useState(false)
  const [connectionCheckState, setConnectionCheckState] = useState<ConnectionCheckState>('idle')
  const [waitingSequenceIndex, setWaitingSequenceIndex] = useState(0)
  const [waitingLineIndex, setWaitingLineIndex] = useState(0)
  const [waitingSignalVariantName, setWaitingSignalVariantName] = useState<(typeof waitingSignalVariantNames)[number]>(
    waitingSignalVariantNames[0],
  )
  const [hasIncompleteCheckBeenAttempted, setHasIncompleteCheckBeenAttempted] = useState(false)
  const [browserSpeechState, setBrowserSpeechState] = useState<BrowserSpeechState>('idle')
  const pendingTimerIdentifiers = useRef<number[]>([])
  const latestRoleSelection = useRef(roleSelection)
  const latestSelectionChangeCallback = useRef(onRoleSelectionChanged)
  const wasCompleteOnPreviousRender = useRef(false)

  const providerDefinitions = providerDefinitionsByRoleName[roleName]
  const selectedProviderDefinition =
    providerDefinitions.find(
      (providerDefinition) => providerDefinition.providerIdentifier === roleSelection.providerIdentifier,
    ) ?? null
  const isBlockComplete = isAiRoleSelectionComplete(roleSelection, selectedProviderDefinition)
  const isBrowserSpeechAvailable = isBrowserSpeechSupported()

  const availableOptions: readonly AiProviderOption[] = useMemo(() => {
    if (!selectedProviderDefinition) {
      return []
    }
    if (!selectedProviderDefinition.usesBrowserSpeech) {
      return selectedProviderDefinition.providerOptions
    }
    return [
      {
        optionIdentifier: browserDefaultVoiceOptionIdentifier,
        optionName: aiConfigurationCopy.browserSpeech.defaultVoiceOption,
      },
      ...spanishBrowserVoices.map((browserVoice) => ({
        optionIdentifier: browserVoice.voiceURI,
        optionName: `${browserVoice.name} · ${browserVoice.lang}`,
      })),
    ]
  }, [selectedProviderDefinition, spanishBrowserVoices])

  useEffect(() => {
    latestRoleSelection.current = roleSelection
    latestSelectionChangeCallback.current = onRoleSelectionChanged
  }, [roleSelection, onRoleSelectionChanged])

  useEffect(() => {
    if (isBlockComplete && !wasCompleteOnPreviousRender.current) {
      playInteractionFeedback('stamp_impact')
    }
    wasCompleteOnPreviousRender.current = isBlockComplete
  }, [isBlockComplete, playInteractionFeedback])

  useEffect(() => {
    const timerIdentifiers = pendingTimerIdentifiers.current
    return () => {
      timerIdentifiers.forEach((timerIdentifier) => {
        window.clearTimeout(timerIdentifier)
        window.clearInterval(timerIdentifier)
      })
      if (isBrowserSpeechSupported()) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const clearPendingTimers = () => {
    pendingTimerIdentifiers.current.forEach((timerIdentifier) => {
      window.clearTimeout(timerIdentifier)
      window.clearInterval(timerIdentifier)
    })
    pendingTimerIdentifiers.current = []
  }

  const resetChecksAfterChange = () => {
    clearPendingTimers()
    setConnectionCheckState('idle')
    setHasIncompleteCheckBeenAttempted(false)
    if (browserSpeechState !== 'idle') {
      if (isBrowserSpeechSupported()) {
        window.speechSynthesis.cancel()
      }
      setBrowserSpeechState('idle')
    }
  }

  const playHoverFeedback = (pointerEvent: ReactPointerEvent) => {
    if (pointerEvent.pointerType === 'mouse') {
      playInteractionFeedback('option_hover')
    }
  }

  const chooseProvider = (providerIdentifier: string) => {
    if (providerIdentifier === roleSelection.providerIdentifier) {
      return
    }
    const chosenProviderDefinition = providerDefinitions.find(
      (providerDefinition) => providerDefinition.providerIdentifier === providerIdentifier,
    )
    playInteractionFeedback('option_click')
    resetChecksAfterChange()
    setHasAccessKeyBeenLeft(false)
    setIsAccessKeyVisible(false)
    onRoleSelectionChanged({
      providerIdentifier,
      optionIdentifier: chosenProviderDefinition?.usesBrowserSpeech ? browserDefaultVoiceOptionIdentifier : null,
      optionName: chosenProviderDefinition?.usesBrowserSpeech ? aiConfigurationCopy.browserSpeech.defaultVoiceOption : null,
      accessKey: '',
      wasConnectionCheckCompleted: false,
    })
  }

  const chooseOption = (optionIdentifier: string) => {
    const chosenOption = availableOptions.find((availableOption) => availableOption.optionIdentifier === optionIdentifier)
    playInteractionFeedback('option_click')
    resetChecksAfterChange()
    onRoleSelectionChanged({
      ...roleSelection,
      optionIdentifier: chosenOption ? chosenOption.optionIdentifier : null,
      optionName: chosenOption ? chosenOption.optionName : null,
      wasConnectionCheckCompleted: false,
    })
  }

  const changeAccessKey = (accessKey: string) => {
    playInteractionFeedback('typewriter_key')
    resetChecksAfterChange()
    onRoleSelectionChanged({ ...roleSelection, accessKey: accessKey.replace(/\s+/g, ''), wasConnectionCheckCompleted: false })
  }

  const runSimulatedConnectionCheck = () => {
    if (connectionCheckState === 'checking') {
      return
    }
    if (!isBlockComplete) {
      playInteractionFeedback('rejection')
      setHasIncompleteCheckBeenAttempted(true)
      setHasAccessKeyBeenLeft(true)
      return
    }
    playInteractionFeedback('action_sent')
    clearPendingTimers()
    const checkDurationMilliseconds = randomNumberBetween(shortestSimulatedCheckMilliseconds, longestSimulatedCheckMilliseconds)
    const chosenSequenceIndex = chooseAnimationVariantIndex(
      'ai_configuration_waiting_sequence',
      aiConfigurationCopy.connectionCheck.waitingSequences.length,
    )
    const waitingLineCount = aiConfigurationCopy.connectionCheck.waitingSequences[chosenSequenceIndex].length
    setWaitingSequenceIndex(chosenSequenceIndex)
    setWaitingLineIndex(0)
    setWaitingSignalVariantName(chooseAnimationVariantName('ai_configuration_waiting_signal', waitingSignalVariantNames))
    setHasIncompleteCheckBeenAttempted(false)
    setConnectionCheckState('checking')
    const checkStartTimestamp = new Date().getTime()
    const waitingLineIntervalIdentifier = window.setInterval(() => {
      const elapsedShare = (new Date().getTime() - checkStartTimestamp) / checkDurationMilliseconds
      setWaitingLineIndex(Math.min(waitingLineCount - 1, Math.floor(elapsedShare * waitingLineCount)))
    }, 160)
    const completionTimeoutIdentifier = window.setTimeout(() => {
      window.clearInterval(waitingLineIntervalIdentifier)
      setConnectionCheckState('succeeded')
      playInteractionFeedback('confirmation')
      latestSelectionChangeCallback.current({ ...latestRoleSelection.current, wasConnectionCheckCompleted: true })
    }, checkDurationMilliseconds)
    pendingTimerIdentifiers.current.push(waitingLineIntervalIdentifier, completionTimeoutIdentifier)
  }

  const stopBrowserSpeech = () => {
    playInteractionFeedback('panel_close')
    clearPendingTimers()
    window.speechSynthesis.cancel()
    setBrowserSpeechState('idle')
  }

  const speakSamplePhrase = () => {
    if (!isBrowserSpeechSupported()) {
      playInteractionFeedback('rejection')
      return
    }
    playInteractionFeedback('action_sent')
    clearPendingTimers()
    window.speechSynthesis.cancel()
    const sampleUtterance = new SpeechSynthesisUtterance(aiConfigurationCopy.browserSpeech.samplePhrase)
    const chosenBrowserVoice =
      spanishBrowserVoices.find((browserVoice) => browserVoice.voiceURI === roleSelection.optionIdentifier) ??
      spanishBrowserVoices[0] ??
      null
    if (chosenBrowserVoice) {
      sampleUtterance.voice = chosenBrowserVoice
      sampleUtterance.lang = chosenBrowserVoice.lang
    } else {
      sampleUtterance.lang = 'es-MX'
    }
    sampleUtterance.rate = 0.94
    sampleUtterance.pitch = 0.9
    sampleUtterance.onend = () => {
      clearPendingTimers()
      setBrowserSpeechState('finished')
      playInteractionFeedback('confirmation')
      latestSelectionChangeCallback.current({ ...latestRoleSelection.current, wasConnectionCheckCompleted: true })
    }
    sampleUtterance.onerror = (speechErrorEvent) => {
      clearPendingTimers()
      if (speechErrorEvent.error === 'canceled' || speechErrorEvent.error === 'interrupted') {
        setBrowserSpeechState('idle')
        return
      }
      setBrowserSpeechState('failed')
      playInteractionFeedback('rejection')
    }
    setBrowserSpeechState('speaking')
    window.speechSynthesis.speak(sampleUtterance)
    pendingTimerIdentifiers.current.push(
      window.setTimeout(() => {
        window.speechSynthesis.cancel()
        setBrowserSpeechState('idle')
      }, browserSpeechSafetyMilliseconds),
    )
  }

  const shouldShowAccessKeyWarning =
    selectedProviderDefinition !== null &&
    selectedProviderDefinition.requiresAccessKey &&
    hasAccessKeyBeenLeft &&
    roleSelection.accessKey.length > 0 &&
    !isAccessKeyAcceptable(roleSelection.accessKey)
  const maskedAccessKeyEnding = maskAccessKeyEnding(roleSelection.accessKey)
  const optionFieldIdentifier = `${fieldIdentifierPrefix}-option`
  const accessKeyFieldIdentifier = `${fieldIdentifierPrefix}-access-key`
  const accessKeyHelpIdentifier = `${fieldIdentifierPrefix}-access-key-help`
  const headingIdentifier = `${fieldIdentifierPrefix}-heading`
  const waitingLines = aiConfigurationCopy.connectionCheck.waitingSequences[waitingSequenceIndex]

  return (
    <section
      className="ai-configuration-block"
      aria-labelledby={headingIdentifier}
      data-complete={isBlockComplete}
      data-outline-variant={blockOutlineVariantName}
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
          <p className="ai-configuration-block-description">{roleCopy.description}</p>
        </div>
        <span className="ai-configuration-status-chip" data-complete={isBlockComplete}>
          {isBlockComplete ? (
            <CheckCircle size={16} weight="fill" aria-hidden="true" />
          ) : (
            <CircleDashed size={16} weight="bold" aria-hidden="true" />
          )}
          {isBlockComplete ? aiConfigurationCopy.progress.complete : aiConfigurationCopy.progress.pending}
        </span>
      </header>

      <fieldset className="ai-configuration-provider-fieldset" disabled={isLocked}>
        <legend className="ai-configuration-field-label">{roleCopy.providerLegend}</legend>
        <div className="ai-configuration-provider-grid">
          {providerDefinitions.map((providerDefinition) => {
            const isChosen = providerDefinition.providerIdentifier === roleSelection.providerIdentifier
            return (
              <label
                key={providerDefinition.providerIdentifier}
                className="ai-configuration-provider-choice"
                data-chosen={isChosen}
                onPointerEnter={playHoverFeedback}
              >
                <input
                  type="radio"
                  className="ai-configuration-provider-radio"
                  name={`${fieldIdentifierPrefix}-provider`}
                  value={providerDefinition.providerIdentifier}
                  checked={isChosen}
                  onChange={() => chooseProvider(providerDefinition.providerIdentifier)}
                />
                <span className="ai-configuration-provider-marker" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="ai-configuration-provider-name">
                    {aiConfigurationCopy.providerNames[providerDefinition.providerIdentifier]}
                  </span>
                  <span className="ai-configuration-provider-note">
                    {aiConfigurationCopy.providerNotes[providerDefinition.providerIdentifier]}
                  </span>
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      {selectedProviderDefinition ? (
        <div className="ai-configuration-detail-fields" key={selectedProviderDefinition.providerIdentifier}>
          <div className="ai-configuration-field">
            <label className="ai-configuration-field-label" htmlFor={optionFieldIdentifier}>
              {roleCopy.optionLabel}
            </label>
            <select
              id={optionFieldIdentifier}
              className="ai-configuration-select"
              value={roleSelection.optionIdentifier ?? ''}
              disabled={isLocked}
              onChange={(changeEvent) => chooseOption(changeEvent.target.value)}
            >
              {selectedProviderDefinition.usesBrowserSpeech ? null : (
                <option value="" disabled>
                  {roleCopy.optionPlaceholder}
                </option>
              )}
              {availableOptions.map((availableOption) => (
                <option key={availableOption.optionIdentifier} value={availableOption.optionIdentifier}>
                  {availableOption.optionName}
                </option>
              ))}
            </select>
          </div>

          {selectedProviderDefinition.requiresAccessKey ? (
            <div className="ai-configuration-field">
              <label className="ai-configuration-field-label" htmlFor={accessKeyFieldIdentifier}>
                {aiConfigurationCopy.accessKey.label}
              </label>
              <div className="ai-configuration-access-key-row">
                <input
                  id={accessKeyFieldIdentifier}
                  className="ai-configuration-access-key-input"
                  type={isAccessKeyVisible ? 'text' : 'password'}
                  value={roleSelection.accessKey}
                  placeholder={aiConfigurationCopy.accessKey.placeholder}
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={220}
                  disabled={isLocked}
                  aria-describedby={accessKeyHelpIdentifier}
                  aria-invalid={shouldShowAccessKeyWarning}
                  onChange={(changeEvent) => changeAccessKey(changeEvent.target.value)}
                  onBlur={() => setHasAccessKeyBeenLeft(true)}
                />
                <button
                  type="button"
                  className="quiet-action-button ai-configuration-visibility-button"
                  aria-pressed={isAccessKeyVisible}
                  aria-label={
                    isAccessKeyVisible ? aiConfigurationCopy.accessKey.hideButton : aiConfigurationCopy.accessKey.showButton
                  }
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
              <div id={accessKeyHelpIdentifier} className="ai-configuration-field-help">
                <p>{aiConfigurationCopy.accessKey.helper}</p>
                {shouldShowAccessKeyWarning ? (
                  <p className="ai-configuration-gentle-warning" role="status">
                    {aiConfigurationCopy.accessKey.tooShort(minimumAccessKeyLength)}
                  </p>
                ) : null}
                {maskedAccessKeyEnding ? (
                  <p className="ai-configuration-masked-ending">
                    {aiConfigurationCopy.accessKey.storedEnding(maskedAccessKeyEnding)}
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="ai-configuration-field-help">{aiConfigurationCopy.accessKey.notRequired}</p>
          )}

          {selectedProviderDefinition.usesBrowserSpeech ? (
            <div className="ai-configuration-check-row">
              <div className="ai-configuration-check-actions">
                {browserSpeechState === 'speaking' ? (
                  <button type="button" className="quiet-action-button" disabled={isLocked} onClick={stopBrowserSpeech}>
                    <Stop size={18} weight="fill" aria-hidden="true" />
                    {aiConfigurationCopy.browserSpeech.stopButton}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="quiet-action-button"
                    disabled={isLocked || !isBrowserSpeechAvailable}
                    onPointerEnter={playHoverFeedback}
                    onClick={speakSamplePhrase}
                  >
                    <SpeakerHigh size={18} weight="fill" aria-hidden="true" />
                    {aiConfigurationCopy.browserSpeech.listenButton}
                  </button>
                )}
                <span className="ai-configuration-check-tag">{aiConfigurationCopy.browserSpeech.realTestTag}</span>
              </div>
              <div className="ai-configuration-check-status" role="status" aria-live="polite">
                {!isBrowserSpeechAvailable ? (
                  <p>{aiConfigurationCopy.browserSpeech.unsupported}</p>
                ) : browserSpeechState === 'speaking' ? (
                  <p className="ai-configuration-speaking-line">
                    <span className="ai-configuration-voice-wave" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                    </span>
                    {aiConfigurationCopy.browserSpeech.speaking}
                  </p>
                ) : browserSpeechState === 'finished' ? (
                  <p className="ai-configuration-success-line">
                    <CheckCircle size={16} weight="fill" aria-hidden="true" />
                    {aiConfigurationCopy.browserSpeech.finished}
                  </p>
                ) : browserSpeechState === 'failed' ? (
                  <p className="ai-configuration-gentle-warning">{aiConfigurationCopy.browserSpeech.failed}</p>
                ) : spanishBrowserVoices.length === 0 ? (
                  <p>{aiConfigurationCopy.browserSpeech.noSpanishVoices}</p>
                ) : (
                  <p>{aiConfigurationCopy.browserSpeech.spanishVoicesFound(spanishBrowserVoices.length)}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="ai-configuration-check-row">
              <div className="ai-configuration-check-actions">
                <button
                  type="button"
                  className={
                    hasIncompleteCheckBeenAttempted ? 'quiet-action-button rejection-shake' : 'quiet-action-button'
                  }
                  disabled={isLocked}
                  aria-disabled={connectionCheckState === 'checking'}
                  onPointerEnter={playHoverFeedback}
                  onClick={runSimulatedConnectionCheck}
                >
                  <PlugsConnected size={18} weight="bold" aria-hidden="true" />
                  {connectionCheckState === 'checking'
                    ? aiConfigurationCopy.connectionCheck.inProgressButton
                    : connectionCheckState === 'succeeded'
                      ? aiConfigurationCopy.connectionCheck.buttonAgain
                      : aiConfigurationCopy.connectionCheck.button}
                </button>
                <span className="ai-configuration-check-tag">{aiConfigurationCopy.connectionCheck.simulationTag}</span>
              </div>
              <div className="ai-configuration-check-status" role="status" aria-live="polite">
                {connectionCheckState === 'checking' ? (
                  <p className="ai-configuration-waiting-line">
                    <span
                      className="ai-configuration-waiting-signal"
                      data-signal-variant={waitingSignalVariantName}
                      aria-hidden="true"
                    >
                      <span />
                      <span />
                      <span />
                    </span>
                    {waitingLines[waitingLineIndex]}
                  </p>
                ) : connectionCheckState === 'succeeded' ? (
                  <p className="ai-configuration-success-line">
                    <CheckCircle size={16} weight="fill" aria-hidden="true" />
                    {aiConfigurationCopy.connectionCheck.simulatedSuccess}
                  </p>
                ) : hasIncompleteCheckBeenAttempted ? (
                  <p className="ai-configuration-gentle-warning">
                    {roleSelection.optionIdentifier === null
                      ? aiConfigurationCopy.optionMissing
                      : aiConfigurationCopy.connectionCheck.needsCompleteBlock}
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="ai-configuration-field-help ai-configuration-console-prompt">
          <span className="ai-configuration-prompt-caret" aria-hidden="true" />
          {aiConfigurationCopy.providerMissing}
        </p>
      )}
    </section>
  )
}

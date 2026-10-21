import { ArrowsClockwise, CheckCircle, CircleDashed, LockKey, SpeakerHigh, Stop, Trash, WarningCircle } from '@phosphor-icons/react'
import { Switch } from 'radix-ui'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties, FormEvent, PointerEvent as ReactPointerEvent } from 'react'
import { chooseAnimationVariantIndex, chooseAnimationVariantName } from '../animation/animation_variety'
import { useInteractionFeedback } from '../audio/interaction_feedback'
import { voiceCopy } from '../copy/voice_copy'
import { usePlayerSettings } from '../settings/player_settings'
import { readNarrationVoicePreference, saveNarrationVoicePreference } from './narration_voice_preference'
import type { NarrationVoicePreference } from './narration_voice_preference'
import {
  changeNarrationVoiceVolume,
  enqueueNarrationVoice,
  forgetAbsentVoiceServiceQuietPeriod,
  stopNarrationVoiceOwnedBy,
} from './narration_voice_player'
import type { NarrationVoiceOutcome } from './narration_voice_player'
import {
  deleteVoiceAccessKey,
  listAvailableNarrationVoices,
  readVoiceServiceStatus,
  storeVoiceAccessKey,
} from './voice_service_client'
import type { AvailableNarrationVoice, VoiceServiceFailureName } from './voice_service_client'

type VoiceServiceStateName = 'checking' | 'absent' | 'ready_without_key' | 'ready_with_key' | 'vault_unavailable'
type AccessKeyTaskName = 'idle' | 'saving' | 'deleting'
type TestPhraseStateName = 'idle' | 'waiting' | 'speaking' | 'finished'
type PanelFailureName = Exclude<NarrationVoiceOutcome, 'finished' | 'stopped'>
type PanelNotice = { tone: 'confirmation' | 'failure'; text: string }

const waitingSignalVariantNames = ['signal_sweep', 'relay_dots', 'filling_bar'] as const
const panelOutlineVariantNames = ['drawn_from_left', 'drawn_from_center', 'drawn_from_corners'] as const
const testPhraseOwnerIdentifier = 'voice_connection_test_phrase'
const waitingLineIntervalMilliseconds = 1100

const serviceStateTextByName: Record<VoiceServiceStateName, string> = {
  checking: voiceCopy.serviceState.checking,
  absent: voiceCopy.serviceState.absent,
  ready_without_key: voiceCopy.serviceState.readyWithoutKey,
  ready_with_key: voiceCopy.serviceState.readyWithKey,
  vault_unavailable: voiceCopy.serviceState.vaultUnavailable,
}

export function VoiceConnectionPanel({ entranceOrder = 0, isLocked = false }: { entranceOrder?: number; isLocked?: boolean }) {
  const playInteractionFeedback = useInteractionFeedback()
  const { playerSettings } = usePlayerSettings()
  const { isSoundEnabled, soundVolume } = playerSettings
  const fieldIdentifierPrefix = useId()
  const [panelOutlineVariantName] = useState(() =>
    chooseAnimationVariantName('voice_connection_panel_outline', panelOutlineVariantNames),
  )
  const [voiceServiceStateName, setVoiceServiceStateName] = useState<VoiceServiceStateName>('checking')
  const [accessKeyDraft, setAccessKeyDraft] = useState('')
  const [accessKeyTaskName, setAccessKeyTaskName] = useState<AccessKeyTaskName>('idle')
  const [panelNotice, setPanelNotice] = useState<PanelNotice | null>(null)
  const [availableVoices, setAvailableVoices] = useState<AvailableNarrationVoice[] | null>(null)
  const [areVoicesLoading, setAreVoicesLoading] = useState(false)
  const [narrationVoicePreference, setNarrationVoicePreference] = useState<NarrationVoicePreference>(readNarrationVoicePreference)
  const [testPhraseStateName, setTestPhraseStateName] = useState<TestPhraseStateName>('idle')
  const [waitingSequenceIndex, setWaitingSequenceIndex] = useState(0)
  const [waitingLineIndex, setWaitingLineIndex] = useState(0)
  const [waitingSignalVariantName, setWaitingSignalVariantName] = useState<(typeof waitingSignalVariantNames)[number]>(
    waitingSignalVariantNames[0],
  )
  const isPanelMounted = useRef(true)
  const latestRequestNumber = useRef(0)

  const headingIdentifier = `${fieldIdentifierPrefix}-heading`
  const accessKeyFieldIdentifier = `${fieldIdentifierPrefix}-access-key`
  const accessKeyHelpIdentifier = `${fieldIdentifierPrefix}-access-key-help`
  const voiceFieldIdentifier = `${fieldIdentifierPrefix}-voice`
  const narrationSwitchIdentifier = `${fieldIdentifierPrefix}-narration-switch`
  const narrationSwitchHintIdentifier = `${fieldIdentifierPrefix}-narration-switch-hint`

  const showFailure = useCallback((failureName: PanelFailureName) => {
    setPanelNotice({ tone: 'failure', text: voiceCopy.failureMessages[failureName] })
  }, [])

  const absorbServiceFailure = useCallback(
    (failureName: VoiceServiceFailureName) => {
      if (failureName === 'service_absent') {
        setVoiceServiceStateName('absent')
        setAvailableVoices(null)
        return
      }
      if (failureName === 'access_key_vault_unavailable') {
        setVoiceServiceStateName('vault_unavailable')
      }
      if (failureName === 'access_key_missing') {
        setVoiceServiceStateName('ready_without_key')
        setAvailableVoices(null)
      }
      showFailure(failureName)
    },
    [showFailure],
  )

  const loadAvailableVoices = useCallback(async () => {
    setAreVoicesLoading(true)
    const voicesResult = await listAvailableNarrationVoices()
    if (!isPanelMounted.current) {
      return
    }
    setAreVoicesLoading(false)
    if (!voicesResult.wasSuccessful) {
      setAvailableVoices(null)
      absorbServiceFailure(voicesResult.failureName)
      return
    }
    setAvailableVoices(voicesResult.value)
  }, [absorbServiceFailure])

  const searchForVoiceService = useCallback(async () => {
    const requestNumber = latestRequestNumber.current + 1
    latestRequestNumber.current = requestNumber
    setVoiceServiceStateName('checking')
    forgetAbsentVoiceServiceQuietPeriod()
    const statusResult = await readVoiceServiceStatus()
    if (!isPanelMounted.current || latestRequestNumber.current !== requestNumber) {
      return
    }
    if (!statusResult.wasSuccessful) {
      absorbServiceFailure(statusResult.failureName)
      if (statusResult.failureName !== 'service_absent' && statusResult.failureName !== 'access_key_vault_unavailable') {
        setVoiceServiceStateName('absent')
      }
      return
    }
    setVoiceServiceStateName(statusResult.value.isAccessKeyStored ? 'ready_with_key' : 'ready_without_key')
    if (statusResult.value.isAccessKeyStored) {
      void loadAvailableVoices()
    } else {
      setAvailableVoices(null)
    }
  }, [absorbServiceFailure, loadAvailableVoices])

  useEffect(() => {
    isPanelMounted.current = true
    const searchTimeoutIdentifier = window.setTimeout(() => void searchForVoiceService(), 0)
    return () => {
      isPanelMounted.current = false
      window.clearTimeout(searchTimeoutIdentifier)
      stopNarrationVoiceOwnedBy(testPhraseOwnerIdentifier)
    }
  }, [searchForVoiceService])

  useEffect(() => {
    changeNarrationVoiceVolume(isSoundEnabled ? soundVolume : 0)
  }, [isSoundEnabled, soundVolume])

  useEffect(() => {
    if (testPhraseStateName !== 'waiting') {
      return
    }
    const waitingStartTimestamp = Date.now()
    const waitingLineCount = voiceCopy.testPhrase.waitingSequences[waitingSequenceIndex].length
    const waitingIntervalIdentifier = window.setInterval(() => {
      const elapsedLineCount = Math.floor((Date.now() - waitingStartTimestamp) / waitingLineIntervalMilliseconds)
      setWaitingLineIndex(Math.min(waitingLineCount - 1, elapsedLineCount))
    }, 200)
    return () => window.clearInterval(waitingIntervalIdentifier)
  }, [testPhraseStateName, waitingSequenceIndex])

  const changeNarrationVoicePreference = (changedPreference: NarrationVoicePreference) => {
    setNarrationVoicePreference(changedPreference)
    saveNarrationVoicePreference(changedPreference)
  }

  const playHoverFeedback = (pointerEvent: ReactPointerEvent) => {
    if (pointerEvent.pointerType === 'mouse') {
      playInteractionFeedback('option_hover')
    }
  }

  const saveAccessKey = async (submitEvent: FormEvent) => {
    submitEvent.preventDefault()
    const submittedAccessKey = accessKeyDraft.trim()
    if (!submittedAccessKey || accessKeyTaskName !== 'idle') {
      return
    }
    setAccessKeyDraft('')
    setAccessKeyTaskName('saving')
    setPanelNotice(null)
    playInteractionFeedback('action_sent')
    const storeResult = await storeVoiceAccessKey(submittedAccessKey)
    if (!isPanelMounted.current) {
      return
    }
    setAccessKeyTaskName('idle')
    if (!storeResult.wasSuccessful) {
      playInteractionFeedback('rejection')
      absorbServiceFailure(storeResult.failureName)
      return
    }
    playInteractionFeedback('confirmation')
    setVoiceServiceStateName('ready_with_key')
    setPanelNotice({ tone: 'confirmation', text: voiceCopy.accessKey.saved })
    void loadAvailableVoices()
  }

  const deleteAccessKey = async () => {
    if (accessKeyTaskName !== 'idle') {
      return
    }
    setAccessKeyTaskName('deleting')
    setPanelNotice(null)
    playInteractionFeedback('option_click')
    stopNarrationVoiceOwnedBy(testPhraseOwnerIdentifier)
    const deleteResult = await deleteVoiceAccessKey()
    if (!isPanelMounted.current) {
      return
    }
    setAccessKeyTaskName('idle')
    if (!deleteResult.wasSuccessful) {
      playInteractionFeedback('rejection')
      absorbServiceFailure(deleteResult.failureName)
      return
    }
    playInteractionFeedback('panel_close')
    setVoiceServiceStateName('ready_without_key')
    setAvailableVoices(null)
    changeNarrationVoicePreference({ ...narrationVoicePreference, isNarrationVoiceEnabled: false })
    setPanelNotice({ tone: 'confirmation', text: voiceCopy.accessKey.deleted })
  }

  const chooseVoice = (voiceIdentifier: string) => {
    playInteractionFeedback('option_click')
    stopNarrationVoiceOwnedBy(testPhraseOwnerIdentifier)
    const chosenVoice = availableVoices?.find((availableVoice) => availableVoice.voiceIdentifier === voiceIdentifier) ?? null
    changeNarrationVoicePreference({
      hasPlayerDecidedNarrationVoiceUse: narrationVoicePreference.hasPlayerDecidedNarrationVoiceUse,
      isNarrationVoiceEnabled:
        chosenVoice !== null &&
        (narrationVoicePreference.isNarrationVoiceEnabled || !narrationVoicePreference.hasPlayerDecidedNarrationVoiceUse),
      chosenVoiceIdentifier: chosenVoice?.voiceIdentifier ?? null,
      chosenVoiceVisibleName: chosenVoice?.visibleName ?? null,
    })
  }

  const listenToTestPhrase = () => {
    const chosenVoiceIdentifier = narrationVoicePreference.chosenVoiceIdentifier
    if (!chosenVoiceIdentifier) {
      return
    }
    playInteractionFeedback('option_click')
    setPanelNotice(null)
    if (!isSoundEnabled) {
      setPanelNotice({ tone: 'failure', text: voiceCopy.testPhrase.soundDisabled })
      return
    }
    setWaitingSequenceIndex(
      chooseAnimationVariantIndex('voice_connection_waiting_sequence', voiceCopy.testPhrase.waitingSequences.length),
    )
    setWaitingSignalVariantName(chooseAnimationVariantName('voice_connection_waiting_signal', waitingSignalVariantNames))
    setWaitingLineIndex(0)
    setTestPhraseStateName('waiting')
    forgetAbsentVoiceServiceQuietPeriod()
    enqueueNarrationVoice({
      ownerIdentifier: testPhraseOwnerIdentifier,
      voiceIdentifier: chosenVoiceIdentifier,
      markedParagraphs: [voiceCopy.testPhrase.text],
      onPlaybackStarted: () => {
        if (isPanelMounted.current) {
          setTestPhraseStateName('speaking')
        }
      },
      onSettled: (narrationVoiceOutcome) => {
        if (!isPanelMounted.current) {
          return
        }
        if (narrationVoiceOutcome === 'finished') {
          setTestPhraseStateName('finished')
          return
        }
        setTestPhraseStateName('idle')
        if (narrationVoiceOutcome === 'stopped') {
          return
        }
        if (narrationVoiceOutcome === 'playback_blocked') {
          showFailure(narrationVoiceOutcome)
          return
        }
        absorbServiceFailure(narrationVoiceOutcome)
      },
    })
  }

  const stopTestPhrase = () => {
    playInteractionFeedback('option_click')
    stopNarrationVoiceOwnedBy(testPhraseOwnerIdentifier)
  }

  const isServiceReady = voiceServiceStateName === 'ready_with_key' || voiceServiceStateName === 'ready_without_key'
  const isAccessKeyStored = voiceServiceStateName === 'ready_with_key'
  const isTestPhraseActive = testPhraseStateName === 'waiting' || testPhraseStateName === 'speaking'
  const spanishVoiceCount = availableVoices?.filter((availableVoice) => availableVoice.speaksSpanish).length ?? 0
  const isChosenVoiceListed =
    availableVoices?.some((availableVoice) => availableVoice.voiceIdentifier === narrationVoicePreference.chosenVoiceIdentifier) ?? false
  const waitingLines = voiceCopy.testPhrase.waitingSequences[waitingSequenceIndex]

  return (
    <section
      className="voice-connection-panel"
      aria-labelledby={headingIdentifier}
      data-service-state={voiceServiceStateName}
      data-outline-variant={panelOutlineVariantName}
      style={{ '--entrance-order': entranceOrder } as CSSProperties}
    >
      <span className="voice-connection-panel-outline" aria-hidden="true" />
      <header className="voice-connection-header">
        <span className="voice-connection-number" aria-hidden="true">
          {voiceCopy.blockNumber}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={headingIdentifier} className="voice-connection-title">
            {voiceCopy.title}
          </h2>
          <p className="voice-connection-description">{voiceCopy.description}</p>
        </div>
      </header>

      <div className="voice-connection-service-row">
        <p className="voice-connection-service-state" role="status">
          <span className="voice-connection-field-label">{voiceCopy.serviceState.label}</span>
          <span className="voice-connection-state-chip" data-service-state={voiceServiceStateName}>
            {isAccessKeyStored ? (
              <CheckCircle size={16} weight="fill" aria-hidden="true" />
            ) : isServiceReady || voiceServiceStateName === 'checking' ? (
              <CircleDashed size={16} weight="bold" aria-hidden="true" />
            ) : (
              <WarningCircle size={16} weight="bold" aria-hidden="true" />
            )}
            {serviceStateTextByName[voiceServiceStateName]}
          </span>
        </p>
        <button
          type="button"
          className="quiet-action-button"
          disabled={isLocked || voiceServiceStateName === 'checking'}
          onPointerEnter={playHoverFeedback}
          onClick={() => {
            playInteractionFeedback('option_click')
            setPanelNotice(null)
            void searchForVoiceService()
          }}
        >
          <ArrowsClockwise size={18} weight="bold" aria-hidden="true" />
          {voiceCopy.serviceState.searchAgainButton}
        </button>
      </div>

      {voiceServiceStateName === 'absent' ? <p className="voice-connection-help">{voiceCopy.serviceState.absentHelp}</p> : null}

      {isServiceReady ? (
        <div className="voice-connection-fields">
          <form className="voice-connection-field" onSubmit={(submitEvent) => void saveAccessKey(submitEvent)} autoComplete="off">
            <label className="voice-connection-field-label" htmlFor={accessKeyFieldIdentifier}>
              {voiceCopy.accessKey.label}
            </label>
            <div className="voice-connection-access-key-row">
              <input
                id={accessKeyFieldIdentifier}
                className="voice-connection-input"
                type="password"
                name="voice-service-access-key"
                autoComplete="off"
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                maxLength={200}
                value={accessKeyDraft}
                placeholder={voiceCopy.accessKey.placeholder}
                disabled={isLocked || accessKeyTaskName !== 'idle'}
                aria-describedby={accessKeyHelpIdentifier}
                onChange={(changeEvent) => setAccessKeyDraft(changeEvent.target.value)}
                onKeyDown={(keyboardEvent) => {
                  if (keyboardEvent.key.length === 1 || keyboardEvent.key === 'Backspace') {
                    playInteractionFeedback('typewriter_key')
                  }
                }}
              />
              <button
                type="submit"
                className="quiet-action-button voice-connection-save-button"
                disabled={isLocked || accessKeyTaskName !== 'idle' || accessKeyDraft.trim().length === 0}
                onPointerEnter={playHoverFeedback}
              >
                <LockKey size={18} weight="fill" aria-hidden="true" />
                {accessKeyTaskName === 'saving' ? voiceCopy.accessKey.savingButton : voiceCopy.accessKey.saveButton}
              </button>
            </div>
            <div id={accessKeyHelpIdentifier} className="voice-connection-help">
              <p>{voiceCopy.accessKey.helper}</p>
              {isAccessKeyStored ? <p>{voiceCopy.accessKey.replaceHint}</p> : null}
            </div>
            {isAccessKeyStored ? (
              <div>
                <button
                  type="button"
                  className="quiet-action-button"
                  disabled={isLocked || accessKeyTaskName !== 'idle'}
                  onPointerEnter={playHoverFeedback}
                  onClick={() => void deleteAccessKey()}
                >
                  <Trash size={18} weight="bold" aria-hidden="true" />
                  {accessKeyTaskName === 'deleting' ? voiceCopy.accessKey.deletingButton : voiceCopy.accessKey.deleteButton}
                </button>
              </div>
            ) : null}
          </form>

          {isAccessKeyStored ? (
            <>
              <div className="voice-connection-field">
                <label className="voice-connection-field-label" htmlFor={voiceFieldIdentifier}>
                  {voiceCopy.voiceChoice.label}
                </label>
                <select
                  id={voiceFieldIdentifier}
                  className="voice-connection-input voice-connection-select"
                  value={isChosenVoiceListed ? (narrationVoicePreference.chosenVoiceIdentifier ?? '') : ''}
                  disabled={isLocked || areVoicesLoading || !availableVoices || availableVoices.length === 0}
                  onChange={(changeEvent) => chooseVoice(changeEvent.target.value)}
                >
                  <option value="">{voiceCopy.voiceChoice.placeholder}</option>
                  {availableVoices?.map((availableVoice) => (
                    <option key={availableVoice.voiceIdentifier} value={availableVoice.voiceIdentifier}>
                      {availableVoice.speaksSpanish
                        ? `${availableVoice.visibleName} · ${voiceCopy.voiceChoice.spanishMark}`
                        : availableVoice.visibleName}
                    </option>
                  ))}
                </select>
                <div className="voice-connection-help" aria-live="polite">
                  {areVoicesLoading ? <p>{voiceCopy.voiceChoice.loading}</p> : null}
                  {!areVoicesLoading && availableVoices && availableVoices.length === 0 ? <p>{voiceCopy.voiceChoice.empty}</p> : null}
                  {!areVoicesLoading && availableVoices && availableVoices.length > 0 ? (
                    <p>{voiceCopy.voiceChoice.voiceCount(availableVoices.length, spanishVoiceCount)}</p>
                  ) : null}
                </div>
                {!areVoicesLoading && !availableVoices ? (
                  <div>
                    <button
                      type="button"
                      className="quiet-action-button"
                      disabled={isLocked}
                      onPointerEnter={playHoverFeedback}
                      onClick={() => {
                        playInteractionFeedback('option_click')
                        setPanelNotice(null)
                        void loadAvailableVoices()
                      }}
                    >
                      <ArrowsClockwise size={18} weight="bold" aria-hidden="true" />
                      {voiceCopy.voiceChoice.reloadButton}
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="voice-connection-switch-row">
                <div className="min-w-0 flex-1">
                  <label className="voice-connection-switch-label" htmlFor={narrationSwitchIdentifier}>
                    {voiceCopy.narrationSwitch.label}
                  </label>
                  <p id={narrationSwitchHintIdentifier} className="voice-connection-help">
                    {isChosenVoiceListed ? voiceCopy.narrationSwitch.hint : voiceCopy.narrationSwitch.needsVoice}
                  </p>
                </div>
                <Switch.Root
                  id={narrationSwitchIdentifier}
                  className="settings-switch-root"
                  checked={narrationVoicePreference.isNarrationVoiceEnabled && isChosenVoiceListed}
                  disabled={isLocked || !isChosenVoiceListed}
                  aria-describedby={narrationSwitchHintIdentifier}
                  onCheckedChange={(isChecked) => {
                    playInteractionFeedback(isChecked ? 'confirmation' : 'option_click')
                    changeNarrationVoicePreference({
                      ...narrationVoicePreference,
                      isNarrationVoiceEnabled: isChecked,
                      hasPlayerDecidedNarrationVoiceUse: true,
                    })
                  }}
                >
                  <Switch.Thumb className="settings-switch-thumb" />
                </Switch.Root>
              </div>

              <div className="voice-connection-field">
                <span className="voice-connection-field-label">{voiceCopy.testPhrase.label}</span>
                <blockquote className="voice-connection-test-phrase">{voiceCopy.testPhrase.text}</blockquote>
                <div className="voice-connection-test-actions">
                  <button
                    type="button"
                    className="quiet-action-button"
                    disabled={isLocked || !isChosenVoiceListed}
                    onPointerEnter={playHoverFeedback}
                    onClick={isTestPhraseActive ? stopTestPhrase : listenToTestPhrase}
                  >
                    {isTestPhraseActive ? (
                      <Stop size={18} weight="fill" aria-hidden="true" />
                    ) : (
                      <SpeakerHigh size={18} weight="bold" aria-hidden="true" />
                    )}
                    {isTestPhraseActive ? voiceCopy.testPhrase.stopButton : voiceCopy.testPhrase.listenButton}
                  </button>
                  <span className="voice-connection-real-call-tag">{voiceCopy.testPhrase.realCallTag}</span>
                </div>
                <div className="voice-connection-test-status" aria-live="polite">
                  {testPhraseStateName === 'waiting' ? (
                    <p className="voice-connection-status-line">
                      <span className="voice-connection-waiting-signal" data-signal-variant={waitingSignalVariantName} aria-hidden="true">
                        <span />
                        <span />
                        <span />
                      </span>
                      {waitingLines[Math.min(waitingLineIndex, waitingLines.length - 1)]}
                    </p>
                  ) : null}
                  {testPhraseStateName === 'speaking' ? (
                    <p className="voice-connection-status-line">
                      <span className="voice-connection-voice-wave" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                        <span />
                        <span />
                      </span>
                      {voiceCopy.testPhrase.speaking}
                    </p>
                  ) : null}
                  {testPhraseStateName === 'finished' ? (
                    <p className="voice-connection-status-line" data-tone="confirmation">
                      <CheckCircle size={18} weight="fill" aria-hidden="true" />
                      {voiceCopy.testPhrase.finished}
                    </p>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="voice-connection-notice-region" aria-live="polite">
        {panelNotice ? (
          <p className="voice-connection-status-line" data-tone={panelNotice.tone}>
            {panelNotice.tone === 'confirmation' ? (
              <CheckCircle size={18} weight="fill" aria-hidden="true" />
            ) : (
              <WarningCircle size={18} weight="bold" aria-hidden="true" />
            )}
            {panelNotice.text}
          </p>
        ) : null}
      </div>

      <p className="voice-connection-secrecy-notice">
        <LockKey size={18} weight="fill" aria-hidden="true" />
        <span>{voiceCopy.secrecyNotice}</span>
      </p>
    </section>
  )
}

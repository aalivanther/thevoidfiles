import { ArrowRight, CheckCircle, CircleDashed, LockKey } from '@phosphor-icons/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { chooseAnimationVariantIndex, chooseAnimationVariantName } from '../../animation/animation_variety'
import { useInteractionFeedback } from '../../audio/interaction_feedback'
import { aiConfigurationCopy } from '../../copy/ai_configuration_copy'
import { providerDefinitionsByRoleName } from '../../demonstration/ai_configuration_data'
import type { AiProviderDefinition, AiRoleName } from '../../demonstration/ai_configuration_data'
import { usePlayerSettings } from '../../settings/player_settings'
import { VoiceConnectionPanel } from '../../voice/VoiceConnectionPanel'
import { AiRoleConfigurationBlock } from './AiRoleConfigurationBlock'
import { GameServiceRunModeIndicator } from './GameServiceRunModeIndicator'
import { LocalServiceConnectionSection } from './LocalServiceConnectionSection'
import type { LocalServiceConnectionSummary } from './LocalServiceConnectionSection'
import { buildAiRoleRecord, emptyAiRoleSelection, isAiRoleSelectionComplete } from './ai_configuration_record'
import type { AiConfigurationRecord, AiRoleRecord, AiRoleSelection } from './ai_configuration_record'
import { useGameServicePresence } from './use_game_service_presence'

const consoleCursorVariantNames = ['solid_block', 'underscore_blink', 'hollow_block'] as const
const bootLineIntervalMilliseconds = 340
const departureFadeMilliseconds = 760
const reducedMotionDepartureMilliseconds = 160
const roleNames: readonly AiRoleName[] = ['story', 'voice']

function findProviderDefinition(roleName: AiRoleName, providerIdentifier: string | null): AiProviderDefinition | null {
  return (
    providerDefinitionsByRoleName[roleName].find(
      (providerDefinition) => providerDefinition.providerIdentifier === providerIdentifier,
    ) ?? null
  )
}

export function AiConfigurationScreen({
  onConfigurationHandled,
}: {
  onConfigurationHandled: (aiConfiguration: unknown) => void
}) {
  const playInteractionFeedback = useInteractionFeedback()
  const { shouldReduceMotion } = usePlayerSettings()
  const [bootSequenceIndex] = useState(() =>
    chooseAnimationVariantIndex('ai_configuration_boot_sequence', aiConfigurationCopy.bootSequences.length),
  )
  const [consoleCursorVariantName] = useState(() =>
    chooseAnimationVariantName('ai_configuration_console_cursor', consoleCursorVariantNames),
  )
  const bootLines = aiConfigurationCopy.bootSequences[bootSequenceIndex]
  const [revealedBootLineCount, setRevealedBootLineCount] = useState(() => (shouldReduceMotion ? bootLines.length : 1))
  const [roleSelections, setRoleSelections] = useState<Record<AiRoleName, AiRoleSelection>>({
    story: emptyAiRoleSelection,
    voice: emptyAiRoleSelection,
  })
  const [isLeaving, setIsLeaving] = useState(false)
  const gameServicePresence = useGameServicePresence()
  const [localServiceConnectionSummary, setLocalServiceConnectionSummary] = useState<LocalServiceConnectionSummary | null>(
    null,
  )
  const [voiceAccessKeyRevision, setVoiceAccessKeyRevision] = useState(0)
  const isServicePresenceKnown = gameServicePresence !== null
  const isLocalServicePresent = gameServicePresence?.isServicePresent === true
  const absorbAccessKeyChange = useCallback((roleName: AiRoleName) => {
    if (roleName === 'voice') {
      setVoiceAccessKeyRevision((currentRevision) => currentRevision + 1)
    }
  }, [])
  const departureTimeoutIdentifier = useRef<number | null>(null)

  useEffect(() => {
    if (shouldReduceMotion) {
      return
    }
    const bootStartTimestamp = Date.now()
    const bootIntervalIdentifier = window.setInterval(() => {
      const dueLineCount = 1 + Math.floor((Date.now() - bootStartTimestamp) / bootLineIntervalMilliseconds)
      setRevealedBootLineCount(Math.min(bootLines.length, dueLineCount))
      if (dueLineCount >= bootLines.length) {
        window.clearInterval(bootIntervalIdentifier)
      }
    }, 90)
    return () => window.clearInterval(bootIntervalIdentifier)
  }, [shouldReduceMotion, bootLines.length])

  useEffect(() => {
    return () => {
      if (departureTimeoutIdentifier.current !== null) {
        window.clearTimeout(departureTimeoutIdentifier.current)
      }
    }
  }, [])

  const isRoleComplete = (roleName: AiRoleName) =>
    isLocalServicePresent
      ? localServiceConnectionSummary?.[roleName].isReady === true
      : isAiRoleSelectionComplete(
          roleSelections[roleName],
          findProviderDefinition(roleName, roleSelections[roleName].providerIdentifier),
        )
  const completedRoleCount = roleNames.filter(isRoleComplete).length
  const areBothRolesComplete = completedRoleCount === roleNames.length
  const visibleBootLineCount = shouldReduceMotion ? bootLines.length : revealedBootLineCount

  const leaveTowardTitle = (wasSkipped: boolean) => {
    if (isLeaving) {
      return
    }
    const buildRecordForRole = (roleName: AiRoleName): AiRoleRecord | null => {
      if (isLocalServicePresent) {
        const roleSummary = localServiceConnectionSummary?.[roleName]
        if (!roleSummary?.isReady) {
          return null
        }
        return {
          providerIdentifier: `local_service_${roleSummary.providerModeName}_${roleName}`,
          providerName:
            roleSummary.providerModeName === 'real'
              ? aiConfigurationCopy.localService.roles[roleName].realProviderName
              : aiConfigurationCopy.localService.syntheticProviderName,
          optionIdentifier: 'local_service',
          optionName: aiConfigurationCopy.localService.servicePlacementOptionName,
          maskedAccessKeyEnding:
            roleSummary.visibleEnding === null ? null : aiConfigurationCopy.localService.maskedEnding(roleSummary.visibleEnding),
          connectionCheck: roleSummary.wasConnectionChecked ? 'real_local_service' : 'not_run',
        }
      }
      const providerDefinition = findProviderDefinition(roleName, roleSelections[roleName].providerIdentifier)
      return buildAiRoleRecord(
        roleSelections[roleName],
        providerDefinition,
        providerDefinition ? aiConfigurationCopy.providerNames[providerDefinition.providerIdentifier] : '',
      )
    }
    const aiConfigurationRecord: AiConfigurationRecord = {
      recordVersion: 1,
      wasSkipped,
      handledAtTimestamp: new Date().toISOString(),
      story: buildRecordForRole('story'),
      voice: buildRecordForRole('voice'),
    }
    playInteractionFeedback(wasSkipped ? 'panel_close' : 'confirmation')
    playInteractionFeedback('falling_whoosh')
    setIsLeaving(true)
    departureTimeoutIdentifier.current = window.setTimeout(
      () => onConfigurationHandled(aiConfigurationRecord),
      shouldReduceMotion ? reducedMotionDepartureMilliseconds : departureFadeMilliseconds,
    )
  }

  const playHoverFeedback = (pointerEvent: ReactPointerEvent) => {
    if (pointerEvent.pointerType === 'mouse') {
      playInteractionFeedback('option_hover')
    }
  }

  return (
    <main id="main-content" className="ai-configuration-screen" data-leaving={isLeaving}>
      <div className="ai-configuration-console">
        <header className="ai-configuration-console-header">
          <p className="ai-configuration-console-kicker">
            <span className="ai-configuration-power-lamp" aria-hidden="true" />
            {aiConfigurationCopy.consoleHeading}
          </p>
          <h1 className="display-title ai-configuration-title">{aiConfigurationCopy.screenTitle}</h1>
          <ol className="ai-configuration-boot-log" aria-label={aiConfigurationCopy.bootSequenceAccessibleLabel}>
            {bootLines.slice(0, visibleBootLineCount).map((bootLine, bootLineIndex) => (
              <li key={bootLine} className="ai-configuration-boot-line">
                <span aria-hidden="true">&gt; </span>
                {bootLine}
                {bootLineIndex === visibleBootLineCount - 1 ? (
                  <span
                    className="ai-configuration-console-cursor"
                    data-cursor-variant={consoleCursorVariantName}
                    aria-hidden="true"
                  />
                ) : null}
              </li>
            ))}
          </ol>
          <p className="ai-configuration-introduction">{aiConfigurationCopy.introduction}</p>
          <p className="ai-configuration-privacy-notice">
            <LockKey size={18} weight="fill" aria-hidden="true" />
            <span>
              {isLocalServicePresent
                ? aiConfigurationCopy.localService.privacyNotice
                : aiConfigurationCopy.demonstrationPrivacyNotice}
            </span>
          </p>
          <GameServiceRunModeIndicator shouldProbeWhenShown />
          {isServicePresenceKnown && !isLocalServicePresent ? (
            <p className="ai-configuration-field-help">{aiConfigurationCopy.localService.demonstrationModeNotice}</p>
          ) : null}
        </header>

        <div className="ai-configuration-progress" role="group" aria-label={aiConfigurationCopy.progress.label}>
          <p className="ai-configuration-progress-summary" aria-live="polite">
            <span className="ai-configuration-field-label">{aiConfigurationCopy.progress.label}</span>
            <strong>{aiConfigurationCopy.progress.summary(completedRoleCount)}</strong>
          </p>
          <ol className="ai-configuration-progress-track">
            {roleNames.map((roleName) => {
              const isThisRoleComplete = isRoleComplete(roleName)
              return (
                <li key={roleName} className="ai-configuration-progress-segment" data-complete={isThisRoleComplete}>
                  {isThisRoleComplete ? (
                    <CheckCircle size={16} weight="fill" aria-hidden="true" />
                  ) : (
                    <CircleDashed size={16} weight="bold" aria-hidden="true" />
                  )}
                  <span>{aiConfigurationCopy.roles[roleName].title}</span>
                  <span className="ai-configuration-progress-state">
                    {isThisRoleComplete ? aiConfigurationCopy.progress.complete : aiConfigurationCopy.progress.pending}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>

        {!isServicePresenceKnown ? (
          <p className="ai-configuration-field-help ai-configuration-console-prompt" role="status">
            <span className="ai-configuration-prompt-caret" aria-hidden="true" />
            {aiConfigurationCopy.localService.searchingLine}
          </p>
        ) : isLocalServicePresent ? (
          <LocalServiceConnectionSection
            isLocked={isLeaving}
            onConnectionSummaryChanged={setLocalServiceConnectionSummary}
            onAccessKeyChanged={absorbAccessKeyChange}
          />
        ) : (
          <div className="ai-configuration-block-grid">
            {roleNames.map((roleName, roleIndex) => (
              <AiRoleConfigurationBlock
                key={roleName}
                roleName={roleName}
                roleSelection={roleSelections[roleName]}
                entranceOrder={roleIndex + 1}
                isLocked={isLeaving}
                onRoleSelectionChanged={(roleSelection) =>
                  setRoleSelections((currentSelections) => ({ ...currentSelections, [roleName]: roleSelection }))
                }
              />
            ))}
          </div>
        )}

        <VoiceConnectionPanel key={voiceAccessKeyRevision} entranceOrder={3} isLocked={isLeaving} />

        <footer className="ai-configuration-footer" style={{ '--entrance-order': 4 } as CSSProperties}>
          <div className="ai-configuration-footer-actions">
            <button
              type="button"
              className="primary-action-button"
              disabled={!areBothRolesComplete || isLeaving}
              aria-describedby="ai-configuration-save-reason"
              onPointerEnter={playHoverFeedback}
              onClick={() => leaveTowardTitle(false)}
            >
              {aiConfigurationCopy.actions.saveAndContinue}
              <ArrowRight size={20} weight="bold" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="quiet-action-button"
              disabled={isLeaving}
              aria-describedby="ai-configuration-skip-notice"
              onPointerEnter={playHoverFeedback}
              onClick={() => leaveTowardTitle(true)}
            >
              {aiConfigurationCopy.actions.continueWithoutConfiguring}
            </button>
          </div>
          <p id="ai-configuration-save-reason" className="ai-configuration-field-help" hidden={areBothRolesComplete}>
            {isLocalServicePresent
              ? aiConfigurationCopy.localService.saveDisabledReason
              : aiConfigurationCopy.actions.saveDisabledReason}
          </p>
          <p id="ai-configuration-skip-notice" className="ai-configuration-skip-notice">
            {aiConfigurationCopy.actions.skipNotice}
          </p>
        </footer>
      </div>

      {isLeaving ? (
        <div className="ai-configuration-departure" role="status">
          <span className="visually-hidden-text">{aiConfigurationCopy.actions.leaving}</span>
          <span className="ai-configuration-departure-light" aria-hidden="true" />
        </div>
      ) : null}
    </main>
  )
}

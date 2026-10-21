import {
  ArrowCounterClockwise,
  BookOpenText,
  FilmStrip,
  Heart,
  Minus,
  Plus,
  SignOut,
  SpeakerHigh,
  UserGear,
  X,
} from '@phosphor-icons/react'
import { Dialog, Slider, Switch, Tabs, ToggleGroup } from 'radix-ui'
import { memo, useEffect, useId, useState } from 'react'
import type { ReactNode } from 'react'
import { changeLiveMusicVolume } from '../audio/generated_ambient_music'
import { changeLiveSoundVolume, useInteractionFeedback } from '../audio/interaction_feedback'
import { usePlayerSettings } from '../settings/player_settings'
import type { NarrativeTextSize, PlayerSettings, ScreenEffectsIntensity, TextRevealSpeed } from '../settings/player_settings'
import { spanishInterfaceCopy } from '../spanish_interface_copy'
import { GameServiceRunModeIndicator } from './ai_configuration/GameServiceRunModeIndicator'

type BooleanSettingName = {
  [SettingName in keyof PlayerSettings]: PlayerSettings[SettingName] extends boolean ? SettingName : never
}[keyof PlayerSettings]

function SettingSwitchRow({
  settingName,
  label,
  hint,
}: {
  settingName: BooleanSettingName
  label: string
  hint: string
}) {
  const { playerSettings, updatePlayerSettings } = usePlayerSettings()
  const playInteractionFeedback = useInteractionFeedback()
  const labelIdentifier = useId()
  const hintIdentifier = useId()
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p id={labelIdentifier} className="text-sm font-semibold">
          {label}
        </p>
        <p id={hintIdentifier} className="text-xs text-paper-muted">
          {hint}
        </p>
      </div>
      <Switch.Root
        className="settings-switch-root"
        checked={playerSettings[settingName]}
        aria-labelledby={labelIdentifier}
        aria-describedby={hintIdentifier}
        onCheckedChange={(isChecked) => {
          updatePlayerSettings({ [settingName]: isChecked })
          playInteractionFeedback('option_click')
        }}
      >
        <Switch.Thumb className="settings-switch-thumb" />
      </Switch.Root>
    </div>
  )
}

function SettingChoiceRow<ChoiceValue extends string>({
  label,
  hint,
  currentValue,
  visibleTextByValue,
  onValueChosen,
}: {
  label: string
  hint?: string
  currentValue: ChoiceValue
  visibleTextByValue: Record<ChoiceValue, string>
  onValueChosen: (chosenValue: ChoiceValue) => void
}) {
  const playInteractionFeedback = useInteractionFeedback()
  const labelIdentifier = useId()
  return (
    <div className="py-3">
      <p id={labelIdentifier} className={`text-sm font-semibold ${hint ? '' : 'mb-2'}`}>
        {label}
      </p>
      {hint ? <p className="mb-2 text-xs text-paper-muted">{hint}</p> : null}
      <ToggleGroup.Root
        type="single"
        className="flex gap-2"
        value={currentValue}
        aria-labelledby={labelIdentifier}
        onValueChange={(chosenValue) => {
          if (chosenValue) {
            onValueChosen(chosenValue as ChoiceValue)
            playInteractionFeedback('option_click')
          }
        }}
      >
        {(Object.keys(visibleTextByValue) as ChoiceValue[]).map((choiceValue) => (
          <ToggleGroup.Item key={choiceValue} value={choiceValue} className="settings-choice-item">
            {visibleTextByValue[choiceValue]}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
    </div>
  )
}

function describeVolumeLevel(volumePercentage: number): string {
  const volumeLevelCopy = spanishInterfaceCopy.settings.volumeLevels
  if (volumePercentage === 0) {
    return volumeLevelCopy.silent
  }
  if (volumePercentage <= 30) {
    return volumeLevelCopy.low
  }
  if (volumePercentage <= 65) {
    return volumeLevelCopy.medium
  }
  return volumeLevelCopy.high
}

const VolumeSettingRow = memo(function VolumeSettingRow({
  label,
  storedVolume,
  onLiveVolumeChanged,
  onVolumeCommitted,
}: {
  label: string
  storedVolume: number
  onLiveVolumeChanged: (liveVolume: number) => void
  onVolumeCommitted: (committedVolume: number) => void
}) {
  const settingsCopy = spanishInterfaceCopy.settings
  const [draggedPercentage, setDraggedPercentage] = useState(Math.round(storedVolume * 100))

  useEffect(() => {
    setDraggedPercentage(Math.round(storedVolume * 100))
  }, [storedVolume])

  const commitPercentage = (chosenPercentage: number) => {
    const limitedPercentage = Math.min(100, Math.max(0, chosenPercentage))
    setDraggedPercentage(limitedPercentage)
    onLiveVolumeChanged(limitedPercentage / 100)
    onVolumeCommitted(limitedPercentage / 100)
  }

  return (
    <div className="py-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold">{label}</p>
        <p className="font-[family-name:var(--font-dossier)] text-sm tabular-nums" aria-hidden="true">
          <span className="text-paper-muted">{describeVolumeLevel(draggedPercentage)} · </span>
          {draggedPercentage} %
        </p>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          className="quiet-action-button !min-h-[40px] !min-w-[40px] !p-0"
          aria-label={settingsCopy.decreaseVolumeLabel(label)}
          onClick={() => commitPercentage(draggedPercentage - 10)}
        >
          <Minus size={16} weight="bold" aria-hidden="true" />
        </button>
        <Slider.Root
          className="settings-slider-root"
          min={0}
          max={100}
          step={1}
          value={[draggedPercentage]}
          onValueChange={([chosenPercentage]) => {
            setDraggedPercentage(chosenPercentage)
            onLiveVolumeChanged(chosenPercentage / 100)
          }}
          onValueCommit={([chosenPercentage]) => onVolumeCommitted(chosenPercentage / 100)}
        >
          <Slider.Track className="settings-slider-track">
            <Slider.Range className="settings-slider-range" />
          </Slider.Track>
          <Slider.Thumb
            className="settings-slider-thumb"
            aria-label={label}
            aria-valuetext={`${draggedPercentage} %, ${describeVolumeLevel(draggedPercentage)}`}
          />
        </Slider.Root>
        <button
          type="button"
          className="quiet-action-button !min-h-[40px] !min-w-[40px] !p-0"
          aria-label={settingsCopy.increaseVolumeLabel(label)}
          onClick={() => commitPercentage(draggedPercentage + 10)}
        >
          <Plus size={16} weight="bold" aria-hidden="true" />
        </button>
      </div>
      <div
        className="mt-0.5 flex justify-between px-[3.1rem] font-[family-name:var(--font-dossier)] text-[0.625rem] text-paper-muted"
        aria-hidden="true"
      >
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>
    </div>
  )
})

function SettingsSectionTrigger({ sectionName, label, icon }: { sectionName: string; label: string; icon: ReactNode }) {
  return (
    <Tabs.Trigger value={sectionName} className="settings-section-trigger">
      {icon}
      <span>{label}</span>
    </Tabs.Trigger>
  )
}

type SettingsSheetProperties = {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onDemonstrationRestartRequested: () => void
  onExitToOriginRequested: () => void
  onAcknowledgementsRequested: () => void
  canExitToOrigin: boolean
}

export function SettingsSheet({
  isOpen,
  onOpenChange,
  onDemonstrationRestartRequested,
  onExitToOriginRequested,
  onAcknowledgementsRequested,
  canExitToOrigin,
}: SettingsSheetProperties) {
  const settingsCopy = spanishInterfaceCopy.settings
  const { playerSettings, updatePlayerSettings } = usePlayerSettings()
  const playInteractionFeedback = useInteractionFeedback()
  const [isVibrationSupported] = useState(() => 'vibrate' in navigator)
  const [isRestartAwaitingConfirmation, setIsRestartAwaitingConfirmation] = useState(false)

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="side-sheet-content flex flex-col p-5"
          onCloseAutoFocus={(closeEvent) => {
            const settingsTrigger = document.querySelector<HTMLElement>('[data-settings-trigger]')
            if (settingsTrigger) {
              closeEvent.preventDefault()
              settingsTrigger.focus()
            }
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="display-title text-3xl">{settingsCopy.title}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-paper-muted">
                {settingsCopy.description}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="quiet-action-button" aria-label={settingsCopy.closeButton}>
                <X size={18} weight="bold" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          <GameServiceRunModeIndicator shouldProbeWhenShown canManageAccessKeys />

          <Tabs.Root
            defaultValue="reading"
            className="mt-4 flex min-h-0 flex-1 flex-col"
            onValueChange={() => playInteractionFeedback('option_click')}
          >
            <Tabs.List className="grid grid-cols-4 gap-1.5" aria-label={settingsCopy.sectionsLabel}>
              <SettingsSectionTrigger
                sectionName="reading"
                label={settingsCopy.sections.reading}
                icon={<BookOpenText size={20} weight="fill" aria-hidden="true" />}
              />
              <SettingsSectionTrigger
                sectionName="image"
                label={settingsCopy.sections.image}
                icon={<FilmStrip size={20} weight="fill" aria-hidden="true" />}
              />
              <SettingsSectionTrigger
                sectionName="sound"
                label={settingsCopy.sections.sound}
                icon={<SpeakerHigh size={20} weight="fill" aria-hidden="true" />}
              />
              <SettingsSectionTrigger
                sectionName="chronicle"
                label={settingsCopy.sections.chronicle}
                icon={<UserGear size={20} weight="fill" aria-hidden="true" />}
              />
            </Tabs.List>

            <Tabs.Content value="reading" className="settings-section-content divide-y-2 divide-ink-line">
              <SettingChoiceRow<TextRevealSpeed>
                label={settingsCopy.textSpeedLabel}
                currentValue={playerSettings.textRevealSpeed}
                visibleTextByValue={settingsCopy.textSpeedOptions}
                onValueChosen={(chosenSpeed) => updatePlayerSettings({ textRevealSpeed: chosenSpeed })}
              />
              <SettingChoiceRow<NarrativeTextSize>
                label={settingsCopy.textSizeLabel}
                currentValue={playerSettings.narrativeTextSize}
                visibleTextByValue={settingsCopy.textSizeOptions}
                onValueChosen={(chosenSize) => updatePlayerSettings({ narrativeTextSize: chosenSize })}
              />
            </Tabs.Content>

            <Tabs.Content value="image" className="settings-section-content divide-y-2 divide-ink-line">
              <SettingSwitchRow
                settingName="isReducedMotionRequested"
                label={settingsCopy.reducedMotionLabel}
                hint={settingsCopy.reducedMotionHint}
              />
              <SettingChoiceRow<ScreenEffectsIntensity>
                label={settingsCopy.screenEffectsIntensityLabel}
                hint={settingsCopy.screenEffectsIntensityHint}
                currentValue={playerSettings.screenEffectsIntensity}
                visibleTextByValue={settingsCopy.screenEffectsIntensityOptions}
                onValueChosen={(chosenIntensity) => updatePlayerSettings({ screenEffectsIntensity: chosenIntensity })}
              />
              <SettingSwitchRow
                settingName="isDreamFogEnabled"
                label={settingsCopy.dreamFogLabel}
                hint={settingsCopy.dreamFogHint}
              />
              <SettingSwitchRow
                settingName="areUnsettlingApparitionsEnabled"
                label={settingsCopy.apparitionsLabel}
                hint={settingsCopy.apparitionsHint}
              />
              {isVibrationSupported ? (
                <SettingSwitchRow
                  settingName="isHapticFeedbackEnabled"
                  label={settingsCopy.hapticsLabel}
                  hint={settingsCopy.hapticsHint}
                />
              ) : null}
            </Tabs.Content>

            <Tabs.Content value="sound" className="settings-section-content divide-y-2 divide-ink-line">
              <SettingSwitchRow settingName="isMusicEnabled" label={settingsCopy.musicLabel} hint={settingsCopy.musicHint} />
              {playerSettings.isMusicEnabled ? (
                <VolumeSettingRow
                  label={settingsCopy.musicVolumeLabel}
                  storedVolume={playerSettings.musicVolume}
                  onLiveVolumeChanged={changeLiveMusicVolume}
                  onVolumeCommitted={(committedVolume) => updatePlayerSettings({ musicVolume: committedVolume })}
                />
              ) : null}
              <SettingSwitchRow
                settingName="isWeatherSoundEnabled"
                label={settingsCopy.weatherSoundLabel}
                hint={settingsCopy.weatherSoundHint}
              />
              <SettingSwitchRow settingName="isSoundEnabled" label={settingsCopy.soundLabel} hint={settingsCopy.soundHint} />
              {playerSettings.isSoundEnabled ? (
                <VolumeSettingRow
                  label={settingsCopy.soundVolumeLabel}
                  storedVolume={playerSettings.soundVolume}
                  onLiveVolumeChanged={changeLiveSoundVolume}
                  onVolumeCommitted={(committedVolume) => updatePlayerSettings({ soundVolume: committedVolume })}
                />
              ) : null}
              <SettingSwitchRow
                settingName="isKeySoundEnabled"
                label={settingsCopy.keySoundLabel}
                hint={settingsCopy.keySoundHint}
              />
            </Tabs.Content>

            <Tabs.Content value="chronicle" className="settings-section-content flex flex-col gap-3 pt-4">
              <button type="button" className="quiet-action-button w-full" onClick={onAcknowledgementsRequested}>
                <Heart size={18} weight="fill" aria-hidden="true" />
                {settingsCopy.acknowledgementsButton}
              </button>
              {canExitToOrigin ? (
                <button type="button" className="quiet-action-button w-full" onClick={onExitToOriginRequested}>
                  <SignOut size={18} weight="bold" aria-hidden="true" />
                  {settingsCopy.exitToOriginButton}
                </button>
              ) : null}
              <button
                type="button"
                className="quiet-action-button w-full"
                onBlur={() => setIsRestartAwaitingConfirmation(false)}
                onClick={() => {
                  if (!isRestartAwaitingConfirmation) {
                    setIsRestartAwaitingConfirmation(true)
                    return
                  }
                  setIsRestartAwaitingConfirmation(false)
                  onDemonstrationRestartRequested()
                }}
              >
                <ArrowCounterClockwise size={18} weight="bold" aria-hidden="true" />
                <span aria-live="polite">
                  {isRestartAwaitingConfirmation
                    ? settingsCopy.confirmRestartDemonstrationButton
                    : settingsCopy.restartDemonstrationButton}
                </span>
              </button>
              <p className="dossier-label mt-2 text-center">{spanishInterfaceCopy.versionLabel}</p>
            </Tabs.Content>
          </Tabs.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

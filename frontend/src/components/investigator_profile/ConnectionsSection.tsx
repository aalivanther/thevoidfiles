import {
  CheckCircle,
  Database,
  FilmScript,
  MinusCircle,
  PenNib,
  SpeakerHigh,
  Waveform,
  WarningCircle,
  Wrench,
} from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { chooseAnimationVariantName, randomNumberBetween } from '../../animation/animation_variety'
import { useInteractionFeedback } from '../../audio/interaction_feedback'
import { investigatorProfileCopy } from '../../copy/investigator_profile_copy'
import {
  localServiceDefinitions,
  longestSimulatedConnectionCheckMilliseconds,
  shortestSimulatedConnectionCheckMilliseconds,
} from '../../demonstration/investigator_profile_data'
import type {
  LocalServiceIdentifier,
  ProfileConnection,
  ProfileConnectionIdentifier,
  ProfileConnectionStateName,
} from '../../demonstration/investigator_profile_data'
import { isBrowserSpeechUsable, isChronicleStorageUsable } from './investigator_profile_record'
import { formatCheckMoment } from './profile_moment_formatting'

type CheckableLineIdentifier = ProfileConnectionIdentifier | LocalServiceIdentifier

type LineCheckRecord = {
  isBeingChecked: boolean
  lastCheckedAtMilliseconds: number | null
  signalVariantName: (typeof signalVariantNames)[number]
}

const signalVariantNames = ['steady_pulse', 'morse_flicker', 'sweeping_needle'] as const

const stateIconByStateName: Record<ProfileConnectionStateName, ReactNode> = {
  connected: <CheckCircle size={16} weight="fill" aria-hidden="true" />,
  demonstration: <FilmScript size={16} weight="fill" aria-hidden="true" />,
  not_configured: <MinusCircle size={16} weight="fill" aria-hidden="true" />,
  unavailable: <WarningCircle size={16} weight="fill" aria-hidden="true" />,
}

const lineIconByIdentifier: Record<CheckableLineIdentifier, ReactNode> = {
  narrative_intelligence: <PenNib size={22} weight="fill" aria-hidden="true" />,
  voice_intelligence: <SpeakerHigh size={22} weight="fill" aria-hidden="true" />,
  chronicle_storage: <Database size={22} weight="fill" aria-hidden="true" />,
  director_engine: <Wrench size={22} weight="fill" aria-hidden="true" />,
  browser_speech: <Waveform size={22} weight="fill" aria-hidden="true" />,
  sound_library: <SpeakerHigh size={22} weight="fill" aria-hidden="true" />,
}

function resolveLocalServiceStateName(
  serviceIdentifier: LocalServiceIdentifier,
  demonstrationStateName: ProfileConnectionStateName,
): ProfileConnectionStateName {
  if (serviceIdentifier === 'chronicle_storage') {
    return isChronicleStorageUsable() ? 'connected' : 'unavailable'
  }
  if (serviceIdentifier === 'browser_speech') {
    return isBrowserSpeechUsable() ? 'connected' : 'unavailable'
  }
  return demonstrationStateName
}

export function ConnectionsSection({ profileConnections }: { profileConnections: ProfileConnection[] }) {
  const connectionsCopy = investigatorProfileCopy.connections
  const playInteractionFeedback = useInteractionFeedback()
  const [lineCheckRecords, setLineCheckRecords] = useState<Partial<Record<CheckableLineIdentifier, LineCheckRecord>>>({})
  const [checkAnnouncement, setCheckAnnouncement] = useState('')
  const [localServiceStateNames] = useState(() =>
    Object.fromEntries(
      localServiceDefinitions.map((localServiceDefinition) => [
        localServiceDefinition.serviceIdentifier,
        resolveLocalServiceStateName(localServiceDefinition.serviceIdentifier, localServiceDefinition.demonstrationStateName),
      ]),
    ) as Record<LocalServiceIdentifier, ProfileConnectionStateName>,
  )
  const pendingCheckTimers = useRef(new Map<CheckableLineIdentifier, number>())

  useEffect(() => {
    const timersToClear = pendingCheckTimers.current
    return () => {
      timersToClear.forEach((timerIdentifier) => window.clearTimeout(timerIdentifier))
      timersToClear.clear()
    }
  }, [])

  const startLineCheck = (lineIdentifier: CheckableLineIdentifier, lineName: string, stateName: ProfileConnectionStateName) => {
    if (pendingCheckTimers.current.has(lineIdentifier)) {
      return
    }
    setLineCheckRecords((previousRecords) => ({
      ...previousRecords,
      [lineIdentifier]: {
        isBeingChecked: true,
        lastCheckedAtMilliseconds: previousRecords[lineIdentifier]?.lastCheckedAtMilliseconds ?? null,
        signalVariantName: chooseAnimationVariantName('profile_connection_signal', signalVariantNames),
      },
    }))
    const checkDurationMilliseconds = randomNumberBetween(
      shortestSimulatedConnectionCheckMilliseconds,
      longestSimulatedConnectionCheckMilliseconds,
    )
    const timerIdentifier = window.setTimeout(() => {
      pendingCheckTimers.current.delete(lineIdentifier)
      setLineCheckRecords((previousRecords) => ({
        ...previousRecords,
        [lineIdentifier]: {
          isBeingChecked: false,
          lastCheckedAtMilliseconds: Date.now(),
          signalVariantName: previousRecords[lineIdentifier]?.signalVariantName ?? 'steady_pulse',
        },
      }))
      setCheckAnnouncement(connectionsCopy.checkAnnouncement(lineName, connectionsCopy.connectionStateLabels[stateName]))
      playInteractionFeedback(stateName === 'unavailable' ? 'rejection' : 'confirmation')
    }, checkDurationMilliseconds)
    pendingCheckTimers.current.set(lineIdentifier, timerIdentifier)
  }

  const checkableLines: Array<{
    lineIdentifier: CheckableLineIdentifier
    lineName: string
    stateName: ProfileConnectionStateName
  }> = [
    ...profileConnections.map((profileConnection) => ({
      lineIdentifier: profileConnection.connectionIdentifier,
      lineName: connectionsCopy.connectionNames[profileConnection.connectionIdentifier],
      stateName: profileConnection.connectionStateName,
    })),
    ...localServiceDefinitions.map((localServiceDefinition) => ({
      lineIdentifier: localServiceDefinition.serviceIdentifier,
      lineName: connectionsCopy.localServiceNames[localServiceDefinition.serviceIdentifier],
      stateName: localServiceStateNames[localServiceDefinition.serviceIdentifier],
    })),
  ]

  const renderStateAndCheck = (
    lineIdentifier: CheckableLineIdentifier,
    lineName: string,
    stateName: ProfileConnectionStateName,
  ) => {
    const lineCheckRecord = lineCheckRecords[lineIdentifier]
    const isBeingChecked = lineCheckRecord?.isBeingChecked ?? false
    return (
      <div className="mt-4 flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="profile-line-state" data-line-state={stateName} data-being-checked={isBeingChecked}>
            <span
              className="profile-line-signal"
              data-signal-variant={lineCheckRecord?.signalVariantName ?? 'steady_pulse'}
              aria-hidden="true"
            />
            {stateIconByStateName[stateName]}
            <span>{isBeingChecked ? connectionsCopy.checkingNotice : connectionsCopy.connectionStateLabels[stateName]}</span>
          </p>
          <p className="mt-1 text-sm text-paper-muted [overflow-wrap:anywhere]">
            {connectionsCopy.connectionStateExplanations[stateName]}
          </p>
          <p className="dossier-label mt-2">
            {lineCheckRecord?.lastCheckedAtMilliseconds
              ? connectionsCopy.lastCheckLabel(formatCheckMoment(lineCheckRecord.lastCheckedAtMilliseconds))
              : connectionsCopy.neverCheckedLabel}
          </p>
        </div>
        <button
          type="button"
          className="quiet-action-button"
          aria-disabled={isBeingChecked}
          onClick={() => {
            if (isBeingChecked) {
              return
            }
            playInteractionFeedback('action_sent')
            startLineCheck(lineIdentifier, lineName, stateName)
          }}
        >
          {connectionsCopy.checkButton}
        </button>
      </div>
    )
  }

  return (
    <section className="min-w-0" aria-labelledby="profile-intelligences-title">
      <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
        <h2 id="profile-intelligences-title" className="display-title text-2xl [overflow-wrap:anywhere] sm:text-3xl">
          {connectionsCopy.intelligencesTitle}
        </h2>
        <button
          type="button"
          className="quiet-action-button"
          onClick={() => {
            playInteractionFeedback('action_sent')
            checkableLines.forEach((checkableLine) =>
              startLineCheck(checkableLine.lineIdentifier, checkableLine.lineName, checkableLine.stateName),
            )
          }}
        >
          {connectionsCopy.checkAllButton}
        </button>
      </div>

      <ul className="mt-5 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-[repeat(2,minmax(0,1fr))]">
        {profileConnections.map((profileConnection, connectionIndex) => (
          <li
            key={profileConnection.connectionIdentifier}
            className="comic-panel profile-line-card entrance-from-below min-w-0 p-5"
            style={{ '--entrance-order': connectionIndex } as CSSProperties}
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className="profile-line-icon">{lineIconByIdentifier[profileConnection.connectionIdentifier]}</span>
              <div className="min-w-0">
                <h3 className="display-title text-xl [overflow-wrap:anywhere]">
                  {connectionsCopy.connectionNames[profileConnection.connectionIdentifier]}
                </h3>
                <p className="mt-1 text-sm text-paper-muted [overflow-wrap:anywhere]">
                  {connectionsCopy.connectionPurposes[profileConnection.connectionIdentifier]}
                </p>
              </div>
            </div>
            <dl className="profile-line-details mt-4">
              <div>
                <dt className="dossier-label">{connectionsCopy.providerLabel}</dt>
                <dd>{profileConnection.providerName ?? connectionsCopy.noProviderChosen}</dd>
              </div>
              <div>
                <dt className="dossier-label">{connectionsCopy.optionLabel}</dt>
                <dd>{profileConnection.optionName ?? connectionsCopy.noProviderChosen}</dd>
              </div>
              <div>
                <dt className="dossier-label">{connectionsCopy.accessKeyLabel}</dt>
                <dd>{profileConnection.maskedAccessKeyEnding ?? connectionsCopy.accessKeyAbsent}</dd>
              </div>
            </dl>
            {renderStateAndCheck(
              profileConnection.connectionIdentifier,
              connectionsCopy.connectionNames[profileConnection.connectionIdentifier],
              profileConnection.connectionStateName,
            )}
          </li>
        ))}
      </ul>
      <p className="mt-4 max-w-[68ch] text-sm text-paper-muted">{connectionsCopy.reconfigurationNotice}</p>

      <h2 className="display-title mt-10 text-2xl [overflow-wrap:anywhere] sm:text-3xl">{connectionsCopy.localServicesTitle}</h2>
      <ul className="mt-5 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-[repeat(2,minmax(0,1fr))]">
        {localServiceDefinitions.map((localServiceDefinition, serviceIndex) => (
          <li
            key={localServiceDefinition.serviceIdentifier}
            className="comic-panel profile-line-card entrance-from-below min-w-0 p-5"
            style={{ '--entrance-order': serviceIndex + 2 } as CSSProperties}
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className="profile-line-icon">{lineIconByIdentifier[localServiceDefinition.serviceIdentifier]}</span>
              <div className="min-w-0">
                <h3 className="display-title text-xl [overflow-wrap:anywhere]">
                  {connectionsCopy.localServiceNames[localServiceDefinition.serviceIdentifier]}
                </h3>
                <p className="mt-1 text-sm text-paper-muted [overflow-wrap:anywhere]">
                  {connectionsCopy.localServicePurposes[localServiceDefinition.serviceIdentifier]}
                </p>
              </div>
            </div>
            {renderStateAndCheck(
              localServiceDefinition.serviceIdentifier,
              connectionsCopy.localServiceNames[localServiceDefinition.serviceIdentifier],
              localServiceStateNames[localServiceDefinition.serviceIdentifier],
            )}
          </li>
        ))}
      </ul>
      <p className="mt-4 max-w-[68ch] text-sm text-paper-muted">{connectionsCopy.demonstrationNotice}</p>
      <p className="sr-only" role="status" aria-live="polite">
        {checkAnnouncement}
      </p>
    </section>
  )
}

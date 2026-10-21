import { ArrowRight, CheckCircle, Eye, EyeSlash, Hammer, House, Warning } from '@phosphor-icons/react'
import { Dialog } from 'radix-ui'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { chooseAnimationVariantName, randomNumberBetween } from '../../animation/animation_variety'
import { useInteractionFeedback } from '../../audio/interaction_feedback'
import { sanctuaryHomeCopy } from '../../copy/sanctuary_home_copy'
import { sanctuaryRoomDefinitions, sanctuaryUpgradeDefinitions } from '../../demonstration/sanctuary_home_data'
import type {
  SanctuaryExposureLevel,
  SanctuaryRoomIdentifier,
  SanctuaryUpgradeDefinition,
} from '../../demonstration/sanctuary_home_data'
import { formatAmount } from '../../game_state/chronicle_state'
import { calculateConstructionProgress } from './sanctuary_home_record'
import type { PurchasedSanctuaryUpgrade } from './sanctuary_home_record'
import { SanctuaryRoomIllustration } from './SanctuaryRoomIllustration'
import type { ConstructionWorkVariantName, LampIgnitionVariantName } from './SanctuaryRoomIllustration'

const lampIgnitionVariantNames = ['flickering_ignition', 'slow_warm_ignition', 'double_blink_ignition'] as const
const constructionWorkVariantNames = ['hammering_work', 'sawing_work', 'welding_work'] as const
const paidStampVariantNames = ['paid_stamp_slam', 'paid_stamp_roll', 'paid_stamp_double'] as const
const constructionClockIntervalMilliseconds = 250
const rejectionShakeMilliseconds = 340

type SanctuaryHouseSectionProperties = {
  purchasedUpgrades: PurchasedSanctuaryUpgrade[]
  availablePersonalFunds: number
  blockedActionMessage: string | null
  onUpgradePurchaseConfirmed: (upgradeDefinition: SanctuaryUpgradeDefinition, purchasedAtTimestamp: number) => void
}

type RoomConstructionState = 'initial' | 'under_construction' | 'improved'

function ExposureLevelIcon({ exposureLevel }: { exposureLevel: SanctuaryExposureLevel }) {
  if (exposureLevel === 'none') {
    return <EyeSlash size={16} weight="bold" aria-hidden="true" />
  }
  if (exposureLevel === 'slight') {
    return <Eye size={16} weight="bold" aria-hidden="true" />
  }
  return <Warning size={16} weight="fill" aria-hidden="true" />
}

export function SanctuaryHouseSection({
  purchasedUpgrades,
  availablePersonalFunds,
  blockedActionMessage,
  onUpgradePurchaseConfirmed,
}: SanctuaryHouseSectionProperties) {
  const houseCopy = sanctuaryHomeCopy.house
  const commitmentCopy = sanctuaryHomeCopy.purchaseCommitment
  const playInteractionFeedback = useInteractionFeedback()
  const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now())
  const [selectedRoomIdentifier, setSelectedRoomIdentifier] = useState<SanctuaryRoomIdentifier | null>(null)
  const [upgradeAwaitingCommitment, setUpgradeAwaitingCommitment] = useState<SanctuaryUpgradeDefinition | null>(null)
  const [rejection, setRejection] = useState<{ upgradeIdentifier: string; messageText: string } | null>(null)
  const [shakingUpgradeIdentifier, setShakingUpgradeIdentifier] = useState<string | null>(null)
  const [justPaidUpgradeIdentifier, setJustPaidUpgradeIdentifier] = useState<string | null>(null)
  const [finishedConstructionAnnouncement, setFinishedConstructionAnnouncement] = useState('')
  const [lampIgnitionVariantName] = useState<LampIgnitionVariantName>(() =>
    chooseAnimationVariantName('sanctuary_lamp_ignition', lampIgnitionVariantNames),
  )
  const [constructionWorkVariantName, setConstructionWorkVariantName] = useState<ConstructionWorkVariantName>(() =>
    chooseAnimationVariantName('sanctuary_construction_work', constructionWorkVariantNames),
  )
  const [paidStampPresentation, setPaidStampPresentation] = useState(() => ({
    variantName: chooseAnimationVariantName('sanctuary_paid_stamp', paidStampVariantNames),
    style: { '--paid-stamp-tilt': `${randomNumberBetween(-14, 14).toFixed(1)}deg` } as CSSProperties,
  }))
  const shakeTimeoutIdentifier = useRef<number | null>(null)
  const [upgradeIdentifiersFinishedBeforeThisVisit] = useState(() => {
    const visitTimestamp = Date.now()
    return new Set(
      sanctuaryUpgradeDefinitions
        .filter((upgradeDefinition) => {
          const purchasedUpgrade = purchasedUpgrades.find(
            (possiblePurchase) => possiblePurchase.upgradeIdentifier === upgradeDefinition.identifier,
          )
          return purchasedUpgrade
            ? calculateConstructionProgress(upgradeDefinition, purchasedUpgrade, visitTimestamp) >= 1
            : false
        })
        .map((upgradeDefinition) => upgradeDefinition.identifier),
    )
  })
  const announcedFinishedUpgradeIdentifiers = useRef(upgradeIdentifiersFinishedBeforeThisVisit)

  const purchasedUpgradeByIdentifier = useMemo(
    () => new Map(purchasedUpgrades.map((purchasedUpgrade) => [purchasedUpgrade.upgradeIdentifier, purchasedUpgrade])),
    [purchasedUpgrades],
  )

  const readConstructionProgress = (upgradeDefinition: SanctuaryUpgradeDefinition): number | null => {
    const purchasedUpgrade = purchasedUpgradeByIdentifier.get(upgradeDefinition.identifier)
    return purchasedUpgrade ? calculateConstructionProgress(upgradeDefinition, purchasedUpgrade, currentTimestamp) : null
  }

  const hasConstructionInProgress = sanctuaryUpgradeDefinitions.some((upgradeDefinition) => {
    const constructionProgress = readConstructionProgress(upgradeDefinition)
    return constructionProgress !== null && constructionProgress < 1
  })

  useEffect(() => {
    if (!hasConstructionInProgress) {
      return
    }
    const clockIntervalIdentifier = window.setInterval(() => {
      const tickTimestamp = Date.now()
      for (const upgradeDefinition of sanctuaryUpgradeDefinitions) {
        const purchasedUpgrade = purchasedUpgradeByIdentifier.get(upgradeDefinition.identifier)
        if (
          purchasedUpgrade &&
          !announcedFinishedUpgradeIdentifiers.current.has(upgradeDefinition.identifier) &&
          calculateConstructionProgress(upgradeDefinition, purchasedUpgrade, tickTimestamp) >= 1
        ) {
          announcedFinishedUpgradeIdentifiers.current.add(upgradeDefinition.identifier)
          playInteractionFeedback('confirmation')
          setFinishedConstructionAnnouncement(houseCopy.constructionFinishedAnnouncement(upgradeDefinition.visibleName))
        }
      }
      setCurrentTimestamp(tickTimestamp)
    }, constructionClockIntervalMilliseconds)
    return () => window.clearInterval(clockIntervalIdentifier)
  }, [hasConstructionInProgress, purchasedUpgradeByIdentifier, playInteractionFeedback, houseCopy])

  useEffect(
    () => () => {
      if (shakeTimeoutIdentifier.current !== null) {
        window.clearTimeout(shakeTimeoutIdentifier.current)
      }
    },
    [],
  )

  const rejectUpgradeRequest = (upgradeIdentifier: string, messageText: string) => {
    playInteractionFeedback('rejection')
    setRejection({ upgradeIdentifier, messageText })
    setShakingUpgradeIdentifier(upgradeIdentifier)
    if (shakeTimeoutIdentifier.current !== null) {
      window.clearTimeout(shakeTimeoutIdentifier.current)
    }
    shakeTimeoutIdentifier.current = window.setTimeout(() => setShakingUpgradeIdentifier(null), rejectionShakeMilliseconds)
  }

  const requestUpgrade = (upgradeDefinition: SanctuaryUpgradeDefinition) => {
    if (purchasedUpgradeByIdentifier.has(upgradeDefinition.identifier)) {
      return
    }
    if (blockedActionMessage) {
      rejectUpgradeRequest(upgradeDefinition.identifier, blockedActionMessage)
      return
    }
    if (upgradeDefinition.personalFundsCost > availablePersonalFunds) {
      rejectUpgradeRequest(
        upgradeDefinition.identifier,
        houseCopy.insufficientFundsMessage(formatAmount(upgradeDefinition.personalFundsCost - availablePersonalFunds)),
      )
      return
    }
    playInteractionFeedback('panel_open')
    setRejection(null)
    setUpgradeAwaitingCommitment(upgradeDefinition)
  }

  const confirmUpgradeCommitment = () => {
    const confirmedUpgradeDefinition = upgradeAwaitingCommitment
    if (
      !confirmedUpgradeDefinition ||
      blockedActionMessage ||
      purchasedUpgradeByIdentifier.has(confirmedUpgradeDefinition.identifier) ||
      confirmedUpgradeDefinition.personalFundsCost > availablePersonalFunds
    ) {
      return
    }
    const purchasedAtTimestamp = Date.now()
    playInteractionFeedback('stamp_impact')
    setPaidStampPresentation({
      variantName: chooseAnimationVariantName('sanctuary_paid_stamp', paidStampVariantNames),
      style: { '--paid-stamp-tilt': `${randomNumberBetween(-14, 14).toFixed(1)}deg` } as CSSProperties,
    })
    setConstructionWorkVariantName(chooseAnimationVariantName('sanctuary_construction_work', constructionWorkVariantNames))
    setJustPaidUpgradeIdentifier(confirmedUpgradeDefinition.identifier)
    setCurrentTimestamp(purchasedAtTimestamp)
    setUpgradeAwaitingCommitment(null)
    onUpgradePurchaseConfirmed(confirmedUpgradeDefinition, purchasedAtTimestamp)
  }

  const readRoomConstructionState = (roomIdentifier: SanctuaryRoomIdentifier): RoomConstructionState => {
    const roomProgressValues = sanctuaryUpgradeDefinitions
      .filter((upgradeDefinition) => upgradeDefinition.roomIdentifier === roomIdentifier)
      .map(readConstructionProgress)
      .filter((constructionProgress): constructionProgress is number => constructionProgress !== null)
    if (roomProgressValues.some((constructionProgress) => constructionProgress < 1)) {
      return 'under_construction'
    }
    return roomProgressValues.length > 0 ? 'improved' : 'initial'
  }

  const roomStateTextByConstructionState: Record<RoomConstructionState, string> = {
    initial: houseCopy.roomStateInitial,
    under_construction: houseCopy.roomStateUnderConstruction,
    improved: houseCopy.roomStateImproved,
  }

  const installedUpgradeIdentifiers = new Set(
    sanctuaryUpgradeDefinitions
      .filter((upgradeDefinition) => readConstructionProgress(upgradeDefinition) === 1)
      .map((upgradeDefinition) => upgradeDefinition.identifier),
  )

  const selectedRoomDefinition =
    sanctuaryRoomDefinitions.find((roomDefinition) => roomDefinition.identifier === selectedRoomIdentifier) ?? null
  const visibleUpgradeDefinitions = sanctuaryUpgradeDefinitions.filter(
    (upgradeDefinition) => selectedRoomIdentifier === null || upgradeDefinition.roomIdentifier === selectedRoomIdentifier,
  )
  const commitmentCost = upgradeAwaitingCommitment?.personalFundsCost ?? 0
  const canAffordCommitment = commitmentCost <= availablePersonalFunds

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <section aria-labelledby="sanctuary-cutaway-title">
        <h2 id="sanctuary-cutaway-title" className="display-title text-2xl">
          {houseCopy.cutawayTitle}
        </h2>
        <p className="mt-1 max-w-[68ch] text-sm text-paper-muted">{houseCopy.cutawayDescription}</p>

        <div className="sanctuary-house-cutaway mt-4">
          <span className="sanctuary-house-roof" aria-hidden="true" />
          <div className="sanctuary-house-rooms">
            {sanctuaryRoomDefinitions.map((roomDefinition, roomIndex) => {
              const roomConstructionState = readRoomConstructionState(roomDefinition.identifier)
              const roomUpgradeInProgress = sanctuaryUpgradeDefinitions.find((upgradeDefinition) => {
                const constructionProgress = readConstructionProgress(upgradeDefinition)
                return (
                  upgradeDefinition.roomIdentifier === roomDefinition.identifier &&
                  constructionProgress !== null &&
                  constructionProgress < 1
                )
              })
              return (
                <button
                  key={roomDefinition.identifier}
                  type="button"
                  className="sanctuary-house-room entrance-from-below"
                  style={{ '--entrance-order': roomIndex } as CSSProperties}
                  data-room={roomDefinition.identifier}
                  data-room-state={roomConstructionState}
                  aria-pressed={selectedRoomIdentifier === roomDefinition.identifier}
                  aria-label={houseCopy.roomButtonLabel(
                    roomDefinition.visibleName,
                    roomStateTextByConstructionState[roomConstructionState],
                  )}
                  onPointerEnter={(pointerEvent) => {
                    if (pointerEvent.pointerType === 'mouse') {
                      playInteractionFeedback('option_hover')
                    }
                  }}
                  onClick={() => {
                    playInteractionFeedback('option_click')
                    setSelectedRoomIdentifier((previousRoomIdentifier) =>
                      previousRoomIdentifier === roomDefinition.identifier ? null : roomDefinition.identifier,
                    )
                  }}
                >
                  <SanctuaryRoomIllustration
                    roomIdentifier={roomDefinition.identifier}
                    installedUpgradeIdentifiers={installedUpgradeIdentifiers}
                    constructionProgress={roomUpgradeInProgress ? readConstructionProgress(roomUpgradeInProgress) : null}
                    lampIgnitionVariantName={lampIgnitionVariantName}
                    constructionWorkVariantName={constructionWorkVariantName}
                  />
                  <span className="sanctuary-house-room-caption">
                    <span className="sanctuary-house-room-name">{roomDefinition.visibleName}</span>
                    <span className="sanctuary-house-room-state">
                      {roomConstructionState === 'initial' ? <House size={14} weight="bold" aria-hidden="true" /> : null}
                      {roomConstructionState === 'under_construction' ? (
                        <Hammer size={14} weight="fill" aria-hidden="true" />
                      ) : null}
                      {roomConstructionState === 'improved' ? (
                        <CheckCircle size={14} weight="fill" aria-hidden="true" />
                      ) : null}
                      {roomStateTextByConstructionState[roomConstructionState]}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="comic-panel mt-4 p-4" aria-live="polite">
          <p className="dossier-label">{houseCopy.selectedRoomLabel}</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-xl tracking-wide uppercase">
            {selectedRoomDefinition ? selectedRoomDefinition.visibleName : houseCopy.wholeHouseFilter}
          </p>
          {selectedRoomDefinition ? (
            <div className="sanctuary-room-description mt-2">
              <p>{selectedRoomDefinition.initialStateDescription}</p>
              {sanctuaryUpgradeDefinitions
                .filter(
                  (upgradeDefinition) =>
                    upgradeDefinition.roomIdentifier === selectedRoomDefinition.identifier &&
                    installedUpgradeIdentifiers.has(upgradeDefinition.identifier),
                )
                .map((upgradeDefinition) => (
                  <p key={upgradeDefinition.identifier}>{upgradeDefinition.installedRoomDescription}</p>
                ))}
            </div>
          ) : null}
          {selectedRoomDefinition ? (
            <button
              type="button"
              className="quiet-action-button mt-3"
              onClick={() => {
                playInteractionFeedback('option_click')
                setSelectedRoomIdentifier(null)
              }}
            >
              {houseCopy.wholeHouseFilter}
            </button>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="sanctuary-upgrades-title">
        <h2 id="sanctuary-upgrades-title" className="display-title text-2xl">
          {houseCopy.upgradesTitle}
        </h2>
        <p className="mt-1 max-w-[68ch] text-sm text-paper-muted">{houseCopy.upgradesDescription}</p>
        <p className="visually-hidden-text" role="status">
          {finishedConstructionAnnouncement}
        </p>

        <ul className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-[repeat(2,minmax(0,1fr))]">
          {visibleUpgradeDefinitions.map((upgradeDefinition, upgradeIndex) => {
            const constructionProgress = readConstructionProgress(upgradeDefinition)
            const purchasedUpgrade = purchasedUpgradeByIdentifier.get(upgradeDefinition.identifier)
            const isUnderConstruction = constructionProgress !== null && constructionProgress < 1
            const isInstalled = constructionProgress === 1
            const canAfford = upgradeDefinition.personalFundsCost <= availablePersonalFunds
            const roomName =
              sanctuaryRoomDefinitions.find((roomDefinition) => roomDefinition.identifier === upgradeDefinition.roomIdentifier)
                ?.visibleName ?? ''
            const constructionStageName =
              houseCopy.constructionStageNames[
                Math.min(
                  houseCopy.constructionStageNames.length - 1,
                  Math.floor((constructionProgress ?? 0) * houseCopy.constructionStageNames.length),
                )
              ]
            return (
              <li
                key={upgradeDefinition.identifier}
                className={`sanctuary-upgrade-card comic-panel entrance-from-below relative p-4 ${
                  shakingUpgradeIdentifier === upgradeDefinition.identifier ? 'rejection-shake' : ''
                }`}
                style={{ '--entrance-order': upgradeIndex } as CSSProperties}
                data-upgrade-state={isInstalled ? 'installed' : isUnderConstruction ? 'under_construction' : 'available'}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-[family-name:var(--font-display)] text-xl leading-tight tracking-wide uppercase [overflow-wrap:anywhere]">
                    {upgradeDefinition.visibleName}
                  </h3>
                  <span className="cost-tag">
                    {purchasedUpgrade ? `${houseCopy.paidAmountLabel} ` : ''}
                    {formatAmount(purchasedUpgrade?.paidPersonalFunds ?? upgradeDefinition.personalFundsCost)}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-paper-text [overflow-wrap:anywhere]">
                  {upgradeDefinition.visibleDescription}
                </p>

                <dl className="sanctuary-upgrade-facts mt-3">
                  <div>
                    <dt>{houseCopy.roomLabel}</dt>
                    <dd>{roomName}</dd>
                  </div>
                  <div>
                    <dt>{houseCopy.downtimeLabel}</dt>
                    <dd>{houseCopy.downtimeValue(upgradeDefinition.downtimeDays)}</dd>
                  </div>
                  <div>
                    <dt>{houseCopy.maintenanceLabel}</dt>
                    <dd>
                      {upgradeDefinition.monthlyMaintenanceCost > 0
                        ? houseCopy.maintenanceValue(formatAmount(upgradeDefinition.monthlyMaintenanceCost))
                        : houseCopy.noMaintenance}
                    </dd>
                  </div>
                  <div>
                    <dt>{houseCopy.exposureLabel}</dt>
                    <dd className="flex items-start gap-1.5" data-exposure-level={upgradeDefinition.exposureLevel}>
                      <span className="mt-0.5 shrink-0">
                        <ExposureLevelIcon exposureLevel={upgradeDefinition.exposureLevel} />
                      </span>
                      {houseCopy.exposureLevelNames[upgradeDefinition.exposureLevel]}
                    </dd>
                  </div>
                  <div className="sanctuary-upgrade-fact-wide">
                    <dt>{houseCopy.enablesLabel}</dt>
                    <dd>{upgradeDefinition.enabledCapabilityDescription}</dd>
                  </div>
                </dl>

                {isUnderConstruction ? (
                  <div className="mt-4">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <Hammer size={18} weight="fill" aria-hidden="true" />
                      {houseCopy.underConstructionTag} · {constructionStageName}
                    </p>
                    <div
                      className="sanctuary-construction-track mt-2"
                      role="progressbar"
                      aria-label={houseCopy.constructionProgressLabel(upgradeDefinition.visibleName)}
                      aria-valuemin={0}
                      aria-valuemax={houseCopy.constructionStageNames.length}
                      aria-valuenow={Math.min(
                        houseCopy.constructionStageNames.length,
                        Math.floor((constructionProgress ?? 0) * houseCopy.constructionStageNames.length) + 1,
                      )}
                      aria-valuetext={constructionStageName}
                    >
                      {houseCopy.constructionStageNames.map((stageName, stageIndex) => (
                        <span
                          key={stageName}
                          className="sanctuary-construction-stage"
                          data-stage-reached={
                            (constructionProgress ?? 0) * houseCopy.constructionStageNames.length >= stageIndex
                          }
                        />
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-paper-muted">{houseCopy.demonstrationConstructionNotice}</p>
                  </div>
                ) : null}

                {isInstalled ? (
                  <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-success">
                    <CheckCircle size={18} weight="fill" aria-hidden="true" />
                    {houseCopy.installedTag}
                  </p>
                ) : null}

                {!purchasedUpgrade ? (
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      className="primary-action-button"
                      aria-disabled={!canAfford || blockedActionMessage !== null}
                      data-unavailable={!canAfford || blockedActionMessage !== null}
                      aria-describedby={
                        rejection?.upgradeIdentifier === upgradeDefinition.identifier
                          ? `sanctuary-upgrade-rejection-${upgradeDefinition.identifier}`
                          : undefined
                      }
                      onClick={() => requestUpgrade(upgradeDefinition)}
                    >
                      <Hammer size={18} weight="fill" aria-hidden="true" />
                      {houseCopy.purchaseButton}
                    </button>
                    {!canAfford ? (
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-blood-accent-text">
                        <Warning size={16} weight="fill" aria-hidden="true" />
                        {houseCopy.insufficientFundsTag}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {rejection?.upgradeIdentifier === upgradeDefinition.identifier ? (
                  <p
                    id={`sanctuary-upgrade-rejection-${upgradeDefinition.identifier}`}
                    role="alert"
                    className="mt-3 border-l-4 border-blood-accent pl-3 text-sm text-blood-accent-text"
                  >
                    {rejection.messageText}
                  </p>
                ) : null}

                {justPaidUpgradeIdentifier === upgradeDefinition.identifier ? (
                  <span
                    className={`sanctuary-paid-stamp ${paidStampPresentation.variantName}`}
                    style={paidStampPresentation.style}
                    aria-hidden="true"
                  >
                    {commitmentCopy.paidStamp}
                  </span>
                ) : null}
              </li>
            )
          })}
        </ul>
      </section>

      <Dialog.Root
        open={upgradeAwaitingCommitment !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            playInteractionFeedback('panel_close')
            setUpgradeAwaitingCommitment(null)
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="centered-dialog-content aged-paper-document p-5 sm:p-6">
            <p className="font-[family-name:var(--font-dossier)] text-xs font-bold tracking-[0.14em] uppercase opacity-70">
              {commitmentCopy.title}
            </p>
            <Dialog.Title className="mt-2 font-[family-name:var(--font-narrative)] text-xl leading-snug font-semibold">
              {upgradeAwaitingCommitment?.visibleName}
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm opacity-80">{commitmentCopy.description}</Dialog.Description>

            <div className="mt-4 border-2 border-black/80 p-3">
              <p className="font-[family-name:var(--font-dossier)] text-sm font-bold uppercase">
                {sanctuaryHomeCopy.header.personalFundsLabel}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-4 font-[family-name:var(--font-dossier)]">
                <div>
                  <p className="text-xs uppercase opacity-70">{commitmentCopy.currentAmountLabel}</p>
                  <p className="text-2xl font-bold tabular-nums">{formatAmount(availablePersonalFunds)}</p>
                </div>
                <ArrowRight size={22} weight="bold" aria-hidden="true" />
                <div>
                  <p className="text-xs uppercase opacity-70">{commitmentCopy.afterAmountLabel}</p>
                  <p className="text-2xl font-bold tabular-nums text-[#8f1027]">
                    {canAffordCommitment
                      ? formatAmount(availablePersonalFunds - commitmentCost)
                      : commitmentCopy.insufficientResource}
                  </p>
                </div>
              </div>
            </div>

            {upgradeAwaitingCommitment ? (
              <dl className="sanctuary-commitment-facts mt-4">
                <div>
                  <dt>{houseCopy.downtimeLabel}</dt>
                  <dd>{houseCopy.downtimeValue(upgradeAwaitingCommitment.downtimeDays)}</dd>
                </div>
                <div>
                  <dt>{houseCopy.maintenanceLabel}</dt>
                  <dd>
                    {upgradeAwaitingCommitment.monthlyMaintenanceCost > 0
                      ? houseCopy.maintenanceValue(formatAmount(upgradeAwaitingCommitment.monthlyMaintenanceCost))
                      : houseCopy.noMaintenance}
                  </dd>
                </div>
                <div>
                  <dt>{houseCopy.exposureLabel}</dt>
                  <dd>{houseCopy.exposureLevelNames[upgradeAwaitingCommitment.exposureLevel]}</dd>
                </div>
              </dl>
            ) : null}

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Dialog.Close asChild>
                <button type="button" className="quiet-action-button sanctuary-paper-quiet-button">
                  {commitmentCopy.cancelButton}
                </button>
              </Dialog.Close>
              <button
                type="button"
                className="primary-action-button"
                disabled={!canAffordCommitment}
                onClick={confirmUpgradeCommitment}
              >
                {commitmentCopy.confirmButton}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}

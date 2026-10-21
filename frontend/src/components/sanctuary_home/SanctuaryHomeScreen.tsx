import { LockKey } from '@phosphor-icons/react'
import { Tabs } from 'radix-ui'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { chooseAnimationVariantName, randomNumberBetween } from '../../animation/animation_variety'
import { useInteractionFeedback } from '../../audio/interaction_feedback'
import { sanctuaryHomeCopy } from '../../copy/sanctuary_home_copy'
import { sanctuaryUpgradeDefinitions } from '../../demonstration/sanctuary_home_data'
import type { BelongingPlacement, SanctuaryUpgradeDefinition } from '../../demonstration/sanctuary_home_data'
import { formatAmount, readInvestigatorShortName, useChronicleState } from '../../game_state/chronicle_state'
import { usePlayerSettings } from '../../settings/player_settings'
import {
  ThematicAnchorIcon,
  ThematicBedIcon,
  ThematicBlueprintIcon,
  ThematicCrateIcon,
  ThematicHouseIcon,
  ThematicNotebookIcon,
} from '../../assets/thematic_icons/thematic_icons'
import { PresentationTitleCard } from '../PresentationTitleCard'
import { evaluateBelongingMove, listCarriedPersonalBelongingIdentifiers } from './belongings_arrangement'
import { readHouseRegister } from './house_register_reading'
import type { BelongingArrangement, BelongingMoveEvaluation } from './belongings_arrangement'
import { SanctuaryAnchorSection } from './SanctuaryAnchorSection'
import { SanctuaryGreatWorkSection } from './SanctuaryGreatWorkSection'
import { calculatePersonalFundsSpentOnSanctuary, readSanctuaryHomeRecord } from './sanctuary_home_record'
import type { PersonalNote, SanctuaryHomeRecord } from './sanctuary_home_record'
import { SanctuaryHouseSection } from './SanctuaryHouseSection'
import { SanctuaryNotebookSection } from './SanctuaryNotebookSection'
import { SanctuaryRestSection } from './SanctuaryRestSection'
import { SanctuaryStorageSection } from './SanctuaryStorageSection'

const windowLightSweepVariantNames = ['passing_car_sweep', 'slow_moon_drift', 'distant_lightning_flicker'] as const
const headerLampIgnitionVariantNames = ['flickering_ignition', 'slow_warm_ignition', 'double_blink_ignition'] as const
const dustDriftVariantNames = ['dust_rising_drift', 'dust_sideways_drift', 'dust_swirling_drift'] as const
const dustMoteCount = 8
const minimumMillisecondsBetweenLightSweeps = 6500
const maximumMillisecondsBetweenLightSweeps = 14000

type SanctuarySectionName = 'house' | 'storage' | 'notebook' | 'rest' | 'great_work' | 'anchor'

type WindowLightSweep = {
  sweepCount: number
  variantName: (typeof windowLightSweepVariantNames)[number]
  style: CSSProperties
}

function createWindowLightSweep(sweepCount: number): WindowLightSweep {
  return {
    sweepCount,
    variantName: chooseAnimationVariantName('sanctuary_window_light_sweep', windowLightSweepVariantNames),
    style: {
      '--sweep-tilt': `${randomNumberBetween(-16, -6).toFixed(1)}deg`,
      '--sweep-height': `${randomNumberBetween(18, 46).toFixed(0)}%`,
      '--sweep-seconds': `${randomNumberBetween(3.2, 6.4).toFixed(2)}s`,
    } as CSSProperties,
  }
}

function createDustMoteStyles(): CSSProperties[] {
  return Array.from(
    { length: dustMoteCount },
    () =>
      ({
        '--dust-left': `${randomNumberBetween(4, 46).toFixed(1)}%`,
        '--dust-top': `${randomNumberBetween(8, 78).toFixed(1)}%`,
        '--dust-size': `${randomNumberBetween(2, 4.5).toFixed(1)}px`,
        '--dust-seconds': `${randomNumberBetween(9, 22).toFixed(1)}s`,
        '--dust-delay': `${randomNumberBetween(-20, 0).toFixed(1)}s`,
      }) as CSSProperties,
  )
}

export function SanctuaryHomeScreen() {
  const { chronicleState, changeChronicleState } = useChronicleState()
  const { shouldReduceMotion } = usePlayerSettings()
  const playInteractionFeedback = useInteractionFeedback()
  const [isPresentationVisible, setIsPresentationVisible] = useState(true)
  const [currentSectionName, setCurrentSectionName] = useState<SanctuarySectionName>('house')
  const [windowLightSweep, setWindowLightSweep] = useState<WindowLightSweep>(() => createWindowLightSweep(0))
  const [headerLampIgnitionVariantName] = useState(() =>
    chooseAnimationVariantName('sanctuary_header_lamp_ignition', headerLampIgnitionVariantNames),
  )
  const [dustMotes] = useState(() =>
    createDustMoteStyles().map((dustMoteStyle, dustMoteIndex) => ({
      style: dustMoteStyle,
      variantName: dustDriftVariantNames[dustMoteIndex % dustDriftVariantNames.length],
    })),
  )

  const sanctuaryHomeRecord = useMemo(
    () => readSanctuaryHomeRecord(chronicleState.moduleRecords.sanctuary_home),
    [chronicleState.moduleRecords.sanctuary_home],
  )
  const latestSanctuaryHomeRecord = useRef(sanctuaryHomeRecord)

  useEffect(() => {
    latestSanctuaryHomeRecord.current = sanctuaryHomeRecord
  }, [sanctuaryHomeRecord])

  const saveSanctuaryHomeRecordChanges = useCallback(
    (changedFields: Partial<Omit<SanctuaryHomeRecord, 'recordFormatVersion'>>) => {
      const changedRecord: SanctuaryHomeRecord = { ...latestSanctuaryHomeRecord.current, ...changedFields }
      latestSanctuaryHomeRecord.current = changedRecord
      changeChronicleState({ kind: 'module_record_saved', moduleName: 'sanctuary_home', moduleRecord: changedRecord })
    },
    [changeChronicleState],
  )

  useEffect(() => {
    if (shouldReduceMotion || isPresentationVisible) {
      return
    }
    let sweepTimeoutIdentifier = 0
    let scheduledSweepCount = 0
    const scheduleNextSweep = () => {
      sweepTimeoutIdentifier = window.setTimeout(
        () => {
          scheduledSweepCount += 1
          setWindowLightSweep(createWindowLightSweep(scheduledSweepCount))
          scheduleNextSweep()
        },
        randomNumberBetween(minimumMillisecondsBetweenLightSweeps, maximumMillisecondsBetweenLightSweeps),
      )
    }
    scheduleNextSweep()
    return () => window.clearTimeout(sweepTimeoutIdentifier)
  }, [shouldReduceMotion, isPresentationVisible])

  const investigatorName = readInvestigatorShortName(chronicleState.investigatorRegistration)
  const residencePlace =
    chronicleState.investigatorRegistration?.residencePlace.trim() || sanctuaryHomeCopy.presentation.fallbackResidencePlace
  const isInvestigatorAway = chronicleState.chosenWhisperIdentifier !== null
  const blockedActionMessage = isInvestigatorAway
    ? sanctuaryHomeCopy.awayNotice.blockedActionMessage(investigatorName, chronicleState.investigator.placeName)
    : null
  const chroniclePersonalFunds = isInvestigatorAway
    ? chronicleState.investigator.personalFunds
    : chronicleState.investigatorProgression.personalFunds
  const personalFundsSpentOnSanctuary = calculatePersonalFundsSpentOnSanctuary(sanctuaryHomeRecord)
  const availablePersonalFunds = Math.max(0, chroniclePersonalFunds)
  const houseRegister = readHouseRegister({
    isCaseOpen: isInvestigatorAway,
    investigator: chronicleState.investigator,
    archiveRun: chronicleState.archiveRun,
    personalFunds: availablePersonalFunds,
  })
  const latestPersonalFundsStillAvailable = useRef(availablePersonalFunds)
  useEffect(() => {
    latestPersonalFundsStillAvailable.current = availablePersonalFunds
  }, [availablePersonalFunds])
  const purchasedUpgradeIdentifiers = new Set(
    sanctuaryHomeRecord.purchasedUpgrades.map((purchasedUpgrade) => purchasedUpgrade.upgradeIdentifier),
  )
  const committedMonthlyMaintenance = sanctuaryUpgradeDefinitions
    .filter((upgradeDefinition) => purchasedUpgradeIdentifiers.has(upgradeDefinition.identifier))
    .reduce((monthlyMaintenance, upgradeDefinition) => monthlyMaintenance + upgradeDefinition.monthlyMaintenanceCost, 0)

  const confirmUpgradePurchase = (upgradeDefinition: SanctuaryUpgradeDefinition, purchasedAtTimestamp: number) => {
    const currentRecord = latestSanctuaryHomeRecord.current
    const fundsStillAvailable = latestPersonalFundsStillAvailable.current
    if (
      isInvestigatorAway ||
      !Number.isFinite(upgradeDefinition.personalFundsCost) ||
      upgradeDefinition.personalFundsCost <= 0 ||
      upgradeDefinition.personalFundsCost > fundsStillAvailable ||
      currentRecord.purchasedUpgrades.some(
        (purchasedUpgrade) => purchasedUpgrade.upgradeIdentifier === upgradeDefinition.identifier,
      )
    ) {
      return
    }
    latestPersonalFundsStillAvailable.current = fundsStillAvailable - upgradeDefinition.personalFundsCost
    changeChronicleState({ kind: 'personal_funds_spent', amount: upgradeDefinition.personalFundsCost })
    saveSanctuaryHomeRecordChanges({
      purchasedUpgrades: [
        ...currentRecord.purchasedUpgrades,
        {
          upgradeIdentifier: upgradeDefinition.identifier,
          paidPersonalFunds: upgradeDefinition.personalFundsCost,
          purchasedAtTimestamp,
        },
      ],
    })
  }

  const missionBelongingUnits = isInvestigatorAway ? chronicleState.investigator.belongingUnits : null

  const evaluateBelongingMoveFromHome = (
    belongingArrangement: BelongingArrangement,
    pileIdentifier: string,
    destinationPlacement: BelongingPlacement,
    requestedUnitCount: number | null,
  ): BelongingMoveEvaluation => {
    const moveEvaluation = evaluateBelongingMove({
      belongingArrangement,
      missionBelongingUnits,
      pileIdentifier,
      destinationPlacement,
      requestedUnitCount,
      isHomeWithinReach: !isInvestigatorAway,
    })
    return moveEvaluation.kind === 'moved' && isInvestigatorAway
      ? { kind: 'rejected', rejectionReason: 'place_out_of_reach' }
      : moveEvaluation
  }

  const previewBelongingMove = (pileIdentifier: string, destinationPlacement: BelongingPlacement) =>
    evaluateBelongingMoveFromHome(sanctuaryHomeRecord.belongingArrangement, pileIdentifier, destinationPlacement, null)

  const commitBelongingMove = (
    pileIdentifier: string,
    destinationPlacement: BelongingPlacement,
    requestedUnitCount: number | null,
  ): BelongingMoveEvaluation => {
    const moveEvaluation = evaluateBelongingMoveFromHome(
      latestSanctuaryHomeRecord.current.belongingArrangement,
      pileIdentifier,
      destinationPlacement,
      requestedUnitCount,
    )
    if (moveEvaluation.kind === 'moved') {
      saveSanctuaryHomeRecordChanges({
        belongingArrangement: moveEvaluation.changedArrangement,
        belongingIdentifiersCarriedOnNextMission: listCarriedPersonalBelongingIdentifiers(moveEvaluation.changedArrangement),
      })
    }
    return moveEvaluation
  }

  const changeNotebook = useCallback(
    (personalNotes: PersonalNote[], createdNoteCount: number) =>
      saveSanctuaryHomeRecordChanges({ personalNotes, createdNoteCount }),
    [saveSanctuaryHomeRecordChanges],
  )

  if (isPresentationVisible) {
    return (
      <PresentationTitleCard
        chapterLabel={sanctuaryHomeCopy.presentation.chapterLabel}
        chapterTitle={sanctuaryHomeCopy.presentation.chapterTitle}
        detailLine={sanctuaryHomeCopy.presentation.detailLine(residencePlace)}
        onPresentationFinished={() => setIsPresentationVisible(false)}
      />
    )
  }

  const sectionEntries: Array<{ sectionName: SanctuarySectionName; label: string; icon: ReactNode }> = [
    { sectionName: 'house', label: sanctuaryHomeCopy.sections.house, icon: <ThematicHouseIcon size={18} /> },
    { sectionName: 'storage', label: sanctuaryHomeCopy.sections.storage, icon: <ThematicCrateIcon size={18} /> },
    { sectionName: 'notebook', label: sanctuaryHomeCopy.sections.notebook, icon: <ThematicNotebookIcon size={18} /> },
    { sectionName: 'rest', label: sanctuaryHomeCopy.sections.rest, icon: <ThematicBedIcon size={18} /> },
    { sectionName: 'great_work', label: sanctuaryHomeCopy.sections.greatWork, icon: <ThematicBlueprintIcon size={18} /> },
    { sectionName: 'anchor', label: sanctuaryHomeCopy.sections.anchor, icon: <ThematicAnchorIcon size={18} /> },
  ]

  return (
    <main id="main-content" className="sanctuary-home-screen mx-auto w-full max-w-6xl px-4 pt-8 pb-20 sm:px-8">
      <div className="sanctuary-interior-light-layer scene-ambient-motion" aria-hidden="true">
        <span
          key={windowLightSweep.sweepCount}
          className={`sanctuary-window-light-sweep ${windowLightSweep.variantName}`}
          style={windowLightSweep.style}
        />
        <span className="sanctuary-lamp-light-cone">
          {dustMotes.map((dustMote, dustMoteIndex) => (
            <span key={dustMoteIndex} className={`sanctuary-dust-mote ${dustMote.variantName}`} style={dustMote.style} />
          ))}
        </span>
      </div>

      <header className="sanctuary-home-header">
        <div className="min-w-0">
          <p className="dossier-label entrance-from-left">{sanctuaryHomeCopy.header.sectionLabel}</p>
          <h1 className="display-title sanctuary-home-title mt-1 text-5xl sm:text-6xl">
            <span className={`sanctuary-header-lamp ${headerLampIgnitionVariantName}`} aria-hidden="true" />
            {sanctuaryHomeCopy.screenTitle}
          </h1>
          <p className="mt-1 font-[family-name:var(--font-dossier)] text-sm tracking-wide text-paper-muted [overflow-wrap:anywhere]">
            {residencePlace}
          </p>
          <p className="sanctuary-room-description mt-3 max-w-[62ch]">
            {sanctuaryHomeCopy.header.introduction(investigatorName, residencePlace)}
          </p>
        </div>

        <aside className="sanctuary-funds-ledger aged-paper-document entrance-from-below" aria-labelledby="sanctuary-funds-title">
          <p id="sanctuary-funds-title" className="sanctuary-paper-label">
            {sanctuaryHomeCopy.header.personalFundsLabel}
          </p>
          <p key={availablePersonalFunds} className="status-value-pulse font-[family-name:var(--font-dossier)] text-4xl font-bold tabular-nums">
            {formatAmount(availablePersonalFunds)}
          </p>
          <dl className="sanctuary-funds-ledger-lines">
            <div>
              <dt>{sanctuaryHomeCopy.header.chronicleFundsLabel}</dt>
              <dd>{formatAmount(chroniclePersonalFunds)}</dd>
            </div>
            <div>
              <dt>{sanctuaryHomeCopy.header.spentOnSanctuaryLabel}</dt>
              <dd>
                {personalFundsSpentOnSanctuary > 0 ? '−' : ''}
                {formatAmount(personalFundsSpentOnSanctuary)}
              </dd>
            </div>
            <div>
              <dt>{sanctuaryHomeCopy.header.operationalFundsLabel}</dt>
              <dd>{formatAmount(houseRegister.operationalFunds)}</dd>
            </div>
            <div>
              <dt>{sanctuaryHomeCopy.header.monthlyMaintenanceLabel}</dt>
              <dd>
                {committedMonthlyMaintenance > 0
                  ? sanctuaryHomeCopy.header.monthlyMaintenanceValue(formatAmount(committedMonthlyMaintenance))
                  : sanctuaryHomeCopy.header.noMonthlyMaintenance}
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-xs leading-snug opacity-75">{sanctuaryHomeCopy.header.operationalFundsStayInTheArchive}</p>
          <p className="mt-1 text-xs leading-snug opacity-75">{sanctuaryHomeCopy.header.houseLedgerNotice}</p>
        </aside>
      </header>

      {isInvestigatorAway ? (
        <div className="sanctuary-away-notice mt-6" role="note">
          <LockKey size={28} weight="fill" className="shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-display)] text-lg tracking-wide uppercase">
              {sanctuaryHomeCopy.awayNotice.title}
            </p>
            <p className="mt-1 text-sm leading-relaxed [overflow-wrap:anywhere]">
              {sanctuaryHomeCopy.awayNotice.description(investigatorName, chronicleState.investigator.placeName)}
            </p>
          </div>
        </div>
      ) : null}

      <Tabs.Root
        className="mt-8"
        value={currentSectionName}
        onValueChange={(requestedSectionName) => {
          playInteractionFeedback('panel_open')
          setCurrentSectionName(requestedSectionName as SanctuarySectionName)
        }}
      >
        <Tabs.List className="sanctuary-section-list" aria-label={sanctuaryHomeCopy.sections.listLabel}>
          {sectionEntries.map((sectionEntry) => (
            <Tabs.Trigger
              key={sectionEntry.sectionName}
              value={sectionEntry.sectionName}
              className="sanctuary-section-trigger"
              onPointerEnter={(pointerEvent) => {
                if (pointerEvent.pointerType === 'mouse' && sectionEntry.sectionName !== currentSectionName) {
                  playInteractionFeedback('option_hover')
                }
              }}
            >
              {sectionEntry.icon}
              {sectionEntry.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="house" className="sanctuary-section-content">
          <SanctuaryHouseSection
            purchasedUpgrades={sanctuaryHomeRecord.purchasedUpgrades}
            availablePersonalFunds={availablePersonalFunds}
            blockedActionMessage={blockedActionMessage}
            onUpgradePurchaseConfirmed={confirmUpgradePurchase}
          />
        </Tabs.Content>
        <Tabs.Content value="storage" className="sanctuary-section-content">
          <SanctuaryStorageSection
            belongingArrangement={sanctuaryHomeRecord.belongingArrangement}
            missionBelongingUnits={missionBelongingUnits}
            liveBelongingDefinitions={chronicleState.archiveRun.belongingDefinitions}
            carriedKit={houseRegister.carriedKit}
            blockedActionMessage={blockedActionMessage}
            onBelongingMovePreviewed={previewBelongingMove}
            onBelongingMoveCommitted={commitBelongingMove}
          />
        </Tabs.Content>
        <Tabs.Content value="notebook" className="sanctuary-section-content">
          <SanctuaryNotebookSection
            personalNotes={sanctuaryHomeRecord.personalNotes}
            createdNoteCount={sanctuaryHomeRecord.createdNoteCount}
            blockedActionMessage={blockedActionMessage}
            onNotebookChanged={changeNotebook}
          />
        </Tabs.Content>
        <Tabs.Content value="rest" className="sanctuary-section-content">
          <SanctuaryRestSection
            purchasedUpgrades={sanctuaryHomeRecord.purchasedUpgrades}
            houseRegister={houseRegister}
            resolvedArchiveCount={chronicleState.investigatorProgression.resolvedArchiveCount}
          />
        </Tabs.Content>
        <Tabs.Content value="great_work" className="sanctuary-section-content">
          <SanctuaryGreatWorkSection />
        </Tabs.Content>
        <Tabs.Content value="anchor" className="sanctuary-section-content">
          <SanctuaryAnchorSection
            relationalAnchor={chronicleState.investigatorRegistration?.relationalAnchor ?? null}
            investigatorName={investigatorName}
          />
        </Tabs.Content>
      </Tabs.Root>
    </main>
  )
}

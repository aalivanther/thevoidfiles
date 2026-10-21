import { Clock, FirstAidKit, Flame, MapPin, Package, Vault, Wallet } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { readBelongingVisibleName } from '../demonstration/demonstration_case_script'
import type { BelongingIdentifier } from '../demonstration/demonstration_case_script'
import { maximumCaseEffort } from '../game_state/archive_run_state'
import { formatAmount, formatWorldClock, useChronicleState } from '../game_state/chronicle_state'
import type { InvestigatorState, OicnauStance } from '../game_state/chronicle_state'
import { usePlayerSettings } from '../settings/player_settings'
import { spanishInterfaceCopy } from '../spanish_interface_copy'

const maximumSeriousWounds = 5

function useSmoothlyCountedAmount(targetAmount: number): { displayedAmount: number; changeCount: number } {
  const { shouldReduceMotion } = usePlayerSettings()
  const [displayedAmount, setDisplayedAmount] = useState(targetAmount)
  const [changeCount, setChangeCount] = useState(0)
  const displayedAmountReference = useRef(targetAmount)

  useEffect(() => {
    const startingAmount = displayedAmountReference.current
    if (startingAmount === targetAmount) {
      return
    }
    setChangeCount((previousChangeCount) => previousChangeCount + 1)
    if (shouldReduceMotion) {
      displayedAmountReference.current = targetAmount
      setDisplayedAmount(targetAmount)
      return
    }
    const countingDurationMilliseconds = 650
    const startingTimestamp = performance.now()
    const countingIntervalIdentifier = window.setInterval(() => {
      const linearProgress = Math.min(1, (performance.now() - startingTimestamp) / countingDurationMilliseconds)
      const deceleratedProgress = 1 - Math.pow(1 - linearProgress, 3)
      const intermediateAmount = Math.round(startingAmount + (targetAmount - startingAmount) * deceleratedProgress)
      displayedAmountReference.current = intermediateAmount
      setDisplayedAmount(intermediateAmount)
      if (linearProgress >= 1) {
        window.clearInterval(countingIntervalIdentifier)
      }
    }, 30)
    return () => {
      window.clearInterval(countingIntervalIdentifier)
      displayedAmountReference.current = targetAmount
      setDisplayedAmount(targetAmount)
    }
  }, [targetAmount, shouldReduceMotion])

  return { displayedAmount, changeCount }
}

function CountedAmount({ amount }: { amount: number }) {
  const { displayedAmount, changeCount } = useSmoothlyCountedAmount(amount)
  return (
    <span
      key={changeCount}
      className={`inline-block font-[family-name:var(--font-dossier)] text-lg font-bold tabular-nums ${
        changeCount > 0 ? 'status-value-pulse' : ''
      }`}
    >
      {formatAmount(displayedAmount)}
    </span>
  )
}

export function SeriousWoundMarks({
  sufferedCount,
  causeText = null,
}: {
  sufferedCount: number
  causeText?: string | null
}) {
  const woundDescription = causeText
    ? `${spanishInterfaceCopy.caseStatus.seriousWoundsDescription(sufferedCount)}. ${causeText}`
    : spanishInterfaceCopy.caseStatus.seriousWoundsDescription(sufferedCount)
  return (
    <div
      className="flex shrink-0 items-center gap-2.5 px-1 py-1"
      role="img"
      aria-label={woundDescription}
      title={causeText ?? undefined}
    >
      {Array.from({ length: maximumSeriousWounds }, (_, woundIndex) => (
        <span
          key={woundIndex}
          className="serious-wound-mark"
          data-suffered={woundIndex < sufferedCount ? 'true' : 'false'}
        />
      ))}
    </div>
  )
}

export function CompactCaseStatusStrip({
  investigator,
  falsifiedWorldClockText = null,
}: {
  investigator: InvestigatorState
  falsifiedWorldClockText?: string | null
}) {
  const { chronicleState } = useChronicleState()
  const caseStatusCopy = spanishInterfaceCopy.caseStatus
  return (
    <div className="flex min-w-0 flex-1 items-center justify-end gap-3 overflow-hidden">
      <SeriousWoundMarks sufferedCount={investigator.seriousWoundsSuffered} />
      <div className="flex shrink-0 items-center gap-1.5" title={caseStatusCopy.effortLabel}>
        <Flame size={18} weight="fill" className="shrink-0 text-paper-muted" aria-hidden="true" />
        <span className="visually-hidden-text">{caseStatusCopy.effortLabel}</span>
        <span className="font-[family-name:var(--font-dossier)] text-lg font-bold tabular-nums">
          {chronicleState.archiveRun.effortRemaining}
        </span>
      </div>
      <div className="hidden min-w-0 items-center gap-1.5 min-[480px]:flex" title={spanishInterfaceCopy.caseStatus.operationalFundsLabel}>
        <Vault size={18} weight="fill" className="shrink-0 text-paper-muted" aria-hidden="true" />
        <span className="visually-hidden-text">{spanishInterfaceCopy.caseStatus.operationalFundsLabel}</span>
        <CountedAmount amount={investigator.operationalFunds} />
      </div>
      <div className="hidden min-w-0 items-center gap-1.5 min-[640px]:flex" title={spanishInterfaceCopy.caseStatus.hourLabel}>
        <Clock size={18} weight="fill" className="shrink-0 text-paper-muted" aria-hidden="true" />
        <span className="visually-hidden-text">{spanishInterfaceCopy.caseStatus.hourLabel}</span>
        <span className="font-[family-name:var(--font-dossier)] text-lg font-bold tabular-nums">
          {falsifiedWorldClockText ?? formatWorldClock(investigator.worldClockMinutes)}
        </span>
      </div>
    </div>
  )
}

export function CaseStatusPanel({
  investigator,
  investigatorFullName,
  oicnauStance,
  falsifiedWorldClockText = null,
}: {
  investigator: InvestigatorState
  investigatorFullName: string
  oicnauStance: OicnauStance | null
  falsifiedWorldClockText?: string | null
}) {
  const { chronicleState } = useChronicleState()
  const caseStatusCopy = spanishInterfaceCopy.caseStatus
  const belongingIdentifiers = Object.keys(investigator.belongingUnits) as BelongingIdentifier[]
  return (
    <section aria-label={caseStatusCopy.title} className="flex flex-col gap-5">
      <div>
        <p className="dossier-label">{caseStatusCopy.investigatorLabel}</p>
        <p className="display-title mt-1 text-2xl [overflow-wrap:anywhere]">{investigatorFullName}</p>
        <p className="dossier-label mt-1">
          {caseStatusCopy.levelLabel} {investigator.level}
        </p>
        {oicnauStance ? (
          <p className="mt-3 text-sm">
            <span className="dossier-label block">{spanishInterfaceCopy.oicnauContact.stanceRecordLabel}</span>
            {spanishInterfaceCopy.oicnauContact.stanceNames[oicnauStance]}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-[auto_1fr] items-start gap-x-3 gap-y-4 border-t-2 border-ink-line pt-4">
        <MapPin size={20} weight="fill" className="mt-0.5 text-paper-muted" aria-hidden="true" />
        <div>
          <p className="dossier-label">{caseStatusCopy.placeLabel}</p>
          <p className="text-sm font-medium">{investigator.placeName}</p>
        </div>
        <Clock size={20} weight="fill" className="mt-0.5 text-paper-muted" aria-hidden="true" />
        <div>
          <p className="dossier-label">{caseStatusCopy.hourLabel}</p>
          <p className="font-[family-name:var(--font-dossier)] text-lg font-bold tabular-nums">
            {falsifiedWorldClockText ?? formatWorldClock(investigator.worldClockMinutes)}
          </p>
        </div>
        <FirstAidKit size={20} weight="fill" className="mt-0.5 text-paper-muted" aria-hidden="true" />
        <div>
          <p className="dossier-label">{caseStatusCopy.seriousWoundsLabel}</p>
          <SeriousWoundMarks
            sufferedCount={investigator.seriousWoundsSuffered}
            causeText={chronicleState.archiveRun.lastSeriousWoundCauseText}
          />
        </div>
        <Flame size={20} weight="fill" className="mt-0.5 text-paper-muted" aria-hidden="true" />
        <div>
          <p className="dossier-label">{caseStatusCopy.effortLabel}</p>
          <p className="font-[family-name:var(--font-dossier)] text-lg font-bold tabular-nums">
            {caseStatusCopy.effortRemainingLabel(chronicleState.archiveRun.effortRemaining, maximumCaseEffort)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t-2 border-ink-line pt-4">
        <div>
          <p className="dossier-label flex items-center gap-1.5">
            <Vault size={14} weight="fill" aria-hidden="true" />
            {caseStatusCopy.operationalFundsLabel}
          </p>
          <CountedAmount amount={investigator.operationalFunds} />
        </div>
        <div>
          <p className="dossier-label flex items-center gap-1.5">
            <Wallet size={14} weight="fill" aria-hidden="true" />
            {caseStatusCopy.personalFundsLabel}
          </p>
          <CountedAmount amount={investigator.personalFunds} />
        </div>
      </div>

      <div className="border-t-2 border-ink-line pt-4">
        <p className="dossier-label flex items-center gap-1.5">
          <Package size={14} weight="fill" aria-hidden="true" />
          {caseStatusCopy.belongingsLabel}
        </p>
        <ul className="mt-2 flex flex-col gap-1.5">
          {belongingIdentifiers.map((belongingIdentifier) => {
            const availableUnits = investigator.belongingUnits[belongingIdentifier]
            return (
              <li
                key={belongingIdentifier}
                className={`flex items-baseline justify-between gap-3 text-sm ${
                  availableUnits === 0 ? 'text-paper-muted line-through' : ''
                }`}
              >
                <span>
                  {readBelongingVisibleName(belongingIdentifier, chronicleState.archiveRun.belongingDefinitions)}
                </span>
                <span className="flex items-baseline gap-1">
                  <span className="dossier-label">×</span>
                  <CountedAmount amount={availableUnits} />
                  {availableUnits === 0 ? (
                    <span className="visually-hidden-text">{caseStatusCopy.depletedLabel}</span>
                  ) : null}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

import { Bandaids, Binoculars, Clock, Eye, EyeSlash, Flame, FolderSimple, MapPin, Moon, ShieldWarning, Warning } from '@phosphor-icons/react'
import type { CSSProperties } from 'react'
import { sanctuaryHomeCopy } from '../../copy/sanctuary_home_copy'
import { baselineExposureSignal, sanctuaryUpgradeDefinitions } from '../../demonstration/sanctuary_home_data'
import type { HouseRegisterReading } from './house_register_reading'
import type { PurchasedSanctuaryUpgrade } from './sanctuary_home_record'

type SanctuaryRestSectionProperties = {
  purchasedUpgrades: PurchasedSanctuaryUpgrade[]
  houseRegister: HouseRegisterReading
  resolvedArchiveCount: number
}

type ExposureSummaryName = keyof typeof sanctuaryHomeCopy.rest.exposureSummaries

export function SanctuaryRestSection({
  purchasedUpgrades,
  houseRegister,
  resolvedArchiveCount,
}: SanctuaryRestSectionProperties) {
  const restCopy = sanctuaryHomeCopy.rest
  const purchasedUpgradeIdentifiers = new Set(purchasedUpgrades.map((purchasedUpgrade) => purchasedUpgrade.upgradeIdentifier))
  const exposureSignals = sanctuaryUpgradeDefinitions
    .filter((upgradeDefinition) => purchasedUpgradeIdentifiers.has(upgradeDefinition.identifier))
    .map((upgradeDefinition) => upgradeDefinition.exposureSignalWhenInstalled)
    .filter((exposureSignal): exposureSignal is string => exposureSignal !== null)
  const exposureSummaryName: ExposureSummaryName =
    exposureSignals.length === 0 ? 'discreet' : exposureSignals.length <= 2 ? 'watched' : 'conspicuous'

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <section aria-labelledby="sanctuary-rest-title">
        <h2 id="sanctuary-rest-title" className="display-title text-2xl">
          {restCopy.title}
        </h2>
        <p className="mt-1 max-w-[68ch] text-sm text-paper-muted">{restCopy.description}</p>
        <ol className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3">
          {restCopy.rules.map((restRule, restRuleIndex) => (
            <li
              key={restRule.title}
              className="sanctuary-rest-rule entrance-from-left"
              style={{ '--entrance-order': restRuleIndex } as CSSProperties}
            >
              <Moon size={20} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <h3 className="text-base font-semibold">{restRule.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-paper-muted">{restRule.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] content-start gap-6">
        <section className="comic-panel p-4" aria-labelledby="sanctuary-condition-title">
          <h2 id="sanctuary-condition-title" className="dossier-label">
            {restCopy.currentConditionTitle}
          </h2>
          <dl className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-3">
            <div className="flex items-start gap-2">
              <Bandaids size={20} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <dt className="text-sm text-paper-muted">{restCopy.seriousWoundsLabel}</dt>
                <dd className="font-[family-name:var(--font-dossier)] text-lg font-bold">
                  {houseRegister.seriousWoundCount > 0
                    ? restCopy.seriousWoundsValue(houseRegister.seriousWoundCount)
                    : restCopy.noSeriousWounds}
                </dd>
                {houseRegister.seriousWoundCount > 0 ? (
                  <p className="mt-1 text-sm leading-relaxed [overflow-wrap:anywhere]">
                    <span className="text-paper-muted">{restCopy.woundCauseLabel}. </span>
                    {houseRegister.lastSeriousWoundCauseText || restCopy.noWoundCause}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Flame size={20} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <dt className="text-sm text-paper-muted">{restCopy.effortLabel}</dt>
                <dd
                  className={
                    houseRegister.effortRemaining === null
                      ? 'text-sm leading-relaxed'
                      : 'font-[family-name:var(--font-dossier)] text-lg font-bold tabular-nums'
                  }
                >
                  {houseRegister.effortRemaining === null
                    ? restCopy.effortAbsent
                    : restCopy.effortValue(houseRegister.effortRemaining, houseRegister.maximumEffort)}
                </dd>
              </div>
            </div>
            {houseRegister.isCaseOpen ? (
              <div className="flex items-start gap-2">
                <MapPin size={20} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <dt className="text-sm text-paper-muted">{restCopy.casePlaceLabel}</dt>
                  <dd className="text-sm font-medium [overflow-wrap:anywhere]">{houseRegister.placeName}</dd>
                </div>
              </div>
            ) : null}
            {houseRegister.clockLabel ? (
              <div className="flex items-start gap-2">
                <Clock size={20} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <dt className="text-sm text-paper-muted">{restCopy.caseClockLabel}</dt>
                  <dd className="font-[family-name:var(--font-dossier)] text-lg font-bold tabular-nums">
                    {houseRegister.clockLabel}
                  </dd>
                </div>
              </div>
            ) : null}
            <div className="flex items-start gap-2">
              <ShieldWarning size={20} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <dt className="text-sm text-paper-muted">{restCopy.conditionsLabel}</dt>
                {houseRegister.activeConditions.length > 0 ? (
                  <ul className="mt-1 grid grid-cols-[minmax(0,1fr)] gap-2">
                    {houseRegister.activeConditions.map((activeCondition) => (
                      <li key={activeCondition.conditionIdentifier} className="text-sm leading-relaxed">
                        <p className="font-medium [overflow-wrap:anywhere]">{activeCondition.visibleName}</p>
                        <p className="[overflow-wrap:anywhere]">
                          <span className="text-paper-muted">{restCopy.conditionEffectLabel}. </span>
                          {activeCondition.effectText}
                        </p>
                        <p className="[overflow-wrap:anywhere]">
                          <span className="text-paper-muted">{restCopy.conditionExitLabel}. </span>
                          {activeCondition.exitText}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <dd className="text-sm">{restCopy.noConditions}</dd>
                )}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FolderSimple size={20} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <dt className="text-sm text-paper-muted">{restCopy.resolvedArchivesLabel}</dt>
                <dd className="font-[family-name:var(--font-dossier)] text-lg font-bold tabular-nums">
                  {resolvedArchiveCount}
                </dd>
              </div>
            </div>
          </dl>
          <p className="mt-3 text-sm leading-relaxed text-paper-muted">{restCopy.registerRestNote}</p>
        </section>

        <section className="comic-panel comic-panel-cut-corner p-4" aria-labelledby="sanctuary-exposure-title">
          <h2 id="sanctuary-exposure-title" className="display-title text-xl">
            {restCopy.exposureTitle}
          </h2>
          <p className="mt-1 text-sm text-paper-muted">{restCopy.exposureDescription}</p>
          <p className="sanctuary-exposure-summary mt-3" data-exposure-summary={exposureSummaryName}>
            {exposureSummaryName === 'discreet' ? <EyeSlash size={22} weight="fill" aria-hidden="true" /> : null}
            {exposureSummaryName === 'watched' ? <Eye size={22} weight="fill" aria-hidden="true" /> : null}
            {exposureSummaryName === 'conspicuous' ? <Warning size={22} weight="fill" aria-hidden="true" /> : null}
            {restCopy.exposureSummaries[exposureSummaryName]}
          </p>
          <h3 className="dossier-label mt-4">{restCopy.exposureSignalListLabel}</h3>
          <ul className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-2">
            {(exposureSignals.length > 0 ? exposureSignals : [baselineExposureSignal]).map((exposureSignal) => (
              <li key={exposureSignal} className="flex items-start gap-2 text-sm leading-relaxed">
                <Binoculars size={18} weight="fill" className="mt-0.5 shrink-0 text-paper-muted" aria-hidden="true" />
                <span className="[overflow-wrap:anywhere]">{exposureSignal}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

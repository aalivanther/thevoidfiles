import { Bandaids, FirstAid, Skull } from '@phosphor-icons/react'
import type { CSSProperties } from 'react'
import { characterDossierCopy } from '../../copy/character_dossier_copy'
import type { InvestigatorCondition } from '../../game_state/archive_turn_contract'
import { DossierEmptyState, DossierSectionHeading, DossierSheetFrame, DossierStamp } from './DossierSheetParts'

const maximumSeriousWounds = 5

export function DossierConditionSheet({
  seriousWoundsSuffered,
  hasOpenArchive,
  lastSeriousWoundCauseText = null,
  activeConditions = [],
}: {
  seriousWoundsSuffered: number
  hasOpenArchive: boolean
  lastSeriousWoundCauseText?: string | null
  activeConditions?: InvestigatorCondition[]
}) {
  const conditionCopy = characterDossierCopy.condition
  const sufferedCount = Math.max(0, Math.min(maximumSeriousWounds, seriousWoundsSuffered))
  const stampText =
    sufferedCount >= maximumSeriousWounds
      ? conditionCopy.deceasedStamp
      : sufferedCount === maximumSeriousWounds - 1
        ? conditionCopy.criticalStamp
        : sufferedCount > 0
          ? conditionCopy.woundedStamp
          : conditionCopy.noWoundsStamp
  return (
    <DossierSheetFrame
      sheetName="condition"
      sheetTone="dark"
      sheetTitle={conditionCopy.sheetTitle}
      stamp={<DossierStamp stampText={stampText} stampTone={sufferedCount > 0 ? 'blood' : 'pale'} />}
    >
      {hasOpenArchive ? null : <p className="dossier-sheet-hint">{conditionCopy.outsideArchiveNotice}</p>}
      <DossierSectionHeading
        headingText={`${conditionCopy.seriousWoundsTitle} · ${conditionCopy.seriousWoundsCount(sufferedCount)}`}
      />
      <ol className="dossier-wound-register" aria-label={conditionCopy.seriousWoundsDescription(sufferedCount)}>
        {conditionCopy.woundOrdinals.map((woundOrdinal, woundIndex) => {
          const isSuffered = woundIndex < sufferedCount
          const isFinalWound = woundIndex === maximumSeriousWounds - 1
          return (
            <li
              key={woundOrdinal}
              className="dossier-wound-slot"
              data-suffered={isSuffered ? 'true' : 'false'}
              data-final-wound={isFinalWound ? 'true' : 'false'}
              style={{ '--entrance-order': woundIndex } as CSSProperties}
            >
              <span className="dossier-wound-slot-ordinal">{woundOrdinal}</span>
              <span className="dossier-wound-slot-mark" aria-hidden="true">
                {isFinalWound ? <Skull size={30} weight={isSuffered ? 'fill' : 'regular'} /> : null}
              </span>
              <span className="dossier-wound-slot-status">
                {isSuffered ? conditionCopy.woundSufferedStatus : conditionCopy.woundAbsentStatus}
              </span>
              {isFinalWound ? <span className="dossier-wound-slot-warning">{conditionCopy.fifthWoundWarning}</span> : null}
            </li>
          )
        })}
      </ol>
      {lastSeriousWoundCauseText ? (
        <p className="dossier-condition-notice">{lastSeriousWoundCauseText}</p>
      ) : null}
      <p className="dossier-condition-notice" data-notice-weight="heavy">
        <Bandaids size={18} weight="bold" aria-hidden="true" />
        {conditionCopy.irreversibleNotice}
      </p>
      <p className="dossier-condition-notice">{conditionCopy.attributesAreNotLifeNotice}</p>

      <DossierSectionHeading headingText={conditionCopy.conditionsTitle} />
      {activeConditions.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {activeConditions.map((activeCondition) => (
            <li key={activeCondition.conditionIdentifier} className="text-sm">
              <p className="font-medium">{activeCondition.visibleName}</p>
              <p>{activeCondition.effectText}</p>
              <p className="text-paper-muted">{activeCondition.exitText}</p>
            </li>
          ))}
        </ul>
      ) : (
        <DossierEmptyState
          icon={<FirstAid size={28} weight="bold" />}
          emptyTitle={conditionCopy.conditionsEmptyTitle}
          emptyText={conditionCopy.conditionsEmptyText}
        />
      )}
      <dl className="dossier-condition-blank-form" aria-hidden="true">
        {conditionCopy.conditionFieldLabels.map((conditionFieldLabel) => (
          <div key={conditionFieldLabel}>
            <dt>{conditionFieldLabel}</dt>
            <dd>{conditionCopy.conditionFieldEmpty}</dd>
          </div>
        ))}
      </dl>
    </DossierSheetFrame>
  )
}

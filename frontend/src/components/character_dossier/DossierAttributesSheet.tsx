import { ChartLineUp, LockSimple, Ruler } from '@phosphor-icons/react'
import { useState } from 'react'
import type { CSSProperties } from 'react'
import { chooseAnimationVariantName } from '../../animation/animation_variety'
import { useInteractionFeedback } from '../../audio/interaction_feedback'
import { characterDossierCopy } from '../../copy/character_dossier_copy'
import { maximumCaseEffort } from '../../game_state/archive_run_state'
import { calculateExperienceRequiredForNextLevel } from '../../game_state/chronicle_state'
import type {
  InvestigatorAttributeName,
  InvestigatorAttributes,
  InvestigatorProgression,
} from '../../game_state/chronicle_state'
import { spanishInterfaceCopy } from '../../spanish_interface_copy'
import { DossierEmptyState, DossierSectionHeading, DossierSheetFrame, TimedCountedAmount } from './DossierSheetParts'

const orderedAttributeNames: InvestigatorAttributeName[] = ['im', 'if', 'c', 'o', 'co', 'm', 's']
const maximumAttributeValue = 50
const initialRangeMaximumValue = 10
const levelsBetweenSkillOffers = 5
const displayedSkillSlotCount = 4
const profileTraceVariantNames = ['pen_trace', 'punched_points', 'needle_sweep'] as const

const chartWidth = 560
const chartHeight = 250
const chartLeftMargin = 40
const chartRightMargin = 20
const chartTopMargin = 18
const chartBottomMargin = 40
const axisInset = 30

function readAttributeLabels(attributeName: InvestigatorAttributeName): { abbreviation: string; name: string } {
  if (attributeName === 's') {
    return characterDossierCopy.attributes.luckAttribute
  }
  return spanishInterfaceCopy.attributes[attributeName]
}

function AttributeProfileChart({
  investigatorAttributes,
  selectedAttributeName,
}: {
  investigatorAttributes: InvestigatorAttributes
  selectedAttributeName: InvestigatorAttributeName
}) {
  const attributesCopy = characterDossierCopy.attributes
  const [profileTraceVariantName] = useState(() =>
    chooseAnimationVariantName('dossier_profile_trace', profileTraceVariantNames),
  )
  const highestValue = Math.max(...orderedAttributeNames.map((attributeName) => investigatorAttributes[attributeName]))
  const axisMaximumValue = Math.min(
    maximumAttributeValue,
    Math.max(initialRangeMaximumValue, Math.ceil(highestValue / 10) * 10),
  )
  const plotWidth = chartWidth - chartLeftMargin - chartRightMargin
  const plotHeight = chartHeight - chartTopMargin - chartBottomMargin
  const readHorizontalPosition = (attributeIndex: number) =>
    chartLeftMargin + axisInset + ((plotWidth - axisInset * 2) / (orderedAttributeNames.length - 1)) * attributeIndex
  const readVerticalPosition = (attributeValue: number) =>
    chartTopMargin + plotHeight - (Math.min(attributeValue, axisMaximumValue) / axisMaximumValue) * plotHeight
  const gridValues = Array.from({ length: 6 }, (_, gridIndex) => (axisMaximumValue / 5) * gridIndex)
  const profilePoints = orderedAttributeNames
    .map(
      (attributeName, attributeIndex) =>
        `${readHorizontalPosition(attributeIndex).toFixed(1)},${readVerticalPosition(investigatorAttributes[attributeName]).toFixed(1)}`,
    )
    .join(' ')
  const chartDescription = attributesCopy.profileChartDescription(
    orderedAttributeNames.map((attributeName) =>
      attributesCopy.attributeSummary(readAttributeLabels(attributeName).name, investigatorAttributes[attributeName]),
    ),
  )
  return (
    <figure className="dossier-profile-chart" data-trace-variant={profileTraceVariantName}>
      <figcaption className="dossier-profile-chart-caption">
        <ChartLineUp size={16} weight="bold" aria-hidden="true" />
        {attributesCopy.profileChartTitle}
      </figcaption>
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label={chartDescription}>
        <rect
          className="dossier-profile-chart-initial-range"
          x={chartLeftMargin}
          y={readVerticalPosition(initialRangeMaximumValue)}
          width={plotWidth}
          height={readVerticalPosition(0) - readVerticalPosition(initialRangeMaximumValue)}
        />
        {gridValues.map((gridValue) => (
          <g key={gridValue}>
            <line
              className="dossier-profile-chart-grid-line"
              x1={chartLeftMargin}
              x2={chartWidth - chartRightMargin}
              y1={readVerticalPosition(gridValue)}
              y2={readVerticalPosition(gridValue)}
            />
            <text className="dossier-profile-chart-scale-text" x={chartLeftMargin - 8} y={readVerticalPosition(gridValue) + 4} textAnchor="end">
              {gridValue}
            </text>
          </g>
        ))}
        {orderedAttributeNames.map((attributeName, attributeIndex) => (
          <g key={attributeName} data-selected={attributeName === selectedAttributeName ? 'true' : 'false'}>
            <line
              className="dossier-profile-chart-axis"
              x1={readHorizontalPosition(attributeIndex)}
              x2={readHorizontalPosition(attributeIndex)}
              y1={chartTopMargin}
              y2={chartTopMargin + plotHeight}
            />
            <text
              className="dossier-profile-chart-axis-text"
              x={readHorizontalPosition(attributeIndex)}
              y={chartHeight - 14}
              textAnchor="middle"
            >
              {readAttributeLabels(attributeName).abbreviation}
            </text>
          </g>
        ))}
        <polyline className="dossier-profile-chart-trace" points={profilePoints} pathLength={1} />
        {orderedAttributeNames.map((attributeName, attributeIndex) => {
          const horizontalPosition = readHorizontalPosition(attributeIndex)
          const verticalPosition = readVerticalPosition(investigatorAttributes[attributeName])
          const isSelected = attributeName === selectedAttributeName
          return (
            <g
              key={attributeName}
              className="dossier-profile-chart-point"
              data-selected={isSelected ? 'true' : 'false'}
              style={{ '--entrance-order': attributeIndex } as CSSProperties}
            >
              {isSelected ? (
                <circle className="dossier-profile-chart-point-ring" cx={horizontalPosition} cy={verticalPosition} r={13} />
              ) : null}
              <rect x={horizontalPosition - 5} y={verticalPosition - 5} width={10} height={10} />
              <text x={horizontalPosition} y={verticalPosition - 12} textAnchor="middle">
                {investigatorAttributes[attributeName]}
              </text>
            </g>
          )
        })}
      </svg>
    </figure>
  )
}

export function DossierAttributesSheet({
  investigatorAttributes,
  investigatorProgression,
  sceneEffortRemaining = null,
}: {
  investigatorAttributes: InvestigatorAttributes | null
  investigatorProgression: InvestigatorProgression
  sceneEffortRemaining?: number | null
}) {
  const attributesCopy = characterDossierCopy.attributes
  const playInteractionFeedback = useInteractionFeedback()
  const [selectedAttributeName, setSelectedAttributeName] = useState<InvestigatorAttributeName>('im')
  const requiredExperience = calculateExperienceRequiredForNextLevel(
    investigatorProgression.level,
    investigatorProgression.resolvedArchiveCount,
  )
  const experienceFraction = Math.min(1, investigatorProgression.unspentExperiencePoints / requiredExperience)
  const nextSkillOfferLevel =
    (Math.floor(investigatorProgression.level / levelsBetweenSkillOffers) + 1) * levelsBetweenSkillOffers
  const attributeTotal = investigatorAttributes
    ? orderedAttributeNames.reduce((runningTotal, attributeName) => runningTotal + investigatorAttributes[attributeName], 0)
    : 0

  return (
    <DossierSheetFrame sheetName="attributes" sheetTone="graph_paper" sheetTitle={attributesCopy.sheetTitle}>
      {sceneEffortRemaining !== null ? (
        <p className="dossier-sheet-hint">{attributesCopy.sceneEffortLine(sceneEffortRemaining, maximumCaseEffort)}</p>
      ) : null}
      {investigatorAttributes ? (
        <>
          <AttributeProfileChart
            investigatorAttributes={investigatorAttributes}
            selectedAttributeName={selectedAttributeName}
          />
          <p className="dossier-attribute-legend">
            <span data-legend-kind="initial_range" aria-hidden="true" />
            {attributesCopy.initialRangeLegend}
            <span data-legend-kind="full_scale" aria-hidden="true" />
            {attributesCopy.fullScaleLegend}
          </p>
          <p className="dossier-sheet-hint">{attributesCopy.selectAttributeHint}</p>
          <ul className="dossier-attribute-rows">
            {orderedAttributeNames.map((attributeName, attributeIndex) => {
              const attributeLabels = readAttributeLabels(attributeName)
              const attributeValue = investigatorAttributes[attributeName]
              const isSelected = attributeName === selectedAttributeName
              return (
                <li key={attributeName} style={{ '--entrance-order': attributeIndex } as CSSProperties}>
                  <button
                    type="button"
                    className="dossier-attribute-row"
                    aria-pressed={isSelected}
                    onPointerEnter={(pointerEvent) => {
                      if (pointerEvent.pointerType === 'mouse') {
                        playInteractionFeedback('option_hover')
                      }
                    }}
                    onClick={() => {
                      playInteractionFeedback('option_click')
                      setSelectedAttributeName(attributeName)
                    }}
                  >
                    <span className="dossier-attribute-row-abbreviation">{attributeLabels.abbreviation}</span>
                    <span className="dossier-attribute-row-body">
                      <span className="dossier-attribute-row-name">{attributeLabels.name}</span>
                      <span className="dossier-attribute-row-purpose">{attributesCopy.attributePurposes[attributeName]}</span>
                      <span className="dossier-attribute-gauge" aria-hidden="true">
                        <span className="dossier-attribute-gauge-initial-range" />
                        <span
                          className="dossier-attribute-gauge-fill"
                          style={{ width: `${(Math.min(attributeValue, maximumAttributeValue) / maximumAttributeValue) * 100}%` }}
                        />
                        <span className="dossier-attribute-gauge-initial-mark">{initialRangeMaximumValue}</span>
                        <span className="dossier-attribute-gauge-maximum-mark">{maximumAttributeValue}</span>
                      </span>
                      <span className="dossier-attribute-row-improvements">
                        {attributesCopy.improvementCount(
                          investigatorProgression.attributeImprovementCounts[attributeName] ?? 0,
                        )}
                      </span>
                    </span>
                    <span className="dossier-attribute-row-value">
                      <span className="visually-hidden-text">{attributesCopy.currentValueLabel}: </span>
                      {attributeValue}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="dossier-attribute-total">
            <Ruler size={16} weight="bold" aria-hidden="true" />
            <span>
              {attributesCopy.initialTotalLabel}: <strong>{attributeTotal}</strong>. {attributesCopy.initialTotalRule}
            </span>
          </p>
        </>
      ) : (
        <DossierEmptyState
          icon={<ChartLineUp size={28} weight="bold" />}
          emptyTitle={attributesCopy.missingEvaluationTitle}
          emptyText={attributesCopy.missingEvaluationText}
        />
      )}

      <DossierSectionHeading headingText={attributesCopy.progressionTitle} noteText={attributesCopy.ascentReminder} />
      <div className="dossier-progression-grid">
        <div className="dossier-progression-figure" data-figure-size="large">
          <span className="dossier-progression-figure-label">{attributesCopy.levelLabel}</span>
          <span className="dossier-progression-figure-value">
            <TimedCountedAmount amount={investigatorProgression.level} />
            <small>{attributesCopy.maximumLevelNote}</small>
          </span>
        </div>
        <div className="dossier-progression-figure">
          <span className="dossier-progression-figure-label">{attributesCopy.unspentExperienceLabel}</span>
          <span className="dossier-progression-figure-value">
            <TimedCountedAmount amount={investigatorProgression.unspentExperiencePoints} />
          </span>
        </div>
        <div className="dossier-progression-figure">
          <span className="dossier-progression-figure-label">{attributesCopy.lifetimeExperienceLabel}</span>
          <span className="dossier-progression-figure-value">
            <TimedCountedAmount amount={investigatorProgression.lifetimeExperiencePoints} />
          </span>
        </div>
        <div className="dossier-progression-figure">
          <span className="dossier-progression-figure-label">{attributesCopy.resolvedArchivesLabel}</span>
          <span className="dossier-progression-figure-value">
            <TimedCountedAmount amount={investigatorProgression.resolvedArchiveCount} />
            <small>{attributesCopy.resolvedArchivesTotal}</small>
          </span>
        </div>
      </div>
      <div className="dossier-experience-requirement">
        <p className="dossier-progression-figure-label">{attributesCopy.requiredExperienceLabel}</p>
        <p className="dossier-experience-formula">
          <span>{attributesCopy.requiredExperienceFormula}</span>
          <strong>
            {attributesCopy.requiredExperienceCalculation(
              investigatorProgression.level,
              investigatorProgression.resolvedArchiveCount,
              requiredExperience,
            )}
          </strong>
        </p>
        <div
          className="dossier-experience-ruler"
          role="img"
          aria-label={attributesCopy.experienceProgressDescription(
            investigatorProgression.unspentExperiencePoints,
            requiredExperience,
          )}
        >
          <span className="dossier-experience-ruler-fill" style={{ width: `${experienceFraction * 100}%` }} />
        </div>
        <p className="dossier-experience-remaining">
          {investigatorProgression.unspentExperiencePoints} / {requiredExperience} ·{' '}
          {attributesCopy.remainingExperience(requiredExperience - investigatorProgression.unspentExperiencePoints)}
        </p>
      </div>

      <DossierSectionHeading
        headingText={attributesCopy.skillsTitle}
        noteText={attributesCopy.nextSkillOffer(nextSkillOfferLevel)}
      />
      <DossierEmptyState
        icon={<LockSimple size={28} weight="bold" />}
        emptyTitle={attributesCopy.skillsEmptyTitle}
        emptyText={attributesCopy.skillsEmptyText}
      />
      <ol className="dossier-skill-slots">
        {Array.from({ length: displayedSkillSlotCount }, (_, slotIndex) => {
          const slotLevel = (slotIndex + 1) * levelsBetweenSkillOffers
          return (
            <li key={slotLevel} className="dossier-skill-slot" style={{ '--entrance-order': slotIndex } as CSSProperties}>
              <span className="dossier-skill-slot-level">{attributesCopy.skillSlotLabel(slotLevel)}</span>
              <span className="dossier-skill-slot-status">{attributesCopy.skillSlotEmpty}</span>
            </li>
          )
        })}
      </ol>
    </DossierSheetFrame>
  )
}

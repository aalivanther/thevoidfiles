import { TrendDown, TrendUp } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { chooseAnimationVariantName, randomNumberBetween } from '../../animation/animation_variety'
import { organizationsAlliesCopy } from '../../copy/organizations_allies_copy'
import {
  lieutenantMaximumRelationshipLevel,
  lieutenantMinimumRelationshipLevel,
} from '../../demonstration/organizations_allies_data'
import type { ContactSilhouetteName } from '../../demonstration/organizations_allies_data'
import { usePlayerSettings } from '../../settings/player_settings'
import { HandDrawnStandingGauge } from './HandDrawnStandingGauge'

const levelCountStartDelayMilliseconds = 450
const levelCountStepMilliseconds = 170
const stampFallVariantNames = ['straight_slam', 'rocking_settle', 'pressed_twice', 'dragged_smear'] as const

type BoardInkStampProperties = {
  stampText?: string
  entranceOrder?: number
  isPrintedOnPaper?: boolean
}

export function BoardInkStamp({
  stampText = organizationsAlliesCopy.shared.noDataStamp,
  entranceOrder = 0,
  isPrintedOnPaper = false,
}: BoardInkStampProperties) {
  const [stampFallVariantName] = useState(() => chooseAnimationVariantName('factions_stamp_fall', stampFallVariantNames))
  const [stampStyle] = useState(
    () =>
      ({
        '--stamp-rest-tilt': `${randomNumberBetween(-7, 5).toFixed(1)}deg`,
        '--entrance-order': entranceOrder,
      }) as CSSProperties,
  )
  return (
    <span
      className="factions-undiscovered-stamp"
      data-stamp-fall-variant={stampFallVariantName}
      data-printed-on-paper={isPrintedOnPaper}
      style={stampStyle}
    >
      {stampText}
    </span>
  )
}

type UndiscoveredFieldProperties = {
  fieldLabel: string
  entranceOrder: number
}

export function UndiscoveredField({ fieldLabel, entranceOrder }: UndiscoveredFieldProperties) {
  return (
    <div className="factions-undiscovered-field">
      <dt className="dossier-label">{fieldLabel}</dt>
      <dd className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <BoardInkStamp entranceOrder={entranceOrder} />
        <span className="text-sm text-paper-muted">{organizationsAlliesCopy.shared.noDataExplanation}</span>
      </dd>
    </div>
  )
}

type RelationshipLevelScaleProperties = {
  directionLabel: string
  level: number
  previousLevel?: number | null
  stableSeedText: string
}

export function RelationshipLevelScale({ directionLabel, level, previousLevel = null, stableSeedText }: RelationshipLevelScaleProperties) {
  const contactsCopy = organizationsAlliesCopy.contacts
  const { shouldReduceMotion } = usePlayerSettings()
  const hasLevelChanged = previousLevel !== null && previousLevel !== level
  const [countedLevel, setCountedLevel] = useState(hasLevelChanged ? previousLevel : level)
  const isWithinLieutenantZone = level >= lieutenantMinimumRelationshipLevel && level <= lieutenantMaximumRelationshipLevel

  useEffect(() => {
    if (!hasLevelChanged || previousLevel === null || shouldReduceMotion) {
      return
    }
    const countingStartedAtMilliseconds = Date.now()
    const levelDistance = Math.abs(level - previousLevel)
    const countingIntervalIdentifier = window.setInterval(() => {
      const elapsedMilliseconds = Date.now() - countingStartedAtMilliseconds - levelCountStartDelayMilliseconds
      const countedStepCount = Math.min(levelDistance, Math.max(0, Math.floor(elapsedMilliseconds / levelCountStepMilliseconds)))
      setCountedLevel(previousLevel + Math.sign(level - previousLevel) * countedStepCount)
      if (countedStepCount >= levelDistance) {
        window.clearInterval(countingIntervalIdentifier)
      }
    }, levelCountStepMilliseconds / 2)
    return () => window.clearInterval(countingIntervalIdentifier)
  }, [hasLevelChanged, previousLevel, level, shouldReduceMotion])

  const shownLevel = hasLevelChanged && !shouldReduceMotion ? countedLevel : level

  return (
    <div className="min-w-0">
      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3">
        <p className="font-[family-name:var(--font-dossier)] text-sm font-bold [overflow-wrap:anywhere]">{directionLabel}</p>
        <p className="factions-standing-gauge-value" data-has-level-changed={hasLevelChanged}>
          {hasLevelChanged ? (
            level > (previousLevel ?? level) ? (
              <TrendUp size={14} weight="bold" aria-hidden="true" />
            ) : (
              <TrendDown size={14} weight="bold" aria-hidden="true" />
            )
          ) : null}
          {contactsCopy.levelValueLabel(shownLevel)}
        </p>
      </div>
      <div
        className="factions-standing-gauge-frame mt-1"
        role="img"
        aria-label={`${contactsCopy.levelReadout(directionLabel, level)}. ${
          hasLevelChanged && previousLevel !== null ? `${contactsCopy.levelChangedReadout(previousLevel, level)}. ` : ''
        }${isWithinLieutenantZone ? contactsCopy.lieutenantReachable : contactsCopy.lieutenantNotReachable}`}
      >
        <HandDrawnStandingGauge stableSeedText={stableSeedText} level={level} previousLevel={previousLevel} />
      </div>
      {hasLevelChanged && previousLevel !== null ? (
        <p className="factions-standing-gauge-change-note">{contactsCopy.levelChangedReadout(previousLevel, level)}</p>
      ) : null}
    </div>
  )
}

type ContactSilhouettePhotographProperties = {
  silhouetteName: ContactSilhouetteName
  isCompact?: boolean
}

const silhouettePathBySilhouetteName: Record<ContactSilhouetteName, string> = {
  close_figure: 'M50 22 C61 22 68 31 68 43 C68 53 63 61 57 65 L58 72 C76 76 88 84 90 120 H10 C12 84 24 76 42 72 L43 65 C37 61 32 53 32 43 C32 31 39 22 50 22 Z',
  seated_figure:
    'M52 20 C62 20 69 28 69 39 C69 45 67 50 64 54 L72 56 C70 44 66 34 60 30 C70 30 80 44 78 62 L66 64 L66 70 C80 74 90 86 92 120 H12 C14 88 22 76 38 71 L40 62 C35 57 34 48 35 39 C36 28 42 20 52 20 Z',
  long_coat_figure:
    'M50 20 C60 20 66 28 66 39 C66 48 62 55 57 59 L58 64 L78 72 C86 76 92 92 96 120 H4 C8 92 14 76 22 72 L42 64 L43 59 C38 55 34 48 34 39 C34 28 40 20 50 20 Z',
  capped_figure:
    'M28 38 C30 24 40 17 52 17 C63 17 71 24 72 35 L84 39 L84 43 L30 43 Z M34 46 H68 C68 55 63 62 57 65 L58 72 C76 76 86 86 88 120 H12 C14 86 24 76 42 72 L43 65 C38 62 34 55 34 46 Z',
}

export function ContactSilhouettePhotograph({ silhouetteName, isCompact = false }: ContactSilhouettePhotographProperties) {
  const [photographStyle] = useState(
    () => ({ '--photograph-tilt': `${randomNumberBetween(-3.5, 3.5).toFixed(1)}deg` }) as CSSProperties,
  )
  return (
    <span className="factions-photograph" data-is-compact={isCompact} style={photographStyle} aria-hidden="true">
      <svg viewBox="0 0 100 120" className="factions-photograph-image" focusable="false">
        <rect x="0" y="0" width="100" height="120" className="factions-photograph-ground" />
        <path d={silhouettePathBySilhouetteName[silhouetteName]} className="factions-photograph-silhouette" fillRule="evenodd" />
      </svg>
      <svg viewBox="0 0 24 48" className="factions-photograph-clip" focusable="false">
        <path d="M7 40 V12 C7 5 17 5 17 12 V34 C17 39 10 39 10 34 V16" fill="none" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    </span>
  )
}

import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { chooseAnimationVariantName, randomNumberBetween } from '../../animation/animation_variety'
import { useInteractionFeedback } from '../../audio/interaction_feedback'
import { characterDossierCopy } from '../../copy/character_dossier_copy'
import { formatAmount } from '../../game_state/chronicle_state'
import { useTimedCountedAmount } from './dossier_timed_reveals'
import { dossierSheetNames } from './dossier_view_preferences'
import type { DossierSheetName } from './dossier_view_preferences'

const sheetTurnVariantNames = ['turned_from_spine', 'pulled_from_folder', 'dropped_on_desk', 'fanned_from_corner'] as const
const stampVariantNames = ['heavy_slam', 'rocking_press', 'double_strike'] as const
const stampImpactDelayMilliseconds = 560

export type DossierStampTone = 'blood' | 'ink' | 'pale'

export function DossierStamp({
  stampText,
  stampTone,
  isSilent = false,
}: {
  stampText: string
  stampTone: DossierStampTone
  isSilent?: boolean
}) {
  const playInteractionFeedback = useInteractionFeedback()
  const [stampVariantName] = useState(() => chooseAnimationVariantName('dossier_stamp', stampVariantNames))
  const [stampStyle] = useState(
    () => ({ '--stamp-tilt': `${randomNumberBetween(-11, 9).toFixed(1)}deg` }) as CSSProperties,
  )

  useEffect(() => {
    if (isSilent) {
      return
    }
    const impactTimeoutIdentifier = window.setTimeout(
      () => playInteractionFeedback('stamp_impact'),
      stampImpactDelayMilliseconds,
    )
    return () => window.clearTimeout(impactTimeoutIdentifier)
  }, [isSilent, playInteractionFeedback])

  return (
    <span className="dossier-stamp" data-stamp-variant={stampVariantName} data-stamp-tone={stampTone} style={stampStyle}>
      {stampText}
    </span>
  )
}

export function DossierSheetFrame({
  sheetName,
  sheetTone,
  sheetTitle,
  stamp,
  children,
}: {
  sheetName: DossierSheetName
  sheetTone: 'paper' | 'graph_paper' | 'ledger' | 'dark'
  sheetTitle: string
  stamp?: ReactNode
  children: ReactNode
}) {
  const [sheetTurnVariantName] = useState(() => chooseAnimationVariantName('dossier_sheet_turn', sheetTurnVariantNames))
  const [sheetStyle] = useState(
    () => ({ '--sheet-rest-tilt': `${randomNumberBetween(-0.35, 0.35).toFixed(2)}deg` }) as CSSProperties,
  )
  const sheetNumber = dossierSheetNames.indexOf(sheetName) + 1
  return (
    <section
      className="dossier-sheet"
      data-sheet-tone={sheetTone}
      data-sheet-turn-variant={sheetTurnVariantName}
      style={sheetStyle}
      aria-labelledby={`dossier-sheet-title-${sheetName}`}
    >
      <span className="dossier-sheet-punch-holes" aria-hidden="true" />
      <span className="dossier-sheet-paperclip" aria-hidden="true" />
      <header className="dossier-sheet-header">
        <div className="min-w-0">
          <p className="dossier-sheet-numbering">
            {characterDossierCopy.folder.sheetNumbering(sheetNumber, dossierSheetNames.length)}
          </p>
          <h2 id={`dossier-sheet-title-${sheetName}`} className="dossier-sheet-title">
            {sheetTitle}
          </h2>
        </div>
        {stamp ? <div className="dossier-sheet-stamp-holder">{stamp}</div> : null}
      </header>
      {children}
    </section>
  )
}

export function DossierEmptyState({
  icon,
  emptyTitle,
  emptyText,
}: {
  icon: ReactNode
  emptyTitle: string
  emptyText: string
}) {
  return (
    <div className="dossier-empty-state">
      <span className="dossier-empty-state-icon" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="dossier-empty-state-title">{emptyTitle}</p>
        <p className="dossier-empty-state-text">{emptyText}</p>
      </div>
    </div>
  )
}

export function DossierSectionHeading({ headingText, noteText }: { headingText: string; noteText?: string }) {
  return (
    <div className="dossier-section-heading">
      <h3 className="dossier-section-heading-title">{headingText}</h3>
      {noteText ? <p className="dossier-section-heading-note">{noteText}</p> : null}
    </div>
  )
}

export function TimedCountedAmount({ amount, className }: { amount: number; className?: string }) {
  const { displayedAmount, hasSettled } = useTimedCountedAmount(amount)
  return (
    <span className={className} data-counting-settled={hasSettled ? 'true' : 'false'}>
      <span aria-hidden="true">{formatAmount(displayedAmount)}</span>
      <span className="visually-hidden-text">{formatAmount(amount)}</span>
    </span>
  )
}

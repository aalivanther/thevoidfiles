import { ArrowBendDownRight, Lock, Prohibit, SealWarning } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { chooseAnimationVariantName, randomNumberBetween } from '../../animation/animation_variety'
import { useInteractionFeedback } from '../../audio/interaction_feedback'
import { organizationsAlliesCopy } from '../../copy/organizations_allies_copy'
import {
  oicnauBondDefinitions,
  oicnauStanceDisplayOrder,
  personalizeOicnauBondDefinition,
} from '../../demonstration/organizations_allies_data'
import { formatAmount, useChronicleState } from '../../game_state/chronicle_state'
import type { OicnauStance } from '../../game_state/chronicle_state'
import { BoardInkStamp } from './relationship_board_pieces'

const lockedRefusalVariantNames = ['sideways_shake', 'heavy_drop', 'latch_rattle'] as const
const lockedRefusalDurationMilliseconds = 520

type OicnauBondPanelProperties = {
  oicnauStance: OicnauStance
  investigatorShortName: string
}

type BondTermListProperties = {
  heading: string
  terms: string[]
}

function BondTermList({ heading, terms }: BondTermListProperties) {
  return (
    <div className="min-w-0">
      <p className="factions-paper-label">{heading}</p>
      <ul className="mt-1 space-y-1">
        {terms.map((term) => (
          <li key={term} className="flex min-w-0 gap-1.5 text-sm leading-snug">
            <ArrowBendDownRight size={14} weight="bold" className="mt-0.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 [overflow-wrap:anywhere]">{term}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function OicnauBondPanel({ oicnauStance, investigatorShortName }: OicnauBondPanelProperties) {
  const bondCopy = organizationsAlliesCopy.bond
  const { chronicleState } = useChronicleState()
  const playInteractionFeedback = useInteractionFeedback()
  const [lockedRefusalVariantName, setLockedRefusalVariantName] = useState<string | null>(null)
  const [hasMeetingBeenRefused, setHasMeetingBeenRefused] = useState(false)
  const lockedRefusalTimeoutIdentifier = useRef<number | null>(null)
  const [contractTiltStyles] = useState(() =>
    oicnauStanceDisplayOrder.map(
      (_, contractIndex) =>
        ({
          '--contract-rest-tilt': `${randomNumberBetween(-0.9, 0.9).toFixed(2)}deg`,
          '--entrance-order': contractIndex + 1,
        }) as CSSProperties,
    ),
  )

  useEffect(
    () => () => {
      if (lockedRefusalTimeoutIdentifier.current !== null) {
        window.clearTimeout(lockedRefusalTimeoutIdentifier.current)
      }
    },
    [],
  )

  const refuseMeetingRequest = () => {
    playInteractionFeedback('rejection')
    setHasMeetingBeenRefused(true)
    setLockedRefusalVariantName(chooseAnimationVariantName('factions_locked_refusal', lockedRefusalVariantNames))
    if (lockedRefusalTimeoutIdentifier.current !== null) {
      window.clearTimeout(lockedRefusalTimeoutIdentifier.current)
    }
    lockedRefusalTimeoutIdentifier.current = window.setTimeout(
      () => setLockedRefusalVariantName(null),
      lockedRefusalDurationMilliseconds,
    )
  }

  return (
    <section aria-labelledby="oicnau-bond-title" className="mt-8 min-w-0 border-t-2 border-ink-line pt-6">
      <h4 id="oicnau-bond-title" className="display-title text-2xl sm:text-3xl">
        {bondCopy.sectionTitle}
      </h4>
      <p className="mt-1 max-w-[68ch] text-[0.9375rem] text-paper-muted">{bondCopy.sectionIntroduction}</p>

      <ul className="mt-5 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[repeat(3,minmax(0,1fr))]">
        {oicnauStanceDisplayOrder.map((displayedStance, contractIndex) => {
          const bondDefinition = personalizeOicnauBondDefinition(oicnauBondDefinitions[displayedStance], chronicleState)
          const isCurrentBond = displayedStance === oicnauStance
          return (
            <li
              key={displayedStance}
              className="aged-paper-document factions-bond-contract relative min-w-0 p-4"
              data-is-current-bond={isCurrentBond}
              aria-current={isCurrentBond ? 'true' : undefined}
              style={contractTiltStyles[contractIndex]}
            >
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                <h5 className="display-title min-w-0 text-xl [overflow-wrap:anywhere]">{bondDefinition.bondName}</h5>
                {isCurrentBond ? (
                  <BoardInkStamp stampText={bondCopy.currentBondStamp} isPrintedOnPaper entranceOrder={4} />
                ) : (
                  <span className="factions-paper-label inline-flex items-center gap-1">
                    <Prohibit size={13} weight="bold" aria-hidden="true" />
                    {bondCopy.notChosenLabel}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm leading-snug [overflow-wrap:anywhere]">{bondDefinition.bondSummaryText}</p>
              <p className="mt-3 flex min-w-0 flex-wrap items-baseline justify-between gap-x-2 border-y-2 border-[#1b1813]/40 py-1.5">
                <span className="factions-paper-label">{bondCopy.operationalFundsLabel}</span>
                <span className="font-[family-name:var(--font-dossier)] text-lg font-bold">
                  {formatAmount(bondDefinition.operationalFundsPerArchive)}
                </span>
              </p>
              <div className="mt-3 space-y-3">
                <BondTermList heading={bondCopy.receivedHeading} terms={bondDefinition.receivedTerms} />
                <BondTermList heading={bondCopy.owedHeading} terms={bondDefinition.owedTerms} />
                <BondTermList heading={bondCopy.exposureHeading} terms={bondDefinition.exposureTerms} />
              </div>
            </li>
          )
        })}
      </ul>

      {oicnauStance === 'sanctioned_operative' ? (
        <aside className="factions-denial-protocol mt-6 min-w-0 p-4" aria-labelledby="denial-protocol-title">
          <h5 id="denial-protocol-title" className="flex items-center gap-2 font-[family-name:var(--font-dossier)] text-sm font-bold tracking-[0.14em] uppercase">
            <SealWarning size={20} weight="fill" aria-hidden="true" />
            {bondCopy.denialProtocolHeading}
          </h5>
          <p className="mt-2 max-w-[68ch] text-[0.9375rem] leading-snug [overflow-wrap:anywhere]">
            {bondCopy.denialProtocolWarning(investigatorShortName)}
          </p>
          <p className="mt-2 text-xs text-paper-muted">{bondCopy.denialProtocolFootnote}</p>
        </aside>
      ) : null}

      <section
        aria-labelledby="reconsider-bond-title"
        className="factions-locked-scene mt-6 min-w-0 p-4"
        data-refusal-variant={lockedRefusalVariantName ?? 'none'}
      >
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <h5 id="reconsider-bond-title" className="display-title text-xl">
            {bondCopy.reconsiderHeading}
          </h5>
          <span className="inline-flex items-center gap-1.5 font-[family-name:var(--font-dossier)] text-xs tracking-wide text-paper-muted uppercase">
            <Lock size={15} weight="fill" aria-hidden="true" />
            {bondCopy.reconsiderLockedLabel}
          </span>
        </div>
        <p className="mt-2 max-w-[68ch] text-[0.9375rem] leading-snug text-paper-text">{bondCopy.reconsiderExplanation}</p>
        <p className="mt-2 max-w-[68ch] text-sm text-paper-muted">{bondCopy.reconsiderDemonstrationNotice}</p>
        <div className="mt-3 flex min-w-0 flex-wrap items-center gap-3">
          <button type="button" className="quiet-action-button" aria-disabled="true" onClick={refuseMeetingRequest}>
            <Lock size={16} weight="bold" aria-hidden="true" />
            {bondCopy.reconsiderAttemptLabel}
          </button>
          <p className="min-w-0 text-sm text-blood-accent-text [overflow-wrap:anywhere]" role="status" aria-live="polite">
            {hasMeetingBeenRefused ? bondCopy.reconsiderAttemptRejected : ''}
          </p>
        </div>
      </section>
    </section>
  )
}

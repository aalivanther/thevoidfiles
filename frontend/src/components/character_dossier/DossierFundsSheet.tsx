import { ArrowDownLeft, ArrowUpRight, Briefcase, Minus, Scales, Wallet } from '@phosphor-icons/react'
import type { CSSProperties, ReactNode } from 'react'
import { characterDossierCopy } from '../../copy/character_dossier_copy'
import { initialInvestigatorState } from '../../demonstration/demonstration_case_script'
import {
  formatAmount,
  formatWorldClock,
  operationalFundsByOicnauStance,
} from '../../game_state/chronicle_state'
import type { ChronicleState } from '../../game_state/chronicle_state'
import { sanctuaryUpgradeDefinitions } from '../../demonstration/sanctuary_home_data'
import { readSanctuaryHomeRecord } from '../sanctuary_home/sanctuary_home_record'
import { DossierEmptyState, DossierSectionHeading, DossierSheetFrame, TimedCountedAmount } from './DossierSheetParts'

type FundsMovement = {
  movementIdentifier: string
  visibleConcept: string
  visibleMoment: string
  signedAmount: number
}

type FundsMovementWithBalance = FundsMovement & { balanceAfterMovement: number }

const knownOperationalConceptByActionIdentifier: Record<string, string> = {
  pay_boatman_to_wait: characterDossierCopy.funds.operationalBoatmanConcept,
}

function attachRunningBalances(fundsMovements: FundsMovement[]): FundsMovementWithBalance[] {
  return fundsMovements.map((fundsMovement, movementIndex) => ({
    ...fundsMovement,
    balanceAfterMovement: fundsMovements
      .slice(0, movementIndex + 1)
      .reduce((runningBalance, earlierMovement) => runningBalance + earlierMovement.signedAmount, 0),
  }))
}

function calculatePersonalRewardForArchive(archiveIndex: number): number {
  return (1 + archiveIndex) * 1000
}

type HomePurchaseMovement = { upgradeIdentifier: string; paidPersonalFunds: number }

function composePersonalFundsMovements(
  currentPersonalFunds: number,
  resolvedArchiveCount: number,
  homePurchaseMovements: HomePurchaseMovement[],
): FundsMovement[] {
  const fundsCopy = characterDossierCopy.funds
  const fundsMovements: FundsMovement[] = [
    {
      movementIdentifier: 'personal_opening',
      visibleConcept: fundsCopy.personalOpeningConcept,
      visibleMoment: fundsCopy.personalOpeningMoment,
      signedAmount: initialInvestigatorState.personalFunds,
    },
  ]
  const rewardAmounts = Array.from({ length: resolvedArchiveCount }, (_, archiveIndex) =>
    calculatePersonalRewardForArchive(archiveIndex),
  )
  const homeSpendingTotal = homePurchaseMovements.reduce(
    (runningTotal, homePurchaseMovement) => runningTotal + homePurchaseMovement.paidPersonalFunds,
    0,
  )
  const expectedBalance =
    rewardAmounts.reduce(
      (runningBalance, rewardAmount) => runningBalance + rewardAmount,
      initialInvestigatorState.personalFunds,
    ) - homeSpendingTotal
  const doKnownMovementsExplainBalance = expectedBalance === currentPersonalFunds
  if (doKnownMovementsExplainBalance) {
    rewardAmounts.forEach((rewardAmount, archiveIndex) => {
      fundsMovements.push({
        movementIdentifier: `personal_reward_${archiveIndex}`,
        visibleConcept: fundsCopy.personalRewardConcept(archiveIndex + 1),
        visibleMoment: fundsCopy.personalRewardMoment,
        signedAmount: rewardAmount,
      })
    })
    homePurchaseMovements.forEach((homePurchaseMovement) => {
      const upgradeDefinition = sanctuaryUpgradeDefinitions.find(
        (candidateDefinition) => candidateDefinition.identifier === homePurchaseMovement.upgradeIdentifier,
      )
      fundsMovements.push({
        movementIdentifier: `personal_home_purchase_${homePurchaseMovement.upgradeIdentifier}`,
        visibleConcept: fundsCopy.personalHomePurchaseConcept(upgradeDefinition?.visibleName ?? fundsCopy.personalOtherConcept),
        visibleMoment: fundsCopy.personalHomePurchaseMoment,
        signedAmount: -homePurchaseMovement.paidPersonalFunds,
      })
    })
    return fundsMovements
  }
  const unexplainedAmount = currentPersonalFunds - initialInvestigatorState.personalFunds
  if (unexplainedAmount !== 0) {
    fundsMovements.push({
      movementIdentifier: 'personal_other',
      visibleConcept: fundsCopy.personalOtherConcept,
      visibleMoment: fundsCopy.personalOtherMoment,
      signedAmount: unexplainedAmount,
    })
  }
  return fundsMovements
}

function composeOperationalFundsMovements(chronicleState: ChronicleState): FundsMovement[] {
  const fundsCopy = characterDossierCopy.funds
  const oicnauStance = chronicleState.oicnauStance ?? 'sanctioned_operative'
  const openingAmount = operationalFundsByOicnauStance[oicnauStance]
  const fundsMovements: FundsMovement[] = [
    {
      movementIdentifier: 'operational_opening',
      visibleConcept: fundsCopy.operationalOpeningConceptByStance[oicnauStance],
      visibleMoment: fundsCopy.operationalOpeningMoment(formatWorldClock(initialInvestigatorState.worldClockMinutes)),
      signedAmount: openingAmount,
    },
  ]
  const { logEntries, witnessedOrigins } = chronicleState.archiveRun
  const confirmedTurnIdentifiers: string[] = []
  let explainedSpentAmount = 0
  for (const logEntry of logEntries) {
    if (logEntry.turnIdentifier !== null && !confirmedTurnIdentifiers.includes(logEntry.turnIdentifier)) {
      confirmedTurnIdentifiers.push(logEntry.turnIdentifier)
    }
    if (logEntry.voice !== 'consequence_receipt') {
      continue
    }
    const knownConceptOfTurn = witnessedOrigins
      .filter((witnessedOrigin) => witnessedOrigin.worldClockMinutes === logEntry.worldClockMinutes)
      .map((witnessedOrigin) => knownOperationalConceptByActionIdentifier[witnessedOrigin.originIdentifier])
      .find((knownConcept) => knownConcept !== undefined)
    logEntry.confirmedEffects.forEach((confirmedEffect, effectIndex) => {
      if (confirmedEffect.kind !== 'operational_funds_spent') {
        return
      }
      explainedSpentAmount += confirmedEffect.amount
      fundsMovements.push({
        movementIdentifier: `operational_${logEntry.identifier}_${effectIndex}`,
        visibleConcept: knownConceptOfTurn ?? fundsCopy.operationalOtherConcept,
        visibleMoment: fundsCopy.operationalTurnMoment(confirmedTurnIdentifiers.length),
        signedAmount: -confirmedEffect.amount,
      })
    })
  }
  const totalSpentAmount = openingAmount - chronicleState.investigator.operationalFunds
  if (totalSpentAmount !== explainedSpentAmount) {
    const openingMovement = fundsMovements[0]
    return [
      openingMovement,
      {
        movementIdentifier: 'operational_other',
        visibleConcept: fundsCopy.operationalOtherConcept,
        visibleMoment: fundsCopy.operationalUnknownMoment,
        signedAmount: -totalSpentAmount,
      },
    ].filter((fundsMovement) => fundsMovement === openingMovement || fundsMovement.signedAmount !== 0)
  }
  return fundsMovements
}

function FundsLedger({
  ledgerKind,
  ledgerTitle,
  ledgerNote,
  ledgerIcon,
  fundsMovements,
  footnote,
}: {
  ledgerKind: 'personal' | 'operational'
  ledgerTitle: string
  ledgerNote: string
  ledgerIcon: ReactNode
  fundsMovements: FundsMovement[] | null
  footnote?: string
}) {
  const fundsCopy = characterDossierCopy.funds
  const movementsWithBalance = fundsMovements ? attachRunningBalances(fundsMovements) : []
  const derivedBalance = movementsWithBalance.length > 0 ? movementsWithBalance[movementsWithBalance.length - 1].balanceAfterMovement : 0
  return (
    <article className="dossier-funds-ledger" data-ledger-kind={ledgerKind}>
      <header className="dossier-funds-ledger-header">
        <span className="dossier-funds-ledger-icon" aria-hidden="true">
          {ledgerIcon}
        </span>
        <div className="min-w-0">
          <h3 className="dossier-funds-ledger-title">{ledgerTitle}</h3>
          <p className="dossier-funds-ledger-note">{ledgerNote}</p>
        </div>
      </header>
      {fundsMovements ? (
        <>
          <p className="dossier-funds-balance">
            <span className="dossier-funds-balance-label">{fundsCopy.balanceLabel}</span>
            <TimedCountedAmount amount={derivedBalance} className="dossier-funds-balance-amount" />
          </p>
          <table className="dossier-funds-movements">
            <caption>{fundsCopy.ledgerTitle}</caption>
            <thead>
              <tr>
                <th scope="col">{fundsCopy.ledgerConceptColumn}</th>
                <th scope="col">{fundsCopy.ledgerAmountColumn}</th>
                <th scope="col">{fundsCopy.ledgerBalanceColumn}</th>
              </tr>
            </thead>
            <tbody>
              {movementsWithBalance.map((fundsMovement, movementIndex) => (
                <tr
                  key={fundsMovement.movementIdentifier}
                  className="dossier-funds-movement"
                  data-movement-direction={
                    fundsMovement.signedAmount > 0 ? 'incoming' : fundsMovement.signedAmount < 0 ? 'outgoing' : 'neutral'
                  }
                  style={{ '--entrance-order': movementIndex } as CSSProperties}
                >
                  <th scope="row">
                    <span className="dossier-funds-movement-moment">{fundsMovement.visibleMoment}</span>
                    <span className="dossier-funds-movement-concept">{fundsMovement.visibleConcept}</span>
                  </th>
                  <td>
                    <span className="dossier-funds-movement-amount">
                      {fundsMovement.signedAmount > 0 ? (
                        <ArrowDownLeft size={14} weight="bold" aria-hidden="true" />
                      ) : fundsMovement.signedAmount < 0 ? (
                        <ArrowUpRight size={14} weight="bold" aria-hidden="true" />
                      ) : (
                        <Minus size={14} weight="bold" aria-hidden="true" />
                      )}
                      <span className="visually-hidden-text">
                        {fundsMovement.signedAmount > 0
                          ? fundsCopy.incomingMovement
                          : fundsMovement.signedAmount < 0
                            ? fundsCopy.outgoingMovement
                            : fundsCopy.neutralMovement}
                        :{' '}
                      </span>
                      {fundsMovement.signedAmount > 0 ? '+' : fundsMovement.signedAmount < 0 ? '−' : ''}
                      {formatAmount(Math.abs(fundsMovement.signedAmount))}
                    </span>
                  </td>
                  <td>{formatAmount(fundsMovement.balanceAfterMovement)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="dossier-funds-ledger-footnote">{fundsCopy.balanceDerivedNote}</p>
          {footnote ? <p className="dossier-funds-ledger-footnote">{footnote}</p> : null}
        </>
      ) : (
        <DossierEmptyState
          icon={<Briefcase size={28} weight="bold" />}
          emptyTitle={fundsCopy.operationalEmptyTitle}
          emptyText={fundsCopy.operationalEmptyText}
        />
      )}
    </article>
  )
}

export function DossierFundsSheet({ chronicleState }: { chronicleState: ChronicleState }) {
  const fundsCopy = characterDossierCopy.funds
  const hasOpenArchive = chronicleState.chosenWhisperIdentifier !== null
  const currentPersonalFunds =
    hasOpenArchive && !chronicleState.haveImprovementsBeenConfirmed
      ? chronicleState.investigator.personalFunds
      : chronicleState.investigatorProgression.personalFunds
  const personalFundsMovements = composePersonalFundsMovements(
    currentPersonalFunds,
    chronicleState.investigatorProgression.resolvedArchiveCount,
    readSanctuaryHomeRecord(chronicleState.moduleRecords.sanctuary_home).purchasedUpgrades,
  )
  const operationalFundsMovements = hasOpenArchive ? composeOperationalFundsMovements(chronicleState) : null
  const operationalFootnote = !hasOpenArchive
    ? undefined
    : chronicleState.oicnauStance === 'refused_offer'
      ? fundsCopy.refusedOfferNotice
      : fundsCopy.operationalReturnReminder(formatAmount(chronicleState.investigator.operationalFunds))

  return (
    <DossierSheetFrame sheetName="funds" sheetTone="ledger" sheetTitle={fundsCopy.sheetTitle}>
      <p className="dossier-funds-separation-notice">
        <Scales size={18} weight="bold" aria-hidden="true" />
        {fundsCopy.separationNotice}
      </p>
      <div className="dossier-funds-ledgers">
        <FundsLedger
          ledgerKind="personal"
          ledgerTitle={fundsCopy.personalTitle}
          ledgerNote={fundsCopy.personalNote}
          ledgerIcon={<Wallet size={24} weight="fill" />}
          fundsMovements={personalFundsMovements}
        />
        <FundsLedger
          ledgerKind="operational"
          ledgerTitle={fundsCopy.operationalTitle}
          ledgerNote={fundsCopy.operationalNote}
          ledgerIcon={<Briefcase size={24} weight="fill" />}
          fundsMovements={operationalFundsMovements}
          footnote={operationalFootnote}
        />
      </div>
      <DossierSectionHeading headingText={fundsCopy.debtsTitle} />
      <DossierEmptyState
        icon={<Scales size={28} weight="bold" />}
        emptyTitle={fundsCopy.debtsEmptyTitle}
        emptyText={fundsCopy.debtsEmptyText}
      />
    </DossierSheetFrame>
  )
}

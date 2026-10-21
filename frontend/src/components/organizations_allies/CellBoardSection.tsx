import { ClockCountdown, Crosshair, Package, UserFocus } from '@phosphor-icons/react'
import type { CSSProperties, ReactNode } from 'react'
import { organizationsAlliesCopy } from '../../copy/organizations_allies_copy'
import type { KnownContact } from '../../demonstration/organizations_allies_data'
import { BoardInkStamp, ContactSilhouettePhotograph } from './relationship_board_pieces'

const emptyLieutenantSlotNumbers = [1, 2, 3] as const

type CellBoardSectionProperties = {
  knownContacts: KnownContact[]
  investigatorShortName: string
}

const missionPartIcons: ReactNode[] = [
  <UserFocus key="agent" size={22} weight="fill" aria-hidden="true" />,
  <Crosshair key="objective" size={22} weight="fill" aria-hidden="true" />,
  <Package key="resources" size={22} weight="fill" aria-hidden="true" />,
  <ClockCountdown key="duration" size={22} weight="fill" aria-hidden="true" />,
]

export function CellBoardSection({ knownContacts, investigatorShortName }: CellBoardSectionProperties) {
  const cellCopy = organizationsAlliesCopy.cell
  const contactsByClosenessToLieutenancy = [...knownContacts].sort(
    (firstContact, secondContact) =>
      secondContact.relationshipTowardInvestigator.level - firstContact.relationshipTowardInvestigator.level,
  )
  return (
    <section aria-labelledby="cell-section-title" className="min-w-0">
      <h2 id="cell-section-title" className="display-title text-3xl sm:text-4xl">
        {cellCopy.sectionTitle}
      </h2>

      <div className="comic-panel factions-case-card mt-5 min-w-0 p-4 sm:p-6" data-slide-variant="dropped_from_above">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
          <h3 className="display-title text-2xl sm:text-3xl">{cellCopy.emptyHeadline}</h3>
          <BoardInkStamp stampText={cellCopy.emptyStamp} entranceOrder={3} />
        </div>
        <p className="narrative-prose mt-2">{cellCopy.emptyExplanation(investigatorShortName)}</p>

        <ul className="mt-5 grid min-w-0 grid-cols-[repeat(3,minmax(0,1fr))] gap-3">
          {emptyLieutenantSlotNumbers.map((slotNumber) => (
            <li
              key={slotNumber}
              className="factions-vacant-slot entrance-from-below"
              style={{ '--entrance-order': slotNumber } as CSSProperties}
            >
              <ContactSilhouettePhotograph silhouetteName="close_figure" isCompact />
              <p className="dossier-label mt-2 [overflow-wrap:anywhere]">{cellCopy.lieutenantSlotLabel(slotNumber)}</p>
              <p className="text-sm text-paper-muted">{cellCopy.lieutenantSlotEmpty}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[repeat(2,minmax(0,1fr))]">
        <section aria-labelledby="cell-requirements-heading" className="comic-panel min-w-0 p-4 sm:p-5">
          <h3 id="cell-requirements-heading" className="factions-section-heading">
            {cellCopy.requirementsHeading}
          </h3>
          <ol className="mt-3 space-y-3">
            {cellCopy.requirements.map((requirement, requirementIndex) => (
              <li key={requirement.title} className="flex min-w-0 gap-3">
                <span className="factions-requirement-number" aria-hidden="true">
                  {requirementIndex + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold [overflow-wrap:anywhere]">{requirement.title}</p>
                  <p className="text-sm text-paper-muted [overflow-wrap:anywhere]">{requirement.description}</p>
                </div>
              </li>
            ))}
          </ol>

          <h3 className="factions-section-heading mt-6">{cellCopy.closestCandidateHeading}</h3>
          {contactsByClosenessToLieutenancy.length === 0 ? (
            <p className="mt-2 text-sm text-paper-muted">{cellCopy.noCandidates}</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {contactsByClosenessToLieutenancy.map((knownContact) => (
                <li key={knownContact.identifier} className="font-[family-name:var(--font-dossier)] text-sm [overflow-wrap:anywhere]">
                  {cellCopy.closestCandidateLine(knownContact.displayName, knownContact.relationshipTowardInvestigator.level)}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="cell-missions-heading" className="comic-panel min-w-0 p-4 sm:p-5">
          <h3 id="cell-missions-heading" className="factions-section-heading">
            {cellCopy.missionsHeading}
          </h3>
          <p className="mt-2 text-[0.9375rem] text-paper-muted">{cellCopy.missionsExplanation}</p>
          <dl className="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
            {cellCopy.missionParts.map((missionPart, missionPartIndex) => (
              <div
                key={missionPart.title}
                className="factions-mission-part entrance-from-below"
                style={{ '--entrance-order': missionPartIndex + 1 } as CSSProperties}
              >
                <dt className="flex items-center gap-2 font-[family-name:var(--font-dossier)] text-sm font-bold tracking-wide uppercase">
                  {missionPartIcons[missionPartIndex]}
                  {missionPart.title}
                </dt>
                <dd className="mt-1 text-sm text-paper-muted [overflow-wrap:anywhere]">{missionPart.description}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-[0.9375rem] leading-snug [overflow-wrap:anywhere]">{cellCopy.missionOutcomeExplanation}</p>
          <p className="mt-4 border-t-2 border-dashed border-ink-line pt-3 font-[family-name:var(--font-dossier)] text-sm text-paper-muted">
            {cellCopy.missionBoardEmpty}
          </p>
        </section>
      </div>
    </section>
  )
}

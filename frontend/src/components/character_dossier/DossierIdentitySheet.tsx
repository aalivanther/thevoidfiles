import { Anchor, LinkBreak, Medal, Sparkle, UserFocus, Warning } from '@phosphor-icons/react'
import type { CSSProperties } from 'react'
import { characterDossierCopy } from '../../copy/character_dossier_copy'
import type { InvestigatorRegistration } from '../../game_state/chronicle_state'
import { spanishInterfaceCopy } from '../../spanish_interface_copy'
import { DossierEmptyState, DossierSectionHeading, DossierSheetFrame, DossierStamp } from './DossierSheetParts'
import { useTypedCharacterReveal } from './dossier_timed_reveals'

type ProgressionMilestoneName = keyof typeof characterDossierCopy.identity.milestoneNames

const progressionMilestones: Array<{ milestoneName: ProgressionMilestoneName; firstLevel: number; lastLevel: number }> = [
  { milestoneName: 'investigator', firstLevel: 1, lastLevel: 20 },
  { milestoneName: 'elite_agent', firstLevel: 21, lastLevel: 50 },
  { milestoneName: 'great_board_player', firstLevel: 51, lastLevel: 80 },
  { milestoneName: 'sovereign_power', firstLevel: 81, lastLevel: 99 },
]

function calculateAgeInYears(birthDate: InvestigatorRegistration['birthDate']): number {
  const today = new Date()
  const currentMonth = today.getMonth() + 1
  const hasBirthdayPassedThisYear =
    currentMonth > birthDate.month || (currentMonth === birthDate.month && today.getDate() >= birthDate.day)
  return today.getFullYear() - birthDate.year - (hasBirthdayPassedThisYear ? 0 : 1)
}

function TypedRecordValue({ fullText, revealedCharacterCount }: { fullText: string; revealedCharacterCount: number }) {
  const visibleCharacterCount = Math.max(0, Math.min(fullText.length, revealedCharacterCount))
  const isBeingTyped = visibleCharacterCount > 0 && visibleCharacterCount < fullText.length
  return (
    <>
      <span aria-hidden="true">
        {fullText.slice(0, visibleCharacterCount)}
        {isBeingTyped ? <span className="dossier-typing-head" /> : null}
        <span className="dossier-typing-remainder">{fullText.slice(visibleCharacterCount)}</span>
      </span>
      <span className="visually-hidden-text">{fullText}</span>
    </>
  )
}

export function DossierIdentitySheet({
  investigatorRegistration,
  level,
  isTypingWanted,
  onTypingSettled,
}: {
  investigatorRegistration: InvestigatorRegistration | null
  level: number
  isTypingWanted: boolean
  onTypingSettled: () => void
}) {
  const identityCopy = characterDossierCopy.identity
  const recordLines = investigatorRegistration
    ? [
        { lineLabel: identityCopy.fullNameLabel, lineValue: investigatorRegistration.fullName },
        {
          lineLabel: identityCopy.genderLabel,
          lineValue: spanishInterfaceCopy.registration.gender.options[investigatorRegistration.gender],
        },
        {
          lineLabel: identityCopy.birthDateLabel,
          lineValue: identityCopy.formatBirthDate(
            investigatorRegistration.birthDate.day,
            investigatorRegistration.birthDate.month,
            investigatorRegistration.birthDate.year,
          ),
        },
        {
          lineLabel: identityCopy.ageLabel,
          lineValue: identityCopy.formatAge(calculateAgeInYears(investigatorRegistration.birthDate)),
        },
        { lineLabel: identityCopy.originLabel, lineValue: investigatorRegistration.originPlace },
        { lineLabel: identityCopy.residenceLabel, lineValue: investigatorRegistration.residencePlace },
      ]
    : []
  const totalCharacterCount = recordLines.reduce((characterCount, recordLine) => characterCount + recordLine.lineValue.length, 0)
  const { revealedCharacterCount, isTypingFinished, completeTyping } = useTypedCharacterReveal(
    totalCharacterCount,
    isTypingWanted && recordLines.length > 0,
  )
  const currentMilestone =
    progressionMilestones.find((progressionMilestone) => level <= progressionMilestone.lastLevel) ??
    progressionMilestones[progressionMilestones.length - 1]
  const relationalAnchor = investigatorRegistration?.relationalAnchor ?? null

  const settleTyping = () => {
    if (!isTypingFinished) {
      completeTyping()
    }
    onTypingSettled()
  }

  const charactersBeforeEachLine = recordLines.map((_, lineIndex) =>
    recordLines.slice(0, lineIndex).reduce((characterCount, recordLine) => characterCount + recordLine.lineValue.length, 0),
  )
  return (
    <DossierSheetFrame
      sheetName="identity"
      sheetTone="paper"
      sheetTitle={identityCopy.sheetTitle}
      stamp={
        relationalAnchor?.kind === 'uprooted' ? (
          <DossierStamp stampText={identityCopy.uprootedStamp} stampTone="blood" />
        ) : undefined
      }
    >
      {investigatorRegistration ? (
        <div className="dossier-identity-layout" onPointerDown={settleTyping}>
          <div className="dossier-identity-photograph" aria-hidden="true">
            <UserFocus size={56} weight="thin" />
            <span>{identityCopy.photographCaption}</span>
          </div>
          <dl className="dossier-record-lines">
            {recordLines.map((recordLine, lineIndex) => {
              const revealedInThisLine = revealedCharacterCount - charactersBeforeEachLine[lineIndex]
              return (
                <div key={recordLine.lineLabel} className="dossier-record-line">
                  <dt>{recordLine.lineLabel}</dt>
                  <dd>
                    <TypedRecordValue fullText={recordLine.lineValue} revealedCharacterCount={revealedInThisLine} />
                  </dd>
                </div>
              )
            })}
          </dl>
          {!isTypingFinished ? (
            <p className="dossier-typing-hint" aria-hidden="true">
              {characterDossierCopy.folder.completeTypingHint}
            </p>
          ) : null}
        </div>
      ) : (
        <DossierEmptyState
          icon={<UserFocus size={28} weight="bold" />}
          emptyTitle={identityCopy.missingRegistrationTitle}
          emptyText={identityCopy.missingRegistrationText}
        />
      )}

      <DossierSectionHeading headingText={identityCopy.milestoneLabel} noteText={identityCopy.milestoneStartingCondition} />
      <ol className="dossier-milestone-ladder" aria-label={identityCopy.milestoneLadderLabel}>
        {progressionMilestones.map((progressionMilestone, milestoneIndex) => {
          const isCurrentMilestone = progressionMilestone === currentMilestone
          return (
            <li
              key={progressionMilestone.milestoneName}
              className="dossier-milestone-rung"
              data-current={isCurrentMilestone ? 'true' : 'false'}
              aria-current={isCurrentMilestone ? 'step' : undefined}
              style={{ '--entrance-order': milestoneIndex } as CSSProperties}
            >
              <span className="dossier-milestone-rung-range">
                {identityCopy.milestoneLevelRange(progressionMilestone.firstLevel, progressionMilestone.lastLevel)}
              </span>
              <span className="dossier-milestone-rung-name">
                {identityCopy.milestoneNames[progressionMilestone.milestoneName]}
              </span>
              {isCurrentMilestone ? (
                <span className="dossier-milestone-rung-mark">
                  <Medal size={16} weight="fill" aria-hidden="true" />
                  {identityCopy.milestoneReachedMark} · {identityCopy.milestoneCurrentLevel(level)}
                </span>
              ) : null}
            </li>
          )
        })}
      </ol>

      {relationalAnchor ? (
        <>
          <DossierSectionHeading
            headingText={identityCopy.anchorSectionTitle}
            noteText={relationalAnchor.kind === 'person' ? identityCopy.anchorIsPersonReminder : undefined}
          />
          {relationalAnchor.kind === 'person' ? (
            <div className="dossier-anchor-card">
              <span className="dossier-anchor-card-pin" aria-hidden="true" />
              <div className="dossier-anchor-card-person">
                <Anchor size={26} weight="bold" aria-hidden="true" />
                <dl className="min-w-0">
                  <div>
                    <dt>{identityCopy.anchorPersonLabel}</dt>
                    <dd>{relationalAnchor.personName}</dd>
                  </div>
                  <div>
                    <dt>{identityCopy.anchorBondLabel}</dt>
                    <dd>{relationalAnchor.bondDescription}</dd>
                  </div>
                </dl>
              </div>
              <div className="dossier-anchor-card-clauses">
                <div className="dossier-anchor-clause" data-clause-kind="blessing">
                  <p className="dossier-anchor-clause-title">
                    <Sparkle size={16} weight="fill" aria-hidden="true" />
                    {identityCopy.anchorBlessingTitle}
                  </p>
                  <p>{identityCopy.anchorBlessingText}</p>
                </div>
                <div className="dossier-anchor-clause" data-clause-kind="curse">
                  <p className="dossier-anchor-clause-title">
                    <Warning size={16} weight="fill" aria-hidden="true" />
                    {identityCopy.anchorCurseTitle}
                  </p>
                  <p>{identityCopy.anchorCurseText}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="dossier-anchor-card" data-uprooted="true">
              <div className="dossier-anchor-card-person">
                <LinkBreak size={26} weight="bold" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="dossier-anchor-uprooted-title">{identityCopy.uprootedTitle}</p>
                  <p>{identityCopy.uprootedText}</p>
                </div>
              </div>
              <ul className="dossier-anchor-uprooted-statuses">
                <li>{identityCopy.uprootedBlessingStatus}</li>
                <li>{identityCopy.uprootedCurseStatus}</li>
              </ul>
            </div>
          )}
        </>
      ) : null}
    </DossierSheetFrame>
  )
}

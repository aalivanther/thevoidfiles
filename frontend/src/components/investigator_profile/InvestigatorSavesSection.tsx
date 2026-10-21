import { CaretDown, ClockCounterClockwise, FloppyDisk, SealCheck, Skull, UserFocus } from '@phosphor-icons/react'
import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useInteractionFeedback } from '../../audio/interaction_feedback'
import { investigatorProfileCopy } from '../../copy/investigator_profile_copy'
import type {
  InvestigatorProfileLedger,
  ProfileInvestigator,
  SavedChronicleKindName,
} from '../../demonstration/investigator_profile_data'
import { formatWorldClock } from '../../game_state/chronicle_state'
import type { ContinuationSelection } from './investigator_profile_record'
import { formatSavedMoment } from './profile_moment_formatting'

type InvestigatorSavesSectionProperties = {
  investigatorProfileLedger: InvestigatorProfileLedger
  continuationSelection: ContinuationSelection | null
  onContinuationSelected: (newSelection: ContinuationSelection) => void
}

const saveKindIconByKindName: Record<SavedChronicleKindName, ReactNode> = {
  automatic: <ClockCounterClockwise size={16} weight="bold" aria-hidden="true" />,
  manual: <FloppyDisk size={16} weight="fill" aria-hidden="true" />,
  archive_closure: <SealCheck size={16} weight="fill" aria-hidden="true" />,
}

function InvestigatorCounts({ profileInvestigator }: { profileInvestigator: ProfileInvestigator }) {
  const investigatorsCopy = investigatorProfileCopy.investigators
  const countEntries: Array<{ label: string; count: number }> = [
    { label: investigatorsCopy.levelLabel, count: profileInvestigator.level },
    { label: investigatorsCopy.resolvedArchivesLabel, count: profileInvestigator.resolvedArchiveCount },
    { label: investigatorsCopy.investigatedWhispersLabel, count: profileInvestigator.investigatedWhisperCount },
    { label: investigatorsCopy.seriousWoundsLabel, count: profileInvestigator.seriousWoundsSuffered },
  ]
  return (
    <dl className="profile-count-grid mt-4">
      {countEntries.map((countEntry) => (
        <div key={countEntry.label} className="profile-count-cell">
          <dt className="dossier-label">{countEntry.label}</dt>
          <dd className="profile-count-value">{countEntry.count}</dd>
        </div>
      ))}
    </dl>
  )
}

export function InvestigatorSavesSection({
  investigatorProfileLedger,
  continuationSelection,
  onContinuationSelected,
}: InvestigatorSavesSectionProperties) {
  const investigatorsCopy = investigatorProfileCopy.investigators
  const playInteractionFeedback = useInteractionFeedback()
  const [expandedInvestigatorIdentifier, setExpandedInvestigatorIdentifier] = useState<string | null>(
    () =>
      investigatorProfileLedger.investigators.find((profileInvestigator) => profileInvestigator.conditionName === 'active')
        ?.investigatorIdentifier ?? null,
  )

  const activeInvestigators = investigatorProfileLedger.investigators.filter(
    (profileInvestigator) => profileInvestigator.conditionName === 'active',
  )
  const fallenInvestigators = investigatorProfileLedger.investigators.filter(
    (profileInvestigator) => profileInvestigator.conditionName === 'fallen',
  )
  const readThreadTitle = (threadIdentifier: string) =>
    investigatorProfileLedger.chronicleThreads.find((chronicleThread) => chronicleThread.threadIdentifier === threadIdentifier)
      ?.threadTitle ?? ''

  return (
    <section className="min-w-0" aria-labelledby="profile-active-investigators-title">
      <h2 id="profile-active-investigators-title" className="display-title text-2xl [overflow-wrap:anywhere] sm:text-3xl">
        {investigatorsCopy.activeTitle}
      </h2>
      {activeInvestigators.length === 0 ? (
        <p className="mt-4 text-paper-muted">{investigatorsCopy.noActiveInvestigators}</p>
      ) : null}
      <ul className="mt-5 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5">
        {activeInvestigators.map((profileInvestigator, investigatorIndex) => {
          const isExpanded = expandedInvestigatorIdentifier === profileInvestigator.investigatorIdentifier
          const savedChroniclesRegionIdentifier = `profile-saves-${profileInvestigator.investigatorIdentifier}`
          return (
            <li
              key={profileInvestigator.investigatorIdentifier}
              className="comic-panel profile-investigator-card entrance-from-below min-w-0 p-5"
              data-current-investigator={profileInvestigator.isCurrentInvestigator}
              style={{ '--entrance-order': investigatorIndex } as CSSProperties}
            >
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="profile-line-icon">
                    <UserFocus size={22} weight="fill" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="display-title text-2xl [overflow-wrap:anywhere]">{profileInvestigator.fullName}</h3>
                    {profileInvestigator.originLine ? (
                      <p className="mt-1 text-sm text-paper-muted [overflow-wrap:anywhere]">{profileInvestigator.originLine}</p>
                    ) : null}
                    <p className="dossier-label mt-2 [overflow-wrap:anywhere]">
                      {investigatorsCopy.threadLabel}: {readThreadTitle(profileInvestigator.chronicleThreadIdentifier)}
                    </p>
                  </div>
                </div>
                {profileInvestigator.isCurrentInvestigator ? (
                  <span className="cost-tag">{investigatorsCopy.currentInvestigatorTag}</span>
                ) : null}
              </div>
              <InvestigatorCounts profileInvestigator={profileInvestigator} />
              <button
                type="button"
                className="quiet-action-button profile-saves-toggle mt-4"
                aria-expanded={isExpanded}
                aria-controls={savedChroniclesRegionIdentifier}
                onClick={() => {
                  playInteractionFeedback(isExpanded ? 'panel_close' : 'panel_open')
                  setExpandedInvestigatorIdentifier(isExpanded ? null : profileInvestigator.investigatorIdentifier)
                }}
              >
                <CaretDown size={16} weight="bold" aria-hidden="true" className="profile-saves-toggle-caret" />
                {isExpanded
                  ? investigatorsCopy.hideSavedChronicles
                  : investigatorsCopy.showSavedChronicles(profileInvestigator.savedChronicles.length)}
              </button>
              <ul
                id={savedChroniclesRegionIdentifier}
                hidden={!isExpanded}
                className="profile-saves-list mt-4"
                aria-label={investigatorsCopy.savedChroniclesListLabel(profileInvestigator.fullName)}
              >
                {profileInvestigator.savedChronicles.map((savedChronicle, saveIndex) => {
                  const isChosenSave =
                    continuationSelection?.saveIdentifier === savedChronicle.saveIdentifier &&
                    continuationSelection.threadIdentifier === profileInvestigator.chronicleThreadIdentifier
                  return (
                    <li
                      key={savedChronicle.saveIdentifier}
                      className="profile-save-card"
                      data-chosen-save={isChosenSave}
                      style={{ '--entrance-order': saveIndex } as CSSProperties}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="profile-save-kind">
                          {saveKindIconByKindName[savedChronicle.saveKindName]}
                          {investigatorsCopy.savedChronicleKindLabels[savedChronicle.saveKindName]}
                        </p>
                        <p className="profile-save-title [overflow-wrap:anywhere]">
                          {savedChronicle.archiveTitle
                            ? `${savedChronicle.archiveNumberLabel ?? ''} · ${savedChronicle.archiveTitle}`
                            : investigatorsCopy.betweenArchives}
                        </p>
                        <p className="profile-save-detail [overflow-wrap:anywhere]">
                          {savedChronicle.placeName} · {investigatorsCopy.worldClockLabel} {formatWorldClock(savedChronicle.worldClockMinutes)}
                        </p>
                        <p className="profile-save-detail [overflow-wrap:anywhere]">
                          {investigatorsCopy.savedAtLabel} {formatSavedMoment(savedChronicle.savedAtTimestamp)} ·{' '}
                          {investigatorsCopy.turnCountLabel(savedChronicle.confirmedTurnCount)}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="profile-paper-button"
                        aria-pressed={isChosenSave}
                        onPointerEnter={(pointerEvent) => {
                          if (pointerEvent.pointerType === 'mouse') {
                            playInteractionFeedback('option_hover')
                          }
                        }}
                        onClick={() =>
                          onContinuationSelected({
                            threadIdentifier: profileInvestigator.chronicleThreadIdentifier,
                            saveIdentifier: savedChronicle.saveIdentifier,
                          })
                        }
                      >
                        {isChosenSave ? <SealCheck size={16} weight="fill" aria-hidden="true" /> : null}
                        {isChosenSave ? investigatorsCopy.chosenSaveButton : investigatorsCopy.chooseSaveButton}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </li>
          )
        })}
      </ul>

      {fallenInvestigators.length > 0 ? (
        <>
          <h2 className="display-title mt-10 text-2xl [overflow-wrap:anywhere] sm:text-3xl">{investigatorsCopy.fallenTitle}</h2>
          <p className="mt-1 max-w-[68ch] text-sm text-paper-muted">{investigatorsCopy.fallenExplanation}</p>
          <ul className="mt-5 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-[repeat(2,minmax(0,1fr))]">
            {fallenInvestigators.map((profileInvestigator, investigatorIndex) => (
              <li
                key={profileInvestigator.investigatorIdentifier}
                className="comic-panel profile-investigator-card entrance-from-below min-w-0 p-5"
                data-fallen-investigator="true"
                style={{ '--entrance-order': investigatorIndex } as CSSProperties}
              >
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                  <h3 className="display-title min-w-0 text-xl [overflow-wrap:anywhere]">{profileInvestigator.fullName}</h3>
                  <span className="profile-fallen-tag">
                    <Skull size={14} weight="fill" aria-hidden="true" />
                    {investigatorsCopy.fallenTag}
                  </span>
                </div>
                <InvestigatorCounts profileInvestigator={profileInvestigator} />
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  )
}

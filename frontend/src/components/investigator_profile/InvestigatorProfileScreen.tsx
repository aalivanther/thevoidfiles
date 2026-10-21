import { ArrowBendUpLeft, FolderUser, PlugsConnected, TreeStructure } from '@phosphor-icons/react'
import { Tabs } from 'radix-ui'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { chooseAnimationVariantName, randomNumberBetween } from '../../animation/animation_variety'
import { useInteractionFeedback } from '../../audio/interaction_feedback'
import { investigatorProfileCopy } from '../../copy/investigator_profile_copy'
import { buildInvestigatorProfileLedger, localServiceDefinitions } from '../../demonstration/investigator_profile_data'
import { useChronicleState } from '../../game_state/chronicle_state'
import { readClosedChronicleArchive } from '../../game_state/closed_chronicle_archive_storage'
import { PresentationTitleCard } from '../PresentationTitleCard'
import { ChronicleThreadsSection } from './ChronicleThreadsSection'
import { ConnectionsSection } from './ConnectionsSection'
import { ContinuationSelectionPanel } from './ContinuationSelectionPanel'
import { InvestigatorSavesSection } from './InvestigatorSavesSection'
import {
  readProfileConnections,
  readStoredInvestigatorProfileRecord,
  storeInvestigatorProfileRecord,
} from './investigator_profile_record'
import type { ContinuationSelection, InvestigatorProfileRecord, ProfileSectionName } from './investigator_profile_record'

const drawerEntranceVariantNames = ['drawer_slides_from_left', 'index_card_drops', 'folder_tab_rises', 'drawer_slides_from_right'] as const

export type InvestigatorProfileScreenProperties = {
  onReturnRequested: () => void
  onActiveChronicleResumed: () => void
}

export function InvestigatorProfileScreen({ onReturnRequested, onActiveChronicleResumed }: InvestigatorProfileScreenProperties) {
  const { chronicleState } = useChronicleState()
  const playInteractionFeedback = useInteractionFeedback()
  const [isPresentationVisible, setIsPresentationVisible] = useState(true)
  const [investigatorProfileRecord, setInvestigatorProfileRecord] = useState<InvestigatorProfileRecord>(
    readStoredInvestigatorProfileRecord,
  )
  const [drawerEntranceVariantName, setDrawerEntranceVariantName] = useState(() =>
    chooseAnimationVariantName('profile_drawer_entrance', drawerEntranceVariantNames),
  )
  const [continuationStampRotationDegrees, setContinuationStampRotationDegrees] = useState(() => randomNumberBetween(-7, 7))
  const [continuationAnnouncement, setContinuationAnnouncement] = useState('')
  const [visitMomentTimestamp] = useState(() => new Date().toISOString())
  const [closedChronicleArchive] = useState(readClosedChronicleArchive)

  const investigatorProfileLedger = useMemo(
    () =>
      buildInvestigatorProfileLedger(
        chronicleState,
        closedChronicleArchive,
        visitMomentTimestamp,
        investigatorProfileCopy.chronicleThreads.currentThreadTitle,
        investigatorProfileCopy.chronicleThreads.closedThreadTitle,
      ),
    [chronicleState, closedChronicleArchive, visitMomentTimestamp],
  )
  const profileConnections = useMemo(() => readProfileConnections(chronicleState.aiConfiguration), [chronicleState.aiConfiguration])

  const selectableThreadIdentifiers = investigatorProfileLedger.chronicleThreads
    .filter((chronicleThread) => chronicleThread.threadStateName === 'in_progress')
    .map((chronicleThread) => chronicleThread.threadIdentifier)
  const continuationSelection =
    investigatorProfileRecord.continuationSelection !== null &&
    selectableThreadIdentifiers.includes(investigatorProfileRecord.continuationSelection.threadIdentifier)
      ? investigatorProfileRecord.continuationSelection
      : null

  const saveInvestigatorProfileRecord = (changedFields: Partial<InvestigatorProfileRecord>) => {
    const updatedRecord = { ...investigatorProfileRecord, ...changedFields }
    setInvestigatorProfileRecord(updatedRecord)
    storeInvestigatorProfileRecord(updatedRecord)
  }

  const markContinuationSelection = (newSelection: ContinuationSelection) => {
    const selectedThread = investigatorProfileLedger.chronicleThreads.find(
      (chronicleThread) => chronicleThread.threadIdentifier === newSelection.threadIdentifier,
    )
    if (!selectedThread || selectedThread.threadStateName === 'closed') {
      playInteractionFeedback('rejection')
      setContinuationAnnouncement(investigatorProfileCopy.chronicleThreads.closedThreadRefusal)
      return
    }
    playInteractionFeedback('stamp_impact')
    setContinuationStampRotationDegrees(randomNumberBetween(-7, 7))
    setContinuationAnnouncement(investigatorProfileCopy.continuation.selectionAnnouncement(selectedThread.threadTitle))
    saveInvestigatorProfileRecord({ continuationSelection: newSelection })
  }

  const clearContinuationSelection = () => {
    playInteractionFeedback('panel_close')
    setContinuationAnnouncement(investigatorProfileCopy.continuation.clearedAnnouncement)
    saveInvestigatorProfileRecord({ continuationSelection: null })
  }

  if (isPresentationVisible) {
    return (
      <PresentationTitleCard
        chapterLabel={investigatorProfileCopy.presentation.chapterLabel}
        chapterTitle={investigatorProfileCopy.presentation.chapterTitle}
        detailLine={investigatorProfileCopy.presentation.detailLine}
        onPresentationFinished={() => setIsPresentationVisible(false)}
      />
    )
  }

  const activeInvestigatorCount = investigatorProfileLedger.investigators.filter(
    (profileInvestigator) => profileInvestigator.conditionName === 'active',
  ).length

  const sectionEntries: Array<{ sectionName: ProfileSectionName; label: string; icon: ReactNode; count: number }> = [
    {
      sectionName: 'connections',
      label: investigatorProfileCopy.sections.connections,
      icon: <PlugsConnected size={18} weight="fill" aria-hidden="true" />,
      count: profileConnections.length + localServiceDefinitions.length,
    },
    {
      sectionName: 'investigators',
      label: investigatorProfileCopy.sections.investigators,
      icon: <FolderUser size={18} weight="fill" aria-hidden="true" />,
      count: activeInvestigatorCount,
    },
    {
      sectionName: 'chronicle_threads',
      label: investigatorProfileCopy.sections.chronicleThreads,
      icon: <TreeStructure size={18} weight="fill" aria-hidden="true" />,
      count: investigatorProfileLedger.chronicleThreads.length,
    },
  ]

  return (
    <main id="main-content" className="profile-cabinet mx-auto w-full max-w-6xl px-4 pt-6 pb-20 sm:px-8">
      <header className="min-w-0">
        <button
          type="button"
          className="quiet-action-button entrance-from-left"
          onClick={() => {
            playInteractionFeedback('option_click')
            onReturnRequested()
          }}
        >
          <ArrowBendUpLeft size={18} weight="bold" aria-hidden="true" />
          {investigatorProfileCopy.header.returnButton}
        </button>
        <p className="dossier-label entrance-from-left mt-5">{investigatorProfileCopy.header.boardLabel}</p>
        <h1 className="display-title entrance-from-left text-4xl [overflow-wrap:anywhere] sm:text-5xl">
          {investigatorProfileCopy.header.title}
        </h1>
      </header>
      <p className="mt-2 max-w-[68ch] text-[0.9375rem] text-paper-text">{investigatorProfileCopy.header.introduction}</p>

      <ContinuationSelectionPanel
        continuationSelection={continuationSelection}
        investigatorProfileLedger={investigatorProfileLedger}
        stampRotationDegrees={continuationStampRotationDegrees}
        onActiveChronicleResumed={onActiveChronicleResumed}
        onSelectionCleared={clearContinuationSelection}
      />
      <p className="sr-only" role="status" aria-live="polite">
        {continuationAnnouncement}
      </p>

      <Tabs.Root
        value={investigatorProfileRecord.lastVisitedSectionName}
        onValueChange={(newSectionName) => {
          const visitedSectionEntry = sectionEntries.find((sectionEntry) => sectionEntry.sectionName === newSectionName)
          if (!visitedSectionEntry) {
            return
          }
          playInteractionFeedback('rising_whoosh')
          setDrawerEntranceVariantName(chooseAnimationVariantName('profile_drawer_entrance', drawerEntranceVariantNames))
          saveInvestigatorProfileRecord({ lastVisitedSectionName: visitedSectionEntry.sectionName })
        }}
        className="mt-6 min-w-0"
      >
        <Tabs.List
          className="profile-drawer-tab-list grid min-w-0 grid-cols-[repeat(3,minmax(0,1fr))] gap-2"
          aria-label={investigatorProfileCopy.sections.navigationLabel}
        >
          {sectionEntries.map((sectionEntry) => (
            <Tabs.Trigger
              key={sectionEntry.sectionName}
              value={sectionEntry.sectionName}
              className="profile-drawer-tab"
              onPointerEnter={(pointerEvent) => {
                if (pointerEvent.pointerType === 'mouse') {
                  playInteractionFeedback('option_hover')
                }
              }}
            >
              {sectionEntry.icon}
              <span className="min-w-0 [overflow-wrap:anywhere]">{sectionEntry.label}</span>
              <span className="profile-drawer-tab-count" aria-label={investigatorProfileCopy.sections.countLabel(sectionEntry.count)}>
                {sectionEntry.count}
              </span>
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="connections" className="profile-drawer-content mt-8 min-w-0" data-drawer-variant={drawerEntranceVariantName}>
          <ConnectionsSection profileConnections={profileConnections} />
        </Tabs.Content>
        <Tabs.Content value="investigators" className="profile-drawer-content mt-8 min-w-0" data-drawer-variant={drawerEntranceVariantName}>
          <InvestigatorSavesSection
            investigatorProfileLedger={investigatorProfileLedger}
            continuationSelection={continuationSelection}
            onContinuationSelected={markContinuationSelection}
          />
        </Tabs.Content>
        <Tabs.Content
          value="chronicle_threads"
          className="profile-drawer-content mt-8 min-w-0"
          data-drawer-variant={drawerEntranceVariantName}
        >
          <ChronicleThreadsSection
            investigatorProfileLedger={investigatorProfileLedger}
            continuationSelection={continuationSelection}
            onContinuationSelected={markContinuationSelection}
          />
        </Tabs.Content>
      </Tabs.Root>
    </main>
  )
}

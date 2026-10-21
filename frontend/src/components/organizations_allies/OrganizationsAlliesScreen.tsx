import { Buildings, Graph, UsersThree, UserFocus } from '@phosphor-icons/react'
import { Tabs } from 'radix-ui'
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { chooseAnimationVariantName } from '../../animation/animation_variety'
import { useInteractionFeedback } from '../../audio/interaction_feedback'
import { organizationsAlliesCopy } from '../../copy/organizations_allies_copy'
import {
  buildKnownRelationshipBoard,
  oicnauBondDefinitions,
  resolveKnownLighthouseExperience,
} from '../../demonstration/organizations_allies_data'
import type { FactionIdentifier, RelationshipNetworkNode } from '../../demonstration/organizations_allies_data'
import { readInvestigatorShortName, useChronicleState } from '../../game_state/chronicle_state'
import { PresentationTitleCard } from '../PresentationTitleCard'
import { CaseArchiveRelationships, readCaseRelationshipPeople } from './CaseArchiveRelationships'
import { CellBoardSection } from './CellBoardSection'
import { ContactsBoardSection } from './ContactsBoardSection'
import { FactionsBoardSection } from './FactionsBoardSection'
import { areLighthouseExperiencesEqual, readOrganizationsAlliesRecord } from './organizations_allies_record'
import type { OrganizationsAlliesRecord, RelationshipBoardSectionName } from './organizations_allies_record'
import { RelationshipNetworkSection } from './RelationshipNetworkSection'


const maximumContactNoteLength = 600
const boardSpotlightVariantNames = ['sweeping_left_to_right', 'descending_diagonal', 'widening_lamp_cone', 'returning_right_to_left'] as const

export function OrganizationsAlliesScreen() {
  const { chronicleState, changeChronicleState } = useChronicleState()
  const playInteractionFeedback = useInteractionFeedback()
  const [isPresentationVisible, setIsPresentationVisible] = useState(true)
  const [selectedFactionIdentifier, setSelectedFactionIdentifier] = useState<FactionIdentifier>('oicnau')
  const [selectedContactIdentifier, setSelectedContactIdentifier] = useState<string | null>(null)
  const [boardSpotlightVariantName, setBoardSpotlightVariantName] = useState(() =>
    chooseAnimationVariantName('factions_board_spotlight', boardSpotlightVariantNames),
  )

  const organizationsAlliesRecord = useMemo(
    () => readOrganizationsAlliesRecord(chronicleState.moduleRecords.organizations_allies),
    [chronicleState.moduleRecords.organizations_allies],
  )
  const investigatorShortName = readInvestigatorShortName(chronicleState.investigatorRegistration)
  const knownRelationshipBoard = useMemo(
    () =>
      buildKnownRelationshipBoard(
        chronicleState,
        organizationsAlliesRecord.rememberedLighthouseExperience,
        organizationsAlliesCopy.network.investigatorNodeCaption,
      ),
    [chronicleState, organizationsAlliesRecord.rememberedLighthouseExperience],
  )

  const saveOrganizationsAlliesRecord = (changedFields: Partial<OrganizationsAlliesRecord>) => {
    changeChronicleState({
      kind: 'module_record_saved',
      moduleName: 'organizations_allies',
      moduleRecord: { ...organizationsAlliesRecord, ...changedFields },
    })
  }

  const currentLighthouseExperience = resolveKnownLighthouseExperience(
    chronicleState,
    organizationsAlliesRecord.rememberedLighthouseExperience,
  )

  useEffect(() => {
    if (
      currentLighthouseExperience !== null &&
      !areLighthouseExperiencesEqual(currentLighthouseExperience, organizationsAlliesRecord.rememberedLighthouseExperience)
    ) {
      changeChronicleState({
        kind: 'module_record_saved',
        moduleName: 'organizations_allies',
        moduleRecord: { ...organizationsAlliesRecord, rememberedLighthouseExperience: currentLighthouseExperience },
      })
    }
  }, [currentLighthouseExperience, organizationsAlliesRecord, changeChronicleState])

  if (isPresentationVisible) {
    return (
      <PresentationTitleCard
        chapterLabel={organizationsAlliesCopy.presentation.chapterLabel}
        chapterTitle={organizationsAlliesCopy.presentation.chapterTitle}
        detailLine={
          chronicleState.oicnauStance
            ? organizationsAlliesCopy.presentation.detailLineWithBond(
                oicnauBondDefinitions[chronicleState.oicnauStance].bondName.toLowerCase(),
              )
            : organizationsAlliesCopy.presentation.detailLineWithoutBond
        }
        onPresentationFinished={() => setIsPresentationVisible(false)}
      />
    )
  }

  const sectionEntries: Array<{ sectionName: RelationshipBoardSectionName; label: string; icon: ReactNode; count: number | null }> = [
    {
      sectionName: 'factions',
      label: organizationsAlliesCopy.sections.factions,
      icon: <Buildings size={18} weight="fill" aria-hidden="true" />,
      count: knownRelationshipBoard.factions.length,
    },
    {
      sectionName: 'contacts',
      label: organizationsAlliesCopy.sections.contacts,
      icon: <UsersThree size={18} weight="fill" aria-hidden="true" />,
      count: knownRelationshipBoard.contacts.length + readCaseRelationshipPeople(chronicleState.archiveRun).length,
    },
    {
      sectionName: 'cell',
      label: organizationsAlliesCopy.sections.cell,
      icon: <UserFocus size={18} weight="fill" aria-hidden="true" />,
      count: 0,
    },
    {
      sectionName: 'network',
      label: organizationsAlliesCopy.sections.network,
      icon: <Graph size={18} weight="fill" aria-hidden="true" />,
      count: null,
    },
  ]

  const visitSection = (sectionName: RelationshipBoardSectionName) => {
    setBoardSpotlightVariantName(chooseAnimationVariantName('factions_board_spotlight', boardSpotlightVariantNames))
    saveOrganizationsAlliesRecord({ lastVisitedSectionName: sectionName })
  }

  const openCaseCardOfNetworkNode = (networkNode: RelationshipNetworkNode) => {
    if (networkNode.kind === 'faction' && networkNode.factionIdentifier) {
      setSelectedFactionIdentifier(networkNode.factionIdentifier)
      visitSection('factions')
    }
    if (networkNode.kind === 'contact') {
      setSelectedContactIdentifier(networkNode.identifier)
      visitSection('contacts')
    }
  }

  return (
    <main id="main-content" className="factions-board mx-auto w-full max-w-6xl px-4 pt-6 pb-20 sm:px-8">
      <span
        key={`${organizationsAlliesRecord.lastVisitedSectionName}-${boardSpotlightVariantName}`}
        className="factions-board-spotlight"
        data-spotlight-variant={boardSpotlightVariantName}
        aria-hidden="true"
      />
      <header className="min-w-0">
        <p className="dossier-label entrance-from-left">{organizationsAlliesCopy.header.boardLabel}</p>
        <h1 className="display-title entrance-from-left text-4xl [overflow-wrap:anywhere] sm:text-5xl">
          {organizationsAlliesCopy.header.title}
        </h1>
        <p className="mt-2 max-w-[68ch] text-[0.9375rem] text-paper-text">
          {organizationsAlliesCopy.header.introduction(investigatorShortName)}
        </p>
        <p className="mt-1 max-w-[68ch] text-sm text-paper-muted">{organizationsAlliesCopy.header.betweenArchivesNotice}</p>
      </header>

      <Tabs.Root
        value={organizationsAlliesRecord.lastVisitedSectionName}
        onValueChange={(newSectionName) => {
          playInteractionFeedback('rising_whoosh')
          const visitedSectionEntry = sectionEntries.find((sectionEntry) => sectionEntry.sectionName === newSectionName)
          if (visitedSectionEntry) {
            visitSection(visitedSectionEntry.sectionName)
          }
        }}
        className="mt-6 min-w-0"
      >
        <Tabs.List
          className="grid min-w-0 grid-cols-[repeat(2,minmax(0,1fr))] gap-2 sm:grid-cols-[repeat(4,minmax(0,1fr))]"
          aria-label={organizationsAlliesCopy.sections.navigationLabel}
        >
          {sectionEntries.map((sectionEntry) => (
            <Tabs.Trigger
              key={sectionEntry.sectionName}
              value={sectionEntry.sectionName}
              className="factions-section-tab"
              onPointerEnter={(pointerEvent) => {
                if (pointerEvent.pointerType === 'mouse') {
                  playInteractionFeedback('option_hover')
                }
              }}
            >
              {sectionEntry.icon}
              <span className="min-w-0 [overflow-wrap:anywhere]">{sectionEntry.label}</span>
              {sectionEntry.count !== null ? (
                <span className="factions-section-tab-count" aria-label={organizationsAlliesCopy.sections.countLabel(sectionEntry.count)}>
                  {sectionEntry.count}
                </span>
              ) : null}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="factions" className="mt-8 min-w-0">
          <FactionsBoardSection
            knownFactions={knownRelationshipBoard.factions}
            oicnauStance={chronicleState.oicnauStance}
            investigatorShortName={investigatorShortName}
            selectedFactionIdentifier={selectedFactionIdentifier}
            onFactionSelected={setSelectedFactionIdentifier}
            acknowledgedPostureSignalIdentifiersByFactionIdentifier={
              organizationsAlliesRecord.acknowledgedPostureSignalIdentifiersByFactionIdentifier
            }
            onPostureSignalsAcknowledged={(factionIdentifier, signalIdentifiers) =>
              saveOrganizationsAlliesRecord({
                acknowledgedPostureSignalIdentifiersByFactionIdentifier: {
                  ...organizationsAlliesRecord.acknowledgedPostureSignalIdentifiersByFactionIdentifier,
                  [factionIdentifier]: signalIdentifiers,
                },
              })
            }
          />
        </Tabs.Content>
        <Tabs.Content value="contacts" className="mt-8 min-w-0">
          <CaseArchiveRelationships
            archiveRun={chronicleState.archiveRun}
            investigatorShortName={investigatorShortName}
          />
          <ContactsBoardSection
            knownContacts={knownRelationshipBoard.contacts}
            knownFactions={knownRelationshipBoard.factions}
            investigatorShortName={investigatorShortName}
            hasDeclaredNoRelationalAnchor={chronicleState.investigatorRegistration?.relationalAnchor.kind === 'uprooted'}
            selectedContactIdentifier={selectedContactIdentifier}
            onContactSelected={setSelectedContactIdentifier}
            playerNotesByContactIdentifier={organizationsAlliesRecord.playerNotesByContactIdentifier}
            onPlayerNoteSaved={(contactIdentifier, noteText) => {
              const playerNotesByContactIdentifier = { ...organizationsAlliesRecord.playerNotesByContactIdentifier }
              if (noteText.length > 0) {
                playerNotesByContactIdentifier[contactIdentifier] = Array.from(noteText).slice(0, maximumContactNoteLength).join('')
              } else {
                delete playerNotesByContactIdentifier[contactIdentifier]
              }
              saveOrganizationsAlliesRecord({ playerNotesByContactIdentifier })
            }}
            acknowledgedRelationshipLevelsByContactIdentifier={
              organizationsAlliesRecord.acknowledgedRelationshipLevelsByContactIdentifier
            }
            onRelationshipLevelsAcknowledged={(contactIdentifier, acknowledgedLevels) =>
              saveOrganizationsAlliesRecord({
                acknowledgedRelationshipLevelsByContactIdentifier: {
                  ...organizationsAlliesRecord.acknowledgedRelationshipLevelsByContactIdentifier,
                  [contactIdentifier]: acknowledgedLevels,
                },
              })
            }
          />
        </Tabs.Content>
        <Tabs.Content value="cell" className="mt-8 min-w-0">
          <CellBoardSection knownContacts={knownRelationshipBoard.contacts} investigatorShortName={investigatorShortName} />
        </Tabs.Content>
        <Tabs.Content value="network" className="mt-8 min-w-0">
          <RelationshipNetworkSection
            networkNodes={knownRelationshipBoard.networkNodes}
            networkLinks={knownRelationshipBoard.networkLinks}
            knownContacts={knownRelationshipBoard.contacts}
            preferredNetworkViewName={organizationsAlliesRecord.preferredNetworkViewName}
            onNetworkViewPreferred={(networkViewName) =>
              saveOrganizationsAlliesRecord({ preferredNetworkViewName: networkViewName })
            }
            onCaseCardRequested={openCaseCardOfNetworkNode}
          />
        </Tabs.Content>
      </Tabs.Root>
    </main>
  )
}

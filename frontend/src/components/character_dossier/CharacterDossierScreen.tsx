import { Backpack, ChartLineUp, Coins, FolderOpen, Heartbeat, IdentificationCard, LockSimple } from '@phosphor-icons/react'
import { Tabs } from 'radix-ui'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { chooseAnimationVariantName } from '../../animation/animation_variety'
import { useInteractionFeedback } from '../../audio/interaction_feedback'
import { characterDossierCopy } from '../../copy/character_dossier_copy'
import { dossierRecordSerialPrefix } from '../../demonstration/character_dossier_data'
import { demonstrationArchive } from '../../demonstration/demonstration_case_script'
import { formatWorldClock, useChronicleState } from '../../game_state/chronicle_state'
import { PresentationTitleCard } from '../PresentationTitleCard'
import { DossierAttributesSheet } from './DossierAttributesSheet'
import { DossierBelongingsSheet } from './DossierBelongingsSheet'
import { DossierConditionSheet } from './DossierConditionSheet'
import { DossierFundsSheet } from './DossierFundsSheet'
import { DossierIdentitySheet } from './DossierIdentitySheet'
import { DossierStamp } from './DossierSheetParts'
import { dossierSheetNames, isDossierSheetName, readDossierViewPreferences } from './dossier_view_preferences'
import type { BelongingsViewMode, DossierSheetName, DossierViewPreferences } from './dossier_view_preferences'

const tabSettleVariantNames = ['settling_bounce', 'settling_tilt', 'settling_press'] as const

const sheetIconBySheetName: Record<DossierSheetName, ReactNode> = {
  identity: <IdentificationCard size={20} weight="fill" aria-hidden="true" />,
  attributes: <ChartLineUp size={20} weight="fill" aria-hidden="true" />,
  belongings: <Backpack size={20} weight="fill" aria-hidden="true" />,
  funds: <Coins size={20} weight="fill" aria-hidden="true" />,
  condition: <Heartbeat size={20} weight="fill" aria-hidden="true" />,
}

function composeRecordSerialNumber(identitySeedText: string): string {
  let accumulatedValue = 7
  for (const seedCharacter of identitySeedText) {
    accumulatedValue = (accumulatedValue * 31 + (seedCharacter.codePointAt(0) ?? 0)) % 100000
  }
  return `${dossierRecordSerialPrefix}-${String(accumulatedValue).padStart(5, '0')}`
}

export function CharacterDossierScreen() {
  const { chronicleState, changeChronicleState } = useChronicleState()
  const playInteractionFeedback = useInteractionFeedback()
  const folderCopy = characterDossierCopy.folder
  const [isPresentationCardVisible, setIsPresentationCardVisible] = useState(true)
  const dossierViewPreferences = readDossierViewPreferences(chronicleState.moduleRecords.character_dossier)
  const [openedSheetName, setOpenedSheetName] = useState<DossierSheetName>(dossierViewPreferences.lastOpenedSheetName)
  const [tabSettleVariantName, setTabSettleVariantName] = useState<(typeof tabSettleVariantNames)[number]>(
    tabSettleVariantNames[0],
  )
  const [hasIdentityTypingSettled, setHasIdentityTypingSettled] = useState(false)
  const tabListElement = useRef<HTMLDivElement>(null)
  const tabScrollTimeoutIdentifier = useRef(0)
  const hasOpenArchive = chronicleState.chosenWhisperIdentifier !== null
  const investigatorRegistration = chronicleState.investigatorRegistration

  const saveDossierViewPreferences = (changedPreferences: Partial<DossierViewPreferences>) => {
    changeChronicleState({
      kind: 'module_record_saved',
      moduleName: 'character_dossier',
      moduleRecord: { ...dossierViewPreferences, ...changedPreferences },
    })
  }

  const openSheet = (requestedSheetName: DossierSheetName) => {
    if (requestedSheetName === openedSheetName) {
      return
    }
    playInteractionFeedback('panel_open')
    if (openedSheetName === 'identity') {
      setHasIdentityTypingSettled(true)
    }
    setTabSettleVariantName(chooseAnimationVariantName('dossier_tab_settle', tabSettleVariantNames))
    setOpenedSheetName(requestedSheetName)
    saveDossierViewPreferences({ lastOpenedSheetName: requestedSheetName })
    window.clearTimeout(tabScrollTimeoutIdentifier.current)
    tabScrollTimeoutIdentifier.current = window.setTimeout(() => {
      tabListElement.current
        ?.querySelector<HTMLElement>('[data-state="active"]')
        ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }, 0)
  }

  useEffect(() => {
    const timeoutIdentifierHolder = tabScrollTimeoutIdentifier
    return () => window.clearTimeout(timeoutIdentifierHolder.current)
  }, [])

  const latestOpenSheet = useRef(openSheet)
  useEffect(() => {
    latestOpenSheet.current = openSheet
  })

  useEffect(() => {
    if (isPresentationCardVisible) {
      return
    }
    const openSheetByNumberKey = (keyboardEvent: KeyboardEvent) => {
      const eventTarget = keyboardEvent.target
      const isTypingIntoField =
        eventTarget instanceof HTMLElement &&
        (eventTarget.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(eventTarget.tagName))
      if (
        isTypingIntoField ||
        keyboardEvent.altKey ||
        keyboardEvent.ctrlKey ||
        keyboardEvent.metaKey ||
        document.querySelector('[role="dialog"]')
      ) {
        return
      }
      const requestedSheetName = dossierSheetNames[Number(keyboardEvent.key) - 1]
      if (requestedSheetName) {
        latestOpenSheet.current(requestedSheetName)
      }
    }
    window.addEventListener('keydown', openSheetByNumberKey)
    return () => window.removeEventListener('keydown', openSheetByNumberKey)
  }, [isPresentationCardVisible])

  if (isPresentationCardVisible) {
    return (
      <PresentationTitleCard
        chapterLabel={characterDossierCopy.presentationCard.chapterLabel}
        chapterTitle={characterDossierCopy.presentationCard.chapterTitle}
        detailLine={characterDossierCopy.presentationCard.detailLine}
        onPresentationFinished={() => setIsPresentationCardVisible(false)}
      />
    )
  }

  const recordSerialNumber = composeRecordSerialNumber(
    investigatorRegistration
      ? `${investigatorRegistration.fullName}${investigatorRegistration.birthDate.year}${investigatorRegistration.birthDate.month}${investigatorRegistration.birthDate.day}`
      : '',
  )

  return (
    <main id="main-content" className="dossier-screen mx-auto w-full max-w-5xl px-4 pt-20 pb-16 sm:px-8">
      <h1 className="visually-hidden-text">{characterDossierCopy.screenTitle}</h1>
      <div className="dossier-folder">
        <header className="dossier-folder-cover">
          <div className="dossier-folder-cover-identity">
            <p className="dossier-folder-cover-serial">
              <FolderOpen size={16} weight="fill" aria-hidden="true" />
              {folderCopy.recordNumberLabel} {recordSerialNumber}
            </p>
            <p className="display-title dossier-folder-cover-name">
              {investigatorRegistration?.fullName.trim() || folderCopy.unnamedInvestigator}
            </p>
            <p className="dossier-folder-cover-notice">
              {hasOpenArchive
                ? folderCopy.insideArchiveNotice(
                    demonstrationArchive.archiveTitle,
                    chronicleState.investigator.placeName,
                    formatWorldClock(chronicleState.investigator.worldClockMinutes),
                  )
                : folderCopy.outsideArchiveNotice}
            </p>
          </div>
          <div className="dossier-folder-cover-stamp">
            <DossierStamp stampText={folderCopy.confidentialStamp} stampTone="ink" />
          </div>
        </header>

        <Tabs.Root
          value={openedSheetName}
          onValueChange={(requestedValue) => {
            if (isDossierSheetName(requestedValue)) {
              openSheet(requestedValue)
            }
          }}
        >
          <Tabs.List ref={tabListElement} className="dossier-folder-tabs" aria-label={folderCopy.tabListLabel}>
            {dossierSheetNames.map((sheetName, sheetIndex) => (
              <Tabs.Trigger
                key={sheetName}
                value={sheetName}
                className="dossier-folder-tab"
                data-settle-variant={tabSettleVariantName}
                onPointerEnter={(pointerEvent) => {
                  if (pointerEvent.pointerType === 'mouse' && sheetName !== openedSheetName) {
                    playInteractionFeedback('option_hover')
                  }
                }}
              >
                <span className="dossier-folder-tab-number" aria-hidden="true">
                  {sheetIndex + 1}
                </span>
                {sheetIconBySheetName[sheetName]}
                {characterDossierCopy.sheetNames[sheetName]}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <div className="dossier-folder-body">
            <Tabs.Content value="identity" className="dossier-folder-content">
              <DossierIdentitySheet
                investigatorRegistration={investigatorRegistration}
                level={chronicleState.investigatorProgression.level}
                isTypingWanted={!hasIdentityTypingSettled}
                onTypingSettled={() => setHasIdentityTypingSettled(true)}
              />
            </Tabs.Content>
            <Tabs.Content value="attributes" className="dossier-folder-content">
              <DossierAttributesSheet
                investigatorAttributes={chronicleState.investigatorAttributes}
                investigatorProgression={chronicleState.investigatorProgression}
                sceneEffortRemaining={hasOpenArchive ? chronicleState.archiveRun.effortRemaining : null}
              />
            </Tabs.Content>
            <Tabs.Content value="belongings" className="dossier-folder-content">
              <DossierBelongingsSheet
                investigator={chronicleState.investigator}
                hasOpenArchive={hasOpenArchive}
                belongingsViewMode={dossierViewPreferences.belongingsViewMode}
                onBelongingsViewModeChosen={(belongingsViewMode: BelongingsViewMode) =>
                  saveDossierViewPreferences({ belongingsViewMode })
                }
              />
            </Tabs.Content>
            <Tabs.Content value="funds" className="dossier-folder-content">
              <DossierFundsSheet chronicleState={chronicleState} />
            </Tabs.Content>
            <Tabs.Content value="condition" className="dossier-folder-content">
              <DossierConditionSheet
                seriousWoundsSuffered={chronicleState.investigator.seriousWoundsSuffered}
                hasOpenArchive={hasOpenArchive}
                lastSeriousWoundCauseText={chronicleState.archiveRun.lastSeriousWoundCauseText}
                activeConditions={chronicleState.archiveRun.activeConditions}
              />
            </Tabs.Content>
          </div>
        </Tabs.Root>

        <p className="dossier-folder-read-only-notice">
          <LockSimple size={16} weight="fill" aria-hidden="true" />
          {folderCopy.readOnlyNotice}
        </p>
      </div>
    </main>
  )
}

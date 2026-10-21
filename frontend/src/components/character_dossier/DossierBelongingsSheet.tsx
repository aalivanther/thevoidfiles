import { Backpack, HandGrabbing, Package, Rows, SquaresFour, StackSimple } from '@phosphor-icons/react'
import { ToggleGroup } from 'radix-ui'
import { useEffect, useMemo, useRef } from 'react'
import { useInteractionFeedback } from '../../audio/interaction_feedback'
import { characterDossierCopy } from '../../copy/character_dossier_copy'
import type { BelongingPlacement } from '../../demonstration/sanctuary_home_data'
import { useChronicleState } from '../../game_state/chronicle_state'
import type { InvestigatorState } from '../../game_state/chronicle_state'
import {
  composeBelongingPiles,
  evaluateBelongingMove,
  listCarriedPersonalBelongingIdentifiers,
} from '../sanctuary_home/belongings_arrangement'
import type { BelongingMoveEvaluation } from '../sanctuary_home/belongings_arrangement'
import { readSanctuaryHomeRecord } from '../sanctuary_home/sanctuary_home_record'
import type { SanctuaryHomeRecord } from '../sanctuary_home/sanctuary_home_record'
import { BelongingsBoard } from './belongings_board/BelongingsBoard'
import type { BelongingsBoardContainerGroup } from './belongings_board/BelongingsBoard'
import { DossierSheetFrame } from './DossierSheetParts'
import { isBelongingsViewMode } from './dossier_view_preferences'
import type { BelongingsViewMode } from './dossier_view_preferences'

export function DossierBelongingsSheet({
  investigator,
  hasOpenArchive,
  belongingsViewMode,
  onBelongingsViewModeChosen,
}: {
  investigator: InvestigatorState
  hasOpenArchive: boolean
  belongingsViewMode: BelongingsViewMode
  onBelongingsViewModeChosen: (belongingsViewMode: BelongingsViewMode) => void
}) {
  const belongingsCopy = characterDossierCopy.belongings
  const playInteractionFeedback = useInteractionFeedback()
  const { chronicleState, changeChronicleState } = useChronicleState()
  const sanctuaryHomeRecord = useMemo(
    () => readSanctuaryHomeRecord(chronicleState.moduleRecords.sanctuary_home),
    [chronicleState.moduleRecords.sanctuary_home],
  )
  const latestSanctuaryHomeRecord = useRef<SanctuaryHomeRecord>(sanctuaryHomeRecord)
  useEffect(() => {
    latestSanctuaryHomeRecord.current = sanctuaryHomeRecord
  }, [sanctuaryHomeRecord])

  const missionBelongingUnits = hasOpenArchive ? investigator.belongingUnits : null
  const belongingPiles = composeBelongingPiles(
    sanctuaryHomeRecord.belongingArrangement,
    missionBelongingUnits,
    chronicleState.archiveRun.belongingDefinitions,
  )

  const commitBelongingMove = (
    pileIdentifier: string,
    destinationPlacement: BelongingPlacement,
    requestedUnitCount: number | null,
  ): BelongingMoveEvaluation => {
    const moveEvaluation = evaluateBelongingMove({
      belongingArrangement: latestSanctuaryHomeRecord.current.belongingArrangement,
      missionBelongingUnits,
      pileIdentifier,
      destinationPlacement,
      requestedUnitCount,
      isHomeWithinReach: false,
    })
    if (moveEvaluation.kind === 'moved') {
      const changedRecord: SanctuaryHomeRecord = {
        ...latestSanctuaryHomeRecord.current,
        belongingArrangement: moveEvaluation.changedArrangement,
        belongingIdentifiersCarriedOnNextMission: listCarriedPersonalBelongingIdentifiers(moveEvaluation.changedArrangement),
      }
      latestSanctuaryHomeRecord.current = changedRecord
      changeChronicleState({ kind: 'module_record_saved', moduleName: 'sanctuary_home', moduleRecord: changedRecord })
    }
    return moveEvaluation
  }

  const containerGroups: BelongingsBoardContainerGroup[] = [
    {
      groupIdentifier: 'carried',
      groupTitle: belongingsCopy.carriedSectionTitle,
      groupNote: belongingsCopy.carriedSectionNote,
      containers: [
        { placement: 'at_hand', icon: <HandGrabbing size={20} weight="fill" aria-hidden="true" />, isLocked: false },
        { placement: 'in_bag', icon: <Backpack size={20} weight="fill" aria-hidden="true" />, isLocked: false },
      ],
    },
    {
      groupIdentifier: 'stored',
      groupTitle: belongingsCopy.storedSectionTitle,
      groupNote: belongingsCopy.storedSectionNote,
      containers: [
        { placement: 'home_shelf', icon: <StackSimple size={20} weight="fill" aria-hidden="true" />, isLocked: true },
        { placement: 'home_trunk', icon: <Package size={20} weight="fill" aria-hidden="true" />, isLocked: true },
      ],
    },
  ]

  return (
    <DossierSheetFrame sheetName="belongings" sheetTone="dark" sheetTitle={belongingsCopy.sheetTitle}>
      <ToggleGroup.Root
        type="single"
        className="dossier-view-mode-toggle"
        aria-label={belongingsCopy.viewModeLabel}
        value={belongingsViewMode}
        onValueChange={(chosenValue) => {
          if (isBelongingsViewMode(chosenValue) && chosenValue !== belongingsViewMode) {
            playInteractionFeedback('option_click')
            onBelongingsViewModeChosen(chosenValue)
          }
        }}
      >
        <ToggleGroup.Item value="list" className="dossier-view-mode-toggle-item">
          <Rows size={18} weight="bold" aria-hidden="true" />
          {belongingsCopy.listViewLabel}
        </ToggleGroup.Item>
        <ToggleGroup.Item value="cards" className="dossier-view-mode-toggle-item">
          <SquaresFour size={18} weight="bold" aria-hidden="true" />
          {belongingsCopy.cardsViewLabel}
        </ToggleGroup.Item>
      </ToggleGroup.Root>

      <BelongingsBoard
        boardLabel={belongingsCopy.boardLabel}
        containerGroups={containerGroups}
        belongingPiles={belongingPiles}
        isMissionEquipmentPresent={hasOpenArchive}
        viewMode={belongingsViewMode}
        outOfReachRejectionText={belongingsCopy.outOfReachRejection}
        previewBelongingMove={(pileIdentifier, destinationPlacement) =>
          evaluateBelongingMove({
            belongingArrangement: sanctuaryHomeRecord.belongingArrangement,
            missionBelongingUnits,
            pileIdentifier,
            destinationPlacement,
            requestedUnitCount: null,
            isHomeWithinReach: false,
          })
        }
        commitBelongingMove={commitBelongingMove}
      />
    </DossierSheetFrame>
  )
}

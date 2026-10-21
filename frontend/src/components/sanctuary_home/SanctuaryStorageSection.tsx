import { Backpack, HandGrabbing, Package, StackSimple, Wrench } from '@phosphor-icons/react'
import { sanctuaryHomeCopy } from '../../copy/sanctuary_home_copy'
import type { BelongingPlacement } from '../../demonstration/sanctuary_home_data'
import { BelongingsBoard } from '../character_dossier/belongings_board/BelongingsBoard'
import type { BelongingsBoardContainerGroup } from '../character_dossier/belongings_board/BelongingsBoard'
import { composeBelongingPiles } from './belongings_arrangement'
import type {
  BelongingArrangement,
  BelongingMoveEvaluation,
  LiveBelongingDefinitions,
  MissionBelongingUnits,
} from './belongings_arrangement'
import type { HouseRegisterKitLine } from './house_register_reading'

type SanctuaryStorageSectionProperties = {
  belongingArrangement: BelongingArrangement
  missionBelongingUnits: MissionBelongingUnits | null
  liveBelongingDefinitions: LiveBelongingDefinitions | null
  carriedKit: HouseRegisterKitLine[]
  blockedActionMessage: string | null
  onBelongingMovePreviewed: (pileIdentifier: string, destinationPlacement: BelongingPlacement) => BelongingMoveEvaluation
  onBelongingMoveCommitted: (
    pileIdentifier: string,
    destinationPlacement: BelongingPlacement,
    requestedUnitCount: number | null,
  ) => BelongingMoveEvaluation
}

export function SanctuaryStorageSection({
  belongingArrangement,
  missionBelongingUnits,
  liveBelongingDefinitions,
  carriedKit,
  blockedActionMessage,
  onBelongingMovePreviewed,
  onBelongingMoveCommitted,
}: SanctuaryStorageSectionProperties) {
  const storageCopy = sanctuaryHomeCopy.storage
  const belongingPiles = composeBelongingPiles(belongingArrangement, missionBelongingUnits, liveBelongingDefinitions)

  const containerGroups: BelongingsBoardContainerGroup[] = [
    {
      groupIdentifier: 'home',
      groupTitle: storageCopy.stayingAtHomeTitle,
      groupNote: storageCopy.stayingAtHomeNote,
      containers: [
        { placement: 'home_shelf', icon: <StackSimple size={20} weight="fill" aria-hidden="true" />, isLocked: false },
        { placement: 'home_trunk', icon: <Package size={20} weight="fill" aria-hidden="true" />, isLocked: false },
      ],
    },
    {
      groupIdentifier: 'carried',
      groupTitle: missionBelongingUnits ? storageCopy.carriedRightNowTitle : storageCopy.carriedOnNextMissionTitle,
      groupNote: missionBelongingUnits ? storageCopy.carriedRightNowNote : storageCopy.carriedOnNextMissionNote,
      containers: [
        { placement: 'at_hand', icon: <HandGrabbing size={20} weight="fill" aria-hidden="true" />, isLocked: false },
        { placement: 'in_bag', icon: <Backpack size={20} weight="fill" aria-hidden="true" />, isLocked: false },
      ],
    },
  ]

  return (
    <section aria-labelledby="sanctuary-storage-title">
      <h2 id="sanctuary-storage-title" className="display-title text-2xl">
        {storageCopy.title}
      </h2>
      <p className="mt-1 max-w-[68ch] text-sm text-paper-muted">{storageCopy.description}</p>
      <section className="comic-panel mt-4 p-4" aria-labelledby="sanctuary-register-kit-title">
        <h3 id="sanctuary-register-kit-title" className="dossier-label">
          {storageCopy.registerKitTitle}
        </h3>
        {carriedKit.length > 0 ? (
          <ul className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-1">
            {carriedKit.map((kitLine) => (
              <li key={kitLine.belongingIdentifier} className="text-sm [overflow-wrap:anywhere]">
                {storageCopy.registerKitLine(kitLine.visibleName, kitLine.units)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-paper-muted">{storageCopy.registerKitEmpty}</p>
        )}
      </section>

      <div className="mt-5">
        <BelongingsBoard
          boardLabel={storageCopy.boardLabel}
          containerGroups={containerGroups}
          belongingPiles={belongingPiles}
          isMissionEquipmentPresent={missionBelongingUnits !== null}
          viewMode="cards"
          outOfReachRejectionText={blockedActionMessage ?? storageCopy.outOfReachRejection}
          previewBelongingMove={onBelongingMovePreviewed}
          commitBelongingMove={onBelongingMoveCommitted}
        />
      </div>

      <p className="mt-5 flex max-w-[68ch] items-start gap-2 text-sm text-paper-muted">
        <Wrench size={18} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
        {storageCopy.repairReminder}
      </p>
    </section>
  )
}

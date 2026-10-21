import { sanctuaryHomeCopy } from '../../copy/sanctuary_home_copy'
import { carriedBelongingDetails, missionBelongingCarryingTraits } from '../../demonstration/character_dossier_data'
import type { BelongingRecordDetail } from '../../demonstration/character_dossier_data'
import { belongingDefinitions, initialInvestigatorState, readBelongingVisibleName } from '../../demonstration/demonstration_case_script'
import type { BelongingIdentifier } from '../../demonstration/demonstration_case_script'
import {
  belongingContainerDefinitions,
  belongingPlacements,
  storedBelongingDefinitions,
} from '../../demonstration/sanctuary_home_data'
import type {
  BelongingPlacement,
  CarriedBelongingPlacement,
  StoredBelongingDefinition,
} from '../../demonstration/sanctuary_home_data'

export type PersonalBelongingUnitsByPlacement = Partial<Record<BelongingPlacement, number>>

export type BelongingArrangement = {
  personalUnitsByPlacement: Record<string, PersonalBelongingUnitsByPlacement>
  missionPlacements: Record<BelongingIdentifier, CarriedBelongingPlacement>
}

export type MissionBelongingUnits = Record<string, number>

export type LiveBelongingDefinitions = Record<string, { visibleName: string; visibleUnitDescription?: string }>

export type BelongingPile = {
  pileIdentifier: string
  belongingIdentifier: string
  belongingOrigin: 'personal' | 'mission'
  placement: BelongingPlacement
  visibleName: string
  quantity: number
  visibleUnitDescription: string
  bulk: number
  isConsumable: boolean
  consumedQuantity: number
  isInGoodCondition: boolean
  detail: BelongingRecordDetail
}

export type BelongingContainerLoad = {
  placement: BelongingPlacement
  capacityMeasure: 'pieces' | 'bulk'
  capacity: number
  occupiedAmount: number
  reservedAmount: number
  freeAmount: number
  isFull: boolean
  isOverloaded: boolean
}

export type BelongingMoveRejectionReason = 'destination_full' | 'place_out_of_reach' | 'unknown_pile'

export type BelongingMoveEvaluation =
  | { kind: 'moved'; changedArrangement: BelongingArrangement; destinationPileIdentifier: string; movedBulk: number }
  | { kind: 'unchanged' }
  | { kind: 'rejected'; rejectionReason: BelongingMoveRejectionReason }

const missionBelongingIdentifiers = Object.keys(belongingDefinitions) as BelongingIdentifier[]

export const bulkReservedForMissionEquipment = missionBelongingIdentifiers.reduce(
  (reservedBulk, belongingIdentifier) => reservedBulk + missionBelongingCarryingTraits[belongingIdentifier].bulk,
  0,
)

export function composePileIdentifier(belongingIdentifier: string, placement: BelongingPlacement): string {
  return `${belongingIdentifier}@${placement}`
}

export function isCarriedBelongingPlacement(placement: BelongingPlacement): placement is CarriedBelongingPlacement {
  return placement === 'at_hand' || placement === 'in_bag'
}

export function isBelongingPlacement(candidate: unknown): candidate is BelongingPlacement {
  return typeof candidate === 'string' && (belongingPlacements as readonly string[]).includes(candidate)
}

function createDefaultMissionPlacements(): Record<BelongingIdentifier, CarriedBelongingPlacement> {
  return { signal_flare: 'in_bag', hand_lantern: 'in_bag', sealed_evidence_bag: 'in_bag' }
}

export function createDefaultBelongingArrangement(): BelongingArrangement {
  const personalUnitsByPlacement: Record<string, PersonalBelongingUnitsByPlacement> = {}
  for (const storedBelongingDefinition of storedBelongingDefinitions) {
    personalUnitsByPlacement[storedBelongingDefinition.identifier] = {
      [storedBelongingDefinition.initialPlacement]: storedBelongingDefinition.units,
    }
  }
  return { personalUnitsByPlacement, missionPlacements: createDefaultMissionPlacements() }
}

function composePersonalPile(
  storedBelongingDefinition: StoredBelongingDefinition,
  placement: BelongingPlacement,
  quantity: number,
): BelongingPile {
  return {
    pileIdentifier: composePileIdentifier(storedBelongingDefinition.identifier, placement),
    belongingIdentifier: storedBelongingDefinition.identifier,
    belongingOrigin: 'personal',
    placement,
    visibleName: storedBelongingDefinition.visibleName,
    quantity,
    visibleUnitDescription: storedBelongingDefinition.visibleUnitDescription,
    bulk: storedBelongingDefinition.bulk,
    isConsumable: storedBelongingDefinition.isConsumable,
    consumedQuantity: 0,
    isInGoodCondition: storedBelongingDefinition.isInGoodCondition,
    detail: {
      visibleKind: storedBelongingDefinition.visibleKind,
      visibleDescription: storedBelongingDefinition.visibleDescription,
      visibleState: storedBelongingDefinition.conditionDescription,
      knownUses: storedBelongingDefinition.knownUses,
      limits: storedBelongingDefinition.limits,
      visibleProvenance: storedBelongingDefinition.visibleProvenance,
      referenceValue: storedBelongingDefinition.referenceValue,
    },
  }
}

function composeRegisterKitPile(belongingIdentifier: string, quantity: number, liveBelongingDefinitions: LiveBelongingDefinitions | null): BelongingPile {
  const storageCopy = sanctuaryHomeCopy.storage
  return {
    pileIdentifier: composePileIdentifier(belongingIdentifier, 'at_hand'),
    belongingIdentifier,
    belongingOrigin: 'mission',
    placement: 'at_hand',
    visibleName: readBelongingVisibleName(belongingIdentifier, liveBelongingDefinitions),
    quantity,
    visibleUnitDescription: liveBelongingDefinitions?.[belongingIdentifier]?.visibleUnitDescription || storageCopy.registerKitUnit,
    bulk: 0,
    isConsumable: false,
    consumedQuantity: 0,
    isInGoodCondition: true,
    detail: {
      visibleKind: storageCopy.registerKitKind,
      visibleDescription: storageCopy.registerKitDescription,
      visibleState: storageCopy.registerKitState,
      knownUses: [storageCopy.registerKitUse],
      limits: [storageCopy.registerKitLimit],
      visibleProvenance: storageCopy.registerKitProvenance,
      referenceValue: 0,
    },
  }
}

export function composeBelongingPiles(
  belongingArrangement: BelongingArrangement,
  missionBelongingUnits: MissionBelongingUnits | null,
  liveBelongingDefinitions: LiveBelongingDefinitions | null = null,
): BelongingPile[] {
  const belongingPiles: BelongingPile[] = []
  if (missionBelongingUnits) {
    for (const belongingIdentifier of missionBelongingIdentifiers) {
      const quantity = missionBelongingUnits[belongingIdentifier] ?? 0
      const placement = belongingArrangement.missionPlacements[belongingIdentifier]
      belongingPiles.push({
        pileIdentifier: composePileIdentifier(belongingIdentifier, placement),
        belongingIdentifier,
        belongingOrigin: 'mission',
        placement,
        visibleName: readBelongingVisibleName(belongingIdentifier, liveBelongingDefinitions),
        quantity,
        visibleUnitDescription:
          liveBelongingDefinitions?.[belongingIdentifier]?.visibleUnitDescription ||
          belongingDefinitions[belongingIdentifier].visibleUnitDescription,
        bulk: quantity > 0 ? missionBelongingCarryingTraits[belongingIdentifier].bulk : 0,
        isConsumable: missionBelongingCarryingTraits[belongingIdentifier].isConsumable,
        consumedQuantity: Math.max(0, (initialInvestigatorState.belongingUnits[belongingIdentifier] ?? 0) - quantity),
        isInGoodCondition: true,
        detail: carriedBelongingDetails[belongingIdentifier],
      })
    }
    for (const belongingIdentifier of Object.keys(missionBelongingUnits)) {
      if (missionBelongingIdentifiers.includes(belongingIdentifier as BelongingIdentifier)) {
        continue
      }
      const quantity = missionBelongingUnits[belongingIdentifier] ?? 0
      if (quantity > 0) {
        belongingPiles.push(composeRegisterKitPile(belongingIdentifier, quantity, liveBelongingDefinitions))
      }
    }
  }
  for (const storedBelongingDefinition of storedBelongingDefinitions) {
    const unitsByPlacement = belongingArrangement.personalUnitsByPlacement[storedBelongingDefinition.identifier] ?? {}
    for (const placement of belongingPlacements) {
      const quantity = unitsByPlacement[placement] ?? 0
      if (quantity > 0) {
        belongingPiles.push(composePersonalPile(storedBelongingDefinition, placement, quantity))
      }
    }
  }
  return belongingPiles
}

export function calculateBelongingContainerLoad(
  belongingPiles: BelongingPile[],
  placement: BelongingPlacement,
  isMissionEquipmentPresent: boolean,
): BelongingContainerLoad {
  const containerDefinition = belongingContainerDefinitions[placement]
  const pilesInContainer = belongingPiles.filter((belongingPile) => belongingPile.placement === placement)
  const occupiedAmount =
    containerDefinition.capacityMeasure === 'pieces'
      ? pilesInContainer.filter((belongingPile) => belongingPile.bulk > 0).length
      : pilesInContainer.reduce((occupiedBulk, belongingPile) => occupiedBulk + belongingPile.bulk, 0)
  const reservedAmount = placement === 'in_bag' && !isMissionEquipmentPresent ? bulkReservedForMissionEquipment : 0
  const freeAmount = containerDefinition.capacity - occupiedAmount - reservedAmount
  return {
    placement,
    capacityMeasure: containerDefinition.capacityMeasure,
    capacity: containerDefinition.capacity,
    occupiedAmount,
    reservedAmount,
    freeAmount: Math.max(0, freeAmount),
    isFull: freeAmount <= 0,
    isOverloaded: freeAmount < 0,
  }
}

function isArrangementWithinEveryCapacity(
  belongingArrangement: BelongingArrangement,
  missionBelongingUnits: MissionBelongingUnits | null,
): boolean {
  const belongingPiles = composeBelongingPiles(belongingArrangement, missionBelongingUnits)
  return belongingPlacements.every(
    (placement) => !calculateBelongingContainerLoad(belongingPiles, placement, missionBelongingUnits !== null).isOverloaded,
  )
}

export function evaluateBelongingMove({
  belongingArrangement,
  missionBelongingUnits,
  pileIdentifier,
  destinationPlacement,
  requestedUnitCount,
  isHomeWithinReach,
}: {
  belongingArrangement: BelongingArrangement
  missionBelongingUnits: MissionBelongingUnits | null
  pileIdentifier: string
  destinationPlacement: BelongingPlacement
  requestedUnitCount: number | null
  isHomeWithinReach: boolean
}): BelongingMoveEvaluation {
  const belongingPiles = composeBelongingPiles(belongingArrangement, missionBelongingUnits)
  const movedPile = belongingPiles.find((belongingPile) => belongingPile.pileIdentifier === pileIdentifier)
  if (!movedPile) {
    return { kind: 'rejected', rejectionReason: 'unknown_pile' }
  }
  if (movedPile.placement === destinationPlacement) {
    return { kind: 'unchanged' }
  }
  const doesMoveTouchHome = !isCarriedBelongingPlacement(movedPile.placement) || !isCarriedBelongingPlacement(destinationPlacement)
  if (doesMoveTouchHome && (!isHomeWithinReach || movedPile.belongingOrigin === 'mission')) {
    return { kind: 'rejected', rejectionReason: 'place_out_of_reach' }
  }

  let changedArrangement: BelongingArrangement
  if (movedPile.belongingOrigin === 'mission') {
    if (
      !isCarriedBelongingPlacement(destinationPlacement) ||
      !missionBelongingIdentifiers.includes(movedPile.belongingIdentifier as BelongingIdentifier)
    ) {
      return { kind: 'rejected', rejectionReason: 'place_out_of_reach' }
    }
    changedArrangement = {
      ...belongingArrangement,
      missionPlacements: {
        ...belongingArrangement.missionPlacements,
        [movedPile.belongingIdentifier as BelongingIdentifier]: destinationPlacement,
      },
    }
  } else {
    const movedUnitCount =
      movedPile.isConsumable && requestedUnitCount !== null && Number.isInteger(requestedUnitCount)
        ? Math.min(movedPile.quantity, Math.max(1, requestedUnitCount))
        : movedPile.quantity
    const previousUnitsByPlacement = belongingArrangement.personalUnitsByPlacement[movedPile.belongingIdentifier] ?? {}
    const changedUnitsByPlacement: PersonalBelongingUnitsByPlacement = {
      ...previousUnitsByPlacement,
      [movedPile.placement]: movedPile.quantity - movedUnitCount,
      [destinationPlacement]: (previousUnitsByPlacement[destinationPlacement] ?? 0) + movedUnitCount,
    }
    changedArrangement = {
      ...belongingArrangement,
      personalUnitsByPlacement: {
        ...belongingArrangement.personalUnitsByPlacement,
        [movedPile.belongingIdentifier]: changedUnitsByPlacement,
      },
    }
  }

  const changedPiles = composeBelongingPiles(changedArrangement, missionBelongingUnits)
  const isMissionEquipmentPresent = missionBelongingUnits !== null
  const previousDestinationLoad = calculateBelongingContainerLoad(belongingPiles, destinationPlacement, isMissionEquipmentPresent)
  const changedDestinationLoad = calculateBelongingContainerLoad(changedPiles, destinationPlacement, isMissionEquipmentPresent)
  if (changedDestinationLoad.isOverloaded && changedDestinationLoad.occupiedAmount > previousDestinationLoad.occupiedAmount) {
    return { kind: 'rejected', rejectionReason: 'destination_full' }
  }
  return {
    kind: 'moved',
    changedArrangement,
    destinationPileIdentifier: composePileIdentifier(movedPile.belongingIdentifier, destinationPlacement),
    movedBulk: movedPile.bulk,
  }
}

function isPlainObject(candidate: unknown): candidate is Record<string, unknown> {
  return typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate)
}

function readPersonalUnitsByPlacement(
  candidate: unknown,
  storedBelongingDefinition: StoredBelongingDefinition,
): PersonalBelongingUnitsByPlacement | null {
  if (!isPlainObject(candidate)) {
    return null
  }
  const unitsByPlacement: PersonalBelongingUnitsByPlacement = {}
  let countedUnits = 0
  for (const placement of belongingPlacements) {
    const possibleUnits = candidate[placement]
    if (possibleUnits === undefined) {
      continue
    }
    if (typeof possibleUnits !== 'number' || !Number.isInteger(possibleUnits) || possibleUnits < 0) {
      return null
    }
    if (possibleUnits > 0) {
      unitsByPlacement[placement] = possibleUnits
      countedUnits += possibleUnits
    }
  }
  const isSplitAllowed = storedBelongingDefinition.isConsumable || Object.keys(unitsByPlacement).length <= 1
  return countedUnits === storedBelongingDefinition.units && isSplitAllowed ? unitsByPlacement : null
}

export function readBelongingArrangement(candidate: unknown, legacyCarriedBelongingIdentifiers: string[]): BelongingArrangement {
  const defaultArrangement = createDefaultBelongingArrangement()
  if (!isPlainObject(candidate)) {
    const migratedArrangement: BelongingArrangement = {
      ...defaultArrangement,
      personalUnitsByPlacement: { ...defaultArrangement.personalUnitsByPlacement },
    }
    for (const storedBelongingDefinition of storedBelongingDefinitions) {
      if (legacyCarriedBelongingIdentifiers.includes(storedBelongingDefinition.identifier)) {
        const attemptedArrangement: BelongingArrangement = {
          ...migratedArrangement,
          personalUnitsByPlacement: {
            ...migratedArrangement.personalUnitsByPlacement,
            [storedBelongingDefinition.identifier]: { in_bag: storedBelongingDefinition.units },
          },
        }
        if (isArrangementWithinEveryCapacity(attemptedArrangement, null)) {
          migratedArrangement.personalUnitsByPlacement = attemptedArrangement.personalUnitsByPlacement
        }
      }
    }
    return migratedArrangement
  }
  const storedUnitsByIdentifier = isPlainObject(candidate.personalUnitsByPlacement) ? candidate.personalUnitsByPlacement : {}
  const personalUnitsByPlacement: Record<string, PersonalBelongingUnitsByPlacement> = {}
  for (const storedBelongingDefinition of storedBelongingDefinitions) {
    personalUnitsByPlacement[storedBelongingDefinition.identifier] =
      readPersonalUnitsByPlacement(storedUnitsByIdentifier[storedBelongingDefinition.identifier], storedBelongingDefinition) ??
      defaultArrangement.personalUnitsByPlacement[storedBelongingDefinition.identifier]
  }
  const storedMissionPlacements = isPlainObject(candidate.missionPlacements) ? candidate.missionPlacements : {}
  const missionPlacements = createDefaultMissionPlacements()
  for (const belongingIdentifier of missionBelongingIdentifiers) {
    const possiblePlacement = storedMissionPlacements[belongingIdentifier]
    if (possiblePlacement === 'at_hand' || possiblePlacement === 'in_bag') {
      missionPlacements[belongingIdentifier] = possiblePlacement
    }
  }
  const readArrangement: BelongingArrangement = { personalUnitsByPlacement, missionPlacements }
  return isArrangementWithinEveryCapacity({ ...readArrangement, missionPlacements: createDefaultMissionPlacements() }, null)
    ? readArrangement
    : defaultArrangement
}

export function listCarriedPersonalBelongingIdentifiers(belongingArrangement: BelongingArrangement): string[] {
  return storedBelongingDefinitions
    .filter((storedBelongingDefinition) => {
      const unitsByPlacement = belongingArrangement.personalUnitsByPlacement[storedBelongingDefinition.identifier] ?? {}
      return (unitsByPlacement.at_hand ?? 0) + (unitsByPlacement.in_bag ?? 0) > 0
    })
    .map((storedBelongingDefinition) => storedBelongingDefinition.identifier)
}

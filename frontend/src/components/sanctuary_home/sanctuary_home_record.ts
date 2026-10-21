import {
  demonstrationConstructionMillisecondsPerDowntimeDay,
  sanctuaryUpgradeDefinitions,
  storedBelongingDefinitions,
} from '../../demonstration/sanctuary_home_data'
import type { SanctuaryUpgradeDefinition } from '../../demonstration/sanctuary_home_data'
import {
  createDefaultBelongingArrangement,
  listCarriedPersonalBelongingIdentifiers,
  readBelongingArrangement,
} from './belongings_arrangement'
import type { BelongingArrangement } from './belongings_arrangement'

export const maximumNoteTitleLength = 60
export const maximumNoteBodyLength = 1200
export const maximumNoteTagLength = 20
export const maximumNoteTagCount = 5
export const maximumNoteCount = 40

export type PurchasedSanctuaryUpgrade = {
  upgradeIdentifier: string
  paidPersonalFunds: number
  purchasedAtTimestamp: number
}

export type PersonalNote = {
  identifier: string
  titleText: string
  bodyText: string
  tagNames: string[]
  isPinned: boolean
  lastEditedTimestamp: number
}

export type SanctuaryHomeRecord = {
  recordFormatVersion: 1
  purchasedUpgrades: PurchasedSanctuaryUpgrade[]
  belongingIdentifiersCarriedOnNextMission: string[]
  belongingArrangement: BelongingArrangement
  personalNotes: PersonalNote[]
  createdNoteCount: number
}

export function createEmptySanctuaryHomeRecord(): SanctuaryHomeRecord {
  return {
    recordFormatVersion: 1,
    purchasedUpgrades: [],
    belongingIdentifiersCarriedOnNextMission: [],
    belongingArrangement: createDefaultBelongingArrangement(),
    personalNotes: [],
    createdNoteCount: 0,
  }
}

function isPlainObject(candidate: unknown): candidate is Record<string, unknown> {
  return typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate)
}

function isFiniteNonNegativeNumber(candidate: unknown): candidate is number {
  return typeof candidate === 'number' && Number.isFinite(candidate) && candidate >= 0
}

function readPurchasedUpgrades(candidate: unknown): PurchasedSanctuaryUpgrade[] {
  if (!Array.isArray(candidate)) {
    return []
  }
  const knownUpgradeIdentifiers = new Set(sanctuaryUpgradeDefinitions.map((upgradeDefinition) => upgradeDefinition.identifier))
  const alreadyReadIdentifiers = new Set<string>()
  const purchasedUpgrades: PurchasedSanctuaryUpgrade[] = []
  for (const possiblePurchase of candidate) {
    if (
      isPlainObject(possiblePurchase) &&
      typeof possiblePurchase.upgradeIdentifier === 'string' &&
      knownUpgradeIdentifiers.has(possiblePurchase.upgradeIdentifier) &&
      !alreadyReadIdentifiers.has(possiblePurchase.upgradeIdentifier) &&
      isFiniteNonNegativeNumber(possiblePurchase.paidPersonalFunds) &&
      isFiniteNonNegativeNumber(possiblePurchase.purchasedAtTimestamp)
    ) {
      alreadyReadIdentifiers.add(possiblePurchase.upgradeIdentifier)
      purchasedUpgrades.push({
        upgradeIdentifier: possiblePurchase.upgradeIdentifier,
        paidPersonalFunds: possiblePurchase.paidPersonalFunds,
        purchasedAtTimestamp: possiblePurchase.purchasedAtTimestamp,
      })
    }
  }
  return purchasedUpgrades
}

function readCarriedBelongingIdentifiers(candidate: unknown): string[] {
  if (!Array.isArray(candidate)) {
    return []
  }
  const knownBelongingIdentifiers = new Set(
    storedBelongingDefinitions.map((storedBelongingDefinition) => storedBelongingDefinition.identifier),
  )
  return [
    ...new Set(
      candidate.filter(
        (possibleIdentifier): possibleIdentifier is string =>
          typeof possibleIdentifier === 'string' && knownBelongingIdentifiers.has(possibleIdentifier),
      ),
    ),
  ]
}

export function normalizeNoteTagName(rawTagName: string): string {
  return rawTagName.replace(/[#,]/g, ' ').replace(/\s+/g, ' ').trim().toLocaleLowerCase('es').slice(0, maximumNoteTagLength)
}

function readPersonalNotes(candidate: unknown): PersonalNote[] {
  if (!Array.isArray(candidate)) {
    return []
  }
  const alreadyReadIdentifiers = new Set<string>()
  const personalNotes: PersonalNote[] = []
  for (const possibleNote of candidate.slice(0, maximumNoteCount)) {
    if (
      isPlainObject(possibleNote) &&
      typeof possibleNote.identifier === 'string' &&
      possibleNote.identifier.length > 0 &&
      !alreadyReadIdentifiers.has(possibleNote.identifier) &&
      typeof possibleNote.titleText === 'string' &&
      typeof possibleNote.bodyText === 'string'
    ) {
      alreadyReadIdentifiers.add(possibleNote.identifier)
      const tagNames = Array.isArray(possibleNote.tagNames)
        ? [
            ...new Set(
              possibleNote.tagNames
                .filter((possibleTagName): possibleTagName is string => typeof possibleTagName === 'string')
                .map(normalizeNoteTagName)
                .filter((tagName) => tagName.length > 0),
            ),
          ].slice(0, maximumNoteTagCount)
        : []
      personalNotes.push({
        identifier: possibleNote.identifier,
        titleText: possibleNote.titleText.slice(0, maximumNoteTitleLength),
        bodyText: possibleNote.bodyText.slice(0, maximumNoteBodyLength),
        tagNames,
        isPinned: possibleNote.isPinned === true,
        lastEditedTimestamp: isFiniteNonNegativeNumber(possibleNote.lastEditedTimestamp)
          ? possibleNote.lastEditedTimestamp
          : 0,
      })
    }
  }
  return personalNotes
}

export function readSanctuaryHomeRecord(candidate: unknown): SanctuaryHomeRecord {
  if (!isPlainObject(candidate) || candidate.recordFormatVersion !== 1) {
    return createEmptySanctuaryHomeRecord()
  }
  const personalNotes = readPersonalNotes(candidate.personalNotes)
  const belongingArrangement = readBelongingArrangement(
    candidate.belongingArrangement,
    readCarriedBelongingIdentifiers(candidate.belongingIdentifiersCarriedOnNextMission),
  )
  return {
    recordFormatVersion: 1,
    purchasedUpgrades: readPurchasedUpgrades(candidate.purchasedUpgrades),
    belongingIdentifiersCarriedOnNextMission: listCarriedPersonalBelongingIdentifiers(belongingArrangement),
    belongingArrangement,
    personalNotes,
    createdNoteCount: Math.max(
      personalNotes.length,
      isFiniteNonNegativeNumber(candidate.createdNoteCount) ? Math.floor(candidate.createdNoteCount) : 0,
    ),
  }
}

export function calculatePersonalFundsSpentOnSanctuary(sanctuaryHomeRecord: SanctuaryHomeRecord): number {
  return sanctuaryHomeRecord.purchasedUpgrades.reduce(
    (spentPersonalFunds, purchasedUpgrade) => spentPersonalFunds + purchasedUpgrade.paidPersonalFunds,
    0,
  )
}

export function calculateConstructionMilliseconds(upgradeDefinition: SanctuaryUpgradeDefinition): number {
  return upgradeDefinition.downtimeDays * demonstrationConstructionMillisecondsPerDowntimeDay
}

export function calculateConstructionProgress(
  upgradeDefinition: SanctuaryUpgradeDefinition,
  purchasedUpgrade: PurchasedSanctuaryUpgrade,
  currentTimestamp: number,
): number {
  const elapsedMilliseconds = currentTimestamp - purchasedUpgrade.purchasedAtTimestamp
  return Math.min(1, Math.max(0, elapsedMilliseconds / calculateConstructionMilliseconds(upgradeDefinition)))
}

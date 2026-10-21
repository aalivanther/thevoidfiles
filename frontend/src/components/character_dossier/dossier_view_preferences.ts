export const dossierSheetNames = ['identity', 'attributes', 'belongings', 'funds', 'condition'] as const

export type DossierSheetName = (typeof dossierSheetNames)[number]

export type BelongingsViewMode = 'list' | 'cards'

export type DossierViewPreferences = {
  lastOpenedSheetName: DossierSheetName
  belongingsViewMode: BelongingsViewMode
}

export const defaultDossierViewPreferences: DossierViewPreferences = {
  lastOpenedSheetName: 'identity',
  belongingsViewMode: 'list',
}

export function isDossierSheetName(candidate: unknown): candidate is DossierSheetName {
  return typeof candidate === 'string' && (dossierSheetNames as readonly string[]).includes(candidate)
}

export function isBelongingsViewMode(candidate: unknown): candidate is BelongingsViewMode {
  return candidate === 'list' || candidate === 'cards'
}

export function readDossierViewPreferences(storedModuleRecord: unknown): DossierViewPreferences {
  if (typeof storedModuleRecord !== 'object' || storedModuleRecord === null) {
    return defaultDossierViewPreferences
  }
  const possiblePreferences = storedModuleRecord as Record<string, unknown>
  return {
    lastOpenedSheetName: isDossierSheetName(possiblePreferences.lastOpenedSheetName)
      ? possiblePreferences.lastOpenedSheetName
      : defaultDossierViewPreferences.lastOpenedSheetName,
    belongingsViewMode: isBelongingsViewMode(possiblePreferences.belongingsViewMode)
      ? possiblePreferences.belongingsViewMode
      : defaultDossierViewPreferences.belongingsViewMode,
  }
}

import type { SuggestedActionGroupName, SuggestedInvestigatorAction } from '../../../game_state/archive_turn_contract'

export const suggestedActionGroupNamesInOrder: readonly SuggestedActionGroupName[] = [
  'speak',
  'examine',
  'use_or_spend',
  'move',
  'withdraw',
]

export const highestSuggestionNumberWithKey = 9
export const visibleSuggestionCapacityOnNarrowScreens = 4
export const visibleSuggestionCapacityOnWideScreens = 5
export const wideScreenMediaQueryText = '(min-width: 768px)'

const exitGroupNames: readonly SuggestedActionGroupName[] = ['move', 'withdraw']
const visibleSlotCountReservedForExits = 1
const groupNameWhenLeadingVerbIsUnknown: SuggestedActionGroupName = 'use_or_spend'

const leadingSpanishVerbsByGroupName: Record<SuggestedActionGroupName, readonly string[]> = {
  speak: [
    'hablar',
    'preguntar',
    'pedir',
    'decir',
    'contar',
    'contestar',
    'responder',
    'llamar',
    'escuchar',
    'despedir',
    'saludar',
    'interrogar',
    'convencer',
    'amenazar',
    'mentir',
    'gritar',
    'susurrar',
    'negociar',
    'avisar',
    'advertir',
    'explicar',
    'confesar',
    'prometer',
    'rogar',
    'sentar',
    'consolar',
    'presentar',
  ],
  examine: [
    'examinar',
    'revisar',
    'leer',
    'mirar',
    'observar',
    'inspeccionar',
    'buscar',
    'registrar',
    'fotografiar',
    'comprobar',
    'estudiar',
    'comparar',
    'esperar',
    'oler',
    'tocar',
    'medir',
    'vigilar',
    'investigar',
    'rastrear',
    'analizar',
    'recordar',
    'pensar',
    'poner',
    'quedar',
    'rodear',
    'espiar',
    'seguir',
  ],
  use_or_spend: [
    'usar',
    'pagar',
    'encender',
    'gastar',
    'forzar',
    'abrir',
    'guardar',
    'montar',
    'tapar',
    'llevar',
    'escribir',
    'completar',
    'romper',
    'cerrar',
    'apagar',
    'comprar',
    'sobornar',
    'disparar',
    'atacar',
    'golpear',
    'cortar',
    'armar',
    'reparar',
    'beber',
    'curar',
    'vendar',
    'dar',
    'entregar',
    'apoyar',
    'recoger',
    'empunar',
  ],
  move: [
    'ir',
    'caminar',
    'subir',
    'bajar',
    'entrar',
    'salir',
    'volver',
    'regresar',
    'cruzar',
    'avanzar',
    'correr',
    'acercar',
    'alejar',
    'trepar',
    'saltar',
    'tomar',
    'empujar',
    'descender',
    'pasar',
  ],
  withdraw: ['retirar', 'huir', 'abandonar', 'escapar', 'rendir', 'marchar', 'redactar', 'desistir', 'evacuar'],
}

const groupNameByLeadingSpanishVerb = new Map<string, SuggestedActionGroupName>(
  suggestedActionGroupNamesInOrder.flatMap((groupName) =>
    leadingSpanishVerbsByGroupName[groupName].map((spanishVerb): [string, SuggestedActionGroupName] => [spanishVerb, groupName]),
  ),
)

function readLeadingSpanishVerb(visibleText: string): string {
  const foldedText = visibleText
    .normalize('NFD')
    .replace(/[̀-ͯ]/gu, '')
    .toLowerCase()
  const leadingWord = /[a-z]+/u.exec(foldedText)?.[0] ?? ''
  const verbWithoutPronoun = /^([a-z]*[aei]r)(?:se|les|le|los|las|lo|la|me|nos|selo|sela)$/u.exec(leadingWord)
  return verbWithoutPronoun ? verbWithoutPronoun[1] : leadingWord
}

export function deriveSuggestedActionGroupNameFromVisibleText(visibleText: string): SuggestedActionGroupName {
  return groupNameByLeadingSpanishVerb.get(readLeadingSpanishVerb(visibleText)) ?? groupNameWhenLeadingVerbIsUnknown
}

export function readSuggestedActionGroupName(suggestedAction: SuggestedInvestigatorAction): SuggestedActionGroupName {
  const declaredGroupName = suggestedAction.actionGroupName
  if (declaredGroupName && suggestedActionGroupNamesInOrder.includes(declaredGroupName)) {
    return declaredGroupName
  }
  return deriveSuggestedActionGroupNameFromVisibleText(suggestedAction.visibleText)
}

export type ArrangedSuggestedAction = {
  suggestedAction: SuggestedInvestigatorAction
  suggestionNumber: number
  hasNumberKey: boolean
  groupName: SuggestedActionGroupName
  isExit: boolean
  isInPlan: boolean
  canAfford: boolean
  hasBeenAttemptedBefore: boolean
}

export type SuggestedActionDrawerGroup = {
  groupName: SuggestedActionGroupName
  arrangedActions: ArrangedSuggestedAction[]
}

export type SuggestedActionArrangement = {
  visibleCourseActions: ArrangedSuggestedAction[]
  visibleExitActions: ArrangedSuggestedAction[]
  drawerGroups: SuggestedActionDrawerGroup[]
  drawerActionCount: number
}

export type SuggestedActionArrangementRequest = {
  suggestedActions: SuggestedInvestigatorAction[]
  suggestedActionIdentifiersInPlan: ReadonlySet<string>
  canAffordSuggestedAction: (suggestedAction: SuggestedInvestigatorAction) => boolean
  visibleSuggestionCapacity: number
}

function compareArrangedActions(firstAction: ArrangedSuggestedAction, secondAction: ArrangedSuggestedAction): number {
  const groupDistance =
    suggestedActionGroupNamesInOrder.indexOf(firstAction.groupName) - suggestedActionGroupNamesInOrder.indexOf(secondAction.groupName)
  if (groupDistance !== 0) {
    return groupDistance
  }
  if (firstAction.canAfford !== secondAction.canAfford) {
    return firstAction.canAfford ? -1 : 1
  }
  return firstAction.suggestionNumber - secondAction.suggestionNumber
}

export function arrangeSuggestedActions({
  suggestedActions,
  suggestedActionIdentifiersInPlan,
  canAffordSuggestedAction,
  visibleSuggestionCapacity,
}: SuggestedActionArrangementRequest): SuggestedActionArrangement {
  const arrangedActionsInOrder = suggestedActions
    .map((suggestedAction, actionIndex): ArrangedSuggestedAction => {
      const groupName = readSuggestedActionGroupName(suggestedAction)
      const suggestionNumber = actionIndex + 1
      return {
        suggestedAction,
        suggestionNumber,
        hasNumberKey: suggestionNumber <= highestSuggestionNumberWithKey,
        groupName,
        isExit: exitGroupNames.includes(groupName),
        isInPlan: suggestedActionIdentifiersInPlan.has(suggestedAction.identifier),
        canAfford: canAffordSuggestedAction(suggestedAction),
        hasBeenAttemptedBefore: suggestedAction.hasBeenAttemptedBefore === true,
      }
    })
    .sort(compareArrangedActions)

  const actionsPinnedByPlan = arrangedActionsInOrder.filter((arrangedAction) => arrangedAction.isInPlan)
  const actionsFreeToPlace = arrangedActionsInOrder.filter(
    (arrangedAction) => !arrangedAction.isInPlan && !arrangedAction.hasBeenAttemptedBefore,
  )
  const courseActionsFreeToPlace = actionsFreeToPlace.filter((arrangedAction) => !arrangedAction.isExit)
  const exitActionsFreeToPlace = actionsFreeToPlace.filter((arrangedAction) => arrangedAction.isExit)
  const freeVisibleSlotCount = Math.max(0, visibleSuggestionCapacity - actionsPinnedByPlan.length)
  const slotCountHeldForExits = Math.min(exitActionsFreeToPlace.length, visibleSlotCountReservedForExits, freeVisibleSlotCount)
  const visibleCourseCount = Math.min(courseActionsFreeToPlace.length, freeVisibleSlotCount - slotCountHeldForExits)
  const visibleExitCount = Math.min(exitActionsFreeToPlace.length, freeVisibleSlotCount - visibleCourseCount)
  const visibleActionIdentifiers = new Set(
    [
      ...actionsPinnedByPlan,
      ...courseActionsFreeToPlace.slice(0, visibleCourseCount),
      ...exitActionsFreeToPlace.slice(0, visibleExitCount),
    ].map((arrangedAction) => arrangedAction.suggestedAction.identifier),
  )
  const visibleActions = arrangedActionsInOrder.filter((arrangedAction) =>
    visibleActionIdentifiers.has(arrangedAction.suggestedAction.identifier),
  )
  const drawerActions = arrangedActionsInOrder.filter(
    (arrangedAction) => !visibleActionIdentifiers.has(arrangedAction.suggestedAction.identifier),
  )
  return {
    visibleCourseActions: visibleActions.filter((arrangedAction) => !arrangedAction.isExit),
    visibleExitActions: visibleActions.filter((arrangedAction) => arrangedAction.isExit),
    drawerGroups: suggestedActionGroupNamesInOrder
      .map((groupName) => ({
        groupName,
        arrangedActions: drawerActions
          .filter((arrangedAction) => arrangedAction.groupName === groupName)
          .sort(
            (firstAction, secondAction) =>
              Number(firstAction.hasBeenAttemptedBefore) - Number(secondAction.hasBeenAttemptedBefore) ||
              compareArrangedActions(firstAction, secondAction),
          ),
      }))
      .filter((drawerGroup) => drawerGroup.arrangedActions.length > 0),
    drawerActionCount: drawerActions.length,
  }
}

export function createSuggestionSetSignature(suggestedActions: SuggestedInvestigatorAction[]): string {
  return suggestedActions
    .map((suggestedAction) => `${suggestedAction.identifier}:${suggestedAction.hasBeenAttemptedBefore === true ? 'again' : 'first'}`)
    .join('|')
}

type RememberedSuggestionSets = {
  currentSignature: string
  currentSuggestedActions: SuggestedInvestigatorAction[]
  previousSuggestedActions: SuggestedInvestigatorAction[]
}

let rememberedSuggestionSets: RememberedSuggestionSets = {
  currentSignature: '',
  currentSuggestedActions: [],
  previousSuggestedActions: [],
}

const minimumSharedActionCountToKeepTheSameScene = 2

export function readSuggestedActionsConsumedLastTurn(suggestedActions: SuggestedInvestigatorAction[]): SuggestedInvestigatorAction[] {
  const suggestionSetSignature = createSuggestionSetSignature(suggestedActions)
  if (suggestionSetSignature !== rememberedSuggestionSets.currentSignature) {
    rememberedSuggestionSets = {
      currentSignature: suggestionSetSignature,
      currentSuggestedActions: suggestedActions,
      previousSuggestedActions: rememberedSuggestionSets.currentSuggestedActions,
    }
  }
  const currentIdentifiers = new Set(suggestedActions.map((suggestedAction) => suggestedAction.identifier))
  const previousSuggestedActions = rememberedSuggestionSets.previousSuggestedActions
  const sharedActionCount = previousSuggestedActions.filter((previousAction) => currentIdentifiers.has(previousAction.identifier)).length
  const isStillTheSameScene =
    sharedActionCount >= Math.min(minimumSharedActionCountToKeepTheSameScene, Math.max(1, previousSuggestedActions.length - 1))
  if (!isStillTheSameScene) {
    return []
  }
  return previousSuggestedActions.filter((previousAction) => !currentIdentifiers.has(previousAction.identifier))
}

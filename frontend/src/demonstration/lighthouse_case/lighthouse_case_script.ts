import type { InteractivePieceLifecycleStatusName } from '../../game_state/archive_turn_contract'
import { lighthouseCaseFlagNames, lighthouseCaseSceneIdentifiers } from './lighthouse_case_persons'
import { dawnPierScene, retreatWithRenataBranch } from './lighthouse_case_scene_dawn'
import { innerStaircaseScene } from './lighthouse_case_scene_inner_staircase'
import { keeperRoomScene } from './lighthouse_case_scene_keeper_room'
import { lanternRoomScene, outerGalleryScene } from './lighthouse_case_scene_lantern_room'
import { oldPierScene } from './lighthouse_case_scene_pier'
import { machineRoomScene, towerFootScene } from './lighthouse_case_scene_tower_foot'
import type { CaseActionBranch, CaseSceneDefinition } from './lighthouse_case_script_types'

export const lighthouseCaseWhisperIdentifier = 'lighthouse_counts_one_more'

export const lighthouseCaseFirstSceneIdentifier = lighthouseCaseSceneIdentifiers.oldPier

export const lighthouseCaseDawnWorldClockMinutes = 6 * 60 + 40

export const lighthouseCaseLastSpareTimeWorldClockMinutes = 4 * 60

export const lighthouseCaseEntropySignalStateVersions = { first: 10, second: 18 }

export const lighthouseCaseScenes: Record<string, CaseSceneDefinition> = {
  [oldPierScene.sceneIdentifier]: oldPierScene,
  [towerFootScene.sceneIdentifier]: towerFootScene,
  [machineRoomScene.sceneIdentifier]: machineRoomScene,
  [keeperRoomScene.sceneIdentifier]: keeperRoomScene,
  [innerStaircaseScene.sceneIdentifier]: innerStaircaseScene,
  [lanternRoomScene.sceneIdentifier]: lanternRoomScene,
  [outerGalleryScene.sceneIdentifier]: outerGalleryScene,
  [dawnPierScene.sceneIdentifier]: dawnPierScene,
}

export const resolutionFlagNames: readonly string[] = [
  lighthouseCaseFlagNames.resolutionByRepair,
  lighthouseCaseFlagNames.resolutionByOwnName,
  lighthouseCaseFlagNames.resolutionByForeignLight,
  lighthouseCaseFlagNames.resolutionByContainment,
  lighthouseCaseFlagNames.resolutionByRetreat,
]

export function readActionBranchesOfScene(sceneDefinition: CaseSceneDefinition): CaseActionBranch[] {
  if (sceneDefinition.sceneIdentifier === lighthouseCaseSceneIdentifiers.dawnPier) {
    return sceneDefinition.actionBranches
  }
  return [...sceneDefinition.actionBranches, retreatWithRenataBranch]
}

export const interactivePieceLifecycleStatusNamesOpenToAttempts: readonly InteractivePieceLifecycleStatusName[] = [
  'presented',
  'in_progress',
  'set_aside',
]

export function createSolvedInteractivePieceOriginIdentifier(interactivePieceIdentifier: string): string {
  return `solved_${interactivePieceIdentifier}`
}

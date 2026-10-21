import { chooseWeightedAnimationVariantName, forgetRecentAnimationVariantChoices } from '../../../animation/animation_variety'
import { requestSceneFlashPermission } from '../../../animation/scene_playback_clock'
import type { SceneTensionTierName } from '../../../game_state/archive_turn_contract'
import type { ScreenEffectsIntensity } from '../../../settings/player_settings'
import { stagingMomentCatalog } from './staging_moment_catalog'
import type { StagingVariantDefinition } from './staging_moment_catalog'

export type StagingMomentName =
  | 'director_wait_weighing'
  | 'director_wait_narrating'
  | 'consequence_receipt_entrance'
  | 'relationship_pulse_entrance'
  | 'attack_received'
  | 'attack_delivered'
  | 'critical_failure'
  | 'mental_attack'
  | 'anomaly_manifested'
  | 'scene_changed'
  | 'tension_rose'
  | 'physical_death'
  | 'psychological_death'

export type StagingIntensityName = 'sober' | 'marked' | 'strong'

export type PlayerStagingPreferences = {
  screenEffectsIntensity: ScreenEffectsIntensity
  shouldReduceMotion: boolean
  areUnsettlingApparitionsEnabled: boolean
}

export type StagingVariantChoice = {
  momentName: StagingMomentName
  variantName: string
  intensityName: StagingIntensityName
}

export const maximumScreenFlashesPerSecond = 2
export const maximumScreenShakeDistancePixels = 6
export const maximumScreenShakeDurationMilliseconds = 280
export const minimumTurnsBetweenScreenShakes = 2
export const maximumStrongStagingsPerTurn = 1
export const rememberedRecentVariantCountPerMoment = 2

const intensityRankByName: Record<StagingIntensityName, number> = { sober: 0, marked: 1, strong: 2 }
const highestIntensityRankBySceneTensionTierName: Record<SceneTensionTierName, number> = {
  calm: 0,
  uneasy: 1,
  threatening: 2,
  lethal: 2,
}
const flashCountingWindowMilliseconds = 1000
const turnNumberBeforeAnyStaging = -1000

let currentStagingTurnNumber = 0
let strongStagingCountInCurrentTurn = 0
let lastScreenShakeTurnNumber = turnNumberBeforeAnyStaging
let recentScreenFlashTimestamps: number[] = []
const lastUsedTurnNumberByVariantKey = new Map<string, number>()
const lastStrongerThanSoberTurnNumberByMomentName = new Map<StagingMomentName, number>()

function composeVariantKey(momentName: StagingMomentName, variantName: string): string {
  return `${momentName}/${variantName}`
}

function composeAnimationHistoryName(momentName: StagingMomentName): string {
  return `staging_moment/${momentName}`
}

function isDeathMoment(momentName: StagingMomentName): boolean {
  return momentName === 'physical_death' || momentName === 'psychological_death'
}

export function noteStagingTurnNumber(confirmedTurnNumber: number) {
  if (confirmedTurnNumber === currentStagingTurnNumber) {
    return
  }
  currentStagingTurnNumber = confirmedTurnNumber
  strongStagingCountInCurrentTurn = 0
}

export function requestScreenFlashPermission(currentTimestampMilliseconds: number): boolean {
  recentScreenFlashTimestamps = recentScreenFlashTimestamps.filter(
    (flashTimestamp) => currentTimestampMilliseconds - flashTimestamp < flashCountingWindowMilliseconds,
  )
  if (recentScreenFlashTimestamps.length >= maximumScreenFlashesPerSecond) {
    return false
  }
  if (!requestSceneFlashPermission(currentTimestampMilliseconds)) {
    return false
  }
  recentScreenFlashTimestamps.push(currentTimestampMilliseconds)
  return true
}

export function forgetStagingHistory() {
  currentStagingTurnNumber = 0
  strongStagingCountInCurrentTurn = 0
  lastScreenShakeTurnNumber = turnNumberBeforeAnyStaging
  recentScreenFlashTimestamps = []
  lastUsedTurnNumberByVariantKey.clear()
  lastStrongerThanSoberTurnNumberByMomentName.clear()
  for (const momentName of Object.keys(stagingMomentCatalog) as StagingMomentName[]) {
    forgetRecentAnimationVariantChoices(composeAnimationHistoryName(momentName))
  }
}

function resolveHighestAllowedIntensityRank(
  momentName: StagingMomentName,
  sceneTensionTierName: SceneTensionTierName,
  playerStagingPreferences: PlayerStagingPreferences,
): number {
  const momentDefinition = stagingMomentCatalog[momentName]
  if (playerStagingPreferences.shouldReduceMotion || playerStagingPreferences.screenEffectsIntensity === 'minimal') {
    return 0
  }
  let highestAllowedRank = momentDefinition.ignoresSceneTensionCeiling
    ? 2
    : highestIntensityRankBySceneTensionTierName[sceneTensionTierName]
  if (playerStagingPreferences.screenEffectsIntensity === 'softened') {
    highestAllowedRank = Math.max(0, highestAllowedRank - 1)
  }
  if (isDeathMoment(momentName)) {
    return playerStagingPreferences.screenEffectsIntensity === 'softened' ? 2 : highestAllowedRank
  }
  if (strongStagingCountInCurrentTurn >= maximumStrongStagingsPerTurn) {
    highestAllowedRank = Math.min(highestAllowedRank, 1)
  }
  const lastStrongerThanSoberTurnNumber = lastStrongerThanSoberTurnNumberByMomentName.get(momentName)
  if (
    lastStrongerThanSoberTurnNumber !== undefined &&
    momentDefinition.minimumTurnsBetweenStrongerThanSoberOccurrences > 0 &&
    currentStagingTurnNumber - lastStrongerThanSoberTurnNumber < momentDefinition.minimumTurnsBetweenStrongerThanSoberOccurrences
  ) {
    return 0
  }
  return highestAllowedRank
}

function isVariantAvailable(
  momentName: StagingMomentName,
  variantDefinition: StagingVariantDefinition,
  highestAllowedIntensityRank: number,
  playerStagingPreferences: PlayerStagingPreferences,
): boolean {
  if (variantDefinition.weight <= 0) {
    return false
  }
  if (intensityRankByName[variantDefinition.intensityName] > highestAllowedIntensityRank) {
    return false
  }
  if (variantDefinition.isUnsettlingApparition && !playerStagingPreferences.areUnsettlingApparitionsEnabled) {
    return false
  }
  if (
    variantDefinition.usesScreenShake &&
    !isDeathMoment(momentName) &&
    currentStagingTurnNumber - lastScreenShakeTurnNumber < minimumTurnsBetweenScreenShakes
  ) {
    return false
  }
  const lastUsedTurnNumber = lastUsedTurnNumberByVariantKey.get(composeVariantKey(momentName, variantDefinition.variantName))
  if (lastUsedTurnNumber === undefined || variantDefinition.cooldownTurnCount <= 0) {
    return true
  }
  return currentStagingTurnNumber - lastUsedTurnNumber > variantDefinition.cooldownTurnCount
}

export function chooseStagingVariant(
  momentName: StagingMomentName,
  sceneTensionTierName: SceneTensionTierName,
  playerStagingPreferences: PlayerStagingPreferences,
): StagingVariantChoice {
  const momentDefinition = stagingMomentCatalog[momentName]
  const highestAllowedIntensityRank = resolveHighestAllowedIntensityRank(
    momentName,
    sceneTensionTierName,
    playerStagingPreferences,
  )
  const availableVariants = momentDefinition.variants.filter((variantDefinition) =>
    isVariantAvailable(momentName, variantDefinition, highestAllowedIntensityRank, playerStagingPreferences),
  )
  if (highestAllowedIntensityRank === 0 || availableVariants.length === 0) {
    const soberVariants = availableVariants.filter((variantDefinition) => variantDefinition.intensityName === 'sober')
    const soberVariantName =
      soberVariants.length > 1
        ? chooseWeightedAnimationVariantName(
            composeAnimationHistoryName(momentName),
            soberVariants,
            Math.min(rememberedRecentVariantCountPerMoment, soberVariants.length - 1),
          )
        : momentDefinition.soberDefaultVariantName
    lastUsedTurnNumberByVariantKey.set(composeVariantKey(momentName, soberVariantName), currentStagingTurnNumber)
    return { momentName, variantName: soberVariantName, intensityName: 'sober' }
  }
  const chosenVariantName = chooseWeightedAnimationVariantName(
    composeAnimationHistoryName(momentName),
    availableVariants,
    Math.min(rememberedRecentVariantCountPerMoment, availableVariants.length - 1),
  )
  const chosenVariant =
    availableVariants.find((variantDefinition) => variantDefinition.variantName === chosenVariantName) ?? availableVariants[0]
  lastUsedTurnNumberByVariantKey.set(composeVariantKey(momentName, chosenVariant.variantName), currentStagingTurnNumber)
  if (chosenVariant.intensityName !== 'sober') {
    lastStrongerThanSoberTurnNumberByMomentName.set(momentName, currentStagingTurnNumber)
  }
  if (chosenVariant.intensityName === 'strong' && !isDeathMoment(momentName)) {
    strongStagingCountInCurrentTurn += 1
  }
  if (chosenVariant.usesScreenShake) {
    lastScreenShakeTurnNumber = currentStagingTurnNumber
  }
  return { momentName, variantName: chosenVariant.variantName, intensityName: chosenVariant.intensityName }
}

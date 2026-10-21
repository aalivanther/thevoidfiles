const lastChosenVariantIndexByAnimationName = new Map<string, number>()

export function chooseAnimationVariantIndex(animationName: string, variantCount: number): number {
  if (variantCount <= 1) {
    return 0
  }
  const previousVariantIndex = lastChosenVariantIndexByAnimationName.get(animationName)
  let chosenVariantIndex = Math.floor(Math.random() * variantCount)
  if (chosenVariantIndex === previousVariantIndex) {
    chosenVariantIndex = (chosenVariantIndex + 1 + Math.floor(Math.random() * (variantCount - 1))) % variantCount
  }
  lastChosenVariantIndexByAnimationName.set(animationName, chosenVariantIndex)
  return chosenVariantIndex
}

export function chooseAnimationVariantName<VariantName extends string>(
  animationName: string,
  variantNames: readonly VariantName[],
): VariantName {
  return variantNames[chooseAnimationVariantIndex(animationName, variantNames.length)]
}

export function randomNumberBetween(minimumValue: number, maximumValue: number): number {
  return minimumValue + Math.random() * (maximumValue - minimumValue)
}

export type WeightedAnimationVariant<VariantName extends string> = { variantName: VariantName; weight: number }

const recentlyChosenVariantNamesByAnimationName = new Map<string, string[]>()

export function chooseWeightedAnimationVariantName<VariantName extends string>(
  animationName: string,
  weightedVariants: ReadonlyArray<WeightedAnimationVariant<VariantName>>,
  rememberedRecentChoiceCount = 2,
): VariantName {
  const recentlyChosenVariantNames = recentlyChosenVariantNamesByAnimationName.get(animationName) ?? []
  const variantsNotChosenRecently = weightedVariants.filter(
    (weightedVariant) => weightedVariant.weight > 0 && !recentlyChosenVariantNames.includes(weightedVariant.variantName),
  )
  const candidateVariants = variantsNotChosenRecently.length > 0 ? variantsNotChosenRecently : weightedVariants
  const totalWeight = candidateVariants.reduce((runningWeight, candidate) => runningWeight + Math.max(0, candidate.weight), 0)
  let remainingWeight = Math.random() * totalWeight
  let chosenVariantName = candidateVariants[candidateVariants.length - 1].variantName
  for (const candidateVariant of candidateVariants) {
    remainingWeight -= Math.max(0, candidateVariant.weight)
    if (remainingWeight <= 0) {
      chosenVariantName = candidateVariant.variantName
      break
    }
  }
  recentlyChosenVariantNamesByAnimationName.set(
    animationName,
    rememberedRecentChoiceCount > 0
      ? [...recentlyChosenVariantNames, chosenVariantName].slice(-rememberedRecentChoiceCount)
      : [],
  )
  return chosenVariantName
}

export function forgetRecentAnimationVariantChoices(animationName: string) {
  recentlyChosenVariantNamesByAnimationName.delete(animationName)
  lastChosenVariantIndexByAnimationName.delete(animationName)
}

export function chooseRandomWholeNumberBetween(minimumValue: number, maximumValue: number): number {
  return Math.floor(randomNumberBetween(minimumValue, maximumValue + 1))
}

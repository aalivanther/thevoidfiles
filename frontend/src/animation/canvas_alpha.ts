const colorStringAlphaDecimalScale = 10_000_000
const colorStringAlphaSteps = 255

export function alphaPaintedLikeColorString(requestedAlpha: number): number {
  const boundedAlpha = Math.min(1, Math.max(0, requestedAlpha))
  const parsedAlpha = Math.trunc(boundedAlpha * colorStringAlphaDecimalScale) / colorStringAlphaDecimalScale
  return Math.round(parsedAlpha * colorStringAlphaSteps) / colorStringAlphaSteps
}

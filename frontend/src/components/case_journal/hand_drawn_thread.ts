import rough from 'roughjs'

export type BoardPoint = { horizontal: number; vertical: number }

const handDrawnGenerator = rough.generator()

export function calculateStableDrawingSeed(stableText: string): number {
  let accumulatedHash = 17
  for (const textCharacter of stableText) {
    accumulatedHash = (accumulatedHash * 31 + (textCharacter.codePointAt(0) ?? 0)) % 2147483000
  }
  return accumulatedHash + 1
}

export function createHandDrawnThreadPaths(
  startPoint: BoardPoint,
  endPoint: BoardPoint,
  isSlack: boolean,
  stableSeedText: string,
): string[] {
  const horizontalDistance = endPoint.horizontal - startPoint.horizontal
  const verticalDistance = endPoint.vertical - startPoint.vertical
  const threadLength = Math.hypot(horizontalDistance, verticalDistance)
  const sagDepth = (isSlack ? 40 : 10) + threadLength * (isSlack ? 0.14 : 0.04)
  const threadDrawable = handDrawnGenerator.curve(
    [
      [startPoint.horizontal, startPoint.vertical],
      [startPoint.horizontal + horizontalDistance / 2, startPoint.vertical + verticalDistance / 2 + sagDepth],
      [endPoint.horizontal, endPoint.vertical],
    ],
    {
      seed: calculateStableDrawingSeed(stableSeedText),
      roughness: isSlack ? 1.5 : 0.9,
      bowing: 0.4,
      strokeWidth: 2,
      preserveVertices: true,
    },
  )
  return handDrawnGenerator.toPaths(threadDrawable).map((pathInformation) => pathInformation.d)
}

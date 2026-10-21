import type { KeyboardCoordinateGetter } from '@dnd-kit/core'

const forwardKeyboardCodes = ['ArrowRight', 'ArrowDown']
const backwardKeyboardCodes = ['ArrowLeft', 'ArrowUp']

export const jumpBetweenContainersCoordinateGetter: KeyboardCoordinateGetter = (keyboardEvent, { context }) => {
  const isMovingForward = forwardKeyboardCodes.includes(keyboardEvent.code)
  const isMovingBackward = backwardKeyboardCodes.includes(keyboardEvent.code)
  if (!isMovingForward && !isMovingBackward) {
    return undefined
  }
  keyboardEvent.preventDefault()
  const collisionRectangle = context.collisionRect
  if (!collisionRectangle) {
    return undefined
  }
  const orderedContainers = context.droppableContainers
    .getEnabled()
    .flatMap((droppableContainer) => {
      const containerRectangle = context.droppableRects.get(droppableContainer.id)
      return containerRectangle ? [{ containerIdentifier: droppableContainer.id, containerRectangle }] : []
    })
    .sort(
      (firstContainer, secondContainer) =>
        firstContainer.containerRectangle.top - secondContainer.containerRectangle.top ||
        firstContainer.containerRectangle.left - secondContainer.containerRectangle.left,
    )
  if (orderedContainers.length === 0) {
    return undefined
  }
  const collisionCenterX = collisionRectangle.left + collisionRectangle.width / 2
  const collisionCenterY = collisionRectangle.top + collisionRectangle.height / 2
  const currentContainerIndex = orderedContainers.findIndex(
    ({ containerRectangle }) =>
      collisionCenterX >= containerRectangle.left &&
      collisionCenterX <= containerRectangle.right &&
      collisionCenterY >= containerRectangle.top &&
      collisionCenterY <= containerRectangle.bottom,
  )
  const requestedContainerIndex =
    currentContainerIndex === -1
      ? isMovingForward
        ? 0
        : orderedContainers.length - 1
      : Math.min(orderedContainers.length - 1, Math.max(0, currentContainerIndex + (isMovingForward ? 1 : -1)))
  const requestedRectangle = orderedContainers[requestedContainerIndex].containerRectangle
  return {
    x: requestedRectangle.left + requestedRectangle.width / 2 - collisionRectangle.width / 2,
    y: requestedRectangle.top + requestedRectangle.height / 2 - collisionRectangle.height / 2,
  }
}

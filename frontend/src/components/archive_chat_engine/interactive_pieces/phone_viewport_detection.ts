import { useSyncExternalStore } from 'react'

const phoneViewportMediaQuery = '(max-width: 639.98px)'

function subscribeToPhoneViewportChanges(notifyViewportChanged: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => undefined
  }
  const mediaQueryList = window.matchMedia(phoneViewportMediaQuery)
  mediaQueryList.addEventListener('change', notifyViewportChanged)
  return () => mediaQueryList.removeEventListener('change', notifyViewportChanged)
}

function readIsPhoneViewport(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia(phoneViewportMediaQuery).matches
}

function readIsPhoneViewportWithoutWindow(): boolean {
  return false
}

export function useIsPhoneViewport(): boolean {
  return useSyncExternalStore(subscribeToPhoneViewportChanges, readIsPhoneViewport, readIsPhoneViewportWithoutWindow)
}

export function findNearestVerticallyScrollingAncestor(startingElement: HTMLElement): HTMLElement | null {
  let candidateElement = startingElement.parentElement
  while (candidateElement) {
    const overflowValue = window.getComputedStyle(candidateElement).overflowY
    if ((overflowValue === 'auto' || overflowValue === 'scroll') && candidateElement.scrollHeight > candidateElement.clientHeight) {
      return candidateElement
    }
    candidateElement = candidateElement.parentElement
  }
  return null
}

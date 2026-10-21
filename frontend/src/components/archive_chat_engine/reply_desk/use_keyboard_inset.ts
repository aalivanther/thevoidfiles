import { useEffect } from 'react'
import type { RefObject } from 'react'

export function useKeyboardInset(elementReceivingInset: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const observedVisualViewport = window.visualViewport
    const insetElement = elementReceivingInset.current
    if (!observedVisualViewport || !insetElement) {
      return
    }
    const writeKeyboardInset = () => {
      const coveredHeight = window.innerHeight - observedVisualViewport.height - observedVisualViewport.offsetTop
      insetElement.style.setProperty('--keyboard-inset', `${Math.max(0, Math.round(coveredHeight))}px`)
    }
    writeKeyboardInset()
    observedVisualViewport.addEventListener('resize', writeKeyboardInset)
    observedVisualViewport.addEventListener('scroll', writeKeyboardInset)
    return () => {
      observedVisualViewport.removeEventListener('resize', writeKeyboardInset)
      observedVisualViewport.removeEventListener('scroll', writeKeyboardInset)
      insetElement.style.removeProperty('--keyboard-inset')
    }
  }, [elementReceivingInset])
}

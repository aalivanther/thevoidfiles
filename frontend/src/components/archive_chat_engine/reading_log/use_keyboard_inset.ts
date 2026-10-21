import { useEffect } from 'react'
import type { RefObject } from 'react'

export function useKeyboardInset(screenElementReference: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const screenElement = screenElementReference.current
    const visualViewport = window.visualViewport
    if (!screenElement || !visualViewport) {
      return
    }
    const writeKeyboardInset = () => {
      const keyboardInsetInPixels = Math.max(0, Math.round(window.innerHeight - visualViewport.height - visualViewport.offsetTop))
      screenElement.style.setProperty('--keyboard-inset', `${keyboardInsetInPixels}px`)
    }
    writeKeyboardInset()
    visualViewport.addEventListener('resize', writeKeyboardInset)
    visualViewport.addEventListener('scroll', writeKeyboardInset)
    return () => {
      visualViewport.removeEventListener('resize', writeKeyboardInset)
      visualViewport.removeEventListener('scroll', writeKeyboardInset)
      screenElement.style.removeProperty('--keyboard-inset')
    }
  }, [screenElementReference])
}

import { useEffect, useState } from 'react'

const wideJournalLayoutMediaQuery = '(min-width: 64rem)'

export function calculateStableTiltDegrees(stableIdentifier: string, maximumTiltDegrees: number): number {
  let accumulatedHash = 7
  for (const identifierCharacter of stableIdentifier) {
    accumulatedHash = (accumulatedHash * 31 + (identifierCharacter.codePointAt(0) ?? 0)) % 9973
  }
  const normalizedPosition = (accumulatedHash % 200) / 100 - 1
  return Number((normalizedPosition * maximumTiltDegrees).toFixed(2))
}

export function useIsWideJournalLayout(): boolean {
  const [isWideJournalLayout, setIsWideJournalLayout] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(wideJournalLayoutMediaQuery).matches,
  )

  useEffect(() => {
    const mediaQueryList = window.matchMedia(wideJournalLayoutMediaQuery)
    const handleMediaQueryChange = () => setIsWideJournalLayout(mediaQueryList.matches)
    handleMediaQueryChange()
    mediaQueryList.addEventListener('change', handleMediaQueryChange)
    return () => mediaQueryList.removeEventListener('change', handleMediaQueryChange)
  }, [])

  return isWideJournalLayout
}

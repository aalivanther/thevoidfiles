const longestWaitForIdleMomentInMilliseconds = 2500
const fallbackPauseBeforeIdleWorkInMilliseconds = 450
const connectionTypesThatSpareOptionalDownloads = ['slow-2g', '2g']

type NetworkInformationHints = { saveData?: boolean; effectiveType?: string }

export function waitForIdleMoment(): Promise<void> {
  return new Promise((resolveWaiting) => {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(() => resolveWaiting(), { timeout: longestWaitForIdleMomentInMilliseconds })
      return
    }
    window.setTimeout(resolveWaiting, fallbackPauseBeforeIdleWorkInMilliseconds)
  })
}

export function shouldSpareOptionalDownloads(): boolean {
  const connectionHints = (navigator as Navigator & { connection?: NetworkInformationHints }).connection
  return (
    connectionHints?.saveData === true ||
    connectionTypesThatSpareOptionalDownloads.includes(connectionHints?.effectiveType ?? '')
  )
}

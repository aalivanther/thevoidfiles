import { useEffect, useState } from 'react'

export function isBrowserSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
}

function readSpanishBrowserVoices(): SpeechSynthesisVoice[] {
  if (!isBrowserSpeechSupported()) {
    return []
  }
  return window.speechSynthesis.getVoices().filter((browserVoice) => browserVoice.lang.toLowerCase().startsWith('es'))
}

export function useSpanishBrowserVoices(): SpeechSynthesisVoice[] {
  const [spanishBrowserVoices, setSpanishBrowserVoices] = useState<SpeechSynthesisVoice[]>(readSpanishBrowserVoices)

  useEffect(() => {
    if (!isBrowserSpeechSupported()) {
      return
    }
    const refreshVoices = () => setSpanishBrowserVoices(readSpanishBrowserVoices())
    const lateRefreshTimeoutIdentifier = window.setTimeout(refreshVoices, 600)
    window.speechSynthesis.addEventListener('voiceschanged', refreshVoices)
    return () => {
      window.clearTimeout(lateRefreshTimeoutIdentifier)
      window.speechSynthesis.removeEventListener('voiceschanged', refreshVoices)
    }
  }, [])

  return spanishBrowserVoices
}

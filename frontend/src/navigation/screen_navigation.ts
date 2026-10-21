import { useCallback, useEffect, useState } from 'react'

export type ScreenName =
  | 'ai_configuration'
  | 'title'
  | 'character_dossier'
  | 'case_journal'
  | 'world_atlas'
  | 'sanctuary_home'
  | 'organizations_allies'
  | 'investigator_profile'
  | 'chronicle_history'
  | 'investigator_registration'
  | 'investigator_evaluation'
  | 'origin_narration'
  | 'threshold_narration'
  | 'oicnau_contact'
  | 'acknowledgements'
  | 'whisper_selection'
  | 'archive_play'
  | 'archive_closure'
  | 'chronicle_closed'

const addressFragmentByScreenName: Record<ScreenName, string> = {
  ai_configuration: '#/configuracion',
  title: '#/',
  character_dossier: '#/ficha',
  case_journal: '#/diario',
  world_atlas: '#/mundo',
  sanctuary_home: '#/casa',
  organizations_allies: '#/organizaciones',
  investigator_profile: '#/perfil',
  chronicle_history: '#/historica',
  investigator_registration: '#/registro',
  investigator_evaluation: '#/observacion',
  origin_narration: '#/retrato',
  threshold_narration: '#/umbral',
  oicnau_contact: '#/contacto',
  acknowledgements: '#/agradecimientos',
  whisper_selection: '#/susurros',
  archive_play: '#/archivo',
  archive_closure: '#/cierre',
  chronicle_closed: '#/cronica-cerrada',
}

function readScreenNameFromAddress(): ScreenName {
  const currentFragment = window.location.hash
  const matchingEntry = (Object.entries(addressFragmentByScreenName) as Array<[ScreenName, string]>).find(
    ([, addressFragment]) => addressFragment === currentFragment,
  )
  return matchingEntry ? matchingEntry[0] : 'title'
}

export function useScreenNavigation() {
  const [requestedScreenName, setRequestedScreenName] = useState<ScreenName>(readScreenNameFromAddress)

  useEffect(() => {
    const handleAddressChange = () => setRequestedScreenName(readScreenNameFromAddress())
    window.addEventListener('hashchange', handleAddressChange)
    window.addEventListener('popstate', handleAddressChange)
    return () => {
      window.removeEventListener('hashchange', handleAddressChange)
      window.removeEventListener('popstate', handleAddressChange)
    }
  }, [])

  const navigateToScreen = useCallback((screenName: ScreenName, shouldReplaceHistoryEntry = false) => {
    const addressFragment = addressFragmentByScreenName[screenName]
    if (window.location.hash === addressFragment) {
      setRequestedScreenName(screenName)
      return
    }
    if (shouldReplaceHistoryEntry) {
      window.history.replaceState(null, '', addressFragment)
      setRequestedScreenName(screenName)
      return
    }
    window.history.pushState(null, '', addressFragment)
    setRequestedScreenName(screenName)
  }, [])

  return { requestedScreenName, navigateToScreen }
}

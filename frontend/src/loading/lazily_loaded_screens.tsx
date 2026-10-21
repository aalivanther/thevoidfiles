import { Component, Suspense, lazy } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import type { ScreenName } from '../navigation/screen_navigation'
import { spanishInterfaceCopy } from '../spanish_interface_copy'

const screenModuleLoaders = {
  ai_configuration: () => import('../components/ai_configuration/AiConfigurationScreen'),
  title: () => import('../components/TitleScreen'),
  investigator_registration: () => import('../components/InvestigatorRegistrationScreen'),
  investigator_evaluation: () => import('../components/InvestigatorEvaluationScreen'),
  origin_narration: () => import('../components/PanelNarrationScreen'),
  oicnau_contact: () => import('../components/OicnauContactScreen'),
  whisper_selection: () => import('../components/WhisperSelectionScreen'),
  archive_play: () => import('../components/archive_chat_engine/ArchiveChatEngineScreen'),
  archive_closure: () => import('../components/ArchiveClosureScreen'),
  chronicle_closed: () => import('../components/chronicle_closed/ChronicleClosedScreen'),
  character_dossier: () => import('../components/character_dossier/CharacterDossierScreen'),
  case_journal: () => import('../components/case_journal/CaseJournalScreen'),
  world_atlas: () => import('../components/world_atlas/WorldAtlasScreen'),
  sanctuary_home: () => import('../components/sanctuary_home/SanctuaryHomeScreen'),
  organizations_allies: () => import('../components/organizations_allies/OrganizationsAlliesScreen'),
  investigator_profile: () => import('../components/investigator_profile/InvestigatorProfileScreen'),
  chronicle_history: () => import('../components/chronicle_history/ChronicleHistoryScreen'),
  acknowledgements: () => import('../components/AcknowledgementsScreen'),
  threshold_narration: () => import('../components/PanelNarrationScreen'),
} satisfies Record<ScreenName, () => Promise<unknown>>

const loadAttemptDelaysInMilliseconds = [0, 700, 2000, 4500]

const backgroundPreloadOrder: ScreenName[] = [
  'title',
  'investigator_registration',
  'investigator_evaluation',
  'origin_narration',
  'oicnau_contact',
  'whisper_selection',
  'archive_play',
  'archive_closure',
  'chronicle_closed',
  'character_dossier',
  'case_journal',
  'world_atlas',
  'sanctuary_home',
  'organizations_allies',
  'chronicle_history',
  'investigator_profile',
  'acknowledgements',
]

const pauseBetweenBackgroundPreloadsInMilliseconds = 450
const delayBeforeBackgroundPreloadStartsInMilliseconds = 1200

function waitForMilliseconds(durationInMilliseconds: number): Promise<void> {
  return new Promise((resolveWaiting) => window.setTimeout(resolveWaiting, durationInMilliseconds))
}

async function loadScreenModuleWithRetries<LoadedModule>(loadScreenModule: () => Promise<LoadedModule>): Promise<LoadedModule> {
  let lastLoadingError: unknown = null
  for (const delayBeforeAttempt of loadAttemptDelaysInMilliseconds) {
    if (delayBeforeAttempt > 0) {
      await waitForMilliseconds(delayBeforeAttempt)
    }
    try {
      return await loadScreenModule()
    } catch (loadingError) {
      lastLoadingError = loadingError
    }
  }
  throw lastLoadingError
}

export function ensureScreenModuleIsLoaded(screenName: ScreenName): Promise<unknown> {
  const loadScreenModule: () => Promise<unknown> = screenModuleLoaders[screenName]
  return loadScreenModuleWithRetries(loadScreenModule).catch(() => null)
}

let hasBackgroundPreloadStarted = false

export function preloadRemainingScreensInBackground() {
  if (hasBackgroundPreloadStarted) {
    return
  }
  hasBackgroundPreloadStarted = true
  const preloadOneScreenAfterAnother = async () => {
    await waitForMilliseconds(delayBeforeBackgroundPreloadStartsInMilliseconds)
    for (const screenName of backgroundPreloadOrder) {
      await ensureScreenModuleIsLoaded(screenName)
      await waitForMilliseconds(pauseBetweenBackgroundPreloadsInMilliseconds)
    }
  }
  void preloadOneScreenAfterAnother()
}

export const AiConfigurationScreen = lazy(() =>
  loadScreenModuleWithRetries(screenModuleLoaders.ai_configuration).then((loadedModule) => ({
    default: loadedModule.AiConfigurationScreen,
  })),
)

export const TitleScreen = lazy(() =>
  loadScreenModuleWithRetries(screenModuleLoaders.title).then((loadedModule) => ({
    default: loadedModule.TitleScreen,
  })),
)

export const InvestigatorRegistrationScreen = lazy(() =>
  loadScreenModuleWithRetries(screenModuleLoaders.investigator_registration).then((loadedModule) => ({
    default: loadedModule.InvestigatorRegistrationScreen,
  })),
)

export const InvestigatorEvaluationScreen = lazy(() =>
  loadScreenModuleWithRetries(screenModuleLoaders.investigator_evaluation).then((loadedModule) => ({
    default: loadedModule.InvestigatorEvaluationScreen,
  })),
)

export const PanelNarrationScreen = lazy(() =>
  loadScreenModuleWithRetries(screenModuleLoaders.origin_narration).then((loadedModule) => ({
    default: loadedModule.PanelNarrationScreen,
  })),
)

export const OicnauContactScreen = lazy(() =>
  loadScreenModuleWithRetries(screenModuleLoaders.oicnau_contact).then((loadedModule) => ({
    default: loadedModule.OicnauContactScreen,
  })),
)

export const WhisperSelectionScreen = lazy(() =>
  loadScreenModuleWithRetries(screenModuleLoaders.whisper_selection).then((loadedModule) => ({
    default: loadedModule.WhisperSelectionScreen,
  })),
)

export const ArchiveChatEngineScreen = lazy(() =>
  loadScreenModuleWithRetries(screenModuleLoaders.archive_play).then((loadedModule) => ({
    default: loadedModule.ArchiveChatEngineScreen,
  })),
)

export const ChronicleClosedScreen = lazy(() =>
  loadScreenModuleWithRetries(screenModuleLoaders.chronicle_closed).then((loadedModule) => ({
    default: loadedModule.ChronicleClosedScreen,
  })),
)

export const ArchiveClosureScreen = lazy(() =>
  loadScreenModuleWithRetries(screenModuleLoaders.archive_closure).then((loadedModule) => ({
    default: loadedModule.ArchiveClosureScreen,
  })),
)

export const CharacterDossierScreen = lazy(() =>
  loadScreenModuleWithRetries(screenModuleLoaders.character_dossier).then((loadedModule) => ({
    default: loadedModule.CharacterDossierScreen,
  })),
)

export const CaseJournalScreen = lazy(() =>
  loadScreenModuleWithRetries(screenModuleLoaders.case_journal).then((loadedModule) => ({
    default: loadedModule.CaseJournalScreen,
  })),
)

export const WorldAtlasScreen = lazy(() =>
  loadScreenModuleWithRetries(screenModuleLoaders.world_atlas).then((loadedModule) => ({
    default: loadedModule.WorldAtlasScreen,
  })),
)

export const SanctuaryHomeScreen = lazy(() =>
  loadScreenModuleWithRetries(screenModuleLoaders.sanctuary_home).then((loadedModule) => ({
    default: loadedModule.SanctuaryHomeScreen,
  })),
)

export const OrganizationsAlliesScreen = lazy(() =>
  loadScreenModuleWithRetries(screenModuleLoaders.organizations_allies).then((loadedModule) => ({
    default: loadedModule.OrganizationsAlliesScreen,
  })),
)

export const InvestigatorProfileScreen = lazy(() =>
  loadScreenModuleWithRetries(screenModuleLoaders.investigator_profile).then((loadedModule) => ({
    default: loadedModule.InvestigatorProfileScreen,
  })),
)

export const ChronicleHistoryScreen = lazy(() =>
  loadScreenModuleWithRetries(screenModuleLoaders.chronicle_history).then((loadedModule) => ({
    default: loadedModule.ChronicleHistoryScreen,
  })),
)

export const AcknowledgementsScreen = lazy(() =>
  loadScreenModuleWithRetries(screenModuleLoaders.acknowledgements).then((loadedModule) => ({
    default: loadedModule.AcknowledgementsScreen,
  })),
)

function ScreenLoadingNotice() {
  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center px-6 text-center"
      role="status"
    >
      <span className="flex items-end gap-1.5" aria-hidden="true">
        <span className="director-waiting-dot" />
        <span className="director-waiting-dot" />
        <span className="director-waiting-dot" />
      </span>
      <p className="dossier-label mt-4">{spanishInterfaceCopy.screenLoading.loadingNotice}</p>
    </main>
  )
}

type ScreenLoadingBoundaryProperties = { children: ReactNode; boundaryResetKey: string }
type ScreenLoadingBoundaryState = { hasLoadingFailed: boolean; failedBoundaryResetKey: string | null }

class ScreenLoadingFailureBoundary extends Component<ScreenLoadingBoundaryProperties, ScreenLoadingBoundaryState> {
  state: ScreenLoadingBoundaryState = { hasLoadingFailed: false, failedBoundaryResetKey: null }

  static getDerivedStateFromProps(
    nextProperties: ScreenLoadingBoundaryProperties,
    previousState: ScreenLoadingBoundaryState,
  ): ScreenLoadingBoundaryState | null {
    if (previousState.hasLoadingFailed && previousState.failedBoundaryResetKey !== nextProperties.boundaryResetKey) {
      return { hasLoadingFailed: false, failedBoundaryResetKey: null }
    }
    return null
  }

  static getDerivedStateFromError(): Partial<ScreenLoadingBoundaryState> {
    return { hasLoadingFailed: true }
  }

  componentDidCatch(_caughtError: Error, _errorInformation: ErrorInfo) {
    this.setState({ failedBoundaryResetKey: this.props.boundaryResetKey })
  }

  render() {
    if (!this.state.hasLoadingFailed) {
      return this.props.children
    }
    const screenLoadingCopy = spanishInterfaceCopy.screenLoading
    return (
      <main
        id="main-content"
        className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-start justify-center px-6"
        role="alert"
      >
        <p className="dossier-label">{screenLoadingCopy.failureLabel}</p>
        <h1 className="display-title mt-2 text-4xl sm:text-5xl">{screenLoadingCopy.failureTitle}</h1>
        <p className="narrative-prose mt-4">{screenLoadingCopy.failureExplanation}</p>
        <button type="button" className="primary-action-button mt-7" onClick={() => window.location.reload()}>
          {screenLoadingCopy.retryButton}
        </button>
      </main>
    )
  }
}

export function LazilyLoadedScreenFrame({ children, screenName }: { children: ReactNode; screenName: ScreenName }) {
  return (
    <ScreenLoadingFailureBoundary boundaryResetKey={screenName}>
      <Suspense fallback={<ScreenLoadingNotice />}>{children}</Suspense>
    </ScreenLoadingFailureBoundary>
  )
}

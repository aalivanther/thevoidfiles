import { GearSix } from '@phosphor-icons/react'
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useGeneratedAmbientMusic } from './audio/generated_ambient_music'
import type { AmbientMusicMood } from './audio/generated_ambient_music'
import { chooseAnimationVariantName, randomNumberBetween } from './animation/animation_variety'
import { moduleThemeByScreenName, screenTransitionVariantNamesByModuleTheme } from './animation/module_themes'
import {
  occupyScenePlaybackLane,
  releaseScenePlaybackLane,
  sceneTransitionCoverMilliseconds,
  sceneTransitionDurationMilliseconds,
} from './animation/scene_playback_clock'
import { preloadFrequentInteractionSoundsAfterStartup, useInteractionFeedback } from './audio/interaction_feedback'
import { ChronicleHubNavigation } from './components/ChronicleHubNavigation'
import {
  AcknowledgementsScreen,
  AiConfigurationScreen,
  ArchiveClosureScreen,
  ArchiveChatEngineScreen,
  CaseJournalScreen,
  ChronicleClosedScreen,
  CharacterDossierScreen,
  InvestigatorEvaluationScreen,
  InvestigatorRegistrationScreen,
  OicnauContactScreen,
  OrganizationsAlliesScreen,
  InvestigatorProfileScreen,
  ChronicleHistoryScreen,
  PanelNarrationScreen,
  SanctuaryHomeScreen,
  TitleScreen,
  WhisperSelectionScreen,
  WorldAtlasScreen,
  LazilyLoadedScreenFrame,
  ensureScreenModuleIsLoaded,
  preloadLikelyScreensInBackground,
} from './loading/lazily_loaded_screens'
import { forgetStagingHistory } from './components/archive_chat_engine/staging/staging_director'
import { OneiricFogLayer } from './components/OneiricFogLayer'
import { composeOriginNarrationPanels } from './demonstration/origin_narration_script'
import { thresholdNarrationPanels } from './demonstration/threshold_narration_script'
import { loadArchiveDirectorService } from './game_state/archive_director_service_loading'
import { ChronicleStateProvider, useChronicleState } from './game_state/chronicle_state'
import type { ChronicleState } from './game_state/chronicle_state'
import { useScreenNavigation } from './navigation/screen_navigation'
import type { ScreenName } from './navigation/screen_navigation'
import { PlayerSettingsProvider, usePlayerSettings } from './settings/player_settings'
import { spanishInterfaceCopy } from './spanish_interface_copy'


const SettingsSheet = lazy(() =>
  import('./components/SettingsSheet').then((loadedModule) => ({ default: loadedModule.SettingsSheet })),
)
const baseVignetteStrength = 0.55
const vignetteStrengthGainedPerConfirmedTurn = 0.11
const maximumVignetteStrength = 0.92
const screenWipeCoverMilliseconds = sceneTransitionCoverMilliseconds
const screenTransitionHoldMilliseconds = sceneTransitionDurationMilliseconds
const screenTransitionOccupationIdentifier = 'application-screen-transition'
const screensThatAllowFrontFog: ScreenName[] = ['threshold_narration', 'whisper_selection', 'chronicle_closed']
const longestWaitForScreenModuleInMilliseconds = 2600
const collapseIntoSingularityMilliseconds = 1900
const screenShardPolygons = [
  'polygon(0% 0%, 34% 0%, 22% 31%, 0% 24%)',
  'polygon(34% 0%, 68% 0%, 55% 27%, 22% 31%)',
  'polygon(68% 0%, 100% 0%, 100% 29%, 78% 38%, 55% 27%)',
  'polygon(0% 24%, 22% 31%, 31% 58%, 0% 63%)',
  'polygon(22% 31%, 55% 27%, 50% 40%, 31% 58%)',
  'polygon(55% 27%, 78% 38%, 66% 61%, 50% 40%)',
  'polygon(78% 38%, 100% 29%, 100% 68%, 66% 61%)',
  'polygon(0% 63%, 31% 58%, 38% 100%, 0% 100%)',
  'polygon(31% 58%, 50% 40%, 66% 61%, 58% 100%, 38% 100%)',
  'polygon(66% 61%, 100% 68%, 100% 100%, 58% 100%)',
]
const cosmicOriginWitnessedStorageKey = 'the_void_files_cosmic_origin_witnessed'

const ambientMusicMoodByScreenName: Record<ScreenName, AmbientMusicMood> = {
  ai_configuration: 'clinical_observation',
  title: 'cosmic_origin',
  character_dossier: 'clinical_observation',
  case_journal: 'archive_tension',
  world_atlas: 'cosmic_origin',
  sanctuary_home: 'archive_closure',
  organizations_allies: 'noir_whispers',
  investigator_profile: 'clinical_observation',
  chronicle_history: 'archive_closure',
  investigator_registration: 'clinical_observation',
  investigator_evaluation: 'clinical_observation',
  origin_narration: 'clinical_observation',
  threshold_narration: 'cosmic_origin',
  oicnau_contact: 'noir_whispers',
  acknowledgements: 'archive_closure',
  whisper_selection: 'noir_whispers',
  archive_play: 'archive_tension',
  archive_closure: 'archive_closure',
  chronicle_closed: 'archive_closure',
}

const chronicleHubScreenNames: ScreenName[] = [
  'whisper_selection',
  'character_dossier',
  'case_journal',
  'chronicle_history',
  'world_atlas',
  'sanctuary_home',
  'organizations_allies',
]

const fogDensityByScreenName: Record<ScreenName, number> = {
  ai_configuration: 0,
  title: 0.3,
  character_dossier: 0.14,
  case_journal: 0.18,
  world_atlas: 0.28,
  sanctuary_home: 0.2,
  organizations_allies: 0.16,
  investigator_profile: 0.12,
  chronicle_history: 0.14,
  investigator_registration: 0.16,
  investigator_evaluation: 0.2,
  origin_narration: 0.26,
  threshold_narration: 0.34,
  oicnau_contact: 0.18,
  acknowledgements: 0.12,
  whisper_selection: 0.3,
  archive_play: 0.08,
  archive_closure: 0.12,
  chronicle_closed: 0.36,
}

const onboardingScreenOrder: ScreenName[] = [
  'investigator_registration',
  'investigator_evaluation',
  'origin_narration',
  'threshold_narration',
  'oicnau_contact',
]

function isOnboardingScreenCompleted(onboardingScreenName: ScreenName, chronicleState: ChronicleState): boolean {
  switch (onboardingScreenName) {
    case 'investigator_registration':
      return chronicleState.investigatorRegistration !== null
    case 'investigator_evaluation':
      return chronicleState.investigatorAttributes !== null && chronicleState.hasOriginNarrationBeenWitnessed
    case 'origin_narration':
      return chronicleState.hasOriginNarrationBeenWitnessed
    case 'threshold_narration':
      return chronicleState.hasThresholdNarrationBeenWitnessed
    case 'oicnau_contact':
      return chronicleState.oicnauStance !== null && chronicleState.hasOicnauContactBeenConcluded
    default:
      return true
  }
}

function findFirstPendingOnboardingScreen(chronicleState: ChronicleState): ScreenName | null {
  if (chronicleState.investigatorAttributes === null && chronicleState.investigatorRegistration !== null) {
    return 'investigator_evaluation'
  }
  return (
    onboardingScreenOrder.find(
      (onboardingScreenName) => !isOnboardingScreenCompleted(onboardingScreenName, chronicleState),
    ) ?? null
  )
}

function composeLikelyScreenNamesAfterStart(chronicleState: ChronicleState): ScreenName[] {
  const pendingOnboardingScreenNames = onboardingScreenOrder.filter(
    (onboardingScreenName) => !isOnboardingScreenCompleted(onboardingScreenName, chronicleState),
  )
  return [...new Set<ScreenName>(['title', ...pendingOnboardingScreenNames, 'whisper_selection', 'archive_play'])]
}

function resolveAllowedScreenName(
  requestedScreenName: ScreenName,
  chronicleState: ChronicleState,
  isArchiveFinished: boolean,
  shouldChronicleClosureSequenceStillPlay: boolean,
): ScreenName {
  const hasOpenArchive = chronicleState.chosenWhisperIdentifier !== null
  const firstPendingOnboardingScreen = findFirstPendingOnboardingScreen(chronicleState)
  if (!chronicleState.hasAiConfigurationBeenHandled) {
    return 'ai_configuration'
  }
  if (requestedScreenName === 'ai_configuration') {
    return 'title'
  }
  if (
    requestedScreenName === 'title' ||
    requestedScreenName === 'acknowledgements' ||
    requestedScreenName === 'investigator_profile'
  ) {
    return requestedScreenName
  }
  if (chronicleState.chronicleClosure !== null) {
    return requestedScreenName === 'archive_play' && shouldChronicleClosureSequenceStillPlay
      ? 'archive_play'
      : 'chronicle_closed'
  }
  if (requestedScreenName === 'chronicle_closed') {
    return 'title'
  }
  if (onboardingScreenOrder.includes(requestedScreenName)) {
    if (requestedScreenName === firstPendingOnboardingScreen) {
      return requestedScreenName
    }
    if (requestedScreenName === 'origin_narration' && chronicleState.investigatorAttributes !== null) {
      return requestedScreenName
    }
    const isRewatchableNarration =
      (requestedScreenName === 'origin_narration' || requestedScreenName === 'threshold_narration') &&
      firstPendingOnboardingScreen === null
    if (isRewatchableNarration) {
      return requestedScreenName
    }
    return firstPendingOnboardingScreen ?? 'whisper_selection'
  }
  if (firstPendingOnboardingScreen) {
    return firstPendingOnboardingScreen
  }
  if (requestedScreenName === 'archive_play' && !hasOpenArchive) {
    return 'whisper_selection'
  }
  if (requestedScreenName === 'archive_closure' && !isArchiveFinished) {
    return hasOpenArchive ? 'archive_play' : 'whisper_selection'
  }
  return requestedScreenName
}

function ApplicationScreens() {
  const { requestedScreenName, navigateToScreen } = useScreenNavigation()
  const { chronicleState, changeChronicleState, isDemonstrationArchiveFinished } = useChronicleState()
  const { playerSettings, shouldReduceMotion } = usePlayerSettings()
  const playInteractionFeedback = useInteractionFeedback()
  const [likelyScreenNamesAfterStart] = useState(() => composeLikelyScreenNamesAfterStart(chronicleState))

  useEffect(() => {
    preloadFrequentInteractionSoundsAfterStartup()
    preloadLikelyScreensInBackground(likelyScreenNamesAfterStart)
  }, [likelyScreenNamesAfterStart])

  const [isSettingsSheetOpen, setIsSettingsSheetOpen] = useState(false)
  const [hasSettingsSheetBeenRequested, setHasSettingsSheetBeenRequested] = useState(false)
  const [originReplayCount, setOriginReplayCount] = useState(0)
  const screenWipeCurtain = useRef<HTMLDivElement>(null)
  const screenTransitionVoid = useRef<HTMLDivElement>(null)
  const [isCollapsingIntoSingularity, setIsCollapsingIntoSingularity] = useState(false)
  const shouldSkipNextScreenTransition = useRef(false)

  const hasOpenArchive = chronicleState.chosenWhisperIdentifier !== null
  const [wasChronicleAlreadyClosedWhenApplicationStarted, setWasChronicleAlreadyClosedWhenApplicationStarted] =
    useState(() => chronicleState.chronicleClosure !== null)
  const allowedScreenName = resolveAllowedScreenName(
    requestedScreenName,
    chronicleState,
    isDemonstrationArchiveFinished,
    !wasChronicleAlreadyClosedWhenApplicationStarted &&
      chronicleState.chronicleClosure !== null &&
      !chronicleState.chronicleClosure.hasClosureSequenceBeenWitnessed,
  )
  const isArchiveOpeningPending = useRef(false)

  useEffect(() => {
    if (chronicleState.chronicleClosure === null) {
      setWasChronicleAlreadyClosedWhenApplicationStarted(false)
    }
  }, [chronicleState.chronicleClosure])
  const [displayedScreenName, setDisplayedScreenName] = useState<ScreenName>(allowedScreenName)

  useEffect(() => {
    if (allowedScreenName !== requestedScreenName) {
      navigateToScreen(allowedScreenName, true)
    }
  }, [allowedScreenName, requestedScreenName, navigateToScreen])

  useEffect(() => {
    if (allowedScreenName === displayedScreenName) {
      return
    }
    const curtainElement = screenWipeCurtain.current
    const voidElement = screenTransitionVoid.current
    const clearTransitionCover = () => {
      delete document.documentElement.dataset.screenTransitionCover
      if (voidElement) {
        delete voidElement.dataset.visible
        delete voidElement.dataset.releasing
      }
    }
    if (
      shouldReduceMotion ||
      !curtainElement ||
      shouldSkipNextScreenTransition.current ||
      allowedScreenName === 'chronicle_closed'
    ) {
      shouldSkipNextScreenTransition.current = false
      clearTransitionCover()
      setDisplayedScreenName(allowedScreenName)
      window.scrollTo(0, 0)
      return
    }
    const destinationModuleTheme = moduleThemeByScreenName[allowedScreenName]
    curtainElement.dataset.transitionVariant = chooseAnimationVariantName(
      `screen_transition_${destinationModuleTheme}`,
      screenTransitionVariantNamesByModuleTheme[destinationModuleTheme],
    )
    curtainElement.style.setProperty('--transition-tilt', `${randomNumberBetween(-14, 14).toFixed(1)}deg`)
    curtainElement.style.setProperty('--transition-origin-horizontal', `${randomNumberBetween(20, 80).toFixed(0)}%`)
    curtainElement.style.setProperty('--transition-origin-vertical', `${randomNumberBetween(25, 75).toFixed(0)}%`)
    curtainElement.classList.remove('screen-transition-running')
    void curtainElement.offsetWidth
    document.documentElement.dataset.screenTransitionCover = 'true'
    if (voidElement) {
      delete voidElement.dataset.releasing
      voidElement.dataset.visible = 'true'
    }
    curtainElement.classList.add('screen-transition-running')
    occupyScenePlaybackLane(screenTransitionOccupationIdentifier, 'transition', screenTransitionHoldMilliseconds)
    playInteractionFeedback('panel_open')
    let isTransitionStillWanted = true
    const pendingTimeoutIdentifiers: number[] = []
    const screenModuleReady = Promise.race([
      ensureScreenModuleIsLoaded(allowedScreenName),
      new Promise((resolveWaiting) => window.setTimeout(resolveWaiting, longestWaitForScreenModuleInMilliseconds)),
    ])
    const revealNewScreenUnderVoid = () => {
      if (!isTransitionStillWanted) {
        return
      }
      setDisplayedScreenName(allowedScreenName)
      window.scrollTo(0, 0)
      delete document.documentElement.dataset.screenTransitionCover
      pendingTimeoutIdentifiers.push(
        window.setTimeout(() => {
          if (voidElement) {
            voidElement.dataset.releasing = 'true'
          }
        }, 80),
      )
      pendingTimeoutIdentifiers.push(
        window.setTimeout(() => {
          curtainElement.classList.remove('screen-transition-running')
          clearTransitionCover()
          releaseScenePlaybackLane(screenTransitionOccupationIdentifier)
        }, 260),
      )
    }
    pendingTimeoutIdentifiers.push(
      window.setTimeout(() => {
        void screenModuleReady.then(revealNewScreenUnderVoid)
      }, screenWipeCoverMilliseconds),
    )
    return () => {
      isTransitionStillWanted = false
      pendingTimeoutIdentifiers.forEach((timeoutIdentifier) => window.clearTimeout(timeoutIdentifier))
      curtainElement.classList.remove('screen-transition-running')
      clearTransitionCover()
      releaseScenePlaybackLane(screenTransitionOccupationIdentifier)
    }
  }, [allowedScreenName, displayedScreenName, shouldReduceMotion, playInteractionFeedback])

  useEffect(() => {
    document.documentElement.dataset.moduleTheme = moduleThemeByScreenName[displayedScreenName]
  }, [displayedScreenName])

  useEffect(() => {
    const vignetteStrength = hasOpenArchive
      ? Math.min(
          maximumVignetteStrength,
          baseVignetteStrength + chronicleState.confirmedTurnCount * vignetteStrengthGainedPerConfirmedTurn,
        )
      : baseVignetteStrength
    document.documentElement.style.setProperty('--entropy-vignette-strength', String(vignetteStrength))
  }, [hasOpenArchive, chronicleState.confirmedTurnCount])

  useGeneratedAmbientMusic(ambientMusicMoodByScreenName[displayedScreenName])

  const originNarrationPanels = useMemo(
    () => composeOriginNarrationPanels(chronicleState.investigatorRegistration, chronicleState.investigatorAttributes),
    [chronicleState.investigatorRegistration, chronicleState.investigatorAttributes],
  )

  const collapseTimeoutIdentifiers = useRef<number[]>([])

  const collapseIntoSingularityAndReturnToOrigin = useCallback(
    (shouldEraseChronicle: boolean) => {
      try {
        window.sessionStorage.removeItem(cosmicOriginWitnessedStorageKey)
      } catch {
        setIsSettingsSheetOpen(false)
      }
      setIsSettingsSheetOpen(false)
      collapseTimeoutIdentifiers.current.forEach((timeoutIdentifier) => window.clearTimeout(timeoutIdentifier))
      collapseTimeoutIdentifiers.current = []
      const returnToOrigin = () => {
        if (shouldEraseChronicle) {
          changeChronicleState({ kind: 'demonstration_restarted' })
        }
        shouldSkipNextScreenTransition.current = true
        setOriginReplayCount((previousCount) => previousCount + 1)
        navigateToScreen('title')
        setIsCollapsingIntoSingularity(false)
      }
      if (shouldReduceMotion) {
        returnToOrigin()
        return
      }
      occupyScenePlaybackLane('chronicle-singularity-collapse', 'signature', collapseIntoSingularityMilliseconds)
      playInteractionFeedback('screen_tear')
      collapseTimeoutIdentifiers.current.push(window.setTimeout(() => playInteractionFeedback('screen_tear'), 260))
      collapseTimeoutIdentifiers.current.push(window.setTimeout(() => playInteractionFeedback('falling_whoosh'), 700))
      setIsCollapsingIntoSingularity(true)
      collapseTimeoutIdentifiers.current.push(
        window.setTimeout(() => playInteractionFeedback('stamp_impact'), collapseIntoSingularityMilliseconds - 260),
      )
      collapseTimeoutIdentifiers.current.push(window.setTimeout(returnToOrigin, collapseIntoSingularityMilliseconds))
    },
    [changeChronicleState, navigateToScreen, playInteractionFeedback, shouldReduceMotion],
  )

  useEffect(
    () => () => {
      collapseTimeoutIdentifiers.current.forEach((timeoutIdentifier) => window.clearTimeout(timeoutIdentifier))
      releaseScenePlaybackLane('chronicle-singularity-collapse')
    },
    [],
  )

  useEffect(() => {
    if (displayedScreenName !== 'whisper_selection') {
      isArchiveOpeningPending.current = false
    }
  }, [displayedScreenName])

  useEffect(() => {
    if (displayedScreenName !== 'archive_play') {
      forgetStagingHistory()
    }
  }, [displayedScreenName])

  return (
    <>
      <a
        href="#main-content"
        className="quiet-action-button fixed top-2 left-2 z-[70] -translate-y-24 !bg-void-base focus-visible:translate-y-0"
        onClick={(clickEvent) => {
          clickEvent.preventDefault()
          const mainContent = document.getElementById('main-content')
          mainContent?.setAttribute('tabindex', '-1')
          mainContent?.focus()
        }}
      >
        {spanishInterfaceCopy.navigation.skipToContent}
      </a>

      <div className="atmosphere-lamp-layer" aria-hidden="true" />
      {playerSettings.isDreamFogEnabled ? (
      <OneiricFogLayer
        fogDensity={Math.min(
          0.42,
          fogDensityByScreenName[displayedScreenName] +
            (displayedScreenName === 'archive_play' ? chronicleState.confirmedTurnCount * 0.01 : 0),
        )}
        shouldPaintFrontBank={screensThatAllowFrontFog.includes(displayedScreenName)}
      />
      ) : null}
      <div className="module-atmosphere-layer scene-ambient-motion" aria-hidden="true" />

      <button
        type="button"
        className="quiet-action-button fixed top-2 right-3 z-30 !bg-void-base"
        data-settings-trigger="true"
        aria-label={spanishInterfaceCopy.navigation.openSettings}
        onClick={() => {
          playInteractionFeedback('panel_open')
          setHasSettingsSheetBeenRequested(true)
          setIsSettingsSheetOpen(true)
        }}
      >
        <GearSix size={20} weight="fill" aria-hidden="true" />
      </button>

      <div
        className={`application-play-stage${isCollapsingIntoSingularity ? ' collapsing-into-singularity' : ''}`}
      >
      <LazilyLoadedScreenFrame screenName={displayedScreenName}>
      {displayedScreenName === 'ai_configuration' && !chronicleState.hasAiConfigurationBeenHandled ? (
        <AiConfigurationScreen
          onConfigurationHandled={(aiConfiguration) => {
            shouldSkipNextScreenTransition.current = true
            changeChronicleState({ kind: 'ai_configuration_handled', aiConfiguration })
            navigateToScreen('title', true)
          }}
        />
      ) : null}
      {chronicleHubScreenNames.includes(displayedScreenName) &&
      displayedScreenName === allowedScreenName &&
      chronicleState.chronicleClosure === null ? (
        <ChronicleHubNavigation
          currentScreenName={displayedScreenName}
          hasOpenArchive={hasOpenArchive}
          onScreenRequested={navigateToScreen}
        />
      ) : null}
      {displayedScreenName === 'character_dossier' ? <CharacterDossierScreen /> : null}
      {displayedScreenName === 'case_journal' ? <CaseJournalScreen /> : null}
      {displayedScreenName === 'world_atlas' ? <WorldAtlasScreen /> : null}
      {displayedScreenName === 'sanctuary_home' ? <SanctuaryHomeScreen /> : null}
      {displayedScreenName === 'organizations_allies' ? <OrganizationsAlliesScreen /> : null}
      {displayedScreenName === 'chronicle_history' ? <ChronicleHistoryScreen /> : null}
      {displayedScreenName === 'investigator_profile' ? (
        <InvestigatorProfileScreen
          onReturnRequested={() => window.history.back()}
          onActiveChronicleResumed={() => navigateToScreen('archive_play')}
        />
      ) : null}
      {displayedScreenName === 'title' ? (
        <TitleScreen
          key={originReplayCount}
          hasChronicleInProgress={chronicleState.investigatorRegistration !== null}
          onAcknowledgementsRequested={() => navigateToScreen('acknowledgements')}
          onProfileRequested={() => navigateToScreen('investigator_profile')}
          onChronicleOpened={() =>
            navigateToScreen(
              findFirstPendingOnboardingScreen(chronicleState) ?? (hasOpenArchive ? 'archive_play' : 'whisper_selection'),
            )
          }
        />
      ) : null}
      {displayedScreenName === 'investigator_registration' && !chronicleState.investigatorRegistration ? (
        <InvestigatorRegistrationScreen
          onRegistrationCompleted={(investigatorRegistration) => {
            changeChronicleState({ kind: 'registration_completed', investigatorRegistration })
            navigateToScreen('investigator_evaluation')
          }}
        />
      ) : null}
      {displayedScreenName === 'investigator_evaluation' && chronicleState.investigatorRegistration ? (
        <InvestigatorEvaluationScreen
          existingAttributes={chronicleState.investigatorAttributes}
          onEvaluationCompleted={(investigatorAttributes) =>
            changeChronicleState({ kind: 'evaluation_completed', investigatorAttributes })
          }
          onEvaluationDiscarded={() => changeChronicleState({ kind: 'evaluation_discarded' })}
          onReadingAccepted={() => navigateToScreen('origin_narration')}
        />
      ) : null}
      {displayedScreenName === 'origin_narration' && chronicleState.investigatorAttributes ? (
        <PanelNarrationScreen
          chapterLabel={spanishInterfaceCopy.originNarration.chapterLabel}
          chapterTitle={spanishInterfaceCopy.originNarration.chapterTitle}
          narrationPanels={originNarrationPanels}
          finishButtonText={spanishInterfaceCopy.originNarration.finishButton}
          shouldShowStarfield={false}
          investigatorRegistration={chronicleState.investigatorRegistration}
          onNarrationFinished={() => {
            changeChronicleState({ kind: 'origin_narration_witnessed' })
            navigateToScreen('threshold_narration')
          }}
        />
      ) : null}
      {displayedScreenName === 'threshold_narration' && chronicleState.investigatorAttributes ? (
        <PanelNarrationScreen
          chapterLabel={spanishInterfaceCopy.thresholdNarration.chapterLabel}
          chapterTitle={spanishInterfaceCopy.thresholdNarration.chapterTitle}
          narrationPanels={thresholdNarrationPanels}
          finishButtonText={spanishInterfaceCopy.thresholdNarration.continueButton}
          shouldShowStarfield
          investigatorRegistration={chronicleState.investigatorRegistration}
          onNarrationFinished={() => {
            changeChronicleState({ kind: 'threshold_narration_witnessed' })
            navigateToScreen('oicnau_contact')
          }}
        />
      ) : null}
      {displayedScreenName === 'oicnau_contact' && chronicleState.investigatorAttributes ? (
        <OicnauContactScreen
          investigatorRegistration={chronicleState.investigatorRegistration}
          chosenStance={chronicleState.oicnauStance}
          onStanceChosen={(oicnauStance) => changeChronicleState({ kind: 'oicnau_stance_chosen', oicnauStance })}
          onContactFinished={() => {
            changeChronicleState({ kind: 'oicnau_contact_concluded' })
            navigateToScreen('whisper_selection')
          }}
        />
      ) : null}
      {displayedScreenName === 'acknowledgements' ? (
        <AcknowledgementsScreen onReturnRequested={() => window.history.back()} />
      ) : null}
      {displayedScreenName === 'whisper_selection' ? (
        <WhisperSelectionScreen
          onArchiveMaterialRequested={async (whisperIdentifier) => {
            if (isArchiveOpeningPending.current) {
              return Promise.reject(new Error('archive_opening_already_pending'))
            }
            isArchiveOpeningPending.current = true
            try {
              const archiveDirectorService = await loadArchiveDirectorService()
              return await archiveDirectorService.openArchive(whisperIdentifier)
            } catch (openingError) {
              isArchiveOpeningPending.current = false
              throw openingError
            }
          }}
          onArchiveOpeningCommitted={(whisperIdentifier, archiveOpeningResolution) => {
            isArchiveOpeningPending.current = false
            changeChronicleState({ kind: 'archive_opened', whisperIdentifier, archiveOpeningResolution })
            navigateToScreen('archive_play')
          }}
        />
      ) : null}
      {displayedScreenName === 'archive_play' && hasOpenArchive ? (
        <ArchiveChatEngineScreen
          onArchiveClosureRequested={() => navigateToScreen('archive_closure')}
          onChronicleWindowRequested={navigateToScreen}
        />
      ) : null}
      {displayedScreenName === 'chronicle_closed' && chronicleState.chronicleClosure !== null ? (
        <ChronicleClosedScreen
          onSuccessorChronicleStarted={() => {
            changeChronicleState({ kind: 'successor_chronicle_started' })
            navigateToScreen('title')
          }}
          onReturnToTitleRequested={() => navigateToScreen('title')}
        />
      ) : null}
      {displayedScreenName === 'archive_closure' && isDemonstrationArchiveFinished ? (
        <ArchiveClosureScreen
          onReturnToWhispersRequested={() => {
            changeChronicleState({ kind: 'archive_abandoned_for_new_whispers' })
            navigateToScreen('whisper_selection')
          }}
        />
      ) : null}

      </LazilyLoadedScreenFrame>
      </div>
      {isCollapsingIntoSingularity ? (
        <div className="singularity-collapse-stage" aria-hidden="true">
          {screenShardPolygons.map((shardPolygon, shardIndex) => (
            <span
              key={shardPolygon}
              className="singularity-collapse-shard-holder"
              style={
                {
                  '--shard-order': shardIndex,
                  '--shard-spin': `${(shardIndex % 2 === 0 ? 1 : -1) * (120 + shardIndex * 37)}deg`,
                } as CSSProperties
              }
            >
              <span className="singularity-collapse-shard" style={{ clipPath: shardPolygon }} />
            </span>
          ))}
          <span className="singularity-collapse-tear" />
          <span className="singularity-collapse-tear" />
          <span className="singularity-collapse-tear" />
          <span className="singularity-collapse-ring" />
          <span className="singularity-collapse-ring" />
          <span className="singularity-collapse-ring" />
          <span className="singularity-collapse-point" />
        </div>
      ) : null}

      {hasSettingsSheetBeenRequested ? (
      <Suspense fallback={null}>
      <SettingsSheet
        isOpen={isSettingsSheetOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            playInteractionFeedback('panel_close')
          }
          setIsSettingsSheetOpen(isOpen)
        }}
        onDemonstrationRestartRequested={() => collapseIntoSingularityAndReturnToOrigin(true)}
        onExitToOriginRequested={() => collapseIntoSingularityAndReturnToOrigin(false)}
        onAcknowledgementsRequested={() => {
          setIsSettingsSheetOpen(false)
          navigateToScreen('acknowledgements')
        }}
        canExitToOrigin={displayedScreenName !== 'title'}
      />
      </Suspense>
      ) : null}

      {hasOpenArchive ? <div className="atmosphere-vignette-layer" aria-hidden="true" /> : null}
      <div className="atmosphere-grain-layer" aria-hidden="true" />
      <div ref={screenTransitionVoid} className="screen-transition-void" aria-hidden="true" />
      <div ref={screenWipeCurtain} className="screen-transition-stage" aria-hidden="true">
        <span className="screen-transition-piece" />
        <span className="screen-transition-piece" />
        <span className="screen-transition-piece" />
        <span className="screen-transition-piece" />
        <span className="screen-transition-piece" />
        <span className="screen-transition-piece" />
        <span className="screen-transition-piece" />
        <span className="screen-transition-piece" />
      </div>
    </>
  )
}

export default function App() {
  return (
    <PlayerSettingsProvider>
      <ChronicleStateProvider>
        <ApplicationScreens />
      </ChronicleStateProvider>
    </PlayerSettingsProvider>
  )
}

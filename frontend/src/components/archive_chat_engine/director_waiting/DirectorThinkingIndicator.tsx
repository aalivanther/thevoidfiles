import { useEffect, useState } from 'react'
import {
  chooseAnimationVariantIndex,
  chooseWeightedAnimationVariantName,
  randomNumberBetween,
} from '../../../animation/animation_variety'
import { useInteractionFeedback } from '../../../audio/interaction_feedback'
import { directorGenerationWaitCopy } from '../../../copy/director_generation_wait_copy'
import { narrativeMarkupCopy } from '../../../copy/archive_chat_engine/narrative_markup_copy'
import { DirectorGenerationLettering } from '../../director_generation_wait/DirectorGenerationLettering'
import type { DirectorGenerationWaitStageName } from '../../director_generation_wait/use_director_generation_wait'
import type {
  DirectorTurnPhaseName,
  DirectorWaitStageName,
  SceneTensionTierName,
} from '../../../game_state/archive_turn_contract'
import { usePlayerSettings } from '../../../settings/player_settings'
import { DirectorThinkingVariantDrawing } from './director_thinking_variant_drawings'
import type { DirectorThinkingVariantName } from './director_thinking_variant_drawings'

export type DirectorThinkingIndicatorProperties = {
  directorTurnPhaseName: DirectorTurnPhaseName
  directorWaitStageName: DirectorWaitStageName
  generationWaitStageName: DirectorGenerationWaitStageName
  sceneTensionTierName: SceneTensionTierName
}

type ActiveDirectorTurnPhaseName = Exclude<DirectorTurnPhaseName, 'idle'>

type DirectorThinkingChoice = {
  variantName: DirectorThinkingVariantName
  asideLineIndexByPhaseName: Record<ActiveDirectorTurnPhaseName, number>
}

const weightedVariantsForAnyTension: ReadonlyArray<{ variantName: DirectorThinkingVariantName; weight: number }> = [
  { variantName: 'quill_and_inkwell', weight: 3 },
  { variantName: 'tape_reel', weight: 2 },
  { variantName: 'half_closed_eye', weight: 2 },
  { variantName: 'archive_card_file', weight: 3 },
]

const weightedVariantsForHighTension: ReadonlyArray<{ variantName: DirectorThinkingVariantName; weight: number }> = [
  ...weightedVariantsForAnyTension,
  { variantName: 'shortwave_static', weight: 1 },
]

const asideLineCountPerPhase = 3
const ellipsisChangeIntervalMilliseconds = 600
const ellipsisTexts = ['.', '..', '...']

function chooseDirectorThinking(sceneTensionTierName: SceneTensionTierName): DirectorThinkingChoice {
  const isTensionHigh = sceneTensionTierName === 'threatening' || sceneTensionTierName === 'lethal'
  const variantName = chooseWeightedAnimationVariantName(
    'director_thinking_indicator',
    isTensionHigh ? weightedVariantsForHighTension : weightedVariantsForAnyTension,
  )
  return {
    variantName,
    asideLineIndexByPhaseName: {
      weighing_action: chooseAnimationVariantIndex(`director_thinking_aside_weighing_${variantName}`, asideLineCountPerPhase),
      narrating: chooseAnimationVariantIndex(`director_thinking_aside_narrating_${variantName}`, asideLineCountPerPhase),
    },
  }
}

function readWaitingText(
  directorTurnPhaseName: ActiveDirectorTurnPhaseName,
  directorWaitStageName: DirectorWaitStageName,
): string {
  if (directorWaitStageName === 'extended') {
    return narrativeMarkupCopy.directorStillWithScene
  }
  if (directorWaitStageName === 'complicated' || directorWaitStageName === 'retry_offered') {
    return narrativeMarkupCopy.sceneGetsComplicated
  }
  return directorTurnPhaseName === 'weighing_action'
    ? narrativeMarkupCopy.directorWeighingAction
    : narrativeMarkupCopy.directorNarrating
}

type ActiveDirectorThinkingIndicatorProperties = {
  directorTurnPhaseName: ActiveDirectorTurnPhaseName
  directorWaitStageName: DirectorWaitStageName
  generationWaitStageName: DirectorGenerationWaitStageName
  sceneTensionTierName: SceneTensionTierName
}

function ActiveDirectorThinkingIndicator({
  directorTurnPhaseName,
  directorWaitStageName,
  generationWaitStageName,
  sceneTensionTierName,
}: ActiveDirectorThinkingIndicatorProperties) {
  const playInteractionFeedback = useInteractionFeedback()
  const { playerSettings } = usePlayerSettings()
  const [directorThinkingChoice] = useState(() => chooseDirectorThinking(sceneTensionTierName))
  const [ellipsisIndex, setEllipsisIndex] = useState(0)
  const { variantName } = directorThinkingChoice
  const isKeySoundEnabled = playerSettings.isKeySoundEnabled

  useEffect(() => {
    const ellipsisIntervalIdentifier = window.setInterval(
      () => setEllipsisIndex((previousIndex) => (previousIndex + 1) % ellipsisTexts.length),
      ellipsisChangeIntervalMilliseconds,
    )
    return () => window.clearInterval(ellipsisIntervalIdentifier)
  }, [])

  useEffect(() => {
    if (directorTurnPhaseName !== 'narrating' || !isKeySoundEnabled) {
      return
    }
    let writingSoundTimeoutIdentifier = 0
    const isWrittenWithQuill = variantName === 'quill_and_inkwell'
    const scheduleNextWritingSound = () => {
      writingSoundTimeoutIdentifier = window.setTimeout(
        () => {
          if (isWrittenWithQuill) {
            playInteractionFeedback('pen_scratch', {
              volumeMultiplier: 0.35,
              playbackRateMultiplier: randomNumberBetween(0.9, 1.15),
            })
          } else {
            playInteractionFeedback('typewriter_key', {
              volumeMultiplier: 0.55,
              playbackRateMultiplier: randomNumberBetween(0.92, 1.08),
            })
          }
          scheduleNextWritingSound()
        },
        isWrittenWithQuill ? randomNumberBetween(700, 1300) : randomNumberBetween(180, 420),
      )
    }
    scheduleNextWritingSound()
    return () => window.clearTimeout(writingSoundTimeoutIdentifier)
  }, [directorTurnPhaseName, isKeySoundEnabled, variantName, playInteractionFeedback])

  const asideLine =
    narrativeMarkupCopy.directorWaitingAsideLines[variantName][directorTurnPhaseName][
      directorThinkingChoice.asideLineIndexByPhaseName[directorTurnPhaseName]
    ]

  return (
    <div
      className="director-thinking-indicator director-wait-keeps-alive"
      data-director-turn-phase={directorTurnPhaseName}
      data-director-thinking-variant={variantName}
    >
      <DirectorThinkingVariantDrawing variantName={variantName} />
      <div className="director-thinking-text">
        {generationWaitStageName === 'idle' ? (
          <>
            <p className="director-thinking-status" role="status">
              <span>{readWaitingText(directorTurnPhaseName, directorWaitStageName)}</span>
              <span className="director-thinking-ellipsis" aria-hidden="true">
                {ellipsisTexts[ellipsisIndex]}
              </span>
            </p>
            <p className="director-thinking-aside">{asideLine}</p>
          </>
        ) : (
          <DirectorGenerationLettering
            waitStageName={generationWaitStageName}
            assemblingText={directorGenerationWaitCopy.directorTurn.assemblingText}
            loopingTexts={directorGenerationWaitCopy.directorTurn.loopingTexts}
            completingText={directorGenerationWaitCopy.directorTurn.completingText}
            statusLabel={directorGenerationWaitCopy.directorTurn.statusLabel}
          />
        )}
      </div>
    </div>
  )
}

export function DirectorThinkingIndicator({
  directorTurnPhaseName,
  directorWaitStageName,
  generationWaitStageName,
  sceneTensionTierName,
}: DirectorThinkingIndicatorProperties) {
  if (directorTurnPhaseName === 'idle' && generationWaitStageName === 'idle') {
    return null
  }
  return (
    <ActiveDirectorThinkingIndicator
      directorTurnPhaseName={directorTurnPhaseName === 'idle' ? 'weighing_action' : directorTurnPhaseName}
      directorWaitStageName={directorWaitStageName}
      generationWaitStageName={generationWaitStageName}
      sceneTensionTierName={sceneTensionTierName}
    />
  )
}

import { createInitialArchiveRunState, reduceArchiveRunState } from '../game_state/archive_run_state'
import type { ArchiveRunStateChange } from '../game_state/archive_run_state'
import type { ChronicleState, InvestigatorState } from '../game_state/chronicle_state'
import type { CaseStartCurrentArchive } from './case_start_client'
import type { ConsequenceTurnHistory } from './consequence_client'

export function rebuildArchiveFromConfirmedHistory(
  currentArchive: CaseStartCurrentArchive,
  history: ConsequenceTurnHistory,
  investigator: InvestigatorState,
  personalizeDirectorText: (text: string) => string,
  localStateVersion = 0,
): Pick<ChronicleState, 'archiveRun' | 'investigator' | 'confirmedTurnCount'> {
  const serverRun = currentArchive.archiveRun
  if (!serverRun || history.archiveRun?.archiveRunIdentifier !== serverRun.archiveRunIdentifier ||
    history.archiveRun.stateVersion !== serverRun.stateVersion) {
    throw new Error('archive_recovery_conflict')
  }
  const opening = currentArchive.opening
  const versionOffset = opening.archiveRun.stateVersion
  const resources = opening.investigatorResources
  const previouslyAppliedPersonalSpending = history.turns.reduce((total, turn) => {
    const resolution = turn.resolution
    if (!('confirmedTurn' in resolution) || resolution.confirmedTurn.resultingStateVersion > localStateVersion + versionOffset) return total
    return total + resolution.confirmedTurn.confirmedEffects.reduce((spent, effect) => spent + (effect.kind === 'personal_funds_spent' ? effect.amount : 0), 0)
  }, 0)
  let state = {
    archiveRun: createInitialArchiveRunState(),
    investigator: {
      ...investigator,
      placeName: resources.placeName,
      worldClockMinutes: resources.worldClockMinutes,
      operationalFunds: resources.operationalFunds,
      personalFunds: investigator.personalFunds + previouslyAppliedPersonalSpending,
      seriousWoundsSuffered: resources.seriousWoundCount,
      belongingUnits: Object.fromEntries(resources.belongingUnits.map((item) => [item.belongingIdentifier, item.units])),
    },
    wasTurnConfirmed: false,
  }
  const apply = (change: ArchiveRunStateChange) => {
    state = reduceArchiveRunState({ ...state, personalizeDirectorText }, change)
  }
  apply({
    kind: 'archive_opened',
    whisperIdentifier: currentArchive.archive.whisperIdentifier,
    archiveOpeningResolution: {
      ...opening.openingResolution,
      archiveCaseIdentifier: currentArchive.archive.archiveCaseIdentifier,
      archiveTitle: currentArchive.archive.archiveTitle,
      archiveNumberLabel: currentArchive.archive.archiveNumberLabel,
      belongingDefinitions: opening.belongingDefinitions,
    },
  })
  let confirmedTurnCount = 0
  for (const turn of history.turns) {
    const resolution = turn.resolution
    if ('confirmedTurn' in resolution) {
      const confirmedTurn = { ...resolution.confirmedTurn, resultingStateVersion: resolution.confirmedTurn.resultingStateVersion - versionOffset }
      if ('attemptRecord' in resolution) {
        apply({ kind: 'interactive_piece_attempt_confirmed', attemptResolution: { ...resolution, confirmedTurn } })
      } else {
        apply({ kind: 'archive_turn_confirmed', confirmedTurn })
      }
      if (!state.wasTurnConfirmed) {
        throw new Error('archive_recovery_conflict')
      }
      confirmedTurnCount += 1
    } else if ('questionEntry' in resolution) {
      apply({ kind: 'director_question_recorded', investigatorEntry: resolution.investigatorEntry, questionEntry: resolution.questionEntry })
    } else if ('assistanceRecord' in resolution) {
      apply({ kind: 'interactive_piece_assistance_confirmed', interactivePieceIdentifier: resolution.interactivePieceIdentifier, assistanceRecord: resolution.assistanceRecord })
    }
  }
  if (state.archiveRun.stateVersion !== serverRun.stateVersion - versionOffset) {
    throw new Error('archive_recovery_conflict')
  }
  return { archiveRun: state.archiveRun, investigator: state.investigator, confirmedTurnCount }
}

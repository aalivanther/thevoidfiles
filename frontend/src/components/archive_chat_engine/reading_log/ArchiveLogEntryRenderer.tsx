import type {
  ArchiveLogEntry,
  InteractivePiecePublicDefinition,
  InteractivePieceRuntimeState,
} from '../../../game_state/archive_turn_contract'
import { InteractivePieceSlot } from '../interactive_pieces/InteractivePieceSlot'
import { CharacterDialogueBlock } from './voices/CharacterDialogueBlock'
import { DirectorNarrationBlock } from './voices/DirectorNarrationBlock'
import { DirectorQuestionBlock } from './voices/DirectorQuestionBlock'
import { InnerThoughtBlock } from './voices/InnerThoughtBlock'
import { InvestigatorEntryBlock } from './voices/InvestigatorEntryBlock'
import { SystemNoticeBlock } from './voices/SystemNoticeBlock'
import { TurnConsequenceSummaryBlock } from './voices/TurnConsequenceSummaryBlock'

export type ArchiveLogEntryRendererProperties = {
  logEntry: ArchiveLogEntry
  interactivePiecePublicDefinitions: Record<string, InteractivePiecePublicDefinition>
  interactivePieceRuntimeStates: Record<string, InteractivePieceRuntimeState>
  isReadOnly: boolean
  onPersonDetailRequested: (personIdentifier: string) => void
  onRevealProgressed: () => void
}

export function ArchiveLogEntryRenderer({
  logEntry,
  interactivePiecePublicDefinitions,
  interactivePieceRuntimeStates,
  isReadOnly,
  onPersonDetailRequested,
  onRevealProgressed,
}: ArchiveLogEntryRendererProperties) {
  switch (logEntry.voice) {
    case 'director_narration':
      return <DirectorNarrationBlock narrationEntry={logEntry} onRevealProgressed={onRevealProgressed} />
    case 'character_dialogue':
      return (
        <CharacterDialogueBlock
          dialogueEntry={logEntry}
          isReadOnly={isReadOnly}
          onPersonDetailRequested={onPersonDetailRequested}
          onRevealProgressed={onRevealProgressed}
        />
      )
    case 'inner_thought':
      return <InnerThoughtBlock thoughtEntry={logEntry} onRevealProgressed={onRevealProgressed} />
    case 'system_notice':
      return <SystemNoticeBlock noticeEntry={logEntry} />
    case 'director_question':
      return <DirectorQuestionBlock questionEntry={logEntry} isReadOnly={isReadOnly} />
    case 'investigator_entry':
      return (
        <InvestigatorEntryBlock
          declaredSteps={logEntry.attemptedSteps.map((attemptedStep) => ({
            stepKey: String(attemptedStep.stepNumber),
            stepNumber: attemptedStep.stepNumber,
            actionText: attemptedStep.actionText,
            conditionText: attemptedStep.conditionText,
            compositionOriginName: attemptedStep.compositionOriginName,
          }))}
          declaredPlanStepCount={logEntry.declaredPlanStepCount}
          declarationStatusName="confirmed"
        />
      )
    case 'consequence_receipt':
    case 'relationship_pulse':
      return (
        <TurnConsequenceSummaryBlock logEntry={logEntry} isReadOnly={isReadOnly} onPersonDetailRequested={onPersonDetailRequested} />
      )
    case 'interactive_piece_anchor': {
      const publicDefinition = interactivePiecePublicDefinitions[logEntry.interactivePieceIdentifier]
      const runtimeState = interactivePieceRuntimeStates[logEntry.interactivePieceIdentifier]
      return publicDefinition && runtimeState ? (
        <InteractivePieceSlot publicDefinition={publicDefinition} runtimeState={runtimeState} isReadOnly={isReadOnly} />
      ) : null
    }
  }
}

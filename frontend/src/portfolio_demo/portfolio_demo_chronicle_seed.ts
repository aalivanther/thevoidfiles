import type { AiConfigurationRecord } from '../components/ai_configuration/ai_configuration_record'
import { deriveInvestigatorAttributesFromAnswers, evaluationVignettes } from '../demonstration/investigator_evaluation_script'
import { createInitialChronicleState, reduceChronicleState } from '../game_state/chronicle_state'
import { namelessInvestigatorRoleName } from './nameless_investigator_wording'
import type { ChronicleState, ChronicleStateChange, InvestigatorRegistration } from '../game_state/chronicle_state'

export const portfolioDemoInvestigatorRegistration: InvestigatorRegistration = {
  fullName: namelessInvestigatorRoleName,
  gender: 'undisclosed',
  birthDate: { day: 12, month: 3, year: 1991 },
  originPlace: 'Veracruz',
  residencePlace: 'Ciudad de México',
  relationalAnchor: { kind: 'uprooted' },
}

const portfolioDemoAiConfigurationRecord: AiConfigurationRecord = {
  recordVersion: 1,
  wasSkipped: true,
  handledAtTimestamp: '2026-10-20T00:00:00.000Z',
  story: null,
  voice: null,
}

export function composePortfolioDemoChronicleState(): ChronicleState {
  const firstAnswerOfEveryVignette = evaluationVignettes.map((evaluationVignette) => ({
    evaluationVignette,
    evaluationAnswer: evaluationVignette.answers[0],
  }))
  const seedingChanges: ChronicleStateChange[] = [
    { kind: 'ai_configuration_handled', aiConfiguration: portfolioDemoAiConfigurationRecord },
    { kind: 'registration_completed', investigatorRegistration: portfolioDemoInvestigatorRegistration },
    { kind: 'evaluation_completed', investigatorAttributes: deriveInvestigatorAttributesFromAnswers(firstAnswerOfEveryVignette) },
    { kind: 'origin_narration_witnessed' },
    { kind: 'threshold_narration_witnessed' },
    { kind: 'oicnau_stance_chosen', oicnauStance: 'sanctioned_operative' },
    { kind: 'oicnau_contact_concluded' },
  ]
  return seedingChanges.reduce(reduceChronicleState, createInitialChronicleState())
}

import { createContext, useContext } from 'react'
import type { PlannedActionStep } from '../../../game_state/archive_turn_contract'

export type PendingInvestigatorDeclaration = {
  declarationKey: string
  declaredPlanSteps: PlannedActionStep[]
  declaredPlanStepCount: number
  alreadyExecutedStepCount: number
  hasDirectorFailedToAnswer: boolean
}

export const PendingInvestigatorDeclarationContext = createContext<PendingInvestigatorDeclaration | null>(null)

export function usePendingInvestigatorDeclaration(): PendingInvestigatorDeclaration | null {
  return useContext(PendingInvestigatorDeclarationContext)
}

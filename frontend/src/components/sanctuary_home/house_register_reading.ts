import { readBelongingVisibleName } from '../../demonstration/demonstration_case_script'
import type { InvestigatorCondition } from '../../game_state/archive_turn_contract'
import { maximumCaseEffort } from '../../game_state/archive_run_state'
import type { ArchiveRunState } from '../../game_state/archive_run_state'
import { formatWorldClock } from '../../game_state/chronicle_state'
import type { InvestigatorState } from '../../game_state/chronicle_state'

export type HouseRegisterKitLine = {
  belongingIdentifier: string
  visibleName: string
  units: number
}

export type HouseRegisterReading = {
  isCaseOpen: boolean
  placeName: string
  clockLabel: string | null
  seriousWoundCount: number
  lastSeriousWoundCauseText: string | null
  activeConditions: InvestigatorCondition[]
  effortRemaining: number | null
  maximumEffort: number
  operationalFunds: number
  personalFunds: number
  carriedKit: HouseRegisterKitLine[]
}

export function readHouseRegister({
  isCaseOpen,
  investigator,
  archiveRun,
  personalFunds,
}: {
  isCaseOpen: boolean
  investigator: InvestigatorState
  archiveRun: ArchiveRunState
  personalFunds: number
}): HouseRegisterReading {
  const carriedKit = Object.entries(investigator.belongingUnits)
    .flatMap(([belongingIdentifier, units]) =>
      typeof units === 'number' && units > 0
        ? [
            {
              belongingIdentifier,
              visibleName: readBelongingVisibleName(belongingIdentifier, archiveRun.belongingDefinitions),
              units,
            },
          ]
        : [],
    )
    .sort((leftLine, rightLine) => leftLine.visibleName.localeCompare(rightLine.visibleName, 'es'))

  return {
    isCaseOpen,
    placeName: investigator.placeName,
    clockLabel: isCaseOpen ? formatWorldClock(investigator.worldClockMinutes) : null,
    seriousWoundCount: Math.max(0, investigator.seriousWoundsSuffered),
    lastSeriousWoundCauseText:
      investigator.seriousWoundsSuffered > 0 ? archiveRun.lastSeriousWoundCauseText : null,
    activeConditions: archiveRun.activeConditions,
    effortRemaining: isCaseOpen ? archiveRun.effortRemaining : null,
    maximumEffort: maximumCaseEffort,
    operationalFunds: investigator.operationalFunds,
    personalFunds,
    carriedKit,
  }
}

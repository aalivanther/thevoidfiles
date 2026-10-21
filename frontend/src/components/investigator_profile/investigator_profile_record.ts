import {
  demonstrationNarrativeConnection,
  demonstrationVoiceConnection,
} from '../../demonstration/investigator_profile_data'
import type { ProfileConnection, ProfileConnectionIdentifier } from '../../demonstration/investigator_profile_data'

export type ProfileSectionName = 'connections' | 'investigators' | 'chronicle_threads'

export type ContinuationSelection = {
  threadIdentifier: string
  saveIdentifier: string | null
}

export type InvestigatorProfileRecord = {
  lastVisitedSectionName: ProfileSectionName
  continuationSelection: ContinuationSelection | null
}

const investigatorProfileRecordStorageKey = 'the_void_files_investigator_profile_record'

const emptyInvestigatorProfileRecord: InvestigatorProfileRecord = {
  lastVisitedSectionName: 'connections',
  continuationSelection: null,
}

function isProfileSectionName(candidate: unknown): candidate is ProfileSectionName {
  return candidate === 'connections' || candidate === 'investigators' || candidate === 'chronicle_threads'
}

function readContinuationSelection(candidate: unknown): ContinuationSelection | null {
  if (typeof candidate !== 'object' || candidate === null) {
    return null
  }
  const possibleSelection = candidate as Partial<ContinuationSelection>
  if (typeof possibleSelection.threadIdentifier !== 'string') {
    return null
  }
  return {
    threadIdentifier: possibleSelection.threadIdentifier,
    saveIdentifier: typeof possibleSelection.saveIdentifier === 'string' ? possibleSelection.saveIdentifier : null,
  }
}

export function readStoredInvestigatorProfileRecord(): InvestigatorProfileRecord {
  try {
    const storedText = window.localStorage.getItem(investigatorProfileRecordStorageKey)
    if (!storedText) {
      return emptyInvestigatorProfileRecord
    }
    const parsedCandidate: unknown = JSON.parse(storedText)
    if (typeof parsedCandidate !== 'object' || parsedCandidate === null) {
      return emptyInvestigatorProfileRecord
    }
    const possibleRecord = parsedCandidate as Partial<Record<keyof InvestigatorProfileRecord, unknown>>
    return {
      lastVisitedSectionName: isProfileSectionName(possibleRecord.lastVisitedSectionName)
        ? possibleRecord.lastVisitedSectionName
        : 'connections',
      continuationSelection: readContinuationSelection(possibleRecord.continuationSelection),
    }
  } catch {
    return emptyInvestigatorProfileRecord
  }
}

export function storeInvestigatorProfileRecord(investigatorProfileRecord: InvestigatorProfileRecord) {
  try {
    window.localStorage.setItem(investigatorProfileRecordStorageKey, JSON.stringify(investigatorProfileRecord))
  } catch {
    return
  }
}

export function isChronicleStorageUsable(): boolean {
  try {
    const probeKey = `${investigatorProfileRecordStorageKey}_probe`
    window.localStorage.setItem(probeKey, '1')
    window.localStorage.removeItem(probeKey)
    return true
  } catch {
    return false
  }
}

export function isBrowserSpeechUsable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function readConfiguredRole(
  roleCandidate: unknown,
  connectionIdentifier: ProfileConnectionIdentifier,
): ProfileConnection | null {
  if (typeof roleCandidate !== 'object' || roleCandidate === null) {
    return null
  }
  const possibleRole = roleCandidate as Record<string, unknown>
  if (typeof possibleRole.providerName !== 'string' || typeof possibleRole.optionName !== 'string') {
    return null
  }
  return {
    connectionIdentifier,
    providerName: possibleRole.providerName,
    optionName: possibleRole.optionName,
    maskedAccessKeyEnding: typeof possibleRole.maskedAccessKeyEnding === 'string' ? possibleRole.maskedAccessKeyEnding : null,
    connectionStateName: 'connected',
  }
}

export function readProfileConnections(aiConfigurationCandidate: unknown): ProfileConnection[] {
  const possibleConfiguration =
    typeof aiConfigurationCandidate === 'object' && aiConfigurationCandidate !== null
      ? (aiConfigurationCandidate as Record<string, unknown>)
      : {}
  return [
    readConfiguredRole(possibleConfiguration.story, 'narrative_intelligence') ?? demonstrationNarrativeConnection,
    readConfiguredRole(possibleConfiguration.voice, 'voice_intelligence') ?? demonstrationVoiceConnection,
  ]
}

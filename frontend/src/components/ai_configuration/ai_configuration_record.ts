import { minimumAccessKeyLength } from '../../demonstration/ai_configuration_data'
import type { AiProviderDefinition } from '../../demonstration/ai_configuration_data'

export type AiRoleSelection = {
  providerIdentifier: string | null
  optionIdentifier: string | null
  optionName: string | null
  accessKey: string
  wasConnectionCheckCompleted: boolean
}

export type AiRoleRecord = {
  providerIdentifier: string
  providerName: string
  optionIdentifier: string
  optionName: string
  maskedAccessKeyEnding: string | null
  connectionCheck: 'simulated' | 'real_browser_speech' | 'real_local_service' | 'not_run'
}

export type AiConfigurationRecord = {
  recordVersion: 1
  wasSkipped: boolean
  handledAtTimestamp: string
  story: AiRoleRecord | null
  voice: AiRoleRecord | null
}

export const emptyAiRoleSelection: AiRoleSelection = {
  providerIdentifier: null,
  optionIdentifier: null,
  optionName: null,
  accessKey: '',
  wasConnectionCheckCompleted: false,
}

export function maskAccessKeyEnding(accessKey: string): string | null {
  const trimmedAccessKey = accessKey.trim()
  if (trimmedAccessKey.length < minimumAccessKeyLength) {
    return null
  }
  return `••••${trimmedAccessKey.slice(-4)}`
}

export function isAccessKeyAcceptable(accessKey: string): boolean {
  return accessKey.trim().length >= minimumAccessKeyLength
}

export function isAiRoleSelectionComplete(
  roleSelection: AiRoleSelection,
  providerDefinition: AiProviderDefinition | null,
): boolean {
  if (!providerDefinition || roleSelection.optionIdentifier === null) {
    return false
  }
  return !providerDefinition.requiresAccessKey || isAccessKeyAcceptable(roleSelection.accessKey)
}

export function buildAiRoleRecord(
  roleSelection: AiRoleSelection,
  providerDefinition: AiProviderDefinition | null,
  providerName: string,
): AiRoleRecord | null {
  if (
    !providerDefinition ||
    roleSelection.optionIdentifier === null ||
    roleSelection.optionName === null ||
    !isAiRoleSelectionComplete(roleSelection, providerDefinition)
  ) {
    return null
  }
  return {
    providerIdentifier: providerDefinition.providerIdentifier,
    providerName,
    optionIdentifier: roleSelection.optionIdentifier,
    optionName: roleSelection.optionName,
    maskedAccessKeyEnding: providerDefinition.requiresAccessKey ? maskAccessKeyEnding(roleSelection.accessKey) : null,
    connectionCheck: !roleSelection.wasConnectionCheckCompleted
      ? 'not_run'
      : providerDefinition.usesBrowserSpeech
        ? 'real_browser_speech'
        : 'simulated',
  }
}

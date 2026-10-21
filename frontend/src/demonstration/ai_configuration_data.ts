export type AiRoleName = 'story' | 'voice'

export type AiProviderOption = {
  optionIdentifier: string
  optionName: string
}

export type AiProviderDefinition = {
  providerIdentifier: string
  requiresAccessKey: boolean
  usesBrowserSpeech: boolean
  providerOptions: readonly AiProviderOption[]
}

export const browserDefaultVoiceOptionIdentifier = 'browser_default_voice'
export const minimumAccessKeyLength = 12
export const shortestSimulatedCheckMilliseconds = 1500
export const longestSimulatedCheckMilliseconds = 2600

export const storyProviderDefinitions: readonly AiProviderDefinition[] = [
  {
    providerIdentifier: 'anthropic_claude',
    requiresAccessKey: true,
    usesBrowserSpeech: false,
    providerOptions: [
      { optionIdentifier: 'claude_opus', optionName: 'Claude Opus' },
      { optionIdentifier: 'claude_sonnet', optionName: 'Claude Sonnet' },
      { optionIdentifier: 'claude_haiku', optionName: 'Claude Haiku' },
    ],
  },
  {
    providerIdentifier: 'google_gemini',
    requiresAccessKey: true,
    usesBrowserSpeech: false,
    providerOptions: [
      { optionIdentifier: 'gemini_pro', optionName: 'Gemini Pro' },
      { optionIdentifier: 'gemini_flash', optionName: 'Gemini Flash' },
    ],
  },
  {
    providerIdentifier: 'openai',
    requiresAccessKey: true,
    usesBrowserSpeech: false,
    providerOptions: [
      { optionIdentifier: 'gpt_flagship', optionName: 'GPT-5' },
      { optionIdentifier: 'gpt_compact', optionName: 'GPT-5 mini' },
    ],
  },
  {
    providerIdentifier: 'local_compatible_model',
    requiresAccessKey: false,
    usesBrowserSpeech: false,
    providerOptions: [
      { optionIdentifier: 'local_llama', optionName: 'Llama 3.3 70B Instruct' },
      { optionIdentifier: 'local_qwen', optionName: 'Qwen 2.5 32B Instruct' },
      { optionIdentifier: 'local_mistral', optionName: 'Mistral Small 24B' },
    ],
  },
]

export const voiceProviderDefinitions: readonly AiProviderDefinition[] = [
  {
    providerIdentifier: 'elevenlabs',
    requiresAccessKey: true,
    usesBrowserSpeech: false,
    providerOptions: [
      { optionIdentifier: 'eleven_multilingual', optionName: 'Eleven Multilingual v2' },
      { optionIdentifier: 'eleven_turbo', optionName: 'Eleven Turbo v2.5' },
      { optionIdentifier: 'eleven_flash', optionName: 'Eleven Flash v2.5' },
    ],
  },
  {
    providerIdentifier: 'google_cloud_text_to_speech',
    requiresAccessKey: true,
    usesBrowserSpeech: false,
    providerOptions: [
      { optionIdentifier: 'google_neural_us_b', optionName: 'es-US-Neural2-B' },
      { optionIdentifier: 'google_neural_us_a', optionName: 'es-US-Neural2-A' },
      { optionIdentifier: 'google_neural_es_f', optionName: 'es-ES-Neural2-F' },
    ],
  },
  {
    providerIdentifier: 'azure_speech',
    requiresAccessKey: true,
    usesBrowserSpeech: false,
    providerOptions: [
      { optionIdentifier: 'azure_jorge', optionName: 'es-MX-JorgeNeural' },
      { optionIdentifier: 'azure_dalia', optionName: 'es-MX-DaliaNeural' },
      { optionIdentifier: 'azure_gonzalo', optionName: 'es-CO-GonzaloNeural' },
    ],
  },
  {
    providerIdentifier: 'browser_voice',
    requiresAccessKey: false,
    usesBrowserSpeech: true,
    providerOptions: [],
  },
]

export const providerDefinitionsByRoleName: Record<AiRoleName, readonly AiProviderDefinition[]> = {
  story: storyProviderDefinitions,
  voice: voiceProviderDefinitions,
}

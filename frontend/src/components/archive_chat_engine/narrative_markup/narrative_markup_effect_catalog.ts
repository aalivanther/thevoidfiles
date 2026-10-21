export type NarrativeTextEffectName =
  | 'anomalous'
  | 'tremor'
  | 'heartbeat'
  | 'whisper'
  | 'shout'
  | 'struck_through'
  | 'redacted'
  | 'interference'
  | 'ink_bleed'
  | 'fading'
  | 'rewritten'
  | 'document_type'
  | 'pause'
  | 'slow_reveal'
  | 'fast_reveal'

export const narrativeTextEffectNameBySpanishTag: Readonly<Record<string, NarrativeTextEffectName>> = {
  anomala: 'anomalous',
  temblor: 'tremor',
  latido: 'heartbeat',
  susurro: 'whisper',
  grito: 'shout',
  tachado: 'struck_through',
  censura: 'redacted',
  interferencia: 'interference',
  tinta: 'ink_bleed',
  desvanece: 'fading',
  reescrito: 'rewritten',
  documento: 'document_type',
  pausa: 'pause',
  lento: 'slow_reveal',
  rapido: 'fast_reveal',
}

export const movingNarrativeTextEffectNames: readonly NarrativeTextEffectName[] = [
  'tremor',
  'heartbeat',
  'interference',
  'ink_bleed',
  'rewritten',
]

export const timedNarrativeTextEffectNames: readonly NarrativeTextEffectName[] = [
  'tremor',
  'heartbeat',
  'struck_through',
  'redacted',
  'interference',
  'ink_bleed',
  'fading',
  'rewritten',
]

export const longSpanNarrativeTextEffectNames: readonly NarrativeTextEffectName[] = [
  'document_type',
  'slow_reveal',
  'fast_reveal',
]

export const narrativeMarkupLimits = {
  maximumMarkedSpanContentLength: 160,
  maximumCombinedEffectCountPerSpan: 2,
  maximumSpanCharacterCount: 48,
  maximumLongSpanCharacterCount: 120,
  maximumMarkedSpanCountPerParagraph: 3,
  maximumMarkedSpanCountPerTurn: 6,
  maximumMovingEffectCountPerTurn: 2,
  maximumInterferenceCountPerTurn: 1,
  maximumPauseCountPerTurn: 3,
  maximumTotalPauseMillisecondsPerTurn: 3000,
  minimumPauseMilliseconds: 100,
  maximumPauseMilliseconds: 2000,
  minimumRedactedCharacterCount: 1,
  maximumRedactedCharacterCount: 40,
} as const

export const revealRateMultiplierByNarrativeTextEffectName: Partial<Record<NarrativeTextEffectName, number>> = {
  slow_reveal: 0.4,
  fast_reveal: 2,
}

export const playDurationMillisecondsByNarrativeTextEffectName: Partial<Record<NarrativeTextEffectName, number>> = {
  anomalous: 120,
  tremor: 400,
  heartbeat: 700,
  struck_through: 300,
  redacted: 360,
  interference: 300,
  ink_bleed: 700,
  fading: 500,
  rewritten: 600,
}

export const reducedMotionInterferenceOutlineMilliseconds = 1000

export const forbiddenInvisibleCodePointRanges: ReadonlyArray<readonly [number, number]> = [
  [0, 9],
  [11, 31],
  [127, 159],
  [8203, 8207],
  [8234, 8238],
  [8288, 8297],
  [65279, 65279],
]

export const redactedBlockCharacter = '█'

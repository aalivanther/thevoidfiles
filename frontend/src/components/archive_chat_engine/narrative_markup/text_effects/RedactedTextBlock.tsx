import { useEffect, useState } from 'react'
import { narrativeMarkupCopy } from '../../../../copy/archive_chat_engine/narrative_markup_copy'
import type { EffectPlaybackStateName } from './use_one_time_effect_playback'

export type RedactedTextBlockProperties = {
  visibleBlockCount: number
  playbackStateName: EffectPlaybackStateName
  shouldUseFullMotion: boolean
}

const unsettledGlyphs = Array.from('▚▞▙▟▛▜▖▗▘▝')
const glyphChangeIntervalMilliseconds = 60

function createUnsettledGlyphs(glyphCount: number): string[] {
  return Array.from({ length: glyphCount }, () => unsettledGlyphs[Math.floor(Math.random() * unsettledGlyphs.length)])
}

export function RedactedTextBlock({ visibleBlockCount, playbackStateName, shouldUseFullMotion }: RedactedTextBlockProperties) {
  const [unsettledGlyphsByCell, setUnsettledGlyphsByCell] = useState<string[]>([])
  const isSettling = playbackStateName === 'playing' && shouldUseFullMotion

  useEffect(() => {
    if (!isSettling) {
      return
    }
    const glyphIntervalIdentifier = window.setInterval(
      () => setUnsettledGlyphsByCell(createUnsettledGlyphs(visibleBlockCount)),
      glyphChangeIntervalMilliseconds,
    )
    return () => window.clearInterval(glyphIntervalIdentifier)
  }, [isSettling, visibleBlockCount])

  return (
    <span className="narrative-redacted-block" role="img" aria-label={narrativeMarkupCopy.redactedTextLabel}>
      {Array.from({ length: visibleBlockCount }, (_, cellIndex) => (
        <span
          key={cellIndex}
          className={`narrative-redacted-cell ${isSettling ? 'is-redacted-cell-unsettled' : ''}`}
          aria-hidden="true"
        >
          {isSettling ? (unsettledGlyphsByCell[cellIndex] ?? '') : ''}
        </span>
      ))}
    </span>
  )
}

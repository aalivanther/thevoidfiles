import type { CSSProperties } from 'react'
import { stagingCopy } from '../../../copy/archive_chat_engine/staging_copy'
import type { StagingEvent } from '../../../game_state/archive_turn_contract'
import type { StagingVariantChoice } from './staging_director'

export type StagedMoment = {
  occurrenceNumber: number
  variantChoice: StagingVariantChoice
  stagingEvent: StagingEvent | null
  usesScreenShake: boolean
  isScreenFlashGranted: boolean
  marginSideName: 'left' | 'right'
  randomisedStyle: CSSProperties
  onomatopoeiaText: string
  sceneChangeEyebrowText: string
  visibleMilliseconds: number
}

const crackPolylinePointsByVariantName: Record<string, string[]> = {
  cracked_panel: ['0,30 10,34 15,27 26,38 34,35', '0,52 8,49 18,58 29,55 36,64', '0,70 12,73 20,67'],
  forked_crack: ['50,0 47,14 55,22 50,36', '50,36 41,47 44,60', '50,36 60,44 57,58 64,69'],
  descending_crack: ['12,0 18,16 11,27 22,41 17,55 28,72 24,88'],
  radial_crack: ['50,50 38,31 41,18', '50,50 69,39 82,42', '50,50 61,68 58,84', '50,50 33,62 19,59'],
}

const inkStrokePathsByVariantName: Record<string, string[]> = {
  still_ink_stroke: ['M4 70 L62 34'],
  diagonal_stroke: ['M2 84 L96 16'],
  three_short_strokes: ['M6 30 L44 18', 'M12 54 L58 40', 'M4 80 L40 68'],
  ink_sweep: ['M0 78 C 24 40, 58 92, 100 30', 'M0 86 C 30 56, 60 98, 100 44'],
}

const watchingEyeCountByVariantName: Record<string, number> = { watching_eyes_pair: 1, many_eyes_blink: 5 }
const screenTearBandCount = 4

function renderCrackLines(variantName: string) {
  const crackPolylinePoints = crackPolylinePointsByVariantName[variantName]
  if (!crackPolylinePoints) {
    return null
  }
  return (
    <svg className="staging-crack-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
      {crackPolylinePoints.map((polylinePoints, crackIndex) => (
        <g key={polylinePoints} className="staging-crack-line-group" style={{ animationDelay: `${crackIndex * 90}ms` }}>
          <polyline className="staging-crack-line-shadow" points={polylinePoints} />
          <polyline className="staging-crack-line" points={polylinePoints} />
        </g>
      ))}
    </svg>
  )
}

function renderMomentContent(stagedMoment: StagedMoment) {
  const { variantChoice, stagingEvent } = stagedMoment
  const { momentName, variantName } = variantChoice

  if (momentName === 'attack_received') {
    const causedSeriousWound = stagingEvent?.kind === 'attack_received' && stagingEvent.causedSeriousWound
    return (
      <>
        <div className="staging-impact-frame" />
        {variantName === 'cracked_panel' ? renderCrackLines(variantName) : null}
        {variantName === 'side_splatter' ? (
          <>
            <svg className="staging-blood-splatter" viewBox="0 0 100 100">
              <circle cx="38" cy="46" r="17" />
              <circle cx="61" cy="33" r="8" />
              <circle cx="66" cy="62" r="11" />
              <circle cx="24" cy="72" r="6" />
              <circle cx="80" cy="47" r="4" />
              <circle cx="47" cy="81" r="3.5" />
              <ellipse cx="50" cy="20" rx="3" ry="7" />
            </svg>
            <span className="staging-onomatopoeia display-title">{stagedMoment.onomatopoeiaText}</span>
          </>
        ) : null}
        {variantName === 'still_impact_mark' || variantName === 'dry_blow' ? <span className="staging-impact-mark" /> : null}
        {causedSeriousWound ? (
          <span className="staging-margin-stamp staging-serious-wound-stamp display-title">{stagingCopy.seriousWoundStampText}</span>
        ) : null}
      </>
    )
  }

  if (momentName === 'attack_delivered') {
    return (
      <svg className="staging-ink-strokes" viewBox="0 0 100 100" preserveAspectRatio="none">
        {(inkStrokePathsByVariantName[variantName] ?? inkStrokePathsByVariantName.still_ink_stroke).map((strokePath, strokeIndex) => (
          <path
            key={strokePath}
            className="staging-ink-stroke"
            d={strokePath}
            pathLength={1}
            style={{ animationDelay: `${strokeIndex * 110}ms` }}
          />
        ))}
      </svg>
    )
  }

  if (momentName === 'critical_failure') {
    return (
      <>
        <div className="staging-danger-frame" />
        {renderCrackLines(variantName)}
        <span className="staging-margin-stamp staging-critical-failure-stamp display-title">
          {stagingCopy.criticalFailureStampText}
        </span>
      </>
    )
  }

  if (momentName === 'mental_attack') {
    const rewrittenPastPhrase = stagingEvent?.kind === 'mental_attack' ? stagingEvent.rewrittenPastPhrase : null
    return (
      <>
        <div className="staging-arcane-closing-frame" />
        {variantName === 'returning_echo' ? (
          <>
            <div className="staging-arcane-echo-frame staging-arcane-echo-frame-first" />
            <div className="staging-arcane-echo-frame staging-arcane-echo-frame-second" />
          </>
        ) : null}
        {variantName === 'rewritten_memory' && rewrittenPastPhrase ? (
          <div className="staging-rewritten-memory-slip">
            <p className="staging-rewritten-memory-label">{stagingCopy.rewrittenMemoryFalseLabel}</p>
            <p className="staging-rewritten-memory-false-phrase">{rewrittenPastPhrase.falsePhraseText}</p>
            <p className="staging-rewritten-memory-label">{stagingCopy.rewrittenMemoryTrueLabel}</p>
            <p className="staging-rewritten-memory-true-phrase">{rewrittenPastPhrase.originalPhraseText}</p>
          </div>
        ) : null}
      </>
    )
  }

  if (momentName === 'anomaly_manifested') {
    const watchingEyeCount = watchingEyeCountByVariantName[variantName] ?? 0
    return (
      <>
        {variantName === 'arcane_margin_bleed' ? <div className="staging-arcane-margin-bleed" /> : null}
        {variantName === 'cold_corner_glyphs'
          ? stagingCopy.anomalousCornerGlyphTexts.map((glyphText, glyphIndex) => (
              <span key={glyphText} className="staging-cold-corner-glyph" data-corner-index={glyphIndex}>
                {glyphText}
              </span>
            ))
          : null}
        {Array.from({ length: watchingEyeCount }, (_, eyePairIndex) => (
          <span key={eyePairIndex} className="staging-watching-eyes" data-eye-pair-index={eyePairIndex}>
            <span className="staging-watching-eye">
              <span className="staging-watching-eye-pupil" />
            </span>
            <span className="staging-watching-eye">
              <span className="staging-watching-eye-pupil" />
            </span>
          </span>
        ))}
        {variantName === 'screen_tear_bands'
          ? Array.from({ length: screenTearBandCount }, (_, bandIndex) => (
              <span key={bandIndex} className="staging-screen-tear-band" data-band-index={bandIndex} />
            ))
          : null}
      </>
    )
  }

  if (momentName === 'scene_changed') {
    const resultingPlaceName = stagingEvent?.kind === 'scene_changed' ? stagingEvent.resultingPlaceName : ''
    return (
      <div className="staging-place-caption">
        <span className="staging-place-caption-eyebrow">{stagedMoment.sceneChangeEyebrowText}</span>
        <span className="staging-place-caption-name display-title">{resultingPlaceName}</span>
      </div>
    )
  }

  if (momentName === 'tension_rose') {
    return (
      <>
        <div className="staging-tension-frame" />
        {variantName === 'cold_breath_line' || variantName === 'thin_warning_line' ? <div className="staging-tension-line" /> : null}
      </>
    )
  }

  return null
}

export function StagedMomentScene({ stagedMoment }: { stagedMoment: StagedMoment }) {
  return (
    <div
      key={stagedMoment.occurrenceNumber}
      className="staged-moment-scene"
      data-staging-moment={stagedMoment.variantChoice.momentName}
      data-staging-variant={stagedMoment.variantChoice.variantName}
      data-staging-intensity={stagedMoment.variantChoice.intensityName}
      data-staging-side={stagedMoment.marginSideName}
      data-staging-shake={stagedMoment.usesScreenShake}
      data-staging-flash={stagedMoment.isScreenFlashGranted}
      style={stagedMoment.randomisedStyle}
    >
      {stagedMoment.isScreenFlashGranted ? <div className="staging-single-flash" /> : null}
      <div className="staged-moment-content">{renderMomentContent(stagedMoment)}</div>
    </div>
  )
}

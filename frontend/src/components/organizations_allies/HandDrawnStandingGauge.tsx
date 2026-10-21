import rough from 'roughjs'
import type { Drawable } from 'roughjs/bin/core'
import { useMemo, useState } from 'react'
import { chooseAnimationVariantName } from '../../animation/animation_variety'
import {
  highestDrawnRelationshipLevel,
  lieutenantMaximumRelationshipLevel,
  lieutenantMinimumRelationshipLevel,
} from '../../demonstration/organizations_allies_data'

const changeRevealVariantNames = ['ink_sweep', 'ink_stutter', 'ink_press', 'ink_scribble_in'] as const
const tallyRevealVariantNames = ['tally_struck_in_order', 'tally_dropped', 'tally_scratched'] as const

const handDrawnGenerator = rough.generator()

const gaugeTrackStart = 8
const gaugeLevelWidth = 20
const gaugeTrackTop = 16
const gaugeTrackHeight = 26
const gaugeDrawingWidth = gaugeTrackStart * 2 + gaugeLevelWidth * highestDrawnRelationshipLevel
const gaugeDrawingHeight = 66

function calculateStableDrawingSeed(stableText: string): number {
  let accumulatedHash = 23
  for (const textCharacter of stableText) {
    accumulatedHash = (accumulatedHash * 31 + (textCharacter.codePointAt(0) ?? 0)) % 2147483000
  }
  return accumulatedHash + 1
}

function readVisiblePathDefinitions(drawable: Drawable): string[] {
  return handDrawnGenerator
    .toPaths(drawable)
    .filter((pathInformation) => pathInformation.stroke !== 'none')
    .map((pathInformation) => pathInformation.d)
}

function calculateLevelEdge(level: number): number {
  return gaugeTrackStart + Math.min(Math.max(level, 0), highestDrawnRelationshipLevel) * gaugeLevelWidth
}

function drawHatchedSpan(firstLevel: number, lastLevel: number, drawingSeed: number, hachureAngle: number, hachureGap: number) {
  if (lastLevel <= firstLevel) {
    return []
  }
  return readVisiblePathDefinitions(
    handDrawnGenerator.rectangle(
      calculateLevelEdge(firstLevel) + 1,
      gaugeTrackTop + 2,
      calculateLevelEdge(lastLevel) - calculateLevelEdge(firstLevel) - 2,
      gaugeTrackHeight - 4,
      {
        seed: drawingSeed,
        stroke: 'none',
        fill: 'ink',
        fillStyle: 'hachure',
        hachureAngle,
        hachureGap,
        fillWeight: 1,
        roughness: 1.6,
      },
    ),
  )
}

type HandDrawnStandingGaugeProperties = {
  stableSeedText: string
  level: number
  previousLevel: number | null
}

export function HandDrawnStandingGauge({ stableSeedText, level, previousLevel }: HandDrawnStandingGaugeProperties) {
  const [changeRevealVariantName] = useState(() =>
    chooseAnimationVariantName('factions_standing_gauge_reveal', changeRevealVariantNames),
  )
  const gaugeDrawing = useMemo(() => {
    const drawingSeed = calculateStableDrawingSeed(stableSeedText)
    const settledLevel = previousLevel === null ? level : Math.min(previousLevel, level)
    const changedUntilLevel = previousLevel === null ? level : Math.max(previousLevel, level)
    const tickPaths: string[] = []
    for (let tickLevel = 1; tickLevel < highestDrawnRelationshipLevel; tickLevel += 1) {
      const isMajorTick = tickLevel === lieutenantMinimumRelationshipLevel - 1 || tickLevel === lieutenantMaximumRelationshipLevel
      tickPaths.push(
        ...readVisiblePathDefinitions(
          handDrawnGenerator.line(
            calculateLevelEdge(tickLevel),
            gaugeTrackTop + gaugeTrackHeight,
            calculateLevelEdge(tickLevel),
            gaugeTrackTop + gaugeTrackHeight + (isMajorTick ? 9 : 5),
            { seed: drawingSeed + tickLevel, roughness: 0.8, bowing: 0.4 },
          ),
        ),
      )
    }
    return {
      outlinePaths: readVisiblePathDefinitions(
        handDrawnGenerator.rectangle(gaugeTrackStart, gaugeTrackTop, gaugeLevelWidth * highestDrawnRelationshipLevel, gaugeTrackHeight, {
          seed: drawingSeed,
          roughness: 1.3,
          bowing: 0.8,
        }),
      ),
      lieutenantZonePaths: drawHatchedSpan(
        lieutenantMinimumRelationshipLevel - 1,
        lieutenantMaximumRelationshipLevel,
        drawingSeed + 40,
        62,
        7,
      ),
      lieutenantBracketPaths: readVisiblePathDefinitions(
        handDrawnGenerator.linearPath(
          [
            [calculateLevelEdge(lieutenantMinimumRelationshipLevel - 1), gaugeTrackTop - 3],
            [calculateLevelEdge(lieutenantMinimumRelationshipLevel - 1), gaugeTrackTop - 9],
            [calculateLevelEdge(lieutenantMaximumRelationshipLevel), gaugeTrackTop - 9],
            [calculateLevelEdge(lieutenantMaximumRelationshipLevel), gaugeTrackTop - 3],
          ],
          { seed: drawingSeed + 41, roughness: 0.9, bowing: 0.5 },
        ),
      ),
      settledFillPaths: drawHatchedSpan(0, settledLevel, drawingSeed + 50, -41, 4.5),
      changedFillPaths: drawHatchedSpan(settledLevel, changedUntilLevel, drawingSeed + 60, -41, 4.5),
      changedCrossPaths: drawHatchedSpan(settledLevel, changedUntilLevel, drawingSeed + 61, 49, 6),
      tickPaths,
      markerPaths: readVisiblePathDefinitions(
        handDrawnGenerator.linearPath(
          [
            [calculateLevelEdge(level) - 6, gaugeTrackTop - 8],
            [calculateLevelEdge(level), gaugeTrackTop + 1],
            [calculateLevelEdge(level) + 6, gaugeTrackTop - 8],
          ],
          { seed: drawingSeed + 70, roughness: 0.7, bowing: 0.3 },
        ),
      ),
    }
  }, [stableSeedText, level, previousLevel])
  const changeDirectionName = previousLevel === null || previousLevel === level ? 'none' : level > previousLevel ? 'gained' : 'lost'

  return (
    <svg
      className="factions-standing-gauge"
      viewBox={`0 0 ${gaugeDrawingWidth} ${gaugeDrawingHeight}`}
      data-change-direction={changeDirectionName}
      data-change-reveal-variant={changeRevealVariantName}
      aria-hidden="true"
      focusable="false"
    >
      <g className="factions-standing-gauge-lieutenant-zone">
        {gaugeDrawing.lieutenantZonePaths.map((pathDefinition, pathIndex) => (
          <path key={pathIndex} d={pathDefinition} />
        ))}
        {gaugeDrawing.lieutenantBracketPaths.map((pathDefinition, pathIndex) => (
          <path key={`bracket-${pathIndex}`} d={pathDefinition} />
        ))}
      </g>
      <g className="factions-standing-gauge-settled-fill">
        {gaugeDrawing.settledFillPaths.map((pathDefinition, pathIndex) => (
          <path key={pathIndex} d={pathDefinition} />
        ))}
      </g>
      {changeDirectionName !== 'none' ? (
        <g className="factions-standing-gauge-changed-fill">
          {gaugeDrawing.changedFillPaths.map((pathDefinition, pathIndex) => (
            <path key={pathIndex} d={pathDefinition} />
          ))}
          {gaugeDrawing.changedCrossPaths.map((pathDefinition, pathIndex) => (
            <path key={`cross-${pathIndex}`} d={pathDefinition} />
          ))}
        </g>
      ) : null}
      <g className="factions-standing-gauge-outline">
        {gaugeDrawing.outlinePaths.map((pathDefinition, pathIndex) => (
          <path key={pathIndex} d={pathDefinition} />
        ))}
        {gaugeDrawing.tickPaths.map((pathDefinition, pathIndex) => (
          <path key={`tick-${pathIndex}`} d={pathDefinition} />
        ))}
      </g>
      <g className="factions-standing-gauge-marker">
        {gaugeDrawing.markerPaths.map((pathDefinition, pathIndex) => (
          <path key={pathIndex} d={pathDefinition} />
        ))}
      </g>
      <text className="factions-standing-gauge-numeral" x={gaugeTrackStart + gaugeLevelWidth / 2} y={gaugeDrawingHeight - 3}>
        1
      </text>
      <text
        className="factions-standing-gauge-numeral"
        x={calculateLevelEdge(lieutenantMinimumRelationshipLevel - 1) + gaugeLevelWidth / 2}
        y={gaugeDrawingHeight - 3}
      >
        {lieutenantMinimumRelationshipLevel}
      </text>
      <text
        className="factions-standing-gauge-numeral"
        x={calculateLevelEdge(highestDrawnRelationshipLevel) - gaugeLevelWidth / 2}
        y={gaugeDrawingHeight - 3}
      >
        {highestDrawnRelationshipLevel}+
      </text>
    </svg>
  )
}

type HandDrawnTallyMarksProperties = {
  stableSeedText: string
  markCount: number
  toneName: 'trust' | 'suspicion'
}

export function HandDrawnTallyMarks({ stableSeedText, markCount, toneName }: HandDrawnTallyMarksProperties) {
  const [tallyRevealVariantName] = useState(() => chooseAnimationVariantName('factions_tally_reveal', tallyRevealVariantNames))
  const drawnMarkCount = Math.min(markCount, 20)
  const tallyDrawing = useMemo(() => {
    const drawingSeed = calculateStableDrawingSeed(stableSeedText)
    const markPaths: string[][] = []
    for (let markIndex = 0; markIndex < drawnMarkCount; markIndex += 1) {
      const groupIndex = Math.floor(markIndex / 5)
      const positionInGroup = markIndex % 5
      const groupStart = 6 + groupIndex * 46
      markPaths.push(
        readVisiblePathDefinitions(
          positionInGroup === 4
            ? handDrawnGenerator.line(groupStart - 4, 25, groupStart + 34, 7, { seed: drawingSeed + markIndex, roughness: 1.1 })
            : handDrawnGenerator.line(groupStart + positionInGroup * 9, 5, groupStart + positionInGroup * 9 + 1, 27, {
                seed: drawingSeed + markIndex,
                roughness: 1.1,
                bowing: 1.4,
              }),
        ),
      )
    }
    return markPaths
  }, [stableSeedText, drawnMarkCount])
  const drawingWidth = Math.max(46, Math.ceil(Math.max(drawnMarkCount, 1) / 5) * 46 + 4)
  return (
    <svg
      className="factions-tally-marks"
      viewBox={`0 0 ${drawingWidth} 32`}
      style={{ width: `${drawingWidth * 0.9}px` }}
      data-tone-name={toneName}
      data-tally-reveal-variant={tallyRevealVariantName}
      aria-hidden="true"
      focusable="false"
    >
      {tallyDrawing.map((markPathDefinitions, markIndex) => (
        <g key={markIndex} className="factions-tally-mark" style={{ animationDelay: `${120 + markIndex * 110}ms` }}>
          {markPathDefinitions.map((pathDefinition, pathIndex) => (
            <path key={pathIndex} d={pathDefinition} />
          ))}
        </g>
      ))}
    </svg>
  )
}

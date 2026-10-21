import { memo, useMemo } from 'react'
import { worldAtlasCopy } from '../../copy/world_atlas_copy'
import {
  worldAtlasGridColumnLetters,
  worldAtlasGridSpacing,
  worldAtlasMapDimensions,
  worldAtlasSeaAreaPath,
} from '../../demonstration/world_atlas_data'
import { drawWorldAtlasTerrainSketch } from './world_atlas_sketch_drawing'

export const WorldAtlasSketchLayer = memo(function WorldAtlasSketchLayer() {
  const mapCopy = worldAtlasCopy.map
  const terrainSketch = useMemo(() => drawWorldAtlasTerrainSketch(), [])
  const gridRowCount = worldAtlasMapDimensions.height / worldAtlasGridSpacing

  return (
    <svg
      className="world-atlas-sketch-layer"
      width={worldAtlasMapDimensions.width}
      height={worldAtlasMapDimensions.height}
      viewBox={`0 0 ${worldAtlasMapDimensions.width} ${worldAtlasMapDimensions.height}`}
      aria-hidden="true"
      focusable="false"
    >
      <rect width={worldAtlasMapDimensions.width} height={worldAtlasMapDimensions.height} fill="#d9cfb8" />
      <path d={worldAtlasSeaAreaPath} fill="#c3bba4" />
      <path d={terrainSketch.seaHatchingPathData} className="world-atlas-sea-hatching" />
      <path d={terrainSketch.gridPathData} className="world-atlas-grid-line" />
      {worldAtlasGridColumnLetters.map((columnLetter, columnIndex) =>
        Array.from({ length: gridRowCount }, (_, rowIndex) => (
          <text
            key={`${columnLetter}-${rowIndex}`}
            x={columnIndex * worldAtlasGridSpacing + 6}
            y={rowIndex * worldAtlasGridSpacing + 15}
            className="world-atlas-grid-reference"
          >
            {`${columnLetter}${rowIndex + 1}`}
          </text>
        )),
      )}
      <path d={terrainSketch.sierraHatchingPathData} className="world-atlas-region-hatching" />
      <path d={terrainSketch.plainHatchingPathData} className="world-atlas-region-hatching" />
      {terrainSketch.riverPathData.map((riverPathData, riverOrder) => (
        <path key={`river-${riverOrder}`} d={riverPathData} className="world-atlas-river-line" />
      ))}
      {terrainSketch.coastEchoPathData.map((echoPathData, echoOrder) => (
        <path key={`echo-${echoOrder}`} d={echoPathData} className="world-atlas-coast-echo-line" />
      ))}
      <path d={terrainSketch.coastlinePathData} pathLength={1} className="world-atlas-coast-line" />
      {terrainSketch.roadPathData.map((roadPathData, roadOrder) => (
        <path key={`road-${roadOrder}`} d={roadPathData} className="world-atlas-road-line" />
      ))}
      <path d={terrainSketch.railwayPathData} className="world-atlas-railway-line" />
      <path d={terrainSketch.railwayTiePathData} className="world-atlas-railway-tie-line" />
      <path d={terrainSketch.mountainShadePathData} className="world-atlas-mountain-shade" />
      <path d={terrainSketch.mountainOutlinePathData} className="world-atlas-mountain-line" />
      <text x={330} y={560} className="world-atlas-region-label" transform="rotate(-78 330 560)">
        {mapCopy.seaLabel}
      </text>
      <text x={1150} y={720} className="world-atlas-region-label">
        {mapCopy.mountainLabel}
      </text>
      <text x={980} y={250} className="world-atlas-region-label">
        {mapCopy.plainLabel}
      </text>
      <g transform={`translate(${worldAtlasMapDimensions.width - 260} ${worldAtlasMapDimensions.height - 60})`}>
        <path d={terrainSketch.scaleBarPathData} className="world-atlas-scale-line" />
        <text x={0} y={26} className="world-atlas-grid-reference world-atlas-scale-label">
          {mapCopy.scaleBarLabel}
        </text>
        <text x={0} y={-16} className="world-atlas-grid-reference world-atlas-scale-label">
          {mapCopy.stylizedNotice}
        </text>
      </g>
    </svg>
  )
})

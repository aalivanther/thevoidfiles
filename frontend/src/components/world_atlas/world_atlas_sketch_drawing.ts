import rough from 'roughjs'
import type { Drawable, Options } from 'roughjs/bin/core'
import {
  worldAtlasCoastlinePath,
  worldAtlasGridSpacing,
  worldAtlasMapDimensions,
  worldAtlasMountainRidgePoints,
  worldAtlasPlainRegionOutlinePoints,
  worldAtlasPlaces,
  worldAtlasRailwayPath,
  worldAtlasResidenceMapPoint,
  worldAtlasRiverPaths,
  worldAtlasRoadPaths,
  worldAtlasSeaAreaPath,
  worldAtlasSierraRegionOutlinePoints,
  worldAtlasSketchSeed,
} from '../../demonstration/world_atlas_data'
import type { WorldAtlasMapPoint } from '../../demonstration/world_atlas_data'

export type WorldAtlasTerrainSketch = {
  seaHatchingPathData: string
  coastlinePathData: string
  coastEchoPathData: string[]
  gridPathData: string
  riverPathData: string[]
  roadPathData: string[]
  railwayPathData: string
  railwayTiePathData: string
  mountainOutlinePathData: string
  mountainShadePathData: string
  sierraHatchingPathData: string
  plainHatchingPathData: string
  scaleBarPathData: string
}

export type WorldAtlasRouteSketch = {
  pencilPathData: string
  startPoint: WorldAtlasMapPoint
  controlPoint: WorldAtlasMapPoint
  endPoint: WorldAtlasMapPoint
  routeLength: number
}

const sketchGenerator = rough.generator()
const inkColor = '#1b1813'

function sketchPathData(drawable: Drawable): string {
  return sketchGenerator
    .toPaths(drawable)
    .map((pathInformation) => pathInformation.d)
    .join(' ')
}

function seededOptions(seedOffset: number, options: Options): Options {
  return { stroke: inkColor, seed: worldAtlasSketchSeed + seedOffset, ...options }
}

function translatePathData(pathData: string, horizontalShift: number, verticalShift: number): string {
  let isHorizontalValue = true
  return pathData.replace(/-?\d+(\.\d+)?/g, (numberText) => {
    const shiftedValue = Number(numberText) + (isHorizontalValue ? horizontalShift : verticalShift)
    isHorizontalValue = !isHorizontalValue
    return String(shiftedValue)
  })
}

function outlineAsTuples(outlinePoints: WorldAtlasMapPoint[]): [number, number][] {
  return outlinePoints.map((outlinePoint) => [outlinePoint.horizontal, outlinePoint.vertical])
}

let cachedTerrainSketch: WorldAtlasTerrainSketch | null = null

export function drawWorldAtlasTerrainSketch(): WorldAtlasTerrainSketch {
  if (cachedTerrainSketch) {
    return cachedTerrainSketch
  }
  const gridLinePathData: string[] = []
  for (let horizontal = 0; horizontal <= worldAtlasMapDimensions.width; horizontal += worldAtlasGridSpacing) {
    gridLinePathData.push(
      sketchPathData(
        sketchGenerator.line(
          horizontal,
          0,
          horizontal,
          worldAtlasMapDimensions.height,
          seededOptions(100 + horizontal, { roughness: 0.7, bowing: 0.4, disableMultiStroke: true }),
        ),
      ),
    )
  }
  for (let vertical = 0; vertical <= worldAtlasMapDimensions.height; vertical += worldAtlasGridSpacing) {
    gridLinePathData.push(
      sketchPathData(
        sketchGenerator.line(
          0,
          vertical,
          worldAtlasMapDimensions.width,
          vertical,
          seededOptions(3100 + vertical, { roughness: 0.7, bowing: 0.4, disableMultiStroke: true }),
        ),
      ),
    )
  }

  const mountainOutlines: string[] = []
  const mountainShades: string[] = []
  worldAtlasMountainRidgePoints.forEach((ridgePoint, ridgeOrder) => {
    const peak: [number, number] = [ridgePoint.horizontal, ridgePoint.vertical - 16]
    const leftFoot: [number, number] = [ridgePoint.horizontal - 18, ridgePoint.vertical + 12]
    const rightFoot: [number, number] = [ridgePoint.horizontal + 18, ridgePoint.vertical + 12]
    const innerFoot: [number, number] = [ridgePoint.horizontal + 4, ridgePoint.vertical + 10]
    mountainOutlines.push(
      sketchPathData(
        sketchGenerator.linearPath([leftFoot, peak, rightFoot], seededOptions(500 + ridgeOrder, { roughness: 1.1, bowing: 1.4 })),
      ),
    )
    mountainShades.push(
      sketchPathData(
        sketchGenerator.polygon(
          [peak, rightFoot, innerFoot],
          seededOptions(540 + ridgeOrder, {
            stroke: 'none',
            fill: inkColor,
            fillStyle: 'hachure',
            hachureGap: 3.4,
            hachureAngle: -58,
            fillWeight: 0.9,
            roughness: 0.8,
          }),
        ),
      ),
    )
  })

  const scaleBarLength = 130
  const scaleBarSegments: [number, number, number, number][] = [
    [0, 0, scaleBarLength, 0],
    [0, -7, 0, 7],
    [scaleBarLength / 2, -4, scaleBarLength / 2, 4],
    [scaleBarLength, -7, scaleBarLength, 7],
  ]

  cachedTerrainSketch = {
    seaHatchingPathData: sketchPathData(
      sketchGenerator.path(
        worldAtlasSeaAreaPath,
        seededOptions(1, {
          stroke: 'none',
          fill: inkColor,
          fillStyle: 'hachure',
          hachureGap: 15,
          hachureAngle: -18,
          fillWeight: 1,
          roughness: 1.3,
          disableMultiStrokeFill: true,
        }),
      ),
    ),
    coastlinePathData: sketchPathData(
      sketchGenerator.path(worldAtlasCoastlinePath, seededOptions(2, { roughness: 1.7, bowing: 1.2 })),
    ),
    coastEchoPathData: [
      { horizontalShift: -10, verticalShift: 3 },
      { horizontalShift: -21, verticalShift: 6 },
      { horizontalShift: -34, verticalShift: 8 },
    ].map((echoShift, echoOrder) =>
      sketchPathData(
        sketchGenerator.path(
          translatePathData(worldAtlasCoastlinePath, echoShift.horizontalShift, echoShift.verticalShift),
          seededOptions(10 + echoOrder, { roughness: 2.1 + echoOrder * 0.5, bowing: 1, disableMultiStroke: true }),
        ),
      ),
    ),
    gridPathData: gridLinePathData.join(' '),
    riverPathData: worldAtlasRiverPaths.map((riverPath, riverOrder) =>
      sketchPathData(sketchGenerator.path(riverPath, seededOptions(20 + riverOrder, { roughness: 1.5, bowing: 1.6 }))),
    ),
    roadPathData: worldAtlasRoadPaths.map((roadPath, roadOrder) =>
      sketchPathData(
        sketchGenerator.path(roadPath, seededOptions(40 + roadOrder, { roughness: 1, bowing: 0.8, disableMultiStroke: true })),
      ),
    ),
    railwayPathData: sketchPathData(
      sketchGenerator.path(worldAtlasRailwayPath, seededOptions(60, { roughness: 0.8, bowing: 0.5 })),
    ),
    railwayTiePathData: sketchPathData(
      sketchGenerator.path(worldAtlasRailwayPath, seededOptions(61, { roughness: 0.5, bowing: 0.3, disableMultiStroke: true })),
    ),
    mountainOutlinePathData: mountainOutlines.join(' '),
    mountainShadePathData: mountainShades.join(' '),
    sierraHatchingPathData: sketchPathData(
      sketchGenerator.polygon(
        outlineAsTuples(worldAtlasSierraRegionOutlinePoints),
        seededOptions(70, {
          stroke: 'none',
          fill: inkColor,
          fillStyle: 'cross-hatch',
          hachureGap: 17,
          hachureAngle: 32,
          fillWeight: 0.8,
          roughness: 1.6,
          disableMultiStrokeFill: true,
        }),
      ),
    ),
    plainHatchingPathData: sketchPathData(
      sketchGenerator.polygon(
        outlineAsTuples(worldAtlasPlainRegionOutlinePoints),
        seededOptions(71, {
          stroke: 'none',
          fill: inkColor,
          fillStyle: 'dashed',
          hachureGap: 22,
          hachureAngle: 4,
          dashOffset: 16,
          dashGap: 20,
          fillWeight: 0.9,
          roughness: 1.2,
          disableMultiStrokeFill: true,
        }),
      ),
    ),
    scaleBarPathData: scaleBarSegments
      .map((segment, segmentOrder) =>
        sketchPathData(
          sketchGenerator.line(
            segment[0],
            segment[1],
            segment[2],
            segment[3],
            seededOptions(80 + segmentOrder, { roughness: 0.8, bowing: 0.6 }),
          ),
        ),
      )
      .join(' '),
  }
  return cachedTerrainSketch
}

const cachedLocationRingPathDataByPlaceIdentifier = new Map<string, string>()

export function drawWorldAtlasLocationRing(placeIdentifier: string, mapPoint: WorldAtlasMapPoint): string {
  const cachedPathData = cachedLocationRingPathDataByPlaceIdentifier.get(placeIdentifier)
  if (cachedPathData) {
    return cachedPathData
  }
  const placeOrder = Math.max(0, worldAtlasPlaces.findIndex((place) => place.identifier === placeIdentifier))
  const ringPathData = [
    sketchPathData(
      sketchGenerator.circle(mapPoint.horizontal, mapPoint.vertical, 9, seededOptions(200 + placeOrder, { roughness: 0.9 })),
    ),
    sketchPathData(
      sketchGenerator.line(
        mapPoint.horizontal - 7,
        mapPoint.vertical,
        mapPoint.horizontal + 7,
        mapPoint.vertical,
        seededOptions(220 + placeOrder, { roughness: 0.8, disableMultiStroke: true }),
      ),
    ),
    sketchPathData(
      sketchGenerator.line(
        mapPoint.horizontal,
        mapPoint.vertical - 7,
        mapPoint.horizontal,
        mapPoint.vertical + 7,
        seededOptions(240 + placeOrder, { roughness: 0.8, disableMultiStroke: true }),
      ),
    ),
  ].join(' ')
  cachedLocationRingPathDataByPlaceIdentifier.set(placeIdentifier, ringPathData)
  return ringPathData
}

const cachedDestinationStampPathDataByPlaceIdentifier = new Map<string, string>()

export function drawWorldAtlasDestinationStamp(placeIdentifier: string, mapPoint: WorldAtlasMapPoint): string {
  const cachedPathData = cachedDestinationStampPathDataByPlaceIdentifier.get(placeIdentifier)
  if (cachedPathData) {
    return cachedPathData
  }
  const placeOrder = Math.max(0, worldAtlasPlaces.findIndex((place) => place.identifier === placeIdentifier))
  const stampPathData = sketchPathData(
    sketchGenerator.ellipse(
      mapPoint.horizontal,
      mapPoint.vertical - 2,
      44,
      36,
      seededOptions(300 + placeOrder, { roughness: 1.9, bowing: 2 }),
    ),
  )
  cachedDestinationStampPathDataByPlaceIdentifier.set(placeIdentifier, stampPathData)
  return stampPathData
}

const cachedRouteSketchByPlaceIdentifier = new Map<string, WorldAtlasRouteSketch>()

export function drawWorldAtlasRouteSketch(placeIdentifier: string, destinationPoint: WorldAtlasMapPoint): WorldAtlasRouteSketch {
  const cachedRouteSketch = cachedRouteSketchByPlaceIdentifier.get(placeIdentifier)
  if (cachedRouteSketch) {
    return cachedRouteSketch
  }
  const placeOrder = Math.max(0, worldAtlasPlaces.findIndex((place) => place.identifier === placeIdentifier))
  const startPoint = worldAtlasResidenceMapPoint
  const horizontalSpan = destinationPoint.horizontal - startPoint.horizontal
  const verticalSpan = destinationPoint.vertical - startPoint.vertical
  const straightLength = Math.max(1, Math.hypot(horizontalSpan, verticalSpan))
  const bendDirection = placeOrder % 2 === 0 ? 1 : -1
  const bendDepth = straightLength * 0.16 * bendDirection
  const controlPoint = {
    horizontal: startPoint.horizontal + horizontalSpan / 2 + (-verticalSpan / straightLength) * bendDepth,
    vertical: startPoint.vertical + verticalSpan / 2 + (horizontalSpan / straightLength) * bendDepth,
  }
  const routeSketch: WorldAtlasRouteSketch = {
    pencilPathData: sketchPathData(
      sketchGenerator.path(
        `M ${startPoint.horizontal} ${startPoint.vertical} Q ${controlPoint.horizontal} ${controlPoint.vertical} ${destinationPoint.horizontal} ${destinationPoint.vertical}`,
        seededOptions(400 + placeOrder, { roughness: 1.4, bowing: 1, disableMultiStroke: true }),
      ),
    ),
    startPoint,
    controlPoint,
    endPoint: destinationPoint,
    routeLength: straightLength * 1.05,
  }
  cachedRouteSketchByPlaceIdentifier.set(placeIdentifier, routeSketch)
  return routeSketch
}

export function locatePointAlongRoute(routeSketch: WorldAtlasRouteSketch, routeFraction: number) {
  const remainingFraction = 1 - routeFraction
  const horizontal =
    remainingFraction * remainingFraction * routeSketch.startPoint.horizontal +
    2 * remainingFraction * routeFraction * routeSketch.controlPoint.horizontal +
    routeFraction * routeFraction * routeSketch.endPoint.horizontal
  const vertical =
    remainingFraction * remainingFraction * routeSketch.startPoint.vertical +
    2 * remainingFraction * routeFraction * routeSketch.controlPoint.vertical +
    routeFraction * routeFraction * routeSketch.endPoint.vertical
  const horizontalTangent =
    2 * remainingFraction * (routeSketch.controlPoint.horizontal - routeSketch.startPoint.horizontal) +
    2 * routeFraction * (routeSketch.endPoint.horizontal - routeSketch.controlPoint.horizontal)
  const verticalTangent =
    2 * remainingFraction * (routeSketch.controlPoint.vertical - routeSketch.startPoint.vertical) +
    2 * routeFraction * (routeSketch.endPoint.vertical - routeSketch.controlPoint.vertical)
  return { horizontal, vertical, angleDegrees: (Math.atan2(verticalTangent, horizontalTangent) * 180) / Math.PI }
}

const cachedSearchRadiusPathDataByRadius = new Map<number, string>()

export function drawWorldAtlasSearchRadiusCircle(radiusMapUnits: number): string {
  const cachedPathData = cachedSearchRadiusPathDataByRadius.get(radiusMapUnits)
  if (cachedPathData) {
    return cachedPathData
  }
  const circlePathData = sketchPathData(
    sketchGenerator.circle(
      worldAtlasResidenceMapPoint.horizontal,
      worldAtlasResidenceMapPoint.vertical,
      radiusMapUnits * 2,
      seededOptions(90, { roughness: 1.1, bowing: 0.6, disableMultiStroke: true, curveFitting: 0.98 }),
    ),
  )
  cachedSearchRadiusPathDataByRadius.set(radiusMapUnits, circlePathData)
  return circlePathData
}

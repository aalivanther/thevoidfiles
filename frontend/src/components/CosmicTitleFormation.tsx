import { useEffect, useRef } from 'react'

export type CosmicFormationPhase = 'solitary_particle' | 'slow_gathering' | 'expansion' | 'title_formation'

type CosmicParticle = {
  horizontalPosition: number
  verticalPosition: number
  horizontalVelocity: number
  verticalVelocity: number
  targetHorizontalPosition: number
  targetVerticalPosition: number
  hasTitleTarget: boolean
  isAccentColored: boolean
  isArcaneColored: boolean
  size: number
  twinkleOffset: number
  gatheringJoinDelayMilliseconds: number
  gatheringRestingDistance: number
  gatheringRestingAngle: number
  gatheringSwirlDirection: number
}

type CosmicTitleFormationProperties = {
  formationPhase: CosmicFormationPhase
  upperTitleLine: string
  lowerTitleLine: string
  onCriticalMassReached: () => void
  onFormationSettled: () => void
  onAnimationUnavailable: () => void
}

const paperColor = '232, 230, 225'
const accentColor = '200, 30, 58'
const arcaneColor = '94, 230, 208'
const expansionDurationMilliseconds = 1700
const formationDurationMilliseconds = 2300
const animationAvailabilityProbeMilliseconds = 700
const shortestGatheringMilliseconds = 5200
const longestGatheringMilliseconds = 8400
const solitaryParticleArrivalMilliseconds = 1400
const awakeningRippleMilliseconds = 1300

type SolitaryParticleFlare = {
  startTimestamp: number
  attackMilliseconds: number
  decayMilliseconds: number
  strength: number
  hasDiagonalRays: boolean
}

type SolitaryParticleDimming = {
  startTimestamp: number
  durationMilliseconds: number
  depth: number
}

function sampleTitleTargetPoints(
  canvasWidth: number,
  canvasHeight: number,
  upperTitleLine: string,
  lowerTitleLine: string,
  samplingStep: number,
): Array<{ horizontalPosition: number; verticalPosition: number; isAccentColored: boolean }> {
  const samplingCanvas = document.createElement('canvas')
  samplingCanvas.width = canvasWidth
  samplingCanvas.height = canvasHeight
  const samplingContext = samplingCanvas.getContext('2d', { willReadFrequently: true })
  if (!samplingContext) {
    return []
  }
  const titleFontSize = Math.min(canvasWidth / 4.6, canvasHeight / 3.4)
  samplingContext.font = `${titleFontSize}px Anton, Impact, sans-serif`
  samplingContext.textAlign = 'center'
  samplingContext.textBaseline = 'middle'
  const verticalCenter = canvasHeight * 0.4
  samplingContext.fillStyle = 'rgb(255, 0, 0)'
  samplingContext.fillText(upperTitleLine.toUpperCase(), canvasWidth / 2, verticalCenter - titleFontSize * 0.52)
  samplingContext.fillStyle = 'rgb(0, 0, 255)'
  samplingContext.fillText(lowerTitleLine.toUpperCase(), canvasWidth / 2, verticalCenter + titleFontSize * 0.52)
  const pixelData = samplingContext.getImageData(0, 0, canvasWidth, canvasHeight).data
  const targetPoints: Array<{ horizontalPosition: number; verticalPosition: number; isAccentColored: boolean }> = []
  for (let verticalPosition = 0; verticalPosition < canvasHeight; verticalPosition += samplingStep) {
    for (let horizontalPosition = 0; horizontalPosition < canvasWidth; horizontalPosition += samplingStep) {
      const pixelOffset = (verticalPosition * canvasWidth + horizontalPosition) * 4
      if (pixelData[pixelOffset + 3] > 128) {
        targetPoints.push({
          horizontalPosition,
          verticalPosition,
          isAccentColored: pixelData[pixelOffset + 2] > pixelData[pixelOffset],
        })
      }
    }
  }
  return targetPoints
}

export function CosmicTitleFormation({
  formationPhase,
  upperTitleLine,
  lowerTitleLine,
  onCriticalMassReached,
  onFormationSettled,
  onAnimationUnavailable,
}: CosmicTitleFormationProperties) {
  const formationCanvas = useRef<HTMLCanvasElement>(null)
  const currentFormationPhase = useRef<CosmicFormationPhase>(formationPhase)
  const phaseStartTimestamp = useRef(performance.now())
  const criticalMassCallback = useRef(onCriticalMassReached)
  const settledCallback = useRef(onFormationSettled)
  const unavailableCallback = useRef(onAnimationUnavailable)

  useEffect(() => {
    criticalMassCallback.current = onCriticalMassReached
    settledCallback.current = onFormationSettled
    unavailableCallback.current = onAnimationUnavailable
  }, [onCriticalMassReached, onFormationSettled, onAnimationUnavailable])

  useEffect(() => {
    currentFormationPhase.current = formationPhase
    phaseStartTimestamp.current = performance.now()
  }, [formationPhase])

  useEffect(() => {
    const canvasElement = formationCanvas.current
    const drawingContext = canvasElement?.getContext('2d', { alpha: true, desynchronized: true })
    if (!canvasElement || !drawingContext) {
      unavailableCallback.current()
      return
    }

    let cosmicParticles: CosmicParticle[] = []
    let canvasWidth = 0
    let canvasHeight = 0
    let devicePixelRatio = 1
    let animationFrameIdentifier = 0
    let hasAnyFrameBeenDrawn = false
    let hasSettlementBeenReported = false
    let hasExpansionImpulseBeenApplied = false
    let hasCriticalMassBeenReported = false
    let isDisposed = false
    let expansionStartTimestamp: number | null = null
    let settlementTimestamp: number | null = null
    const distantStars = Array.from({ length: 170 }, () => ({
      horizontalShare: Math.random(),
      verticalShare: Math.random(),
      brightness: 0.15 + Math.random() * 0.5,
      twinkleOffset: Math.random() * Math.PI * 2,
      size: Math.random() < 0.86 ? 1 : 1.8,
    }))

    const fadePreviousFrame = (fadeStrength: number) => {
      drawingContext.globalCompositeOperation = 'destination-out'
      drawingContext.fillStyle = `rgba(0, 0, 0, ${fadeStrength})`
      drawingContext.fillRect(0, 0, canvasWidth, canvasHeight)
      drawingContext.globalCompositeOperation = 'source-over'
    }

    const drawDistantStars = (frameTimestamp: number, visibility: number) => {
      for (const distantStar of distantStars) {
        const twinkle = 0.6 + Math.sin(frameTimestamp / 900 + distantStar.twinkleOffset) * 0.4
        drawingContext.fillStyle = `rgba(${paperColor}, ${distantStar.brightness * twinkle * visibility})`
        drawingContext.fillRect(
          distantStar.horizontalShare * canvasWidth,
          distantStar.verticalShare * canvasHeight,
          distantStar.size,
          distantStar.size,
        )
      }
    }

    const drawShockwaveRing = (millisecondsSinceExpansion: number, ringDelayMilliseconds: number, ringColor: string) => {
      const ringProgress = (millisecondsSinceExpansion - ringDelayMilliseconds) / 1100
      if (ringProgress <= 0 || ringProgress >= 1) {
        return
      }
      const easedProgress = 1 - Math.pow(1 - ringProgress, 3)
      drawingContext.beginPath()
      drawingContext.arc(canvasWidth / 2, canvasHeight * 0.4, easedProgress * Math.hypot(canvasWidth, canvasHeight) * 0.62, 0, Math.PI * 2)
      drawingContext.strokeStyle = `rgba(${ringColor}, ${(1 - ringProgress) * 0.85})`
      drawingContext.lineWidth = 2 + (1 - ringProgress) * 10
      drawingContext.stroke()
    }

    let firstFrameTimestamp: number | null = null
    let activeFlare: SolitaryParticleFlare | null = null
    let activeDimming: SolitaryParticleDimming | null = null
    let nextFlareTimestamp = 0
    let nextDimmingTimestamp = 0
    const pulseRhythmOffsets = [Math.random() * 6, Math.random() * 6, Math.random() * 6]

    const readFlareIntensity = (frameTimestamp: number) => {
      if (nextFlareTimestamp === 0) {
        nextFlareTimestamp = frameTimestamp + 1600 + Math.random() * 2600
      }
      if (activeFlare === null && frameTimestamp >= nextFlareTimestamp) {
        const isGreatFlare = Math.random() < 0.28
        activeFlare = {
          startTimestamp: frameTimestamp,
          attackMilliseconds: 90 + Math.random() * 160,
          decayMilliseconds: isGreatFlare ? 1300 + Math.random() * 900 : 420 + Math.random() * 520,
          strength: isGreatFlare ? 0.85 + Math.random() * 0.4 : 0.3 + Math.random() * 0.3,
          hasDiagonalRays: isGreatFlare,
        }
      }
      if (activeFlare === null) {
        return { intensity: 0, hasDiagonalRays: false }
      }
      const millisecondsIntoFlare = frameTimestamp - activeFlare.startTimestamp
      const flareLength = activeFlare.attackMilliseconds + activeFlare.decayMilliseconds
      if (millisecondsIntoFlare >= flareLength) {
        const shouldEchoSoon = Math.random() < 0.3
        nextFlareTimestamp = frameTimestamp + (shouldEchoSoon ? 180 + Math.random() * 420 : 1500 + Math.random() * 5200)
        activeFlare = null
        return { intensity: 0, hasDiagonalRays: false }
      }
      const envelope =
        millisecondsIntoFlare < activeFlare.attackMilliseconds
          ? millisecondsIntoFlare / activeFlare.attackMilliseconds
          : Math.pow(1 - (millisecondsIntoFlare - activeFlare.attackMilliseconds) / activeFlare.decayMilliseconds, 2.2)
      return { intensity: envelope * activeFlare.strength, hasDiagonalRays: activeFlare.hasDiagonalRays }
    }

    const readDimmingDepth = (frameTimestamp: number) => {
      if (nextDimmingTimestamp === 0) {
        nextDimmingTimestamp = frameTimestamp + 2400 + Math.random() * 4000
      }
      if (activeDimming === null && frameTimestamp >= nextDimmingTimestamp) {
        activeDimming = {
          startTimestamp: frameTimestamp,
          durationMilliseconds: 110 + Math.random() * 380,
          depth: 0.35 + Math.random() * 0.5,
        }
      }
      if (activeDimming === null) {
        return 0
      }
      const dimmingProgress = (frameTimestamp - activeDimming.startTimestamp) / activeDimming.durationMilliseconds
      if (dimmingProgress >= 1) {
        nextDimmingTimestamp = frameTimestamp + 900 + Math.random() * 6200
        activeDimming = null
        return 0
      }
      return Math.sin(dimmingProgress * Math.PI) * activeDimming.depth
    }

    const drawLightRay = (
      centerHorizontalPosition: number,
      centerVerticalPosition: number,
      rayAngle: number,
      rayLength: number,
      rayOpacity: number,
    ) => {
      const endHorizontalOffset = Math.cos(rayAngle) * rayLength
      const endVerticalOffset = Math.sin(rayAngle) * rayLength
      const rayGradient = drawingContext.createLinearGradient(
        centerHorizontalPosition - endHorizontalOffset,
        centerVerticalPosition - endVerticalOffset,
        centerHorizontalPosition + endHorizontalOffset,
        centerVerticalPosition + endVerticalOffset,
      )
      rayGradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
      rayGradient.addColorStop(0.5, `rgba(${paperColor}, ${rayOpacity})`)
      rayGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      drawingContext.strokeStyle = rayGradient
      drawingContext.lineWidth = 1
      drawingContext.beginPath()
      drawingContext.moveTo(centerHorizontalPosition - endHorizontalOffset, centerVerticalPosition - endVerticalOffset)
      drawingContext.lineTo(centerHorizontalPosition + endHorizontalOffset, centerVerticalPosition + endVerticalOffset)
      drawingContext.stroke()
    }

    const drawSolitaryParticle = (
      frameTimestamp: number,
      centerHorizontalPosition: number,
      centerVerticalPosition: number,
      presence: number,
      opacityScale: number,
    ) => {
      const flare = readFlareIntensity(frameTimestamp)
      const dimmingDepth = readDimmingDepth(frameTimestamp)
      const irregularPulse =
        Math.sin(frameTimestamp / 1130 + pulseRhythmOffsets[0]) * 0.16 +
        Math.sin(frameTimestamp / 437 + pulseRhythmOffsets[1]) * 0.09 +
        Math.sin(frameTimestamp / 2710 + pulseRhythmOffsets[2]) * 0.13 +
        (Math.random() - 0.5) * 0.05
      const brightness = Math.max(0.12, (0.62 + irregularPulse + flare.intensity) * (1 - dimmingDepth)) * presence
      const viewportScale = Math.max(0.8, Math.min(1.35, Math.min(canvasWidth, canvasHeight) / 720))
      const haloRadius = (22 + brightness * 46) * viewportScale
      const coreRadius = (1.1 + brightness * 1.5) * viewportScale
      drawingContext.globalCompositeOperation = 'lighter'
      const haloGradient = drawingContext.createRadialGradient(
        centerHorizontalPosition,
        centerVerticalPosition,
        0,
        centerHorizontalPosition,
        centerVerticalPosition,
        haloRadius,
      )
      haloGradient.addColorStop(0, `rgba(${paperColor}, ${Math.min(1, brightness * 0.55) * opacityScale})`)
      haloGradient.addColorStop(0.12, `rgba(${paperColor}, ${Math.min(1, brightness * 0.2) * opacityScale})`)
      haloGradient.addColorStop(0.4, `rgba(${accentColor}, ${Math.min(1, brightness * 0.07 + flare.intensity * 0.08) * opacityScale})`)
      haloGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      drawingContext.fillStyle = haloGradient
      drawingContext.fillRect(
        centerHorizontalPosition - haloRadius,
        centerVerticalPosition - haloRadius,
        haloRadius * 2,
        haloRadius * 2,
      )
      const straightRayLength = (7 + brightness * 24 + flare.intensity * 46) * viewportScale
      const straightRayOpacity = Math.min(1, 0.18 + brightness * 0.5) * opacityScale
      drawLightRay(centerHorizontalPosition, centerVerticalPosition, 0, straightRayLength, straightRayOpacity)
      drawLightRay(centerHorizontalPosition, centerVerticalPosition, Math.PI / 2, straightRayLength * 0.86, straightRayOpacity)
      if (flare.hasDiagonalRays && flare.intensity > 0.05) {
        const diagonalRayLength = straightRayLength * 0.42
        const diagonalRayOpacity = Math.min(1, flare.intensity * 0.6) * opacityScale
        drawLightRay(centerHorizontalPosition, centerVerticalPosition, Math.PI / 4, diagonalRayLength, diagonalRayOpacity)
        drawLightRay(centerHorizontalPosition, centerVerticalPosition, -Math.PI / 4, diagonalRayLength, diagonalRayOpacity)
      }
      drawingContext.fillStyle = `rgba(${paperColor}, ${Math.min(1, 0.55 + brightness * 0.5) * presence * opacityScale})`
      drawingContext.beginPath()
      drawingContext.arc(centerHorizontalPosition, centerVerticalPosition, coreRadius, 0, Math.PI * 2)
      drawingContext.fill()
      drawingContext.globalCompositeOperation = 'source-over'
    }

    const gatheringDurationMilliseconds =
      shortestGatheringMilliseconds + Math.random() * (longestGatheringMilliseconds - shortestGatheringMilliseconds)

    const createGatheringTraits = () => {
      const farthestCorner = Math.hypot(canvasWidth, canvasHeight) / 2
      const startingAngle = Math.random() * Math.PI * 2
      const startingDistance = farthestCorner * (0.75 + Math.random() * 0.55)
      return {
        startingHorizontalPosition: canvasWidth / 2 + Math.cos(startingAngle) * startingDistance,
        startingVerticalPosition: canvasHeight * 0.4 + Math.sin(startingAngle) * startingDistance,
        gatheringJoinDelayMilliseconds: Math.pow(Math.random(), 1.6) * gatheringDurationMilliseconds * 0.82,
        gatheringRestingDistance: Math.pow(Math.random(), 0.6) * Math.min(canvasWidth, canvasHeight) * 0.085,
        gatheringRestingAngle: Math.random() * Math.PI * 2,
        gatheringSwirlDirection: Math.random() < 0.82 ? 1 : -1,
      }
    }

    const rebuildParticles = () => {
      devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      canvasWidth = canvasElement.clientWidth
      canvasHeight = canvasElement.clientHeight
      canvasElement.width = Math.floor(canvasWidth * devicePixelRatio)
      canvasElement.height = Math.floor(canvasHeight * devicePixelRatio)
      canvasElement.style.transform = ''
      drawingContext.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
      const samplingStep = canvasWidth < 640 ? 4 : 5
      const titleTargetPoints = sampleTitleTargetPoints(
        canvasWidth,
        canvasHeight,
        upperTitleLine,
        lowerTitleLine,
        samplingStep,
      )
      const driftingDustCount = Math.floor(titleTargetPoints.length * 0.22) + 120
      const isAlreadyFormed = currentFormationPhase.current === 'title_formation' && hasSettlementBeenReported
      cosmicParticles = []
      const isGathering =
        currentFormationPhase.current === 'slow_gathering' || currentFormationPhase.current === 'solitary_particle'
      const placeNewParticle = (
        targetHorizontalPosition: number,
        targetVerticalPosition: number,
        hasTitleTarget: boolean,
        isAccentColored: boolean,
        size: number,
      ) => {
        const gatheringTraits = createGatheringTraits()
        const scatteredHorizontalPosition = Math.random() * canvasWidth
        const scatteredVerticalPosition = Math.random() * canvasHeight
        cosmicParticles.push({
          horizontalPosition: isAlreadyFormed
            ? targetHorizontalPosition
            : isGathering
              ? gatheringTraits.startingHorizontalPosition
              : scatteredHorizontalPosition,
          verticalPosition: isAlreadyFormed
            ? targetVerticalPosition
            : isGathering
              ? gatheringTraits.startingVerticalPosition
              : scatteredVerticalPosition,
          horizontalVelocity: 0,
          verticalVelocity: 0,
          targetHorizontalPosition,
          targetVerticalPosition,
          hasTitleTarget,
          isAccentColored,
          isArcaneColored: !hasTitleTarget && Math.random() < 0.12,
          size,
          twinkleOffset: Math.random() * Math.PI * 2,
          gatheringJoinDelayMilliseconds: gatheringTraits.gatheringJoinDelayMilliseconds,
          gatheringRestingDistance: gatheringTraits.gatheringRestingDistance,
          gatheringRestingAngle: gatheringTraits.gatheringRestingAngle,
          gatheringSwirlDirection: gatheringTraits.gatheringSwirlDirection,
        })
      }
      for (const titleTargetPoint of titleTargetPoints) {
        placeNewParticle(
          titleTargetPoint.horizontalPosition,
          titleTargetPoint.verticalPosition,
          true,
          titleTargetPoint.isAccentColored,
          samplingStep * 0.62,
        )
      }
      for (let dustIndex = 0; dustIndex < driftingDustCount; dustIndex += 1) {
        placeNewParticle(Math.random() * canvasWidth, Math.random() * canvasHeight, false, false, 0.8 + Math.random() * 1.6)
      }
      hasExpansionImpulseBeenApplied = isAlreadyFormed || !isGathering
    }

    const applyExpansionImpulse = () => {
      for (const cosmicParticle of cosmicParticles) {
        const launchAngle = Math.random() * Math.PI * 2
        const launchSpeed = Math.pow(Math.random(), 1.8) * 34 * (canvasWidth < 640 ? 0.6 : 1) + 1.5
        cosmicParticle.horizontalVelocity = Math.cos(launchAngle) * launchSpeed
        cosmicParticle.verticalVelocity = Math.sin(launchAngle) * launchSpeed
      }
      hasExpansionImpulseBeenApplied = true
    }

    const drawFrame = (frameTimestamp: number) => {
      if (isDisposed) {
        return
      }
      hasAnyFrameBeenDrawn = true
      const activePhase = currentFormationPhase.current
      const millisecondsInPhase = frameTimestamp - phaseStartTimestamp.current
      if (firstFrameTimestamp === null) {
        firstFrameTimestamp = frameTimestamp
      }

      if (activePhase === 'solitary_particle') {
        fadePreviousFrame(1)
        drawDistantStars(frameTimestamp, 0.3)
        const arrivalProgress = Math.min(1, (frameTimestamp - firstFrameTimestamp) / solitaryParticleArrivalMilliseconds)
        drawSolitaryParticle(
          frameTimestamp,
          canvasWidth / 2 + Math.sin(frameTimestamp / 5300) * 1.4,
          canvasHeight * 0.4 + Math.cos(frameTimestamp / 6900) * 1.1,
          0.35 + arrivalProgress * arrivalProgress * 0.65,
          1,
        )
        animationFrameIdentifier = window.requestAnimationFrame(drawFrame)
        return
      }

      if (activePhase === 'expansion' && !hasExpansionImpulseBeenApplied) {
        applyExpansionImpulse()
        expansionStartTimestamp = frameTimestamp
      }

      let shakeHorizontalOffset = 0
      let shakeVerticalOffset = 0
      if (expansionStartTimestamp !== null && activePhase !== 'slow_gathering') {
        const millisecondsSinceExpansion = frameTimestamp - expansionStartTimestamp
        const shakeStrength = Math.max(0, 1 - millisecondsSinceExpansion / 520) * 14
        if (shakeStrength > 0.2) {
          shakeHorizontalOffset = (Math.random() - 0.5) * shakeStrength
          shakeVerticalOffset = (Math.random() - 0.5) * shakeStrength
        }
      }
      drawingContext.setTransform(
        devicePixelRatio,
        0,
        0,
        devicePixelRatio,
        shakeHorizontalOffset * devicePixelRatio,
        shakeVerticalOffset * devicePixelRatio,
      )

      const formationProgressForTrail =
        activePhase === 'title_formation' ? Math.min(1, millisecondsInPhase / formationDurationMilliseconds) : 0
      fadePreviousFrame(
        activePhase === 'slow_gathering'
          ? 0.2
          : activePhase === 'expansion'
            ? 0.16
            : 0.34 + formationProgressForTrail * 0.42,
      )
      drawDistantStars(
        frameTimestamp,
        activePhase === 'slow_gathering' ? 0.3 + Math.min(1, millisecondsInPhase / 2400) * 0.25 : 0.9,
      )

      if (activePhase === 'slow_gathering') {
        const gatheringProgress = Math.min(1, millisecondsInPhase / gatheringDurationMilliseconds)
        const instability = gatheringProgress * gatheringProgress * gatheringProgress
        const coreHorizontalPosition = canvasWidth / 2 + (Math.random() - 0.5) * instability * 7
        const coreVerticalPosition = canvasHeight * 0.4 + (Math.random() - 0.5) * instability * 7
        const coreBreathing = 1 + Math.sin(frameTimestamp / (900 - gatheringProgress * 640)) * (0.05 + instability * 0.22)
        let gatheredParticleCount = 0
        for (const cosmicParticle of cosmicParticles) {
          if (millisecondsInPhase < cosmicParticle.gatheringJoinDelayMilliseconds) {
            continue
          }
          gatheredParticleCount += 1
          const millisecondsSinceJoining = millisecondsInPhase - cosmicParticle.gatheringJoinDelayMilliseconds
          const orbitAngle =
            cosmicParticle.gatheringRestingAngle +
            (frameTimestamp / (2600 - instability * 1900)) * cosmicParticle.gatheringSwirlDirection
          const restingHorizontalPosition =
            coreHorizontalPosition + Math.cos(orbitAngle) * cosmicParticle.gatheringRestingDistance * coreBreathing
          const restingVerticalPosition =
            coreVerticalPosition + Math.sin(orbitAngle) * cosmicParticle.gatheringRestingDistance * coreBreathing * 0.82
          const horizontalDistance = restingHorizontalPosition - cosmicParticle.horizontalPosition
          const verticalDistance = restingVerticalPosition - cosmicParticle.verticalPosition
          const pullStrength = 0.0009 + Math.min(0.02, millisecondsSinceJoining / 160000)
          cosmicParticle.horizontalVelocity += horizontalDistance * pullStrength - verticalDistance * 0.0011 * cosmicParticle.gatheringSwirlDirection
          cosmicParticle.verticalVelocity += verticalDistance * pullStrength + horizontalDistance * 0.0011 * cosmicParticle.gatheringSwirlDirection
          cosmicParticle.horizontalVelocity += (Math.random() - 0.5) * instability * 1.4
          cosmicParticle.verticalVelocity += (Math.random() - 0.5) * instability * 1.4
          cosmicParticle.horizontalVelocity *= 0.955
          cosmicParticle.verticalVelocity *= 0.955
          cosmicParticle.horizontalPosition += cosmicParticle.horizontalVelocity
          cosmicParticle.verticalPosition += cosmicParticle.verticalVelocity
          const arrivalFade = Math.min(1, millisecondsSinceJoining / 900)
          const twinkle = 0.6 + Math.sin(frameTimestamp / 300 + cosmicParticle.twinkleOffset) * 0.4
          const particleColor = cosmicParticle.isAccentColored
            ? accentColor
            : cosmicParticle.isArcaneColored
              ? arcaneColor
              : paperColor
          drawingContext.fillStyle = `rgba(${particleColor}, ${arrivalFade * twinkle * 0.85})`
          const drawnSize = Math.max(1.1, cosmicParticle.size * 0.55)
          drawingContext.fillRect(
            cosmicParticle.horizontalPosition - drawnSize / 2,
            cosmicParticle.verticalPosition - drawnSize / 2,
            drawnSize,
            drawnSize,
          )
        }
        const accumulatedShare = gatheredParticleCount / Math.max(1, cosmicParticles.length)
        const glowRadius = 18 + accumulatedShare * Math.min(canvasWidth, canvasHeight) * 0.16 * coreBreathing
        const coreGlow = drawingContext.createRadialGradient(
          coreHorizontalPosition,
          coreVerticalPosition,
          0,
          coreHorizontalPosition,
          coreVerticalPosition,
          glowRadius,
        )
        coreGlow.addColorStop(0, `rgba(${paperColor}, ${0.05 + accumulatedShare * 0.3 + instability * 0.35})`)
        coreGlow.addColorStop(0.4, `rgba(${accentColor}, ${accumulatedShare * 0.16 + instability * 0.2})`)
        coreGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')
        drawingContext.globalCompositeOperation = 'lighter'
        drawingContext.fillStyle = coreGlow
        drawingContext.fillRect(
          coreHorizontalPosition - glowRadius,
          coreVerticalPosition - glowRadius,
          glowRadius * 2,
          glowRadius * 2,
        )
        drawingContext.globalCompositeOperation = 'source-over'
        drawSolitaryParticle(frameTimestamp, coreHorizontalPosition, coreVerticalPosition, 1 + instability * 0.6, 0.16)
        const awakeningRippleProgress = millisecondsInPhase / awakeningRippleMilliseconds
        if (awakeningRippleProgress < 1) {
          const easedRippleProgress = 1 - Math.pow(1 - awakeningRippleProgress, 3)
          drawingContext.beginPath()
          drawingContext.arc(
            canvasWidth / 2,
            canvasHeight * 0.4,
            6 + easedRippleProgress * Math.min(canvasWidth, canvasHeight) * 0.24,
            0,
            Math.PI * 2,
          )
          drawingContext.strokeStyle = `rgba(${paperColor}, ${(1 - awakeningRippleProgress) * 0.22})`
          drawingContext.lineWidth = 1
          drawingContext.stroke()
        }
        if (gatheringProgress >= 1 && !hasCriticalMassBeenReported) {
          hasCriticalMassBeenReported = true
          criticalMassCallback.current()
        }
        animationFrameIdentifier = window.requestAnimationFrame(drawFrame)
        return
      }

      if (expansionStartTimestamp !== null) {
        const millisecondsSinceExpansion = frameTimestamp - expansionStartTimestamp
        drawShockwaveRing(millisecondsSinceExpansion, 0, paperColor)
        drawShockwaveRing(millisecondsSinceExpansion, 140, accentColor)
        drawShockwaveRing(millisecondsSinceExpansion, 300, arcaneColor)
      }

      if (activePhase === 'expansion' && millisecondsInPhase < 260) {
        const flashStrength = 1 - millisecondsInPhase / 260
        drawingContext.fillStyle = `rgba(${paperColor}, ${flashStrength * 0.85})`
        drawingContext.fillRect(0, 0, canvasWidth, canvasHeight)
      }

      const formationProgress =
        activePhase === 'title_formation' ? Math.min(1, millisecondsInPhase / formationDurationMilliseconds) : 0
      const attractionStrength = formationProgress * formationProgress * 0.16
      const velocityDamping = activePhase === 'expansion' ? 0.965 : 0.86 - formationProgress * 0.1

      for (const cosmicParticle of cosmicParticles) {
        if (activePhase === 'title_formation') {
          const settleAmount = cosmicParticle.hasTitleTarget ? Math.max(0, (formationProgress - 0.65) / 0.35) : 0
          const settle = settleAmount * settleAmount
          const wanderingRadius = cosmicParticle.hasTitleTarget ? 0.35 * (1 - settle) : 14
          const wanderingHorizontalOffset =
            Math.cos(frameTimestamp / 1700 + cosmicParticle.twinkleOffset) * wanderingRadius
          const wanderingVerticalOffset =
            Math.sin(frameTimestamp / 2100 + cosmicParticle.twinkleOffset) * wanderingRadius
          cosmicParticle.horizontalVelocity +=
            (cosmicParticle.targetHorizontalPosition + wanderingHorizontalOffset - cosmicParticle.horizontalPosition) *
            attractionStrength
          cosmicParticle.verticalVelocity +=
            (cosmicParticle.targetVerticalPosition + wanderingVerticalOffset - cosmicParticle.verticalPosition) *
            attractionStrength
          cosmicParticle.horizontalPosition =
            cosmicParticle.horizontalPosition * (1 - settle) + cosmicParticle.targetHorizontalPosition * settle
          cosmicParticle.verticalPosition =
            cosmicParticle.verticalPosition * (1 - settle) + cosmicParticle.targetVerticalPosition * settle
          cosmicParticle.horizontalVelocity *= 1 - settle
          cosmicParticle.verticalVelocity *= 1 - settle
        }
        cosmicParticle.horizontalVelocity *= velocityDamping
        cosmicParticle.verticalVelocity *= velocityDamping
        cosmicParticle.horizontalPosition += cosmicParticle.horizontalVelocity
        cosmicParticle.verticalPosition += cosmicParticle.verticalVelocity
      }

      const paintParticleGroup = (fillColor: string, shouldPaintParticle: (cosmicParticle: CosmicParticle) => boolean) => {
        drawingContext.fillStyle = `rgb(${fillColor})`
        for (const cosmicParticle of cosmicParticles) {
          if (!shouldPaintParticle(cosmicParticle)) {
            continue
          }
          const twinkle = 0.72 + Math.sin(frameTimestamp / 380 + cosmicParticle.twinkleOffset) * 0.28
          const particleOpacity = cosmicParticle.hasTitleTarget ? 0.55 + formationProgress * 0.45 : 0.35 * twinkle
          drawingContext.globalAlpha =
            particleOpacity * (cosmicParticle.hasTitleTarget ? twinkle * 0.3 + 0.7 : 1)
          drawingContext.fillRect(
            cosmicParticle.horizontalPosition - cosmicParticle.size / 2,
            cosmicParticle.verticalPosition - cosmicParticle.size / 2,
            cosmicParticle.size,
            cosmicParticle.size,
          )
        }
      }
      paintParticleGroup(paperColor, (cosmicParticle) => !cosmicParticle.isAccentColored && !cosmicParticle.isArcaneColored)
      paintParticleGroup(accentColor, (cosmicParticle) => cosmicParticle.isAccentColored)
      paintParticleGroup(arcaneColor, (cosmicParticle) => cosmicParticle.isArcaneColored)
      drawingContext.globalAlpha = 1

      if (activePhase === 'title_formation' && formationProgress >= 1 && !hasSettlementBeenReported) {
        hasSettlementBeenReported = true
        settlementTimestamp = frameTimestamp
        settledCallback.current()
      }
      if (settlementTimestamp !== null) {
        const settlementGlowProgress = (frameTimestamp - settlementTimestamp) / 900
        if (settlementGlowProgress < 1) {
          const glowRadius = Math.min(canvasWidth, canvasHeight) * (0.3 + settlementGlowProgress * 0.7)
          const settlementGlow = drawingContext.createRadialGradient(
            canvasWidth / 2,
            canvasHeight * 0.4,
            0,
            canvasWidth / 2,
            canvasHeight * 0.4,
            glowRadius,
          )
          settlementGlow.addColorStop(0, `rgba(${paperColor}, ${(1 - settlementGlowProgress) * 0.28})`)
          settlementGlow.addColorStop(0.5, `rgba(${accentColor}, ${(1 - settlementGlowProgress) * 0.14})`)
          settlementGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')
          drawingContext.globalCompositeOperation = 'lighter'
          drawingContext.fillStyle = settlementGlow
          drawingContext.fillRect(0, 0, canvasWidth, canvasHeight)
          drawingContext.globalCompositeOperation = 'source-over'
        }
      }
      animationFrameIdentifier = window.requestAnimationFrame(drawFrame)
    }

    const startDrawing = () => {
      if (isDisposed) {
        return
      }
      const measuredCanvasWidth = canvasElement.clientWidth
      const measuredCanvasHeight = canvasElement.clientHeight
      const titleFontSize = Math.min(measuredCanvasWidth / 4.6, measuredCanvasHeight / 3.4)
      const beginDrawing = () => {
        if (isDisposed) {
          return
        }
        rebuildParticles()
        animationFrameIdentifier = window.requestAnimationFrame(drawFrame)
      }
      document.fonts.load(`${Math.round(titleFontSize)}px Anton`).then(beginDrawing, beginDrawing)
    }

    startDrawing()

    let availabilityProbeTimeoutIdentifier = 0
    const probeAnimationAvailability = () => {
      window.clearTimeout(availabilityProbeTimeoutIdentifier)
      if (hasAnyFrameBeenDrawn || document.visibilityState !== 'visible') {
        return
      }
      availabilityProbeTimeoutIdentifier = window.setTimeout(() => {
        if (!hasAnyFrameBeenDrawn && document.visibilityState === 'visible') {
          unavailableCallback.current()
        }
      }, animationAvailabilityProbeMilliseconds)
    }
    probeAnimationAvailability()
    document.addEventListener('visibilitychange', probeAnimationAvailability)

    let resizeDebounceTimeoutIdentifier = 0
    const handleViewportResize = () => {
      window.clearTimeout(resizeDebounceTimeoutIdentifier)
      resizeDebounceTimeoutIdentifier = window.setTimeout(() => {
        if (currentFormationPhase.current !== 'slow_gathering' && currentFormationPhase.current !== 'solitary_particle') {
          hasSettlementBeenReported = true
          currentFormationPhase.current = 'title_formation'
          phaseStartTimestamp.current = performance.now() - formationDurationMilliseconds
        }
        rebuildParticles()
      }, 140)
    }
    window.addEventListener('resize', handleViewportResize)

    return () => {
      isDisposed = true
      window.cancelAnimationFrame(animationFrameIdentifier)
      window.clearTimeout(availabilityProbeTimeoutIdentifier)
      window.clearTimeout(resizeDebounceTimeoutIdentifier)
      window.removeEventListener('resize', handleViewportResize)
      document.removeEventListener('visibilitychange', probeAnimationAvailability)
    }
  }, [upperTitleLine, lowerTitleLine])

  return (
    <canvas ref={formationCanvas} className="absolute inset-0 h-full w-full pointer-events-none" aria-hidden="true" />
  )
}

export { expansionDurationMilliseconds }

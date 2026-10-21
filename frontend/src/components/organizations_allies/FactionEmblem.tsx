import { useState } from 'react'
import type { CSSProperties } from 'react'
import { chooseAnimationVariantName } from '../../animation/animation_variety'
import type { FactionIdentifier } from '../../demonstration/organizations_allies_data'

const emblemEngravingVariantNames = ['stroke_by_stroke', 'struck_plate', 'flickering_burn', 'outward_from_center'] as const

type FactionEmblemProperties = {
  factionIdentifier: FactionIdentifier
  accessibleDescription?: string
  isEngravingAnimated?: boolean
  className?: string
  placementWithinDrawing?: { horizontalPosition: number; verticalPosition: number; sideLength: number }
}

function createStrokeOrderStyle(strokeOrder: number): CSSProperties {
  return { '--emblem-stroke-order': strokeOrder } as CSSProperties
}

function JailerEmblemShapes() {
  return (
    <>
      <rect className="faction-emblem-stroke" pathLength={1} style={createStrokeOrderStyle(0)} x="26" y="20" width="68" height="80" />
      <line className="faction-emblem-stroke" pathLength={1} style={createStrokeOrderStyle(1)} x1="43" y1="20" x2="43" y2="100" />
      <line className="faction-emblem-stroke" pathLength={1} style={createStrokeOrderStyle(2)} x1="77" y1="20" x2="77" y2="100" />
      <line className="faction-emblem-stroke" pathLength={1} style={createStrokeOrderStyle(3)} x1="60" y1="20" x2="60" y2="30" />
      <line className="faction-emblem-stroke" pathLength={1} style={createStrokeOrderStyle(3)} x1="60" y1="94" x2="60" y2="100" />
      <circle className="faction-emblem-stroke faction-emblem-heavy-stroke faction-emblem-ground-fill" pathLength={1} style={createStrokeOrderStyle(4)} cx="60" cy="43" r="11" />
      <line className="faction-emblem-stroke faction-emblem-heavy-stroke" pathLength={1} style={createStrokeOrderStyle(5)} x1="60" y1="54" x2="60" y2="90" />
      <path className="faction-emblem-stroke faction-emblem-heavy-stroke" pathLength={1} style={createStrokeOrderStyle(6)} d="M60 74 H70 M60 84 H67" />
    </>
  )
}

function CuratorsEmblemShapes() {
  return (
    <>
      <path className="faction-emblem-stroke" pathLength={1} style={createStrokeOrderStyle(0)} d="M24 88 V32 L36 20 H84 L96 32 V88 Z" />
      <path className="faction-emblem-stroke" pathLength={1} style={createStrokeOrderStyle(1)} d="M24 32 H96 M36 20 V32 M84 20 V32" />
      <path className="faction-emblem-stroke" pathLength={1} style={createStrokeOrderStyle(2)} d="M16 88 H104 V100 H16 Z" />
      <path className="faction-emblem-stroke faction-emblem-heavy-stroke" pathLength={1} style={createStrokeOrderStyle(3)} d="M34 61 Q60 38 86 61 Q60 84 34 61 Z" />
      <circle className="faction-emblem-stroke faction-emblem-heavy-stroke" pathLength={1} style={createStrokeOrderStyle(4)} cx="60" cy="61" r="8" />
      <circle className="faction-emblem-solid" style={createStrokeOrderStyle(5)} cx="60" cy="61" r="2.6" />
      <line className="faction-emblem-stroke" pathLength={1} style={createStrokeOrderStyle(6)} x1="50" y1="94" x2="70" y2="94" />
    </>
  )
}

function LiberatorsEmblemShapes() {
  return (
    <>
      <rect className="faction-emblem-stroke faction-emblem-heavy-stroke" pathLength={1} style={createStrokeOrderStyle(0)} x="10" y="50" width="34" height="20" rx="10" />
      <rect className="faction-emblem-stroke faction-emblem-heavy-stroke" pathLength={1} style={createStrokeOrderStyle(1)} x="76" y="50" width="34" height="20" rx="10" />
      <path className="faction-emblem-stroke faction-emblem-heavy-stroke" pathLength={1} style={createStrokeOrderStyle(2)} d="M38 60 H44 Q46 47 57 50" />
      <path className="faction-emblem-stroke faction-emblem-heavy-stroke" pathLength={1} style={createStrokeOrderStyle(3)} d="M82 60 H76 Q74 73 63 70" />
      <path className="faction-emblem-stroke" pathLength={1} style={createStrokeOrderStyle(4)} d="M60 40 V26 M68 43 L76 31 M52 43 L44 31" />
      <path className="faction-emblem-stroke" pathLength={1} style={createStrokeOrderStyle(5)} d="M60 80 V94 M52 77 L44 89 M68 77 L76 89" />
    </>
  )
}

export function FactionEmblem({
  factionIdentifier,
  accessibleDescription,
  isEngravingAnimated = true,
  className,
  placementWithinDrawing,
}: FactionEmblemProperties) {
  const [engravingVariantName] = useState(() =>
    chooseAnimationVariantName('faction_emblem_engraving', emblemEngravingVariantNames),
  )
  return (
    <svg
      viewBox="0 0 120 120"
      className={`faction-emblem ${className ?? ''}`}
      data-engraving-variant={isEngravingAnimated ? engravingVariantName : 'none'}
      role={accessibleDescription ? 'img' : undefined}
      aria-label={accessibleDescription}
      aria-hidden={accessibleDescription ? undefined : true}
      focusable="false"
      x={placementWithinDrawing?.horizontalPosition}
      y={placementWithinDrawing?.verticalPosition}
      width={placementWithinDrawing?.sideLength}
      height={placementWithinDrawing?.sideLength}
    >
      {factionIdentifier === 'oicnau' ? <JailerEmblemShapes /> : null}
      {factionIdentifier === 'the_court' ? <CuratorsEmblemShapes /> : null}
      {factionIdentifier === 'court_of_chaos' ? <LiberatorsEmblemShapes /> : null}
    </svg>
  )
}

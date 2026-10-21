import type { CSSProperties } from 'react'

type OneiricFogLayerProperties = {
  fogDensity: number
  shouldPaintFrontBank: boolean
}

export function OneiricFogLayer({ fogDensity, shouldPaintFrontBank }: OneiricFogLayerProperties) {
  const fogStyle = { '--fog-density': fogDensity } as CSSProperties
  return (
    <>
      <div className="oneiric-fog-stage scene-ambient-motion" data-fog-depth="behind" style={fogStyle} aria-hidden="true">
        <span className="oneiric-fog-bank" />
        <span className="oneiric-fog-bank" />
        <span className="oneiric-fog-bank" />
      </div>
      {shouldPaintFrontBank ? (
        <div className="oneiric-fog-stage scene-ambient-motion" data-fog-depth="front" style={fogStyle} aria-hidden="true">
          <span className="oneiric-fog-bank" />
        </div>
      ) : null}
    </>
  )
}

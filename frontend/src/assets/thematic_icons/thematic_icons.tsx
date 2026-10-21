import type { ReactNode, SVGProps } from 'react'

type ThematicIconProperties = {
  size?: number
} & Omit<SVGProps<SVGSVGElement>, 'width' | 'height'>

function ThematicIconFrame({ size = 18, children, ...svgProperties }: ThematicIconProperties & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      {...svgProperties}
    >
      {children}
    </svg>
  )
}

export function ThematicHouseIcon(properties: ThematicIconProperties) {
  return (
    <ThematicIconFrame {...properties}>
      <path d="M3 11 L12 4 L21 11" />
      <path d="M6 10 V20 H18 V10" />
      <path d="M10 20 V14 H14 V20" />
    </ThematicIconFrame>
  )
}

export function ThematicCrateIcon(properties: ThematicIconProperties) {
  return (
    <ThematicIconFrame {...properties}>
      <rect x="4" y="7" width="16" height="12" />
      <path d="M4 11 H20" />
      <path d="M12 7 V19" />
    </ThematicIconFrame>
  )
}

export function ThematicNotebookIcon(properties: ThematicIconProperties) {
  return (
    <ThematicIconFrame {...properties}>
      <rect x="6" y="3" width="13" height="18" />
      <path d="M9 3 V21" />
      <path d="M12 8 H16" />
      <path d="M12 12 H16" />
    </ThematicIconFrame>
  )
}

export function ThematicBedIcon(properties: ThematicIconProperties) {
  return (
    <ThematicIconFrame {...properties}>
      <path d="M3 18 V12 H8 C10 12 11 10 13 10 H21 V18" />
      <path d="M3 18 H21" />
      <path d="M8 12 V8 H3" />
    </ThematicIconFrame>
  )
}

export function ThematicBlueprintIcon(properties: ThematicIconProperties) {
  return (
    <ThematicIconFrame {...properties}>
      <rect x="4" y="4" width="16" height="16" />
      <path d="M8 8 H16" />
      <path d="M8 12 H13" />
      <path d="M8 16 H16" />
    </ThematicIconFrame>
  )
}

export function ThematicAnchorIcon(properties: ThematicIconProperties) {
  return (
    <ThematicIconFrame {...properties}>
      <circle cx="12" cy="6" r="2" />
      <path d="M12 8 V19" />
      <path d="M7 13 H17" />
      <path d="M5 16 C5 20 9 21 12 21 C15 21 19 20 19 16" />
    </ThematicIconFrame>
  )
}

export function ThematicSignpostIcon(properties: ThematicIconProperties) {
  return (
    <ThematicIconFrame {...properties}>
      <path d="M12 4 V21" />
      <path d="M12 6 H19 L21 8 L19 10 H12" />
      <path d="M12 12 H6 L4 14 L6 16 H12" />
    </ThematicIconFrame>
  )
}

export function ThematicScalesIcon(properties: ThematicIconProperties) {
  return (
    <ThematicIconFrame {...properties}>
      <path d="M4 21 H20" />
      <path d="M12 4 V21" />
      <path d="M5 8 H19" />
      <path d="M8 8 L5 14 H11 Z" />
      <path d="M16 8 L13 14 H19 Z" />
    </ThematicIconFrame>
  )
}

export function ThematicPersonIcon(properties: ThematicIconProperties) {
  return (
    <ThematicIconFrame {...properties}>
      <circle cx="12" cy="7" r="3" />
      <path d="M5 20 C5 15 8 13 12 13 C16 13 19 15 19 20" />
    </ThematicIconFrame>
  )
}

export function ThematicWoundIcon(properties: ThematicIconProperties) {
  return (
    <ThematicIconFrame {...properties}>
      <path d="M5 12 H19" />
      <path d="M8 8 L16 16" />
      <path d="M16 8 L8 16" />
      <circle cx="12" cy="12" r="8" />
    </ThematicIconFrame>
  )
}

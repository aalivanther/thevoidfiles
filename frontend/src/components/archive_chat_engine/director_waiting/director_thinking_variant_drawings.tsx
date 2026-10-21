import type { ReactNode } from 'react'

export type DirectorThinkingVariantName =
  | 'quill_and_inkwell'
  | 'tape_reel'
  | 'half_closed_eye'
  | 'archive_card_file'
  | 'shortwave_static'

function QuillAndInkwellDrawing() {
  return (
    <>
      <path className="thinking-ink-stroke" d="M6 50 H50" />
      <path className="thinking-ink-solid" d="M8 38 H24 L22 50 H10 Z" />
      <path className="thinking-ink-stroke" d="M7 38 H25" />
      <g className="thinking-quill">
        <path className="thinking-ink-stroke" d="M30 44 L46 8" />
        <path className="thinking-paper-solid" d="M46 8 C52 16 48 28 36 34 L33 38 Z" />
      </g>
      <circle className="thinking-quill-drop" cx="30" cy="40" r="2" />
      <path className="thinking-quill-written-line thinking-quill-written-line-first" d="M30 46 H38" />
      <path className="thinking-quill-written-line thinking-quill-written-line-second" d="M40 46 H46" />
      <path className="thinking-quill-written-line thinking-quill-written-line-third" d="M48 46 H52" />
    </>
  )
}

function TapeReelDrawing() {
  return (
    <>
      <rect className="thinking-ink-stroke" x="4" y="10" width="48" height="36" />
      <g className="thinking-reel thinking-reel-left">
        <circle className="thinking-ink-stroke" cx="18" cy="26" r="9" />
        <path className="thinking-ink-stroke" d="M18 17 V35 M9 26 H27" />
      </g>
      <g className="thinking-reel thinking-reel-right">
        <circle className="thinking-ink-stroke" cx="38" cy="26" r="9" />
        <path className="thinking-ink-stroke" d="M38 17 V35 M29 26 H47" />
      </g>
      <path className="thinking-ink-stroke" d="M18 35 H38" />
      <circle className="thinking-recording-light" cx="28" cy="41" r="2.5" />
    </>
  )
}

function HalfClosedEyeDrawing() {
  return (
    <>
      <path className="thinking-ink-stroke" d="M4 28 C16 12 40 12 52 28 C40 44 16 44 4 28 Z" />
      <g className="thinking-eye-opening">
        <circle className="thinking-ink-stroke" cx="28" cy="28" r="8" />
        <circle className="thinking-eye-pupil" cx="28" cy="28" r="3.5" />
      </g>
      <path className="thinking-eye-lid" d="M4 28 C16 12 40 12 52 28 Z" />
      <path className="thinking-eye-reading-line" d="M14 48 H42" />
    </>
  )
}

function ArchiveCardFileDrawing() {
  return (
    <>
      <path className="thinking-ink-stroke" d="M4 50 H52 V34 H4 Z" />
      <rect className="thinking-file-card thinking-file-card-first" x="9" y="20" width="8" height="22" />
      <rect className="thinking-file-card thinking-file-card-second" x="19" y="20" width="8" height="22" />
      <rect className="thinking-file-card thinking-file-card-third" x="29" y="20" width="8" height="22" />
      <rect className="thinking-file-card thinking-file-card-fourth" x="39" y="20" width="8" height="22" />
      <path className="thinking-ink-solid" d="M4 50 H52 V40 H4 Z" />
      <path className="thinking-paper-stroke" d="M22 45 H34" />
    </>
  )
}

function ShortwaveStaticDrawing() {
  return (
    <>
      <rect className="thinking-ink-stroke" x="4" y="10" width="48" height="36" />
      <path className="thinking-ink-stroke" d="M4 28 H8 M48 28 H52" />
      <path className="thinking-wave-flat" d="M8 28 H24 L26 24 L28 32 L30 28 H48" />
      <path
        className="thinking-wave-irregular"
        d="M8 28 L11 20 L14 35 L17 24 L20 31 L23 15 L26 39 L29 22 L32 33 L35 26 L38 37 L41 18 L44 30 L48 28"
      />
    </>
  )
}

const directorThinkingDrawingByVariantName: Record<DirectorThinkingVariantName, () => ReactNode> = {
  quill_and_inkwell: QuillAndInkwellDrawing,
  tape_reel: TapeReelDrawing,
  half_closed_eye: HalfClosedEyeDrawing,
  archive_card_file: ArchiveCardFileDrawing,
  shortwave_static: ShortwaveStaticDrawing,
}

export function DirectorThinkingVariantDrawing({ variantName }: { variantName: DirectorThinkingVariantName }) {
  const VariantDrawing = directorThinkingDrawingByVariantName[variantName]
  return (
    <svg className="director-thinking-drawing" viewBox="0 0 56 56" aria-hidden="true" focusable="false">
      <VariantDrawing />
    </svg>
  )
}

import { useState } from 'react'
import { chooseAnimationVariantName } from '../../animation/animation_variety'

const handDrawnUnderlineVariantNames = ['single_stroke', 'double_stroke', 'wavy_stroke'] as const

const underlinePathByVariantName: Record<(typeof handDrawnUnderlineVariantNames)[number], string[]> = {
  single_stroke: ['M2 7 C 40 3, 90 10, 138 5 S 190 8, 198 4'],
  double_stroke: ['M3 4 C 50 2, 120 7, 197 3', 'M8 10 C 70 8, 130 12, 188 8'],
  wavy_stroke: ['M2 6 Q 14 1, 26 6 T 50 6 T 74 6 T 98 6 T 122 6 T 146 6 T 170 6 T 198 5'],
}

export function HandDrawnUnderline({ animationName }: { animationName: string }) {
  const [underlineVariantName] = useState(() =>
    chooseAnimationVariantName(`journal_underline_${animationName}`, handDrawnUnderlineVariantNames),
  )
  return (
    <svg
      className="journal-hand-underline"
      data-underline-variant={underlineVariantName}
      viewBox="0 0 200 12"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {underlinePathByVariantName[underlineVariantName].map((underlinePath, underlinePathIndex) => (
        <path
          key={underlinePath}
          d={underlinePath}
          pathLength={1}
          style={{ animationDelay: `${180 + underlinePathIndex * 220}ms` }}
        />
      ))}
    </svg>
  )
}

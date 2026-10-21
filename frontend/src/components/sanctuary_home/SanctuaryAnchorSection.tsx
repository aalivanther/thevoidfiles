import { HeartBreak, Sparkle } from '@phosphor-icons/react'
import { useState } from 'react'
import type { CSSProperties } from 'react'
import { randomNumberBetween } from '../../animation/animation_variety'
import { sanctuaryHomeCopy } from '../../copy/sanctuary_home_copy'
import type { RelationalAnchor } from '../../game_state/chronicle_state'

type SanctuaryAnchorSectionProperties = {
  relationalAnchor: RelationalAnchor | null
  investigatorName: string
}

export function SanctuaryAnchorSection({ relationalAnchor, investigatorName }: SanctuaryAnchorSectionProperties) {
  const anchorCopy = sanctuaryHomeCopy.anchor
  const [photographStyle] = useState(
    () => ({ '--photograph-tilt': `${randomNumberBetween(-4, 4).toFixed(1)}deg` }) as CSSProperties,
  )

  return (
    <section aria-labelledby="sanctuary-anchor-title">
      <h2 id="sanctuary-anchor-title" className="display-title text-2xl">
        {anchorCopy.title}
      </h2>
      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] items-start gap-6 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
        <figure className="sanctuary-anchor-photograph" style={photographStyle} data-empty={relationalAnchor?.kind !== 'person'}>
          <svg viewBox="0 0 120 140" className="sanctuary-anchor-portrait" aria-hidden="true" focusable="false">
            {relationalAnchor?.kind === 'person' ? (
              <>
                <circle cx="60" cy="52" r="24" />
                <path d="M16 140 q4 -52 44 -52 q40 0 44 52 z" />
              </>
            ) : (
              <>
                <line x1="18" y1="18" x2="102" y2="122" className="sanctuary-anchor-portrait-empty" />
                <line x1="102" y1="18" x2="18" y2="122" className="sanctuary-anchor-portrait-empty" />
              </>
            )}
          </svg>
          <figcaption className="sanctuary-anchor-caption">
            {relationalAnchor?.kind === 'person'
              ? anchorCopy.photographCaption(relationalAnchor.personName)
              : anchorCopy.emptyFrameCaption}
          </figcaption>
        </figure>

        {relationalAnchor?.kind === 'person' ? (
          <div className="min-w-0">
            <p className="dossier-label">{anchorCopy.personSectionLabel}</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-3xl leading-tight tracking-wide uppercase [overflow-wrap:anywhere]">
              {relationalAnchor.personName}
            </p>
            <p className="dossier-label mt-3">{anchorCopy.bondLabel}</p>
            <p className="sanctuary-room-description mt-1 [overflow-wrap:anywhere]">{relationalAnchor.bondDescription}</p>
            <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-[repeat(2,minmax(0,1fr))]">
              <div className="comic-panel p-4">
                <h3 className="flex items-center gap-2 text-base font-semibold">
                  <Sparkle size={20} weight="fill" aria-hidden="true" />
                  {anchorCopy.blessingTitle}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-paper-muted">{anchorCopy.blessingDescription}</p>
              </div>
              <div className="comic-panel p-4">
                <h3 className="flex items-center gap-2 text-base font-semibold">
                  <HeartBreak size={20} weight="fill" aria-hidden="true" />
                  {anchorCopy.curseTitle}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-paper-muted">{anchorCopy.curseDescription}</p>
              </div>
            </div>
            <p className="mt-4 border-l-4 border-ink-line pl-3 text-sm text-paper-muted italic">{anchorCopy.personReminder}</p>
          </div>
        ) : (
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-display)] text-3xl leading-tight tracking-wide uppercase">
              {anchorCopy.uprootedTitle}
            </p>
            <p className="sanctuary-room-description mt-2">
              {relationalAnchor ? anchorCopy.uprootedDescription(investigatorName) : anchorCopy.missingRegistrationDescription}
            </p>
            {relationalAnchor ? (
              <ul className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-2 text-sm leading-relaxed text-paper-muted">
                <li className="flex items-start gap-2">
                  <Sparkle size={18} weight="bold" className="mt-0.5 shrink-0" aria-hidden="true" />
                  {anchorCopy.uprootedBlessing}
                </li>
                <li className="flex items-start gap-2">
                  <HeartBreak size={18} weight="bold" className="mt-0.5 shrink-0" aria-hidden="true" />
                  {anchorCopy.uprootedCurse}
                </li>
              </ul>
            ) : null}
          </div>
        )}
      </div>
    </section>
  )
}

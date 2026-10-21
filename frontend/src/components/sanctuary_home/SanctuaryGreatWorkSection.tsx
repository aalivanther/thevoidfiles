import { Circle } from '@phosphor-icons/react'
import type { CSSProperties } from 'react'
import { sanctuaryHomeCopy } from '../../copy/sanctuary_home_copy'

export function SanctuaryGreatWorkSection() {
  const greatWorkCopy = sanctuaryHomeCopy.greatWork
  return (
    <section aria-labelledby="sanctuary-great-work-title">
      <h2 id="sanctuary-great-work-title" className="display-title text-2xl">
        {greatWorkCopy.title}
      </h2>
      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <figure className="sanctuary-blueprint-sheet">
          <svg viewBox="0 0 240 160" className="sanctuary-blueprint-drawing" aria-hidden="true" focusable="false">
            <rect x="12" y="12" width="216" height="136" />
            <line x1="12" y1="126" x2="228" y2="126" />
            <line x1="150" y1="126" x2="150" y2="148" />
            <circle cx="120" cy="68" r="34" className="sanctuary-blueprint-dashed" />
            <line x1="120" y1="24" x2="120" y2="112" className="sanctuary-blueprint-dashed" />
            <line x1="76" y1="68" x2="164" y2="68" className="sanctuary-blueprint-dashed" />
          </svg>
          <figcaption className="sanctuary-blueprint-caption">{greatWorkCopy.blueprintCaption}</figcaption>
        </figure>
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-display)] text-xl tracking-wide uppercase">
            {greatWorkCopy.emptyStateTitle}
          </p>
          <p className="sanctuary-room-description mt-2">{greatWorkCopy.emptyStateDescription}</p>
          <h3 className="dossier-label mt-5">{greatWorkCopy.requirementsTitle}</h3>
          <ul className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-3">
            {greatWorkCopy.requirements.map((requirement, requirementIndex) => (
              <li
                key={requirement.title}
                className="sanctuary-great-work-requirement entrance-from-left"
                style={{ '--entrance-order': requirementIndex } as CSSProperties}
              >
                <Circle size={18} weight="bold" className="mt-1 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="flex flex-wrap items-baseline gap-x-2 text-base font-semibold">
                    {requirement.title}
                    <span className="dossier-label">{greatWorkCopy.requirementMissingTag}</span>
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-paper-muted">{requirement.description}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-5 border-l-4 border-ink-line pl-3 text-sm text-paper-muted italic">
            {greatWorkCopy.closingReminder}
          </p>
        </div>
      </div>
    </section>
  )
}

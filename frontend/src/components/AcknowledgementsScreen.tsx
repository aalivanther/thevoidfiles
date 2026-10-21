import { ArrowLeft } from '@phosphor-icons/react'
import type { CSSProperties } from 'react'
import { acknowledgedResourceGroups } from '../demonstration/acknowledged_resources'
import { spanishInterfaceCopy } from '../spanish_interface_copy'

export function AcknowledgementsScreen({ onReturnRequested }: { onReturnRequested: () => void }) {
  const acknowledgementsCopy = spanishInterfaceCopy.acknowledgements
  return (
    <main id="main-content" className="mx-auto w-full max-w-3xl px-4 pt-16 pb-20 sm:px-8 lg:pt-20">
      <button type="button" className="quiet-action-button" onClick={onReturnRequested}>
        <ArrowLeft size={18} weight="bold" aria-hidden="true" />
        {acknowledgementsCopy.returnButton}
      </button>
      <h1 className="display-title mt-6 text-5xl sm:text-7xl">{acknowledgementsCopy.title}</h1>
      <p className="narrative-prose mt-4">{acknowledgementsCopy.description}</p>

      {acknowledgedResourceGroups.map((resourceGroup, groupIndex) => (
        <section
          key={resourceGroup.groupTitle}
          className="entrance-from-below mt-10"
          style={{ '--entrance-order': groupIndex } as CSSProperties}
          aria-labelledby={`acknowledged-group-${groupIndex}`}
        >
          <h2
            id={`acknowledged-group-${groupIndex}`}
            className="display-title border-b-2 border-blood-accent pb-2 text-2xl text-blood-accent-text"
          >
            {resourceGroup.groupTitle}
          </h2>
          <ul className="flex flex-col">
            {resourceGroup.resources.map((acknowledgedResource) => (
              <li key={acknowledgedResource.resourceName} className="border-b border-ink-line py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="font-[family-name:var(--font-narrative)] text-xl font-semibold">
                    {acknowledgedResource.resourceName}
                  </p>
                  <span className="cost-tag">{acknowledgedResource.licenseName}</span>
                </div>
                <p className="mt-1 text-[0.9688rem] text-paper-text">{acknowledgedResource.authorName}</p>
                <p className="mt-1 text-sm text-paper-muted">{acknowledgedResource.contributionText}</p>
                <p className="mt-1 font-[family-name:var(--font-dossier)] text-xs text-paper-muted [overflow-wrap:anywhere]">
                  {acknowledgedResource.sourceAddress}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  )
}

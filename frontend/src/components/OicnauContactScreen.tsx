import { ArrowRight, Handshake, HandPalm, Signature } from '@phosphor-icons/react'
import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useInteractionFeedback } from '../audio/interaction_feedback'
import { oicnauContactPanels, oicnauStanceOptions } from '../demonstration/oicnau_contact_script'
import type { OicnauStanceOption } from '../demonstration/oicnau_contact_script'
import type { InvestigatorRegistration, OicnauStance } from '../game_state/chronicle_state'
import { spanishInterfaceCopy } from '../spanish_interface_copy'
import { PanelNarrationScreen } from './PanelNarrationScreen'
import { TypewriterNarration } from './TypewriterNarration'

const iconByOicnauStance = {
  sanctioned_operative: Signature,
  independent_ally: Handshake,
  refused_offer: HandPalm,
} as const

type OicnauContactScreenProperties = {
  investigatorRegistration: InvestigatorRegistration | null
  chosenStance: OicnauStance | null
  onStanceChosen: (oicnauStance: OicnauStance) => void
  onContactFinished: () => void
}

export function OicnauContactScreen({
  investigatorRegistration,
  chosenStance,
  onStanceChosen,
  onContactFinished,
}: OicnauContactScreenProperties) {
  const oicnauCopy = spanishInterfaceCopy.oicnauContact
  const playInteractionFeedback = useInteractionFeedback()
  const [hasOfferBeenHeard, setHasOfferBeenHeard] = useState(chosenStance !== null)
  const [isReactionCompletionRequested, setIsReactionCompletionRequested] = useState(false)

  if (!hasOfferBeenHeard) {
    return (
      <PanelNarrationScreen
        chapterLabel={oicnauCopy.chapterLabel}
        chapterTitle={oicnauCopy.chapterTitle}
        narrationPanels={oicnauContactPanels}
        finishButtonText={oicnauCopy.finishNarrationButton}
        shouldShowStarfield={false}
        investigatorRegistration={investigatorRegistration}
        onNarrationFinished={() => setHasOfferBeenHeard(true)}
      />
    )
  }

  const chosenStanceOption: OicnauStanceOption | undefined = oicnauStanceOptions.find(
    (stanceOption) => stanceOption.oicnauStance === chosenStance,
  )

  if (chosenStanceOption) {
    return (
      <main
        id="main-content"
        className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-4 pt-16 pb-10 sm:px-8"
      >
        <p className="dossier-label !text-blood-accent-text">{oicnauCopy.stanceRecordLabel}</p>
        <h1 className="display-title entrance-stamp-pop mt-2 text-5xl sm:text-6xl">
          {oicnauCopy.stanceNames[chosenStanceOption.oicnauStance]}
        </h1>
        <p className="dossier-label mt-2">{chosenStanceOption.trustLabel}</p>
        <div
          className="narrative-prose mt-6 cursor-pointer"
          onClick={() => setIsReactionCompletionRequested(true)}
        >
          <TypewriterNarration
            paragraphs={[chosenStanceOption.contactReactionText]}
            shouldAnimateReveal
            isImmediateCompletionRequested={isReactionCompletionRequested}
            onRevealCompleted={() => undefined}
            onRevealProgressed={() => undefined}
          />
        </div>
        <div className="mt-8 flex justify-end">
          <button
            type="button"
            className="primary-action-button"
            onClick={() => {
              playInteractionFeedback('confirmation')
              onContactFinished()
            }}
          >
            {oicnauCopy.continueButton}
            <ArrowRight size={22} weight="bold" aria-hidden="true" />
          </button>
        </div>
      </main>
    )
  }

  return (
    <main id="main-content" className="mx-auto w-full max-w-6xl px-4 pt-16 pb-16 sm:px-8 lg:pt-20">
      <p className="dossier-label !text-blood-accent-text">{oicnauCopy.choiceEyebrow}</p>
      <h1 className="display-title mt-2 text-5xl sm:text-6xl">{oicnauCopy.choiceTitle}</h1>
      <p className="mt-2 text-paper-muted">{oicnauCopy.choiceHint}</p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {oicnauStanceOptions.map((stanceOption, optionIndex) => {
          const StanceIcon = iconByOicnauStance[stanceOption.oicnauStance]
          return (
            <article
              key={stanceOption.oicnauStance}
              className="comic-panel comic-panel-cut-corner entrance-from-below flex flex-col p-5"
              style={{ '--entrance-order': optionIndex } as CSSProperties}
            >
              <StanceIcon size={34} weight="fill" className="text-blood-accent" aria-hidden="true" />
              <h2 className="display-title mt-3 text-3xl">{stanceOption.headline}</h2>
              <p className="mt-2 font-[family-name:var(--font-narrative)] text-lg italic">
                {stanceOption.investigatorReplyText}
              </p>
              <ul className="mt-4 flex flex-1 flex-col gap-2 border-t-2 border-ink-line pt-4 text-sm">
                {stanceOption.consequenceLines.map((consequenceLine) => (
                  <li key={consequenceLine} className="flex gap-2">
                    <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 bg-blood-accent" aria-hidden="true" />
                    <span>{consequenceLine}</span>
                  </li>
                ))}
              </ul>
              <p className="dossier-label mt-4">{stanceOption.trustLabel}</p>
              <button
                type="button"
                className="quiet-action-button mt-4 w-full"
                onClick={() => {
                  playInteractionFeedback('stamp_impact')
                  onStanceChosen(stanceOption.oicnauStance)
                }}
              >
                {oicnauCopy.chooseButton}
              </button>
            </article>
          )
        })}
      </div>
    </main>
  )
}

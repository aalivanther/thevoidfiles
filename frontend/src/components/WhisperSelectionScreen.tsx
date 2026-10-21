import { LockKey, Path, WarningDiamond } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { Dialog } from 'radix-ui'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useInteractionFeedback } from '../audio/interaction_feedback'
import type { WhisperCardContent } from '../demonstration/demonstration_case_script'
import type { ArchiveOpeningResolution } from '../game_state/archive_turn_contract'
import { readWhisperCardsForSelection } from '../game_service/offered_whisper_reading'
import { useChronicleState } from '../game_state/chronicle_state'
import { usePlayerSettings } from '../settings/player_settings'
import { DecodingText } from './DecodingText'
import { DirectorGenerationLettering } from './director_generation_wait/DirectorGenerationLettering'
import { useDirectorGenerationWait } from './director_generation_wait/use_director_generation_wait'
import { directorGenerationWaitCopy } from '../copy/director_generation_wait_copy'
import { directorOperationFailureCopy, readDirectorOperationFailureText } from '../copy/director_operation_failure_copy'
import { RemoteArchiveOpeningUnavailableError } from '../game_service/remote_archive_director_service'
import { whisperSelectionCopy } from '../copy/whisper_selection_copy'

const whisperCreationVariantNames = ['radio_static', 'newspaper_print', 'intercepted_signal', 'ink_development']
const whisperCreationStaggerMilliseconds = 420
const whisperCreationDurationMilliseconds = 1500

const scrambleGlyphs = '▓▒░#%&@§¶†‡∆◊/\\'

function scrambleVisibleText(originalText: string, scrambledShare: number): string {
  return Array.from(originalText)
    .map((originalCharacter) => {
      if (originalCharacter === ' ' || Math.random() > scrambledShare) {
        return originalCharacter === ' ' ? ' ' : scrambleGlyphs[Math.floor(Math.random() * 3)]
      }
      return scrambleGlyphs[Math.floor(Math.random() * scrambleGlyphs.length)]
    })
    .join('')
}

function RestlessEncodedText({
  originalText,
  isAgitated,
  shouldHoldMotion,
}: {
  originalText: string
  isAgitated: boolean
  shouldHoldMotion: boolean
}) {
  const { shouldReduceMotion } = usePlayerSettings()
  const [scrambledText, setScrambledText] = useState(() => scrambleVisibleText(originalText, 0.25))

  useEffect(() => {
    if (shouldReduceMotion || shouldHoldMotion) {
      return
    }
    const intervalIdentifier = window.setInterval(
      () => setScrambledText(scrambleVisibleText(originalText, isAgitated ? 0.6 : 0.25)),
      isAgitated ? 90 : 420,
    )
    return () => window.clearInterval(intervalIdentifier)
  }, [originalText, isAgitated, shouldReduceMotion, shouldHoldMotion])

  return (
    <span className="encoded-whisper-text" aria-hidden="true">
      {scrambledText}
    </span>
  )
}

function WhisperFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="dossier-label">{label}</dt>
      <dd className="text-sm font-semibold">{value}</dd>
    </div>
  )
}

function WhisperCard({
  whisperCard,
  cardIndex,
  creationVariantName,
  hasBeenInvestigated,
  onChosen,
  shouldHoldEncodedMotion,
}: {
  whisperCard: WhisperCardContent
  cardIndex: number
  creationVariantName: string
  hasBeenInvestigated: boolean
  onChosen: (chosenWhisperCard: WhisperCardContent) => void
  shouldHoldEncodedMotion: boolean
}) {
  const creationDelayMilliseconds = cardIndex * whisperCreationStaggerMilliseconds + 500
  const playInteractionFeedback = useInteractionFeedback()
  const { shouldReduceMotion } = usePlayerSettings()
  const [isPointerOverCard, setIsPointerOverCard] = useState(false)
  const restingRotationDegrees = shouldReduceMotion ? 0 : [-0.8, 0.6, -0.4, 0.9][cardIndex % 4]

  return (
    <motion.article
      className={`comic-panel comic-panel-cut-corner relative flex w-full flex-col p-5 ${
        whisperCard.isEncoded ? '!border-arcane/60' : ''
      }`}
      initial={false}
      animate={{ rotate: restingRotationDegrees }}
      whileHover={shouldReduceMotion ? undefined : { rotate: 0, y: -4 }}
      transition={{ duration: 0.2, ease: [0.2, 0.9, 0.2, 1] }}
      onPointerEnter={() => {
        setIsPointerOverCard(true)
        playInteractionFeedback('option_hover')
      }}
      onPointerLeave={() => setIsPointerOverCard(false)}
    >
      <span
        className="whisper-creation-overlay"
        data-creation-variant={creationVariantName}
        style={{ '--creation-delay': `${creationDelayMilliseconds}ms` } as CSSProperties}
        aria-hidden="true"
      />
      <div className="flex items-start justify-between gap-3">
        <span className="display-title text-5xl text-ink-line" aria-hidden="true">
          {whisperCard.ordinalLabel}
        </span>
        {hasBeenInvestigated ? (
          <span className="cost-tag -rotate-2">{whisperSelectionCopy.investigatedBadge}</span>
        ) : null}
        {whisperCard.isEncoded ? (
          <span className="flex items-center gap-1.5 border border-arcane/60 px-2 py-1 font-[family-name:var(--font-dossier)] text-[0.6875rem] font-bold tracking-[0.12em] text-arcane uppercase">
            <LockKey size={14} weight="fill" aria-hidden="true" />
            {whisperSelectionCopy.encodedBadge}
          </span>
        ) : null}
      </div>

      <h2 className="display-title mt-3 text-2xl sm:text-[1.75rem]">
        {whisperCard.isEncoded ? (
          <>
            <RestlessEncodedText
              originalText={whisperCard.headline}
              isAgitated={isPointerOverCard}
              shouldHoldMotion={shouldHoldEncodedMotion}
            />
            <span className="visually-hidden-text">{whisperSelectionCopy.encodedBadge}</span>
          </>
        ) : (
          <DecodingText
            finalText={whisperCard.headline}
            startDelayMilliseconds={creationDelayMilliseconds + 250}
            durationMilliseconds={700}
          />
        )}
      </h2>
      <p className="dossier-label mt-2">{whisperCard.sourceLabel}</p>

      <p className="mt-4 flex-1 font-[family-name:var(--font-narrative)] text-[1.0313rem] leading-relaxed">
        <DecodingText
          finalText={whisperCard.rumorText}
          startDelayMilliseconds={creationDelayMilliseconds + 450}
          durationMilliseconds={whisperCreationDurationMilliseconds}
        />
      </p>
      {whisperCard.isEncoded ? (
        <p className="mt-3 flex items-start gap-2 text-xs text-paper-muted">
          <WarningDiamond size={16} weight="fill" className="mt-0.5 shrink-0 text-arcane" aria-hidden="true" />
          {whisperSelectionCopy.encodedExplanation}
        </p>
      ) : null}

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t-2 border-ink-line pt-4">
        <WhisperFact label={whisperSelectionCopy.distanceLabel} value={whisperCard.distanceText} />
        <WhisperFact label={whisperSelectionCopy.sphereLabel} value={whisperCard.sphereText} />
        <WhisperFact label={whisperSelectionCopy.toneLabel} value={whisperCard.toneText} />
        <WhisperFact label={whisperSelectionCopy.threatLabel} value={whisperCard.threatText} />
        <WhisperFact label={whisperSelectionCopy.rewardLabel} value={whisperCard.rewardText} />
      </dl>

      <button
        type="button"
        className="quiet-action-button mt-5 w-full"
        onClick={() => {
          playInteractionFeedback('option_click')
          onChosen(whisperCard)
        }}
      >
        <Path size={18} weight="bold" aria-hidden="true" />
        {whisperSelectionCopy.chooseButton}
      </button>
    </motion.article>
  )
}

export function WhisperSelectionScreen({
  onArchiveMaterialRequested,
  onArchiveOpeningCommitted,
}: {
  onArchiveMaterialRequested: (whisperIdentifier: string) => Promise<ArchiveOpeningResolution>
  onArchiveOpeningCommitted: (whisperIdentifier: string, archiveOpeningResolution: ArchiveOpeningResolution) => void
}) {
  const playInteractionFeedback = useInteractionFeedback()
  const [whisperAwaitingConfirmation, setWhisperAwaitingConfirmation] = useState<WhisperCardContent | null>(null)
  const [offeredWhispers, setOfferedWhispers] = useState<WhisperCardContent[] | null>(null)
  const { chronicleState } = useChronicleState()
  const hasAwaitingWhisperBeenInvestigated =
    whisperAwaitingConfirmation !== null &&
    chronicleState.investigatorProgression.investigatedWhisperIdentifiers.includes(whisperAwaitingConfirmation.identifier)
  const elementFocusedBeforeConfirmation = useRef<HTMLElement | null>(null)
  const shuffledCreationVariantNames = useMemo(
    () => [...whisperCreationVariantNames].sort(() => Math.random() - 0.5),
    [],
  )
  const [areWhispersStillForming, setAreWhispersStillForming] = useState(true)
  const { waitStageName, isGenerationWaitActive, beginGeneration, markGenerationCompletedAndWaitForSequence } =
    useDirectorGenerationWait()
  const [openingFailureText, setOpeningFailureText] = useState<string | null>(null)
  const displayedWhispers = offeredWhispers ?? []

  useEffect(() => {
    let isCancelled = false
    void readWhisperCardsForSelection().then((loadedWhispers) => {
      if (!isCancelled) {
        setOfferedWhispers(loadedWhispers)
      }
    })
    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    if (offeredWhispers === null) {
      return
    }
    playInteractionFeedback('rising_whoosh')
    const tuningSoundTimeoutIdentifiers = offeredWhispers.map((_, cardIndex) =>
      window.setTimeout(
        () => playInteractionFeedback('screen_tear'),
        cardIndex * whisperCreationStaggerMilliseconds + 500,
      ),
    )
    const formingTimeoutIdentifier = window.setTimeout(
      () => setAreWhispersStillForming(false),
      offeredWhispers.length * whisperCreationStaggerMilliseconds + whisperCreationDurationMilliseconds + 700,
    )
    return () => {
      tuningSoundTimeoutIdentifiers.forEach((timeoutIdentifier) => window.clearTimeout(timeoutIdentifier))
      window.clearTimeout(formingTimeoutIdentifier)
    }
  }, [offeredWhispers, playInteractionFeedback])
  const rememberFocusAndAskConfirmation = (chosenWhisperCard: WhisperCardContent) => {
    elementFocusedBeforeConfirmation.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    setOpeningFailureText(null)
    setWhisperAwaitingConfirmation(chosenWhisperCard)
  }

  const readOpeningFailureText = (openingError: unknown) => {
    if (openingError instanceof RemoteArchiveOpeningUnavailableError) {
      return readDirectorOperationFailureText(openingError.failureName)
    }
    if (openingError instanceof Error && openingError.message === 'archive_opening_already_pending') {
      return readDirectorOperationFailureText('archive_opening_already_pending')
    }
    if (openingError instanceof Error && openingError.message === 'archive_opening_unavailable') {
      return readDirectorOperationFailureText('archive_opening_unavailable')
    }
    return readDirectorOperationFailureText('unexpected_service_answer')
  }

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-6xl px-4 pt-6 pb-16 sm:px-8"
      data-whisper-confirmation-open={whisperAwaitingConfirmation !== null ? 'true' : 'false'}
    >
      <p className="dossier-label" role="status">
        {areWhispersStillForming ? whisperSelectionCopy.formingStatus : whisperSelectionCopy.eyebrow}
        {areWhispersStillForming ? <span className="whisper-forming-ellipsis" aria-hidden="true" /> : null}
      </p>
      <h1 className="display-title mt-2 text-5xl sm:text-7xl">{whisperSelectionCopy.title}</h1>
      <p className="mt-3 max-w-2xl text-paper-muted">{whisperSelectionCopy.introduction}</p>
      <p className="dossier-label mt-2">{whisperSelectionCopy.searchRadius}</p>

      <div
        className={
          displayedWhispers.length === 1
            ? 'mt-8 grid max-w-xl grid-cols-1 gap-6'
            : 'mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4'
        }
      >
        {displayedWhispers.map((whisperCard, cardIndex) => (
          <div
            key={whisperCard.identifier}
            className="entrance-from-below flex"
            style={{ '--entrance-order': cardIndex } as CSSProperties}
          >
            <WhisperCard
              whisperCard={whisperCard}
              cardIndex={cardIndex}
              creationVariantName={shuffledCreationVariantNames[cardIndex % shuffledCreationVariantNames.length]}
              hasBeenInvestigated={chronicleState.investigatorProgression.investigatedWhisperIdentifiers.includes(
                whisperCard.identifier,
              )}
              onChosen={rememberFocusAndAskConfirmation}
              shouldHoldEncodedMotion={whisperAwaitingConfirmation !== null}
            />
          </div>
        ))}
      </div>

      <Dialog.Root
        open={whisperAwaitingConfirmation !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen && !isGenerationWaitActive) {
            setWhisperAwaitingConfirmation(null)
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content
            className="centered-dialog-content comic-panel p-5 sm:p-6"
            onCloseAutoFocus={(closeEvent) => {
              if (elementFocusedBeforeConfirmation.current?.isConnected) {
                closeEvent.preventDefault()
                elementFocusedBeforeConfirmation.current.focus()
              }
            }}
          >
            <p className="dossier-label">{whisperSelectionCopy.confirmTitle}</p>
            <Dialog.Title className="display-title mt-2 text-3xl">
              {whisperAwaitingConfirmation?.isEncoded
                ? whisperSelectionCopy.encodedBadge
                : whisperAwaitingConfirmation?.headline}
            </Dialog.Title>
            <Dialog.Description className="mt-3 text-sm text-paper-muted">
              {hasAwaitingWhisperBeenInvestigated
                ? whisperSelectionCopy.alreadyInvestigated
                : whisperAwaitingConfirmation?.isPlayableInDemonstration
                  ? whisperSelectionCopy.confirmDescription
                  : whisperAwaitingConfirmation?.isEncoded
                    ? whisperSelectionCopy.encodedExplanation
                    : whisperSelectionCopy.unavailableInDemonstration}
            </Dialog.Description>
            {isGenerationWaitActive && waitStageName !== 'idle' ? (
              <div className="director-generation-wait-panel mt-5">
                <DirectorGenerationLettering
                  waitStageName={waitStageName}
                  assemblingText={directorGenerationWaitCopy.archiveOpening.assemblingText}
                  loopingTexts={directorGenerationWaitCopy.archiveOpening.loopingTexts}
                  completingText={directorGenerationWaitCopy.archiveOpening.completingText}
                  statusLabel={directorGenerationWaitCopy.archiveOpening.statusLabel}
                />
              </div>
            ) : null}
            {openingFailureText !== null ? (
              <p className="mt-4 text-sm text-paper-muted" role="alert">
                {directorOperationFailureCopy.openingFailedTitle}. {openingFailureText}
              </p>
            ) : null}
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Dialog.Close asChild>
                <button type="button" className="quiet-action-button" disabled={isGenerationWaitActive}>
                  {whisperSelectionCopy.cancelButton}
                </button>
              </Dialog.Close>
              {whisperAwaitingConfirmation !== null && !hasAwaitingWhisperBeenInvestigated ? (
                <button
                  type="button"
                  className="primary-action-button"
                  disabled={isGenerationWaitActive}
                  onClick={() => {
                    const chosenWhisperIdentifier = whisperAwaitingConfirmation.identifier
                    playInteractionFeedback('stamp_impact')
                    setOpeningFailureText(null)
                    beginGeneration()
                    void onArchiveMaterialRequested(chosenWhisperIdentifier)
                      .then(async (archiveOpeningResolution) => {
                        await markGenerationCompletedAndWaitForSequence()
                        onArchiveOpeningCommitted(chosenWhisperIdentifier, archiveOpeningResolution)
                      })
                      .catch(async (openingError: unknown) => {
                        await markGenerationCompletedAndWaitForSequence()
                        playInteractionFeedback('rejection')
                        setOpeningFailureText(readOpeningFailureText(openingError))
                      })
                  }}
                >
                  {whisperSelectionCopy.confirmButton}
                </button>
              ) : null}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  )
}

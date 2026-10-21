import { FloppyDisk, Lightning, Minus, NotePencil, PushPin, TrendDown, TrendUp } from '@phosphor-icons/react'
import { Tabs } from 'radix-ui'
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { chooseAnimationVariantName, randomNumberBetween } from '../../animation/animation_variety'
import { useInteractionFeedback } from '../../audio/interaction_feedback'
import { organizationsAlliesCopy } from '../../copy/organizations_allies_copy'
import type {
  DirectedRelationship,
  KnownContact,
  KnownFaction,
  RelationshipDimensionName,
} from '../../demonstration/organizations_allies_data'
import { maximumPlayerNoteLength } from './organizations_allies_record'
import type { AcknowledgedRelationshipLevels } from './organizations_allies_record'
import { BoardInkStamp, ContactSilhouettePhotograph, RelationshipLevelScale } from './relationship_board_pieces'

const caseCardSlideVariantNames = ['slid_from_left', 'slid_from_right', 'dropped_from_above', 'spun_into_place'] as const
const savedStampVisibleMilliseconds = 2200
const remainingCharactersWarningThreshold = 80
const levelAcknowledgementDelayMilliseconds = 2400
const changeRevealSoundDelayMilliseconds = 450

function calculateLevelBeforeRecordedChanges(directedRelationship: DirectedRelationship): number {
  return directedRelationship.changeCauses.reduce(
    (accumulatedLevel, changeCause) => accumulatedLevel - changeCause.levelChange,
    directedRelationship.level,
  )
}

function resolvePreviouslySeenLevels(
  knownContact: KnownContact,
  acknowledgedLevels: AcknowledgedRelationshipLevels | undefined,
): AcknowledgedRelationshipLevels {
  return (
    acknowledgedLevels ?? {
      fromInvestigatorLevel: calculateLevelBeforeRecordedChanges(knownContact.relationshipFromInvestigator),
      towardInvestigatorLevel: calculateLevelBeforeRecordedChanges(knownContact.relationshipTowardInvestigator),
    }
  )
}

function hasUnseenLevelChange(
  knownContact: KnownContact,
  acknowledgedLevels: AcknowledgedRelationshipLevels | undefined,
): boolean {
  const previouslySeenLevels = resolvePreviouslySeenLevels(knownContact, acknowledgedLevels)
  return (
    previouslySeenLevels.fromInvestigatorLevel !== knownContact.relationshipFromInvestigator.level ||
    previouslySeenLevels.towardInvestigatorLevel !== knownContact.relationshipTowardInvestigator.level
  )
}

const relationshipDimensionNames: readonly RelationshipDimensionName[] = ['kinship', 'employment', 'debt', 'affection']

type ContactsBoardSectionProperties = {
  knownContacts: KnownContact[]
  knownFactions: KnownFaction[]
  investigatorShortName: string
  hasDeclaredNoRelationalAnchor: boolean
  selectedContactIdentifier: string | null
  onContactSelected: (contactIdentifier: string) => void
  playerNotesByContactIdentifier: Record<string, string>
  onPlayerNoteSaved: (contactIdentifier: string, noteText: string) => void
  acknowledgedRelationshipLevelsByContactIdentifier: Record<string, AcknowledgedRelationshipLevels>
  onRelationshipLevelsAcknowledged: (contactIdentifier: string, acknowledgedLevels: AcknowledgedRelationshipLevels) => void
}

type ChangeCauseListProperties = {
  directionLabel: string
  directedRelationship: DirectedRelationship
}

function ChangeCauseList({ directionLabel, directedRelationship }: ChangeCauseListProperties) {
  const contactsCopy = organizationsAlliesCopy.contacts
  return (
    <div className="min-w-0">
      <p className="font-[family-name:var(--font-dossier)] text-xs font-bold text-paper-muted [overflow-wrap:anywhere]">
        {directionLabel}
      </p>
      <ol className="factions-dated-thread mt-2">
        {directedRelationship.changeCauses.map((changeCause, changeCauseIndex) => (
          <li
            key={changeCause.identifier}
            className="factions-dated-thread-entry entrance-from-left"
            style={{ '--entrance-order': changeCauseIndex + 1 } as CSSProperties}
          >
            <PushPin size={16} weight="fill" className="factions-dated-thread-pin" aria-hidden="true" />
            <p className="flex min-w-0 flex-wrap items-center gap-x-2 font-[family-name:var(--font-dossier)] text-xs tracking-wide">
              <span className="text-blood-accent-text">{changeCause.fictionalDateLabel}</span>
              <span className="inline-flex items-center gap-1 text-paper-text">
                {changeCause.levelChange > 0 ? <TrendUp size={13} weight="bold" aria-hidden="true" /> : null}
                {changeCause.levelChange < 0 ? <TrendDown size={13} weight="bold" aria-hidden="true" /> : null}
                {changeCause.levelChange === 0 ? <Minus size={13} weight="bold" aria-hidden="true" /> : null}
                {contactsCopy.levelChangeLabel(changeCause.levelChange)}
              </span>
            </p>
            <p className="mt-0.5 text-[0.9375rem] leading-snug [overflow-wrap:anywhere]">{changeCause.causeText}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}

type ContactNotesFieldProperties = {
  knownContact: KnownContact
  savedNoteText: string
  onPlayerNoteSaved: (contactIdentifier: string, noteText: string) => void
}

function ContactNotesField({ knownContact, savedNoteText, onPlayerNoteSaved }: ContactNotesFieldProperties) {
  const contactsCopy = organizationsAlliesCopy.contacts
  const playInteractionFeedback = useInteractionFeedback()
  const [draftNoteText, setDraftNoteText] = useState(savedNoteText)
  const [isSavedStampVisible, setIsSavedStampVisible] = useState(false)
  const savedStampTimeoutIdentifier = useRef<number | null>(null)
  const hasUnsavedChanges = draftNoteText !== savedNoteText
  const remainingCharacterCount = maximumPlayerNoteLength - draftNoteText.length
  const noteFieldIdentifier = `contact-note-${knownContact.identifier}`

  useEffect(
    () => () => {
      if (savedStampTimeoutIdentifier.current !== null) {
        window.clearTimeout(savedStampTimeoutIdentifier.current)
      }
    },
    [],
  )

  const savePlayerNote = () => {
    if (!hasUnsavedChanges) {
      return
    }
    playInteractionFeedback('confirmation')
    onPlayerNoteSaved(knownContact.identifier, draftNoteText.trim())
    setDraftNoteText(draftNoteText.trim())
    setIsSavedStampVisible(true)
    if (savedStampTimeoutIdentifier.current !== null) {
      window.clearTimeout(savedStampTimeoutIdentifier.current)
    }
    savedStampTimeoutIdentifier.current = window.setTimeout(
      () => setIsSavedStampVisible(false),
      savedStampVisibleMilliseconds,
    )
  }

  return (
    <section aria-labelledby={`${noteFieldIdentifier}-heading`} className="min-w-0">
      <h4 id={`${noteFieldIdentifier}-heading`} className="factions-section-heading flex items-center gap-2">
        <NotePencil size={16} weight="fill" aria-hidden="true" />
        {contactsCopy.notesHeading}
      </h4>
      <label htmlFor={noteFieldIdentifier} className="visually-hidden-text">
        {contactsCopy.notesFieldLabel(knownContact.displayName)}
      </label>
      <textarea
        id={noteFieldIdentifier}
        className="free-action-field mt-2"
        style={{ maxHeight: 'none' }}
        rows={4}
        maxLength={maximumPlayerNoteLength}
        value={draftNoteText}
        placeholder={contactsCopy.notesPlaceholder}
        onChange={(changeEvent) => {
          playInteractionFeedback('typewriter_key')
          setDraftNoteText(changeEvent.target.value)
        }}
        onKeyDown={(keyboardEvent) => {
          if (keyboardEvent.key === 'Enter' && (keyboardEvent.metaKey || keyboardEvent.ctrlKey)) {
            keyboardEvent.preventDefault()
            savePlayerNote()
          }
        }}
      />
      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <button type="button" className="quiet-action-button" disabled={!hasUnsavedChanges} onClick={savePlayerNote}>
          <FloppyDisk size={16} weight="fill" aria-hidden="true" />
          {contactsCopy.saveNote}
        </button>
        {hasUnsavedChanges ? (
          <button
            type="button"
            className="quiet-action-button"
            onClick={() => {
              playInteractionFeedback('panel_close')
              setDraftNoteText(savedNoteText)
            }}
          >
            {contactsCopy.discardNoteChanges}
          </button>
        ) : null}
        <p className="min-w-0 text-sm text-paper-muted" role="status" aria-live="polite">
          {hasUnsavedChanges
            ? contactsCopy.noteUnsavedLabel
            : savedNoteText.length > 0
              ? contactsCopy.noteSavedLabel
              : contactsCopy.noteEmptyLabel}
        </p>
        {isSavedStampVisible ? <BoardInkStamp stampText={contactsCopy.noteSavedStamp} /> : null}
        {remainingCharacterCount <= remainingCharactersWarningThreshold ? (
          <p className="ml-auto font-[family-name:var(--font-dossier)] text-xs text-paper-muted">
            {contactsCopy.notesRemainingCharacters(remainingCharacterCount)}
          </p>
        ) : null}
      </div>
    </section>
  )
}

type ContactCaseFileProperties = {
  knownContact: KnownContact
  knownFactions: KnownFaction[]
  investigatorShortName: string
  savedNoteText: string
  onPlayerNoteSaved: (contactIdentifier: string, noteText: string) => void
  acknowledgedLevels: AcknowledgedRelationshipLevels | undefined
  onRelationshipLevelsAcknowledged: (contactIdentifier: string, acknowledgedLevels: AcknowledgedRelationshipLevels) => void
}

function ContactCaseFile({
  knownContact,
  knownFactions,
  investigatorShortName,
  savedNoteText,
  onPlayerNoteSaved,
  acknowledgedLevels,
  onRelationshipLevelsAcknowledged,
}: ContactCaseFileProperties) {
  const contactsCopy = organizationsAlliesCopy.contacts
  const playInteractionFeedback = useInteractionFeedback()
  const [levelsSeenBeforeThisReading] = useState(() => resolvePreviouslySeenLevels(knownContact, acknowledgedLevels))
  const currentFromInvestigatorLevel = knownContact.relationshipFromInvestigator.level
  const currentTowardInvestigatorLevel = knownContact.relationshipTowardInvestigator.level
  const hasChangeToReveal =
    levelsSeenBeforeThisReading.fromInvestigatorLevel !== currentFromInvestigatorLevel ||
    levelsSeenBeforeThisReading.towardInvestigatorLevel !== currentTowardInvestigatorLevel
  const isAcknowledgementPending =
    acknowledgedLevels?.fromInvestigatorLevel !== currentFromInvestigatorLevel ||
    acknowledgedLevels?.towardInvestigatorLevel !== currentTowardInvestigatorLevel
  const latestAcknowledgementCallback = useRef(onRelationshipLevelsAcknowledged)

  useEffect(() => {
    latestAcknowledgementCallback.current = onRelationshipLevelsAcknowledged
  }, [onRelationshipLevelsAcknowledged])

  useEffect(() => {
    if (!isAcknowledgementPending) {
      return
    }
    const acknowledgementTimeoutIdentifier = window.setTimeout(
      () =>
        latestAcknowledgementCallback.current(knownContact.identifier, {
          fromInvestigatorLevel: currentFromInvestigatorLevel,
          towardInvestigatorLevel: currentTowardInvestigatorLevel,
        }),
      levelAcknowledgementDelayMilliseconds,
    )
    return () => window.clearTimeout(acknowledgementTimeoutIdentifier)
  }, [isAcknowledgementPending, knownContact.identifier, currentFromInvestigatorLevel, currentTowardInvestigatorLevel])

  useEffect(() => {
    if (!hasChangeToReveal) {
      return
    }
    const revealSoundTimeoutIdentifier = window.setTimeout(
      () => playInteractionFeedback('pen_scratch'),
      changeRevealSoundDelayMilliseconds,
    )
    return () => window.clearTimeout(revealSoundTimeoutIdentifier)
  }, [hasChangeToReveal, playInteractionFeedback])
  const [caseCardSlideVariantName] = useState(() =>
    chooseAnimationVariantName('factions_case_card_slide', caseCardSlideVariantNames),
  )
  const fromInvestigatorLabel = contactsCopy.fromInvestigatorLabel(investigatorShortName, knownContact.displayName)
  const towardInvestigatorLabel = contactsCopy.towardInvestigatorLabel(investigatorShortName, knownContact.displayName)
  const affiliatedFaction = knownFactions.find(
    (knownFaction) => knownFaction.identifier === knownContact.affiliatedFactionIdentifier,
  )
  return (
    <article className="comic-panel factions-case-card min-w-0 p-4 sm:p-6" data-slide-variant={caseCardSlideVariantName}>
      <header className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-3 border-b-2 border-ink-line pb-4">
        <ContactSilhouettePhotograph silhouetteName={knownContact.silhouetteName} />
        <div className="min-w-0 flex-1">
          <p className="dossier-label">{knownContact.roleText}</p>
          <h3 className="display-title text-3xl [overflow-wrap:anywhere] sm:text-4xl">{knownContact.displayName}</h3>
          {knownContact.isNameKnown ? null : (
            <p className="mt-1">
              <BoardInkStamp stampText={contactsCopy.nameUnknownStamp} />
            </p>
          )}
          <p className="mt-2 text-sm text-paper-muted [overflow-wrap:anywhere]">
            <span className="dossier-label mr-2">{contactsCopy.firstSeenLabel}</span>
            {knownContact.firstSeenText}
          </p>
          <p className="mt-1 text-sm text-paper-muted [overflow-wrap:anywhere]">
            <span className="dossier-label mr-2">{contactsCopy.affiliationLabel}</span>
            {affiliatedFaction ? affiliatedFaction.factionName : contactsCopy.noAffiliation}
          </p>
        </div>
      </header>

      <div className="mt-5 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[repeat(2,minmax(0,1fr))]">
        <div className="min-w-0 space-y-6">
          <section aria-labelledby={`${knownContact.identifier}-known-heading`}>
            <h4 id={`${knownContact.identifier}-known-heading`} className="factions-section-heading">
              {contactsCopy.knownHeading}
            </h4>
            <div className="narrative-prose mt-2">
              {knownContact.knowledgeParagraphs.map((knowledgeParagraph) => (
                <p key={knowledgeParagraph}>{knowledgeParagraph}</p>
              ))}
            </div>
          </section>

          <section aria-labelledby={`${knownContact.identifier}-dimensions-heading`}>
            <h4 id={`${knownContact.identifier}-dimensions-heading`} className="factions-section-heading">
              {contactsCopy.dimensionsHeading}
            </h4>
            <p className="mt-1 text-sm text-paper-muted">{contactsCopy.dimensionsExplanation}</p>
            <dl className="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
              {relationshipDimensionNames.map((dimensionName, dimensionIndex) => {
                const dimensionText = knownContact.dimensionTexts[dimensionName]
                return (
                  <div key={dimensionName} className="factions-undiscovered-field" data-is-discovered={dimensionText !== null}>
                    <dt className="dossier-label">{contactsCopy.dimensionLabelByName[dimensionName]}</dt>
                    <dd className="mt-1.5 text-[0.9375rem] leading-snug [overflow-wrap:anywhere]">
                      {dimensionText ?? <BoardInkStamp entranceOrder={dimensionIndex + 1} />}
                    </dd>
                  </div>
                )
              })}
            </dl>
          </section>

          <ContactNotesField
            knownContact={knownContact}
            savedNoteText={savedNoteText}
            onPlayerNoteSaved={onPlayerNoteSaved}
          />
        </div>

        <div className="min-w-0 space-y-6">
          <section aria-labelledby={`${knownContact.identifier}-level-heading`}>
            <h4 id={`${knownContact.identifier}-level-heading`} className="factions-section-heading">
              {contactsCopy.levelScaleHeading}
            </h4>
            {hasChangeToReveal ? (
              <p className="mt-2">
                <BoardInkStamp stampText={contactsCopy.levelChangedStamp} entranceOrder={2} />
              </p>
            ) : null}
            <p className="mt-1 text-sm text-paper-muted">{contactsCopy.levelScaleExplanation}</p>
            <div className="mt-3 space-y-4">
              <RelationshipLevelScale
                directionLabel={fromInvestigatorLabel}
                level={currentFromInvestigatorLevel}
                previousLevel={levelsSeenBeforeThisReading.fromInvestigatorLevel}
                stableSeedText={`${knownContact.identifier}-from-investigator`}
              />
              <RelationshipLevelScale
                directionLabel={towardInvestigatorLabel}
                level={currentTowardInvestigatorLevel}
                previousLevel={levelsSeenBeforeThisReading.towardInvestigatorLevel}
                stableSeedText={`${knownContact.identifier}-toward-investigator`}
              />
            </div>
            <p className="mt-3 flex items-center gap-2 text-xs text-paper-muted">
              <span className="factions-level-scale-legend-swatch" aria-hidden="true" />
              {contactsCopy.lieutenantZoneLabel}
            </p>
          </section>

          <section aria-labelledby={`${knownContact.identifier}-causes-heading`}>
            <h4 id={`${knownContact.identifier}-causes-heading`} className="factions-section-heading">
              {contactsCopy.changeCausesHeading}
            </h4>
            <div className="mt-3 space-y-5">
              <ChangeCauseList
                directionLabel={fromInvestigatorLabel}
                directedRelationship={knownContact.relationshipFromInvestigator}
              />
              <ChangeCauseList
                directionLabel={towardInvestigatorLabel}
                directedRelationship={knownContact.relationshipTowardInvestigator}
              />
            </div>
          </section>
        </div>
      </div>
    </article>
  )
}

export function ContactsBoardSection({
  knownContacts,
  knownFactions,
  investigatorShortName,
  hasDeclaredNoRelationalAnchor,
  selectedContactIdentifier,
  onContactSelected,
  playerNotesByContactIdentifier,
  onPlayerNoteSaved,
  acknowledgedRelationshipLevelsByContactIdentifier,
  onRelationshipLevelsAcknowledged,
}: ContactsBoardSectionProperties) {
  const contactsCopy = organizationsAlliesCopy.contacts
  const playInteractionFeedback = useInteractionFeedback()
  const [policeCardStyles] = useState(() =>
    Array.from(
      { length: 8 },
      (_, policeCardIndex) =>
        ({
          '--plaque-rest-tilt': `${randomNumberBetween(-1.6, 1.6).toFixed(2)}deg`,
          '--entrance-order': policeCardIndex,
        }) as CSSProperties,
    ),
  )
  const effectiveSelectedContactIdentifier =
    knownContacts.find((knownContact) => knownContact.identifier === selectedContactIdentifier)?.identifier ??
    knownContacts[0]?.identifier

  return (
    <section aria-labelledby="contacts-section-title" className="min-w-0">
      <h2 id="contacts-section-title" className="display-title text-3xl sm:text-4xl">
        {contactsCopy.sectionTitle}
      </h2>
      <p className="mt-2 max-w-[68ch] text-[0.9375rem] text-paper-muted">{contactsCopy.sectionIntroduction}</p>
      {hasDeclaredNoRelationalAnchor ? (
        <p className="mt-2 max-w-[68ch] text-sm text-paper-muted">{contactsCopy.uprootedNotice(investigatorShortName)}</p>
      ) : null}

      {knownContacts.length === 0 || !effectiveSelectedContactIdentifier ? (
        <p className="comic-panel mt-5 p-5 text-paper-muted">{contactsCopy.emptyState}</p>
      ) : (
        <Tabs.Root
          value={effectiveSelectedContactIdentifier}
          onValueChange={(newContactIdentifier) => {
            playInteractionFeedback('panel_open')
            onContactSelected(newContactIdentifier)
          }}
          className="mt-5 min-w-0"
        >
          <Tabs.List
            className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-[repeat(2,minmax(0,1fr))] lg:grid-cols-[repeat(4,minmax(0,1fr))]"
            aria-label={contactsCopy.sectionTitle}
          >
            {knownContacts.map((knownContact, contactIndex) => (
              <Tabs.Trigger
                key={knownContact.identifier}
                value={knownContact.identifier}
                className="factions-police-card"
                style={policeCardStyles[contactIndex % policeCardStyles.length]}
                onPointerEnter={(pointerEvent) => {
                  if (pointerEvent.pointerType === 'mouse') {
                    playInteractionFeedback('option_hover')
                  }
                }}
              >
                <ContactSilhouettePhotograph silhouetteName={knownContact.silhouetteName} isCompact />
                <span className="min-w-0 text-left">
                  <span className="block font-[family-name:var(--font-dossier)] text-base leading-tight font-bold [overflow-wrap:anywhere]">
                    {knownContact.displayName}
                  </span>
                  <span className="factions-paper-label mt-1 block">{knownContact.roleText}</span>
                  <span className="mt-1.5 block font-[family-name:var(--font-dossier)] text-xs">
                    {contactsCopy.policeCardLevels(
                      knownContact.relationshipFromInvestigator.level,
                      knownContact.relationshipTowardInvestigator.level,
                    )}
                  </span>
                  {hasUnseenLevelChange(
                    knownContact,
                    acknowledgedRelationshipLevelsByContactIdentifier[knownContact.identifier],
                  ) ? (
                    <span className="factions-police-card-change-flag mt-1.5">
                      <Lightning size={13} weight="fill" aria-hidden="true" />
                      {contactsCopy.policeCardLevelChanged}
                    </span>
                  ) : null}
                  <span className="factions-paper-label mt-1 block">
                    {playerNotesByContactIdentifier[knownContact.identifier]
                      ? contactsCopy.policeCardWithNotes
                      : contactsCopy.noteEmptyLabel}
                  </span>
                </span>
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          {knownContacts.map((knownContact) => (
            <Tabs.Content key={knownContact.identifier} value={knownContact.identifier} className="mt-6 min-w-0">
              <ContactCaseFile
                knownContact={knownContact}
                knownFactions={knownFactions}
                investigatorShortName={investigatorShortName}
                savedNoteText={playerNotesByContactIdentifier[knownContact.identifier] ?? ''}
                onPlayerNoteSaved={onPlayerNoteSaved}
                acknowledgedLevels={acknowledgedRelationshipLevelsByContactIdentifier[knownContact.identifier]}
                onRelationshipLevelsAcknowledged={onRelationshipLevelsAcknowledged}
              />
            </Tabs.Content>
          ))}
        </Tabs.Root>
      )}
    </section>
  )
}

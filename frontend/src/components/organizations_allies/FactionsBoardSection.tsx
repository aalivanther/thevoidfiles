import { Eye, Handshake, Lightning, PushPin } from '@phosphor-icons/react'
import { Tabs } from 'radix-ui'
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { chooseAnimationVariantName, randomNumberBetween } from '../../animation/animation_variety'
import { useInteractionFeedback } from '../../audio/interaction_feedback'
import { organizationsAlliesCopy } from '../../copy/organizations_allies_copy'
import type { FactionIdentifier, KnownFaction } from '../../demonstration/organizations_allies_data'
import type { OicnauStance } from '../../game_state/chronicle_state'
import { usePlayerSettings } from '../../settings/player_settings'
import { FactionEmblem } from './FactionEmblem'
import { HandDrawnTallyMarks } from './HandDrawnStandingGauge'
import { OicnauBondPanel } from './OicnauBondPanel'
import { BoardInkStamp, UndiscoveredField } from './relationship_board_pieces'

const caseCardSlideVariantNames = ['slid_from_left', 'slid_from_right', 'dropped_from_above', 'spun_into_place'] as const
const stampImpactSoundDelayMilliseconds = 420
const postureAcknowledgementDelayMilliseconds = 2400

function readUnseenPostureSignalIdentifiers(knownFaction: KnownFaction, acknowledgedSignalIdentifiers: string[] | undefined): string[] {
  return knownFaction.postureSignals
    .map((postureSignal) => postureSignal.identifier)
    .filter((signalIdentifier) => !(acknowledgedSignalIdentifiers ?? []).includes(signalIdentifier))
}

type FactionsBoardSectionProperties = {
  knownFactions: KnownFaction[]
  oicnauStance: OicnauStance | null
  investigatorShortName: string
  selectedFactionIdentifier: FactionIdentifier
  onFactionSelected: (factionIdentifier: FactionIdentifier) => void
  acknowledgedPostureSignalIdentifiersByFactionIdentifier: Record<string, string[]>
  onPostureSignalsAcknowledged: (factionIdentifier: FactionIdentifier, signalIdentifiers: string[]) => void
}

type FactionCaseFileProperties = {
  knownFaction: KnownFaction
  oicnauStance: OicnauStance | null
  investigatorShortName: string
  acknowledgedSignalIdentifiers: string[] | undefined
  onPostureSignalsAcknowledged: (factionIdentifier: FactionIdentifier, signalIdentifiers: string[]) => void
}

function FactionCaseFile({
  knownFaction,
  oicnauStance,
  investigatorShortName,
  acknowledgedSignalIdentifiers,
  onPostureSignalsAcknowledged,
}: FactionCaseFileProperties) {
  const factionsCopy = organizationsAlliesCopy.factions
  const [signalIdentifiersNewInThisReading] = useState(() =>
    readUnseenPostureSignalIdentifiers(knownFaction, acknowledgedSignalIdentifiers),
  )
  const pendingSignalIdentifiersText = readUnseenPostureSignalIdentifiers(knownFaction, acknowledgedSignalIdentifiers).join('|')
  const everySignalIdentifiersText = knownFaction.postureSignals.map((postureSignal) => postureSignal.identifier).join('|')
  const latestAcknowledgementCallback = useRef(onPostureSignalsAcknowledged)
  const trustSignalCount = knownFaction.postureSignals.filter((postureSignal) => postureSignal.kind === 'trust').length
  const suspicionSignalCount = knownFaction.postureSignals.length - trustSignalCount

  useEffect(() => {
    latestAcknowledgementCallback.current = onPostureSignalsAcknowledged
  }, [onPostureSignalsAcknowledged])

  useEffect(() => {
    if (pendingSignalIdentifiersText.length === 0) {
      return
    }
    const acknowledgementTimeoutIdentifier = window.setTimeout(
      () => latestAcknowledgementCallback.current(knownFaction.identifier, everySignalIdentifiersText.split('|')),
      postureAcknowledgementDelayMilliseconds,
    )
    return () => window.clearTimeout(acknowledgementTimeoutIdentifier)
  }, [pendingSignalIdentifiersText, everySignalIdentifiersText, knownFaction.identifier])
  const [caseCardSlideVariantName] = useState(() =>
    chooseAnimationVariantName('factions_case_card_slide', caseCardSlideVariantNames),
  )
  if (knownFaction.knowledgeDepth === 'no_contact') {
    return (
      <article className="comic-panel factions-case-card p-5" data-slide-variant={caseCardSlideVariantName}>
        <p className="narrative-prose">{factionsCopy.noContactExplanation}</p>
      </article>
    )
  }
  return (
    <article className="comic-panel factions-case-card min-w-0 p-4 sm:p-6" data-slide-variant={caseCardSlideVariantName}>
      <header className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-3 border-b-2 border-ink-line pb-4">
        <FactionEmblem
          factionIdentifier={knownFaction.identifier}
          accessibleDescription={factionsCopy.emblemDescriptionByFactionIdentifier[knownFaction.identifier]}
          className="h-24 w-24 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="dossier-label">{factionsCopy.knowledgeDepthLabelByName[knownFaction.knowledgeDepth]}</p>
          <h3 className="display-title text-3xl [overflow-wrap:anywhere] sm:text-4xl">{knownFaction.factionName}</h3>
          <p className="font-[family-name:var(--font-dossier)] text-sm text-paper-muted">
            {knownFaction.epithetName} · {knownFaction.doctrineText}
          </p>
        </div>
      </header>

      <div className="mt-5 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <section aria-labelledby={`${knownFaction.identifier}-known-heading`}>
            <h4 id={`${knownFaction.identifier}-known-heading`} className="factions-section-heading">
              {factionsCopy.knownHeading}
            </h4>
            <div className="narrative-prose mt-2">
              {knownFaction.knowledgeParagraphs.map((knowledgeParagraph) => (
                <p key={knowledgeParagraph}>{knowledgeParagraph}</p>
              ))}
            </div>
            <p className="mt-3 text-sm text-paper-muted [overflow-wrap:anywhere]">
              <span className="dossier-label mr-2">{factionsCopy.sourceLabel}</span>
              {knownFaction.knowledgeSourceText}
            </p>
          </section>

          <section aria-labelledby={`${knownFaction.identifier}-history-heading`}>
            <h4 id={`${knownFaction.identifier}-history-heading`} className="factions-section-heading">
              {factionsCopy.historyHeading}
            </h4>
            <ol className="factions-dated-thread mt-3">
              {knownFaction.interactions.map((interaction, interactionIndex) => (
                <li
                  key={`${interaction.identifier}-${interactionIndex}`}
                  className="factions-dated-thread-entry entrance-from-left"
                  style={{ '--entrance-order': interactionIndex + 2 } as CSSProperties}
                >
                  <PushPin size={16} weight="fill" className="factions-dated-thread-pin" aria-hidden="true" />
                  <p className="font-[family-name:var(--font-dossier)] text-xs tracking-wide text-blood-accent-text">
                    {interaction.fictionalDateLabel}
                  </p>
                  <p className="mt-0.5 text-[0.9375rem] leading-snug [overflow-wrap:anywhere]">{interaction.descriptionText}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="min-w-0 space-y-6">
          <section aria-labelledby={`${knownFaction.identifier}-posture-heading`}>
            <h4 id={`${knownFaction.identifier}-posture-heading`} className="factions-section-heading">
              {factionsCopy.postureHeading} {investigatorShortName}
            </h4>
            {knownFaction.postureSummaryText ? (
              <>
                <p className="mt-2 font-[family-name:var(--font-dossier)] text-base font-bold [overflow-wrap:anywhere]">
                  {knownFaction.postureSummaryText}
                </p>
                <p className="mt-1 text-sm text-paper-muted">{factionsCopy.postureExplanation}</p>
                <dl className="factions-posture-tally mt-3">
                  <div className="factions-posture-tally-row" data-signal-kind="trust">
                    <dt>
                      <Handshake size={16} weight="fill" aria-hidden="true" />
                      {factionsCopy.trustTallyLabel}
                    </dt>
                    <dd>
                      <HandDrawnTallyMarks
                        stableSeedText={`${knownFaction.identifier}-trust`}
                        markCount={trustSignalCount}
                        toneName="trust"
                      />
                      <span className="factions-posture-tally-count">{trustSignalCount}</span>
                    </dd>
                  </div>
                  <div className="factions-posture-tally-row" data-signal-kind="suspicion">
                    <dt>
                      <Eye size={16} weight="fill" aria-hidden="true" />
                      {factionsCopy.suspicionTallyLabel}
                    </dt>
                    <dd>
                      <HandDrawnTallyMarks
                        stableSeedText={`${knownFaction.identifier}-suspicion`}
                        markCount={suspicionSignalCount}
                        toneName="suspicion"
                      />
                      <span className="factions-posture-tally-count">{suspicionSignalCount}</span>
                    </dd>
                  </div>
                </dl>
                <ul className="mt-3 space-y-2.5">
                  {knownFaction.postureSignals.map((postureSignal, postureSignalIndex) => (
                    <li
                      key={postureSignal.identifier}
                      className="factions-posture-signal entrance-from-below"
                      data-signal-kind={postureSignal.kind}
                      data-is-new-signal={signalIdentifiersNewInThisReading.includes(postureSignal.identifier)}
                      style={{ '--entrance-order': postureSignalIndex + 1 } as CSSProperties}
                    >
                      <span className="factions-posture-signal-kind">
                        {postureSignal.kind === 'trust' ? (
                          <Handshake size={16} weight="fill" aria-hidden="true" />
                        ) : (
                          <Eye size={16} weight="fill" aria-hidden="true" />
                        )}
                        {postureSignal.kind === 'trust' ? factionsCopy.trustSignalLabel : factionsCopy.suspicionSignalLabel}
                      </span>
                      {signalIdentifiersNewInThisReading.includes(postureSignal.identifier) ? (
                        <span className="ml-2 inline-block align-middle">
                          <BoardInkStamp stampText={factionsCopy.newSignalStamp} entranceOrder={postureSignalIndex + 2} />
                        </span>
                      ) : null}
                      <p className="mt-1 text-[0.9375rem] leading-snug [overflow-wrap:anywhere]">{postureSignal.signalText}</p>
                      <p className="mt-1 text-xs text-paper-muted [overflow-wrap:anywhere]">
                        <span className="font-semibold">{factionsCopy.causeLabel}: </span>
                        {postureSignal.causeText}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-2 text-[0.9375rem] text-paper-muted">
                {factionsCopy.noPostureKnown} {investigatorShortName}.
              </p>
            )}
          </section>

          <dl className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
            <UndiscoveredField fieldLabel={factionsCopy.alignmentLabel} entranceOrder={1} />
            <UndiscoveredField fieldLabel={factionsCopy.objectivesLabel} entranceOrder={3} />
            <UndiscoveredField fieldLabel={factionsCopy.resourcesLabel} entranceOrder={5} />
          </dl>

          {knownFaction.identifier !== 'oicnau' ? (
            <section aria-labelledby={`${knownFaction.identifier}-bond-heading`}>
              <h4 id={`${knownFaction.identifier}-bond-heading`} className="factions-section-heading">
                {factionsCopy.bondHeading}
              </h4>
              <p className="mt-2 text-[0.9375rem] text-paper-muted">{factionsCopy.noBondWithRumoredFaction}</p>
            </section>
          ) : null}
        </div>
      </div>

      {knownFaction.identifier === 'oicnau' && oicnauStance !== null ? (
        <OicnauBondPanel oicnauStance={oicnauStance} investigatorShortName={investigatorShortName} />
      ) : null}
    </article>
  )
}

export function FactionsBoardSection({
  knownFactions,
  oicnauStance,
  investigatorShortName,
  selectedFactionIdentifier,
  onFactionSelected,
  acknowledgedPostureSignalIdentifiersByFactionIdentifier,
  onPostureSignalsAcknowledged,
}: FactionsBoardSectionProperties) {
  const factionsCopy = organizationsAlliesCopy.factions
  const playInteractionFeedback = useInteractionFeedback()
  const { shouldReduceMotion } = usePlayerSettings()
  const [plaqueTiltStyles] = useState(() =>
    knownFactions.map(
      (_, plaqueIndex) =>
        ({
          '--plaque-rest-tilt': `${randomNumberBetween(-1.2, 1.2).toFixed(2)}deg`,
          '--entrance-order': plaqueIndex,
        }) as CSSProperties,
    ),
  )

  const effectiveSelectedFactionIdentifier =
    knownFactions.find((knownFaction) => knownFaction.identifier === selectedFactionIdentifier)?.identifier ??
    knownFactions[0]?.identifier ??
    'oicnau'

  useEffect(() => {
    if (shouldReduceMotion) {
      return
    }
    const stampImpactTimeoutIdentifier = window.setTimeout(
      () => playInteractionFeedback('stamp_impact'),
      stampImpactSoundDelayMilliseconds,
    )
    return () => window.clearTimeout(stampImpactTimeoutIdentifier)
  }, [effectiveSelectedFactionIdentifier, playInteractionFeedback, shouldReduceMotion])

  return (
    <section aria-labelledby="factions-section-title" className="min-w-0">
      <h2 id="factions-section-title" className="display-title text-3xl sm:text-4xl">
        {factionsCopy.sectionTitle}
      </h2>
      <p className="mt-2 max-w-[68ch] text-[0.9375rem] text-paper-muted">{factionsCopy.sectionIntroduction}</p>

      <Tabs.Root
        value={effectiveSelectedFactionIdentifier}
        onValueChange={(newFactionIdentifier) => {
          const newlySelectedFaction = knownFactions.find((knownFaction) => knownFaction.identifier === newFactionIdentifier)
          if (newlySelectedFaction) {
            playInteractionFeedback('panel_open')
            onFactionSelected(newlySelectedFaction.identifier)
          }
        }}
        className="mt-5 min-w-0"
      >
        <Tabs.List
          className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))]"
          aria-label={factionsCopy.sectionTitle}
        >
          {knownFactions.map((knownFaction, factionIndex) => (
            <Tabs.Trigger
              key={knownFaction.identifier}
              value={knownFaction.identifier}
              className="factions-plaque"
              style={plaqueTiltStyles[factionIndex]}
              onPointerEnter={(pointerEvent) => {
                if (pointerEvent.pointerType === 'mouse') {
                  playInteractionFeedback('option_hover')
                }
              }}
            >
              <FactionEmblem factionIdentifier={knownFaction.identifier} className="h-14 w-14 shrink-0 sm:h-16 sm:w-16" />
              <span className="min-w-0 text-left">
                <span className="display-title block text-xl [overflow-wrap:anywhere]">{knownFaction.factionName}</span>
                <span className="block font-[family-name:var(--font-dossier)] text-xs text-paper-muted">
                  {knownFaction.epithetName}
                </span>
                <span className="mt-1 block text-xs text-paper-muted">
                  {factionsCopy.knowledgeDepthLabelByName[knownFaction.knowledgeDepth]}
                </span>
                {readUnseenPostureSignalIdentifiers(
                  knownFaction,
                  acknowledgedPostureSignalIdentifiersByFactionIdentifier[knownFaction.identifier],
                ).length > 0 ? (
                  <span className="factions-police-card-change-flag mt-1.5" data-is-on-dark-ground="true">
                    <Lightning size={13} weight="fill" aria-hidden="true" />
                    {factionsCopy.plaqueNewSignals}
                  </span>
                ) : null}
              </span>
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {knownFactions.map((knownFaction) => (
          <Tabs.Content key={knownFaction.identifier} value={knownFaction.identifier} className="mt-6 min-w-0">
            <FactionCaseFile
              knownFaction={knownFaction}
              oicnauStance={oicnauStance}
              investigatorShortName={investigatorShortName}
              acknowledgedSignalIdentifiers={acknowledgedPostureSignalIdentifiersByFactionIdentifier[knownFaction.identifier]}
              onPostureSignalsAcknowledged={onPostureSignalsAcknowledged}
            />
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </section>
  )
}

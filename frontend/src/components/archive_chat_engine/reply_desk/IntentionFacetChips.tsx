import { Check, SlidersHorizontal, X } from '@phosphor-icons/react'
import { Dialog, Popover } from 'radix-ui'
import type { KeyboardEvent } from 'react'
import { useInteractionFeedback } from '../../../audio/interaction_feedback'
import { replyDeskCopy } from '../../../copy/archive_chat_engine/reply_desk_copy'
import type { IntentionFacetName } from '../../../copy/archive_chat_engine/reply_desk_copy'
import { readBelongingVisibleName } from '../../../demonstration/demonstration_case_script'
import type { ArchiveScenePresentation, BelongingIdentifier } from '../../../game_state/archive_turn_contract'
import { formatAmount, useChronicleState } from '../../../game_state/chronicle_state'
import type { InvestigatorState } from '../../../game_state/chronicle_state'
import { intentionFacetNamesInOrder } from './intention_facet_names'

type IntentionFacetItem = {
  itemLabel: string
  insertedFragment: string
}

type IntentionFacetChipsProperties = {
  scenePresentation: ArchiveScenePresentation
  investigator: InvestigatorState
  presentationName: 'visible_row' | 'refinement_sheet'
  isRefinementSheetOpen: boolean
  openFacetName: IntentionFacetName | null
  indicatedFacetNames: IntentionFacetName[]
  onOpenFacetChanged: (facetName: IntentionFacetName | null) => void
  onRefinementSheetOpenChanged: (isOpen: boolean) => void
  onRefinementSheetClosedFocusRequested: () => void
  onFragmentChosen: (facetName: IntentionFacetName, insertedFragment: string) => void
}

function readIntentionFacetItems(
  facetName: IntentionFacetName,
  scenePresentation: ArchiveScenePresentation,
  investigator: InvestigatorState,
  liveBelongingDefinitions?: Record<string, { visibleName: string }> | null,
): IntentionFacetItem[] {
  switch (facetName) {
    case 'objective':
      return [{ itemLabel: replyDeskCopy.objectiveFacetItemLabel, insertedFragment: replyDeskCopy.objectiveFacetOpening }]
    case 'method':
      return replyDeskCopy.methodFacetFragments.map((fragment) => ({ itemLabel: fragment, insertedFragment: fragment }))
    case 'precaution':
      return replyDeskCopy.precautionFacetFragments.map((fragment) => ({ itemLabel: fragment, insertedFragment: fragment }))
    case 'resource': {
      const belongingItems = (Object.keys(investigator.belongingUnits) as BelongingIdentifier[])
        .filter((belongingIdentifier) => investigator.belongingUnits[belongingIdentifier] > 0)
        .map((belongingIdentifier) => {
          const belongingName = readBelongingVisibleName(belongingIdentifier, liveBelongingDefinitions)
          return {
            itemLabel: replyDeskCopy.resourceFacetBelongingItemLabel(
              belongingName,
              investigator.belongingUnits[belongingIdentifier],
            ),
            insertedFragment: replyDeskCopy.resourceFacetBelongingFragment(belongingName.toLowerCase()),
          }
        })
      return [
        ...belongingItems,
        {
          itemLabel: replyDeskCopy.resourceFacetFundsItemLabel(formatAmount(investigator.operationalFunds)),
          insertedFragment: replyDeskCopy.resourceFacetFundsFragment,
        },
      ]
    }
    case 'recipient':
      return [
        ...scenePresentation.presentPersons.map((presentPerson) => ({
          itemLabel: presentPerson.visibleName,
          insertedFragment: replyDeskCopy.recipientFacetPersonFragment(presentPerson.visibleName),
        })),
        ...scenePresentation.perceivedPointsOfInterest.map((pointOfInterest) => ({
          itemLabel: pointOfInterest.visibleName,
          insertedFragment: replyDeskCopy.recipientFacetPlaceFragment(pointOfInterest.visibleName),
        })),
      ]
  }
}

function moveFocusAmongFacetItems(keyboardEvent: KeyboardEvent<HTMLUListElement>) {
  if (keyboardEvent.key !== 'ArrowDown' && keyboardEvent.key !== 'ArrowUp') {
    return
  }
  const itemButtons = Array.from(keyboardEvent.currentTarget.querySelectorAll<HTMLButtonElement>('button'))
  if (itemButtons.length === 0) {
    return
  }
  keyboardEvent.preventDefault()
  const focusedItemIndex = itemButtons.findIndex((itemButton) => itemButton === document.activeElement)
  const focusStep = keyboardEvent.key === 'ArrowDown' ? 1 : -1
  itemButtons[(focusedItemIndex + focusStep + itemButtons.length) % itemButtons.length].focus()
}

type IntentionFacetItemListProperties = {
  facetName: IntentionFacetName
  facetItems: IntentionFacetItem[]
  onFragmentChosen: (facetName: IntentionFacetName, insertedFragment: string) => void
}

function IntentionFacetItemList({ facetName, facetItems, onFragmentChosen }: IntentionFacetItemListProperties) {
  const playInteractionFeedback = useInteractionFeedback()

  return (
    <>
      <p className="dossier-label">{replyDeskCopy.intentionFacetListTitles[facetName]}</p>
      {facetItems.length === 0 ? (
        <p className="reply-desk-facet-empty">{replyDeskCopy.emptyFacetListNotice}</p>
      ) : (
        <ul className="reply-desk-facet-item-list" onKeyDown={moveFocusAmongFacetItems}>
          {facetItems.map((facetItem) => (
            <li key={facetItem.itemLabel}>
              <button
                type="button"
                className="reply-desk-facet-item"
                onClick={() => {
                  playInteractionFeedback('option_click')
                  onFragmentChosen(facetName, facetItem.insertedFragment)
                }}
              >
                {facetItem.itemLabel}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

export function IntentionFacetChips({
  presentationName,
  isRefinementSheetOpen,
  scenePresentation,
  investigator,
  openFacetName,
  indicatedFacetNames,
  onOpenFacetChanged,
  onRefinementSheetOpenChanged,
  onRefinementSheetClosedFocusRequested,
  onFragmentChosen,
}: IntentionFacetChipsProperties) {
  const playInteractionFeedback = useInteractionFeedback()
  const { chronicleState } = useChronicleState()
  const liveBelongingDefinitions = chronicleState.archiveRun.belongingDefinitions

  if (presentationName === 'refinement_sheet') {
    return (
      <Dialog.Root
        open={isRefinementSheetOpen}
        onOpenChange={(isOpen) => {
          playInteractionFeedback(isOpen ? 'panel_open' : 'panel_close')
          onRefinementSheetOpenChanged(isOpen)
        }}
      >
        <Dialog.Trigger asChild>
          <button
            type="button"
            className="reply-desk-refine-button"
            data-has-indicated-facets={indicatedFacetNames.length > 0 ? 'true' : 'false'}
          >
            <SlidersHorizontal size={18} weight="bold" aria-hidden="true" />
            <span>{replyDeskCopy.refineIntentionButton}</span>
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content
            className="reply-desk-refinement-sheet"
            onCloseAutoFocus={(closeAutoFocusEvent) => {
              closeAutoFocusEvent.preventDefault()
              onRefinementSheetClosedFocusRequested()
            }}
          >
            <div className="reply-desk-refinement-sheet-header">
              <Dialog.Title className="display-title reply-desk-refinement-sheet-title">
                {replyDeskCopy.refinementSheetTitle}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button type="button" className="quiet-action-button" aria-label={replyDeskCopy.closeRefinementSheetButton}>
                  <X size={18} weight="bold" aria-hidden="true" />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="reply-desk-refinement-sheet-description">
              {replyDeskCopy.refinementSheetDescription}
            </Dialog.Description>
            <div className="reply-desk-refinement-sheet-facets" role="group" aria-label={replyDeskCopy.intentionFacetsLabel}>
              {intentionFacetNamesInOrder.map((facetName, facetIndex) => {
                const isIndicated = indicatedFacetNames.includes(facetName)
                const isFacetOpen = openFacetName === facetName
                return (
                  <button
                    key={facetName}
                    type="button"
                    className="reply-desk-facet-chip"
                    data-is-indicated={isIndicated ? 'true' : 'false'}
                    data-state={isFacetOpen ? 'open' : 'closed'}
                    aria-expanded={isFacetOpen}
                    aria-controls="reply-desk-refinement-sheet-items"
                    aria-keyshortcuts={`Alt+${facetIndex + 1}`}
                    onClick={() => {
                      playInteractionFeedback(isFacetOpen ? 'panel_close' : 'option_click')
                      onOpenFacetChanged(isFacetOpen ? null : facetName)
                    }}
                  >
                    {isIndicated ? <Check size={14} weight="bold" aria-hidden="true" /> : null}
                    <span>{replyDeskCopy.intentionFacetNames[facetName]}</span>
                    {isIndicated ? (
                      <span className="reply-desk-facet-chip-state">{replyDeskCopy.intentionFacetIndicatedLabel}</span>
                    ) : null}
                  </button>
                )
              })}
            </div>
            <div id="reply-desk-refinement-sheet-items" className="reply-desk-refinement-sheet-items reply-desk-facet-popover-body">
              {openFacetName ? (
                <IntentionFacetItemList
                  facetName={openFacetName}
                  facetItems={readIntentionFacetItems(
                    openFacetName,
                    scenePresentation,
                    investigator,
                    liveBelongingDefinitions,
                  )}
                  onFragmentChosen={onFragmentChosen}
                />
              ) : (
                <p className="reply-desk-facet-empty">{replyDeskCopy.refinementSheetChooseFacetNotice}</p>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    )
  }

  return (
    <div className="reply-desk-facets" role="group" aria-label={replyDeskCopy.intentionFacetsLabel}>
      {intentionFacetNamesInOrder.map((facetName, facetIndex) => {
        const isIndicated = indicatedFacetNames.includes(facetName)
        const isFacetOpen = openFacetName === facetName && !isRefinementSheetOpen
        return (
          <Popover.Root
            key={facetName}
            open={isFacetOpen}
            onOpenChange={(isOpen) => {
              playInteractionFeedback(isOpen ? 'panel_open' : 'panel_close')
              onOpenFacetChanged(isOpen ? facetName : null)
            }}
          >
            <Popover.Trigger asChild>
              <button
                type="button"
                className="reply-desk-facet-chip"
                data-is-indicated={isIndicated ? 'true' : 'false'}
                aria-keyshortcuts={`Alt+${facetIndex + 1}`}
              >
                {isIndicated ? <Check size={14} weight="bold" aria-hidden="true" /> : null}
                <span>{replyDeskCopy.intentionFacetNames[facetName]}</span>
                {isIndicated ? (
                  <span className="reply-desk-facet-chip-state">{replyDeskCopy.intentionFacetIndicatedLabel}</span>
                ) : null}
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                className="reply-desk-facet-popover reply-desk-facet-popover-body"
                side="top"
                align="start"
                sideOffset={8}
                collisionPadding={12}
              >
                {isFacetOpen ? (
                  <IntentionFacetItemList
                    facetName={facetName}
                    facetItems={readIntentionFacetItems(
                      facetName,
                      scenePresentation,
                      investigator,
                      liveBelongingDefinitions,
                    )}
                    onFragmentChosen={onFragmentChosen}
                  />
                ) : null}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        )
      })}
    </div>
  )
}

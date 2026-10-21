import { ArrowFatLinesRight, Minus, Plus, X } from '@phosphor-icons/react'
import { Dialog } from 'radix-ui'
import { useState } from 'react'
import { chooseAnimationVariantName } from '../../../animation/animation_variety'
import { useInteractionFeedback } from '../../../audio/interaction_feedback'
import { characterDossierCopy } from '../../../copy/character_dossier_copy'
import type { BelongingPlacement } from '../../../demonstration/sanctuary_home_data'
import { formatAmount } from '../../../game_state/chronicle_state'
import type { BelongingPile } from '../../sanctuary_home/belongings_arrangement'

const objectSheetVariantNames = ['slid_index_card', 'flipped_index_card', 'unclipped_index_card'] as const

function BelongingMoveControls({
  belongingPile,
  moveDestinationPlacements,
  rejectionText,
  onMoveRequested,
}: {
  belongingPile: BelongingPile
  moveDestinationPlacements: BelongingPlacement[]
  rejectionText: string | null
  onMoveRequested: (destinationPlacement: BelongingPlacement, requestedUnitCount: number | null) => void
}) {
  const boardCopy = characterDossierCopy.belongingsBoard
  const playInteractionFeedback = useInteractionFeedback()
  const [chosenUnitCount, setChosenUnitCount] = useState(belongingPile.quantity)
  const canUnitsBeSeparated =
    belongingPile.isConsumable && belongingPile.belongingOrigin === 'personal' && belongingPile.quantity > 1
  const unitCountToMove = Math.min(belongingPile.quantity, Math.max(1, chosenUnitCount))

  const changeUnitCount = (unitCountDifference: number) => {
    const requestedUnitCount = unitCountToMove + unitCountDifference
    if (requestedUnitCount < 1 || requestedUnitCount > belongingPile.quantity) {
      playInteractionFeedback('rejection')
      return
    }
    playInteractionFeedback('option_click')
    setChosenUnitCount(requestedUnitCount)
  }

  return (
    <section className="belongings-move-controls" aria-labelledby="belongings-move-controls-title">
      <h3 id="belongings-move-controls-title" className="belongings-move-controls-title">
        {boardCopy.inspection.moveSectionLabel}
      </h3>
      {canUnitsBeSeparated ? (
        <div className="belongings-unit-stepper" role="group" aria-label={boardCopy.inspection.unitCountLabel}>
          <span className="belongings-unit-stepper-label">{boardCopy.inspection.unitCountLabel}</span>
          <button
            type="button"
            className="belongings-unit-stepper-button"
            aria-label={boardCopy.inspection.decreaseUnitCountLabel}
            aria-disabled={unitCountToMove <= 1}
            onClick={() => changeUnitCount(-1)}
          >
            <Minus size={18} weight="bold" aria-hidden="true" />
          </button>
          <output className="belongings-unit-stepper-readout" aria-live="polite">
            {boardCopy.inspection.unitCountReadout(unitCountToMove, belongingPile.quantity)}
          </output>
          <button
            type="button"
            className="belongings-unit-stepper-button"
            aria-label={boardCopy.inspection.increaseUnitCountLabel}
            aria-disabled={unitCountToMove >= belongingPile.quantity}
            onClick={() => changeUnitCount(1)}
          >
            <Plus size={18} weight="bold" aria-hidden="true" />
          </button>
        </div>
      ) : null}
      <ul className="belongings-move-destinations">
        {moveDestinationPlacements.map((destinationPlacement) => (
          <li key={destinationPlacement}>
            <button
              type="button"
              className="belongings-move-destination-button"
              onClick={() => onMoveRequested(destinationPlacement, canUnitsBeSeparated ? unitCountToMove : null)}
            >
              <ArrowFatLinesRight size={18} weight="fill" aria-hidden="true" />
              {boardCopy.inspection.moveToButton(boardCopy.containerNames[destinationPlacement])}
            </button>
          </li>
        ))}
      </ul>
      {rejectionText ? (
        <p role="alert" className="belongings-move-rejection">
          {rejectionText}
        </p>
      ) : null}
    </section>
  )
}

export function BelongingInspectionCard({
  belongingPile,
  moveDestinationPlacements,
  lockedMoveNote,
  rejectionText,
  rejectionCount,
  onMoveRequested,
  onCloseRequested,
  onFocusReturnRequested,
}: {
  belongingPile: BelongingPile | null
  moveDestinationPlacements: BelongingPlacement[]
  lockedMoveNote: string | null
  rejectionText: string | null
  rejectionCount: number
  onMoveRequested: (destinationPlacement: BelongingPlacement, requestedUnitCount: number | null) => void
  onCloseRequested: () => void
  onFocusReturnRequested: () => boolean
}) {
  const belongingsCopy = characterDossierCopy.belongings
  const detailCopy = belongingsCopy.detail
  const boardCopy = characterDossierCopy.belongingsBoard
  const [objectSheetVariantName, setObjectSheetVariantName] = useState<(typeof objectSheetVariantNames)[number]>(
    objectSheetVariantNames[0],
  )
  const [lastShownPile, setLastShownPile] = useState<BelongingPile | null>(null)
  if (belongingPile && belongingPile !== lastShownPile) {
    if (belongingPile.pileIdentifier !== lastShownPile?.pileIdentifier) {
      setObjectSheetVariantName(chooseAnimationVariantName('dossier_object_sheet', objectSheetVariantNames))
    }
    setLastShownPile(belongingPile)
  }
  const shownPile = belongingPile ?? lastShownPile
  return (
    <Dialog.Root
      open={belongingPile !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onCloseRequested()
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="side-sheet-content dossier-object-sheet"
          data-object-sheet-variant={objectSheetVariantName}
          aria-describedby={undefined}
          onCloseAutoFocus={(closeEvent) => {
            if (onFocusReturnRequested()) {
              closeEvent.preventDefault()
            }
          }}
        >
          {shownPile ? (
            <div
              className="dossier-object-sheet-card"
              data-rejection-parity={rejectionText === null ? 'none' : rejectionCount % 2 === 0 ? 'even' : 'odd'}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="dossier-sheet-numbering">{detailCopy.sheetLabel}</p>
                  <Dialog.Title className="dossier-object-sheet-title">{shownPile.visibleName}</Dialog.Title>
                </div>
                <Dialog.Close asChild>
                  <button type="button" className="dossier-object-sheet-close" aria-label={detailCopy.closeLabel}>
                    <X size={20} weight="bold" aria-hidden="true" />
                  </button>
                </Dialog.Close>
              </div>
              <dl className="dossier-object-sheet-fields">
                <div>
                  <dt>{detailCopy.kindLabel}</dt>
                  <dd>{shownPile.detail.visibleKind}</dd>
                </div>
                <div>
                  <dt>{detailCopy.quantityLabel}</dt>
                  <dd>
                    {shownPile.quantity}{' '}
                    {belongingsCopy.formatUnitDescription(shownPile.quantity, shownPile.visibleUnitDescription)}
                  </dd>
                </div>
                <div>
                  <dt>{boardCopy.inspection.occupiedSpaceLabel}</dt>
                  <dd>{boardCopy.bulkLabel(shownPile.bulk)}</dd>
                </div>
                <div>
                  <dt>{boardCopy.inspection.originLabel}</dt>
                  <dd>
                    {shownPile.belongingOrigin === 'mission' ? boardCopy.missionEquipmentTag : boardCopy.personalBelongingTag}
                  </dd>
                </div>
                <div data-field-width="full">
                  <dt>{detailCopy.locationLabel}</dt>
                  <dd>{belongingsCopy.locationTexts[shownPile.placement]}</dd>
                </div>
                <div data-field-width="full">
                  <dt>{detailCopy.descriptionLabel}</dt>
                  <dd>{shownPile.detail.visibleDescription}</dd>
                </div>
                <div data-field-width="full">
                  <dt>{detailCopy.stateLabel}</dt>
                  <dd>{shownPile.detail.visibleState}</dd>
                </div>
                {shownPile.belongingOrigin === 'mission' ? (
                  <div data-field-width="full">
                    <dt>{detailCopy.consumptionLabel}</dt>
                    <dd>
                      {shownPile.consumedQuantity > 0
                        ? belongingsCopy.consumedNote(
                            shownPile.quantity + shownPile.consumedQuantity,
                            shownPile.consumedQuantity,
                            shownPile.quantity,
                          )
                        : detailCopy.consumptionNone}
                    </dd>
                  </div>
                ) : null}
                <div data-field-width="full">
                  <dt>{detailCopy.knownUsesLabel}</dt>
                  <dd>
                    <ul>
                      {shownPile.detail.knownUses.map((knownUse) => (
                        <li key={knownUse}>{knownUse}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
                <div data-field-width="full">
                  <dt>{detailCopy.limitsLabel}</dt>
                  <dd>
                    <ul>
                      {shownPile.detail.limits.map((limit) => (
                        <li key={limit}>{limit}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
                <div data-field-width="full">
                  <dt>{detailCopy.provenanceLabel}</dt>
                  <dd>{shownPile.detail.visibleProvenance}</dd>
                </div>
                <div>
                  <dt>{detailCopy.referenceValueLabel}</dt>
                  <dd className="dossier-object-sheet-reference-value">{formatAmount(shownPile.detail.referenceValue)}</dd>
                </div>
                <div>
                  <dt>{detailCopy.offersLabel}</dt>
                  <dd>{detailCopy.offersEmpty}</dd>
                </div>
              </dl>
              {moveDestinationPlacements.length > 0 ? (
                <BelongingMoveControls
                  key={`${shownPile.pileIdentifier}:${shownPile.quantity}`}
                  belongingPile={shownPile}
                  moveDestinationPlacements={moveDestinationPlacements}
                  rejectionText={rejectionText}
                  onMoveRequested={onMoveRequested}
                />
              ) : lockedMoveNote ? (
                <p className="dossier-object-sheet-note">{lockedMoveNote}</p>
              ) : null}
              <p className="dossier-object-sheet-note">{detailCopy.referenceValueNote}</p>
              <p className="dossier-object-sheet-note">{detailCopy.unlistedUsesNote}</p>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

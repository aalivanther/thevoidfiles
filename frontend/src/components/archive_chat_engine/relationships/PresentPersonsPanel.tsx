import { X } from '@phosphor-icons/react'
import { Dialog } from 'radix-ui'
import { useEffect, useRef, useState } from 'react'
import { chooseAnimationVariantName } from '../../../animation/animation_variety'
import { relationshipsCopy } from '../../../copy/archive_chat_engine/relationships_copy'
import type { RelationshipPulse, ScenePresentPerson } from '../../../game_state/archive_turn_contract'
import { readInvestigatorShortName, useChronicleState } from '../../../game_state/chronicle_state'
import { HiddenScrollbarRegion } from '../../scroll_affordance/HiddenScrollbarRegion'
import { PresentPersonCard } from './PresentPersonCard'

const cardEntranceClassNames = ['entrance-from-left', 'entrance-from-below', 'entrance-stamp-pop'] as const
const consultedPersonFocusDelayMilliseconds = 80

export type PresentPersonsPanelProperties = {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  presentPersons: ScenePresentPerson[]
  relationshipPulses: RelationshipPulse[]
  focusedPersonIdentifier: string | null
  onFullRecordRequested?: () => void
}

type PresentPersonCardListProperties = Pick<
  PresentPersonsPanelProperties,
  'presentPersons' | 'relationshipPulses' | 'focusedPersonIdentifier'
>

function PresentPersonCardList({ presentPersons, relationshipPulses, focusedPersonIdentifier }: PresentPersonCardListProperties) {
  const { chronicleState } = useChronicleState()
  const investigatorShortName = readInvestigatorShortName(chronicleState.investigatorRegistration)
  const [entranceClassName] = useState(() => chooseAnimationVariantName('present_person_card_entrance', cardEntranceClassNames))
  const consultedPersonCardReference = useRef<HTMLLIElement | null>(null)

  useEffect(() => {
    if (focusedPersonIdentifier === null) {
      return
    }
    const focusTimeoutIdentifier = window.setTimeout(() => {
      consultedPersonCardReference.current?.scrollIntoView({ block: 'start' })
      consultedPersonCardReference.current?.focus({ preventScroll: true })
    }, consultedPersonFocusDelayMilliseconds)
    return () => window.clearTimeout(focusTimeoutIdentifier)
  }, [focusedPersonIdentifier])

  if (presentPersons.length === 0) {
    return <p className="present-persons-empty-notice">{relationshipsCopy.nobodyPresentNotice}</p>
  }
  return (
    <ul className="present-person-card-list">
      {presentPersons.map((presentPerson, personIndex) => {
        const isConsultedPerson = presentPerson.personIdentifier === focusedPersonIdentifier
        return (
          <PresentPersonCard
            key={presentPerson.personIdentifier}
            presentPerson={presentPerson}
            relationshipPulsesOfPerson={relationshipPulses.filter(
              (relationshipPulse) => relationshipPulse.personIdentifier === presentPerson.personIdentifier,
            )}
            investigatorShortName={investigatorShortName}
            isConsultedPerson={isConsultedPerson}
            entranceClassName={entranceClassName}
            entranceOrder={personIndex}
            cardReference={isConsultedPerson ? consultedPersonCardReference : undefined}
          />
        )
      })}
    </ul>
  )
}

export function PresentPersonsPanel({
  isOpen,
  onOpenChange,
  presentPersons,
  relationshipPulses,
  focusedPersonIdentifier,
  onFullRecordRequested,
}: PresentPersonsPanelProperties) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="side-sheet-content present-persons-panel" aria-describedby={undefined}>
          <div className="present-persons-panel-header">
            <div className="present-persons-panel-header-texts">
              <Dialog.Title className="display-title present-persons-panel-title">
                {relationshipsCopy.presentPersonsPanelTitle}
              </Dialog.Title>
              <p className="dossier-label">{relationshipsCopy.presentPersonsCountLabel(presentPersons.length)}</p>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="quiet-action-button" aria-label={relationshipsCopy.closePanelButton}>
                <X size={18} weight="bold" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>
          <HiddenScrollbarRegion regionLabel={relationshipsCopy.presentPersonsPanelTitle} className="present-persons-panel-region">
            {presentPersons.length > 1 ? (
              <p className="present-persons-order-notice">{relationshipsCopy.presentPersonsOrderNotice}</p>
            ) : null}
            <PresentPersonCardList
              presentPersons={presentPersons}
              relationshipPulses={relationshipPulses}
              focusedPersonIdentifier={focusedPersonIdentifier}
            />
          </HiddenScrollbarRegion>
          {onFullRecordRequested ? (
            <div className="present-persons-panel-footer">
              <button type="button" className="quiet-action-button" onClick={onFullRecordRequested}>
                {relationshipsCopy.fullRecordFooter}
              </button>
            </div>
          ) : (
            <p className="present-persons-panel-footer">{relationshipsCopy.fullRecordFooter}</p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

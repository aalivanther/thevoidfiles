import { X } from '@phosphor-icons/react'
import { Dialog, Popover } from 'radix-ui'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { replyDeskCopy } from '../../../copy/archive_chat_engine/reply_desk_copy'
import { usePlanDetailSurfaceSnapshot } from './plan_detail_surface_store'
import type { PlanDetailSurfaceModeName } from './plan_detail_surface_store'

const costAnnouncementDelayMilliseconds = 160
const replyDeskDraftFieldElementIdentifier = 'reply-desk-draft-field'

type PlanDetailSurfaceProperties = {
  surfaceModeName: PlanDetailSurfaceModeName
  isOpen: boolean
  titleText: string
  countText: string
  descriptionText: string
  costAnnouncementText: string
  dockLine: ReactNode
  detailBody: ReactNode
  detailFooter: ReactNode
  onOpenChanged: (isOpen: boolean) => void
}

function returnFocusToDraftField(focusEvent: Event) {
  focusEvent.preventDefault()
  document.getElementById(replyDeskDraftFieldElementIdentifier)?.focus()
}

function DelayedCostAnnouncement({ costAnnouncementText }: { costAnnouncementText: string }) {
  const [announcedText, setAnnouncedText] = useState('')

  useEffect(() => {
    const announcementTimer = window.setTimeout(() => setAnnouncedText(costAnnouncementText), costAnnouncementDelayMilliseconds)
    return () => window.clearTimeout(announcementTimer)
  }, [costAnnouncementText])

  return (
    <p className="visually-hidden-text" aria-live="polite" aria-atomic="true">
      {announcedText}
    </p>
  )
}

export function PlanDetailSurface({
  surfaceModeName,
  isOpen,
  titleText,
  countText,
  descriptionText,
  costAnnouncementText,
  dockLine,
  detailBody,
  detailFooter,
  onOpenChanged,
}: PlanDetailSurfaceProperties) {
  const { planRailHostElement } = usePlanDetailSurfaceSnapshot()

  if (surfaceModeName === 'right_rail') {
    return (
      <>
        {dockLine}
        {planRailHostElement
          ? createPortal(
              <section className="reply-desk-plan-detail" data-surface-mode="right_rail" aria-label={titleText}>
                <div className="reply-desk-plan-detail-header">
                  <h2 className="display-title reply-desk-plan-detail-title">{titleText}</h2>
                  <span className="dossier-label">{countText}</span>
                </div>
                <p className="reply-desk-plan-detail-description">{descriptionText}</p>
                <DelayedCostAnnouncement costAnnouncementText={costAnnouncementText} />
                <div className="reply-desk-plan-detail-body">{detailBody}</div>
                <div className="reply-desk-plan-detail-footer">{detailFooter}</div>
              </section>,
              planRailHostElement,
            )
          : null}
      </>
    )
  }

  if (surfaceModeName === 'anchored_popover') {
    return (
      <Popover.Root open={isOpen} onOpenChange={onOpenChanged}>
        <Popover.Anchor className="reply-desk-plan-line-anchor">{dockLine}</Popover.Anchor>
        <Popover.Portal>
          <Popover.Content
            className="reply-desk reply-desk-plan-detail-scope reply-desk-plan-detail reply-desk-plan-detail-popover"
            data-surface-mode="anchored_popover"
            side="top"
            align="start"
            sideOffset={10}
            collisionPadding={12}
            aria-label={titleText}
            onCloseAutoFocus={returnFocusToDraftField}
          >
            <div className="reply-desk-plan-detail-header">
              <h2 className="display-title reply-desk-plan-detail-title">{titleText}</h2>
              <span className="dossier-label">{countText}</span>
              <Popover.Close asChild>
                <button type="button" className="quiet-action-button reply-desk-plan-detail-close" aria-label={replyDeskCopy.closePlanDetailLabel}>
                  <X size={18} weight="bold" aria-hidden="true" />
                </button>
              </Popover.Close>
            </div>
            <p className="reply-desk-plan-detail-description">{descriptionText}</p>
            <DelayedCostAnnouncement costAnnouncementText={costAnnouncementText} />
            <div className="reply-desk-plan-detail-body">{detailBody}</div>
            <div className="reply-desk-plan-detail-footer">{detailFooter}</div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    )
  }

  return (
    <>
      {dockLine}
      <Dialog.Root open={isOpen} onOpenChange={onOpenChanged}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content
            className="reply-desk reply-desk-plan-detail-scope reply-desk-plan-detail reply-desk-plan-detail-sheet"
            data-surface-mode="bottom_sheet"
            onCloseAutoFocus={returnFocusToDraftField}
          >
            <div className="reply-desk-plan-detail-header">
              <Dialog.Title className="display-title reply-desk-plan-detail-title">{titleText}</Dialog.Title>
              <span className="dossier-label">{countText}</span>
              <Dialog.Close asChild>
                <button type="button" className="quiet-action-button reply-desk-plan-detail-close" aria-label={replyDeskCopy.closePlanDetailLabel}>
                  <X size={18} weight="bold" aria-hidden="true" />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="reply-desk-plan-detail-description">{descriptionText}</Dialog.Description>
            <DelayedCostAnnouncement costAnnouncementText={costAnnouncementText} />
            <div className="reply-desk-plan-detail-body">{detailBody}</div>
            <div className="reply-desk-plan-detail-footer">{detailFooter}</div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}

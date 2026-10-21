import { useCallback } from 'react'
import { replyDeskCopy } from '../../../copy/archive_chat_engine/reply_desk_copy'
import { changePlanDetailSurface } from './plan_detail_surface_store'

export function PlanRailPanel() {
  const registerPlanRailHostElement = useCallback((planRailHostElement: HTMLDivElement | null) => {
    changePlanDetailSurface({ planRailHostElement })
  }, [])

  return (
    <div
      ref={registerPlanRailHostElement}
      className="reply-desk reply-desk-plan-detail-scope reply-desk-plan-rail-panel"
      role="region"
      aria-label={replyDeskCopy.planRailPanelLabel}
    />
  )
}

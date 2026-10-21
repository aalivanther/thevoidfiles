import { useSyncExternalStore } from 'react'

export type PlanDetailSurfaceModeName = 'bottom_sheet' | 'anchored_popover' | 'right_rail'

export type PlanDetailSurfaceSnapshot = {
  isDetailSurfaceOpen: boolean
  planRailHostElement: HTMLElement | null
  costLedgerSlotElement: HTMLElement | null
  costLedgerActionsSlotElement: HTMLElement | null
  isCostLedgerSlipMounted: boolean
  costDismissalRequestCount: number
}

const desktopRailMediaQuery = '(min-width: 1024px)'

let currentSnapshot: PlanDetailSurfaceSnapshot = {
  isDetailSurfaceOpen: false,
  planRailHostElement: null,
  costLedgerSlotElement: null,
  costLedgerActionsSlotElement: null,
  isCostLedgerSlipMounted: false,
  costDismissalRequestCount: 0,
}

const snapshotListeners = new Set<() => void>()

function subscribeToPlanDetailSurface(snapshotListener: () => void): () => void {
  snapshotListeners.add(snapshotListener)
  return () => {
    snapshotListeners.delete(snapshotListener)
  }
}

export function readPlanDetailSurfaceSnapshot(): PlanDetailSurfaceSnapshot {
  return currentSnapshot
}

export function changePlanDetailSurface(changedFields: Partial<PlanDetailSurfaceSnapshot>) {
  const changedFieldNames = Object.keys(changedFields) as Array<keyof PlanDetailSurfaceSnapshot>
  const hasAnyFieldChanged = changedFieldNames.some((fieldName) => currentSnapshot[fieldName] !== changedFields[fieldName])
  if (!hasAnyFieldChanged) {
    return
  }
  currentSnapshot = { ...currentSnapshot, ...changedFields }
  for (const snapshotListener of [...snapshotListeners]) {
    snapshotListener()
  }
}

export function requestCostDismissalFromPlanDetailSurface() {
  changePlanDetailSurface({ costDismissalRequestCount: currentSnapshot.costDismissalRequestCount + 1 })
}

export function usePlanDetailSurfaceSnapshot(): PlanDetailSurfaceSnapshot {
  return useSyncExternalStore(subscribeToPlanDetailSurface, readPlanDetailSurfaceSnapshot, readPlanDetailSurfaceSnapshot)
}

function subscribeToDesktopRailWidth(widthListener: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => undefined
  }
  const desktopRailMediaQueryList = window.matchMedia(desktopRailMediaQuery)
  desktopRailMediaQueryList.addEventListener('change', widthListener)
  return () => {
    desktopRailMediaQueryList.removeEventListener('change', widthListener)
  }
}

function readIsDesktopRailWidth(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(desktopRailMediaQuery).matches
}

function readIsDesktopRailWidthWithoutWindow(): boolean {
  return false
}

export function usePlanDetailSurfaceModeName(): PlanDetailSurfaceModeName {
  const isDesktopRailWidth = useSyncExternalStore(subscribeToDesktopRailWidth, readIsDesktopRailWidth, readIsDesktopRailWidthWithoutWindow)
  const { planRailHostElement } = usePlanDetailSurfaceSnapshot()
  if (!isDesktopRailWidth) {
    return 'bottom_sheet'
  }
  return planRailHostElement === null ? 'anchored_popover' : 'right_rail'
}

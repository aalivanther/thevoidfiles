import { Component, Suspense, lazy, useState } from 'react'
import type { ReactNode } from 'react'
import { useInteractionFeedback } from '../../../audio/interaction_feedback'
import { interactivePiecesCopy } from '../../../copy/archive_chat_engine/interactive_pieces_copy'
import type { InteractivePiecePublicState, InteractivePieceSubmittedValue } from '../../../game_state/archive_turn_contract'

function createLazilyLoadedWidgets() {
  return {
    CipherWheelPiece: lazy(() => import('./CipherWheelPiece')),
    OrderedPositionsPiece: lazy(() => import('./OrderedPositionsPiece')),
    CombinationDialsPiece: lazy(() => import('./CombinationDialsPiece')),
  }
}

type WidgetLoadingBoundaryProperties = { children: ReactNode; failureContent: ReactNode }
type WidgetLoadingBoundaryState = { hasLoadingFailed: boolean }

class WidgetLoadingBoundary extends Component<WidgetLoadingBoundaryProperties, WidgetLoadingBoundaryState> {
  state: WidgetLoadingBoundaryState = { hasLoadingFailed: false }

  static getDerivedStateFromError(): WidgetLoadingBoundaryState {
    return { hasLoadingFailed: true }
  }

  render() {
    return this.state.hasLoadingFailed ? this.props.failureContent : this.props.children
  }
}

export type InteractivePieceWidgetHostProperties = {
  publicState: InteractivePiecePublicState
  workingValue: InteractivePieceSubmittedValue
  isInteractionDisabled: boolean
  onWorkingValueChanged: (workingValue: InteractivePieceSubmittedValue) => void
}

export function InteractivePieceWidgetHost({
  publicState,
  workingValue,
  isInteractionDisabled,
  onWorkingValueChanged,
}: InteractivePieceWidgetHostProperties) {
  const playInteractionFeedback = useInteractionFeedback()
  const [lazilyLoadedWidgets, setLazilyLoadedWidgets] = useState(createLazilyLoadedWidgets)
  const [loadingAttemptNumber, setLoadingAttemptNumber] = useState(0)
  const { CipherWheelPiece, OrderedPositionsPiece, CombinationDialsPiece } = lazilyLoadedWidgets

  const renderWidget = () => {
    if (publicState.widgetKindName === 'cipher_wheel' && workingValue.widgetKindName === 'cipher_wheel') {
      return (
        <CipherWheelPiece
          publicState={publicState}
          workingValue={workingValue}
          isInteractionDisabled={isInteractionDisabled}
          onWorkingValueChanged={onWorkingValueChanged}
        />
      )
    }
    if (publicState.widgetKindName === 'ordered_positions' && workingValue.widgetKindName === 'ordered_positions') {
      return (
        <OrderedPositionsPiece
          publicState={publicState}
          workingValue={workingValue}
          isInteractionDisabled={isInteractionDisabled}
          onWorkingValueChanged={onWorkingValueChanged}
        />
      )
    }
    if (publicState.widgetKindName === 'combination_dials' && workingValue.widgetKindName === 'combination_dials') {
      return (
        <CombinationDialsPiece
          publicState={publicState}
          workingValue={workingValue}
          isInteractionDisabled={isInteractionDisabled}
          onWorkingValueChanged={onWorkingValueChanged}
        />
      )
    }
    return null
  }

  return (
    <WidgetLoadingBoundary
      key={loadingAttemptNumber}
      failureContent={
        <div className="interactive-piece-loading-failure" role="alert">
          <p>{interactivePiecesCopy.widgetLoadingFailedNotice}</p>
          <button
            type="button"
            className="quiet-action-button"
            onClick={() => {
              playInteractionFeedback('option_click')
              setLazilyLoadedWidgets(createLazilyLoadedWidgets())
              setLoadingAttemptNumber(loadingAttemptNumber + 1)
            }}
          >
            {interactivePiecesCopy.widgetLoadingRetryButton}
          </button>
        </div>
      }
    >
      <Suspense fallback={<p className="interactive-piece-pending-notice">{interactivePiecesCopy.widgetLoadingNotice}</p>}>
        {renderWidget()}
      </Suspense>
    </WidgetLoadingBoundary>
  )
}

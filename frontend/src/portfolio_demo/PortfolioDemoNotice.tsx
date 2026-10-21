import { ArrowCounterClockwise } from '@phosphor-icons/react'
import { useEffect, useId, useRef, useState } from 'react'
import { portfolioDemoCopy } from '../copy/portfolio_demo_copy'
import { restartPortfolioDemo } from './portfolio_demo_session'

export function PortfolioDemoNotice() {
  const [isConfirmingRestart, setIsConfirmingRestart] = useState(false)
  const explanationIdentifier = useId()
  const confirmButton = useRef<HTMLButtonElement>(null)
  const restartButton = useRef<HTMLButtonElement>(null)
  const hasConfirmationBeenShown = useRef(false)

  useEffect(() => {
    if (isConfirmingRestart) {
      hasConfirmationBeenShown.current = true
      confirmButton.current?.focus()
      const cancelOnEscape = (keyboardEvent: KeyboardEvent) => {
        if (keyboardEvent.key === 'Escape') {
          setIsConfirmingRestart(false)
        }
      }
      window.addEventListener('keydown', cancelOnEscape)
      return () => window.removeEventListener('keydown', cancelOnEscape)
    }
    if (hasConfirmationBeenShown.current) {
      restartButton.current?.focus()
    }
  }, [isConfirmingRestart])

  return (
    <aside
      className="portfolio-demo-notice"
      data-confirming={isConfirmingRestart ? 'true' : undefined}
      aria-label={portfolioDemoCopy.noticeRegionLabel}
      data-portfolio-demo-notice="true"
    >
      <span className="portfolio-demo-notice-stamp" aria-describedby={explanationIdentifier} title={portfolioDemoCopy.noticeExplanation}>
        {portfolioDemoCopy.noticeStampText}
      </span>
      <span id={explanationIdentifier} className="sr-only">
        {portfolioDemoCopy.noticeExplanation}
      </span>
      {isConfirmingRestart ? (
        <span className="portfolio-demo-notice-confirmation" role="group" aria-label={portfolioDemoCopy.restartConfirmationQuestion}>
          <span className="portfolio-demo-notice-question">{portfolioDemoCopy.restartConfirmationQuestion}</span>
          <button ref={confirmButton} type="button" className="portfolio-demo-notice-button" onClick={restartPortfolioDemo}>
            {portfolioDemoCopy.restartConfirmButton}
          </button>
          <button type="button" className="portfolio-demo-notice-button" onClick={() => setIsConfirmingRestart(false)}>
            {portfolioDemoCopy.restartCancelButton}
          </button>
        </span>
      ) : (
        <button
          ref={restartButton}
          type="button"
          className="portfolio-demo-notice-button"
          data-portfolio-demo-restart="true"
          aria-label={portfolioDemoCopy.restartButton}
          onClick={() => setIsConfirmingRestart(true)}
        >
          <ArrowCounterClockwise size={14} weight="bold" aria-hidden="true" />
          <span className="portfolio-demo-notice-button-label">{portfolioDemoCopy.restartButton}</span>
        </button>
      )}
    </aside>
  )
}

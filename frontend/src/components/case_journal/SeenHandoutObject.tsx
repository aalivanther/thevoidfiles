import { useState } from 'react'
import type { CSSProperties } from 'react'
import { chooseAnimationVariantName } from '../../animation/animation_variety'
import { caseJournalCopy } from '../../copy/case_journal_copy'
import type { SeenHandout } from '../../demonstration/case_journal_data'
import { formatWorldClock } from '../../game_state/chronicle_state'
import { calculateStableTiltDegrees } from './journal_paper_layout'

const photographDevelopVariantNames = ['develop_evenly', 'develop_from_corner', 'develop_in_blotches'] as const

type SeenHandoutObjectProperties = {
  seenHandout: SeenHandout
  entranceOrder: number
  personalizeJournalText: (journalText: string) => string
}

export function SeenHandoutObject({ seenHandout, entranceOrder, personalizeJournalText }: SeenHandoutObjectProperties) {
  const [developVariantName] = useState(() =>
    chooseAnimationVariantName('journal_photograph_develop', photographDevelopVariantNames),
  )
  const handoutStyle = {
    '--paper-tilt': `${calculateStableTiltDegrees(seenHandout.identifier, 2.4)}deg`,
    '--entrance-order': entranceOrder,
  } as CSSProperties
  return (
    <li className="journal-handout" data-handout-appearance={seenHandout.appearanceKind} style={handoutStyle}>
      <span className="journal-tape-strip" aria-hidden="true" />
      <div className="journal-handout-object" data-develop-variant={developVariantName} aria-hidden="true">
        {seenHandout.documentLines.map((documentLine, documentLineIndex) => (
          <span key={`${documentLine}-${documentLineIndex}`} className="journal-handout-line">
            {documentLine.split('  ')[0]}
            {documentLine.includes('  ') ? (
              <em className="journal-handout-foreign-stroke">{documentLine.split('  ').slice(1).join(' ')}</em>
            ) : null}
          </span>
        ))}
        {seenHandout.appearanceKind === 'instant_photograph' ? <span className="journal-handout-figure" /> : null}
      </div>
      <div className="journal-handout-caption">
        <h4 className="journal-handout-title">{seenHandout.titleText}</h4>
        <p>{seenHandout.captionText}</p>
        <p className="journal-handout-moment">
          {caseJournalCopy.clues.seenDocumentMoment(
            seenHandout.seenAtPlaceName,
            formatWorldClock(seenHandout.seenAtWorldClockMinutes),
          )}
        </p>
        <p className="journal-handout-custody">
          <strong>{caseJournalCopy.clues.custodyLabel}:</strong> {personalizeJournalText(seenHandout.custodyText)}
        </p>
      </div>
    </li>
  )
}

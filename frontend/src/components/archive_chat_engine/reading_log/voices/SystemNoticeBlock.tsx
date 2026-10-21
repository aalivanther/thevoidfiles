import { Info } from '@phosphor-icons/react'
import { readingLogCopy } from '../../../../copy/archive_chat_engine/reading_log_copy'
import type { SystemNoticeEntry } from '../../../../game_state/archive_turn_contract'

export function SystemNoticeBlock({ noticeEntry }: { noticeEntry: SystemNoticeEntry }) {
  return (
    <div className="reading-log-system-notice" data-notice-kind-name={noticeEntry.noticeKindName}>
      <p className="dossier-label reading-log-system-notice-caption">
        <Info size={14} weight="bold" aria-hidden="true" />
        <span>{readingLogCopy.noticeCaptionLabel}</span>
        <span className="reading-log-caption-detail">{readingLogCopy.noticeKindLabels[noticeEntry.noticeKindName]}</span>
      </p>
      {noticeEntry.plainParagraphs.map((paragraphText, paragraphIndex) => (
        <p key={paragraphIndex} className="reading-log-system-notice-paragraph">
          {paragraphText}
        </p>
      ))}
    </div>
  )
}

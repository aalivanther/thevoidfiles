import { ChatCircleText, Eye, FileText, Flask } from '@phosphor-icons/react'
import type { ClueSupportKind } from '../../demonstration/case_journal_data'

export function ClueSupportIcon({ supportKind, size }: { supportKind: ClueSupportKind; size: number }) {
  if (supportKind === 'testimony') {
    return <ChatCircleText size={size} weight="fill" aria-hidden="true" />
  }
  if (supportKind === 'document') {
    return <FileText size={size} weight="fill" aria-hidden="true" />
  }
  if (supportKind === 'experiment') {
    return <Flask size={size} weight="fill" aria-hidden="true" />
  }
  return <Eye size={size} weight="fill" aria-hidden="true" />
}

import { chronicleHistoryCopy } from '../../copy/chronicle_history_copy'
import type { ChronicleChapter } from '../../demonstration/chronicle_history_data'

export type ChronicleBookPage =
  | { pageKind: 'cover'; pageIdentifier: string }
  | { pageKind: 'index'; pageIdentifier: string }
  | { pageKind: 'chapter'; pageIdentifier: string; chronicleChapter: ChronicleChapter }
  | { pageKind: 'complete_work'; pageIdentifier: string }

export const indexPagePosition = 1

export function buildChronicleBookPages(chronicleChapters: readonly ChronicleChapter[]): ChronicleBookPage[] {
  return [
    { pageKind: 'cover', pageIdentifier: 'cover' },
    { pageKind: 'index', pageIdentifier: 'index' },
    ...chronicleChapters.map(
      (chronicleChapter): ChronicleBookPage => ({
        pageKind: 'chapter',
        pageIdentifier: chronicleChapter.chapterIdentifier,
        chronicleChapter,
      }),
    ),
    { pageKind: 'complete_work', pageIdentifier: 'complete_work' },
  ]
}

export function readChronicleBookPageName(chronicleBookPage: ChronicleBookPage): string {
  const pageNames = chronicleHistoryCopy.pageNavigation.pageNames
  if (chronicleBookPage.pageKind === 'cover') {
    return pageNames.cover
  }
  if (chronicleBookPage.pageKind === 'index') {
    return pageNames.index
  }
  if (chronicleBookPage.pageKind === 'complete_work') {
    return pageNames.completeWork
  }
  return `${chronicleHistoryCopy.index.chapterEntryLabel(chronicleBookPage.chronicleChapter.chapterSequence)}. ${chronicleBookPage.chronicleChapter.chapterTitle}`
}

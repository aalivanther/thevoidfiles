import type { PersonSilhouetteName } from '../../../game_state/archive_turn_contract'

const silhouettePathBySilhouetteName: Record<PersonSilhouetteName, string> = {
  close_figure:
    'M50 22 C61 22 68 31 68 43 C68 53 63 61 57 65 L58 72 C76 76 88 84 90 120 H10 C12 84 24 76 42 72 L43 65 C37 61 32 53 32 43 C32 31 39 22 50 22 Z',
  seated_figure:
    'M52 20 C62 20 69 28 69 39 C69 45 67 50 64 54 L72 56 C70 44 66 34 60 30 C70 30 80 44 78 62 L66 64 L66 70 C80 74 90 86 92 120 H12 C14 88 22 76 38 71 L40 62 C35 57 34 48 35 39 C36 28 42 20 52 20 Z',
  long_coat_figure:
    'M50 20 C60 20 66 28 66 39 C66 48 62 55 57 59 L58 64 L78 72 C86 76 92 92 96 120 H4 C8 92 14 76 22 72 L42 64 L43 59 C38 55 34 48 34 39 C34 28 40 20 50 20 Z',
  capped_figure:
    'M28 38 C30 24 40 17 52 17 C63 17 71 24 72 35 L84 39 L84 43 L30 43 Z M34 46 H68 C68 55 63 62 57 65 L58 72 C76 76 86 86 88 120 H12 C14 86 24 76 42 72 L43 65 C38 62 34 55 34 46 Z',
}

const investigatorOutlinePath =
  'M50 24 C60 24 67 32 67 43 C67 52 62 60 56 64 L57 71 C74 75 86 84 88 118 H12 C14 84 26 75 43 71 L44 64 C38 60 33 52 33 43 C33 32 40 24 50 24 Z'

export function PersonSilhouetteFigure({ silhouetteName }: { silhouetteName: PersonSilhouetteName }) {
  return (
    <svg viewBox="0 0 100 120" className="person-silhouette-figure" aria-hidden="true" focusable="false">
      <path d={silhouettePathBySilhouetteName[silhouetteName]} fillRule="evenodd" />
    </svg>
  )
}

export function InvestigatorOutlineFigure() {
  return (
    <svg viewBox="0 0 100 120" className="investigator-outline-figure" aria-hidden="true" focusable="false">
      <path d={investigatorOutlinePath} />
    </svg>
  )
}

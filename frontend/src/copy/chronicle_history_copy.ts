const romanNumeralSymbols: Array<[number, string]> = [
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
]

function writeRomanNumeral(positiveNumber: number): string {
  let remainingNumber = Math.max(1, Math.floor(positiveNumber))
  let romanNumeral = ''
  for (const [symbolValue, symbolText] of romanNumeralSymbols) {
    while (remainingNumber >= symbolValue) {
      romanNumeral += symbolText
      remainingNumber -= symbolValue
    }
  }
  return romanNumeral
}

export const chronicleHistoryCopy = {
  record: { closed: 'Archivo cerrado', inProgress: 'Investigación en curso' },
  presentation: {
    chapterLabel: 'Crónica encuadernada',
    chapterTitle: 'Histórica',
    detailLine: (writtenChapterCount: number, completeWorkArchiveCount: number) =>
      `${writtenChapterCount} de ${completeWorkArchiveCount} páginas escritas`,
  },
  header: {
    bookLabel: 'Histórica · una página por Archivo',
    screenTitle: 'Histórica',
    honestyNotice:
      'El Director resume cada Archivo cerrado en una sola página. Lo escrito aquí no cambia lo ocurrido: solo lo recuerda.',
  },
  cover: {
    volumeLabel: 'Tomo único',
    bookTitle: 'Histórica',
    chronicleOwnerLine: (investigatorFullName: string) => `Crónica de ${investigatorFullName}`,
    epigraph: 'Una página por Archivo. Lo que no cabe en una página, no se olvida: se carga.',
    writerLine: 'Escrita por el Director, a medida que los Archivos se cierran',
    openBookButton: 'Abrir el libro',
  },
  index: {
    pageTitle: 'Índice',
    chapterEntryLabel: (chapterSequence: number) => `Capítulo ${writeRomanNumeral(chapterSequence)}`,
    writingStateLabels: {
      written: 'Escrito',
      in_progress: 'En curso',
      unwritten: 'Sin escribir',
    },
    completeWorkEntryNumeral: 'XCIX',
    completeWorkEntryTitle: 'Obra completa',
    completeWorkEntryState: 'Sellada',
    pendingChaptersLine: (pendingChapterCount: number) =>
      pendingChapterCount === 1
        ? 'Queda una página en blanco antes de la Obra completa.'
        : `Quedan ${pendingChapterCount} páginas en blanco antes de la Obra completa.`,
  },
  chapterPage: {
    runningHead: (chapterSequence: number, placeName: string) => `Capítulo ${writeRomanNumeral(chapterSequence)} · ${placeName}`,
    highlightsHeading: 'Lo que queda',
    highlightKindLabels: {
      key_decision: 'Decisión',
      cost_paid: 'Costo',
      person_met: 'Persona',
      scar_left: 'Marca',
    },
    onePageSeal: 'Una página',
    wordCountLine: (summaryWordCount: number, summaryWordLimit: number) =>
      `${summaryWordCount} de ${summaryWordLimit} palabras`,
    inProgressHeading: 'La tinta sigue fresca',
    inProgressExplanation:
      'El Director terminará esta página cuando el Archivo se cierre. Nada se resume antes de ocurrir.',
    unwrittenHeading: 'Página en blanco',
    unwrittenExplanation: 'Este Archivo todavía no se abre. La página lo espera con el título puesto y nada más.',
  },
  completeWork: {
    pageLabel: 'Al cerrar el Archivo noventa y nueve',
    pageTitle: 'Obra completa',
    lockedStateLabel: 'Sellada',
    lockedExplanation:
      'Cuando la crónica reúna noventa y nueve páginas, el Director las coserá en un solo relato, con sus decisiones, sus costos y sus marcas señaladas al margen.',
    sampleLabel: 'Muestra de cómo se leerá',
    sampleMarginHeading: 'Al margen',
    sealButton: 'Intentar romper el sello',
    sealRefusalNotice: 'El sello no cede. Faltan páginas por escribir.',
  },
  progressMark: {
    heading: 'Hacia la Obra completa',
    progressSummary: (writtenChapterCount: number, completeWorkArchiveCount: number) =>
      `${writtenChapterCount} de ${completeWorkArchiveCount} Archivos escritos`,
    inProgressNote: 'Hay una página con la tinta fresca.',
    tallyDescription: (writtenChapterCount: number, completeWorkArchiveCount: number) =>
      `Marcas de avance: ${writtenChapterCount} páginas escritas de ${completeWorkArchiveCount}.`,
    goToCompleteWorkButton: 'Ver la página sellada',
  },
  pageNavigation: {
    navigationLabel: 'Páginas del libro',
    previousPageButton: 'Página anterior',
    nextPageButton: 'Página siguiente',
    indexButton: 'Índice',
    pagePosition: (currentPageNumber: number, totalPageCount: number) => `Página ${currentPageNumber} de ${totalPageCount}`,
    keyboardHint: 'Las flechas del teclado pasan las páginas',
    bookRegionLabel: 'Libro de la crónica',
    pageNames: {
      cover: 'Portada',
      index: 'Índice',
      completeWork: 'Obra completa',
    },
    pageAnnouncement: (pageName: string, currentPageNumber: number, totalPageCount: number) =>
      `${pageName}. Página ${currentPageNumber} de ${totalPageCount}.`,
  },
}

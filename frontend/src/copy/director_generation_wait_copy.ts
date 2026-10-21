export const directorGenerationWaitCopy = {
  archiveOpening: {
    assemblingText: 'El Archivo se abre…',
    loopingTexts: [
      'El Director escribe el caso.',
      'Se guarda lo que no debe verse todavía.',
      'La especificación toma forma en el expediente.',
      'Nadie lee esto hasta que el sello caiga.',
    ],
    completingText: 'El expediente ya está listo.',
    statusLabel: 'El Director prepara el Archivo',
  },
  directorTurn: {
    assemblingText: 'El Director toma la pluma.',
    loopingTexts: [
      'Sopesa lo ocurrido antes de escribir.',
      'La tinta espera el renglón siguiente.',
      'Nada se confirma hasta que el expediente lo reciba.',
    ],
    completingText: 'El Director entrega la página.',
    statusLabel: 'El Director responde',
  },
} as const

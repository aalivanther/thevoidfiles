import { spanishInterfaceCopy } from '../spanish_interface_copy'

export const whisperSelectionCopy = {
  ...spanishInterfaceCopy.whisperSelection,
  alreadyInvestigated: 'Ese Archivo ya está cerrado.',
  unavailableInDemonstration: 'Este Susurro todavía no está al alcance.',
} as const

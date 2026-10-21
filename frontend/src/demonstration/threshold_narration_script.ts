export type NarrationPanel = {
  identifier: string
  captionLabel: string
  paragraphText: string
}

export const thresholdNarrationPanels: NarrationPanel[] = [
  {
    identifier: 'the_dreamers',
    captionLabel: 'Antes de la primera hora',
    paragraphText:
      'Alpha y Omega cerraron los ojos. Todo lo que existe, cada estrella, cada calle mojada, cada nombre, es lo que sueñan.',
  },
  {
    identifier: 'the_threat',
    captionLabel: 'La grieta',
    paragraphText:
      'Un sueño puede torcerse. Algo amenaza el equilibrio de este, y tiene nombre: [[Caecelin]]. Donde su sombra toca, el mundo deja de obedecer sus propias reglas.',
  },
  {
    identifier: 'the_three_powers',
    captionLabel: 'Los que saben',
    paragraphText:
      'Tres poderes conocen la verdad y no se ponen de acuerdo. La OICNAU encierra lo que encuentra. La Corte lo conserva. La Corte del Caos lo libera. Ninguno pide permiso.',
  },
  {
    identifier: 'the_ordinary_person',
    captionLabel: 'Alguien común',
    paragraphText:
      '{{nombre_completo}} no sabe nada de esto. Vive en {{residencia}}, paga sus cuentas, duerme mal. Una persona mortal y corriente, sin nada extraordinario. Todavía.',
  },
  {
    identifier: 'the_whispers',
    captionLabel: 'El mundo murmura',
    paragraphText:
      'Pero hay noticias que no cuadran, rumores que se repiten, señales que nadie reclama. Quien aprende a escucharlos los llama Susurros. Detrás de cada uno hay algo que no debería estar ahí.',
  },
  {
    identifier: 'the_ninety_nine_archives',
    captionLabel: 'La cuenta',
    paragraphText:
      'Cada Susurro investigado abre un Archivo. Son noventa y nueve. Quien muere en uno no regresa. Yo soy [[Yxgron]], el Visor. Llevo la cuenta, y acabo de escribir un nombre nuevo.',
  },
]

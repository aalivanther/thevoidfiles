import type { OicnauStance } from '../game_state/chronicle_state'
import type { NarrationPanel } from './threshold_narration_script'

export const oicnauContactPanels: NarrationPanel[] = [
  {
    identifier: 'the_envelope',
    captionLabel: 'El sobre',
    paragraphText:
      'Tres días después, alguien desliza un sobre bajo la puerta de {{nombre}}. Sin remitente ni sello. Dentro hay una tarjeta gris con seis letras, [[OICNAU]], una dirección y una hora.',
  },
  {
    identifier: 'who_they_are',
    captionLabel: 'El Carcelero',
    paragraphText:
      'La OICNAU existe para encerrar lo que no debería existir. Tiene celdas que no figuran en ningún plano, fondos que ningún parlamento aprobó y una sola doctrina: lo anómalo se contiene. Quienes la conocen de cerca la llaman el Carcelero, y no siempre es un insulto.',
  },
  {
    identifier: 'the_offer',
    captionLabel: 'La oferta',
    paragraphText:
      'La mujer que espera en la cafetería no da su nombre. «Usted vio algo y no apartó la mirada. Eso escasea. Podemos darle expedientes, plazos y fondos. A cambio queremos informes, y obediencia cuando haga falta.» Deja la taza sobre el plato. «También puede decir que no. O proponer otra cosa. Casi nadie lo intenta.»',
  },
]

export type OicnauStanceOption = {
  oicnauStance: OicnauStance
  headline: string
  investigatorReplyText: string
  consequenceLines: string[]
  trustLabel: string
  contactReactionText: string
}

export const oicnauStanceOptions: OicnauStanceOption[] = [
  {
    oicnauStance: 'sanctioned_operative',
    headline: 'Aceptar la sanción',
    investigatorReplyText: '«Dígame dónde firmo.»',
    consequenceLines: [
      'Dosier completo y plazo en cada Archivo',
      '1 800 de fondos operativos por Archivo',
      'Informes obligatorios al cierre',
      'Órdenes que no siempre podrán discutirse',
    ],
    trustLabel: 'Confianza inicial alta',
    contactReactionText:
      'La mujer asiente sin sonreír y empuja una carpeta sobre la mesa. «Bienvenida sea su firma. A partir de hoy, cuando algo no cuadre en el mundo, usted estará entre quienes primero lo sepan. Y entre quienes primero respondan.»',
  },
  {
    oicnauStance: 'independent_ally',
    headline: 'Proponer una alianza',
    investigatorReplyText: '«Trabajo con ustedes, no para ustedes.»',
    consequenceLines: [
      'Dosier parcial: lo que la OICNAU decida compartir',
      '900 de fondos operativos por Archivo',
      'Comparte hallazgos cuando lo considere justo',
      'Sin órdenes. Tampoco rescates garantizados',
    ],
    trustLabel: 'Confianza moderada · Vigilancia discreta',
    contactReactionText:
      'La mujer tarda en contestar. «No es lo habitual.» Guarda la carpeta, pero deja sobre la mesa un teléfono sin marca. «Llamaremos cuando nos convenga a los dos. Procure que siga conviniéndonos.»',
  },
  {
    oicnauStance: 'refused_offer',
    headline: 'Negarse',
    investigatorReplyText: '«No trabajo para nadie que no da su nombre.»',
    consequenceLines: [
      'Sin dosier, sin plazo y sin fondos operativos',
      'Libertad total para decidir qué hacer con lo que encuentre',
      'Otras facciones sabrán que dijo que no',
      'La OICNAU anota su nombre en otra lista',
    ],
    trustLabel: 'Sospecha inicial',
    contactReactionText:
      'La mujer paga los dos cafés y se levanta. «Como prefiera. Pero lo que vio seguirá ahí, y ahora sabemos que usted también.» No se despide. Al salir, alguien en la mesa del fondo cierra un periódico.',
  },
]

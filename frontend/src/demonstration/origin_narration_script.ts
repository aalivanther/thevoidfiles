import type { InvestigatorAttributes, InvestigatorRegistration } from '../game_state/chronicle_state'
import type { EvaluatedAttributeName } from './investigator_evaluation_script'
import type { NarrationPanel } from './threshold_narration_script'

const upbringingParagraphByDominantAttribute: Record<EvaluatedAttributeName, string> = {
  im: 'En {{origen}} aprendió pronto a no perder la calma. Cuando los demás gritaban, {{nombre}} contaba hasta diez y seguía mirando. Hay quien lo confundió con frialdad. Era otra cosa: una puerta interior que sabe cerrarse a tiempo.',
  if: 'En {{origen}} nada se conseguía sin esfuerzo, y el cuerpo de {{nombre}} lo aprendió antes que su cabeza. Cargar, correr, aguantar. Todavía hoy confía primero en lo que sus manos pueden hacer.',
  c: 'En {{origen}} había pocas respuestas y {{nombre}} las buscó todas. Libros prestados, preguntas incómodas, noches enteras detrás de un dato. Entender las cosas nunca fue un pasatiempo: era la única forma de estar en paz.',
  o: 'En {{origen}} nadie reparaba en los detalles, salvo {{nombre}}. La silla movida, la mentira en una pausa, la luz encendida donde no debía. Ver de más es un don incómodo: nadie agradece que se note lo que prefería ocultar.',
  co: 'En {{origen}} todo se arreglaba hablando, y {{nombre}} aprendió a hablar con cualquiera. Sabe cuándo insistir, cuándo callar y qué necesita oír cada persona. La gente le cuenta cosas. Siempre ha sido así.',
  m: 'En {{origen}} había lugares que {{nombre}} evitaba sin saber por qué, y sueños que se cumplían con un par de días de retraso. Aprendió a no mencionarlo. Dejar de mencionarlo no hizo que dejara de ocurrir.',
}

const beginningParagraphByDominantAttribute: Record<EvaluatedAttributeName, string> = {
  im: 'Todo empezó una noche cualquiera en {{residencia}}. {{nombre}} vio algo [[imposible]] al final de una calle, algo que debería haber hecho correr a cualquiera. No corrió. Se quedó mirando hasta entenderlo lo suficiente como para poder dormir. No durmió, pero tampoco olvidó.',
  if: 'Todo empezó una noche cualquiera en {{residencia}}. Alguien pidió ayuda desde un portal y {{nombre}} entró sin pensarlo. Lo que sujetaba a aquella persona [[no tenía manos]]. Tiró igual, con todas sus fuerzas, y lo que fuera soltó. Las marcas del antebrazo tardaron un mes en irse.',
  c: 'Todo empezó con una cifra que no cuadraba. Revisando un registro viejo en {{residencia}}, {{nombre}} encontró a una persona inscrita dos veces, con sesenta años de diferencia y [[la misma fotografía]]. Pudo cerrar el archivo. Prefirió seguir leyendo.',
  o: 'Todo empezó con un reflejo. En un escaparate de {{residencia}}, {{nombre}} notó que una de las personas de la acera [[no aparecía en el cristal]]. Nadie más lo vio. Nadie más miraba. Desde entonces no ha dejado de mirar.',
  co: 'Todo empezó con una conversación. En un bar de {{residencia}}, un desconocido le contó a {{nombre}}, entre disculpas, que llevaba tres días [[sin poder salir del mismo martes]]. Nadie más lo había escuchado. {{nombre}} sí, y al día siguiente el hombre ya no figuraba en ningún sitio.',
  m: 'Todo empezó con un sueño que no era suyo. {{nombre}} despertó en {{residencia}} sabiendo una dirección en la que nunca había estado. Fue. La casa existía, la puerta estaba abierta y dentro [[alguien llevaba mucho tiempo esperando]].',
}

const evaluatedAttributeNames: EvaluatedAttributeName[] = ['im', 'if', 'c', 'o', 'co', 'm']

export function composeOriginNarrationPanels(
  investigatorRegistration: InvestigatorRegistration | null,
  investigatorAttributes: InvestigatorAttributes | null,
): NarrationPanel[] {
  const dominantAttributeName = investigatorAttributes
    ? evaluatedAttributeNames.reduce((strongestName, candidateName) =>
        investigatorAttributes[candidateName] > investigatorAttributes[strongestName] ? candidateName : strongestName,
      )
    : 'o'
  const anchorParagraph =
    investigatorRegistration?.relationalAnchor.kind === 'person'
      ? 'Si alguien preguntara qué mantiene en pie a {{nombre}}, la respuesta tendría nombre propio: {{ancla_nombre}}, {{ancla_vinculo}}. Es la voz que suena cuando todo lo demás se apaga. También es, por eso mismo, el lugar exacto donde más puede doler.'
      : 'Nadie espera a {{nombre}} en ninguna parte. No hay llamadas que devolver ni mesa puesta. Hay quien lo llamaría soledad. En los registros que importan tiene otro nombre: Desarraigado. Nada que perder, nada a lo que agarrarse.'
  return [
    {
      identifier: 'who_this_person_is',
      captionLabel: 'Quién',
      paragraphText:
        '{{nombre_completo}}. Nació en {{origen}} el {{fecha_nacimiento}}. Tiene {{edad}} años y vive en {{residencia}}. Ningún expediente, ninguna deuda rara, ningún titular. Una vida que no llama la atención. Esa era la idea.',
    },
    {
      identifier: 'where_this_person_comes_from',
      captionLabel: 'De dónde viene',
      paragraphText: upbringingParagraphByDominantAttribute[dominantAttributeName],
    },
    {
      identifier: 'what_holds_this_person',
      captionLabel: 'Lo que sostiene',
      paragraphText: anchorParagraph,
    },
    {
      identifier: 'how_it_all_began',
      captionLabel: 'Cómo empezó todo',
      paragraphText: beginningParagraphByDominantAttribute[dominantAttributeName],
    },
  ]
}

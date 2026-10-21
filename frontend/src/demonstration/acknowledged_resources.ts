export type AcknowledgedResource = {
  resourceName: string
  authorName: string
  licenseName: string
  contributionText: string
  sourceAddress: string
}

export type AcknowledgedResourceGroup = {
  groupTitle: string
  resources: AcknowledgedResource[]
}

export const acknowledgedResourceGroups: AcknowledgedResourceGroup[] = [
  {
    groupTitle: 'Cimientos',
    resources: [
      {
        resourceName: 'React',
        authorName: 'Meta y colaboradores',
        licenseName: 'MIT',
        contributionText: 'Sostiene cada pantalla y cada cambio de estado de la interfaz.',
        sourceAddress: 'react.dev',
      },
      {
        resourceName: 'Vite',
        authorName: 'VoidZero y colaboradores',
        licenseName: 'MIT',
        contributionText: 'Construye y sirve el juego en el equipo de quien lo abre.',
        sourceAddress: 'vite.dev',
      },
      {
        resourceName: 'Tailwind CSS',
        authorName: 'Tailwind Labs',
        licenseName: 'MIT',
        contributionText: 'Da orden a la paleta, los espaciados y la adaptación a cada pantalla.',
        sourceAddress: 'tailwindcss.com',
      },
      {
        resourceName: 'Radix UI',
        authorName: 'WorkOS',
        licenseName: 'MIT',
        contributionText: 'Diálogos, paneles, interruptores y controles accesibles con teclado y lector de pantalla.',
        sourceAddress: 'radix-ui.com',
      },
    ],
  },
  {
    groupTitle: 'Movimiento',
    resources: [
      {
        resourceName: 'GSAP',
        authorName: 'GreenSock · Webflow',
        licenseName: 'Licencia estándar de GSAP',
        contributionText: 'El golpe del sello, los conteos del cierre y los títulos que se arman letra a letra.',
        sourceAddress: 'gsap.com',
      },
      {
        resourceName: 'Motion',
        authorName: 'Matt Perry y colaboradores',
        licenseName: 'MIT',
        contributionText: 'La respuesta al pulsar y el balanceo de las tarjetas de Susurros.',
        sourceAddress: 'motion.dev',
      },
      {
        resourceName: 'dnd kit',
        authorName: 'Claudéric Demers y colaboradores',
        licenseName: 'MIT',
        contributionText: 'Arrastrar y reordenar los pasos de un plan y las placas de un mecanismo, también con teclado.',
        sourceAddress: 'dndkit.com',
      },
      {
        resourceName: 'Rough.js',
        authorName: 'Preet Shihn',
        licenseName: 'MIT',
        contributionText: 'Trazos con pulso de mano para marcas, subrayados y croquis.',
        sourceAddress: 'roughjs.com',
      },
      {
        resourceName: 'react-zoom-pan-pinch',
        authorName: 'Maciej Pyrc y colaboradores',
        licenseName: 'MIT',
        contributionText: 'Acercar, alejar y recorrer láminas grandes con ratón, dedos o teclado.',
        sourceAddress: 'github.com/BetterTyped/react-zoom-pan-pinch',
      },
    ],
  },
  {
    groupTitle: 'Letra e iconos',
    resources: [
      {
        resourceName: 'Anton',
        authorName: 'Vernon Adams',
        licenseName: 'SIL OFL 1.1',
        contributionText: 'Los títulos, los sellos y el nombre del juego.',
        sourceAddress: 'fonts.google.com/specimen/Anton',
      },
      {
        resourceName: 'Literata',
        authorName: 'TypeTogether',
        licenseName: 'SIL OFL 1.1',
        contributionText: 'La voz del Director: toda la narración se lee en esta letra.',
        sourceAddress: 'fonts.google.com/specimen/Literata',
      },
      {
        resourceName: 'Inter',
        authorName: 'Rasmus Andersson',
        licenseName: 'SIL OFL 1.1',
        contributionText: 'Botones, etiquetas y opciones.',
        sourceAddress: 'rsms.me/inter',
      },
      {
        resourceName: 'Courier Prime',
        authorName: 'Alan Dague-Greene · Quote-Unquote Apps',
        licenseName: 'SIL OFL 1.1',
        contributionText: 'Expedientes, cifras y todo lo que parece mecanografiado.',
        sourceAddress: 'quoteunquoteapps.com/courierprime',
      },
      {
        resourceName: 'Fontsource',
        authorName: 'Ayuhito y colaboradores',
        licenseName: 'MIT',
        contributionText: 'Permite que las tipografías viajen dentro del juego y funcionen sin conexión.',
        sourceAddress: 'fontsource.org',
      },
      {
        resourceName: 'Phosphor Icons',
        authorName: 'Helena Zhang y Tobias Fried',
        licenseName: 'MIT',
        contributionText: 'Iconos de cromo: cerrar, pestañas, caret, ajustes.',
        sourceAddress: 'phosphoricons.com',
      },
      {
        resourceName: 'Glifos temáticos de The Void Files',
        authorName: 'Dibujo propio del proyecto',
        licenseName: 'Uso interno de la Crónica',
        contributionText: 'Casa, libro e hitos: trazo de 2 px, currentColor, 24 por 24.',
        sourceAddress: 'thevoidfiles.local',
      },
    ],
  },
  {
    groupTitle: 'Música',
    resources: [
      {
        resourceName: 'Aurora · Cirrus · Terminus · Eyes In The Void',
        authorName: 'Scott Buckley',
        licenseName: 'CC BY 4.0',
        contributionText: 'El asombro de la portada, la calma de los Susurros, el peso del cierre y el vértigo dentro de un Archivo.',
        sourceAddress: 'scottbuckley.com.au',
      },
      {
        resourceName: 'Signs To Nowhere',
        authorName: 'Shane Ivers · Silverman Sound Studios',
        licenseName: 'CC BY 4.0',
        contributionText: 'El jazz de detective que suena mientras el mundo murmura.',
        sourceAddress: 'silvermansound.com',
      },
      {
        resourceName: 'Dark Ambient Loop 13',
        authorName: 'MundoSound · Lucas Calvo',
        licenseName: 'CC BY 3.0',
        contributionText: 'La tensión grave y continua de cada Archivo.',
        sourceAddress: 'opengameart.org/content/dark-ambient-loop-13',
      },
      {
        resourceName: 'Cosmic Navigation',
        authorName: 'Synth-thetic',
        licenseName: 'CC0',
        contributionText: 'El pulso lento del cosmos en la portada y el Umbral.',
        sourceAddress: 'opengameart.org/content/cosmic-navigation',
      },
      {
        resourceName: 'Haunting Piano',
        authorName: 'Emma_MA',
        licenseName: 'CC0',
        contributionText: 'El piano frío del Registro y la Observación.',
        sourceAddress: 'opengameart.org/content/haunting-piano',
      },
      {
        resourceName: 'First Light Particles',
        authorName: 'Yoiyami',
        licenseName: 'CC0',
        contributionText: 'Piano disperso para los momentos de espera.',
        sourceAddress: 'opengameart.org',
      },
      {
        resourceName: 'A New Start',
        authorName: 'Wolfgang_',
        licenseName: 'CC0',
        contributionText: 'Las primeras notas al cerrar un Archivo.',
        sourceAddress: 'opengameart.org/content/a-new-start-short-solo-piano',
      },
    ],
  },
  {
    groupTitle: 'Sonido',
    resources: [
      {
        resourceName: 'Sonidos de interfaz',
        authorName: 'Kenney',
        licenseName: 'CC0',
        contributionText: 'Clics, teclas, papel, sellos e interferencias.',
        sourceAddress: 'kenney.nl/assets/interface-sounds',
      },
      {
        resourceName: 'Sonidos de impacto',
        authorName: 'Kenney',
        licenseName: 'CC0',
        contributionText: 'El golpe de un cuerpo y el tono grave que cierra una Crónica.',
        sourceAddress: 'kenney.nl/assets/impact-sounds',
      },
      {
        resourceName: 'Latido, pitido agudo y pluma que rasca',
        authorName: 'The Void Files',
        licenseName: 'Sintetizados para este proyecto, sin licencia de terceros',
        contributionText: 'El pulso del miedo, el zumbido de una mente que se quiebra y la pluma del Director.',
        sourceAddress: 'Generados dentro del propio proyecto',
      },
      {
        resourceName: 'Howler.js',
        authorName: 'James Simpson · GoldFire Studios',
        licenseName: 'MIT',
        contributionText: 'Reproduce cada efecto de sonido en el momento justo.',
        sourceAddress: 'howlerjs.com',
      },
    ],
  },
  {
    groupTitle: 'Voz del Director',
    resources: [
      {
        resourceName: 'ElevenLabs',
        authorName: 'ElevenLabs',
        licenseName: 'Servicio de voz de terceros, usado con la clave propia de quien juega',
        contributionText: 'Presta la voz que lee la narración del Director cuando se decide conectarla.',
        sourceAddress: 'elevenlabs.io',
      },
      {
        resourceName: 'FastAPI',
        authorName: 'Sebastián Ramírez y colaboradores',
        licenseName: 'MIT',
        contributionText: 'Da forma al pequeño servicio de voz que corre en el mismo equipo que el juego.',
        sourceAddress: 'fastapi.tiangolo.com',
      },
      {
        resourceName: 'Uvicorn',
        authorName: 'Encode y colaboradores',
        licenseName: 'BSD-3-Clause',
        contributionText: 'Mantiene encendido el servicio de voz mientras dura la partida.',
        sourceAddress: 'uvicorn.dev',
      },
      {
        resourceName: 'HTTPX',
        authorName: 'Encode y colaboradores',
        licenseName: 'BSD-3-Clause',
        contributionText: 'Lleva cada párrafo hasta el servicio de voz y trae de vuelta el sonido.',
        sourceAddress: 'www.python-httpx.org',
      },
      {
        resourceName: 'keyring',
        authorName: 'Jason R. Coombs y colaboradores',
        licenseName: 'MIT',
        contributionText: 'Guarda la clave de voz en el llavero del sistema, fuera del navegador y de cualquier archivo.',
        sourceAddress: 'github.com/jaraco/keyring',
      },
    ],
  },
]

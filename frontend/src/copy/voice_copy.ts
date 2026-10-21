import type { NarrationVoiceOutcome } from '../voice/narration_voice_player'

const failureMessages: Record<Exclude<NarrationVoiceOutcome, 'finished' | 'stopped'>, string> = {
  service_absent:
    'El servicio de voz no responde. Si se apagó, basta con encenderlo de nuevo y pulsar «Volver a buscar». Mientras tanto, la Crónica sigue en silencio y nada más cambia.',
  request_cancelled: 'La petición se interrumpió antes de terminar. Puede repetirse sin problema.',
  unexpected_service_answer:
    'El servicio de voz contestó algo que no se entiende. Conviene comprobar que sea la versión que acompaña a este juego.',
  access_key_missing: 'Todavía no hay ninguna clave guardada en el llavero.',
  access_key_malformed:
    'Eso no tiene forma de clave de ElevenLabs: son al menos veinte caracteres seguidos, sin espacios. Conviene copiarla otra vez con calma.',
  access_key_rejected:
    'ElevenLabs no acepta la clave guardada, o le faltan permisos de texto a voz y de lectura de voces. Se puede borrar y guardar otra.',
  access_key_vault_unavailable:
    'El llavero del sistema no está disponible, así que la clave no puede guardarse de forma segura. No se guardó nada.',
  speech_quota_exhausted: 'La cuenta de ElevenLabs agotó sus caracteres de este periodo. La voz volverá cuando se renueven.',
  speech_provider_busy: 'ElevenLabs está atendiendo demasiadas peticiones a la vez. Vale la pena esperar unos segundos y repetir.',
  speech_provider_unreachable: 'No se pudo llegar a ElevenLabs. Puede que no haya conexión a internet en este momento.',
  speech_provider_failed: 'ElevenLabs respondió con un fallo propio. No es culpa de la clave; puede intentarse más tarde.',
  speech_text_empty: 'No había nada que leer.',
  speech_text_too_long: 'El texto era demasiado largo para una sola lectura.',
  voice_not_found: 'La voz elegida ya no existe en la cuenta. Hay que elegir otra de la lista.',
  voice_identifier_malformed: 'La voz elegida no es válida. Hay que elegir otra de la lista.',
  request_invalid: 'El servicio de voz no entendió la petición.',
  origin_not_allowed:
    'El servicio de voz solo atiende al juego abierto en la dirección local habitual. Conviene abrirlo desde allí.',
  playback_blocked:
    'El navegador no dejó sonar el audio. Suele bastar con pulsar de nuevo el botón de prueba.',
}

export const voiceCopy = {
  blockNumber: '03',
  title: 'Voz real',
  description:
    'Conecta la narración del Director con ElevenLabs a través del servicio de voz que corre en este mismo equipo. Es opcional: sin él, la Crónica se juega igual, solo que en silencio.',
  secrecyNotice:
    'La clave viaja una sola vez desde este campo hasta el servicio local, que la guarda en el llavero del sistema. El navegador no la conserva, no se escribe en ningún archivo y nadie puede volver a leerla desde aquí.',
  serviceState: {
    label: 'Servicio de voz',
    checking: 'Buscando el servicio…',
    absent: 'Apagado o ausente',
    readyWithoutKey: 'Encendido, sin clave',
    readyWithKey: 'Encendido, con clave guardada',
    vaultUnavailable: 'Encendido, sin llavero',
    absentHelp:
      'No hay nada escuchando en este equipo. Las instrucciones para encenderlo están en la carpeta del servicio de voz del proyecto. El juego no lo necesita para funcionar.',
    searchAgainButton: 'Volver a buscar',
  },
  accessKey: {
    label: 'Clave de ElevenLabs',
    placeholder: 'Pegar la clave aquí',
    helper: 'El campo se vacía en cuanto se envía. Nunca se muestra en pantalla.',
    saveButton: 'Guardar en el llavero',
    savingButton: 'Guardando…',
    replaceHint: 'Ya hay una clave guardada. Escribir otra y guardarla sustituye a la anterior.',
    deleteButton: 'Borrar la clave',
    deletingButton: 'Borrando…',
    saved: 'Clave guardada en el llavero del sistema. El campo quedó vacío.',
    deleted: 'Clave borrada del llavero. La narración vuelve al silencio.',
  },
  voiceChoice: {
    label: 'Voz de la narración',
    placeholder: 'Elegir una voz',
    loading: 'Pidiendo la lista de voces…',
    empty: 'La cuenta no tiene voces disponibles.',
    spanishMark: 'español',
    reloadButton: 'Pedir la lista otra vez',
    voiceCount: (voiceCount: number, spanishVoiceCount: number) =>
      spanishVoiceCount > 0
        ? `${voiceCount} voces en la cuenta; ${spanishVoiceCount} con español verificado, al principio de la lista.`
        : `${voiceCount} voces en la cuenta. Ninguna declara español, aunque el modelo puede leerlo con cualquiera.`,
  },
  narrationSwitch: {
    label: 'Leer la narración en voz alta',
    hint: 'Cada narración del Director consume caracteres de la cuenta. El volumen sigue al de los efectos de sonido en Ajustes.',
    needsVoice: 'Se habilita al elegir una voz.',
  },
  testPhrase: {
    label: 'Frase de prueba',
    text: 'La lluvia no ha dejado de caer desde que se abrió el Archivo. Alguien, en algún lugar, ya sabe su nombre.',
    listenButton: 'Escuchar la frase',
    stopButton: 'Detener la lectura',
    realCallTag: 'Llamada real',
    waitingSequences: [
      ['Se descuelga la línea…', 'Alguien toma aire al otro lado…', 'La voz se acerca…'],
      ['Se envía la frase…', 'Una garganta lejana la ensaya…', 'Llega el primer aliento…'],
      ['Se marca el número…', 'Tono de espera…', 'Contestan, esta vez con voz…'],
    ],
    speaking: 'La voz elegida está leyendo la frase.',
    finished: 'Lectura terminada. Así sonará el Director.',
    soundDisabled: 'El sonido está apagado en Ajustes, así que la prueba no se oiría.',
  },
  failureMessages,
} as const

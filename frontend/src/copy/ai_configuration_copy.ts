export const aiConfigurationCopy = {
  screenTitle: 'Ajustes',
  consoleHeading: 'Antes de abrir el archivo',
  introduction:
    'The Void Files necesita dos inteligencias para funcionar: una que dirija la historia y otra que la lea en voz alta. Aquí se elige cuál ocupará cada puesto.',
  bootSequences: [
    ['Consola de enlace encendida', 'Memoria local: en blanco', 'Dos puestos vacantes: historia y voz', 'A la espera de quien configure'],
    ['Se enciende la consola', 'Ningún enlace activo', 'Puestos por cubrir: 2', 'Todo queda en este navegador'],
    ['Arranque en frío', 'Sin Director asignado', 'Sin voz asignada', 'La consola escucha'],
  ],
  bootSequenceAccessibleLabel: 'Registro de arranque de la consola',
  demonstrationPrivacyNotice:
    'Esto es una demostración: las claves de estos puestos no salen de este navegador ni se usan para nada; solo se conservan, enmascarados, sus cuatro últimos caracteres. La única excepción es la clave de la voz del Director: esa viaja al servicio de voz de este mismo equipo, que la guarda en el llavero del sistema y la usa para pedir la narración.',
  progress: {
    label: 'Puestos cubiertos',
    summary: (completedCount: number) => `${completedCount} de 2`,
    complete: 'Listo',
    pending: 'Pendiente',
  },
  roles: {
    story: {
      blockNumber: '01',
      title: 'IA de la historia',
      description:
        'Hará de Director: creará los casos, decidirá qué consecuencias tiene cada acción y narrará lo que ocurra.',
      providerLegend: '¿Quién dirigirá la historia?',
      optionLabel: 'Modelo',
      optionPlaceholder: 'Elegir un modelo',
    },
    voice: {
      blockNumber: '02',
      title: 'IA de la voz',
      description: 'Leerá en voz alta la narración del Director, para quien prefiera escuchar la Crónica.',
      providerLegend: '¿Quién pondrá la voz?',
      optionLabel: 'Voz',
      optionPlaceholder: 'Elegir una voz',
    },
  },
  providerNames: {
    anthropic_claude: 'Anthropic Claude',
    google_gemini: 'Google Gemini',
    deepseek: 'DeepSeek',
    groq: 'Groq',
    openai: 'OpenAI',
    local_compatible_model: 'Modelo local compatible',
    elevenlabs: 'ElevenLabs',
    google_cloud_text_to_speech: 'Google Cloud Text-to-Speech',
    azure_speech: 'Azure Speech',
    browser_voice: 'Voz del navegador',
  } as Record<string, string>,
  providerNotes: {
    anthropic_claude: 'Prosa cuidada y buen pulso para sostener un misterio largo.',
    google_gemini: 'Contexto muy amplio para Crónicas con muchos Archivos.',
    deepseek: 'Director de recambio cuando Gemini no responde.',
    groq: 'Capa gratuita y rápida para probar el Director.',
    openai: 'Rápido y versátil para adjudicar turnos.',
    local_compatible_model: 'Se ejecuta en un equipo propio. No necesita clave.',
    elevenlabs: 'Voces expresivas, con matices de actor.',
    google_cloud_text_to_speech: 'Voces neuronales en español de varias regiones.',
    azure_speech: 'Voces neuronales con acentos latinoamericanos.',
    browser_voice: 'Usa las voces instaladas en este dispositivo. No necesita clave.',
  } as Record<string, string>,
  accessKey: {
    label: 'Clave de acceso',
    placeholder: 'Pegar o escribir la clave',
    showButton: 'Mostrar clave',
    hideButton: 'Ocultar clave',
    helper: 'La clave no sale de este navegador y en esta demostración no se usa.',
    tooShort: (minimumLength: number) =>
      `La clave parece incompleta: suelen tener ${minimumLength} caracteres o más. Conviene revisarla con calma.`,
    storedEnding: (maskedEnding: string) => `Solo se guardará así: ${maskedEnding}`,
    notRequired: 'Este proveedor no pide clave.',
  },
  optionMissing: 'Falta elegir una opción de la lista.',
  providerMissing: 'Primero hay que elegir un proveedor.',
  connectionCheck: {
    button: 'Probar conexión',
    buttonAgain: 'Probar de nuevo',
    inProgressButton: 'Probando…',
    simulationTag: 'Comprobación simulada',
    waitingSequences: [
      ['Se descuelga la línea…', 'Alguien escucha al otro lado…', 'Se anota la respuesta…'],
      ['Se envía una señal al vacío…', 'La señal rebota…', 'Se mide el eco…'],
      ['Se marca el número…', 'Tono de espera…', 'Contestan sin decir nada…'],
    ],
    simulatedSuccess:
      'Prueba simulada superada. En esta demostración no se llamó a ningún servicio ni se envió la clave: solo se ensayó el paso.',
    needsCompleteBlock: 'Antes de probar hay que elegir proveedor, opción y escribir una clave completa.',
  },
  browserSpeech: {
    listenButton: 'Escuchar una prueba real',
    stopButton: 'Detener la lectura',
    realTestTag: 'Prueba real',
    samplePhrase: 'La lluvia no ha dejado de caer desde que se abrió el Archivo. Alguien, en algún lugar, ya sabe su nombre.',
    defaultVoiceOption: 'Voz predeterminada del navegador',
    speaking: 'La voz del navegador está leyendo la frase de prueba.',
    finished: 'Lectura terminada. Esa es la voz que narraría la Crónica.',
    failed: 'El navegador no pudo leer la frase. Puede intentarse otra vez o elegir otra voz.',
    unsupported:
      'Este navegador no ofrece lectura en voz alta, así que aquí no es posible hacer la prueba. Se puede elegir igualmente o cambiar de proveedor.',
    noSpanishVoices:
      'No se encontraron voces en español en este dispositivo. Se usará la voz predeterminada, que quizá lea con otro acento.',
    spanishVoicesFound: (voiceCount: number) =>
      voiceCount === 1 ? 'Se encontró 1 voz en español en este dispositivo.' : `Se encontraron ${voiceCount} voces en español en este dispositivo.`,
  },
  localService: {
    searchingLine: 'Buscando el servicio local de este equipo…',
    demonstrationModeNotice:
      'No se encontró el servicio local de este equipo: esta pantalla funciona como demostración y nada de lo que se escriba aquí llega a ningún proveedor.',
    privacyNotice:
      'El servicio local de este equipo está en marcha. La clave que se guarde aquí viaja una sola vez a ese servicio, que la conserva en el llavero del sistema. El navegador no la guarda: solo vuelve a mostrar sus cuatro últimos caracteres.',
    sectionLabel: 'Claves del servicio local',
    loadingLine: 'Consultando el servicio local…',
    loadFailedLine: 'No se pudo leer el estado del servicio local.',
    refreshButton: 'Volver a consultar',
    roles: {
      story: {
        blockNumber: '01',
        title: 'Narración del Director',
        description: 'La inteligencia que dirige la historia. En modo real la atiende Google Gemini.',
        descriptionForProvider: (providerDisplayName: string) =>
          `La inteligencia que dirige la historia. En modo real la atiende ${providerDisplayName}.`,
        realProviderName: 'Google Gemini',
        realProviderNames: {
          gemini: 'Google Gemini',
          deepseek: 'DeepSeek',
          openai: 'OpenAI GPT',
          groq: 'Groq',
        } as Record<string, string>,
        providerLegend: '¿Quién dirigirá la historia?',
        modelLabel: 'Modelo',
        modelPlaceholder: 'Elegir un modelo',
        modelLockedHelp:
          'Primero hay que guardar la clave y probar la conexión. Si el Director responde, aquí se podrá elegir el modelo.',
        modelUnlockedHelp: 'El Director respondió. Ya se puede elegir el modelo que usará este puesto.',
        applyModelButton: 'Usar este modelo',
        applyingModelButton: 'Cambiando modelo…',
        modelAppliedConfirmation: 'Este modelo queda a cargo de la narración.',
        providerNotes: {
          gemini: 'Contexto amplio. Útil si la cuenta de Google está en calma.',
          deepseek: 'Recambio cuando Gemini no responde.',
          openai: 'GPT para dirigir el caso si DeepSeek o Gemini no están disponibles.',
          groq: 'Capa gratuita, rápida. Sirve para probar el Director sin saldo.',
        } as Record<string, string>,
        modelNames: {
          'gemini-3.6-flash': 'Gemini 3.6 Flash',
          'gemini-3.5-flash': 'Gemini 3.5 Flash',
          'gemini-flash-latest': 'Gemini Flash (latest)',
          'deepseek-v4-pro': 'DeepSeek V4 Pro',
          'deepseek-flash': 'DeepSeek Flash',
          'gpt-4o': 'GPT-4o',
          'gpt-4.1': 'GPT-4.1',
          'gpt-4o-mini': 'GPT-4o mini',
          'qwen/qwen3.8-27b': 'Qwen 3.8 27B',
          'openai/gpt-oss-120b': 'GPT-OSS 120B',
          'openai/gpt-oss-20b': 'GPT-OSS 20B',
        } as Record<string, string>,
      },
      voice: {
        blockNumber: '02',
        title: 'Voz del Director',
        description: 'La inteligencia que lee la narración en voz alta. En modo real la atiende ElevenLabs.',
        realProviderName: 'ElevenLabs',
      },
    },
    syntheticProviderName: 'Proveedor sintético del servicio local',
    servicePlacementOptionName: 'Servicio local de este equipo',
    modeLabels: { real: 'Modo real', synthetic: 'Modo sintético' },
    modeLines: {
      real: 'Las respuestas vienen del proveedor de verdad y pueden tener costo.',
      synthetic:
        'El servicio responde con material de ensayo. No hace falta ninguna clave y no se envía ninguna a ninguna parte.',
    },
    keyStates: {
      stored: (visibleEnding: string) => `Clave guardada en el llavero del sistema. Termina en ••••${visibleEnding}`,
      storedWithoutEnding: 'Clave guardada en el llavero del sistema.',
      missing: 'Sin clave guardada: este puesto todavía no puede trabajar en modo real.',
      notNeeded: 'Este puesto no necesita clave en modo sintético.',
    },
    maskedEnding: (visibleEnding: string) => `••••${visibleEnding}`,
    accessKeyLabel: 'Clave de acceso',
    accessKeyReplacementLabel: 'Clave nueva para reemplazar la guardada',
    accessKeyPlaceholder: 'Pegar o escribir la clave',
    accessKeyHelper:
      'Al guardar, la clave se envía solo al servicio local de este equipo y el campo se vacía de inmediato.',
    saveButton: 'Guardar clave',
    savingButton: 'Guardando…',
    removeButton: 'Quitar clave',
    confirmRemoveButton: 'Confirmar: quitar la clave',
    removingButton: 'Quitando…',
    checkButton: 'Probar conexión',
    checkingButton: 'Probando…',
    realCheckTag: 'Prueba real',
    syntheticCheckTag: 'Prueba de ensayo',
    checkingLine: 'Se espera la respuesta del servicio. Puede tardar algunos segundos.',
    realCheckCostNotice: 'En modo real esta prueba hace un pedido pequeño al proveedor y queda anotada en el registro del servicio.',
    voiceChoiceHint: 'La voz concreta y la frase de prueba se eligen en el panel de voz, más abajo.',
    confirmations: {
      saved: 'Clave guardada. El campo se vació y aquí solo queda su terminación.',
      removed: 'Clave quitada del llavero del sistema.',
      storyCheckPassed: 'El Director respondió. La conexión de la narración funciona.',
      storyCheckPassedInSyntheticMode:
        'El Director de ensayo respondió. No se llamó a ningún proveedor ni se usó ninguna clave.',
      voiceCheckPassed: (voiceCount: number) =>
        voiceCount === 1
          ? 'El proveedor de voz respondió con 1 voz disponible.'
          : `El proveedor de voz respondió con ${voiceCount} voces disponibles.`,
      voiceCheckPassedInSyntheticMode:
        'El servicio de voz de ensayo respondió. No se llamó a ningún proveedor ni se usó ninguna clave.',
    },
    failures: {
      key_missing: 'Falta la clave: el servicio local no tiene ninguna guardada para este puesto.',
      key_rejected:
        'El proveedor rechazó la clave: puede estar mal copiada o ser una clave restringida sin los permisos necesarios. En ElevenLabs hacen falta el permiso de texto a voz y el de lectura de voces. Conviene revisarla o generar una nueva y guardarla otra vez.',
      key_malformed:
        'La clave parece incompleta o tiene caracteres extraños: suelen tener veinte caracteres o más, sin espacios.',
      quota_or_rate_limit:
        'El proveedor no aceptó el pedido por cuota agotada o por demasiados pedidos seguidos. Se puede esperar un momento o revisar el plan de la cuenta.',
      account_without_balance:
        'La cuenta de este proveedor no tiene saldo. Hay que recargar ahí o elegir otro Director.',
      request_too_large:
        'Este proveedor no admite un pedido tan grande en el plan gratuito. La prueba de conexión puede pasar; generar el Archivo entero no cabe. Hay que subir de plan o usar otro Director.',
      timeout: 'El proveedor no respondió a tiempo o no se pudo llegar hasta él. Conviene revisar la conexión a internet.',
      service_absent: 'El servicio local dejó de responder. Hay que comprobar que siga en marcha y volver a consultar.',
      provider_not_configured:
        'El servicio local no tiene un proveedor configurado para este puesto. Hay que revisar cómo se inició el servicio.',
      provider_refused:
        'El proveedor contestó, pero rechazó el pedido o devolvió una respuesta que no sirve. La clave puede estar bien; conviene probar de nuevo más tarde.',
      vault_unavailable: 'El servicio local no pudo abrir el llavero del sistema, así que no puede guardar ni leer claves.',
      profile_missing: 'El servicio local todavía no tiene un expediente abierto para anotar la prueba. Conviene volver a consultar.',
      unexpected_answer: 'El Director contestó, pero no con la forma esperada. Conviene probar de nuevo.',
      unknown: 'El servicio local respondió con un problema que esta pantalla no sabe explicar. Conviene probar de nuevo.',
      selection_rejected:
        'Ese proveedor o ese modelo no se pueden usar ahora. Hay que guardar la clave del proveedor elegido y probar de nuevo.',
    },
    saveDisabledReason: 'Se habilita cuando los dos puestos tengan lo que necesitan en el servicio local.',
  },
  actions: {
    saveAndContinue: 'Guardar y continuar',
    saveDisabledReason: 'Se habilita cuando los dos puestos estén cubiertos.',
    continueWithoutConfiguring: 'Continuar sin configurar',
    skipNotice:
      'Por ahora se puede pasar de largo. En la versión final, la IA de la historia y la IA de la voz serán obligatorias para jugar.',
    leaving: 'La consola se apaga. Queda una sola luz.',
  },
  titleScreenAwakening: {
    keyboardHint: 'Clic, toque, Enter o Espacio',
  },
} as const

export const directorOperationFailureCopy = {
  openingFailedTitle: 'El Archivo no se abrió',
  turnFailedTitle: 'El Director no pudo anotar este paso',
  noticesByFailureName: {
    case_generation_rejected:
      'El Director escribió el expediente, pero el revisor lo rechazó: una pieza o un identificador no cumplía las reglas. Espera un momento y abre una sola vez.',
    narrative_provider_busy:
      'El modelo está saturado o sin cuota en este momento. Espera un minuto y prueba una sola vez.',
    narrative_request_too_large:
      'Este proveedor no admite un pedido tan grande en el plan actual. Conviene Gemini 3.6 o 3.5 Flash para generar el Archivo.',
    narrative_quota_exhausted: 'La cuenta de este proveedor no tiene saldo. Hay que recargar o elegir otro Director.',
    narrative_access_key_missing: 'Falta la clave del Director en el llavero. Se guarda en Ajustes.',
    narrative_access_key_rejected: 'El proveedor rechazó la clave. Conviene revisarla en Ajustes.',
    narrative_model_not_found: 'Este modelo ya no está disponible en esa cuenta. Elige otro en Ajustes.',
    narrative_provider_timed_out: 'El modelo no terminó a tiempo. Espera y vuelve a intentar una vez.',
    narrative_provider_unreachable: 'No se pudo llegar al proveedor. Revisa la red y que el servicio local siga en marcha.',
    narrative_provider_failed: 'El proveedor rechazó el pedido o devolvió una respuesta que no sirve.',
    narrative_request_refused: 'El proveedor rechazó el pedido. A veces el esquema o el tamaño no le convienen; conviene reintentar o cambiar de modelo.',
    narrative_response_empty: 'El Director contestó vacío. Conviene reintentar una vez.',
    narrative_response_blocked: 'El proveedor bloqueó la respuesta. Conviene reintentar con otras palabras o otro modelo.',
    request_cancelled: 'Se canceló la espera. Si pulsas de nuevo, espera a que las letras terminen.',
    service_absent: 'El servicio local no responde. Comprueba que siga en marcha en el puerto 8765.',
    unexpected_service_answer: 'El servicio contestó con una forma que esta pantalla no espera. Recarga dura y abre una sola vez.',
    archive_opening_unavailable: 'No se pudo cargar el Director remoto. Recarga dura y vuelve a abrir el Susurro.',
    director_time_budget_exhausted:
      'El Director no terminó a tiempo. El expediente sigue; conviene reintentar una vez.',
    state_version_conflict: 'El Archivo ya había avanzado. Se recuperó el estado confirmado; revisa las opciones antes de elegir una nueva acción.',
    archive_recovery_conflict: 'El Archivo cambió mientras se recuperaba. Reintentar permite consultar de nuevo su estado confirmado.',
    archive_already_open: 'Ya hay un Archivo abierto en este expediente.',
    archive_opening_already_pending: 'El Archivo todavía se está abriendo. Espera a que las letras terminen o a que el recuadro muestre el fallo.',
    whisper_not_offered: 'Ese Susurro no está en la oferta actual. Vuelve a la lista de Susurros.',
  } as Record<string, string>,
  unknownFailure: 'Algo falló al hablar con el Director. Nada se anotó. El recuadro de reintento no cobra de nuevo.',
  retryHint: 'Reintentar no descuenta fondos ni objetos.',
} as const

export function readDirectorOperationFailureText(failureName: string | null): string {
  if (failureName === null) {
    return directorOperationFailureCopy.unknownFailure
  }
  return directorOperationFailureCopy.noticesByFailureName[failureName] ?? directorOperationFailureCopy.unknownFailure
}

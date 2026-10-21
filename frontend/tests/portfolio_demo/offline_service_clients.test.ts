import { afterEach, describe, expect, it, vi } from 'vitest'
import { chronicleClosedCopy } from '../../src/portfolio_demo/nameless_copy/chronicle_closed_copy'
import { chronicleHistoryCopy } from '../../src/portfolio_demo/nameless_copy/chronicle_history_copy'
import { namelessInvestigatorRoleName } from '../../src/portfolio_demo/nameless_investigator_wording'
import { readGameServiceHealth, sendGameServiceRequest } from '../../src/portfolio_demo/offline_game_service_client'
import {
  deleteVoiceAccessKey,
  listAvailableNarrationVoices,
  readVoiceServiceStatus,
  requestSpeechAudio,
  storeVoiceAccessKey,
} from '../../src/portfolio_demo/offline_voice_service_client'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('clientes sin red de la demo', () => {
  it('el cliente del servicio de juego contesta ausente sin llamar a la red', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    await expect(sendGameServiceRequest('/api/health', { method: 'GET' })).resolves.toEqual({
      wasSuccessful: false,
      failureName: 'service_absent',
      responseStatusCode: null,
    })
    await expect(readGameServiceHealth()).resolves.toMatchObject({ wasSuccessful: false, failureName: 'service_absent' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('la voz contesta como el servicio de voz ausente del juego real y no llama a la red', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const absentAnswer = { wasSuccessful: false, failureName: 'service_absent' }
    await expect(listAvailableNarrationVoices()).resolves.toEqual(absentAnswer)
    await expect(readVoiceServiceStatus()).resolves.toEqual(absentAnswer)
    await expect(storeVoiceAccessKey('clave_de_prueba_que_no_se_envia')).resolves.toEqual(absentAnswer)
    await expect(deleteVoiceAccessKey()).resolves.toEqual(absentAnswer)
    await expect(requestSpeechAudio('La lancha deja al Investigador.', 'cualquier_voz', new AbortController().signal)).resolves.toEqual(
      absentAnswer,
    )
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('textos del juego con el investigador sin nombre', () => {
  it('los epitafios y la portada de la crónica usan el rol con artículo y contracción', () => {
    const epitaphTexts = [...chronicleClosedCopy.physicalEpitaphLines, ...chronicleClosedCopy.psychologicalEpitaphLines].map(
      (writeEpitaph) => writeEpitaph(namelessInvestigatorRoleName),
    )
    expect(epitaphTexts).toContain('Aquí termina el trabajo del Investigador. Nadie pasó a recoger sus notas esa noche.')
    expect(epitaphTexts).toContain('Nadie vio caer al Investigador. Simplemente dejó de responder a su nombre.')
    expect(epitaphTexts.every((epitaphText) => !/(^|[.] )Investigador/.test(epitaphText))).toBe(true)
    expect(chronicleHistoryCopy.cover.chronicleOwnerLine(namelessInvestigatorRoleName)).toBe('Crónica del Investigador')
  })
})

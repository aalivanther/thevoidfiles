export const gameServiceBaseAddress = import.meta.env.DEV ? 'http://127.0.0.1:8765' : window.location.origin

export const gameServiceProfileIdentifierHeaderName = 'X-Profile-Identifier'

const gameServiceDefaultTimeoutMilliseconds = 8000

export type GameServiceClientFailureName = 'service_absent' | 'request_cancelled' | 'unexpected_service_answer'

export type GameServiceFailure = {
  wasSuccessful: false
  failureName: string
  responseStatusCode: number | null
}

export type GameServiceResult<ResultValue> = { wasSuccessful: true; value: ResultValue } | GameServiceFailure

export type GameServiceRequestOptions = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  jsonBody?: unknown
  profileIdentifier?: string | null
  timeoutMilliseconds?: number
  cancellationSignal?: AbortSignal
}

export type GameServiceHealth = {
  providerModeName: 'synthetic' | 'real'
  isFrontendDistributionServed: boolean
}

function isRecord(candidate: unknown): candidate is Record<string, unknown> {
  return typeof candidate === 'object' && candidate !== null
}

function buildClientFailure(failureName: GameServiceClientFailureName): GameServiceFailure {
  return { wasSuccessful: false, failureName, responseStatusCode: null }
}

async function readJsonBody(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

export async function sendGameServiceRequest(
  path: string,
  requestOptions: GameServiceRequestOptions,
): Promise<GameServiceResult<unknown>> {
  const timeoutAbortController = new AbortController()
  const timeoutIdentifier = window.setTimeout(
    () => timeoutAbortController.abort(),
    requestOptions.timeoutMilliseconds ?? gameServiceDefaultTimeoutMilliseconds,
  )
  const cancelFromOutside = () => timeoutAbortController.abort()
  requestOptions.cancellationSignal?.addEventListener('abort', cancelFromOutside)
  try {
    if (requestOptions.cancellationSignal?.aborted) {
      return buildClientFailure('request_cancelled')
    }
    const requestHeaders: Record<string, string> = {}
    if (requestOptions.jsonBody !== undefined) {
      requestHeaders['Content-Type'] = 'application/json'
    }
    if (requestOptions.profileIdentifier) {
      requestHeaders[gameServiceProfileIdentifierHeaderName] = requestOptions.profileIdentifier
    }
    const response = await fetch(`${gameServiceBaseAddress}${path}`, {
      method: requestOptions.method,
      headers: requestHeaders,
      body: requestOptions.jsonBody === undefined ? undefined : JSON.stringify(requestOptions.jsonBody),
      signal: timeoutAbortController.signal,
      cache: 'no-store',
      credentials: 'omit',
    })
    const parsedBody = await readJsonBody(response)
    if (!response.ok) {
      return {
        wasSuccessful: false,
        failureName:
          isRecord(parsedBody) && typeof parsedBody.failure_name === 'string'
            ? parsedBody.failure_name
            : 'unexpected_service_answer',
        responseStatusCode: response.status,
      }
    }
    if (parsedBody === undefined) {
      return { wasSuccessful: false, failureName: 'unexpected_service_answer', responseStatusCode: response.status }
    }
    return { wasSuccessful: true, value: parsedBody }
  } catch {
    return buildClientFailure(requestOptions.cancellationSignal?.aborted ? 'request_cancelled' : 'service_absent')
  } finally {
    window.clearTimeout(timeoutIdentifier)
    requestOptions.cancellationSignal?.removeEventListener('abort', cancelFromOutside)
  }
}

export async function readGameServiceHealth(
  timeoutMilliseconds: number = gameServiceDefaultTimeoutMilliseconds,
): Promise<GameServiceResult<GameServiceHealth>> {
  const result = await sendGameServiceRequest('/api/health', { method: 'GET', timeoutMilliseconds })
  if (!result.wasSuccessful) {
    return result
  }
  const healthRecord = result.value
  if (
    !isRecord(healthRecord) ||
    (healthRecord.provider_mode_name !== 'synthetic' && healthRecord.provider_mode_name !== 'real') ||
    typeof healthRecord.is_frontend_distribution_served !== 'boolean'
  ) {
    return { wasSuccessful: false, failureName: 'unexpected_service_answer', responseStatusCode: null }
  }
  return {
    wasSuccessful: true,
    value: {
      providerModeName: healthRecord.provider_mode_name,
      isFrontendDistributionServed: healthRecord.is_frontend_distribution_served,
    },
  }
}

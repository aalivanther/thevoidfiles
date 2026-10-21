import type * as RealGameServiceClient from '../game_service/game_service_client'

export type {
  GameServiceClientFailureName,
  GameServiceFailure,
  GameServiceHealth,
  GameServiceRequestOptions,
  GameServiceResult,
} from '../game_service/game_service_client'

export const gameServiceProfileIdentifierHeaderName: typeof RealGameServiceClient.gameServiceProfileIdentifierHeaderName =
  'X-Profile-Identifier'

const absentServiceFailure: RealGameServiceClient.GameServiceFailure = {
  wasSuccessful: false,
  failureName: 'service_absent',
  responseStatusCode: null,
}

export const sendGameServiceRequest: typeof RealGameServiceClient.sendGameServiceRequest = async (_path, requestOptions) =>
  requestOptions.cancellationSignal?.aborted
    ? { wasSuccessful: false, failureName: 'request_cancelled', responseStatusCode: null }
    : absentServiceFailure

export const readGameServiceHealth: typeof RealGameServiceClient.readGameServiceHealth = async () => absentServiceFailure

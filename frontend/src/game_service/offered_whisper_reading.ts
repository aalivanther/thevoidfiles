import { whisperCards } from '../demonstration/demonstration_case_script'
import type { WhisperCardContent } from '../demonstration/demonstration_case_script'
import { readOfferedWhispersFromGameService } from './case_start_client'
import { readGameServicePresence } from './game_service_presence'

export async function readWhisperCardsForSelection(): Promise<WhisperCardContent[]> {
  const gameServicePresence = await readGameServicePresence()
  if (gameServicePresence.activeProfileIdentifier === null) {
    return whisperCards
  }
  const whisperOfferResult = await readOfferedWhispersFromGameService(gameServicePresence.activeProfileIdentifier)
  if (!whisperOfferResult.wasSuccessful) {
    return []
  }
  if (whisperOfferResult.value.offeredWhispers.length === 0) {
    return whisperCards
  }
  return whisperOfferResult.value.offeredWhispers
}

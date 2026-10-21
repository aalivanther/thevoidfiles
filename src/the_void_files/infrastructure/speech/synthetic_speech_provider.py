import io
import math
import struct
import wave

from the_void_files.application.content_hashing import compute_text_content_hash
from the_void_files.application.ports.speech_provider import (
    AvailableVoice,
    SpeechSynthesisRequest,
    SpeechSynthesisResponse,
    VoiceListingRequest,
    VoiceListingResponse,
)

synthetic_sample_rate = 8000
synthetic_seconds_per_character = 0.04
synthetic_minimum_duration_seconds = 0.4
synthetic_maximum_duration_seconds = 6.0
synthetic_lowest_tone_frequency = 180
synthetic_tone_frequency_span = 140
synthetic_tone_amplitude = 6000

synthetic_voices = [
    AvailableVoice(voice_identifier="syntheticNarrator01", visible_name="Marisol", speaks_spanish=True),
    AvailableVoice(voice_identifier="syntheticNarrator02", visible_name="Aurelio", speaks_spanish=True),
]


def build_deterministic_tone_audio(text: str, voice_identifier: str) -> bytes:
    content_hash = compute_text_content_hash(f"{voice_identifier}\n{text}")
    tone_frequency = synthetic_lowest_tone_frequency + int(content_hash[:4], 16) % synthetic_tone_frequency_span
    duration_seconds = min(
        synthetic_maximum_duration_seconds,
        max(synthetic_minimum_duration_seconds, len(text) * synthetic_seconds_per_character),
    )
    sample_count = int(duration_seconds * synthetic_sample_rate)
    audio_samples = b"".join(
        struct.pack(
            "<h",
            int(synthetic_tone_amplitude * math.sin(2 * math.pi * tone_frequency * sample_index / synthetic_sample_rate)),
        )
        for sample_index in range(sample_count)
    )
    audio_buffer = io.BytesIO()
    with wave.open(audio_buffer, "wb") as wave_file:
        wave_file.setnchannels(1)
        wave_file.setsampwidth(2)
        wave_file.setframerate(synthetic_sample_rate)
        wave_file.writeframes(audio_samples)
    return audio_buffer.getvalue()


class SyntheticSpeechProvider:
    provider_name = "synthetic_speech"
    provider_mode_name = "synthetic"
    speech_model_identifier = "synthetic_tone_v1"

    async def list_available_voices(self, listing_request: VoiceListingRequest) -> VoiceListingResponse:
        return VoiceListingResponse(provider_name=self.provider_name, voices=list(synthetic_voices))

    async def synthesize_speech(self, synthesis_request: SpeechSynthesisRequest) -> SpeechSynthesisResponse:
        return SpeechSynthesisResponse(
            provider_name=self.provider_name,
            speech_model_identifier=self.speech_model_identifier,
            media_type_name="audio/wav",
            audio_bytes=build_deterministic_tone_audio(synthesis_request.text, synthesis_request.voice_identifier),
        )

    async def close(self) -> None:
        return None

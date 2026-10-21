CREATE TABLE ai_interaction (
    sequence_number INTEGER PRIMARY KEY AUTOINCREMENT,
    interaction_identifier TEXT NOT NULL UNIQUE,
    provider_kind_name TEXT NOT NULL CHECK (provider_kind_name IN ('narrative', 'speech')),
    provider_name TEXT NOT NULL,
    provider_mode_name TEXT NOT NULL CHECK (provider_mode_name IN ('synthetic', 'real')),
    operation_name TEXT NOT NULL,
    model_identifier TEXT,
    purpose_name TEXT NOT NULL,
    turn_identifier TEXT,
    outcome_name TEXT NOT NULL CHECK (outcome_name IN ('succeeded', 'failed')),
    failure_name TEXT,
    request_body_file_name TEXT NOT NULL,
    response_body_file_name TEXT NOT NULL,
    request_content_hash TEXT NOT NULL,
    response_content_hash TEXT NOT NULL,
    started_at_utc TEXT NOT NULL,
    finished_at_utc TEXT NOT NULL,
    duration_milliseconds INTEGER NOT NULL CHECK (duration_milliseconds >= 0),
    CHECK ((outcome_name = 'failed') = (failure_name IS NOT NULL))
);

CREATE INDEX ai_interaction_by_turn ON ai_interaction (turn_identifier);

CREATE TRIGGER ai_interaction_rejects_update
BEFORE UPDATE ON ai_interaction
BEGIN
    SELECT RAISE(ABORT, 'ai_interaction_is_append_only');
END;

CREATE TRIGGER ai_interaction_rejects_delete
BEFORE DELETE ON ai_interaction
BEGIN
    SELECT RAISE(ABORT, 'ai_interaction_is_append_only');
END;

CREATE TABLE narration_audio (
    content_hash TEXT PRIMARY KEY,
    provider_name TEXT NOT NULL,
    speech_model_identifier TEXT NOT NULL,
    voice_identifier TEXT NOT NULL,
    media_type_name TEXT NOT NULL,
    audio_file_name TEXT NOT NULL UNIQUE,
    audio_byte_count INTEGER NOT NULL CHECK (audio_byte_count > 0),
    text_character_count INTEGER NOT NULL CHECK (text_character_count > 0),
    interaction_identifier TEXT NOT NULL REFERENCES ai_interaction (interaction_identifier),
    created_at_utc TEXT NOT NULL
);

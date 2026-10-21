CREATE TABLE whisper_offer_batch (
    offer_batch_identifier TEXT PRIMARY KEY,
    generation_interaction_identifier TEXT NOT NULL REFERENCES ai_interaction (interaction_identifier),
    rules_version TEXT NOT NULL,
    created_at_utc TEXT NOT NULL
);

CREATE TABLE archive_case (
    archive_case_identifier TEXT PRIMARY KEY,
    opening_key TEXT NOT NULL UNIQUE,
    archive_number INTEGER NOT NULL UNIQUE CHECK (archive_number >= 1),
    whisper_identifier TEXT NOT NULL,
    offer_batch_identifier TEXT NOT NULL UNIQUE REFERENCES whisper_offer_batch (offer_batch_identifier),
    archive_title TEXT NOT NULL,
    sanction_label TEXT NOT NULL,
    lifecycle_status_name TEXT NOT NULL CHECK (lifecycle_status_name IN ('open', 'closed')),
    opening_public_payload_json TEXT NOT NULL,
    opened_at_utc TEXT NOT NULL,
    closed_at_utc TEXT,
    CHECK (length(opening_key) BETWEEN 8 AND 128),
    CHECK ((lifecycle_status_name = 'closed') = (closed_at_utc IS NOT NULL))
);

CREATE UNIQUE INDEX archive_case_single_open_case ON archive_case (lifecycle_status_name)
WHERE lifecycle_status_name = 'open';

CREATE TRIGGER archive_case_rejects_delete
BEFORE DELETE ON archive_case
BEGIN
    SELECT RAISE(ABORT, 'archive_case_is_never_deleted');
END;

CREATE TRIGGER archive_case_keeps_opening_fields
BEFORE UPDATE OF archive_case_identifier, opening_key, archive_number, whisper_identifier, offer_batch_identifier,
    opening_public_payload_json, opened_at_utc ON archive_case
BEGIN
    SELECT RAISE(ABORT, 'archive_case_opening_fields_are_immutable');
END;

CREATE TABLE offered_whisper (
    offer_batch_identifier TEXT NOT NULL REFERENCES whisper_offer_batch (offer_batch_identifier),
    whisper_identifier TEXT NOT NULL,
    ordinal_number INTEGER NOT NULL CHECK (ordinal_number >= 1),
    public_card_json TEXT NOT NULL,
    was_chosen INTEGER NOT NULL DEFAULT 0 CHECK (was_chosen IN (0, 1)),
    archive_case_identifier TEXT REFERENCES archive_case (archive_case_identifier),
    PRIMARY KEY (offer_batch_identifier, whisper_identifier),
    UNIQUE (offer_batch_identifier, ordinal_number)
);

CREATE INDEX offered_whisper_by_archive_case ON offered_whisper (archive_case_identifier);

CREATE TRIGGER offered_whisper_rejects_delete
BEFORE DELETE ON offered_whisper
BEGIN
    SELECT RAISE(ABORT, 'offered_whisper_is_never_deleted');
END;

CREATE TRIGGER offered_whisper_keeps_offer_fields
BEFORE UPDATE OF offer_batch_identifier, whisper_identifier, ordinal_number, public_card_json ON offered_whisper
BEGIN
    SELECT RAISE(ABORT, 'offered_whisper_offer_fields_are_immutable');
END;

CREATE TRIGGER offered_whisper_is_settled_once
BEFORE UPDATE OF was_chosen, archive_case_identifier ON offered_whisper
WHEN OLD.archive_case_identifier IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'offered_whisper_is_already_settled');
END;

CREATE TABLE case_specification (
    archive_case_identifier TEXT PRIMARY KEY REFERENCES archive_case (archive_case_identifier),
    specification_format_version INTEGER NOT NULL CHECK (specification_format_version >= 1),
    specification_json TEXT NOT NULL,
    specification_content_hash TEXT NOT NULL,
    generation_interaction_identifier TEXT NOT NULL REFERENCES ai_interaction (interaction_identifier),
    accepted_attempt_number INTEGER NOT NULL CHECK (accepted_attempt_number >= 1),
    provider_name TEXT NOT NULL,
    provider_mode_name TEXT NOT NULL CHECK (provider_mode_name IN ('synthetic', 'real')),
    model_identifier TEXT NOT NULL,
    rules_version TEXT NOT NULL,
    created_at_utc TEXT NOT NULL
);

CREATE TRIGGER case_specification_rejects_update
BEFORE UPDATE ON case_specification
BEGIN
    SELECT RAISE(ABORT, 'case_specification_is_immutable');
END;

CREATE TRIGGER case_specification_rejects_delete
BEFORE DELETE ON case_specification
BEGIN
    SELECT RAISE(ABORT, 'case_specification_is_immutable');
END;

CREATE TABLE archive_run (
    archive_run_identifier TEXT PRIMARY KEY,
    archive_case_identifier TEXT NOT NULL REFERENCES archive_case (archive_case_identifier),
    run_number INTEGER NOT NULL CHECK (run_number >= 1),
    lifecycle_status_name TEXT NOT NULL CHECK (lifecycle_status_name IN ('active', 'superseded', 'ended')),
    initial_run_json TEXT NOT NULL,
    current_run_json TEXT NOT NULL,
    state_version INTEGER NOT NULL CHECK (state_version >= 1),
    started_at_utc TEXT NOT NULL,
    updated_at_utc TEXT NOT NULL,
    UNIQUE (archive_case_identifier, run_number)
);

CREATE UNIQUE INDEX archive_run_single_active_run ON archive_run (archive_case_identifier)
WHERE lifecycle_status_name = 'active';

CREATE TRIGGER archive_run_rejects_delete
BEFORE DELETE ON archive_run
BEGIN
    SELECT RAISE(ABORT, 'archive_run_is_never_deleted');
END;

CREATE TRIGGER archive_run_keeps_initial_state
BEFORE UPDATE OF archive_run_identifier, archive_case_identifier, run_number, initial_run_json, started_at_utc ON archive_run
BEGIN
    SELECT RAISE(ABORT, 'archive_run_initial_state_is_immutable');
END;

CREATE TRIGGER archive_run_state_version_never_decreases
BEFORE UPDATE OF state_version ON archive_run
WHEN NEW.state_version < OLD.state_version
BEGIN
    SELECT RAISE(ABORT, 'archive_run_state_version_never_decreases');
END;

CREATE TABLE case_generation_attempt (
    sequence_number INTEGER PRIMARY KEY AUTOINCREMENT,
    opening_key TEXT NOT NULL,
    whisper_identifier TEXT NOT NULL,
    attempt_number INTEGER NOT NULL CHECK (attempt_number >= 1),
    interaction_identifier TEXT NOT NULL REFERENCES ai_interaction (interaction_identifier),
    outcome_name TEXT NOT NULL CHECK (outcome_name IN ('accepted', 'rejected')),
    validation_errors_json TEXT NOT NULL,
    created_at_utc TEXT NOT NULL,
    CHECK ((outcome_name = 'accepted') = (validation_errors_json = '[]'))
);

CREATE INDEX case_generation_attempt_by_opening_key ON case_generation_attempt (opening_key, attempt_number);

CREATE TRIGGER case_generation_attempt_rejects_update
BEFORE UPDATE ON case_generation_attempt
BEGIN
    SELECT RAISE(ABORT, 'case_generation_attempt_is_append_only');
END;

CREATE TRIGGER case_generation_attempt_rejects_delete
BEFORE DELETE ON case_generation_attempt
BEGIN
    SELECT RAISE(ABORT, 'case_generation_attempt_is_append_only');
END;

CREATE TABLE confirmed_turn (
    sequence_number INTEGER PRIMARY KEY AUTOINCREMENT,
    turn_identifier TEXT NOT NULL UNIQUE,
    action_key TEXT NOT NULL UNIQUE,
    archive_run_identifier TEXT NOT NULL REFERENCES archive_run (archive_run_identifier),
    turn_kind_name TEXT NOT NULL CHECK (
        turn_kind_name IN ('investigator_action', 'interactive_piece_attempt', 'interactive_piece_assistance')
    ),
    disposition_name TEXT NOT NULL CHECK (disposition_name IN ('resolved', 'question_asked', 'assistance_given')),
    state_version_before INTEGER NOT NULL CHECK (state_version_before >= 1),
    state_version_after INTEGER NOT NULL,
    request_content_hash TEXT NOT NULL,
    request_json TEXT NOT NULL,
    response_json TEXT NOT NULL,
    confirmed_at_utc TEXT NOT NULL,
    CHECK (length(action_key) BETWEEN 8 AND 128),
    CHECK (json_valid(request_json)),
    CHECK (json_valid(response_json)),
    CHECK (
        (disposition_name = 'resolved' AND state_version_after = state_version_before + 1)
        OR (disposition_name <> 'resolved' AND state_version_after = state_version_before)
    )
);

CREATE INDEX confirmed_turn_by_archive_run ON confirmed_turn (archive_run_identifier, sequence_number);

CREATE UNIQUE INDEX confirmed_turn_single_resolution_per_version ON confirmed_turn (archive_run_identifier, state_version_after)
WHERE disposition_name = 'resolved';

CREATE TRIGGER confirmed_turn_rejects_update
BEFORE UPDATE ON confirmed_turn
BEGIN
    SELECT RAISE(ABORT, 'confirmed_turn_is_append_only');
END;

CREATE TRIGGER confirmed_turn_rejects_delete
BEFORE DELETE ON confirmed_turn
BEGIN
    SELECT RAISE(ABORT, 'confirmed_turn_is_append_only');
END;

CREATE TABLE confirmed_effect (
    turn_identifier TEXT NOT NULL REFERENCES confirmed_turn (turn_identifier),
    ordinal_number INTEGER NOT NULL CHECK (ordinal_number >= 1),
    effect_kind_name TEXT NOT NULL,
    effect_json TEXT NOT NULL,
    PRIMARY KEY (turn_identifier, ordinal_number),
    CHECK (json_valid(effect_json))
);

CREATE TRIGGER confirmed_effect_rejects_update
BEFORE UPDATE ON confirmed_effect
BEGIN
    SELECT RAISE(ABORT, 'confirmed_effect_is_append_only');
END;

CREATE TRIGGER confirmed_effect_rejects_delete
BEFORE DELETE ON confirmed_effect
BEGIN
    SELECT RAISE(ABORT, 'confirmed_effect_is_append_only');
END;

CREATE TABLE relationship_change (
    relationship_change_identifier TEXT PRIMARY KEY,
    turn_identifier TEXT NOT NULL REFERENCES confirmed_turn (turn_identifier),
    archive_run_identifier TEXT NOT NULL REFERENCES archive_run (archive_run_identifier),
    ordinal_number INTEGER NOT NULL CHECK (ordinal_number >= 1),
    person_identifier TEXT NOT NULL,
    direction_name TEXT NOT NULL CHECK (direction_name IN ('from_investigator', 'toward_investigator_as_perceived')),
    dimension_name TEXT,
    level_change INTEGER NOT NULL,
    resulting_level INTEGER NOT NULL CHECK (resulting_level >= 0),
    change_json TEXT NOT NULL,
    UNIQUE (turn_identifier, ordinal_number),
    CHECK (json_valid(change_json))
);

CREATE INDEX relationship_change_by_person ON relationship_change (archive_run_identifier, person_identifier);

CREATE TRIGGER relationship_change_rejects_update
BEFORE UPDATE ON relationship_change
BEGIN
    SELECT RAISE(ABORT, 'relationship_change_is_append_only');
END;

CREATE TRIGGER relationship_change_rejects_delete
BEFORE DELETE ON relationship_change
BEGIN
    SELECT RAISE(ABORT, 'relationship_change_is_append_only');
END;

CREATE TABLE log_entry (
    log_entry_identifier TEXT PRIMARY KEY,
    archive_run_identifier TEXT NOT NULL REFERENCES archive_run (archive_run_identifier),
    turn_identifier TEXT NOT NULL REFERENCES confirmed_turn (turn_identifier),
    ordinal_number INTEGER NOT NULL CHECK (ordinal_number >= 1),
    voice_name TEXT NOT NULL,
    scene_identifier TEXT NOT NULL,
    world_clock_minutes INTEGER NOT NULL CHECK (world_clock_minutes >= 0),
    entry_json TEXT NOT NULL,
    UNIQUE (turn_identifier, ordinal_number),
    CHECK (json_valid(entry_json))
);

CREATE INDEX log_entry_by_archive_run ON log_entry (archive_run_identifier);

CREATE TRIGGER log_entry_rejects_update
BEFORE UPDATE ON log_entry
BEGIN
    SELECT RAISE(ABORT, 'log_entry_is_append_only');
END;

CREATE TRIGGER log_entry_rejects_delete
BEFORE DELETE ON log_entry
BEGIN
    SELECT RAISE(ABORT, 'log_entry_is_append_only');
END;

CREATE TABLE run_checkpoint (
    checkpoint_identifier TEXT PRIMARY KEY,
    parent_checkpoint_identifier TEXT REFERENCES run_checkpoint (checkpoint_identifier),
    archive_run_identifier TEXT NOT NULL REFERENCES archive_run (archive_run_identifier),
    turn_identifier TEXT NOT NULL UNIQUE REFERENCES confirmed_turn (turn_identifier),
    state_version INTEGER NOT NULL CHECK (state_version >= 1),
    checkpoint_reason_name TEXT NOT NULL CHECK (checkpoint_reason_name IN ('confirmed_turn', 'archive_closure')),
    public_state_json TEXT NOT NULL,
    director_private_state_json TEXT NOT NULL,
    public_state_content_hash TEXT NOT NULL,
    director_private_state_content_hash TEXT NOT NULL,
    created_at_utc TEXT NOT NULL,
    UNIQUE (archive_run_identifier, state_version),
    CHECK (json_valid(public_state_json)),
    CHECK (json_valid(director_private_state_json))
);

CREATE TRIGGER run_checkpoint_rejects_update
BEFORE UPDATE ON run_checkpoint
BEGIN
    SELECT RAISE(ABORT, 'run_checkpoint_is_append_only');
END;

CREATE TRIGGER run_checkpoint_rejects_delete
BEFORE DELETE ON run_checkpoint
BEGIN
    SELECT RAISE(ABORT, 'run_checkpoint_is_append_only');
END;

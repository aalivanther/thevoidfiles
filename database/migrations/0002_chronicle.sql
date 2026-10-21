CREATE TABLE chronicle_snapshot (
    snapshot_slot_number INTEGER PRIMARY KEY,
    state_version INTEGER NOT NULL,
    storage_format_version INTEGER NOT NULL,
    chronicle_state_json TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    first_saved_at_utc TEXT NOT NULL,
    last_saved_at_utc TEXT NOT NULL,
    CHECK (snapshot_slot_number = 1),
    CHECK (state_version >= 1),
    CHECK (storage_format_version >= 1),
    CHECK (json_valid(chronicle_state_json))
);

CREATE TABLE closed_chronicle (
    closure_identifier TEXT PRIMARY KEY,
    closure_record_json TEXT NOT NULL,
    first_saved_at_utc TEXT NOT NULL,
    last_saved_at_utc TEXT NOT NULL,
    CHECK (length(closure_identifier) BETWEEN 1 AND 128),
    CHECK (json_valid(closure_record_json))
);

CREATE INDEX closed_chronicle_by_first_saved_at_utc ON closed_chronicle (first_saved_at_utc);

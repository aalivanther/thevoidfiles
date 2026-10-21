CREATE TABLE director_simulation_run (
    simulation_run_identifier TEXT PRIMARY KEY,
    scripted_path_identifier TEXT NOT NULL,
    archive_case_identifier TEXT,
    outcome_name TEXT NOT NULL CHECK (outcome_name IN ('completed', 'failed')),
    report_json TEXT NOT NULL,
    started_at_utc TEXT NOT NULL,
    finished_at_utc TEXT NOT NULL
);

CREATE TRIGGER director_simulation_run_rejects_update
BEFORE UPDATE ON director_simulation_run
BEGIN
    SELECT RAISE(ABORT, 'director_simulation_run_is_append_only');
END;

CREATE TRIGGER director_simulation_run_rejects_delete
BEFORE DELETE ON director_simulation_run
BEGIN
    SELECT RAISE(ABORT, 'director_simulation_run_is_append_only');
END;

CREATE TABLE director_generation_attempt (
    sequence_number INTEGER PRIMARY KEY AUTOINCREMENT,
    interaction_identifier TEXT,
    simulation_run_identifier TEXT,
    archive_case_identifier TEXT,
    action_key TEXT,
    turn_identifier TEXT,
    purpose_name TEXT NOT NULL,
    attempt_number INTEGER NOT NULL CHECK (attempt_number >= 1),
    outcome_name TEXT NOT NULL CHECK (outcome_name IN ('accepted', 'rejected', 'provider_failed')),
    failure_name TEXT,
    validation_errors_json TEXT NOT NULL,
    created_at_utc TEXT NOT NULL
);

CREATE INDEX director_generation_attempt_by_interaction ON director_generation_attempt (interaction_identifier);

CREATE INDEX director_generation_attempt_by_archive_case ON director_generation_attempt (archive_case_identifier);

CREATE TRIGGER director_generation_attempt_rejects_update
BEFORE UPDATE ON director_generation_attempt
BEGIN
    SELECT RAISE(ABORT, 'director_generation_attempt_is_append_only');
END;

CREATE TRIGGER director_generation_attempt_rejects_delete
BEFORE DELETE ON director_generation_attempt
BEGIN
    SELECT RAISE(ABORT, 'director_generation_attempt_is_append_only');
END;

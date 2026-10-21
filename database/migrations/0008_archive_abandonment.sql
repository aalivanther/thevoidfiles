CREATE TABLE archive_case_abandonment (
    abandon_key TEXT PRIMARY KEY,
    archive_case_identifier TEXT UNIQUE REFERENCES archive_case (archive_case_identifier),
    archive_run_identifier TEXT REFERENCES archive_run (archive_run_identifier),
    state_version_at_abandonment INTEGER CHECK (state_version_at_abandonment >= 1),
    abandoned_at_utc TEXT NOT NULL,
    CHECK (length(abandon_key) BETWEEN 8 AND 128),
    CHECK ((archive_run_identifier IS NULL) = (state_version_at_abandonment IS NULL)),
    CHECK (archive_case_identifier IS NOT NULL OR archive_run_identifier IS NULL)
);

CREATE TRIGGER archive_case_abandonment_rejects_update
BEFORE UPDATE ON archive_case_abandonment
BEGIN
    SELECT RAISE(ABORT, 'archive_case_abandonment_is_append_only');
END;

CREATE TRIGGER archive_case_abandonment_rejects_delete
BEFORE DELETE ON archive_case_abandonment
BEGIN
    SELECT RAISE(ABORT, 'archive_case_abandonment_is_append_only');
END;

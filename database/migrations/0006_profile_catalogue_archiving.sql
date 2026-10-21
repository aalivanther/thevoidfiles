ALTER TABLE profile ADD COLUMN archived_at_utc TEXT;

CREATE INDEX profile_by_archived_at_utc ON profile (archived_at_utc, last_opened_at_utc);

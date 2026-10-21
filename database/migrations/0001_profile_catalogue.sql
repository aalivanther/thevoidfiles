CREATE TABLE profile (
    profile_identifier TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    data_folder_name TEXT NOT NULL UNIQUE,
    created_at_utc TEXT NOT NULL,
    last_opened_at_utc TEXT,
    CHECK (length(profile_identifier) BETWEEN 1 AND 64),
    CHECK (length(data_folder_name) BETWEEN 1 AND 64),
    CHECK (data_folder_name NOT LIKE '%/%' AND data_folder_name NOT LIKE '%.%')
);

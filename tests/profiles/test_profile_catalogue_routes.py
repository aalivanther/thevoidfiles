import sqlite3


def create_profile(service_client, display_name, profile_identifier=None):
    creation_body = {"display_name": display_name}
    if profile_identifier is not None:
        creation_body["profile_identifier"] = profile_identifier
    return service_client.post("/api/profiles", json=creation_body)


def test_catalogue_starts_empty(synthetic_mode_service_client):
    assert synthetic_mode_service_client.get("/api/profiles").json() == {"profiles": []}


def test_profile_is_created_with_an_identifier_derived_from_the_display_name(synthetic_mode_service_client):
    creation_response = create_profile(synthetic_mode_service_client, "  Campaña   de Ávila  ")
    created_profile = creation_response.json()
    assert creation_response.status_code == 201
    assert created_profile["profile_identifier"] == "campana_de_avila"
    assert created_profile["display_name"] == "Campaña de Ávila"
    assert created_profile["last_opened_at_utc"] is None
    assert created_profile["is_archived"] is False
    assert synthetic_mode_service_client.get("/api/profiles").json()["profiles"] == [created_profile]


def test_repeated_display_names_receive_distinct_identifiers(synthetic_mode_service_client):
    created_identifiers = [
        create_profile(synthetic_mode_service_client, "Noche").json()["profile_identifier"] for _ in range(3)
    ]
    assert created_identifiers == ["noche", "noche_2", "noche_3"]


def test_display_name_without_usable_characters_receives_the_fallback_identifier(synthetic_mode_service_client):
    assert create_profile(synthetic_mode_service_client, "¿¡!?").json()["profile_identifier"] == "profile"


def test_requested_identifier_is_respected_and_cannot_be_repeated(synthetic_mode_service_client):
    first_response = create_profile(synthetic_mode_service_client, "Primera", "first_profile")
    second_response = create_profile(synthetic_mode_service_client, "Segunda", "first_profile")
    assert first_response.json()["profile_identifier"] == "first_profile"
    assert second_response.status_code == 409
    assert second_response.json() == {"failure_name": "profile_already_registered"}


def test_malformed_creation_requests_are_rejected(synthetic_mode_service_client):
    blank_name_response = create_profile(synthetic_mode_service_client, "   ")
    long_name_response = create_profile(synthetic_mode_service_client, "n" * 81)
    malformed_identifier_response = create_profile(synthetic_mode_service_client, "Nombre", "../escape")
    unknown_field_response = synthetic_mode_service_client.post(
        "/api/profiles", json={"display_name": "Nombre", "unknown_field": True}
    )
    assert blank_name_response.json() == {"failure_name": "profile_display_name_malformed"}
    assert long_name_response.json() == {"failure_name": "profile_display_name_malformed"}
    assert malformed_identifier_response.json() == {"failure_name": "request_invalid"}
    assert unknown_field_response.json() == {"failure_name": "request_invalid"}
    assert synthetic_mode_service_client.get("/api/profiles").json() == {"profiles": []}


def test_profile_is_renamed(synthetic_mode_service_client):
    create_profile(synthetic_mode_service_client, "Primera", "first_profile")
    renaming_response = synthetic_mode_service_client.patch(
        "/api/profiles/first_profile", json={"display_name": "Nombre nuevo"}
    )
    assert renaming_response.status_code == 200
    assert renaming_response.json()["display_name"] == "Nombre nuevo"
    assert renaming_response.json()["profile_identifier"] == "first_profile"
    assert synthetic_mode_service_client.get("/api/profiles/first_profile").json()["display_name"] == "Nombre nuevo"


def test_renaming_failures_are_named(synthetic_mode_service_client):
    create_profile(synthetic_mode_service_client, "Primera", "first_profile")
    absent_response = synthetic_mode_service_client.patch("/api/profiles/absent_profile", json={"display_name": "X"})
    blank_response = synthetic_mode_service_client.patch("/api/profiles/first_profile", json={"display_name": " "})
    malformed_response = synthetic_mode_service_client.patch("/api/profiles/Not-Valid", json={"display_name": "X"})
    assert absent_response.status_code == 404
    assert absent_response.json() == {"failure_name": "profile_not_found"}
    assert blank_response.json() == {"failure_name": "profile_display_name_malformed"}
    assert malformed_response.json() == {"failure_name": "profile_identifier_malformed"}


def test_opening_a_profile_records_the_moment_and_prepares_its_folder(synthetic_mode_service_client, data_directory):
    create_profile(synthetic_mode_service_client, "Primera", "first_profile")
    create_profile(synthetic_mode_service_client, "Segunda", "second_profile")
    opening_response = synthetic_mode_service_client.post("/api/profiles/second_profile/open")
    listed_profiles = synthetic_mode_service_client.get("/api/profiles").json()["profiles"]
    assert opening_response.status_code == 200
    assert opening_response.json()["last_opened_at_utc"] is not None
    assert (data_directory / "profiles" / "second_profile" / "chronicle.sqlite3").is_file()
    assert {listed_profile["profile_identifier"] for listed_profile in listed_profiles} == {
        "first_profile",
        "second_profile",
    }
    assert synthetic_mode_service_client.post("/api/profiles/absent_profile/open").json() == {
        "failure_name": "profile_not_found"
    }


def test_removing_a_profile_archives_it_and_keeps_every_file(synthetic_mode_service_client, data_directory):
    create_profile(synthetic_mode_service_client, "Primera", "first_profile")
    synthetic_mode_service_client.post("/api/profiles/first_profile/open")
    profile_directory = data_directory / "profiles" / "first_profile"
    file_paths_before_removal = sorted(
        path for path in profile_directory.rglob("*") if not path.name.endswith(("-wal", "-shm"))
    )
    removal_response = synthetic_mode_service_client.delete("/api/profiles/first_profile")
    file_paths_after_removal = sorted(
        path for path in profile_directory.rglob("*") if not path.name.endswith(("-wal", "-shm"))
    )
    assert removal_response.status_code == 200
    assert removal_response.json()["is_archived"] is True
    assert removal_response.json()["were_files_kept_on_disk"] is True
    assert file_paths_before_removal == file_paths_after_removal
    assert (profile_directory / "chronicle.sqlite3").is_file()
    assert synthetic_mode_service_client.get("/api/profiles").json() == {"profiles": []}
    archived_profiles = synthetic_mode_service_client.get("/api/profiles?include_archived=true").json()["profiles"]
    assert [archived_profile["profile_identifier"] for archived_profile in archived_profiles] == ["first_profile"]
    connection = sqlite3.connect(data_directory / "profile_catalogue.sqlite3")
    try:
        assert connection.execute("SELECT COUNT(*) FROM profile").fetchone()[0] == 1
    finally:
        connection.close()


def test_archived_profile_cannot_be_used_until_restored(synthetic_mode_service_client):
    create_profile(synthetic_mode_service_client, "Primera", "first_profile")
    synthetic_mode_service_client.delete("/api/profiles/first_profile")
    not_found_answer = {"failure_name": "profile_not_found"}
    assert synthetic_mode_service_client.delete("/api/profiles/first_profile").json() == not_found_answer
    assert synthetic_mode_service_client.post("/api/profiles/first_profile/open").json() == not_found_answer
    assert (
        synthetic_mode_service_client.patch("/api/profiles/first_profile", json={"display_name": "X"}).json()
        == not_found_answer
    )
    assert synthetic_mode_service_client.get("/api/profiles/first_profile/chronicle-snapshot").json() == not_found_answer
    assert (
        synthetic_mode_service_client.post(
            "/speech",
            json={"text": "Texto", "voice_identifier": "syntheticNarrator01"},
            headers={"X-Profile-Identifier": "first_profile"},
        ).json()
        == not_found_answer
    )
    assert create_profile(synthetic_mode_service_client, "Otra", "first_profile").status_code == 409
    restoring_response = synthetic_mode_service_client.post("/api/profiles/first_profile/restore")
    assert restoring_response.json()["is_archived"] is False
    assert synthetic_mode_service_client.post("/api/profiles/first_profile/open").status_code == 200
    assert synthetic_mode_service_client.post("/api/profiles/absent_profile/restore").json() == not_found_answer

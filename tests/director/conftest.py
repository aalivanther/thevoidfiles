import sqlite3

import pytest

from case_start.conftest import open_service_client, profile_identifier

containment_path_identifier = "lighthouse_containment_ending"
death_path_identifier = "lighthouse_death_on_the_gallery"


def read_rows(database_path, query_text, query_parameters=()):
    connection = sqlite3.connect(str(database_path))
    connection.row_factory = sqlite3.Row
    try:
        return connection.execute(query_text, query_parameters).fetchall()
    finally:
        connection.close()


@pytest.fixture
def director_client(data_directory, access_key_vault):
    with open_service_client(data_directory, access_key_vault) as test_client:
        yield test_client


@pytest.fixture
def profile_directory(data_directory):
    return data_directory / "profiles" / profile_identifier


@pytest.fixture
def profile_database_path(profile_directory):
    return profile_directory / "chronicle.sqlite3"

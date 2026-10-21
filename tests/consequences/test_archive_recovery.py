from case_start.conftest import profile_headers


def test_recovery_preserves_a_closed_archive_and_its_committed_history(lighthouse_investigation):
    investigation = lighthouse_investigation
    client = investigation.test_client
    opening = client.get('/api/case-start/archives/current', headers=profile_headers).json()['current_archive']
    identifier = opening['archive']['archive_case_identifier']
    investigation.reach_the_containment_ending()
    recovery = client.get(f'/api/case-start/archives/{identifier}/recovery', headers=profile_headers)
    assert recovery.status_code == 200
    recovered = recovery.json()['current_archive']
    history = client.get(f'/api/consequences/turns?archive_case_identifier={identifier}', headers=profile_headers).json()
    assert recovered['archive']['lifecycle_status_name'] == 'closed'
    assert recovered['opening'] == opening['opening']
    assert recovered['archive_run']['state_version'] == investigation.state_version
    assert recovered['archive_run']['state_version'] == history['archive_run']['state_version']
    assert history['turns'][-1]['resolution']['confirmed_turn']['archive_outcome']['kind'] == 'archive_ended_alive'
    assert recovered['archive_run']['public_state']['archive_outcome']['kind'] == 'archive_ended_alive'


def test_unknown_archive_recovery_returns_no_archive(consequence_client):
    response = consequence_client.get('/api/case-start/archives/not_an_archive/recovery', headers=profile_headers)
    assert response.status_code == 200
    assert response.json() == {'current_archive': None}

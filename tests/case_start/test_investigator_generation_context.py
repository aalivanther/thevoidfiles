import json

from case_start.conftest import ScriptedNarrativeProvider, read_lighthouse_case_specification, open_service_client, profile_identifier, profile_headers
from the_void_files.narrative.investigator_context import build_investigator_generation_context


def test_only_known_investigator_fields_are_shared():
    context = build_investigator_generation_context({
        'investigatorRegistration': {'fullName': ' Ana ', 'originPlace': 'Guadalajara', 'residencePlace': 'Zapopan',
                                   'relationalAnchor': {'kind': 'person', 'personName': 'Eva', 'bondDescription': 'Hermana', 'secret': 'omit'}},
        'investigatorAttributes': {'o': 5, 'c': 4, 'if': True, 'im': -1, 'unexpected': 900},
        'oicnauStance': 'independent_ally',
        'aiConfiguration': {'access_key': 'must_not_leave'},
    })
    assert context['full_name'] == 'Ana'
    assert context['residence_place'] == 'Zapopan'
    assert context['investigator_attributes'] == {'o': 5, 'c': 4}
    assert 'secret' not in context['relational_anchor']
    assert 'must_not_leave' not in str(context)
    assert build_investigator_generation_context({}) == {}


def test_saved_profile_reaches_whisper_and_case_generation(data_directory, access_key_vault):
    provider = ScriptedNarrativeProvider([read_lighthouse_case_specification()])
    with open_service_client(data_directory, access_key_vault, provider) as client:
        state = {
            'storageFormatVersion': 5, 'investigatorProgression': {}, 'archiveRun': {'logEntries': []},
            'investigator': {}, 'narrationEntries': [], 'chronicleClosure': None,
            'investigatorRegistration': {'fullName': 'Ana', 'residencePlace': 'Zapopan', 'originPlace': 'Tonalá',
                                       'relationalAnchor': {'kind': 'uprooted'}},
            'investigatorAttributes': {'o': 5}, 'oicnauStance': 'independent_ally',
        }
        response = client.put(f'/api/profiles/{profile_identifier}/chronicle-snapshot', json={
            'expected_state_version': 0, 'storage_format_version': 5, 'chronicle_state': state,
        })
        assert response.status_code == 200
        offer = client.get('/api/case-start/whispers', headers=profile_headers).json()
        opening = client.post('/api/case-start/archives', headers=profile_headers, json={
            'opening_key': 'profile_context_opening', 'whisper_identifier': offer['offered_whispers'][0]['identifier'],
        })
        assert opening.status_code == 200
        current = client.get('/api/case-start/archives/current', headers=profile_headers).json()['current_archive']
        assert current['archive_run']['public_state']['investigator_profile']['residence_place'] == 'Zapopan'
    for request in provider.received_requests:
        context = next(block for block in request.context_blocks if block.authority_label_name == 'investigator_profile')
        assert json.loads(context.content_text)['residence_place'] == 'Zapopan'

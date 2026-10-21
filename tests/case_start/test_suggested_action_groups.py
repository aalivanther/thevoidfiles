import copy

from case_start.conftest import lighthouse_whisper_identifier, profile_headers, read_lighthouse_case_specification
from the_void_files.narrative.case_reviewer import review_case_specification_proposal

suggested_action_group_names = {"speak", "examine", "use_or_spend", "move", "withdraw"}


def read_every_action_branch(case_specification):
    return [
        action_branch
        for scene_definition in case_specification["scenes"]
        for action_branch in scene_definition["action_branches"]
    ] + [shared_action_branch["action_branch"] for shared_action_branch in case_specification["shared_action_branches"]]


def test_every_lighthouse_branch_declares_a_known_action_group():
    every_action_branch = read_every_action_branch(read_lighthouse_case_specification())
    assert every_action_branch
    assert all(action_branch["action_group_name"] in suggested_action_group_names for action_branch in every_action_branch)


def test_specification_without_action_groups_is_still_accepted():
    older_specification = copy.deepcopy(read_lighthouse_case_specification())
    for action_branch in read_every_action_branch(older_specification):
        del action_branch["action_group_name"]
    case_review = review_case_specification_proposal(older_specification, lighthouse_whisper_identifier)
    assert case_review.is_accepted


def test_unknown_action_group_is_rejected():
    changed_specification = copy.deepcopy(read_lighthouse_case_specification())
    changed_specification["scenes"][0]["action_branches"][0]["action_group_name"] = "dance"
    case_review = review_case_specification_proposal(changed_specification, lighthouse_whisper_identifier)
    assert not case_review.is_accepted


def test_opening_gives_every_suggested_action_its_group_and_no_previous_attempt(case_start_client):
    assert case_start_client.get("/api/case-start/whispers", headers=profile_headers).status_code == 200
    opening_answer = case_start_client.post(
        "/api/case-start/archives",
        headers=profile_headers,
        json={"opening_key": "opening_key_0001", "whisper_identifier": lighthouse_whisper_identifier},
    )
    assert opening_answer.status_code == 200
    suggested_actions = opening_answer.json()["opening_resolution"]["first_scene_presentation"]["suggested_actions"]
    group_name_by_identifier = {
        suggested_action["identifier"]: suggested_action["action_group_name"] for suggested_action in suggested_actions
    }
    assert group_name_by_identifier["speak_with_waiting_woman"] == "speak"
    assert group_name_by_identifier["count_flashes_from_boat"] == "examine"
    assert group_name_by_identifier["pay_boatman_to_wait"] == "use_or_spend"
    assert group_name_by_identifier["walk_to_tower_foot"] == "move"
    assert group_name_by_identifier["evacuate_renata_and_withdraw"] == "withdraw"
    assert all(suggested_action["has_been_attempted_before"] is False for suggested_action in suggested_actions)
    group_names_in_offer_order = ["speak", "examine", "use_or_spend", "move", "withdraw"]
    offered_group_ranks = [
        group_names_in_offer_order.index(suggested_action["action_group_name"]) for suggested_action in suggested_actions
    ]
    assert offered_group_ranks == sorted(offered_group_ranks)

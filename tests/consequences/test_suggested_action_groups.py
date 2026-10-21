suggested_action_group_names = {"speak", "examine", "use_or_spend", "move", "withdraw"}


def test_turn_gives_every_suggested_action_its_group_and_marks_repeated_attempts(lighthouse_investigation):
    lighthouse_investigation.take_suggested_action("walk_to_tower_foot")
    lighthouse_investigation.take_suggested_action("enter_main_door")
    returning_turn = lighthouse_investigation.take_suggested_action("leave_keeper_room")
    suggested_actions = returning_turn["next_scene_presentation"]["suggested_actions"]
    assert returning_turn["next_scene_presentation"]["scene_identifier"] == "tower_foot"
    assert all(
        suggested_action["action_group_name"] in suggested_action_group_names for suggested_action in suggested_actions
    )
    attempted_before_by_identifier = {
        suggested_action["identifier"]: suggested_action["has_been_attempted_before"]
        for suggested_action in suggested_actions
    }
    assert attempted_before_by_identifier["enter_main_door"] is True
    assert attempted_before_by_identifier["examine_watch_register"] is False
    assert attempted_before_by_identifier["evacuate_renata_and_withdraw"] is False
    stored_suggested_actions = lighthouse_investigation.read_current_public_state()["public_state"][
        "current_scene_presentation"
    ]["suggested_actions"]
    assert stored_suggested_actions == suggested_actions

def test_opening_and_a_walk_keep_only_the_places_actually_entered(lighthouse_investigation):
    opened_places = lighthouse_investigation.read_current_public_state()["public_state"]["visited_places"]
    assert len(opened_places) == 1
    assert "muelle" in opened_places[0]["place_name"].casefold()
    lighthouse_investigation.take_suggested_action("walk_to_tower_foot")
    visited_places = lighthouse_investigation.read_current_public_state()["public_state"]["visited_places"]
    place_names = [visited_place["place_name"].casefold() for visited_place in visited_places]
    assert any("muelle" in place_name for place_name in place_names)
    assert any("faro" in place_name for place_name in place_names)
    assert len(visited_places) == len({visited_place["scene_identifier"] for visited_place in visited_places})
    assert all(visited_place["place_name"].strip() for visited_place in visited_places)

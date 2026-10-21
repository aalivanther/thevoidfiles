from the_void_files.narrative.orchestration.closure_guard import (
    build_closure_register,
    build_truthful_closure_paragraph,
    guard_closing_paragraphs,
)

committed_facts = {
    "clock_label": "02:10",
    "other_place_tails": ["muelle viejo"],
    "serious_wound_count": 1,
    "wound_cause_text": "La puerta le golpeó la mano.",
    "condition_names": [],
}


def test_closing_text_cannot_deny_the_wound_the_place_or_a_solved_piece():
    truthful_paragraph = build_truthful_closure_paragraph(
        "Punta Ánimas · Pie del faro",
        1,
        "La puerta le golpeó la mano.",
        ["La sala de máquinas está abierta"],
    )
    guarded = guard_closing_paragraphs(
        [
            "Sale ileso y vuelve al muelle viejo.",
            "La sala de máquinas sigue cerrada.",
            "Firma el parte y deja la linterna sobre la mesa.",
        ],
        committed_facts,
        ["La sala de máquinas está abierta"],
        truthful_paragraph,
    )
    assert guarded == [
        truthful_paragraph,
        "Firma el parte y deja la linterna sobre la mesa.",
    ]
    assert "ileso" not in guarded[0].casefold()
    assert "muelle viejo" not in guarded[0].casefold()
    assert "sigue cerrada" not in " ".join(guarded).casefold()
    assert "La puerta le golpeó la mano." in guarded[0]
    assert "La sala de máquinas está abierta" in guarded[0]
    assert "Pie del faro" in guarded[0]


def test_the_closure_register_keeps_the_walked_places_and_the_solved_piece():
    register = build_closure_register(
        {"visited_places": [{"place_name": "Punta Ánimas · Muelle viejo"}]},
        "Punta Ánimas · Pie del faro",
        0,
        None,
        [{"visible_name": "La sala de máquinas está abierta", "fact_identifier": "machine_room_is_open"}],
    )
    assert register["place_name"] == "Punta Ánimas · Pie del faro"
    assert register["visited_place_names"] == [
        "Punta Ánimas · Muelle viejo",
        "Punta Ánimas · Pie del faro",
    ]
    assert register["serious_wound_count"] == 0
    assert register["wound_cause_text"] is None
    assert register["solved_piece_names"] == ["La sala de máquinas está abierta"]
    assert "machine_room_is_open" not in str(register["solved_piece_names"])

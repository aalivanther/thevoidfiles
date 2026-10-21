import json
from pathlib import Path

from the_void_files.application.use_cases.case_start_specification_models import CaseSpecification
from the_void_files.application.use_cases.consequence_free_text_reading import find_best_matching_intent
from the_void_files.narrative.case_reviewer import read_branches_of_scene


def read_lighthouse_specification() -> CaseSpecification:
    specification_path = (
        Path(__file__).resolve().parents[2]
        / "content"
        / "synthetic_cases"
        / "lighthouse_counts_one_more"
        / "case_specification.json"
    )
    return CaseSpecification.model_validate(json.loads(specification_path.read_text(encoding="utf-8")))


def matched_branch(scene_identifier: str, free_text: str) -> str | None:
    case_specification = read_lighthouse_specification()
    scene_definition = next(
        scene_definition
        for scene_definition in case_specification.scenes
        if scene_definition.scene_identifier == scene_identifier
    )
    intent_candidates = [
        (action_branch.branch_identifier, list(action_branch.free_text_intent_pattern_sources))
        for action_branch in read_branches_of_scene(case_specification, scene_definition)
    ]
    return find_best_matching_intent(free_text, intent_candidates)


def test_dawn_pier_free_text_keeps_a_negated_departure_from_signing_the_report():
    assert matched_branch("dawn_pier", "No me voy todavía") is None
    assert matched_branch("dawn_pier", "Me voy") == "sign_report_on_the_boat"
    assert matched_branch("dawn_pier", "No me voy, pero me voy") == "sign_report_on_the_boat"


def test_pier_arrival_free_text_selects_withdrawal_and_the_walk_to_the_tower():
    assert matched_branch("pier_arrival", "No me voy todavía") is None
    assert matched_branch("pier_arrival", "Me voy") == "evacuate_renata_and_withdraw"
    assert matched_branch("pier_arrival", "Fuerzo el marco con el hombro") is None
    assert matched_branch("pier_arrival", "Con esfuerzo empujo el marco") is None
    assert matched_branch("pier_arrival", "Camino hasta el pie del faro") == "walk_to_tower_foot"
    assert matched_branch("pier_arrival", "Voy caminando hasta el pie del faro") == "walk_to_tower_foot"


def test_inner_staircase_free_text_separates_counting_from_climbing_without_a_count():
    assert matched_branch("inner_staircase", "Subo sin contar") == "climb_without_counting"
    assert matched_branch("inner_staircase", "Subo y cuento") == "climb_inner_staircase"
    assert matched_branch("inner_staircase", "Cuento los peldaños") == "climb_inner_staircase"
    assert matched_branch("inner_staircase", "No cuento los peldaños") == "climb_without_counting"
    assert matched_branch("inner_staircase", "Subo contando sin mirar") == "climb_inner_staircase"


def test_tower_foot_free_text_selects_the_pier_the_hinge_and_the_lock():
    assert matched_branch("tower_foot", "Vuelvo al muelle") == "return_to_old_pier"
    assert matched_branch("tower_foot", "Fuerzo la bisagra") == "force_service_door_hinge"
    assert matched_branch("tower_foot", "Fuerzo el candado") == "inspect_service_door"
    assert matched_branch("tower_foot", "Rompo el candado") == "inspect_service_door"


def test_outer_gallery_free_text_selects_the_railing_and_not_the_iron_alone():
    assert matched_branch("outer_gallery", "Pruebo la barandilla") == "test_gallery_railing"
    assert matched_branch("outer_gallery", "Compruebo la barandilla") == "test_gallery_railing"
    assert matched_branch("outer_gallery", "Compruebo el hierro") is None


def test_keeper_room_free_text_reads_deducing_who_it_is():
    assert matched_branch("keeper_room", "Deduzco quien es") == "connect_the_three_counts"

from the_void_files.application.use_cases.consequence_director_copy import read_case_supplement, read_director_copy
from the_void_files.application.use_cases.consequence_free_text_reading import (
    FreeTextReader,
    find_best_matching_intent,
    fold_spanish_text,
    sanitize_quoted_player_text,
)


def build_free_text_reader() -> FreeTextReader:
    director_copy = read_director_copy()
    case_supplement = read_case_supplement("lighthouse_counts_one_more")
    return FreeTextReader(
        director_copy.free_text_patterns, list(director_copy.plan_conditions) + list(case_supplement.plan_conditions)
    )


def test_spanish_text_is_folded_keeping_its_length():
    assert fold_spanish_text("Peldaños Ánimas") == "peldanos animas"
    assert len(fold_spanish_text("¿Qué está pasando aquí?")) == len("¿Qué está pasando aquí?")


def test_numbered_suggestions_and_free_text_become_ordered_segments():
    plan_segments = build_free_text_reader().split_free_text_into_plan_segments(
        "Hago la 1 y la 3, luego examino la puerta si queda tiempo", 4
    )
    assert [(plan_segment.kind_name, plan_segment.suggestion_number) for plan_segment in plan_segments] == [
        ("suggestion_reference", 1),
        ("suggestion_reference", 3),
        ("free_text", None),
    ]
    assert plan_segments[2].action_text == "examino la puerta"
    assert plan_segments[2].condition_text == "si queda tiempo"


def test_measured_quantities_are_not_read_as_suggestion_numbers():
    plan_segments = build_free_text_reader().split_free_text_into_plan_segments("Espero 2 minutos junto al muelle", 4)
    assert [plan_segment.kind_name for plan_segment in plan_segments] == ["free_text"]


def test_plan_conditions_are_classified_with_negation():
    free_text_reader = build_free_text_reader()
    waiting_condition = free_text_reader.classify_plan_condition("si el lanchero no espera")
    danger_condition = free_text_reader.classify_plan_condition("si hay peligro")
    assert waiting_condition.condition_definition.kind_name == "boatman_waits"
    assert waiting_condition.is_negated is True
    assert danger_condition.condition_definition.kind_name == "scene_is_not_dangerous"
    assert danger_condition.is_negated is True
    assert free_text_reader.classify_plan_condition("si llueve").condition_definition is None


def test_action_reading_recognizes_missing_method_impossible_objects_and_preparation():
    free_text_reader = build_free_text_reader()
    assert free_text_reader.is_action_text_without_method("Lo ataco ya!") is True
    assert free_text_reader.is_action_text_without_method("Ataco la cerradura con la palanca") is False
    assert free_text_reader.find_mention_of_object_never_carried("Desenfundo el revólver") == "revolver"
    assert free_text_reader.is_preparation_text("Reviso mi equipo con calma") is True


def test_best_matching_intent_prefers_the_candidate_with_more_matched_patterns():
    assert (
        find_best_matching_intent(
            "Examino el candado de la puerta de servicio",
            [("first_branch", ["candado"]), ("second_branch", ["candado", "puerta de servicio"])],
        )
        == "second_branch"
    )
    assert find_best_matching_intent("Silbo una canción", [("first_branch", ["candado"])]) is None


def test_quoted_player_text_loses_markup_characters_and_is_shortened():
    assert sanitize_quoted_player_text("  abro   [[temblor:la]] {{nombre}}  ") == "abro temblor:la nombre"
    assert len(sanitize_quoted_player_text("a" * 300)) == 118

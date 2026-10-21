import json

from the_void_files.application.use_cases.consequence_case_state import (
    fill_investigator_placeholder_marks,
    fold_comparable_person_name,
)
from the_void_files.application.use_cases.consequence_turn_resolution import is_unusable_plan_step_text
from the_void_files.narrative.narration_guard import salvage_player_facing_narration
from the_void_files.narrative.tool_registry import NarrationDraft
from the_void_files.narrative.context_builder import (
    build_canonical_character_state_block,
    build_live_placeholder_texts,
    format_world_clock_label,
    DirectorTurnContext,
    build_investigation_record,
    build_narrative_memory_block,
    compact_log_entry,
    wrap_log_entry_for_director_context,
)


def test_compact_log_entry_keeps_investigator_steps_receipts_and_pulses():
    compacted_investigator_entry = compact_log_entry(
        wrap_log_entry_for_director_context(
            "escena_despacho_archivo",
            1140,
            {
                "voice": "investigator_entry",
                "attempted_steps": [
                    {
                        "action_text": "Preguntar a Julián Solares sobre sus gestiones recientes.",
                        "composition_origin_name": "suggested_action",
                        "origin_identifier": "branch_interrogar_solares",
                    }
                ],
            },
        )
    )
    assert compacted_investigator_entry["voice"] == "investigator_entry"
    assert compacted_investigator_entry["scene_identifier"] == "escena_despacho_archivo"
    assert compacted_investigator_entry["world_clock_minutes"] == 1140
    assert compacted_investigator_entry["attempted_steps"][0]["action_text"].startswith("Preguntar")
    assert compacted_investigator_entry["attempted_steps"][0]["origin_identifier"] == "branch_interrogar_solares"

    compacted_receipt = compact_log_entry(
        {
            "voice": "consequence_receipt",
            "confirmed_effects": [{"kind": "world_clock_advanced", "elapsed_minutes": 15}],
        }
    )
    assert compacted_receipt["confirmed_effects"][0]["kind"] == "world_clock_advanced"

    compacted_pulse = compact_log_entry(
        {
            "voice": "relationship_pulse",
            "relationship_pulse": {
                "person_visible_name": "El indocumentado",
                "perceptible_cause_text": "Demostró disposición para esclarecer su situación.",
                "resulting_level": 3,
            },
        }
    )
    assert compacted_pulse["person_visible_name"] == "El indocumentado"
    assert "perceptible_cause_text" in compacted_pulse


def test_investigation_record_keeps_actions_dropped_by_the_recent_window():
    recent_log_entries = [
        wrap_log_entry_for_director_context(
            "escena_despacho_archivo",
            1125,
            {
                "voice": "investigator_entry",
                "attempted_steps": [
                    {
                        "action_text": "Preguntar a Julián Solares sobre sus gestiones recientes.",
                        "composition_origin_name": "suggested_action",
                    }
                ],
            },
        )
    ]
    recent_log_entries.extend(
        {"voice": "director_narration", "marked_paragraphs": [f"Párrafo {entry_index}"]}
        for entry_index in range(30)
    )
    turn_context = DirectorTurnContext(
        profile_identifier="main_chronicle",
        archive_case_identifier="archive_case",
        archive_run_identifier="archive_run",
        action_key="action_key",
        state_version=4,
        rules_version="1",
        case_specification={"archive_title": "El Legajo Borrado", "persons": [], "scenes": []},
        current_run={
            "public_state": {
                "lived_experience_flag_names": ["testimonio_solares_obtenido"],
                "known_person_identifiers": [],
                "visited_scene_identifiers": ["escena_despacho_archivo"],
                "witnessed_origins": [{"origin_identifier": "branch_interrogar_solares"}],
                "world_clock_minutes": 1165,
                "place_name": "Despacho de recepción del Archivo Histórico",
                "confirmed_turn_count": 3,
            }
        },
        recent_log_entries=recent_log_entries,
    )
    investigation_record = build_investigation_record(turn_context)
    assert investigation_record["attempted_actions"][0]["action_text"].startswith("Preguntar a Julián")
    assert "branch_interrogar_solares" in investigation_record["witnessed_origin_identifiers"]
    narrative_memory = json.loads(build_narrative_memory_block(turn_context).content_text)
    assert narrative_memory["investigation_record"]["attempted_actions"][0]["action_text"].startswith("Preguntar")
    assert all(log_entry.get("voice") != "investigator_entry" for log_entry in narrative_memory["recent_log_entries"])


def test_fold_comparable_person_name_ignores_accents():
    assert "julian solares" in fold_comparable_person_name("Preguntar a Julián Solares sobre sus gestiones")
    assert fold_comparable_person_name("Julián Solares") in fold_comparable_person_name(
        "Julián Solares aguarda junto al mostrador"
    )


def test_salvage_replaces_unearned_true_name_without_rejecting_the_draft():
    narration_draft = NarrationDraft(
        marked_paragraphs=["Julián Solares espera junto al mostrador con la carpeta en las manos."]
    )
    case_specification = {
        "persons": [
            {
                "person_identifier": "julian_solares",
                "known_name": "Julián Solares",
                "alias_before_name_is_known": "El indocumentado",
            }
        ]
    }
    validation_errors = salvage_player_facing_narration(
        narration_draft,
        ["El indocumentado espera junto al mostrador con la carpeta en las manos."],
        ["Julián Solares"],
        [],
        case_specification,
        [],
    )
    assert validation_errors == []
    assert "Julián" not in narration_draft.marked_paragraphs[0]
    assert "El indocumentado" in narration_draft.marked_paragraphs[0]


def test_digit_and_tiny_plan_steps_are_unusable():
    assert is_unusable_plan_step_text("8") is True
    assert is_unusable_plan_step_text("12") is True
    assert is_unusable_plan_step_text("ok") is True
    assert is_unusable_plan_step_text("Preguntar a Julián Solares") is False


def test_live_placeholders_fill_place_and_clock_from_state():
    assert format_world_clock_label(1165) == "19:25"
    filled_text = fill_investigator_placeholder_marks(
        "{{nombre}} llega a {{lugar}} a las {{hora}}.",
        build_live_placeholder_texts(
            {"place_name": "Despacho de recepción del Archivo Histórico", "world_clock_minutes": 1165},
            {"nombre": "Akyrion"},
        ),
    )
    assert filled_text == "Akyrion llega a Despacho de recepción del Archivo Histórico a las 19:25."


def test_canonical_state_identifies_held_kit_and_open_actions():
    turn_context = DirectorTurnContext(
        profile_identifier="main_chronicle",
        archive_case_identifier="archive_case",
        archive_run_identifier="archive_run",
        action_key="action_key",
        state_version=4,
        rules_version="1",
        case_specification={
            "belongings": [
                {
                    "identifier": "hand_lantern",
                    "visible_name": "Linterna de mano",
                    "visible_unit_description": "unidad",
                }
            ],
            "persons": [{"person_identifier": "julian_solares", "known_name": "Julián Solares"}],
            "scenes": [],
        },
        current_run={
            "public_state": {
                "place_name": "Despacho de recepción del Archivo Histórico",
                "world_clock_minutes": 1165,
                "belonging_units": [{"belonging_identifier": "hand_lantern", "units": 1}],
                "operational_funds": 1800,
                "serious_wound_count": 0,
                "known_person_identifiers": ["julian_solares"],
                "lived_experience_flag_names": ["expediente_examinado"],
                "current_scene_presentation": {
                    "scene_identifier": "escena_despacho_archivo",
                    "place_name": "Despacho de recepción del Archivo Histórico",
                    "suggested_actions": [
                        {
                            "identifier": "branch_descender_deposito",
                            "visible_text": "Descender al depósito",
                            "has_been_attempted_before": False,
                        }
                    ],
                },
            }
        },
        recent_log_entries=[],
    )
    canonical_state = json.loads(build_canonical_character_state_block(turn_context).content_text)
    assert canonical_state["clock_label"] == "19:25"
    assert canonical_state["held_kit"][0]["visible_name"] == "Linterna de mano"
    assert canonical_state["closed_kit_identifiers"] == ["hand_lantern"]
    assert canonical_state["known_persons"][0]["visible_name"] == "Julián Solares"
    assert canonical_state["open_actions"][0]["identifier"] == "branch_descender_deposito"

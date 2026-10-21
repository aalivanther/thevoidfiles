from case_start.conftest import lighthouse_whisper_identifier, read_lighthouse_case_specification
from the_void_files.narrative.case_reviewer import review_case_specification_proposal

looked_at_object_capability_text = "La cuenta incompleta se mete en el objeto que se mira de cerca."
anomaly_branch_identifiers = (
    "bag_blue_pen_evidence",
    "examine_warm_boot",
    "photograph_the_optic",
)


def default_outcome_for(specification, branch_identifier):
    for scene in specification["scenes"]:
        for action_branch in scene["action_branches"]:
            if action_branch["branch_identifier"] == branch_identifier:
                return action_branch["default_outcome"]
    raise AssertionError(branch_identifier)


def test_anomaly_outcomes_name_the_listed_capability():
    specification = read_lighthouse_case_specification()
    assert looked_at_object_capability_text in specification["private_truth"]["threat"]["capability_texts"]
    for branch_identifier in anomaly_branch_identifiers:
        default_outcome = default_outcome_for(specification, branch_identifier)
        assert default_outcome["threat_capability_text"] == looked_at_object_capability_text
        assert any(staging_event["kind"] == "anomaly_manifested" for staging_event in default_outcome["staging_events"])


def test_the_lighthouse_with_the_named_anomaly_still_passes_review():
    case_review = review_case_specification_proposal(read_lighthouse_case_specification(), lighthouse_whisper_identifier)
    assert case_review.is_accepted
    assert case_review.validation_errors == []

from dataclasses import dataclass
from typing import Any, Protocol

empty_archive_run_state: dict[str, Any] = {
    "archiveTitle": None,
    "archiveNumberLabel": None,
    "stateVersion": 0,
    "lastConfirmedActionKey": None,
    "logEntries": [],
    "createdLogEntryCount": 0,
    "currentScenePresentation": None,
    "visitedSceneIdentifiers": [],
    "witnessedOrigins": [],
    "livedExperienceFlagNames": [],
    "relationshipChanges": [],
    "relationshipPulses": [],
    "activeConditions": [],
    "interactivePiecePublicDefinitions": {},
    "interactivePieceRuntimeStates": {},
    "pendingActionPlan": None,
    "unansweredDirectorQuestionEntryIdentifier": None,
    "journalUpdateCount": 0,
    "knownPersonIdentifiers": [],
    "archiveOutcome": None,
}

initial_investigator_belonging_units = {
    "signal_flare": 2,
    "hand_lantern": 1,
    "sealed_evidence_bag": 4,
}


@dataclass(frozen=True)
class CaseMaterialResetReceipt:
    cleared_archive_case_count: int
    cleared_whisper_offer_batch_count: int
    was_chronicle_snapshot_stripped: bool
    kept_investigator_full_name: str | None
    snapshot_state_version: int | None


class CaseMaterialResetStore(Protocol):
    def reset_case_material_keeping_investigator_identity(self) -> CaseMaterialResetReceipt: ...


def build_chronicle_state_without_open_archive(chronicle_state: dict[str, Any]) -> dict[str, Any]:
    investigator = chronicle_state.get("investigator")
    investigator_mapping = investigator if isinstance(investigator, dict) else {}
    progression = chronicle_state.get("investigatorProgression")
    progression_mapping = dict(progression) if isinstance(progression, dict) else {}
    progression_mapping["investigatedWhisperIdentifiers"] = []
    serious_wounds_suffered = investigator_mapping.get("seriousWoundsSuffered", 0)
    return {
        **chronicle_state,
        "chosenWhisperIdentifier": None,
        "confirmedTurnCount": 0,
        "archiveRun": dict(empty_archive_run_state),
        "chronicleClosure": None,
        "narrationEntries": [],
        "haveImprovementsBeenConfirmed": False,
        "investigatorProgression": progression_mapping,
        "investigator": {
            "investigatorName": "Quien investiga",
            "level": 1,
            "seriousWoundsSuffered": serious_wounds_suffered if isinstance(serious_wounds_suffered, int) else 0,
            "operationalFunds": 1800,
            "personalFunds": 420,
            "belongingUnits": dict(initial_investigator_belonging_units),
            "placeName": "Punta Ánimas · Muelle viejo",
            "worldClockMinutes": 192,
        },
    }


def build_public_case_material_reset(case_material_reset_receipt: CaseMaterialResetReceipt) -> dict[str, Any]:
    return {
        "cleared_archive_case_count": case_material_reset_receipt.cleared_archive_case_count,
        "cleared_whisper_offer_batch_count": case_material_reset_receipt.cleared_whisper_offer_batch_count,
        "was_chronicle_snapshot_stripped": case_material_reset_receipt.was_chronicle_snapshot_stripped,
        "kept_investigator_full_name": case_material_reset_receipt.kept_investigator_full_name,
        "snapshot_state_version": case_material_reset_receipt.snapshot_state_version,
    }


def reset_case_material_keeping_investigator_identity(
    case_material_reset_store: CaseMaterialResetStore,
) -> dict[str, Any]:
    return build_public_case_material_reset(
        case_material_reset_store.reset_case_material_keeping_investigator_identity()
    )

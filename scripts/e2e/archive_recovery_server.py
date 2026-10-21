"""Serve disposable synthetic data for archive_recovery_validation.mjs."""

import json
import sys
from pathlib import Path
from tempfile import TemporaryDirectory

root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(root / "src"))

import uvicorn

from the_void_files.application_factory import create_application
from the_void_files.infrastructure.ai.synthetic_narrative_provider import SyntheticNarrativeProvider
from the_void_files.infrastructure.secrets.in_memory_access_key_vault import InMemoryAccessKeyVault
from the_void_files.service_settings import ServiceSettings, build_default_service_settings


def main():
    with TemporaryDirectory(prefix="void-recovery-e2e-") as temporary_directory:
        directory = Path(temporary_directory)
        fixtures = directory / "fixtures"
        (fixtures / "station_audit").mkdir(parents=True)
        source = root / "content" / "synthetic_cases"
        offers = json.loads((source / "whisper_offers.json").read_text())
        card = offers["offered_whispers"][0]
        card.update(identifier="station_audit", headline="La estación bajo la lluvia")
        offers["offered_whispers"] = [card]
        (fixtures / "whisper_offers.json").write_text(json.dumps(offers))
        specification = json.loads((source / "lighthouse_counts_one_more" / "case_specification.json").read_text())
        specification.update(whisper_identifier="station_audit", archive_title=card["headline"])
        (fixtures / "station_audit" / "case_specification.json").write_text(json.dumps(specification))
        ServiceSettings.allowed_browser_origins = property(lambda self: ["http://127.0.0.1:8876"])
        application = create_application(
            narrative_provider=SyntheticNarrativeProvider(fixtures_directory=fixtures),
            service_settings=build_default_service_settings(provider_mode_name="synthetic", data_directory=directory / "data"),
            access_key_vault=InMemoryAccessKeyVault(),
        )
        uvicorn.run(application, host="127.0.0.1", port=8876)


if __name__ == "__main__":
    main()

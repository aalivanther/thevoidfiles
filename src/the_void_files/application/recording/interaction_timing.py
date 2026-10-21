import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone


def read_current_utc_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def create_interaction_identifier() -> str:
    return uuid.uuid4().hex


@dataclass
class StartedInteractionTiming:
    interaction_identifier: str
    started_at_utc: str
    started_monotonic_seconds: float

    def read_elapsed_milliseconds(self) -> int:
        return max(0, round((time.monotonic() - self.started_monotonic_seconds) * 1000))


def start_interaction_timing() -> StartedInteractionTiming:
    return StartedInteractionTiming(
        interaction_identifier=create_interaction_identifier(),
        started_at_utc=read_current_utc_timestamp(),
        started_monotonic_seconds=time.monotonic(),
    )

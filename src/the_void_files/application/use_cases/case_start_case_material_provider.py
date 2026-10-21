from the_void_files.application.recording.recording_narrative_provider import RecordingNarrativeProvider
from the_void_files.service_dependencies import ServiceDependencies


def is_curated_case_material_in_force(service_dependencies: ServiceDependencies) -> bool:
    return (
        service_dependencies.service_settings.case_material_source_name == "curated"
        and service_dependencies.narrative_provider.provider_mode_name == "real"
    )


def choose_recorded_case_material_provider(service_dependencies: ServiceDependencies) -> RecordingNarrativeProvider:
    if is_curated_case_material_in_force(service_dependencies):
        return service_dependencies.curated_case_material_provider
    return service_dependencies.narrative_provider

from fastapi import APIRouter, Depends

from the_void_files.interfaces.http.request_context import read_service_dependencies
from the_void_files.service_dependencies import ServiceDependencies

health_router = APIRouter(prefix="/api")


@health_router.get("/health")
async def report_service_health(service_dependencies: ServiceDependencies = Depends(read_service_dependencies)):
    service_settings = service_dependencies.service_settings
    return {
        "is_service_running": True,
        "provider_mode_name": service_settings.provider_mode_name,
        "narrative_provider_name": service_dependencies.narrative_provider.provider_name,
        "speech_provider_name": service_dependencies.speech_provider.provider_name,
        "case_material_source_name": service_settings.case_material_source_name,
        "turn_adjudication_switch_name": service_settings.turn_adjudication_switch_name,
        "is_frontend_distribution_served": service_settings.frontend_distribution_directory.is_dir(),
    }

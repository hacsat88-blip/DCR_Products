from fastapi import APIRouter
from server.models import RiskSettings
from server.engine.risk_guard import RiskGuard


def make_settings_router(guard: RiskGuard) -> APIRouter:
    r = APIRouter()

    @r.get("/api/settings", response_model=RiskSettings)
    async def get_settings():
        return guard.settings

    @r.put("/api/settings", response_model=RiskSettings)
    async def update_settings(settings: RiskSettings):
        guard.update_settings(settings)
        return guard.settings

    return r

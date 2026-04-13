from datetime import datetime

from fastapi import APIRouter

from server.engine.paper_ops import PaperOpsState
from server.models import PaperOpsHealth


def make_health_router(state: PaperOpsState) -> APIRouter:
    router = APIRouter()

    @router.get("/api/health", response_model=PaperOpsHealth)
    async def get_health() -> PaperOpsHealth:
        return state.snapshot(datetime.now())

    return router
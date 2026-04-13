import asyncio
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from server.models import RiskSettings
from server.engine.gemini_trader import GeminiTrader
from server.engine.jquants_reference import JQuantsReferenceService
from server.engine.paper_ops import PaperOpsState
from server.engine.risk_guard import RiskGuard
from server.engine.position import PositionManager
from server.routes.health import make_health_router
from server.routes.price_feed import make_price_router
from server.routes.settings import make_settings_router
from server.routes.ws import make_ws_router

_pos_mgr = PositionManager()
_guard = RiskGuard(settings=RiskSettings(), start_time=datetime.now())
_gemini_ai = GeminiTrader()
_reference_service = JQuantsReferenceService()
_paper_ops_state = PaperOpsState(
    ai_ready=_gemini_ai.is_configured(),
    reference_ready=_reference_service.is_configured(),
)
_ws_router, _broadcast = make_ws_router(_pos_mgr, _guard)


def _schedule_reference_publish(code: str, feed_source: str) -> None:
    async def _publish() -> None:
        await _reference_service.publish_reference(code, feed_source, _broadcast)
        _paper_ops_state.set_reference_ready(_reference_service.runtime_ready())

    asyncio.create_task(_publish())


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="AutoTrader Bridge", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    make_price_router(
        _gemini_ai,
        _guard,
        _pos_mgr,
        _broadcast,
        get_reference_snapshot=_reference_service.peek_snapshot,
        schedule_reference_publish=_schedule_reference_publish,
        paper_ops_state=_paper_ops_state,
        reference_ready_provider=_reference_service.runtime_ready,
    )
)
app.include_router(make_health_router(_paper_ops_state))
app.include_router(make_settings_router(_guard))
app.include_router(_ws_router)

from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from server.models import RiskSettings
from server.engine.ai_trader import AITrader
from server.engine.risk_guard import RiskGuard
from server.engine.position import PositionManager
from server.routes.price_feed import make_price_router
from server.routes.settings import make_settings_router
from server.routes.ws import make_ws_router

_pos_mgr = PositionManager()
_guard = RiskGuard(settings=RiskSettings(), start_time=datetime.now())
_ai = AITrader()
_ws_router, _broadcast = make_ws_router(_pos_mgr, _guard)


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

app.include_router(make_price_router(_ai, _guard, _pos_mgr, _broadcast))
app.include_router(make_settings_router(_guard))
app.include_router(_ws_router)

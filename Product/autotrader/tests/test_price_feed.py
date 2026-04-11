import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from fastapi import FastAPI
from server.models import RiskSettings, TradeDecision
from server.engine.position import PositionManager
from server.engine.risk_guard import RiskGuard
from server.routes.price_feed import make_price_router

PRICE_PAYLOAD = {
    "code": "7203",
    "price": 2500.0,
    "volume": 10000,
    "ohlc": [{"o": 2490, "h": 2510, "l": 2485, "c": 2500, "v": 1000}],
    "timestamp": "2026-04-12T10:00:00",
}


@pytest.fixture
def setup(tmp_path, monkeypatch):
    monkeypatch.setattr("server.engine.position.STATE_FILE", tmp_path / "state.json")
    pos_mgr = PositionManager()
    guard = RiskGuard(
        settings=RiskSettings(),
        start_time=datetime.now() - timedelta(seconds=60),
    )
    broadcast = AsyncMock()
    return pos_mgr, guard, broadcast


@patch("server.routes.price_feed.AITrader")
def test_price_feed_returns_hold_by_default(mock_ai_cls, setup):
    pos_mgr, guard, broadcast = setup
    mock_ai = MagicMock()
    mock_ai_cls.return_value = mock_ai
    mock_ai.decide_safe.return_value = TradeDecision(action="hold", qty=0, reason="様子見")

    app = FastAPI()
    app.include_router(make_price_router(mock_ai, guard, pos_mgr, broadcast))
    tc = TestClient(app)

    res = tc.post("/api/price", json=PRICE_PAYLOAD)
    assert res.status_code == 200
    assert res.json()["action"] == "hold"


@patch("server.routes.price_feed.AITrader")
def test_price_feed_buy_updates_position(mock_ai_cls, setup):
    pos_mgr, guard, broadcast = setup
    mock_ai = MagicMock()
    mock_ai_cls.return_value = mock_ai
    mock_ai.decide_safe.return_value = TradeDecision(action="buy", qty=10, reason="強い")

    app = FastAPI()
    app.include_router(make_price_router(mock_ai, guard, pos_mgr, broadcast))
    tc = TestClient(app)

    # 10株 × 2500円 = 25,000 < limit 100,000 → allow
    res = tc.post("/api/price", json=PRICE_PAYLOAD)
    assert res.status_code == 200
    assert res.json()["action"] == "buy"
    assert pos_mgr.position.qty == 10


@patch("server.routes.price_feed.AITrader")
def test_price_feed_risk_guard_blocks_excessive_buy(mock_ai_cls, setup):
    pos_mgr, guard, broadcast = setup
    mock_ai = MagicMock()
    mock_ai_cls.return_value = mock_ai
    # 2500円 × 100株 = 250,000 > limit 100,000 → qty adjusted to 40 or hold
    mock_ai.decide_safe.return_value = TradeDecision(action="buy", qty=100, reason="過剰")

    app = FastAPI()
    app.include_router(make_price_router(mock_ai, guard, pos_mgr, broadcast))
    tc = TestClient(app)

    res = tc.post("/api/price", json=PRICE_PAYLOAD)
    assert res.status_code == 200
    data = res.json()
    # qty が上限金額内に縮小されるか hold になる
    assert data["action"] in ("buy", "hold")
    if data["action"] == "buy":
        assert data["qty"] * PRICE_PAYLOAD["price"] <= guard.settings.limit_per_order

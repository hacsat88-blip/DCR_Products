import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock
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


def _make_app(gemini_ai, claude_ai, guard, pos_mgr, broadcast):
    app = FastAPI()
    app.include_router(make_price_router(gemini_ai, claude_ai, guard, pos_mgr, broadcast))
    return TestClient(app)


# --- gemini モード（デフォルト） ---

def test_price_feed_returns_hold_by_default(setup):
    pos_mgr, guard, broadcast = setup
    mock_gemini = MagicMock()
    mock_gemini.decide_safe.return_value = TradeDecision(action="hold", qty=0, reason="様子見")
    mock_claude = MagicMock()

    tc = _make_app(mock_gemini, mock_claude, guard, pos_mgr, broadcast)
    res = tc.post("/api/price", json=PRICE_PAYLOAD)
    broadcast.assert_called_once()
    assert res.status_code == 200
    assert res.json()["action"] == "hold"
    mock_claude.decide_safe.assert_not_called()  # gemini モードは Claude を呼ばない


def test_price_feed_buy_updates_position(setup):
    pos_mgr, guard, broadcast = setup
    mock_gemini = MagicMock()
    mock_gemini.decide_safe.return_value = TradeDecision(action="buy", qty=10, reason="強い")
    mock_claude = MagicMock()

    tc = _make_app(mock_gemini, mock_claude, guard, pos_mgr, broadcast)
    # 10株 × 2500円 = 25,000 < limit 100,000 → allow
    res = tc.post("/api/price", json=PRICE_PAYLOAD)
    broadcast.assert_called_once()
    assert res.status_code == 200
    assert res.json()["action"] == "buy"
    assert pos_mgr.position.qty == 10


def test_price_feed_risk_guard_blocks_excessive_buy(setup):
    pos_mgr, guard, broadcast = setup
    mock_gemini = MagicMock()
    # 2500円 × 100株 = 250,000 > limit 100,000 → qty が 40 に縮小
    mock_gemini.decide_safe.return_value = TradeDecision(action="buy", qty=100, reason="過剰")
    mock_claude = MagicMock()

    tc = _make_app(mock_gemini, mock_claude, guard, pos_mgr, broadcast)
    res = tc.post("/api/price", json=PRICE_PAYLOAD)
    broadcast.assert_called_once()
    assert res.status_code == 200
    data = res.json()
    assert data["action"] in ("buy", "hold")
    if data["action"] == "buy":
        assert data["qty"] * PRICE_PAYLOAD["price"] <= guard.settings.limit_per_order


# --- hybrid モード（コンセンサス） ---

def test_price_feed_hybrid_both_agree_executes(setup):
    pos_mgr, guard, broadcast = setup
    guard.update_settings(RiskSettings(ai_mode="hybrid"))
    mock_gemini = MagicMock()
    mock_gemini.decide_safe.return_value = TradeDecision(action="buy", qty=10, reason="Gemini強い")
    mock_claude = MagicMock()
    mock_claude.decide_safe.return_value = TradeDecision(action="buy", qty=8, reason="Claude強い")

    tc = _make_app(mock_gemini, mock_claude, guard, pos_mgr, broadcast)
    res = tc.post("/api/price", json=PRICE_PAYLOAD)
    broadcast.assert_called_once()
    assert res.status_code == 200
    data = res.json()
    assert data["action"] == "buy"
    assert data["qty"] == 8  # min(10, 8) = 8（保守的な数量）
    assert "合意" in data["reason"]


def test_price_feed_hybrid_disagreement_holds(setup):
    pos_mgr, guard, broadcast = setup
    guard.update_settings(RiskSettings(ai_mode="hybrid"))
    mock_gemini = MagicMock()
    mock_gemini.decide_safe.return_value = TradeDecision(action="buy", qty=10, reason="Gemini強気")
    mock_claude = MagicMock()
    mock_claude.decide_safe.return_value = TradeDecision(action="hold", qty=0, reason="Claude様子見")

    tc = _make_app(mock_gemini, mock_claude, guard, pos_mgr, broadcast)
    res = tc.post("/api/price", json=PRICE_PAYLOAD)
    broadcast.assert_called_once()
    assert res.status_code == 200
    data = res.json()
    assert data["action"] == "hold"
    assert "AI不一致" in data["reason"]
    assert pos_mgr.position.qty == 0  # 発注されていない


def test_price_feed_hybrid_both_hold(setup):
    pos_mgr, guard, broadcast = setup
    guard.update_settings(RiskSettings(ai_mode="hybrid"))
    mock_gemini = MagicMock()
    mock_gemini.decide_safe.return_value = TradeDecision(action="hold", qty=0, reason="Gemini様子見")
    mock_claude = MagicMock()
    mock_claude.decide_safe.return_value = TradeDecision(action="hold", qty=0, reason="Claude様子見")

    tc = _make_app(mock_gemini, mock_claude, guard, pos_mgr, broadcast)
    res = tc.post("/api/price", json=PRICE_PAYLOAD)
    assert res.status_code == 200
    assert res.json()["action"] == "hold"
    assert "合意" in res.json()["reason"]

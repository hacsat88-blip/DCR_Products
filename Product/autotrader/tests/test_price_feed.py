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
    "price": 250.0,
    "volume": 10000,
    "ohlc": [
        {"o": 249.0, "h": 249.4, "l": 248.7, "c": 249.1, "v": 700},
        {"o": 249.1, "h": 249.7, "l": 249.0, "c": 249.5, "v": 800},
        {"o": 249.5, "h": 250.1, "l": 249.3, "c": 249.8, "v": 900},
        {"o": 249.8, "h": 250.4, "l": 249.6, "c": 250.0, "v": 1000},
        {"o": 250.0, "h": 250.8, "l": 249.9, "c": 250.5, "v": 1500},
    ],
    "timestamp": "2026-04-12T10:00:00",
}

REFERENCE_SNAPSHOT = {
    "code": "7203",
    "current": 251.5,
    "volume": 12000,
    "as_of": "2026-04-11",
    "feed_role": "reference",
    "feed_source": "jquants_light",
}


@pytest.fixture
def setup(tmp_path, monkeypatch):
    monkeypatch.setattr("server.engine.position.STATE_FILE", tmp_path / "state.json")
    pos_mgr = PositionManager()
    guard = RiskGuard(
        settings=RiskSettings(),
        start_time=datetime(2026, 4, 12, 9, 58, 0),
    )
    broadcast = AsyncMock()
    return pos_mgr, guard, broadcast


def _make_app(
    gemini_ai,
    guard,
    pos_mgr,
    broadcast,
    get_reference_snapshot=None,
    schedule_reference_publish=None,
):
    app = FastAPI()
    app.include_router(
        make_price_router(
            gemini_ai,
            guard,
            pos_mgr,
            broadcast,
            get_reference_snapshot=get_reference_snapshot,
            schedule_reference_publish=schedule_reference_publish,
        )
    )
    return TestClient(app)


# --- gemini モード（デフォルト） ---

def test_price_feed_returns_hold_by_default(setup):
    pos_mgr, guard, broadcast = setup
    mock_gemini = MagicMock()
    mock_gemini.decide_safe.return_value = TradeDecision(action="hold", qty=0, reason="様子見")
    schedule_reference_publish = MagicMock()

    tc = _make_app(
        mock_gemini,
        guard,
        pos_mgr,
        broadcast,
        None,
        schedule_reference_publish,
    )
    res = tc.post("/api/price", json=PRICE_PAYLOAD)
    broadcast.assert_called_once()
    assert res.status_code == 200
    assert res.json()["action"] == "hold"
    assert res.json()["reference_status"] == "missing"
    assert res.json()["warning_code"] == "reference_missing"
    schedule_reference_publish.assert_called_once_with("7203", "jquants_light")


def test_price_feed_returns_cached_reference_advisory(setup):
    pos_mgr, guard, broadcast = setup
    mock_gemini = MagicMock()
    mock_gemini.decide_safe.return_value = TradeDecision(action="hold", qty=0, reason="様子見")
    schedule_reference_publish = MagicMock()
    get_reference_snapshot = MagicMock(return_value=REFERENCE_SNAPSHOT)

    tc = _make_app(
        mock_gemini,
        guard,
        pos_mgr,
        broadcast,
        get_reference_snapshot,
        schedule_reference_publish,
    )
    res = tc.post("/api/price", json=PRICE_PAYLOAD)

    assert res.status_code == 200
    data = res.json()
    assert data["reference_status"] == "ok"
    assert data["reference_price"] == 251.5
    assert data["reference_source"] == "jquants_light"
    assert data["reference_as_of"] == "2026-04-11"
    assert data["reference_age_days"] == 1
    assert data["reference_gap_pct"] == pytest.approx(-0.596, abs=0.001)
    assert data["warning_code"] is None
    assert data["warning_message"] is None
    get_reference_snapshot.assert_called_once_with("7203", "jquants_light")


def test_price_feed_marks_old_reference_as_soft_warning(setup):
    pos_mgr, guard, broadcast = setup
    mock_gemini = MagicMock()
    mock_gemini.decide_safe.return_value = TradeDecision(action="hold", qty=0, reason="様子見")
    schedule_reference_publish = MagicMock()
    get_reference_snapshot = MagicMock(
        return_value={
            **REFERENCE_SNAPSHOT,
            "as_of": "2026-04-01",
        }
    )

    tc = _make_app(
        mock_gemini,
        guard,
        pos_mgr,
        broadcast,
        get_reference_snapshot,
        schedule_reference_publish,
    )
    res = tc.post("/api/price", json=PRICE_PAYLOAD)

    assert res.status_code == 200
    data = res.json()
    assert data["reference_status"] == "stale"
    assert data["reference_age_days"] == 11
    assert data["warning_code"] == "reference_stale"
    assert "execution only" in data["warning_message"]


def test_price_feed_buy_updates_position(setup):
    pos_mgr, guard, broadcast = setup
    mock_gemini = MagicMock()
    mock_gemini.decide_safe.return_value = TradeDecision(action="buy", qty=10, reason="強い")
    schedule_reference_publish = MagicMock()

    tc = _make_app(
        mock_gemini,
        guard,
        pos_mgr,
        broadcast,
        None,
        schedule_reference_publish,
    )
    # 10株 × 250円 = 2,500 < limit 100,000 → allow
    res = tc.post("/api/price", json=PRICE_PAYLOAD)
    broadcast.assert_called_once()
    assert res.status_code == 200
    assert res.json()["action"] == "buy"
    assert pos_mgr.position.qty == 10
    schedule_reference_publish.assert_called_once_with("7203", "jquants_light")


def test_price_feed_risk_guard_blocks_excessive_buy(setup):
    pos_mgr, guard, broadcast = setup
    mock_gemini = MagicMock()
    # 250円 × 500株 = 125,000 > limit 100,000 → qty が 400 に縮小
    mock_gemini.decide_safe.return_value = TradeDecision(action="buy", qty=500, reason="過剰")
    schedule_reference_publish = MagicMock()

    tc = _make_app(
        mock_gemini,
        guard,
        pos_mgr,
        broadcast,
        None,
        schedule_reference_publish,
    )
    res = tc.post("/api/price", json=PRICE_PAYLOAD)
    broadcast.assert_called_once()
    assert res.status_code == 200
    data = res.json()
    assert data["action"] in ("buy", "hold")
    if data["action"] == "buy":
        assert data["qty"] * PRICE_PAYLOAD["price"] <= guard.settings.limit_per_order
    schedule_reference_publish.assert_called_once_with("7203", "jquants_light")


def test_price_feed_reference_feed_skips_ai_and_execution(setup):
    pos_mgr, guard, broadcast = setup
    mock_gemini = MagicMock()
    schedule_reference_publish = MagicMock()

    tc = _make_app(
        mock_gemini,
        guard,
        pos_mgr,
        broadcast,
        None,
        schedule_reference_publish,
    )
    res = tc.post(
        "/api/price",
        json={
            **PRICE_PAYLOAD,
            "feed_role": "reference",
            "feed_source": "jquants_free",
        },
    )
    broadcast.assert_called_once()
    assert res.status_code == 200
    assert res.json()["action"] == "hold"
    assert "参照フィード" in res.json()["reason"]
    assert res.json()["reference_status"] == "ok"
    assert res.json()["reference_price"] == PRICE_PAYLOAD["price"]
    mock_gemini.decide_safe.assert_not_called()
    schedule_reference_publish.assert_not_called()
    assert pos_mgr.position.qty == 0


def test_price_feed_records_orders_against_daily_limit(setup):
    pos_mgr, guard, broadcast = setup
    guard.update_settings(RiskSettings(max_daily_orders=1, max_concurrent_positions=2))
    mock_gemini = MagicMock()
    mock_gemini.decide_safe.side_effect = [
        TradeDecision(action="buy", qty=10, reason="初回買い"),
        TradeDecision(action="buy", qty=10, reason="再エントリー"),
    ]
    schedule_reference_publish = MagicMock()

    tc = _make_app(
        mock_gemini,
        guard,
        pos_mgr,
        broadcast,
        None,
        schedule_reference_publish,
    )
    first = tc.post("/api/price", json=PRICE_PAYLOAD)
    second = tc.post(
        "/api/price",
        json={
            **PRICE_PAYLOAD,
            "timestamp": "2026-04-12T10:01:00",
        },
    )

    assert first.status_code == 200
    assert first.json()["action"] == "buy"
    assert second.status_code == 200
    assert second.json()["action"] == "hold"
    assert "日次発注上限" in second.json()["reason"]
    assert schedule_reference_publish.call_count == 2


def test_price_feed_blocks_buy_when_intraday_setup_is_too_thin(setup):
    pos_mgr, guard, broadcast = setup
    mock_gemini = MagicMock()
    mock_gemini.decide_safe.return_value = TradeDecision(action="buy", qty=10, reason="上抜け")
    schedule_reference_publish = MagicMock()

    tc = _make_app(
        mock_gemini,
        guard,
        pos_mgr,
        broadcast,
        None,
        schedule_reference_publish,
    )
    res = tc.post(
        "/api/price",
        json={
            **PRICE_PAYLOAD,
            "price": 250.0,
            "ohlc": [
                {"o": 249.8, "h": 250.1, "l": 249.7, "c": 250.0, "v": 1000},
                {"o": 249.9, "h": 250.2, "l": 249.8, "c": 250.0, "v": 1000},
                {"o": 249.9, "h": 250.1, "l": 249.8, "c": 250.0, "v": 1000},
                {"o": 249.8, "h": 250.2, "l": 249.8, "c": 250.0, "v": 1000},
                {"o": 249.9, "h": 250.1, "l": 249.8, "c": 250.0, "v": 900},
            ],
        },
    )

    assert res.status_code == 200
    assert res.json()["action"] == "hold"
    assert "値幅" in res.json()["reason"] or "出来高" in res.json()["reason"]


def test_price_feed_blocks_buy_when_news_halt_is_enabled(setup):
    pos_mgr, guard, broadcast = setup
    mock_gemini = MagicMock()
    mock_gemini.decide_safe.return_value = TradeDecision(action="buy", qty=10, reason="上抜け")
    schedule_reference_publish = MagicMock()

    tc = _make_app(
        mock_gemini,
        guard,
        pos_mgr,
        broadcast,
        None,
        schedule_reference_publish,
    )
    res = tc.post(
        "/api/price",
        json={
            **PRICE_PAYLOAD,
            "bid": 249.9,
            "ask": 250.1,
            "news_halt": True,
            "news_note": "決算速報",
        },
    )

    assert res.status_code == 200
    assert res.json()["action"] == "hold"
    assert "ニュース" in res.json()["reason"]


def test_price_feed_allows_buy_when_only_one_bar_is_available(setup):
    pos_mgr, guard, broadcast = setup
    mock_gemini = MagicMock()
    mock_gemini.decide_safe.return_value = TradeDecision(action="buy", qty=10, reason="初動")
    schedule_reference_publish = MagicMock()

    tc = _make_app(
        mock_gemini,
        guard,
        pos_mgr,
        broadcast,
        None,
        schedule_reference_publish,
    )
    res = tc.post(
        "/api/price",
        json={
            **PRICE_PAYLOAD,
            "ohlc": [
                {"o": 249.8, "h": 250.2, "l": 249.7, "c": 250.0, "v": 1000},
            ],
        },
    )

    assert res.status_code == 200
    assert res.json()["action"] == "buy"
    assert res.json()["qty"] == 10

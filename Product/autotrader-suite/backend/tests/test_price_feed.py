import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient
from fastapi import FastAPI
from server.models import RiskSettings, TradeDecision
from server.engine.position import PositionManager
from server.engine.paper_ops import PaperOpsState
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
    paper_ops_state=None,
    reference_ready_provider=None,
    send_alert=None,
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
            paper_ops_state=paper_ops_state,
            reference_ready_provider=reference_ready_provider,
            send_alert=send_alert,
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


def test_price_feed_alerts_once_when_reference_becomes_degraded(setup):
    pos_mgr, guard, broadcast = setup
    mock_gemini = MagicMock()
    mock_gemini.decide_safe.return_value = TradeDecision(action="hold", qty=0, reason="様子見")
    send_alert = AsyncMock()
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
        MagicMock(),
        PaperOpsState(ai_ready=True, reference_ready=True),
        lambda: True,
        send_alert,
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
    assert second.status_code == 200
    assert send_alert.await_count == 1
    assert "Reference degraded" in send_alert.await_args_list[0].args[0]


def test_price_feed_marks_paper_ops_reference_degraded_on_stale_snapshot(setup):
    pos_mgr, guard, broadcast = setup
    mock_gemini = MagicMock()
    mock_gemini.decide_safe.return_value = TradeDecision(action="hold", qty=0, reason="様子見")
    paper_ops_state = PaperOpsState(ai_ready=True, reference_ready=True)
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
        MagicMock(),
        paper_ops_state,
        lambda: True,
    )
    response = tc.post("/api/price", json=PRICE_PAYLOAD)

    assert response.status_code == 200
    snapshot = paper_ops_state.snapshot(datetime(2026, 4, 13, 10, 30, 5))
    assert snapshot.reference_status == "degraded"
    assert snapshot.last_warning == "J-Quants reference stale (11 days); execution onlyで継続"


def test_price_feed_updates_paper_ops_health_on_execution_tick(setup):
    pos_mgr, guard, broadcast = setup
    mock_gemini = MagicMock()
    mock_gemini.decide_safe.return_value = TradeDecision(action="hold", qty=0, reason="様子見")
    paper_ops_state = PaperOpsState(ai_ready=True, reference_ready=True)

    tc = _make_app(
        mock_gemini,
        guard,
        pos_mgr,
        broadcast,
        None,
        MagicMock(),
        paper_ops_state,
        lambda: True,
    )
    response = tc.post("/api/price", json=PRICE_PAYLOAD)

    assert response.status_code == 200
    snapshot = paper_ops_state.snapshot(datetime(2026, 4, 13, 10, 30, 5))
    assert snapshot.last_price_tick_at == datetime(2026, 4, 12, 10, 0, 0)
    assert snapshot.last_price_code == "7203"
    assert snapshot.mode == "paper"
    assert snapshot.order_mode == "stub_only"
    assert snapshot.live_armed is False
    assert snapshot.ai_status == "ready"
    assert snapshot.reference_status == "ready"
    assert snapshot.last_warning == "J-Quants reference missing; execution onlyで継続"


def test_price_feed_propagates_live_execution_mode_to_health(setup):
    pos_mgr, guard, broadcast = setup
    mock_gemini = MagicMock()
    mock_gemini.decide_safe.return_value = TradeDecision(action="hold", qty=0, reason="様子見")
    paper_ops_state = PaperOpsState(ai_ready=True, reference_ready=True)

    tc = _make_app(
        mock_gemini,
        guard,
        pos_mgr,
        broadcast,
        MagicMock(return_value=REFERENCE_SNAPSHOT),
        MagicMock(),
        paper_ops_state,
        lambda: True,
    )
    response = tc.post(
        "/api/price",
        json={
            **PRICE_PAYLOAD,
            "client_run_mode": "live",
            "client_order_mode": "broker_auto",
            "client_live_armed": True,
        },
    )

    assert response.status_code == 200
    snapshot = paper_ops_state.snapshot(datetime(2026, 4, 13, 10, 30, 5))
    assert snapshot.mode == "live"
    assert snapshot.order_mode == "broker_auto"
    assert snapshot.live_armed is True


def test_price_feed_live_broker_mode_defers_position_until_execution_confirmation(setup):
    pos_mgr, guard, broadcast = setup
    mock_gemini = MagicMock()
    mock_gemini.decide_safe.return_value = TradeDecision(action="buy", qty=10, reason="強い")

    tc = _make_app(
        mock_gemini,
        guard,
        pos_mgr,
        broadcast,
        MagicMock(return_value=REFERENCE_SNAPSHOT),
        MagicMock(),
        PaperOpsState(ai_ready=True, reference_ready=True),
        lambda: True,
    )
    response = tc.post(
        "/api/price",
        json={
            **PRICE_PAYLOAD,
            "client_run_mode": "live",
            "client_order_mode": "broker_auto",
            "client_live_armed": True,
        },
    )

    assert response.status_code == 200
    assert response.json()["action"] == "buy"
    assert response.json()["pending_execution_id"]
    assert pos_mgr.position.qty == 0
    assert guard.daily_order_count == 0
    assert broadcast.await_args.kwargs["action"]["action"] == "hold"
    assert "live 発注待ち" in broadcast.await_args.kwargs["action"]["reason"]


def test_execution_result_applies_live_buy_after_broker_confirmation(setup):
    pos_mgr, guard, broadcast = setup
    mock_gemini = MagicMock()
    paper_ops_state = PaperOpsState(ai_ready=True, reference_ready=True)
    send_alert = AsyncMock()

    tc = _make_app(
        mock_gemini,
        guard,
        pos_mgr,
        broadcast,
        MagicMock(return_value=REFERENCE_SNAPSHOT),
        MagicMock(),
        paper_ops_state,
        lambda: True,
        send_alert,
    )
    mock_gemini.decide_safe.return_value = TradeDecision(action="buy", qty=10, reason="強い")
    price_response = tc.post(
        "/api/price",
        json={
            **PRICE_PAYLOAD,
            "client_run_mode": "live",
            "client_order_mode": "broker_auto",
            "client_live_armed": True,
        },
    )
    pending_execution_id = price_response.json()["pending_execution_id"]

    response = tc.post(
        "/api/execution-result",
        json={
            "code": "7203",
            "action": "buy",
            "qty": 10,
            "price": 250.0,
            "volume": 10000,
            "order_type": "成行",
            "reason": "強い",
            "timestamp": "2026-04-12T10:00:00",
            "success": True,
            "client_run_mode": "live",
            "client_order_mode": "broker_auto",
            "client_live_armed": True,
            "pending_execution_id": pending_execution_id,
        },
    )

    assert response.status_code == 200
    assert response.json() == {"status": "recorded", "applied": True}
    assert pos_mgr.position.qty == 10
    assert guard.daily_order_count == 1
    send_alert.assert_awaited_once()
    snapshot = paper_ops_state.snapshot(datetime(2026, 4, 13, 10, 30, 5))
    assert snapshot.mode == "live"
    assert snapshot.order_mode == "broker_auto"
    assert snapshot.live_armed is True


def test_execution_result_rejects_missing_pending_execution_id_in_live_broker_mode(setup):
    pos_mgr, guard, broadcast = setup
    mock_gemini = MagicMock()

    tc = _make_app(
        mock_gemini,
        guard,
        pos_mgr,
        broadcast,
        MagicMock(return_value=REFERENCE_SNAPSHOT),
        MagicMock(),
        PaperOpsState(ai_ready=True, reference_ready=True),
        lambda: True,
    )

    response = tc.post(
        "/api/execution-result",
        json={
            "code": "7203",
            "action": "buy",
            "qty": 10,
            "price": 250.0,
            "volume": 10000,
            "order_type": "成行",
            "reason": "強い",
            "timestamp": "2026-04-12T10:00:00",
            "success": True,
            "client_run_mode": "live",
            "client_order_mode": "broker_auto",
            "client_live_armed": True,
        },
    )

    assert response.status_code == 422


def test_execution_result_is_idempotent_for_duplicate_pending_execution_id(setup):
    pos_mgr, guard, broadcast = setup
    mock_gemini = MagicMock()

    tc = _make_app(
        mock_gemini,
        guard,
        pos_mgr,
        broadcast,
        MagicMock(return_value=REFERENCE_SNAPSHOT),
        MagicMock(),
        PaperOpsState(ai_ready=True, reference_ready=True),
        lambda: True,
    )
    mock_gemini.decide_safe.return_value = TradeDecision(action="buy", qty=10, reason="強い")
    price_response = tc.post(
        "/api/price",
        json={
            **PRICE_PAYLOAD,
            "client_run_mode": "live",
            "client_order_mode": "broker_auto",
            "client_live_armed": True,
        },
    )
    pending_execution_id = price_response.json()["pending_execution_id"]

    payload = {
        "code": "7203",
        "action": "buy",
        "qty": 10,
        "price": 250.0,
        "volume": 10000,
        "order_type": "成行",
        "reason": "強い",
        "timestamp": "2026-04-12T10:00:00",
        "success": True,
        "client_run_mode": "live",
        "client_order_mode": "broker_auto",
        "client_live_armed": True,
        "pending_execution_id": pending_execution_id,
    }

    first = tc.post("/api/execution-result", json=payload)
    second = tc.post("/api/execution-result", json=payload)

    assert first.status_code == 200
    assert first.json() == {"status": "recorded", "applied": True}
    assert second.status_code == 200
    assert second.json() == {"status": "duplicate", "applied": False}
    assert pos_mgr.position.qty == 10
    assert guard.daily_order_count == 1


def test_execution_result_keeps_position_unchanged_on_broker_failure(setup):
    pos_mgr, guard, broadcast = setup
    mock_gemini = MagicMock()
    paper_ops_state = PaperOpsState(ai_ready=True, reference_ready=True)
    send_alert = AsyncMock()

    tc = _make_app(
        mock_gemini,
        guard,
        pos_mgr,
        broadcast,
        MagicMock(return_value=REFERENCE_SNAPSHOT),
        MagicMock(),
        paper_ops_state,
        lambda: True,
        send_alert,
    )
    mock_gemini.decide_safe.return_value = TradeDecision(action="buy", qty=10, reason="強い")
    price_response = tc.post(
        "/api/price",
        json={
            **PRICE_PAYLOAD,
            "client_run_mode": "live",
            "client_order_mode": "broker_auto",
            "client_live_armed": True,
        },
    )
    pending_execution_id = price_response.json()["pending_execution_id"]

    response = tc.post(
        "/api/execution-result",
        json={
            "code": "7203",
            "action": "buy",
            "qty": 10,
            "price": 250.0,
            "volume": 10000,
            "order_type": "成行",
            "reason": "強い",
            "timestamp": "2026-04-12T10:00:00",
            "success": False,
            "error_message": "broker order failed: login required",
            "client_run_mode": "live",
            "client_order_mode": "broker_auto",
            "client_live_armed": False,
            "pending_execution_id": pending_execution_id,
        },
    )

    assert response.status_code == 200
    assert response.json() == {"status": "recorded", "applied": False}
    assert pos_mgr.position.qty == 0
    assert guard.daily_order_count == 0
    send_alert.assert_awaited_once()
    snapshot = paper_ops_state.snapshot(datetime(2026, 4, 13, 10, 30, 5))
    assert snapshot.last_warning == "broker order failed: login required"
    assert snapshot.live_armed is False


def test_price_feed_marks_ai_status_degraded_after_ai_error(setup):
    pos_mgr, guard, broadcast = setup
    mock_gemini = MagicMock()
    mock_gemini.decide_safe.return_value = TradeDecision(
        action="hold",
        qty=0,
        reason="AI判断エラー: GOOGLE_API_KEY not set",
    )
    paper_ops_state = PaperOpsState(ai_ready=True, reference_ready=True)

    tc = _make_app(
        mock_gemini,
        guard,
        pos_mgr,
        broadcast,
        MagicMock(return_value=REFERENCE_SNAPSHOT),
        MagicMock(),
        paper_ops_state,
        lambda: True,
    )
    response = tc.post("/api/price", json=PRICE_PAYLOAD)

    assert response.status_code == 200
    snapshot = paper_ops_state.snapshot(datetime(2026, 4, 13, 10, 30, 5))
    assert snapshot.ai_status == "degraded"
    assert snapshot.reference_status == "ready"
    assert snapshot.last_warning == "AI判断エラー: GOOGLE_API_KEY not set"


def test_price_feed_alerts_once_when_ai_becomes_degraded(setup):
    pos_mgr, guard, broadcast = setup
    mock_gemini = MagicMock()
    mock_gemini.decide_safe.return_value = TradeDecision(
        action="hold",
        qty=0,
        reason="AI判断エラー: GOOGLE_API_KEY not set",
    )
    send_alert = AsyncMock()

    tc = _make_app(
        mock_gemini,
        guard,
        pos_mgr,
        broadcast,
        MagicMock(return_value=REFERENCE_SNAPSHOT),
        MagicMock(),
        PaperOpsState(ai_ready=True, reference_ready=True),
        lambda: True,
        send_alert,
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
    assert second.status_code == 200
    assert send_alert.await_count == 1
    assert "AI degraded" in send_alert.await_args_list[0].args[0]


def test_price_feed_alerts_once_when_runtime_entry_becomes_blocked(setup):
    pos_mgr, guard, broadcast = setup
    guard.update_settings(RiskSettings(max_daily_loss_yen=100))
    guard.record_order(
        TradeDecision(action="sell", qty=10, reason="損失"),
        datetime(2026, 4, 12, 9, 59, 0),
        realized_pnl=-150,
    )
    mock_gemini = MagicMock()
    mock_gemini.decide_safe.return_value = TradeDecision(action="hold", qty=0, reason="様子見")
    send_alert = AsyncMock()

    tc = _make_app(
        mock_gemini,
        guard,
        pos_mgr,
        broadcast,
        MagicMock(return_value=REFERENCE_SNAPSHOT),
        MagicMock(),
        PaperOpsState(ai_ready=True, reference_ready=True),
        lambda: True,
        send_alert,
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
    assert second.status_code == 200
    assert send_alert.await_count == 1
    assert "Risk blocked" in send_alert.await_args_list[0].args[0]


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

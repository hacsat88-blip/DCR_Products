import asyncio
import inspect
import json
from datetime import datetime, timedelta

from server.models import TradeDecision

from fastapi import FastAPI
from fastapi.testclient import TestClient

from server.engine.position import PositionManager
from server.engine.risk_guard import RiskGuard
from server.models import RiskSettings
from server.routes.ws import make_ws_router


class FakeWebSocket:
    def __init__(self):
        self.messages: list[str] = []

    async def send_text(self, text: str):
        self.messages.append(text)


class BrokenWebSocket:
    async def send_text(self, text: str):
        raise RuntimeError("socket closed")


def _make_components(tmp_path, monkeypatch):
    monkeypatch.setattr("server.engine.position.STATE_FILE", tmp_path / "state.json")
    pos_mgr = PositionManager()
    guard = RiskGuard(
        settings=RiskSettings(),
        start_time=datetime.now() - timedelta(seconds=60),
    )
    return pos_mgr, guard


def test_ws_endpoint_accepts_connection(tmp_path, monkeypatch):
    pos_mgr, guard = _make_components(tmp_path, monkeypatch)
    router, _ = make_ws_router(pos_mgr, guard)
    app = FastAPI()
    app.include_router(router)

    with TestClient(app).websocket_connect("/ws") as websocket:
        websocket.send_text("ping")


def test_broadcast_sends_state_update_payload(tmp_path, monkeypatch):
    pos_mgr, guard = _make_components(tmp_path, monkeypatch)
    _, broadcast = make_ws_router(pos_mgr, guard)
    clients = inspect.getclosurevars(broadcast).nonlocals["_clients"]
    fake_ws = FakeWebSocket()
    clients.append(fake_ws)

    asyncio.run(pos_mgr.apply_buy("7203", qty=10, price=250.0))
    asyncio.run(
        broadcast(
            price={
                "code": "7203",
                "current": 250.0,
                "volume": 10000,
                "feed_role": "execution",
                "feed_source": "rakuten_rss",
            },
            action={
                "action": "buy",
                "qty": 10,
                "reason": "初回買い",
                "at": "10:00:00",
            },
        )
    )

    payload = json.loads(fake_ws.messages[0])
    assert payload["type"] == "state_update"
    assert payload["price"]["feed_role"] == "execution"
    assert payload["price"]["feed_source"] == "rakuten_rss"
    assert payload["reference_price"] is None
    assert payload["last_action"]["action"] == "buy"
    assert payload["position"]["qty"] == 10
    assert payload["risk"]["execution_feed"] == "rakuten_rss"
    assert payload["risk_runtime"]["daily_order_count"] == 0
    assert payload["risk_runtime"]["daily_realized_pnl"] == 0.0
    assert payload["risk_runtime"]["cooldown_remaining_sec"] == 0


def test_broadcast_keeps_execution_price_when_reference_updates(tmp_path, monkeypatch):
    pos_mgr, guard = _make_components(tmp_path, monkeypatch)
    _, broadcast = make_ws_router(pos_mgr, guard)
    clients = inspect.getclosurevars(broadcast).nonlocals["_clients"]
    fake_ws = FakeWebSocket()
    clients.append(fake_ws)

    asyncio.run(
        broadcast(
            price={
                "code": "7203",
                "current": 250.0,
                "volume": 10000,
                "feed_role": "execution",
                "feed_source": "rakuten_rss",
            },
            action={
                "action": "buy",
                "qty": 10,
                "reason": "初回買い",
                "at": "10:00:00",
            },
        )
    )
    asyncio.run(
        broadcast(
            price={
                "code": "7203",
                "current": 251.5,
                "volume": 12000,
                "feed_role": "reference",
                "feed_source": "jquants_free",
            },
            action={
                "action": "hold",
                "qty": 0,
                "reason": "J-Quants 参照更新",
                "at": "10:00:01",
            },
        )
    )

    payload = json.loads(fake_ws.messages[-1])
    assert payload["price"]["feed_role"] == "execution"
    assert payload["price"]["current"] == 250.0
    assert payload["reference_price"]["feed_role"] == "reference"
    assert payload["reference_price"]["feed_source"] == "jquants_free"
    assert payload["last_action"]["reason"] == "J-Quants 参照更新"


def test_broadcast_removes_dead_clients(tmp_path, monkeypatch):
    pos_mgr, guard = _make_components(tmp_path, monkeypatch)
    _, broadcast = make_ws_router(pos_mgr, guard)
    clients = inspect.getclosurevars(broadcast).nonlocals["_clients"]
    broken_ws = BrokenWebSocket()
    clients.append(broken_ws)

    asyncio.run(
        broadcast(
            price={"code": "7203", "current": 250.0, "volume": 10000},
            action={"action": "hold", "qty": 0, "reason": "様子見", "at": "10:00:00"},
        )
    )

    assert broken_ws not in clients


def test_broadcast_includes_runtime_risk_after_loss(tmp_path, monkeypatch):
    pos_mgr, guard = _make_components(tmp_path, monkeypatch)
    _, broadcast = make_ws_router(pos_mgr, guard)
    clients = inspect.getclosurevars(broadcast).nonlocals["_clients"]
    fake_ws = FakeWebSocket()
    clients.append(fake_ws)

    guard.record_order(
        TradeDecision(action="sell", qty=10, reason="損切り"),
        datetime.now(),
        realized_pnl=-500.0,
    )

    asyncio.run(
        broadcast(
            price={
                "code": "7203",
                "current": 250.0,
                "volume": 10000,
                "feed_role": "execution",
                "feed_source": "rakuten_rss",
            },
            action={
                "action": "hold",
                "qty": 0,
                "reason": "停止中",
                "at": "10:00:00",
            },
        )
    )

    payload = json.loads(fake_ws.messages[0])
    assert payload["risk_runtime"]["daily_realized_pnl"] == -500.0
    assert payload["risk_runtime"]["consecutive_loss_count"] == 1
    assert payload["risk_runtime"]["cooldown_remaining_sec"] >= 0


def test_broadcast_uses_event_timestamp_for_runtime_snapshot(tmp_path, monkeypatch):
    pos_mgr, guard = _make_components(tmp_path, monkeypatch)
    _, broadcast = make_ws_router(pos_mgr, guard)
    clients = inspect.getclosurevars(broadcast).nonlocals["_clients"]
    fake_ws = FakeWebSocket()
    clients.append(fake_ws)

    event_time = datetime(2026, 4, 12, 10, 0, 0)
    guard.record_order(
        TradeDecision(action="sell", qty=10, reason="損切り"),
        event_time,
        realized_pnl=-500.0,
    )

    asyncio.run(
        broadcast(
            price={
                "code": "7203",
                "current": 250.0,
                "volume": 10000,
                "feed_role": "execution",
                "feed_source": "rakuten_rss",
            },
            action={
                "action": "hold",
                "qty": 0,
                "reason": "停止中",
                "at": "10:00:00",
            },
            event_timestamp=event_time,
        )
    )

    payload = json.loads(fake_ws.messages[0])
    assert payload["ts"] == event_time.isoformat()
    assert payload["risk_runtime"]["daily_realized_pnl"] == -500.0
    assert payload["risk_runtime"]["consecutive_loss_count"] == 1
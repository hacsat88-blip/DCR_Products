import asyncio
import inspect
import json
from datetime import datetime, timedelta

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
    assert payload["last_action"]["action"] == "buy"
    assert payload["position"]["qty"] == 10
    assert payload["risk"]["execution_feed"] == "rakuten_rss"


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
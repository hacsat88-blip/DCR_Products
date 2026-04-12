import json
from datetime import datetime
from typing import Callable
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from server.engine.position import PositionManager
from server.engine.risk_guard import RiskGuard


def make_ws_router(
    pos_mgr: PositionManager,
    guard: RiskGuard,
) -> tuple[APIRouter, Callable]:
    r = APIRouter()
    _clients: list[WebSocket] = []
    _last_execution_price: dict = {
        "code": "-",
        "current": 0.0,
        "volume": 0,
        "feed_role": "execution",
        "feed_source": "rakuten_rss",
    }
    _last_reference_price: dict | None = None
    _last_action: dict = {"action": "none", "qty": 0, "reason": "起動中", "at": ""}

    async def broadcast(price: dict, action: dict) -> None:
        nonlocal _last_reference_price
        if price.get("feed_role") == "reference":
            _last_reference_price = price.copy()
        else:
            _last_execution_price.update(price)
        _last_action.update(action)
        pos = pos_mgr.position
        payload = {
            "type": "state_update",
            "ts": datetime.now().isoformat(),
            "price": _last_execution_price.copy(),
            "reference_price": None if _last_reference_price is None else _last_reference_price.copy(),
            "position": {
                "qty": pos.qty,
                "avg_cost": pos.avg_cost,
                "pnl": pos.pnl,
                "pnl_pct": pos.pnl_pct,
            },
            "last_action": _last_action.copy(),
            "risk": guard.settings.model_dump(),
        }
        dead: list[WebSocket] = []
        for ws in _clients:
            try:
                await ws.send_text(json.dumps(payload, ensure_ascii=False))
            except Exception:
                dead.append(ws)
        for ws in dead:
            _clients.remove(ws)

    @r.websocket("/ws")
    async def ws_endpoint(websocket: WebSocket):
        await websocket.accept()
        _clients.append(websocket)
        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            if websocket in _clients:
                _clients.remove(websocket)

    return r, broadcast

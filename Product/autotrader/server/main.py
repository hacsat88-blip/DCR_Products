"""FastAPI entry point — SP-2a 拡張版"""
import asyncio
from datetime import datetime
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from .ai_trader import AITrader
from .capital_router import CapitalRouter
from .risk_guard import RiskGuard
from .technical_filter import PriceData, TechnicalFilter

app = FastAPI(title="Autotrader API")

capital_router = CapitalRouter()
technical_filter = TechnicalFilter()
risk_guard = RiskGuard()
ai_trader = AITrader()

_ws_clients: list[WebSocket] = []
_simulation_mode: bool = True  # 最初の2週間はTrue（発注を止めて判断精度を確認）


class PriceRequest(BaseModel):
    symbol: str
    price: float
    volume: int
    avg_volume_5d: int
    rsi14: float
    prev_close: float
    available_cash: float
    timestamp: str


class OrderResult(BaseModel):
    symbol: str
    action: str
    executed_price: float
    qty: int
    timestamp: str


@app.post("/api/price")
async def handle_price(req: PriceRequest) -> dict[str, Any]:
    now = datetime.fromisoformat(req.timestamp)
    config = capital_router.get_config(req.available_cash)
    tier = capital_router.get_tier(req.available_cash)

    price_data = PriceData(
        symbol=req.symbol,
        price=req.price,
        volume=req.volume,
        avg_volume_5d=req.avg_volume_5d,
        rsi14=req.rsi14,
        prev_close=req.prev_close,
        current_time=now.time(),
    )

    filter_result = technical_filter.check(price_data, config)
    if not filter_result.passed:
        return {"action": "hold", "reason": filter_result.reason, "simulation": _simulation_mode}

    lot = capital_router.calc_lot(req.available_cash, req.price)
    if lot == 0:
        return {"action": "hold", "reason": "株価がティア上限超過（取引不可）", "simulation": _simulation_mode}

    in_position = req.symbol in risk_guard.session.position_entry_prices
    position_pnl = None
    if in_position:
        entry = risk_guard.session.position_entry_prices[req.symbol]
        position_pnl = (req.price - entry) * lot

        exit_check = risk_guard.check_exit(req.symbol, req.price, now)
        if exit_check.allowed:
            signal_action = "sell"
            signal_reason = exit_check.reason
            signal_confidence = 1.0
        else:
            signal = ai_trader.judge(
                req.symbol, req.price, req.rsi14,
                req.volume / max(req.avg_volume_5d, 1),
                (req.price - req.prev_close) / max(req.prev_close, 1) * 100,
                position_pnl, tier.value,
            )
            signal_action = signal.action
            signal_reason = signal.reason
            signal_confidence = signal.confidence
    else:
        # RR 1.5 を満たす最小目標価格: -2000円損切りに対して+3000円以上の利益が必要
        min_gain_per_share = 2_000 * 1.5 / lot
        target_price = req.price + min_gain_per_share
        entry_check = risk_guard.check_entry(req.symbol, req.price, target_price, now, lot)
        if not entry_check.allowed:
            return {"action": "hold", "reason": entry_check.reason, "simulation": _simulation_mode}

        signal = ai_trader.judge(
            req.symbol, req.price, req.rsi14,
            req.volume / max(req.avg_volume_5d, 1),
            (req.price - req.prev_close) / max(req.prev_close, 1) * 100,
            None, tier.value,
        )
        signal_action = signal.action
        signal_reason = signal.reason
        signal_confidence = signal.confidence

    response = {
        "action": signal_action,
        "reason": signal_reason,
        "confidence": signal_confidence,
        "lot": lot,
        "tier": tier.value,
        "daily_pnl": risk_guard.session.daily_pnl,
        "risk_budget": risk_guard.get_remaining_risk_budget(),
        "simulation": _simulation_mode,
    }

    await _broadcast(response | {"symbol": req.symbol, "price": req.price, "timestamp": req.timestamp})
    return response


@app.post("/api/order-result")
async def handle_order_result(result: OrderResult) -> dict[str, str]:
    if result.action == "buy":
        risk_guard.on_entry(result.symbol, result.executed_price, datetime.fromisoformat(result.timestamp))
    elif result.action == "sell":
        entry = risk_guard.session.position_entry_prices.get(result.symbol, result.executed_price)
        pnl = (result.executed_price - entry) * result.qty
        risk_guard.on_exit(result.symbol, pnl)
    return {"status": "ok"}


@app.get("/api/status")
def get_status() -> dict[str, Any]:
    s = risk_guard.session
    return {
        "daily_pnl": s.daily_pnl,
        "positions": s.position_count,
        "trading_stopped": s.trading_stopped,
        "stop_reason": s.stop_reason,
        "risk_budget": risk_guard.get_remaining_risk_budget(),
        "simulation_mode": _simulation_mode,
    }


@app.post("/api/simulation/{mode}")
def set_simulation(mode: str) -> dict[str, Any]:
    global _simulation_mode
    _simulation_mode = mode == "on"
    return {"simulation_mode": _simulation_mode}


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket) -> None:
    await ws.accept()
    _ws_clients.append(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        _ws_clients.remove(ws)


async def _broadcast(data: dict[str, Any]) -> None:
    dead: list[WebSocket] = []
    for ws in _ws_clients:
        try:
            await ws.send_json(data)
        except Exception:
            dead.append(ws)
    for ws in dead:
        _ws_clients.remove(ws)

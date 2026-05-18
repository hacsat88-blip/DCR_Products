"""FastAPI entry point — SP-4 拡張版（永続化・日次レポート・祝日対応）"""
import asyncio
import json
import os
from datetime import datetime
from typing import Any

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from .capital_router import CapitalRouter
from .codex_advisor import AdvisorContext, CodexAdvice, CodexAdvisor
from .price_history import HistoryStore
from .risk_guard import RULES, RiskGuard
from .technical_filter import PriceData, TechnicalFilter
from .trade_store import (
    AdvisorReviewRecord,
    DecisionRecord,
    TradeRecord,
    TradeStore,
    session_date_str,
)

app = FastAPI(title="Autotrader API")

capital_router = CapitalRouter()
technical_filter = TechnicalFilter()
risk_guard = RiskGuard()
codex_advisor = CodexAdvisor()
history_store = HistoryStore()
trade_store = TradeStore(os.environ.get("AUTOTRADER_DB_PATH", "data/autotrader.db"))

_ws_clients: list[WebSocket] = []
_simulation_mode: bool = True  # 最初の2週間はTrue（発注を止めて判断精度を確認）


class PriceRequest(BaseModel):
    symbol: str
    price: float
    volume: int
    prev_close: float
    available_cash: float
    timestamp: str
    # RSI・5日平均出来高は Python 側で計算するため省略可能
    avg_volume_5d: int = 0
    rsi14: float = 50.0


class OrderResult(BaseModel):
    symbol: str
    action: str
    executed_price: float
    qty: int
    timestamp: str


@app.post("/api/price")
async def handle_price(req: PriceRequest) -> dict[str, Any]:
    now = datetime.fromisoformat(req.timestamp)
    risk_guard.ensure_today(now)
    session_date = session_date_str(now)

    config = capital_router.get_config(req.available_cash)
    tier = capital_router.get_tier(req.available_cash)

    history = history_store.update(req.symbol, req.price, req.volume)
    rsi14 = history.rsi14()
    avg_volume_5d = history.avg_volume_5d()
    volume_ratio = req.volume / max(avg_volume_5d, 1)

    trade_store.insert_price_snapshot(req.symbol, req.price, req.volume, req.timestamp)

    price_data = PriceData(
        symbol=req.symbol,
        price=req.price,
        volume=req.volume,
        avg_volume_5d=avg_volume_5d,
        rsi14=rsi14,
        prev_close=req.prev_close,
        current_time=now.time(),
        current_date=now.date(),
    )

    advice: CodexAdvice | None = None
    in_position = req.symbol in risk_guard.session.position_entry_prices
    if in_position:
        held_lot = risk_guard.session.position_lots.get(req.symbol, 100)
        lot = held_lot

        exit_check = risk_guard.check_exit(req.symbol, req.price, now)
        if exit_check.allowed:
            signal_action = "sell"
            signal_reason = exit_check.reason
            signal_confidence = 0.0
        else:
            signal_action = "hold"
            signal_reason = "ローカル決済条件未達"
            signal_confidence = 0.0
    else:
        filter_result = technical_filter.check(price_data, config)
        if not filter_result.passed:
            response = {"action": "hold", "reason": filter_result.reason, "simulation": _simulation_mode}
            _persist_decision(req, "hold", filter_result.reason, 0.0, rsi14, volume_ratio, session_date)
            return response

        lot = capital_router.calc_lot(req.available_cash, req.price)
        if lot == 0:
            reason = "株価がティア上限超過（取引不可）"
            _persist_decision(req, "hold", reason, 0.0, rsi14, volume_ratio, session_date)
            return {"action": "hold", "reason": reason, "simulation": _simulation_mode}

        min_gain_per_share = 2_000 * 1.5 / lot
        target_price = req.price + min_gain_per_share
        entry_check = risk_guard.check_entry(req.symbol, req.price, target_price, now, lot)
        if not entry_check.allowed:
            _persist_decision(req, "hold", entry_check.reason, 0.0, rsi14, volume_ratio, session_date)
            return {"action": "hold", "reason": entry_check.reason, "simulation": _simulation_mode}

        advisor_context = _build_advisor_context(now, session_date)
        advice = await asyncio.to_thread(codex_advisor.review, advisor_context)
        _persist_advisor_review(req, advice, advisor_context, session_date)
        if advice.api_error:
            risk_guard.block_new_entries("Codex app-serverエラー")
            signal_action = "hold"
            signal_reason = "Codex app-serverエラーのため新規建て禁止"
            signal_confidence = 0.0
        else:
            signal_action = "buy"
            signal_reason = "ローカルルールでエントリー許可"
            signal_confidence = 0.0

    _persist_decision(req, signal_action, signal_reason, signal_confidence,
                      rsi14, volume_ratio, session_date)

    response = {
        "action": signal_action,
        "reason": signal_reason,
        "lot": lot,
        "tier": tier.value,
        "daily_pnl": risk_guard.session.daily_pnl,
        "risk_budget": risk_guard.get_remaining_risk_budget(),
        "trading_stopped": risk_guard.session.trading_stopped,
        "stop_reason": risk_guard.session.stop_reason,
        "new_entries_blocked": risk_guard.session.new_entries_blocked,
        "new_entries_block_reason": risk_guard.session.new_entries_block_reason,
        "advisor": advice.to_dict() if advice else None,
        "simulation": _simulation_mode,
    }

    await _broadcast(response | {"symbol": req.symbol, "price": req.price, "timestamp": req.timestamp})
    return response


def _persist_decision(req: PriceRequest, action: str, reason: str,
                      confidence: float, rsi14: float, volume_ratio: float,
                      session_date: str) -> None:
    trade_store.insert_decision(DecisionRecord(
        symbol=req.symbol, action=action, reason=reason,
        confidence=confidence, price=req.price,
        rsi14=rsi14, volume_ratio=volume_ratio,
        timestamp=req.timestamp, session_date=session_date,
    ))


def _build_advisor_context(now: datetime, session_date: str) -> AdvisorContext:
    s = risk_guard.session
    rules_triggered: list[str] = []
    if s.daily_pnl <= RULES["max_daily_loss"]:
        rules_triggered.append("daily_loss_limit_reached")
    elif s.daily_pnl <= RULES["max_daily_loss"] * 0.7:
        rules_triggered.append("near_daily_loss_limit")
    if s.consecutive_losses >= 2:
        rules_triggered.append("loss_streak_warning")
    if s.new_entries_blocked:
        rules_triggered.append("new_entries_blocked")
    if s.daily_pnl >= RULES["daily_profit_target"]:
        rules_triggered.append("daily_profit_target_reached")

    return AdvisorContext(
        date=now.date().isoformat(),
        daily_target_profit=RULES["daily_profit_target"],
        max_daily_loss=abs(RULES["max_daily_loss"]),
        trade_count=s.trade_count,
        daily_pnl=s.daily_pnl,
        consecutive_losses=s.consecutive_losses,
        rules_triggered=rules_triggered,
        recent_trades=trade_store.get_recent_trade_summaries(session_date, 5),
    )


def _persist_advisor_review(
    req: PriceRequest,
    advice: CodexAdvice,
    context: AdvisorContext,
    session_date: str,
) -> None:
    trade_store.insert_advisor_review(AdvisorReviewRecord(
        session_date=session_date,
        symbol=req.symbol,
        risk_state=advice.risk_state,
        should_stop_new_entries=advice.should_stop_new_entries,
        should_reduce_size=advice.should_reduce_size,
        reason=advice.reason,
        rule_issue=advice.rule_issue,
        improvement=advice.improvement,
        api_error=advice.api_error,
        input_snapshot=json.dumps(context.__dict__, ensure_ascii=False),
        timestamp=req.timestamp,
    ))


@app.post("/api/order-result")
async def handle_order_result(result: OrderResult) -> dict[str, str]:
    now = datetime.fromisoformat(result.timestamp)
    risk_guard.ensure_today(now)
    session_date = session_date_str(now)
    pnl = 0.0

    if result.action == "buy":
        record_result = risk_guard.on_entry(result.symbol, result.executed_price, now, result.qty)
    elif result.action == "sell":
        entry = risk_guard.session.position_entry_prices.get(result.symbol)
        if entry is None:
            return {"status": "ignored", "reason": f"未保有銘柄の決済通知を無視: {result.symbol}"}
        pnl = (result.executed_price - entry) * result.qty
        record_result = risk_guard.on_exit(result.symbol, pnl)
    else:
        return {"status": "ignored", "reason": f"未対応の約定種別: {result.action}"}

    if not record_result.allowed:
        return {"status": "ignored", "reason": record_result.reason}

    trade_store.insert_trade(TradeRecord(
        symbol=result.symbol, action=result.action,
        price=result.executed_price, qty=result.qty,
        pnl=pnl, timestamp=result.timestamp, session_date=session_date,
    ))
    trade_store.upsert_daily_stats(session_date)
    return {"status": "ok"}


@app.get("/api/status")
def get_status() -> dict[str, Any]:
    s = risk_guard.session
    return {
        "daily_pnl": s.daily_pnl,
        "trade_count": s.trade_count,
        "consecutive_losses": s.consecutive_losses,
        "positions": s.position_count,
        "trading_stopped": s.trading_stopped,
        "stop_reason": s.stop_reason,
        "new_entries_blocked": s.new_entries_blocked,
        "new_entries_block_reason": s.new_entries_block_reason,
        "risk_budget": risk_guard.get_remaining_risk_budget(),
        "simulation_mode": _simulation_mode,
        # tier はWebSocketブロードキャスト経由でフロントエンドに伝達するため省略
        "session_date": s.session_date.isoformat() if s.session_date else None,
    }


@app.get("/api/positions")
def get_positions() -> dict[str, Any]:
    s = risk_guard.session
    now = datetime.now()
    positions = []
    for sym, entry in s.position_entry_prices.items():
        open_time = s.position_open_times.get(sym)
        elapsed_min = (now - open_time).total_seconds() / 60 if open_time else 0
        positions.append({
            "symbol": sym,
            "entry_price": entry,
            "lot": s.position_lots.get(sym, 100),
            "open_time": open_time.isoformat() if open_time else None,
            "elapsed_minutes": round(elapsed_min, 1),
            "remaining_minutes": max(0, 60 - elapsed_min),
        })
    return {"positions": positions}


@app.get("/api/daily-report")
def get_daily_report(date: str | None = None) -> dict[str, Any]:
    target = date or datetime.now().date().isoformat()
    return trade_store.compute_daily_report(target)


@app.get("/api/trades")
def get_trades(date: str | None = None, symbol: str | None = None,
               limit: int = 200) -> dict[str, Any]:
    return {"trades": trade_store.get_trades(date, symbol, limit)}


@app.get("/api/history/{symbol}")
def get_history(symbol: str, limit: int = 200) -> dict[str, Any]:
    return {"symbol": symbol, "points": trade_store.get_price_history(symbol, limit)}


@app.post("/api/session/reset")
def reset_session() -> dict[str, Any]:
    risk_guard.reset_session(datetime.now().date())
    return {"status": "ok", "session_date": risk_guard.session.session_date.isoformat()}


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

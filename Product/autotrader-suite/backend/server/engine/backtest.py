from __future__ import annotations

import csv
from datetime import datetime, timedelta
from pathlib import Path

from server.engine.risk_guard import RiskGuard
from server.engine.rule_based_trader import RuleBasedTrader
from server.engine.trade_setup import build_trade_setup
from server.models import OHLCBar, Position, PriceRequest, RiskSettings


def _parse_bool(raw_value: str) -> bool:
    return raw_value.strip().lower() in {"1", "true", "yes", "y"}


def _parse_float(raw_value: str) -> float | None:
    value = raw_value.strip()
    if value == "":
        return None
    return float(value)


def _load_rows(csv_path: Path) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    with csv_path.open("r", encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            rows.append(
                {
                    "timestamp": datetime.fromisoformat(str(row["timestamp"])),
                    "code": str(row["code"]),
                    "open": float(row["open"]),
                    "high": float(row["high"]),
                    "low": float(row["low"]),
                    "close": float(row["close"]),
                    "volume": int(row["volume"]),
                    "bid": _parse_float(str(row.get("bid", ""))),
                    "ask": _parse_float(str(row.get("ask", ""))),
                    "reference_price": _parse_float(str(row.get("reference_price", ""))),
                    "news_halt": _parse_bool(str(row.get("news_halt", "false"))),
                    "news_note": (row.get("news_note") or "").strip() or None,
                }
            )
    return rows


def _update_mark_to_market(position: Position, price: float) -> None:
    if position.qty > 0 and position.avg_cost > 0:
        position.pnl = (price - position.avg_cost) * position.qty
        position.pnl_pct = ((price - position.avg_cost) / position.avg_cost) * 100
    else:
        position.pnl = 0.0
        position.pnl_pct = 0.0


def _apply_buy(position: Position, code: str, qty: int, price: float) -> None:
    total_cost = position.avg_cost * position.qty + price * qty
    position.qty += qty
    position.avg_cost = total_cost / position.qty if position.qty > 0 else 0.0
    position.code = code
    _update_mark_to_market(position, price)


def _apply_sell(position: Position, qty: int, price: float) -> float:
    realized_pnl = 0.0
    if qty > 0 and position.avg_cost > 0:
        realized_pnl = (price - position.avg_cost) * qty
    position.qty = max(0, position.qty - qty)
    if position.qty == 0:
        position.avg_cost = 0.0
        position.code = ""
    _update_mark_to_market(position, price)
    return realized_pnl


def run_backtest(csv_path: str | Path, settings: RiskSettings) -> dict[str, object]:
    path = Path(csv_path)
    rows = _load_rows(path)
    if len(rows) < 5:
        raise ValueError("backtest requires at least 5 bars")

    trader = RuleBasedTrader()
    guard = RiskGuard(settings=settings, start_time=rows[0]["timestamp"] - timedelta(minutes=1))
    position = Position()
    realized_pnls: list[float] = []
    equity_peak = 0.0
    max_drawdown = 0.0
    bars_processed = 0

    for index in range(4, len(rows)):
        window = rows[index - 4 : index + 1]
        current = rows[index]
        req = PriceRequest(
            code=str(current["code"]),
            price=float(current["close"]),
            volume=int(current["volume"]),
            bid=current["bid"],
            ask=current["ask"],
            news_halt=bool(current["news_halt"]),
            news_note=current["news_note"],
            ohlc=[
                OHLCBar(
                    o=float(row["open"]),
                    h=float(row["high"]),
                    l=float(row["low"]),
                    c=float(row["close"]),
                    v=int(row["volume"]),
                )
                for row in window
            ],
            timestamp=current["timestamp"],
        )
        reference_snapshot = None
        if current["reference_price"] is not None:
            reference_snapshot = {"current": float(current["reference_price"])}

        _update_mark_to_market(position, req.price)
        setup = build_trade_setup(req, reference_snapshot)
        raw = trader.decide(req, position, settings, setup)
        decision = guard.apply(raw, position, req.price, req.timestamp, setup=setup)

        if decision.action == "buy":
            _apply_buy(position, req.code, decision.qty, req.price)
            guard.record_order(decision, req.timestamp)
        elif decision.action == "sell":
            realized = _apply_sell(position, decision.qty, req.price)
            realized_pnls.append(realized)
            guard.record_order(decision, req.timestamp, realized_pnl=realized)

        equity = sum(realized_pnls) + position.pnl
        equity_peak = max(equity_peak, equity)
        max_drawdown = max(max_drawdown, equity_peak - equity)
        bars_processed += 1

    wins = sum(1 for value in realized_pnls if value > 0)
    losses = sum(1 for value in realized_pnls if value < 0)
    gross_profit = sum(value for value in realized_pnls if value > 0)
    gross_loss = abs(sum(value for value in realized_pnls if value < 0))
    total_round_trips = len(realized_pnls)

    return {
        "decision_engine": "rule_based",
        "bars_processed": bars_processed,
        "total_round_trips": total_round_trips,
        "winning_trades": wins,
        "losing_trades": losses,
        "win_rate": round((wins / total_round_trips) * 100, 3) if total_round_trips > 0 else 0.0,
        "total_realized_pnl": round(sum(realized_pnls), 3),
        "profit_factor": round(gross_profit / gross_loss, 3) if gross_loss > 0 else None,
        "max_drawdown_yen": round(max_drawdown, 3),
        "open_position_qty": position.qty,
    }
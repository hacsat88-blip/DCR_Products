"""SQLite ベースの永続化レイヤー。取引・判断・日次統計を保存する。"""
from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any, Iterator


SCHEMA = """
CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    action TEXT NOT NULL,
    price REAL NOT NULL,
    qty INTEGER NOT NULL,
    pnl REAL NOT NULL DEFAULT 0,
    timestamp TEXT NOT NULL,
    session_date TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_trades_date ON trades(session_date);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);

CREATE TABLE IF NOT EXISTS decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    action TEXT NOT NULL,
    reason TEXT NOT NULL DEFAULT '',
    confidence REAL NOT NULL DEFAULT 0,
    price REAL NOT NULL DEFAULT 0,
    rsi14 REAL NOT NULL DEFAULT 50,
    volume_ratio REAL NOT NULL DEFAULT 0,
    timestamp TEXT NOT NULL,
    session_date TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_decisions_date ON decisions(session_date);

CREATE TABLE IF NOT EXISTS daily_stats (
    session_date TEXT PRIMARY KEY,
    total_pnl REAL NOT NULL DEFAULT 0,
    trade_count INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    max_drawdown REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS price_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    price REAL NOT NULL,
    volume INTEGER NOT NULL,
    timestamp TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_price_symbol_ts ON price_snapshots(symbol, timestamp);

CREATE TABLE IF NOT EXISTS advisor_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_date TEXT NOT NULL,
    symbol TEXT NOT NULL DEFAULT '',
    risk_state TEXT NOT NULL,
    should_stop_new_entries INTEGER NOT NULL DEFAULT 0,
    should_reduce_size INTEGER NOT NULL DEFAULT 0,
    reason TEXT NOT NULL DEFAULT '',
    rule_issue TEXT NOT NULL DEFAULT '',
    improvement TEXT NOT NULL DEFAULT '',
    api_error INTEGER NOT NULL DEFAULT 0,
    input_snapshot TEXT NOT NULL DEFAULT '{}',
    timestamp TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_advisor_reviews_date ON advisor_reviews(session_date);
"""


@dataclass
class TradeRecord:
    symbol: str
    action: str
    price: float
    qty: int
    pnl: float
    timestamp: str
    session_date: str


@dataclass
class DecisionRecord:
    symbol: str
    action: str
    reason: str
    confidence: float
    price: float
    rsi14: float
    volume_ratio: float
    timestamp: str
    session_date: str


@dataclass
class AdvisorReviewRecord:
    session_date: str
    symbol: str
    risk_state: str
    should_stop_new_entries: bool
    should_reduce_size: bool
    reason: str
    rule_issue: str
    improvement: str
    api_error: bool
    input_snapshot: str
    timestamp: str


class TradeStore:
    def __init__(self, db_path: str | Path = "data/autotrader.db") -> None:
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as conn:
            conn.executescript(SCHEMA)

    @contextmanager
    def _connect(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def insert_decision(self, rec: DecisionRecord) -> int:
        with self._connect() as conn:
            cur = conn.execute(
                """INSERT INTO decisions
                   (symbol, action, reason, confidence, price, rsi14, volume_ratio, timestamp, session_date)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (rec.symbol, rec.action, rec.reason, rec.confidence,
                 rec.price, rec.rsi14, rec.volume_ratio, rec.timestamp, rec.session_date),
            )
            return cur.lastrowid or 0

    def insert_trade(self, rec: TradeRecord) -> int:
        with self._connect() as conn:
            cur = conn.execute(
                """INSERT INTO trades
                   (symbol, action, price, qty, pnl, timestamp, session_date)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (rec.symbol, rec.action, rec.price, rec.qty, rec.pnl,
                 rec.timestamp, rec.session_date),
            )
            return cur.lastrowid or 0

    def insert_price_snapshot(self, symbol: str, price: float, volume: int, timestamp: str) -> None:
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO price_snapshots (symbol, price, volume, timestamp) VALUES (?, ?, ?, ?)",
                (symbol, price, volume, timestamp),
            )

    def insert_advisor_review(self, rec: AdvisorReviewRecord) -> int:
        with self._connect() as conn:
            cur = conn.execute(
                """INSERT INTO advisor_reviews
                   (session_date, symbol, risk_state, should_stop_new_entries, should_reduce_size,
                    reason, rule_issue, improvement, api_error, input_snapshot, timestamp)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    rec.session_date, rec.symbol, rec.risk_state,
                    int(rec.should_stop_new_entries), int(rec.should_reduce_size),
                    rec.reason, rec.rule_issue, rec.improvement, int(rec.api_error),
                    rec.input_snapshot, rec.timestamp,
                ),
            )
            return cur.lastrowid or 0

    def get_trades(self, session_date: str | None = None, symbol: str | None = None,
                   limit: int = 200) -> list[dict[str, Any]]:
        query = "SELECT * FROM trades WHERE 1=1"
        params: list[Any] = []
        if session_date:
            query += " AND session_date = ?"
            params.append(session_date)
        if symbol:
            query += " AND symbol = ?"
            params.append(symbol)
        query += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)
        with self._connect() as conn:
            rows = conn.execute(query, params).fetchall()
            return [dict(r) for r in rows]

    def get_price_history(self, symbol: str, limit: int = 200) -> list[dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT timestamp, price, volume FROM price_snapshots WHERE symbol = ? ORDER BY timestamp DESC LIMIT ?",
                (symbol, limit),
            ).fetchall()
            return [dict(r) for r in reversed(rows)]

    def get_recent_trade_summaries(self, session_date: str, limit: int = 5) -> list[dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                """SELECT symbol, action, pnl, timestamp
                   FROM trades
                   WHERE session_date = ?
                   ORDER BY timestamp DESC
                   LIMIT ?""",
                (session_date, limit),
            ).fetchall()
            return [
                {
                    "symbol": row["symbol"],
                    "side": row["action"],
                    "entry_reason": "local_rule_engine",
                    "result": row["pnl"],
                    "exit_reason": "order_result" if row["action"] == "sell" else "entry_record",
                    "timestamp": row["timestamp"],
                }
                for row in rows
            ]

    def compute_daily_report(self, session_date: str) -> dict[str, Any]:
        with self._connect() as conn:
            trades = conn.execute(
                "SELECT * FROM trades WHERE session_date = ? AND action = 'sell' ORDER BY timestamp",
                (session_date,),
            ).fetchall()

            if not trades:
                return {
                    "date": session_date,
                    "total_pnl": 0,
                    "trade_count": 0,
                    "wins": 0, "losses": 0,
                    "win_rate": 0.0,
                    "max_drawdown": 0,
                    "best_trade": None,
                    "worst_trade": None,
                    "cumulative": [],
                }

            wins = sum(1 for t in trades if t["pnl"] > 0)
            losses = sum(1 for t in trades if t["pnl"] < 0)
            total_pnl = sum(t["pnl"] for t in trades)

            cumulative: list[dict[str, Any]] = []
            running = 0.0
            peak = 0.0
            max_dd = 0.0
            for t in trades:
                running += t["pnl"]
                peak = max(peak, running)
                drawdown = running - peak
                if drawdown < max_dd:
                    max_dd = drawdown
                cumulative.append({"timestamp": t["timestamp"], "cumulative_pnl": running})

            best = max(trades, key=lambda t: t["pnl"])
            worst = min(trades, key=lambda t: t["pnl"])

            return {
                "date": session_date,
                "total_pnl": total_pnl,
                "trade_count": len(trades),
                "wins": wins, "losses": losses,
                "win_rate": wins / len(trades) if trades else 0.0,
                "max_drawdown": max_dd,
                "best_trade": {"symbol": best["symbol"], "pnl": best["pnl"], "timestamp": best["timestamp"]},
                "worst_trade": {"symbol": worst["symbol"], "pnl": worst["pnl"], "timestamp": worst["timestamp"]},
                "cumulative": cumulative,
            }

    def upsert_daily_stats(self, session_date: str) -> None:
        report = self.compute_daily_report(session_date)
        with self._connect() as conn:
            conn.execute(
                """INSERT INTO daily_stats (session_date, total_pnl, trade_count, wins, losses, max_drawdown)
                   VALUES (?, ?, ?, ?, ?, ?)
                   ON CONFLICT(session_date) DO UPDATE SET
                       total_pnl=excluded.total_pnl,
                       trade_count=excluded.trade_count,
                       wins=excluded.wins,
                       losses=excluded.losses,
                       max_drawdown=excluded.max_drawdown""",
                (session_date, report["total_pnl"], report["trade_count"],
                 report["wins"], report["losses"], report["max_drawdown"]),
            )


def session_date_str(dt: datetime | date) -> str:
    if isinstance(dt, datetime):
        return dt.date().isoformat()
    return dt.isoformat()

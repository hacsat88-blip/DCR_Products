"""SQLite トレードストアの検証"""
import pytest

from ..trade_store import DecisionRecord, TradeRecord, TradeStore


@pytest.fixture
def store(tmp_path):
    return TradeStore(tmp_path / "test.db")


def test_insert_and_get_trades(store):
    store.insert_trade(TradeRecord(
        symbol="7203", action="buy", price=2310, qty=100, pnl=0,
        timestamp="2026-05-13T10:00:00", session_date="2026-05-13",
    ))
    store.insert_trade(TradeRecord(
        symbol="7203", action="sell", price=2360, qty=100, pnl=5000,
        timestamp="2026-05-13T10:30:00", session_date="2026-05-13",
    ))

    trades = store.get_trades(session_date="2026-05-13")
    assert len(trades) == 2
    assert {t["action"] for t in trades} == {"buy", "sell"}


def test_filter_by_symbol(store):
    store.insert_trade(TradeRecord(
        symbol="7203", action="buy", price=2310, qty=100, pnl=0,
        timestamp="2026-05-13T10:00:00", session_date="2026-05-13",
    ))
    store.insert_trade(TradeRecord(
        symbol="8306", action="buy", price=1500, qty=100, pnl=0,
        timestamp="2026-05-13T10:05:00", session_date="2026-05-13",
    ))

    only_7203 = store.get_trades(symbol="7203")
    assert len(only_7203) == 1
    assert only_7203[0]["symbol"] == "7203"


def test_daily_report_aggregates_pnl(store):
    """3取引: +3000, -1500, +2000 → win_rate=2/3, max_dd=-1500"""
    for i, (sym, pnl, ts) in enumerate([
        ("7203", 3000, "2026-05-13T10:00:00"),
        ("8306", -1500, "2026-05-13T10:30:00"),
        ("9432", 2000, "2026-05-13T11:00:00"),
    ]):
        store.insert_trade(TradeRecord(
            symbol=sym, action="sell", price=1000, qty=100, pnl=pnl,
            timestamp=ts, session_date="2026-05-13",
        ))

    report = store.compute_daily_report("2026-05-13")
    assert report["total_pnl"] == 3500
    assert report["trade_count"] == 3
    assert report["wins"] == 2
    assert report["losses"] == 1
    assert report["win_rate"] == pytest.approx(2 / 3)
    assert report["max_drawdown"] == -1500
    assert report["best_trade"]["symbol"] == "7203"
    assert report["worst_trade"]["symbol"] == "8306"


def test_daily_report_empty_when_no_trades(store):
    report = store.compute_daily_report("2026-05-13")
    assert report["trade_count"] == 0
    assert report["total_pnl"] == 0
    assert report["best_trade"] is None


def test_insert_decision(store):
    store.insert_decision(DecisionRecord(
        symbol="7203", action="hold", reason="RSI範囲外",
        confidence=0.0, price=2310, rsi14=70, volume_ratio=1.2,
        timestamp="2026-05-13T10:00:00", session_date="2026-05-13",
    ))
    # 例外なく挿入できればOK


def test_price_snapshot_and_history(store):
    for i in range(3):
        store.insert_price_snapshot("7203", 2310 + i, 1_000_000, f"2026-05-13T10:0{i}:00")
    history = store.get_price_history("7203")
    assert len(history) == 3
    # 昇順で返ること
    assert history[0]["price"] == 2310
    assert history[2]["price"] == 2312


def test_upsert_daily_stats(store):
    store.insert_trade(TradeRecord(
        symbol="7203", action="sell", price=2360, qty=100, pnl=5000,
        timestamp="2026-05-13T10:30:00", session_date="2026-05-13",
    ))
    store.upsert_daily_stats("2026-05-13")
    # 再実行しても重複しないこと
    store.upsert_daily_stats("2026-05-13")

"""日次セッションリセットの検証"""
from datetime import date, datetime
import pytest
from ..risk_guard import RiskGuard


@pytest.fixture
def guard():
    return RiskGuard()


def test_initial_session_has_no_date(guard):
    assert guard.session.session_date is None


def test_ensure_today_initializes_on_first_call(guard):
    now = datetime(2026, 5, 13, 10, 0)
    reset = guard.ensure_today(now)
    assert reset
    assert guard.session.session_date == date(2026, 5, 13)


def test_ensure_today_no_reset_same_day(guard):
    now1 = datetime(2026, 5, 13, 10, 0)
    guard.ensure_today(now1)
    guard.session.daily_pnl = 2500

    now2 = datetime(2026, 5, 13, 14, 0)
    reset = guard.ensure_today(now2)
    assert not reset
    assert guard.session.daily_pnl == 2500


def test_ensure_today_resets_on_date_change(guard):
    """日付をまたいだら自動リセット"""
    guard.ensure_today(datetime(2026, 5, 13, 14, 30))
    guard.session.daily_pnl = -2800
    guard.session.position_count = 1
    guard.session.trading_stopped = True

    reset = guard.ensure_today(datetime(2026, 5, 14, 9, 0))
    assert reset
    assert guard.session.session_date == date(2026, 5, 14)
    assert guard.session.daily_pnl == 0.0
    assert guard.session.position_count == 0
    assert not guard.session.trading_stopped


def test_explicit_reset_clears_state(guard):
    guard.on_entry("7203", 2310, datetime(2026, 5, 13, 10, 0), lot=100)
    guard.on_exit("7203", -1500)
    assert guard.session.daily_pnl == -1500

    guard.reset_session(date(2026, 5, 14))
    assert guard.session.daily_pnl == 0
    assert guard.session.session_date == date(2026, 5, 14)
    assert "7203" not in guard.session.position_entry_prices

from datetime import datetime
import pytest
from ..risk_guard import RiskGuard


@pytest.fixture
def guard():
    return RiskGuard()


def now(h=10, m=0):
    return datetime(2026, 5, 12, h, m, 0)


def test_entry_allowed_normal(guard):
    result = guard.check_entry("7203", 2_310, 2_345, now())
    assert result.allowed


def test_entry_blocked_after_1450(guard):
    result = guard.check_entry("7203", 2_310, 2_345, now(14, 55))
    assert not result.allowed
    assert "14:50" in result.reason


def test_entry_blocked_max_positions(guard):
    guard.on_entry("7203", 2_310, now())
    guard.on_entry("6758", 12_500, now())
    result = guard.check_entry("9984", 8_900, 9_050, now())
    assert not result.allowed
    assert "2" in result.reason


def test_entry_blocked_daily_loss_reached(guard):
    guard.session.daily_pnl = -3_000
    result = guard.check_entry("7203", 2_310, 2_345, now())
    assert not result.allowed


def test_entry_blocked_profit_target_reached(guard):
    guard.session.daily_pnl = 5_000
    result = guard.check_entry("7203", 2_310, 2_345, now())
    assert not result.allowed


def test_exit_triggered_by_loss(guard):
    guard.on_entry("7203", 2_310, now())
    # -2000円 / 100株 = -20円/株 → 2290以下で損切り
    result = guard.check_exit("7203", 2_285, now(10, 30))
    assert result.allowed
    assert "損切り" in result.reason


def test_exit_triggered_by_timeout(guard):
    guard.on_entry("7203", 2_310, now(9, 30))
    result = guard.check_exit("7203", 2_320, now(10, 35))
    assert result.allowed
    assert "時間切れ" in result.reason


def test_trading_stops_after_daily_loss(guard):
    guard.on_entry("7203", 2_310, now())
    guard.on_exit("7203", -3_500)
    assert guard.session.trading_stopped
    result = guard.check_entry("6758", 12_500, 12_600, now(11, 0))
    assert not result.allowed


def test_trading_stops_after_profit_target(guard):
    guard.on_entry("7203", 2_310, now())
    guard.on_exit("7203", 5_200)
    assert guard.session.trading_stopped


def test_risk_budget_calculation(guard):
    guard.session.daily_pnl = -1_000
    assert guard.get_remaining_risk_budget() == -2_000

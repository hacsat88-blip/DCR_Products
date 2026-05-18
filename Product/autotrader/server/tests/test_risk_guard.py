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


def test_two_consecutive_losses_block_new_entries(guard):
    guard.on_entry("7203", 2_310, now())
    guard.on_exit("7203", -900)
    guard.on_entry("6758", 12_500, now(10, 10))
    guard.on_exit("6758", -800)

    assert guard.session.consecutive_losses == 2
    result = guard.check_entry("8306", 1_500, 1_540, now(10, 30))
    assert not result.allowed
    assert "新規建て禁止" in result.reason


def test_winning_trade_resets_consecutive_losses(guard):
    guard.on_entry("7203", 2_310, now())
    guard.on_exit("7203", -900)
    guard.on_entry("6758", 12_500, now(10, 10))
    guard.on_exit("6758", 1200)

    assert guard.session.consecutive_losses == 0


def test_api_failure_block_new_entries(guard):
    guard.block_new_entries("Codex app-serverエラー")
    result = guard.check_entry("7203", 2_310, 2_345, now())

    assert not result.allowed
    assert "Codex app-serverエラー" in result.reason


def test_risk_budget_calculation(guard):
    guard.session.daily_pnl = -1_000
    assert guard.get_remaining_risk_budget() == -2_000


def test_duplicate_entry_notification_is_ignored(guard):
    first = guard.on_entry("7203", 2_310, now())
    duplicate = guard.on_entry("7203", 2_320, now(10, 5))

    assert first.allowed
    assert not duplicate.allowed
    assert guard.session.trade_count == 1
    assert guard.session.position_count == 1
    assert guard.session.position_entry_prices["7203"] == 2_310


def test_unknown_exit_notification_is_ignored(guard):
    result = guard.on_exit("7203", -900)

    assert not result.allowed
    assert guard.session.daily_pnl == 0
    assert guard.session.consecutive_losses == 0
    assert guard.session.position_count == 0

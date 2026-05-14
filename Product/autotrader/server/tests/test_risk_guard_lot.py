"""lot対応の損切り検証（バグ修正後の動作）"""
from datetime import datetime
import pytest
from ..risk_guard import RiskGuard


def now(h=10, m=0):
    return datetime(2026, 5, 13, h, m, 0)


@pytest.fixture
def guard():
    return RiskGuard()


def test_exit_lot100_at_minus2000_total(guard):
    """lot=100株、株価2310で買い→2290で損失2000円ちょうど → 損切り発動"""
    guard.on_entry("7203", 2_310, now(), lot=100)
    result = guard.check_exit("7203", 2_290, now(10, 30))
    assert result.allowed
    assert "損切り" in result.reason


def test_exit_lot100_just_above_threshold(guard):
    """lot=100株、含み損1900円（-19円/株）はまだ損切りしない"""
    guard.on_entry("7203", 2_310, now(), lot=100)
    result = guard.check_exit("7203", 2_291, now(10, 30))
    assert not result.allowed


def test_exit_lot200_at_minus2000_total(guard):
    """lot=200株（500円銘柄等）、含み損-10円/株で総額-2000円 → 損切り発動"""
    guard.on_entry("9432", 500, now(), lot=200)
    # (490 - 500) * 200 = -2000円
    result = guard.check_exit("9432", 490, now(10, 30))
    assert result.allowed
    assert "損切り" in result.reason


def test_exit_lot200_not_triggered_below_threshold(guard):
    """lot=200、含み損1800円ではまだ損切りしない"""
    guard.on_entry("9432", 500, now(), lot=200)
    # (491 - 500) * 200 = -1800円
    result = guard.check_exit("9432", 491, now(10, 30))
    assert not result.allowed


def test_exit_lot500_correct_loss_threshold(guard):
    """lot=500株、含み損-4円/株で総額-2000円 → 損切り発動"""
    guard.on_entry("8306", 200, now(), lot=500)
    result = guard.check_exit("8306", 196, now(10, 30))
    assert result.allowed
    assert "損切り" in result.reason


def test_exit_default_lot_backward_compat(guard):
    """on_entry にlotを渡さない既存呼び出しは100株扱いで継続動作"""
    guard.on_entry("7203", 2_310, now())  # lot省略 → 100
    result = guard.check_exit("7203", 2_290, now(10, 30))
    assert result.allowed

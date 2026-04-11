import pytest
from datetime import datetime, time, timedelta
from server.models import TradeDecision, Position, RiskSettings
from server.engine.risk_guard import RiskGuard, WARMUP_SECONDS

SETTINGS = RiskSettings(
    limit_per_order=100_000,
    stop_loss_pct=3.0,
    max_qty_per_order=100,
)
BUY = TradeDecision(action="buy", qty=100, reason="テスト")
SELL = TradeDecision(action="sell", qty=100, reason="テスト")
HOLD = TradeDecision(action="hold", qty=0, reason="テスト")
MARKET_TIME = datetime(2026, 4, 12, 10, 0, 0)  # 平日 10:00
AFTER_HOURS = datetime(2026, 4, 12, 8, 0, 0)   # 市場前


@pytest.fixture
def guard():
    start = datetime.now() - timedelta(seconds=WARMUP_SECONDS + 1)
    return RiskGuard(settings=SETTINGS, start_time=start)


@pytest.fixture
def empty_position():
    return Position()


@pytest.fixture
def long_position():
    return Position(code="7203", qty=100, avg_cost=2500.0, pnl=0.0, pnl_pct=0.0)


def test_hold_during_warmup(empty_position):
    guard = RiskGuard(settings=SETTINGS, start_time=datetime.now())
    result = guard.apply(BUY, empty_position, 2500.0, datetime.now())
    assert result.action == "hold"
    assert "ウォームアップ" in result.reason


def test_hold_after_hours(guard, empty_position):
    result = guard.apply(BUY, empty_position, 2500.0, AFTER_HOURS)
    assert result.action == "hold"
    assert "市場時間外" in result.reason


def test_buy_allowed_in_market_hours(guard, empty_position):
    result = guard.apply(BUY, empty_position, 2500.0, MARKET_TIME)
    assert result.action == "buy"


def test_stop_loss_forces_sell(guard, long_position):
    long_position.pnl_pct = -3.5  # 損切りラインを超過
    result = guard.apply(HOLD, long_position, 2412.0, MARKET_TIME)
    assert result.action == "sell"
    assert "損切り" in result.reason


def test_stop_loss_not_triggered_within_limit(guard, long_position):
    long_position.pnl_pct = -2.9  # 損切りライン以内
    result = guard.apply(HOLD, long_position, 2427.0, MARKET_TIME)
    assert result.action == "hold"


def test_qty_capped_to_max(guard, empty_position):
    decision = TradeDecision(action="buy", qty=200, reason="多め")
    result = guard.apply(decision, empty_position, 500.0, MARKET_TIME)
    assert result.qty <= SETTINGS.max_qty_per_order


def test_buy_blocked_when_price_exceeds_limit(guard, empty_position):
    # 200,000円 × 1株 = 200,000円 > limit 100,000円（1株すら購入不可）
    result = guard.apply(BUY, empty_position, 200_000.0, MARKET_TIME)
    assert result.action == "hold"
    assert "上限" in result.reason


def test_buy_qty_adjusted_to_fit_limit(guard, empty_position):
    # 500円 × 100株 = 50,000円 < limit
    # 500円 × 200株 = 100,000円 = limit → qty は 200 まで許容
    decision = TradeDecision(action="buy", qty=300, reason="多め")
    result = guard.apply(decision, empty_position, 500.0, MARKET_TIME)
    assert result.action == "buy"
    assert result.qty * 500.0 <= SETTINGS.limit_per_order


def test_update_settings(guard):
    new_settings = RiskSettings(limit_per_order=200_000, stop_loss_pct=5.0, max_qty_per_order=200)
    guard.update_settings(new_settings)
    assert guard.settings.limit_per_order == 200_000


def test_market_hours_boundary_am_close(guard, empty_position):
    # 11:30:00 は AM クローズ時刻 → 市場時間外扱い
    t = time(11, 30, 0)
    now = datetime.combine(MARKET_TIME.date(), t)
    result = guard.apply(BUY, empty_position, 2500.0, now)
    assert result.action == "hold"
    assert "市場時間外" in result.reason


def test_market_hours_boundary_pm_close(guard, empty_position):
    # 15:30:00 は PM クローズ時刻 → 市場時間外扱い
    t = time(15, 30, 0)
    now = datetime.combine(MARKET_TIME.date(), t)
    result = guard.apply(BUY, empty_position, 2500.0, now)
    assert result.action == "hold"
    assert "市場時間外" in result.reason


def test_ai_sell_not_qty_capped(guard):
    # 200株の売り注文はmax_qty_per_order=100にキャップされてはならない
    position = Position(code="7203", qty=200, avg_cost=2500.0, pnl=0.0, pnl_pct=0.0)
    decision = TradeDecision(action="sell", qty=200, reason="全売り")
    result = guard.apply(decision, position, 2500.0, MARKET_TIME)
    assert result.action == "sell"
    assert result.qty == 200

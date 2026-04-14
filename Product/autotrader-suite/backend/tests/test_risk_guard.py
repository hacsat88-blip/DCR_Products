import pytest
from datetime import datetime, time, timedelta
from server.models import TradeDecision, Position, RiskSettings
from server.engine.risk_guard import RiskGuard, WARMUP_SECONDS
from server.engine.trade_setup import TradeSetup

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


def make_setup(
    *,
    five_bar_range_pct: float = 1.5,
    last_bar_volume_ratio: float = 1.5,
    reference_gap_pct: float | None = 1.0,
    price_position_in_range: float = 0.8,
    breakout_above_prev_high: bool = True,
    spread_bps: float | None = 8.0,
    minutes_from_session_open: int = 20,
    news_halt: bool = False,
    news_note: str | None = None,
) -> TradeSetup:
    return TradeSetup(
        five_bar_high=252.0,
        five_bar_low=248.0,
        five_bar_range_pct=five_bar_range_pct,
        last_bar_volume_ratio=last_bar_volume_ratio,
        reference_gap_pct=reference_gap_pct,
        price_position_in_range=price_position_in_range,
        breakout_above_prev_high=breakout_above_prev_high,
        breakdown_below_prev_low=False,
        spread_bps=spread_bps,
        minutes_from_session_open=minutes_from_session_open,
        news_halt=news_halt,
        news_note=news_note,
    )


@pytest.fixture
def guard():
    start = AFTER_HOURS - timedelta(seconds=WARMUP_SECONDS + 1)
    return RiskGuard(settings=SETTINGS, start_time=start)


@pytest.fixture
def empty_position():
    return Position()


@pytest.fixture
def long_position():
    return Position(code="7203", qty=100, avg_cost=2500.0, pnl=0.0, pnl_pct=0.0)


def test_hold_during_warmup(empty_position):
    guard = RiskGuard(settings=SETTINGS, start_time=datetime.now())
    result = guard.apply(BUY, empty_position, 250.0, datetime.now())
    assert result.action == "hold"
    assert "ウォームアップ" in result.reason


def test_hold_after_hours(guard, empty_position):
    result = guard.apply(BUY, empty_position, 250.0, AFTER_HOURS)
    assert result.action == "hold"
    assert "市場時間外" in result.reason


def test_buy_allowed_in_market_hours(guard, empty_position):
    result = guard.apply(BUY, empty_position, 250.0, MARKET_TIME)
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
    guard.update_settings(RiskSettings(limit_per_order=100_000, manual_price_max=300_000))
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


def test_buy_qty_adjusted_to_fit_actual_available_cash(guard, empty_position):
    decision = TradeDecision(action="buy", qty=100, reason="余力確認")
    result = guard.apply(
        decision,
        empty_position,
        500.0,
        MARKET_TIME,
        available_cash_actual=25_000,
    )

    assert result.action == "buy"
    assert result.qty == 50


def test_buy_blocked_when_actual_available_cash_is_zero(guard, empty_position):
    result = guard.apply(
        BUY,
        empty_position,
        250.0,
        MARKET_TIME,
        available_cash_actual=0,
    )

    assert result.action == "hold"
    assert "実口座余力" in result.reason


def test_buy_blocked_when_price_outside_effective_band(guard, empty_position):
    result = guard.apply(BUY, empty_position, 550.0, MARKET_TIME)
    assert result.action == "hold"
    assert "価格帯" in result.reason


def test_buy_uses_auto_price_band_when_manual_priority_disabled(empty_position):
    settings = RiskSettings(
        trading_mode="conservative",
        available_cash=290_000,
        prioritize_manual_price_band=False,
    )
    start = AFTER_HOURS - timedelta(seconds=WARMUP_SECONDS + 1)
    guard = RiskGuard(settings=settings, start_time=start)
    result = guard.apply(BUY, empty_position, 450.0, MARKET_TIME)
    assert result.action == "hold"
    assert "価格帯" in result.reason


def test_buy_blocked_when_daily_order_limit_reached(empty_position):
    settings = RiskSettings(max_daily_orders=1)
    start = AFTER_HOURS - timedelta(seconds=WARMUP_SECONDS + 1)
    guard = RiskGuard(settings=settings, start_time=start)
    guard.record_order(TradeDecision(action="buy", qty=10, reason="1回目"), MARKET_TIME)
    result = guard.apply(BUY, empty_position, 300.0, MARKET_TIME)
    assert result.action == "hold"
    assert "日次発注上限" in result.reason


def test_buy_blocked_when_max_concurrent_positions_reached(guard, long_position):
    guard.update_settings(RiskSettings(max_concurrent_positions=1))
    result = guard.apply(BUY, long_position, 300.0, MARKET_TIME)
    assert result.action == "hold"
    assert "同時保有" in result.reason


def test_update_settings(guard):
    new_settings = RiskSettings(limit_per_order=200_000, stop_loss_pct=5.0, max_qty_per_order=200)
    guard.update_settings(new_settings)
    assert guard.settings.limit_per_order == 200_000


def test_market_hours_boundary_am_close(guard, empty_position):
    # 11:30:00 は AM クローズ時刻 → 市場時間外扱い
    t = time(11, 30, 0)
    now = datetime.combine(MARKET_TIME.date(), t)
    result = guard.apply(BUY, empty_position, 250.0, now)
    assert result.action == "hold"
    assert "市場時間外" in result.reason


def test_market_hours_boundary_pm_close(guard, empty_position):
    # 15:30:00 は PM クローズ時刻 → 市場時間外扱い
    t = time(15, 30, 0)
    now = datetime.combine(MARKET_TIME.date(), t)
    result = guard.apply(BUY, empty_position, 250.0, now)
    assert result.action == "hold"
    assert "市場時間外" in result.reason


def test_ai_sell_not_qty_capped(guard):
    # 200株の売り注文はmax_qty_per_order=100にキャップされてはならない
    position = Position(code="7203", qty=200, avg_cost=2500.0, pnl=0.0, pnl_pct=0.0)
    decision = TradeDecision(action="sell", qty=200, reason="全売り")
    result = guard.apply(decision, position, 2500.0, MARKET_TIME)
    assert result.action == "sell"
    assert result.qty == 200


def test_buy_blocked_when_five_bar_range_is_too_small(guard, empty_position):
    result = guard.apply(
        BUY,
        empty_position,
        250.0,
        MARKET_TIME,
        setup=make_setup(five_bar_range_pct=0.2),
    )
    assert result.action == "hold"
    assert "値幅" in result.reason


def test_buy_blocked_when_last_bar_volume_ratio_is_too_low(guard, empty_position):
    result = guard.apply(
        BUY,
        empty_position,
        250.0,
        MARKET_TIME,
        setup=make_setup(last_bar_volume_ratio=0.8),
    )
    assert result.action == "hold"
    assert "出来高" in result.reason


def test_buy_blocked_when_reference_gap_is_too_large(guard, empty_position):
    result = guard.apply(
        BUY,
        empty_position,
        250.0,
        MARKET_TIME,
        setup=make_setup(reference_gap_pct=6.5),
    )
    assert result.action == "hold"
    assert "乖離" in result.reason


def test_buy_blocked_near_close(guard, empty_position):
    near_close = datetime(2026, 4, 12, 15, 25, 0)
    result = guard.apply(BUY, empty_position, 250.0, near_close)
    assert result.action == "hold"
    assert "引け前" in result.reason


def test_force_sell_before_close_when_position_exists(guard, long_position):
    near_close = datetime(2026, 4, 12, 15, 25, 0)
    result = guard.apply(HOLD, long_position, 2500.0, near_close)
    assert result.action == "sell"
    assert result.qty == long_position.qty
    assert "引け前" in result.reason


def test_buy_blocked_when_daily_loss_limit_reached(empty_position):
    settings = RiskSettings(
        max_daily_loss_yen=1_000,
        max_daily_orders=10,
        max_concurrent_positions=2,
        cooldown_minutes_after_loss=0,
        max_consecutive_losses=5,
    )
    start = AFTER_HOURS - timedelta(seconds=WARMUP_SECONDS + 1)
    guard = RiskGuard(settings=settings, start_time=start)
    guard.record_order(
        TradeDecision(action="sell", qty=100, reason="損切り"),
        MARKET_TIME,
        realized_pnl=-1_200.0,
    )

    result = guard.apply(BUY, empty_position, 300.0, MARKET_TIME + timedelta(minutes=1))
    assert result.action == "hold"
    assert "日次損失" in result.reason


def test_buy_blocked_during_loss_cooldown(empty_position):
    settings = RiskSettings(
        max_daily_loss_yen=5_000,
        max_daily_orders=10,
        max_concurrent_positions=2,
        cooldown_minutes_after_loss=15,
        max_consecutive_losses=5,
    )
    start = AFTER_HOURS - timedelta(seconds=WARMUP_SECONDS + 1)
    guard = RiskGuard(settings=settings, start_time=start)
    guard.record_order(
        TradeDecision(action="sell", qty=100, reason="損切り"),
        MARKET_TIME,
        realized_pnl=-500.0,
    )

    result = guard.apply(BUY, empty_position, 300.0, MARKET_TIME + timedelta(minutes=5))
    assert result.action == "hold"
    assert "クールダウン" in result.reason


def test_buy_blocked_when_consecutive_loss_limit_reached(empty_position):
    settings = RiskSettings(
        max_daily_loss_yen=5_000,
        max_daily_orders=10,
        max_concurrent_positions=2,
        cooldown_minutes_after_loss=0,
        max_consecutive_losses=2,
    )
    start = AFTER_HOURS - timedelta(seconds=WARMUP_SECONDS + 1)
    guard = RiskGuard(settings=settings, start_time=start)
    guard.record_order(
        TradeDecision(action="sell", qty=100, reason="1敗"),
        MARKET_TIME,
        realized_pnl=-300.0,
    )
    guard.record_order(
        TradeDecision(action="sell", qty=100, reason="2敗"),
        MARKET_TIME + timedelta(minutes=1),
        realized_pnl=-200.0,
    )

    result = guard.apply(BUY, empty_position, 300.0, MARKET_TIME + timedelta(minutes=2))
    assert result.action == "hold"
    assert "連敗" in result.reason


def test_buy_blocked_during_opening_cooldown(guard, empty_position):
    result = guard.apply(
        BUY,
        empty_position,
        250.0,
        datetime(2026, 4, 12, 9, 3, 0),
        setup=make_setup(minutes_from_session_open=3),
    )
    assert result.action == "hold"
    assert "寄り付き" in result.reason


def test_buy_blocked_when_spread_is_too_wide(guard, empty_position):
    result = guard.apply(
        BUY,
        empty_position,
        250.0,
        MARKET_TIME,
        setup=make_setup(spread_bps=35.0),
    )
    assert result.action == "hold"
    assert "スプレッド" in result.reason


def test_buy_blocked_when_news_halt_is_set(guard, empty_position):
    result = guard.apply(
        BUY,
        empty_position,
        250.0,
        MARKET_TIME,
        setup=make_setup(news_halt=True, news_note="決算速報"),
    )
    assert result.action == "hold"
    assert "ニュース" in result.reason

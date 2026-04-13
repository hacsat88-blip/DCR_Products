import pytest

from server.engine.trade_setup import build_trade_setup
from server.models import PriceRequest


def test_build_trade_setup_derives_intraday_features():
    req = PriceRequest(
        code="7203",
        price=106.0,
        volume=20_000,
        ohlc=[
            {"o": 100.0, "h": 101.0, "l": 99.0, "c": 100.0, "v": 100},
            {"o": 100.0, "h": 102.0, "l": 99.0, "c": 101.0, "v": 100},
            {"o": 101.0, "h": 103.0, "l": 100.0, "c": 102.0, "v": 100},
            {"o": 102.0, "h": 104.0, "l": 101.0, "c": 103.0, "v": 100},
            {"o": 103.0, "h": 105.0, "l": 102.0, "c": 104.0, "v": 200},
        ],
        timestamp="2026-04-12T10:00:00",
    )

    setup = build_trade_setup(req, {"current": 100.0})

    assert setup.five_bar_high == 105.0
    assert setup.five_bar_low == 99.0
    assert setup.five_bar_range_pct == pytest.approx((6.0 / 106.0) * 100, abs=0.001)
    assert setup.last_bar_volume_ratio == pytest.approx(200 / 120, abs=0.001)
    assert setup.reference_gap_pct == pytest.approx(6.0, abs=0.001)
    assert setup.price_position_in_range == pytest.approx((106.0 - 99.0) / 6.0, abs=0.001)
    assert setup.breakout_above_prev_high is True
    assert setup.breakdown_below_prev_low is False


def test_build_trade_setup_handles_flat_range_without_division_error():
    req = PriceRequest(
        code="7203",
        price=100.0,
        volume=10_000,
        ohlc=[
            {"o": 100.0, "h": 100.0, "l": 100.0, "c": 100.0, "v": 50},
        ],
        timestamp="2026-04-12T10:00:00",
    )

    setup = build_trade_setup(req, None)

    assert setup.five_bar_range_pct == 0.0
    assert setup.last_bar_volume_ratio == 1.0
    assert setup.reference_gap_pct is None
    assert setup.price_position_in_range == 0.5
    assert setup.breakout_above_prev_high is False
    assert setup.breakdown_below_prev_low is False


def test_build_trade_setup_computes_spread_open_minutes_and_news_halt():
    req = PriceRequest(
        code="7203",
        price=100.0,
        volume=10_000,
        bid=99.8,
        ask=100.2,
        news_halt=True,
        news_note="特別気配",
        ohlc=[
            {"o": 99.0, "h": 100.0, "l": 98.5, "c": 99.5, "v": 100},
            {"o": 99.5, "h": 100.2, "l": 99.2, "c": 100.0, "v": 120},
        ],
        timestamp="2026-04-12T09:03:00",
    )

    setup = build_trade_setup(req, None)

    assert setup.spread_bps == pytest.approx(40.0, abs=0.001)
    assert setup.minutes_from_session_open == 3
    assert setup.news_halt is True
    assert setup.news_note == "特別気配"
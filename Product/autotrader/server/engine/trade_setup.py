from dataclasses import dataclass
from datetime import datetime, time

from server.models import PriceRequest

_MARKET_AM_OPEN = time(9, 0)
_MARKET_PM_OPEN = time(12, 30)


@dataclass(frozen=True)
class TradeSetup:
    five_bar_high: float
    five_bar_low: float
    five_bar_range_pct: float
    last_bar_volume_ratio: float
    reference_gap_pct: float | None
    price_position_in_range: float
    breakout_above_prev_high: bool
    breakdown_below_prev_low: bool
    spread_bps: float | None
    minutes_from_session_open: int
    news_halt: bool
    news_note: str | None


def _minutes_from_session_open(timestamp: datetime) -> int:
    session_open = _MARKET_PM_OPEN if timestamp.time() >= _MARKET_PM_OPEN else _MARKET_AM_OPEN
    opened_at = datetime.combine(timestamp.date(), session_open)
    return max(0, int((timestamp - opened_at).total_seconds() // 60))


def build_trade_setup(
    req: PriceRequest,
    reference_snapshot: dict[str, object] | None,
) -> TradeSetup:
    bars = req.ohlc
    five_bar_high = max(bar.h for bar in bars)
    five_bar_low = min(bar.l for bar in bars)
    price_range = max(0.0, five_bar_high - five_bar_low)
    five_bar_range_pct = (price_range / req.price) * 100 if req.price > 0 else 0.0

    average_volume = sum(bar.v for bar in bars) / len(bars)
    last_bar_volume_ratio = bars[-1].v / average_volume if average_volume > 0 else 1.0

    reference_gap_pct = None
    reference_price_raw = None if reference_snapshot is None else reference_snapshot.get("current")
    if reference_price_raw is not None:
        reference_price = float(reference_price_raw)
        if reference_price > 0:
            reference_gap_pct = ((req.price - reference_price) / reference_price) * 100

    if price_range > 0:
        price_position_in_range = (req.price - five_bar_low) / price_range
    else:
        price_position_in_range = 0.5

    breakout_above_prev_high = False
    breakdown_below_prev_low = False
    if len(bars) > 1:
        prev_high = max(bar.h for bar in bars[:-1])
        prev_low = min(bar.l for bar in bars[:-1])
        breakout_above_prev_high = req.price > prev_high
        breakdown_below_prev_low = req.price < prev_low

    spread_bps = None
    if req.bid is not None and req.ask is not None and req.price > 0:
        spread_bps = ((req.ask - req.bid) / req.price) * 10_000

    return TradeSetup(
        five_bar_high=five_bar_high,
        five_bar_low=five_bar_low,
        five_bar_range_pct=five_bar_range_pct,
        last_bar_volume_ratio=last_bar_volume_ratio,
        reference_gap_pct=reference_gap_pct,
        price_position_in_range=price_position_in_range,
        breakout_above_prev_high=breakout_above_prev_high,
        breakdown_below_prev_low=breakdown_below_prev_low,
        spread_bps=spread_bps,
        minutes_from_session_open=_minutes_from_session_open(req.timestamp),
        news_halt=req.news_halt,
        news_note=req.news_note,
    )
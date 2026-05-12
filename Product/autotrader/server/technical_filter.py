from dataclasses import dataclass
from datetime import time

from .capital_router import TierConfig


TRADE_SESSIONS = [
    (time(9, 15), time(11, 20)),
    (time(12, 30), time(14, 50)),
]


@dataclass
class PriceData:
    symbol: str
    price: float
    volume: int
    avg_volume_5d: int
    rsi14: float
    prev_close: float
    current_time: time


@dataclass
class FilterResult:
    passed: bool
    reason: str


class TechnicalFilter:
    def check(self, data: PriceData, config: TierConfig) -> FilterResult:
        if not self._in_trade_session(data.current_time):
            return FilterResult(False, "取引時間外")

        if data.avg_volume_5d == 0:
            return FilterResult(False, "出来高データなし")

        volume_ratio = data.volume / data.avg_volume_5d
        if volume_ratio < config.volume_ratio_threshold:
            return FilterResult(
                False,
                f"出来高不足 {volume_ratio:.1f}倍 < {config.volume_ratio_threshold}倍",
            )

        if not (config.rsi_min <= data.rsi14 <= config.rsi_max):
            return FilterResult(
                False,
                f"RSI範囲外 {data.rsi14:.1f} (許容: {config.rsi_min}〜{config.rsi_max})",
            )

        if data.prev_close > 0:
            price_change_pct = (data.price - data.prev_close) / data.prev_close * 100
            if not (config.price_change_min <= price_change_pct <= config.price_change_max):
                return FilterResult(
                    False,
                    f"前日比範囲外 {price_change_pct:+.1f}%",
                )

        return FilterResult(True, "フィルター通過")

    def _in_trade_session(self, t: time) -> bool:
        return any(start <= t <= end for start, end in TRADE_SESSIONS)

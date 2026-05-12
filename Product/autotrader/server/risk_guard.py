from dataclasses import dataclass, field
from datetime import datetime, time
from typing import Optional


RULES = {
    "max_daily_loss":      -3_000,
    "daily_profit_target":  5_000,
    "max_loss_per_trade":  -2_000,
    "min_rr_ratio":          1.5,
    "max_positions":            2,
    "max_hold_minutes":        60,
    "no_new_entry_after":   time(14, 50),
}


@dataclass
class GuardResult:
    allowed: bool
    reason: str


@dataclass
class TradeSession:
    daily_pnl: float = 0.0
    position_count: int = 0
    trading_stopped: bool = False
    stop_reason: str = ""

    position_open_times: dict[str, datetime] = field(default_factory=dict)
    position_entry_prices: dict[str, float] = field(default_factory=dict)


class RiskGuard:
    def __init__(self) -> None:
        self.session = TradeSession()

    def check_entry(self, symbol: str, price: float, target_price: float, now: datetime) -> GuardResult:
        if self.session.trading_stopped:
            return GuardResult(False, f"取引停止中: {self.session.stop_reason}")

        if now.time() >= RULES["no_new_entry_after"]:
            return GuardResult(False, "14:50以降は新規エントリー禁止")

        if self.session.position_count >= RULES["max_positions"]:
            return GuardResult(False, f"最大同時保有数 {RULES['max_positions']}銘柄に達している")

        if self.session.daily_pnl <= RULES["max_daily_loss"]:
            self._stop_trading("1日最大損失到達")
            return GuardResult(False, "1日最大損失(-3000円)到達")

        if self.session.daily_pnl >= RULES["daily_profit_target"]:
            self._stop_trading("本日利益目標達成")
            return GuardResult(False, "本日利益目標(+5000円)達成済み")

        reward = target_price - price
        risk = price - (price + RULES["max_loss_per_trade"] / 100)
        if risk > 0 and (reward / risk) < RULES["min_rr_ratio"]:
            return GuardResult(False, f"RR比不足 {reward/risk:.2f} < {RULES['min_rr_ratio']}")

        return GuardResult(True, "エントリー許可")

    def on_entry(self, symbol: str, price: float, now: datetime) -> None:
        self.session.position_count += 1
        self.session.position_open_times[symbol] = now
        self.session.position_entry_prices[symbol] = price

    def check_exit(self, symbol: str, current_price: float, now: datetime) -> GuardResult:
        entry_price = self.session.position_entry_prices.get(symbol)
        if entry_price is None:
            return GuardResult(False, "未保有銘柄")

        unrealized_pnl = current_price - entry_price
        if unrealized_pnl <= RULES["max_loss_per_trade"] / 100:
            return GuardResult(True, f"損切り発動 含み損 {unrealized_pnl:+.0f}円")

        open_time = self.session.position_open_times.get(symbol)
        if open_time:
            elapsed = (now - open_time).total_seconds() / 60
            if elapsed >= RULES["max_hold_minutes"]:
                return GuardResult(True, f"時間切れ {elapsed:.0f}分保有")

        return GuardResult(False, "保有継続")

    def on_exit(self, symbol: str, pnl: float) -> None:
        self.session.daily_pnl += pnl
        self.session.position_count = max(0, self.session.position_count - 1)
        self.session.position_open_times.pop(symbol, None)
        self.session.position_entry_prices.pop(symbol, None)

        if self.session.daily_pnl <= RULES["max_daily_loss"]:
            self._stop_trading("1日最大損失到達")
        elif self.session.daily_pnl >= RULES["daily_profit_target"]:
            self._stop_trading("本日利益目標達成")

    def get_remaining_risk_budget(self) -> float:
        return RULES["max_daily_loss"] - self.session.daily_pnl

    def _stop_trading(self, reason: str) -> None:
        if not self.session.trading_stopped:
            self.session.trading_stopped = True
            self.session.stop_reason = reason

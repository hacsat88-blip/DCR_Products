from dataclasses import dataclass, field
from datetime import date, datetime, time


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
    session_date: date | None = None
    daily_pnl: float = 0.0
    trade_count: int = 0
    consecutive_losses: int = 0
    position_count: int = 0
    trading_stopped: bool = False
    stop_reason: str = ""
    new_entries_blocked: bool = False
    new_entries_block_reason: str = ""

    position_open_times: dict[str, datetime] = field(default_factory=dict)
    position_entry_prices: dict[str, float] = field(default_factory=dict)
    position_lots: dict[str, int] = field(default_factory=dict)


class RiskGuard:
    def __init__(self) -> None:
        self.session = TradeSession()

    def reset_session(self, session_date: date) -> None:
        self.session = TradeSession(session_date=session_date)

    def ensure_today(self, now: datetime) -> bool:
        if self.session.session_date != now.date():
            self.reset_session(now.date())
            return True
        return False

    def check_entry(
        self, symbol: str, price: float, target_price: float, now: datetime, lot: int = 100
    ) -> GuardResult:
        if self.session.trading_stopped:
            return GuardResult(False, f"取引停止中: {self.session.stop_reason}")

        if self.session.new_entries_blocked:
            return GuardResult(False, f"新規建て禁止: {self.session.new_entries_block_reason}")

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

        reward = (target_price - price) * lot
        risk = abs(RULES["max_loss_per_trade"])
        if reward / risk < RULES["min_rr_ratio"]:
            return GuardResult(False, f"RR比不足 {reward/risk:.2f} < {RULES['min_rr_ratio']}")

        return GuardResult(True, "エントリー許可")

    def on_entry(self, symbol: str, price: float, now: datetime, lot: int = 100) -> GuardResult:
        if symbol in self.session.position_entry_prices:
            return GuardResult(False, f"重複エントリー通知を無視: {symbol}")

        self.session.trade_count += 1
        self.session.position_open_times[symbol] = now
        self.session.position_entry_prices[symbol] = price
        self.session.position_lots[symbol] = lot
        self.session.position_count = len(self.session.position_entry_prices)
        return GuardResult(True, "エントリー記録")

    def check_exit(self, symbol: str, current_price: float, now: datetime) -> GuardResult:
        entry_price = self.session.position_entry_prices.get(symbol)
        if entry_price is None:
            return GuardResult(False, "未保有銘柄")

        lot = self.session.position_lots.get(symbol, 100)
        total_unrealized = (current_price - entry_price) * lot
        if total_unrealized <= RULES["max_loss_per_trade"]:
            return GuardResult(True, f"損切り発動 含み損 {total_unrealized:+.0f}円")

        open_time = self.session.position_open_times.get(symbol)
        if open_time:
            elapsed = (now - open_time).total_seconds() / 60
            if elapsed >= RULES["max_hold_minutes"]:
                return GuardResult(True, f"時間切れ {elapsed:.0f}分保有")

        return GuardResult(False, "保有継続")

    def on_exit(self, symbol: str, pnl: float) -> GuardResult:
        if symbol not in self.session.position_entry_prices:
            return GuardResult(False, f"未保有銘柄の決済通知を無視: {symbol}")

        self.session.daily_pnl += pnl
        if pnl < 0:
            self.session.consecutive_losses += 1
            if self.session.consecutive_losses >= 2:
                self.block_new_entries("連敗2回到達")
        elif pnl > 0:
            self.session.consecutive_losses = 0

        self.session.position_open_times.pop(symbol, None)
        self.session.position_entry_prices.pop(symbol, None)
        self.session.position_lots.pop(symbol, None)
        self.session.position_count = len(self.session.position_entry_prices)

        if self.session.daily_pnl <= RULES["max_daily_loss"]:
            self._stop_trading("1日最大損失到達")
        elif self.session.daily_pnl >= RULES["daily_profit_target"]:
            self._stop_trading("本日利益目標達成")

        return GuardResult(True, "決済記録")

    def get_remaining_risk_budget(self) -> float:
        # 戻り値は負数。例: -3000 = 残余¥3,000 / 0 = 上限到達
        # フロント側: Math.abs(budget) で表示、(maxRisk + budget)/maxRisk で使用率計算
        return RULES["max_daily_loss"] - self.session.daily_pnl

    def block_new_entries(self, reason: str) -> None:
        if not self.session.new_entries_blocked:
            self.session.new_entries_blocked = True
            self.session.new_entries_block_reason = reason

    def _stop_trading(self, reason: str) -> None:
        if not self.session.trading_stopped:
            self.session.trading_stopped = True
            self.session.stop_reason = reason
        self.block_new_entries(reason)

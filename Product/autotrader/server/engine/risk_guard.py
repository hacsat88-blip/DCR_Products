from datetime import datetime, time, timedelta
from server.models import RiskRuntimeSnapshot, TradeDecision, Position, RiskSettings
from server.engine.trade_setup import TradeSetup

WARMUP_SECONDS = 30
_MARKET_AM = (time(9, 0), time(11, 30))
_MARKET_PM = (time(12, 30), time(15, 30))


class RiskGuard:
    def __init__(self, settings: RiskSettings, start_time: datetime):
        self._settings = settings
        self._start_time = start_time
        self._order_date = start_time.date()
        self._daily_order_count = 0
        self._daily_realized_pnl = 0.0
        self._consecutive_loss_count = 0
        self._cooldown_until: datetime | None = None

    @property
    def settings(self) -> RiskSettings:
        return self._settings

    def update_settings(self, settings: RiskSettings):
        self._settings = settings

    @property
    def daily_order_count(self) -> int:
        return self._daily_order_count

    def runtime_snapshot(self, now: datetime | None = None) -> RiskRuntimeSnapshot:
        current = now or datetime.now()
        self._reset_daily_state_if_needed(current)

        cooldown_remaining = 0
        if self._cooldown_until is not None:
            if current >= self._cooldown_until:
                self._cooldown_until = None
            else:
                cooldown_remaining = int((self._cooldown_until - current).total_seconds())

        entry_block_reason = None
        if self._daily_realized_pnl <= -self._settings.max_daily_loss_yen:
            entry_block_reason = "日次損失上限に到達"
        elif cooldown_remaining > 0:
            entry_block_reason = "損失後クールダウン中"
        elif self._consecutive_loss_count >= self._settings.max_consecutive_losses:
            entry_block_reason = "連敗上限に到達"

        return RiskRuntimeSnapshot(
            daily_order_count=self._daily_order_count,
            daily_realized_pnl=round(self._daily_realized_pnl, 3),
            consecutive_loss_count=self._consecutive_loss_count,
            cooldown_remaining_sec=cooldown_remaining,
            entry_blocked=entry_block_reason is not None,
            entry_block_reason=entry_block_reason,
        )

    def _reset_daily_state_if_needed(self, now: datetime):
        if self._order_date != now.date():
            self._order_date = now.date()
            self._daily_order_count = 0
            self._daily_realized_pnl = 0.0
            self._consecutive_loss_count = 0
            self._cooldown_until = None

    def record_order(
        self,
        decision: TradeDecision,
        now: datetime,
        realized_pnl: float = 0.0,
    ):
        self._reset_daily_state_if_needed(now)
        if decision.action in {"buy", "sell"} and decision.qty > 0:
            self._daily_order_count += 1
        if decision.action == "sell" and decision.qty > 0:
            self._daily_realized_pnl += realized_pnl
            if realized_pnl < 0:
                self._consecutive_loss_count += 1
                if self._settings.cooldown_minutes_after_loss > 0:
                    self._cooldown_until = now + timedelta(
                        minutes=self._settings.cooldown_minutes_after_loss
                    )
            elif realized_pnl > 0:
                self._consecutive_loss_count = 0
                self._cooldown_until = None

    def _holding_slots_used(self, position: Position) -> int:
        return 1 if position.qty > 0 else 0

    def _near_close_cutoff(self, now: datetime) -> datetime:
        close_at = datetime.combine(now.date(), _MARKET_PM[1])
        return close_at - timedelta(minutes=self._settings.flat_before_close_minutes)

    def _is_near_close(self, now: datetime) -> bool:
        return now >= self._near_close_cutoff(now)

    def apply(
        self,
        decision: TradeDecision,
        position: Position,
        price: float,
        now: datetime,
        setup: TradeSetup | None = None,
    ) -> TradeDecision:
        s = self._settings
        self._reset_daily_state_if_needed(now)

        # 1. ウォームアップ期間
        if (now - self._start_time).total_seconds() < WARMUP_SECONDS:
            return TradeDecision(action="hold", qty=0, reason="ウォームアップ中")

        # 2. 市場時間外
        t = now.time()
        in_am = _MARKET_AM[0] <= t < _MARKET_AM[1]
        in_pm = _MARKET_PM[0] <= t < _MARKET_PM[1]
        if not (in_am or in_pm):
            return TradeDecision(action="hold", qty=0, reason="市場時間外")

        if position.qty > 0 and self._is_near_close(now):
            return TradeDecision(
                action="sell",
                qty=position.qty,
                reason="引け前手仕舞い",
            )

        # 3. 損切りライン（強制売り）
        if position.qty > 0 and position.pnl_pct < -s.stop_loss_pct:
            return TradeDecision(
                action="sell",
                qty=position.qty,
                reason=f"損切りライン到達 ({position.pnl_pct:.1f}%)",
            )

        if decision.action == "hold":
            return decision

        if decision.action == "sell":
            return TradeDecision(
                action=decision.action,
                qty=decision.qty,
                order_type=decision.order_type,
                reason=decision.reason,
            )

        if self._daily_realized_pnl <= -s.max_daily_loss_yen:
            return TradeDecision(action="hold", qty=0, reason="日次損失上限に到達")

        if self._cooldown_until is not None and now < self._cooldown_until:
            return TradeDecision(action="hold", qty=0, reason="損失後クールダウン中")

        if self._consecutive_loss_count >= s.max_consecutive_losses:
            return TradeDecision(action="hold", qty=0, reason="連敗上限に到達")

        if self._daily_order_count >= s.effective_max_daily_orders:
            return TradeDecision(action="hold", qty=0, reason="日次発注上限に到達")

        if self._is_near_close(now):
            return TradeDecision(action="hold", qty=0, reason="引け前は新規停止")

        if not (s.effective_price_min <= price <= s.effective_price_max):
            return TradeDecision(
                action="hold",
                qty=0,
                reason=(
                    f"価格帯外 ({s.effective_price_min}-{s.effective_price_max}円)"
                ),
            )

        if self._holding_slots_used(position) >= s.effective_max_concurrent_positions:
            return TradeDecision(action="hold", qty=0, reason="同時保有上限に到達")

        if setup is not None:
            if setup.news_halt:
                return TradeDecision(action="hold", qty=0, reason="ニュース急変で停止")
            if setup.minutes_from_session_open < s.skip_open_minutes:
                return TradeDecision(action="hold", qty=0, reason="寄り付き直後は新規停止")
            if setup.spread_bps is not None and setup.spread_bps > s.max_spread_bps:
                return TradeDecision(action="hold", qty=0, reason="スプレッドが広く見送り")
            if setup.five_bar_range_pct < s.min_five_bar_range_pct:
                return TradeDecision(action="hold", qty=0, reason="値幅不足で見送り")
            if setup.last_bar_volume_ratio < s.min_last_bar_volume_ratio:
                return TradeDecision(action="hold", qty=0, reason="出来高不足で見送り")
            if (
                setup.reference_gap_pct is not None
                and abs(setup.reference_gap_pct) > s.max_reference_gap_pct
            ):
                return TradeDecision(action="hold", qty=0, reason="参照乖離が大きく見送り")

        # 4. 買い数量上限
        qty = min(decision.qty, s.max_qty_per_order)
        # 5. 金額上限（単価上限まで数量を削減。1株でも超過するなら全拒否）
        max_qty_by_limit = int(s.limit_per_order / price) if price > 0 else 0
        qty = min(qty, max_qty_by_limit)
        if qty <= 0:
            return TradeDecision(action="hold", qty=0, reason="発注上限金額超過")

        return TradeDecision(
            action=decision.action,
            qty=qty,
            order_type=decision.order_type,
            reason=decision.reason,
        )

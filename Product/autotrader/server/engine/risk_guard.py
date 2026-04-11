from datetime import datetime, time
from server.models import TradeDecision, Position, RiskSettings

WARMUP_SECONDS = 30
_MARKET_AM = (time(9, 0), time(11, 30))
_MARKET_PM = (time(12, 30), time(15, 30))


class RiskGuard:
    def __init__(self, settings: RiskSettings, start_time: datetime):
        self._settings = settings
        self._start_time = start_time

    @property
    def settings(self) -> RiskSettings:
        return self._settings

    def update_settings(self, settings: RiskSettings):
        self._settings = settings

    def apply(
        self,
        decision: TradeDecision,
        position: Position,
        price: float,
        now: datetime,
    ) -> TradeDecision:
        s = self._settings

        # 1. ウォームアップ期間
        if (now - self._start_time).total_seconds() < WARMUP_SECONDS:
            return TradeDecision(action="hold", qty=0, reason="ウォームアップ中")

        # 2. 市場時間外
        t = now.time()
        in_am = _MARKET_AM[0] <= t < _MARKET_AM[1]
        in_pm = _MARKET_PM[0] <= t < _MARKET_PM[1]
        if not (in_am or in_pm):
            return TradeDecision(action="hold", qty=0, reason="市場時間外")

        # 3. 損切りライン（強制売り）
        if position.qty > 0 and position.pnl_pct < -s.stop_loss_pct:
            return TradeDecision(
                action="sell",
                qty=position.qty,
                reason=f"損切りライン到達 ({position.pnl_pct:.1f}%)",
            )

        if decision.action == "hold":
            return decision

        if decision.action == "buy":
            # 4. 買い数量上限
            qty = min(decision.qty, s.max_qty_per_order)
            # 5. 金額上限（単価上限まで数量を削減。1株でも超過するなら全拒否）
            max_qty_by_limit = int(s.limit_per_order / price) if price > 0 else 0
            qty = min(qty, max_qty_by_limit)
            if qty <= 0:
                return TradeDecision(action="hold", qty=0, reason="発注上限金額超過")
        else:
            qty = decision.qty

        return TradeDecision(
            action=decision.action,
            qty=qty,
            order_type=decision.order_type,
            reason=decision.reason,
        )

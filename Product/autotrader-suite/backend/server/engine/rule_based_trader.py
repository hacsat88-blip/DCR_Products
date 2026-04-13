from server.engine.trade_setup import TradeSetup
from server.models import Position, PriceRequest, RiskSettings, TradeDecision


class RuleBasedTrader:
    def decide(
        self,
        req: PriceRequest,
        position: Position,
        settings: RiskSettings,
        setup: TradeSetup,
    ) -> TradeDecision:
        if position.qty > 0:
            if setup.breakdown_below_prev_low or setup.price_position_in_range <= 0.25:
                return TradeDecision(action="sell", qty=position.qty, reason="5本安値割れ")
            if position.pnl_pct > 0.5 and setup.price_position_in_range < 0.45:
                return TradeDecision(action="sell", qty=position.qty, reason="伸び鈍化で利確")
            return TradeDecision(action="hold", qty=0, reason="保有継続")

        max_qty_by_limit = int(settings.limit_per_order / req.price) if req.price > 0 else 0
        qty = min(settings.max_qty_per_order, max_qty_by_limit)
        if qty <= 0:
            return TradeDecision(action="hold", qty=0, reason="上限内数量なし")

        if (
            setup.breakout_above_prev_high
            and setup.price_position_in_range >= 0.75
            and setup.last_bar_volume_ratio >= max(1.0, settings.min_last_bar_volume_ratio)
        ):
            return TradeDecision(action="buy", qty=max(1, qty), reason="高値更新で順張り")

        return TradeDecision(action="hold", qty=0, reason="条件不足")
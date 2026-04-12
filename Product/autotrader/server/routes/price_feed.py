from datetime import datetime
from typing import Callable, Awaitable
from fastapi import APIRouter, HTTPException
from server.models import FeedSource, PriceRequest, TradeDecision
from server.engine.gemini_trader import GeminiTrader
from server.engine.risk_guard import RiskGuard
from server.engine.position import PositionManager


def make_price_router(
    gemini_ai: GeminiTrader,
    guard: RiskGuard,
    pos_mgr: PositionManager,
    broadcast: Callable[..., Awaitable[None]],
    schedule_reference_publish: Callable[[str, FeedSource], None] | None = None,
) -> APIRouter:
    r = APIRouter()

    async def _broadcast_decision(req: PriceRequest, decision: TradeDecision):
        await broadcast(
            price={
                "code": req.code,
                "current": req.price,
                "volume": req.volume,
                "feed_role": req.feed_role,
                "feed_source": req.feed_source,
            },
            action={
                "action": decision.action,
                "qty": decision.qty,
                "reason": decision.reason,
                "at": datetime.now().strftime("%H:%M:%S"),
                "feed_role": req.feed_role,
                "feed_source": req.feed_source,
            },
        )

    @r.post("/api/price", response_model=TradeDecision)
    async def receive_price(req: PriceRequest):
        if req.feed_role == "reference":
            decision = TradeDecision(
                action="hold",
                qty=0,
                reason=f"参照フィード受信 ({req.feed_source})",
            )
            await _broadcast_decision(req, decision)
            return decision

        await pos_mgr.update_price(req.price)
        position = pos_mgr.position
        raw = gemini_ai.decide_safe(req, position, guard.settings)

        decision = guard.apply(raw, position, req.price, req.timestamp)

        if decision.action == "buy":
            await pos_mgr.apply_buy(req.code, decision.qty, req.price)
            guard.record_order(decision, req.timestamp)
        elif decision.action == "sell":
            try:
                await pos_mgr.apply_sell(decision.qty, req.price)
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))
            guard.record_order(decision, req.timestamp)

        await _broadcast_decision(req, decision)
        if schedule_reference_publish is not None:
            schedule_reference_publish(req.code, guard.settings.reference_feed)
        return decision

    return r

from datetime import datetime
from typing import Callable, Awaitable
from fastapi import APIRouter
from server.models import PriceRequest, TradeDecision
from server.engine.ai_trader import AITrader
from server.engine.gemini_trader import GeminiTrader
from server.engine.risk_guard import RiskGuard
from server.engine.position import PositionManager


def make_price_router(
    gemini_ai: GeminiTrader,
    claude_ai: AITrader,
    guard: RiskGuard,
    pos_mgr: PositionManager,
    broadcast: Callable[..., Awaitable[None]],
) -> APIRouter:
    r = APIRouter()

    @r.post("/api/price", response_model=TradeDecision)
    async def receive_price(req: PriceRequest):
        await pos_mgr.update_price(req.price)
        position = pos_mgr.position
        mode = guard.settings.ai_mode

        if mode == "hybrid":
            gemini_raw = gemini_ai.decide_safe(req, position, guard.settings)
            claude_raw = claude_ai.decide_safe(req, position, guard.settings)
            if gemini_raw.action == claude_raw.action:
                raw = TradeDecision(
                    action=gemini_raw.action,
                    qty=min(gemini_raw.qty, claude_raw.qty),
                    reason=(
                        f"合意: Gemini={gemini_raw.reason[:20]}"
                        f" / Claude={claude_raw.reason[:20]}"
                    ),
                )
            else:
                raw = TradeDecision(
                    action="hold",
                    qty=0,
                    reason=(
                        f"AI不一致"
                        f"(Gemini:{gemini_raw.action}/Claude:{claude_raw.action})"
                    ),
                )
        else:  # "gemini"
            raw = gemini_ai.decide_safe(req, position, guard.settings)

        decision = guard.apply(raw, position, req.price, req.timestamp)

        if decision.action == "buy":
            await pos_mgr.apply_buy(req.code, decision.qty, req.price)
        elif decision.action == "sell":
            try:
                await pos_mgr.apply_sell(decision.qty, req.price)
            except ValueError as e:
                from fastapi import HTTPException
                raise HTTPException(status_code=400, detail=str(e))

        await broadcast(
            price={"code": req.code, "current": req.price, "volume": req.volume},
            action={
                "action": decision.action,
                "qty": decision.qty,
                "reason": decision.reason,
                "at": datetime.now().strftime("%H:%M:%S"),
            },
        )
        return decision

    return r

from datetime import date, datetime
from typing import Callable, Awaitable
from fastapi import APIRouter, HTTPException
from server.models import FeedSource, PriceFeedResponse, PriceRequest, TradeDecision
from server.engine.gemini_trader import GeminiTrader
from server.engine.risk_guard import RiskGuard
from server.engine.position import PositionManager
from server.engine.trade_setup import build_trade_setup


def make_price_router(
    gemini_ai: GeminiTrader,
    guard: RiskGuard,
    pos_mgr: PositionManager,
    broadcast: Callable[..., Awaitable[None]],
    get_reference_snapshot: Callable[[str, FeedSource], dict[str, object] | None] | None = None,
    schedule_reference_publish: Callable[[str, FeedSource], None] | None = None,
) -> APIRouter:
    r = APIRouter()

    def _parse_as_of(raw_value: object) -> date | None:
        if not isinstance(raw_value, str) or not raw_value.strip():
            return None
        normalized = raw_value.strip()
        for pattern in ("%Y-%m-%d", "%Y%m%d"):
            try:
                return datetime.strptime(normalized, pattern).date()
            except ValueError:
                continue
        return None

    def _build_reference_advisory(
        execution_price: float | None,
        timestamp: datetime,
        feed_source: FeedSource,
        snapshot: dict[str, object] | None,
    ) -> dict[str, object]:
        if snapshot is None:
            return {
                "reference_status": "missing",
                "reference_price": None,
                "reference_volume": None,
                "reference_source": feed_source,
                "reference_as_of": None,
                "reference_age_days": None,
                "reference_gap_pct": None,
                "warning_code": "reference_missing",
                "warning_message": "J-Quants reference missing; execution onlyで継続",
            }

        reference_price = float(snapshot.get("current"))
        reference_volume = int(snapshot.get("volume") or 0)
        reference_as_of = snapshot.get("as_of")
        parsed_as_of = _parse_as_of(reference_as_of)
        reference_age_days = None
        if parsed_as_of is not None:
            reference_age_days = max(0, (timestamp.date() - parsed_as_of).days)

        reference_gap_pct = None
        if execution_price is not None and reference_price > 0:
            reference_gap_pct = round(
                ((execution_price - reference_price) / reference_price) * 100,
                3,
            )

        warning_code = None
        warning_message = None
        reference_status = "ok"
        if reference_age_days is not None and reference_age_days > 5:
            reference_status = "stale"
            warning_code = "reference_stale"
            warning_message = (
                f"J-Quants reference stale ({reference_age_days} days); "
                "execution onlyで継続"
            )

        return {
            "reference_status": reference_status,
            "reference_price": reference_price,
            "reference_volume": reference_volume,
            "reference_source": feed_source,
            "reference_as_of": reference_as_of,
            "reference_age_days": reference_age_days,
            "reference_gap_pct": reference_gap_pct,
            "warning_code": warning_code,
            "warning_message": warning_message,
        }

    def _make_response(
        decision: TradeDecision,
        reference_advisory: dict[str, object],
    ) -> PriceFeedResponse:
        return PriceFeedResponse(
            action=decision.action,
            qty=decision.qty,
            order_type=decision.order_type,
            reason=decision.reason,
            **reference_advisory,
        )

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

    @r.post("/api/price", response_model=PriceFeedResponse)
    async def receive_price(req: PriceRequest):
        if req.feed_role == "reference":
            decision = TradeDecision(
                action="hold",
                qty=0,
                reason=f"参照フィード受信 ({req.feed_source})",
            )
            await _broadcast_decision(req, decision)
            return _make_response(
                decision,
                _build_reference_advisory(
                    None,
                    req.timestamp,
                    req.feed_source,
                    {
                        "current": req.price,
                        "volume": req.volume,
                        "as_of": req.timestamp.date().isoformat(),
                    },
                ),
            )

        reference_snapshot = None
        if get_reference_snapshot is not None:
            reference_snapshot = get_reference_snapshot(
                req.code,
                guard.settings.reference_feed,
            )

        await pos_mgr.update_price(req.price)
        position = pos_mgr.position
        setup = build_trade_setup(req, reference_snapshot)
        raw = gemini_ai.decide_safe(req, position, guard.settings, setup=setup)

        decision = guard.apply(raw, position, req.price, req.timestamp, setup=setup)

        if decision.action == "buy":
            await pos_mgr.apply_buy(req.code, decision.qty, req.price)
            guard.record_order(decision, req.timestamp)
        elif decision.action == "sell":
            realized_pnl = (
                (req.price - position.avg_cost) * decision.qty
                if position.avg_cost > 0
                else 0.0
            )
            try:
                await pos_mgr.apply_sell(decision.qty, req.price)
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))
            guard.record_order(decision, req.timestamp, realized_pnl=realized_pnl)

        await _broadcast_decision(req, decision)
        if schedule_reference_publish is not None:
            schedule_reference_publish(req.code, guard.settings.reference_feed)
        return _make_response(
            decision,
            _build_reference_advisory(
                req.price,
                req.timestamp,
                guard.settings.reference_feed,
                reference_snapshot,
            ),
        )

    return r

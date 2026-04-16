from datetime import date, datetime
from typing import Callable, Awaitable
from fastapi import APIRouter, HTTPException
from server.models import ExecutionResultRequest, FeedSource, PriceFeedResponse, PriceRequest, TradeDecision
from server.engine.execution_tracker import ExecutionTracker
from server.engine.gemini_trader import GeminiTrader
from server.engine.jquants_reference import REFERENCE_STALE_AFTER_DAYS, compute_reference_age_days, parse_reference_as_of
from server.engine.paper_ops import PaperOpsState
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
    paper_ops_state: PaperOpsState | None = None,
    reference_ready_provider: Callable[[], bool] | None = None,
    send_alert: Callable[[str], Awaitable[bool] | Awaitable[None]] | None = None,
) -> APIRouter:
    r = APIRouter()
    execution_tracker = ExecutionTracker()
    last_transition_alerts: dict[str, str | None] = {
        "ai": None,
        "reference": None,
        "risk": None,
    }

    async def _emit_alert(message: str) -> None:
        if send_alert is None:
            return
        await send_alert(message)

    async def _emit_transition_alert(kind: str, message: str | None) -> None:
        previous = last_transition_alerts.get(kind)
        if not message:
            last_transition_alerts[kind] = None
            return

        if previous == message:
            return

        last_transition_alerts[kind] = message
        await _emit_alert(message)

    async def _emit_runtime_transition_alerts(
        raw_decision: TradeDecision,
        response: PriceFeedResponse,
        provider_reference_ready: bool,
        runtime_snapshot,
    ) -> None:
        ai_alert = None
        if _is_ai_degraded(raw_decision):
            ai_alert = f"AI degraded: {raw_decision.reason}"

        reference_alert = None
        if response.reference_status != "ok" or not provider_reference_ready:
            reference_detail = response.warning_message or "reference provider not ready"
            reference_alert = f"Reference degraded: {reference_detail}"

        risk_alert = None
        if runtime_snapshot.entry_blocked and runtime_snapshot.entry_block_reason:
            risk_alert = f"Risk blocked: {runtime_snapshot.entry_block_reason}"

        await _emit_transition_alert("ai", ai_alert)
        await _emit_transition_alert("reference", reference_alert)
        await _emit_transition_alert("risk", risk_alert)

    def _is_live_broker_mode(run_mode: str, order_mode: str) -> bool:
        return run_mode == "live" and order_mode == "broker_auto"

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
        parsed_as_of = parse_reference_as_of(snapshot.get("as_of"))
        reference_as_of = parsed_as_of.isoformat() if parsed_as_of is not None else None
        reference_age_days = compute_reference_age_days(snapshot.get("as_of"), timestamp)

        reference_gap_pct = None
        if execution_price is not None and reference_price > 0:
            reference_gap_pct = round(
                ((execution_price - reference_price) / reference_price) * 100,
                3,
            )

        warning_code = None
        warning_message = None
        reference_status = "ok"
        if reference_age_days is not None and reference_age_days > REFERENCE_STALE_AFTER_DAYS:
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
        pending_execution_id: str | None = None,
    ) -> PriceFeedResponse:
        return PriceFeedResponse(
            action=decision.action,
            qty=decision.qty,
            order_type=decision.order_type,
            reason=decision.reason,
            pending_execution_id=pending_execution_id,
            **reference_advisory,
        )

    def _is_ai_degraded(decision: TradeDecision) -> bool:
        return decision.reason.startswith("AI判断エラー:")

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
            event_timestamp=req.timestamp,
        )

    async def _broadcast_execution_result(req: ExecutionResultRequest, decision: TradeDecision):
        await broadcast(
            price={
                "code": req.code,
                "current": req.price,
                "volume": req.volume,
                "feed_role": "execution",
                "feed_source": req.feed_source,
            },
            action={
                "action": decision.action,
                "qty": decision.qty,
                "reason": decision.reason,
                "at": datetime.now().strftime("%H:%M:%S"),
                "feed_role": "execution",
                "feed_source": req.feed_source,
            },
            event_timestamp=req.timestamp,
        )

    async def _apply_confirmed_decision(
        code: str,
        price: float,
        timestamp: datetime,
        decision: TradeDecision,
    ) -> None:
        position = pos_mgr.position
        if decision.action == "buy":
            await pos_mgr.apply_buy(code, decision.qty, price)
            guard.record_order(decision, timestamp)
        elif decision.action == "sell":
            realized_pnl = (
                (price - position.avg_cost) * decision.qty
                if position.avg_cost > 0
                else 0.0
            )
            try:
                await pos_mgr.apply_sell(decision.qty, price)
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))
            guard.record_order(decision, timestamp, realized_pnl=realized_pnl)

    @r.post("/api/price", response_model=PriceFeedResponse)
    async def receive_price(req: PriceRequest):
        guard.sync_time(req.timestamp)
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

        decision = guard.apply(
            raw,
            position,
            req.price,
            req.timestamp,
            setup=setup,
            available_cash_actual=req.available_cash_actual,
        )

        live_broker_mode = _is_live_broker_mode(req.client_run_mode, req.client_order_mode)
        pending_execution_id = None
        if live_broker_mode and decision.action in {"buy", "sell"} and decision.qty > 0:
            pending_execution_id = await execution_tracker.register(
                code=req.code,
                action=decision.action,
                order_type=decision.order_type,
                created_at=req.timestamp,
            )
            await _broadcast_decision(
                req,
                TradeDecision(
                    action="hold",
                    qty=0,
                    reason=f"live 発注待ち: {decision.reason}",
                ),
            )
        else:
            await _apply_confirmed_decision(req.code, req.price, req.timestamp, decision)
            await _broadcast_decision(req, decision)
        if schedule_reference_publish is not None:
            schedule_reference_publish(req.code, guard.settings.reference_feed)
        response = _make_response(
            decision,
            _build_reference_advisory(
                req.price,
                req.timestamp,
                guard.settings.reference_feed,
                reference_snapshot,
            ),
            pending_execution_id=pending_execution_id,
        )
        if paper_ops_state is not None:
            provider_reference_ready = (
                reference_ready_provider()
                if reference_ready_provider is not None
                else response.reference_status == "ok"
            )
            reference_ready = provider_reference_ready and response.reference_status == "ok"
            paper_ops_state.record_execution_result(
                timestamp=req.timestamp,
                code=req.code,
                ai_ready=not _is_ai_degraded(raw),
                reference_ready=reference_ready,
                mode=req.client_run_mode,
                order_mode=req.client_order_mode,
                live_armed=req.client_live_armed,
                warning_message=(
                    raw.reason
                    if _is_ai_degraded(raw)
                    else response.warning_message
                ),
            )
            await _emit_runtime_transition_alerts(
                raw,
                response,
                provider_reference_ready,
                guard.runtime_snapshot(req.timestamp),
            )
        return response

    @r.post("/api/execution-result")
    async def record_execution_result(req: ExecutionResultRequest):
        guard.sync_time(req.timestamp)

        if _is_live_broker_mode(req.client_run_mode, req.client_order_mode):
            consume_status, _pending = await execution_tracker.consume(
                pending_execution_id=req.pending_execution_id or "",
                code=req.code,
                action=req.action,
                now=req.timestamp,
            )
            if consume_status == "duplicate":
                return {"status": "duplicate", "applied": False}
            if consume_status == "missing":
                raise HTTPException(status_code=409, detail="unknown pending_execution_id")
            if consume_status == "mismatch":
                raise HTTPException(status_code=409, detail="pending_execution_id does not match request")

        confirmed_decision = TradeDecision(
            action=req.action,
            qty=req.qty,
            order_type=req.order_type,
            reason=req.reason,
        )

        if req.success:
            await _apply_confirmed_decision(req.code, req.price, req.timestamp, confirmed_decision)
            await _broadcast_execution_result(req, confirmed_decision)
            await _emit_alert(
                f"LIVE {req.action.upper()} confirmed: code={req.code} qty={req.qty} price={req.price:.3f}"
            )
        else:
            await _broadcast_execution_result(
                req,
                TradeDecision(
                    action="hold",
                    qty=0,
                    reason=f"発注失敗: {req.error_message}",
                ),
            )
            await _emit_alert(
                f"LIVE {req.action.upper()} failed: code={req.code} qty={req.qty} error={req.error_message}"
            )

        if paper_ops_state is not None:
            paper_ops_state.record_execution_result(
                timestamp=req.timestamp,
                code=req.code,
                ai_ready=paper_ops_state.ai_status == "ready",
                reference_ready=paper_ops_state.reference_status == "ready",
                mode=req.client_run_mode,
                order_mode=req.client_order_mode,
                live_armed=req.client_live_armed,
                warning_message=(
                    req.error_message
                    if not req.success
                    else paper_ops_state.last_warning
                ),
            )

        return {"status": "recorded", "applied": req.success}

    return r

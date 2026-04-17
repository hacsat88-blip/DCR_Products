from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from server.models import OrderExecutionMode, PaperOpsHealth, PaperOpsReadiness, RunMode


def _to_readiness(ready: bool) -> PaperOpsReadiness:
    return "ready" if ready else "degraded"


def _is_reference_warning(message: str | None) -> bool:
    return bool(message) and message.startswith("J-Quants reference ")


@dataclass
class PaperOpsState:
    ai_status: PaperOpsReadiness
    reference_status: PaperOpsReadiness
    mode: RunMode
    order_mode: OrderExecutionMode
    live_armed: bool
    last_price_tick_at: datetime | None = None
    last_price_code: str | None = None
    last_warning: str | None = None

    def __init__(self, ai_ready: bool = False, reference_ready: bool = False):
        self.ai_status = _to_readiness(ai_ready)
        self.reference_status = _to_readiness(reference_ready)
        self.mode = "paper"
        self.order_mode = "stub_only"
        self.live_armed = False
        self.last_price_tick_at = None
        self.last_price_code = None
        self.last_warning = None

    @property
    def status(self) -> str:
        if self.ai_status == "ready" and self.reference_status == "ready":
            return "healthy"
        return "degraded"

    def record_execution_result(
        self,
        *,
        timestamp: datetime,
        code: str,
        ai_ready: bool,
        reference_ready: bool,
        warning_message: str | None,
        mode: RunMode = "paper",
        order_mode: OrderExecutionMode = "stub_only",
        live_armed: bool = False,
    ) -> None:
        self.last_price_tick_at = timestamp
        self.last_price_code = code
        self.ai_status = _to_readiness(ai_ready)
        self.reference_status = _to_readiness(reference_ready)
        self.mode = mode
        self.order_mode = order_mode
        self.live_armed = live_armed
        self.last_warning = warning_message

    def set_reference_ready(self, ready: bool) -> None:
        self.reference_status = _to_readiness(ready)
        if ready and _is_reference_warning(self.last_warning):
            self.last_warning = None

    def snapshot(self, now: datetime | None = None) -> PaperOpsHealth:
        return PaperOpsHealth(
            status=self.status,
            mode=self.mode,
            order_mode=self.order_mode,
            live_armed=self.live_armed,
            server_time=now or datetime.now(),
            last_price_tick_at=self.last_price_tick_at,
            last_price_code=self.last_price_code,
            ai_status=self.ai_status,
            reference_status=self.reference_status,
            last_warning=self.last_warning,
        )
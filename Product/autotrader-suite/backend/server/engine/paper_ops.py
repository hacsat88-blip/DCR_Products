from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from server.models import PaperOpsHealth, PaperOpsReadiness


def _to_readiness(ready: bool) -> PaperOpsReadiness:
    return "ready" if ready else "degraded"


@dataclass
class PaperOpsState:
    ai_status: PaperOpsReadiness
    reference_status: PaperOpsReadiness
    last_price_tick_at: datetime | None = None
    last_price_code: str | None = None
    last_warning: str | None = None

    def __init__(self, ai_ready: bool = False, reference_ready: bool = False):
        self.ai_status = _to_readiness(ai_ready)
        self.reference_status = _to_readiness(reference_ready)
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
    ) -> None:
        self.last_price_tick_at = timestamp
        self.last_price_code = code
        self.ai_status = _to_readiness(ai_ready)
        self.reference_status = _to_readiness(reference_ready)
        self.last_warning = warning_message

    def set_reference_ready(self, ready: bool) -> None:
        self.reference_status = _to_readiness(ready)

    def snapshot(self, now: datetime | None = None) -> PaperOpsHealth:
        return PaperOpsHealth(
            status=self.status,
            server_time=now or datetime.now(),
            last_price_tick_at=self.last_price_tick_at,
            last_price_code=self.last_price_code,
            ai_status=self.ai_status,
            reference_status=self.reference_status,
            last_warning=self.last_warning,
        )
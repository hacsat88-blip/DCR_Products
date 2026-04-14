from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import datetime, timedelta
from uuid import uuid4


@dataclass(slots=True)
class PendingExecution:
    pending_execution_id: str
    code: str
    action: str
    order_type: str
    created_at: datetime


class ExecutionTracker:
    def __init__(self, pending_ttl_minutes: int = 30, resolved_ttl_minutes: int = 180):
        self._pending: dict[str, PendingExecution] = {}
        self._resolved: dict[str, datetime] = {}
        self._pending_ttl = timedelta(minutes=pending_ttl_minutes)
        self._resolved_ttl = timedelta(minutes=resolved_ttl_minutes)
        self._lock = asyncio.Lock()

    async def register(self, *, code: str, action: str, order_type: str, created_at: datetime) -> str:
        async with self._lock:
            self._purge_locked(created_at)
            pending_execution_id = uuid4().hex
            self._pending[pending_execution_id] = PendingExecution(
                pending_execution_id=pending_execution_id,
                code=code,
                action=action,
                order_type=order_type,
                created_at=created_at,
            )
            return pending_execution_id

    async def consume(
        self,
        *,
        pending_execution_id: str,
        code: str,
        action: str,
        now: datetime,
    ) -> tuple[str, PendingExecution | None]:
        async with self._lock:
            self._purge_locked(now)

            if pending_execution_id in self._resolved:
                return "duplicate", None

            pending = self._pending.get(pending_execution_id)
            if pending is None:
                return "missing", None

            if pending.code != code or pending.action != action:
                return "mismatch", pending

            self._pending.pop(pending_execution_id, None)
            self._resolved[pending_execution_id] = now
            return "accepted", pending

    def _purge_locked(self, now: datetime) -> None:
        pending_cutoff = now - self._pending_ttl
        resolved_cutoff = now - self._resolved_ttl

        self._pending = {
            key: value
            for key, value in self._pending.items()
            if value.created_at >= pending_cutoff
        }
        self._resolved = {
            key: value
            for key, value in self._resolved.items()
            if value >= resolved_cutoff
        }
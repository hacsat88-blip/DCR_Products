import logging
import os
from datetime import date, datetime, timedelta
from time import monotonic
from typing import Awaitable, Callable

import httpx

from server.models import FeedSource

_logger = logging.getLogger(__name__)
REFERENCE_STALE_AFTER_DAYS = 5


def parse_reference_as_of(raw_value: object) -> date | None:
    if isinstance(raw_value, datetime):
        return raw_value.date()
    if isinstance(raw_value, date):
        return raw_value
    if not isinstance(raw_value, str):
        return None

    normalized = raw_value.strip()
    if not normalized:
        return None

    for pattern in ("%Y-%m-%d", "%Y%m%d"):
        try:
            return datetime.strptime(normalized, pattern).date()
        except ValueError:
            continue
    return None


def compute_reference_age_days(raw_value: object, timestamp: datetime) -> int | None:
    parsed_as_of = parse_reference_as_of(raw_value)
    if parsed_as_of is None:
        return None
    return max(0, (timestamp.date() - parsed_as_of).days)


def snapshot_runtime_ready(
    snapshot: dict[str, object] | None,
    timestamp: datetime,
) -> bool:
    if snapshot is None:
        return False
    reference_age_days = compute_reference_age_days(snapshot.get("as_of"), timestamp)
    return reference_age_days is None or reference_age_days <= REFERENCE_STALE_AFTER_DAYS


class JQuantsReferenceService:
    def __init__(
        self,
        *,
        transport: httpx.AsyncBaseTransport | None = None,
        base_url: str = "https://api.jquants.com/v2",
        timeout_seconds: float = 10.0,
        cache_ttl_seconds: int = 900,
    ):
        self._transport = transport
        self._base_url = base_url.rstrip("/")
        self._timeout_seconds = timeout_seconds
        self._cache_ttl_seconds = cache_ttl_seconds
        self._cache: dict[tuple[str, FeedSource], tuple[float, dict[str, object]]] = {}
        self._last_snapshot: dict[tuple[str, FeedSource], dict[str, object]] = {}
        self._runtime_ready = self.is_configured()

    def is_configured(self) -> bool:
        return self._get_api_key() is not None

    def runtime_ready(self) -> bool:
        return self._runtime_ready

    def _get_api_key(self) -> str | None:
        api_key = os.environ.get("JQUANTS_API_KEY", "").strip()
        return api_key or None

    def _get_cached(self, code: str, feed_source: FeedSource) -> dict[str, object] | None:
        cached = self._cache.get((code, feed_source))
        if cached is None:
            return None
        expires_at, payload = cached
        if expires_at <= monotonic():
            self._cache.pop((code, feed_source), None)
            return None
        return payload.copy()

    def _set_cached(self, code: str, feed_source: FeedSource, payload: dict[str, object]) -> None:
        snapshot = payload.copy()
        self._cache[(code, feed_source)] = (
            monotonic() + self._cache_ttl_seconds,
            snapshot,
        )
        self._last_snapshot[(code, feed_source)] = snapshot.copy()

    def peek_snapshot(self, code: str, feed_source: FeedSource) -> dict[str, object] | None:
        snapshot = self._last_snapshot.get((code, feed_source))
        if snapshot is None:
            return None
        return snapshot.copy()

    def _normalize_as_of(self, raw_value: object) -> str | None:
        parsed_as_of = parse_reference_as_of(raw_value)
        if parsed_as_of is None:
            return None
        return parsed_as_of.isoformat()

    def _code_candidates(self, code: str) -> list[str]:
        normalized = code.strip()
        if not normalized:
            return []
        if normalized.isdigit() and len(normalized) == 5:
            return [normalized]
        if normalized.isdigit() and len(normalized) == 4:
            return [normalized, f"{normalized}0"]
        return [normalized]

    def _build_snapshot(
        self,
        payload: object,
        code: str,
        feed_source: FeedSource,
    ) -> dict[str, object] | None:
        if not isinstance(payload, dict):
            return None
        rows = payload.get("daily_quotes") or payload.get("data") or []
        if not isinstance(rows, list):
            return None
        for row in reversed(rows):
            if not isinstance(row, dict):
                continue
            current = row.get("AdjC", row.get("C", row.get("Close")))
            volume = row.get("AdjVo", row.get("Vo", row.get("Volume", 0)))
            if current is None:
                continue
            try:
                parsed_current = float(current)
                parsed_volume = int(volume or 0)
            except (TypeError, ValueError):
                continue
            return {
                "code": code,
                "current": parsed_current,
                "volume": parsed_volume,
                "as_of": self._normalize_as_of(
                    row.get("Date") or row.get("date") or row.get("TradeDate")
                ),
                "feed_role": "reference",
                "feed_source": feed_source,
            }
        return None

    async def fetch_snapshot(
        self,
        code: str,
        feed_source: FeedSource,
    ) -> dict[str, object] | None:
        cached = self._get_cached(code, feed_source)
        if cached is not None:
            return cached

        api_key = self._get_api_key()
        if api_key is None:
            self._runtime_ready = False
            return None

        to_date = datetime.now().date()
        from_date = to_date - timedelta(days=35)
        headers = {"x-api-key": api_key}

        async with httpx.AsyncClient(
            transport=self._transport,
            timeout=self._timeout_seconds,
        ) as client:
            for candidate in self._code_candidates(code):
                try:
                    response = await client.get(
                        f"{self._base_url}/equities/bars/daily",
                        params={
                            "code": candidate,
                            "from": from_date.isoformat(),
                            "to": to_date.isoformat(),
                        },
                        headers=headers,
                    )
                except httpx.HTTPError:
                    _logger.exception("J-Quants reference fetch failed")
                    self._runtime_ready = False
                    return None

                if response.status_code != 200:
                    if response.status_code not in {404}:
                        _logger.warning(
                            "J-Quants reference fetch returned %s for %s",
                            response.status_code,
                            candidate,
                        )
                    continue

                snapshot = self._build_snapshot(response.json(), code, feed_source)
                if snapshot is not None:
                    self._set_cached(code, feed_source, snapshot)
                    self._runtime_ready = True
                    return snapshot

        self._runtime_ready = False
        return None

    async def publish_reference(
        self,
        code: str,
        feed_source: FeedSource,
        broadcast: Callable[..., Awaitable[None]],
    ) -> None:
        snapshot = await self.fetch_snapshot(code, feed_source)
        if snapshot is None:
            return
        await broadcast(
            price=snapshot,
            action={
                "action": "hold",
                "qty": 0,
                "reason": "J-Quants 参照更新",
                "at": datetime.now().strftime("%H:%M:%S"),
                "feed_role": "reference",
                "feed_source": feed_source,
            },
        )
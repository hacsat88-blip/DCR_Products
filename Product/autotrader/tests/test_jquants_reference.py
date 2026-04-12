import asyncio

import httpx

from server.engine.jquants_reference import JQuantsReferenceService


def test_fetch_snapshot_returns_reference_quote(monkeypatch):
    monkeypatch.setenv("JQUANTS_API_KEY", "test-key")

    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["x-api-key"] == "test-key"
        return httpx.Response(
            200,
            json={
                "daily_quotes": [
                    {"Date": "20260411", "AdjC": 251.5, "AdjVo": 12000},
                ]
            },
        )

    service = JQuantsReferenceService(
        transport=httpx.MockTransport(handler),
        cache_ttl_seconds=60,
    )

    snapshot = asyncio.run(service.fetch_snapshot("7203", "jquants_light"))

    assert snapshot == {
        "code": "7203",
        "current": 251.5,
        "volume": 12000,
        "as_of": "2026-04-11",
        "feed_role": "reference",
        "feed_source": "jquants_light",
    }


def test_fetch_snapshot_returns_none_when_api_key_missing(monkeypatch):
    monkeypatch.delenv("JQUANTS_API_KEY", raising=False)
    service = JQuantsReferenceService(cache_ttl_seconds=60)

    snapshot = asyncio.run(service.fetch_snapshot("7203", "jquants_light"))

    assert snapshot is None


def test_publish_reference_broadcasts_hold_event(monkeypatch):
    monkeypatch.setenv("JQUANTS_API_KEY", "test-key")

    async def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "daily_quotes": [
                    {"Date": "20260411", "AdjC": 251.5, "AdjVo": 12000},
                ]
            },
        )

    captured = []

    async def broadcast(*, price, action):
        captured.append({"price": price, "action": action})

    service = JQuantsReferenceService(
        transport=httpx.MockTransport(handler),
        cache_ttl_seconds=60,
    )

    asyncio.run(service.publish_reference("7203", "jquants_free", broadcast))

    assert captured[0]["price"]["feed_role"] == "reference"
    assert captured[0]["price"]["feed_source"] == "jquants_free"
    assert captured[0]["price"]["as_of"] == "2026-04-11"
    assert captured[0]["action"]["action"] == "hold"


def test_peek_snapshot_returns_last_known_reference_after_fetch(monkeypatch):
    monkeypatch.setenv("JQUANTS_API_KEY", "test-key")

    async def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "daily_quotes": [
                    {"Date": "20260411", "AdjC": 251.5, "AdjVo": 12000},
                ]
            },
        )

    service = JQuantsReferenceService(
        transport=httpx.MockTransport(handler),
        cache_ttl_seconds=1,
    )

    asyncio.run(service.fetch_snapshot("7203", "jquants_light"))
    snapshot = service.peek_snapshot("7203", "jquants_light")

    assert snapshot is not None
    assert snapshot["as_of"] == "2026-04-11"
    assert snapshot["current"] == 251.5
from datetime import datetime

from fastapi import FastAPI
from fastapi.testclient import TestClient

from server.engine.paper_ops import PaperOpsState
from server.routes.health import make_health_router


def _make_client(state: PaperOpsState) -> TestClient:
    app = FastAPI()
    app.include_router(make_health_router(state))
    return TestClient(app)


def test_health_reports_degraded_when_api_keys_missing(monkeypatch):
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.delenv("JQUANTS_API_KEY", raising=False)

    state = PaperOpsState()
    response = _make_client(state).get("/api/health")

    assert response.status_code == 200
    data = response.json()
    assert data["mode"] == "paper"
    assert data["order_mode"] == "stub_only"
    assert data["live_armed"] is False
    assert data["status"] == "degraded"
    assert data["ai_status"] == "degraded"
    assert data["reference_status"] == "degraded"
    assert data["last_price_tick_at"] is None
    assert data["last_price_code"] is None


def test_health_reports_tick_and_warning_state(monkeypatch):
    monkeypatch.setenv("GOOGLE_API_KEY", "test-key")
    monkeypatch.delenv("JQUANTS_API_KEY", raising=False)

    state = PaperOpsState()
    state.record_execution_result(
        timestamp=datetime(2026, 4, 13, 10, 30, 0),
        code="7203",
        ai_ready=True,
        reference_ready=False,
        warning_message="J-Quants reference missing; execution onlyで継続",
    )

    response = _make_client(state).get("/api/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "degraded"
    assert data["mode"] == "paper"
    assert data["order_mode"] == "stub_only"
    assert data["live_armed"] is False
    assert data["ai_status"] == "ready"
    assert data["reference_status"] == "degraded"
    assert data["last_price_tick_at"] == "2026-04-13T10:30:00"
    assert data["last_price_code"] == "7203"
    assert data["last_warning"] == "J-Quants reference missing; execution onlyで継続"
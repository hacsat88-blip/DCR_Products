import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from fastapi import FastAPI
from server.models import RiskSettings
from server.engine.risk_guard import RiskGuard
from server.routes.settings import make_settings_router


@pytest.fixture
def client():
    guard = RiskGuard(
        settings=RiskSettings(),
        start_time=datetime.now() - timedelta(seconds=60),
    )
    app = FastAPI()
    app.include_router(make_settings_router(guard))
    return TestClient(app), guard


def test_get_settings_returns_defaults(client):
    tc, _ = client
    res = tc.get("/api/settings")
    assert res.status_code == 200
    data = res.json()
    assert data["limit_per_order"] == 100_000
    assert data["stop_loss_pct"] == 3.0


def test_put_settings_updates_values(client):
    tc, guard = client
    res = tc.put("/api/settings", json={
        "limit_per_order": 200_000,
        "stop_loss_pct": 5.0,
        "max_qty_per_order": 200,
        "poll_interval_sec": 5,
    })
    assert res.status_code == 200
    assert guard.settings.limit_per_order == 200_000
    assert guard.settings.stop_loss_pct == 5.0

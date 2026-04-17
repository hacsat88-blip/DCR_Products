import pytest
from datetime import datetime, timedelta
import json
from fastapi.testclient import TestClient
from fastapi import FastAPI
from server.models import RiskSettings
from server.engine.risk_guard import RiskGuard
from server.routes.settings import make_settings_router


@pytest.fixture
def client(tmp_path, monkeypatch):
    settings_file = tmp_path / "settings.json"
    monkeypatch.setattr(
        "server.engine.settings_store.SETTINGS_FILE",
        settings_file,
    )
    guard = RiskGuard(
        settings=RiskSettings(),
        start_time=datetime.now() - timedelta(seconds=60),
    )
    app = FastAPI()
    app.include_router(make_settings_router(guard))
    return TestClient(app), guard, settings_file


def test_get_settings_returns_defaults(client):
    tc, _, _ = client
    res = tc.get("/api/settings")
    assert res.status_code == 200
    data = res.json()
    assert data["limit_per_order"] == 100_000
    assert data["stop_loss_pct"] == 3.0
    assert data["ai_mode"] == "gemini"
    assert data["trading_mode"] == "conservative"
    assert data["execution_feed"] == "rakuten_rss"
    assert data["reference_feed"] == "jquants_light"
    assert data["max_daily_loss_yen"] == 15_000
    assert data["max_consecutive_losses"] == 2
    assert data["cooldown_minutes_after_loss"] == 15
    assert data["min_five_bar_range_pct"] == 0.8
    assert data["min_last_bar_volume_ratio"] == 1.2
    assert data["max_reference_gap_pct"] == 4.0
    assert data["flat_before_close_minutes"] == 10
    assert data["max_spread_bps"] == 20.0
    assert data["skip_open_minutes"] == 5


def test_put_settings_updates_values(client):
    tc, guard, _ = client
    res = tc.put("/api/settings", json={
        "limit_per_order": 200_000,
        "stop_loss_pct": 5.0,
        "max_qty_per_order": 200,
        "poll_interval_sec": 5,
        "ai_mode": "gemini",
        "trading_mode": "balanced",
        "available_cash": 240_000,
        "prioritize_manual_price_band": False,
        "manual_price_min": 100,
        "manual_price_max": 500,
        "max_daily_orders": 4,
        "max_concurrent_positions": 2,
        "max_daily_loss_yen": 12_000,
        "max_consecutive_losses": 3,
        "cooldown_minutes_after_loss": 20,
        "min_five_bar_range_pct": 1.1,
        "min_last_bar_volume_ratio": 1.4,
        "max_reference_gap_pct": 3.5,
        "flat_before_close_minutes": 12,
        "max_spread_bps": 18.0,
        "skip_open_minutes": 7,
        "execution_feed": "rakuten_rss",
        "reference_feed": "jquants_free",
    })
    assert res.status_code == 200
    assert guard.settings.limit_per_order == 200_000
    assert guard.settings.stop_loss_pct == 5.0
    assert guard.settings.ai_mode == "gemini"
    assert guard.settings.trading_mode == "balanced"
    assert guard.settings.available_cash == 240_000
    assert guard.settings.max_daily_orders == 4
    assert guard.settings.max_concurrent_positions == 2
    assert guard.settings.max_daily_loss_yen == 12_000
    assert guard.settings.max_consecutive_losses == 3
    assert guard.settings.cooldown_minutes_after_loss == 20
    assert guard.settings.min_five_bar_range_pct == 1.1
    assert guard.settings.min_last_bar_volume_ratio == 1.4
    assert guard.settings.max_reference_gap_pct == 3.5
    assert guard.settings.flat_before_close_minutes == 12
    assert guard.settings.max_spread_bps == 18.0
    assert guard.settings.skip_open_minutes == 7


def test_put_settings_persists_values_to_settings_json(client):
    tc, _, settings_file = client
    res = tc.put("/api/settings", json={
        "limit_per_order": 210_000,
        "stop_loss_pct": 4.5,
        "max_qty_per_order": 150,
        "poll_interval_sec": 5,
        "ai_mode": "gemini",
        "trading_mode": "aggressive",
        "available_cash": 180_000,
        "prioritize_manual_price_band": True,
        "manual_price_min": 120,
        "manual_price_max": 480,
        "max_daily_orders": 5,
        "max_concurrent_positions": 2,
        "max_daily_loss_yen": 11_000,
        "max_consecutive_losses": 2,
        "cooldown_minutes_after_loss": 25,
        "min_five_bar_range_pct": 1.0,
        "min_last_bar_volume_ratio": 1.5,
        "max_reference_gap_pct": 3.0,
        "flat_before_close_minutes": 9,
        "max_spread_bps": 17.5,
        "skip_open_minutes": 6,
        "execution_feed": "rakuten_rss",
        "reference_feed": "jquants_light",
    })

    assert res.status_code == 200

    persisted = json.loads(settings_file.read_text(encoding="utf-8"))
    assert persisted["limit_per_order"] == 210_000
    assert persisted["trading_mode"] == "aggressive"

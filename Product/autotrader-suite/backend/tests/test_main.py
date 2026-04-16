import asyncio
import importlib
import sys
from datetime import datetime
from unittest.mock import AsyncMock

from fastapi.testclient import TestClient
from server.models import RiskSettings


def test_main_app_imports_without_api_keys(monkeypatch, tmp_path):
    monkeypatch.setenv("GOOGLE_API_KEY", "")
    monkeypatch.setenv("JQUANTS_API_KEY", "")
    monkeypatch.setattr("server.engine.position.STATE_FILE", tmp_path / "state.json")
    monkeypatch.setattr("server.engine.settings_store.SETTINGS_FILE", tmp_path / "settings.json")
    sys.modules.pop("server.main", None)

    main = importlib.import_module("server.main")

    assert main.app.title == "AutoTrader Bridge"


def test_main_exposes_health_endpoint(monkeypatch, tmp_path):
    monkeypatch.setenv("GOOGLE_API_KEY", "")
    monkeypatch.setenv("JQUANTS_API_KEY", "")
    monkeypatch.setattr("server.engine.position.STATE_FILE", tmp_path / "state.json")
    monkeypatch.setattr("server.engine.settings_store.SETTINGS_FILE", tmp_path / "settings.json")
    sys.modules.pop("server.main", None)

    main = importlib.import_module("server.main")

    response = TestClient(main.app).get("/api/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "degraded"
    assert data["mode"] == "paper"
    assert data["order_mode"] == "stub_only"
    assert data["live_armed"] is False


def test_schedule_reference_publish_keeps_stale_reference_degraded(monkeypatch, tmp_path):
    monkeypatch.setenv("GOOGLE_API_KEY", "test-key")
    monkeypatch.setenv("JQUANTS_API_KEY", "test-key")
    monkeypatch.setattr("server.engine.position.STATE_FILE", tmp_path / "state.json")
    monkeypatch.setattr("server.engine.settings_store.SETTINGS_FILE", tmp_path / "settings.json")
    sys.modules.pop("server.main", None)

    main = importlib.import_module("server.main")
    main._paper_ops_state.set_reference_ready(True)

    publish_mock = AsyncMock(return_value=None)
    monkeypatch.setattr(main._reference_service, "publish_reference", publish_mock)
    monkeypatch.setattr(
        main._reference_service,
        "peek_snapshot",
        lambda *_args: {"as_of": "2026-04-01"},
    )
    monkeypatch.setattr(main._reference_service, "runtime_ready", lambda: True)

    created_coroutines = []

    def fake_create_task(coroutine):
        created_coroutines.append(coroutine)
        return None

    monkeypatch.setattr(main.asyncio, "create_task", fake_create_task)

    main._schedule_reference_publish("7203", "jquants_light")
    asyncio.run(created_coroutines[0])

    assert publish_mock.await_count == 1
    assert main._paper_ops_state.reference_status == "degraded"


def test_schedule_reference_publish_clears_reference_warning_on_fresh_snapshot(monkeypatch, tmp_path):
    monkeypatch.setenv("GOOGLE_API_KEY", "test-key")
    monkeypatch.setenv("JQUANTS_API_KEY", "test-key")
    monkeypatch.setattr("server.engine.position.STATE_FILE", tmp_path / "state.json")
    monkeypatch.setattr("server.engine.settings_store.SETTINGS_FILE", tmp_path / "settings.json")
    sys.modules.pop("server.main", None)

    main = importlib.import_module("server.main")
    main._paper_ops_state.record_execution_result(
        timestamp=datetime(2026, 4, 13, 10, 30, 0),
        code="7203",
        ai_ready=True,
        reference_ready=False,
        warning_message="J-Quants reference missing; execution onlyで継続",
    )

    publish_mock = AsyncMock(return_value=None)
    monkeypatch.setattr(main._reference_service, "publish_reference", publish_mock)
    monkeypatch.setattr(
        main._reference_service,
        "peek_snapshot",
        lambda *_args: {"as_of": "2026-04-13"},
    )
    monkeypatch.setattr(main._reference_service, "runtime_ready", lambda: True)

    created_coroutines = []

    def fake_create_task(coroutine):
        created_coroutines.append(coroutine)
        return None

    monkeypatch.setattr(main.asyncio, "create_task", fake_create_task)

    main._schedule_reference_publish("7203", "jquants_light")
    asyncio.run(created_coroutines[0])

    assert publish_mock.await_count == 1
    assert main._paper_ops_state.reference_status == "ready"
    assert main._paper_ops_state.last_warning is None


def test_main_loads_persisted_settings_on_import(monkeypatch, tmp_path):
    monkeypatch.setenv("GOOGLE_API_KEY", "")
    monkeypatch.setenv("JQUANTS_API_KEY", "")
    monkeypatch.setattr("server.engine.position.STATE_FILE", tmp_path / "state.json")
    settings_path = tmp_path / "settings.json"
    settings_path.write_text(
        RiskSettings(limit_per_order=230_000, trading_mode="balanced").model_dump_json(indent=2),
        encoding="utf-8",
    )
    monkeypatch.setattr("server.engine.settings_store.SETTINGS_FILE", settings_path)
    sys.modules.pop("server.main", None)

    main = importlib.import_module("server.main")

    assert main._guard.settings.limit_per_order == 230_000
    assert main._guard.settings.trading_mode == "balanced"

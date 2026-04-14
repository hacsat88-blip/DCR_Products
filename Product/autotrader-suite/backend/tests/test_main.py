import importlib
import sys

from fastapi.testclient import TestClient


def test_main_app_imports_without_api_keys(monkeypatch, tmp_path):
    monkeypatch.setenv("GOOGLE_API_KEY", "")
    monkeypatch.setenv("JQUANTS_API_KEY", "")
    monkeypatch.setattr("server.engine.position.STATE_FILE", tmp_path / "state.json")
    sys.modules.pop("server.main", None)

    main = importlib.import_module("server.main")

    assert main.app.title == "AutoTrader Bridge"


def test_main_exposes_health_endpoint(monkeypatch, tmp_path):
    monkeypatch.setenv("GOOGLE_API_KEY", "")
    monkeypatch.setenv("JQUANTS_API_KEY", "")
    monkeypatch.setattr("server.engine.position.STATE_FILE", tmp_path / "state.json")
    sys.modules.pop("server.main", None)

    main = importlib.import_module("server.main")

    response = TestClient(main.app).get("/api/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "degraded"
    assert data["mode"] == "paper"
    assert data["order_mode"] == "stub_only"

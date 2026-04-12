import importlib
import sys


def test_main_app_imports_without_api_keys(monkeypatch, tmp_path):
    monkeypatch.setenv("GOOGLE_API_KEY", "")
    monkeypatch.setenv("JQUANTS_API_KEY", "")
    monkeypatch.setattr("server.engine.position.STATE_FILE", tmp_path / "state.json")
    sys.modules.pop("server.main", None)

    main = importlib.import_module("server.main")

    assert main.app.title == "AutoTrader Bridge"

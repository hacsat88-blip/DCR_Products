import importlib
import sys


def test_main_app_imports_without_api_keys(monkeypatch, tmp_path):
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.setattr("server.engine.position.STATE_FILE", tmp_path / "state.json")
    sys.modules.pop("server.main", None)

    main = importlib.import_module("server.main")

    assert main.app.title == "AutoTrader Bridge"

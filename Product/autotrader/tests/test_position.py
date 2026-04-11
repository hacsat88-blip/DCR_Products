import json
import pytest
from pathlib import Path
from server.engine.position import PositionManager


@pytest.fixture(autouse=True)
def clean_state(tmp_path, monkeypatch):
    """各テストで state.json を tmp_path に向ける"""
    state_file = tmp_path / "state.json"
    monkeypatch.setattr(
        "server.engine.position.STATE_FILE", state_file
    )
    yield state_file


def test_initial_position_is_zero():
    mgr = PositionManager()
    assert mgr.position.qty == 0
    assert mgr.position.avg_cost == 0.0


def test_apply_buy_sets_position():
    mgr = PositionManager()
    mgr.apply_buy("7203", qty=100, price=2500.0)
    assert mgr.position.qty == 100
    assert mgr.position.avg_cost == 2500.0
    assert mgr.position.code == "7203"


def test_apply_buy_calculates_average_cost():
    mgr = PositionManager()
    mgr.apply_buy("7203", qty=100, price=2000.0)
    mgr.apply_buy("7203", qty=100, price=3000.0)
    assert mgr.position.qty == 200
    assert mgr.position.avg_cost == 2500.0


def test_apply_sell_reduces_position():
    mgr = PositionManager()
    mgr.apply_buy("7203", qty=100, price=2500.0)
    mgr.apply_sell(qty=50, price=2600.0)
    assert mgr.position.qty == 50


def test_apply_sell_all_clears_position():
    mgr = PositionManager()
    mgr.apply_buy("7203", qty=100, price=2500.0)
    mgr.apply_sell(qty=100, price=2600.0)
    assert mgr.position.qty == 0
    assert mgr.position.avg_cost == 0.0
    assert mgr.position.code == ""


def test_pnl_calculated_on_buy(clean_state):
    mgr = PositionManager()
    mgr.apply_buy("7203", qty=100, price=2500.0)
    mgr.update_price(2600.0)
    assert mgr.position.pnl == pytest.approx(10000.0)
    assert mgr.position.pnl_pct == pytest.approx(4.0)


def test_state_persisted_to_json(clean_state):
    mgr = PositionManager()
    mgr.apply_buy("7203", qty=100, price=2500.0)
    data = json.loads(clean_state.read_text())
    assert data["position"]["qty"] == 100


def test_state_loaded_on_restart(clean_state):
    mgr1 = PositionManager()
    mgr1.apply_buy("7203", qty=100, price=2500.0)
    mgr2 = PositionManager()
    assert mgr2.position.qty == 100
    assert mgr2.position.avg_cost == 2500.0

import json
import pytest
from pathlib import Path
from server.engine import position as position_module
from server.engine.position import PositionManager

DEFAULT_STATE_FILE = position_module.STATE_FILE


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


async def test_apply_buy_sets_position():
    mgr = PositionManager()
    await mgr.apply_buy("7203", qty=100, price=2500.0)
    assert mgr.position.qty == 100
    assert mgr.position.avg_cost == 2500.0
    assert mgr.position.code == "7203"


async def test_apply_buy_calculates_average_cost():
    mgr = PositionManager()
    await mgr.apply_buy("7203", qty=100, price=2000.0)
    await mgr.apply_buy("7203", qty=100, price=3000.0)
    assert mgr.position.qty == 200
    assert mgr.position.avg_cost == 2500.0


async def test_apply_sell_reduces_position():
    mgr = PositionManager()
    await mgr.apply_buy("7203", qty=100, price=2500.0)
    await mgr.apply_sell(qty=50, price=2600.0)
    assert mgr.position.qty == 50


async def test_apply_sell_all_clears_position():
    mgr = PositionManager()
    await mgr.apply_buy("7203", qty=100, price=2500.0)
    await mgr.apply_sell(qty=100, price=2600.0)
    assert mgr.position.qty == 0
    assert mgr.position.avg_cost == 0.0
    assert mgr.position.code == ""


async def test_pnl_calculated_on_buy(clean_state):
    mgr = PositionManager()
    await mgr.apply_buy("7203", qty=100, price=2500.0)
    await mgr.update_price(2600.0)
    assert mgr.position.pnl == pytest.approx(10000.0)
    assert mgr.position.pnl_pct == pytest.approx(4.0)


async def test_state_persisted_to_json(clean_state):
    mgr = PositionManager()
    await mgr.apply_buy("7203", qty=100, price=2500.0)
    data = json.loads(clean_state.read_text())
    assert data["position"]["qty"] == 100


async def test_state_loaded_on_restart(clean_state):
    mgr1 = PositionManager()
    await mgr1.apply_buy("7203", qty=100, price=2500.0)
    mgr2 = PositionManager()
    assert mgr2.position.qty == 100
    assert mgr2.position.avg_cost == 2500.0


async def test_apply_sell_over_position_raises():
    mgr = PositionManager()
    await mgr.apply_buy("7203", qty=50, price=2500.0)
    with pytest.raises(ValueError, match="Cannot sell"):
        await mgr.apply_sell(qty=100, price=2600.0)


async def test_state_json_atomic_write(clean_state, tmp_path):
    mgr = PositionManager()
    await mgr.apply_buy("7203", qty=100, price=2500.0)
    tmp_file = tmp_path / "state.tmp"
    assert not tmp_file.exists(), ".tmp file should not remain after successful save"


def test_load_removes_stale_tmp_file_without_overriding_saved_state(clean_state):
    clean_state.write_text(
        json.dumps({"position": {"code": "7203", "qty": 40, "avg_cost": 2500.0}}),
        encoding="utf-8",
    )
    stale_tmp = clean_state.with_suffix(".tmp")
    stale_tmp.write_text("stale", encoding="utf-8")

    mgr = PositionManager()

    assert mgr.position.code == "7203"
    assert mgr.position.qty == 40
    assert not stale_tmp.exists()


def test_default_state_file_is_anchored_under_backend_root():
    assert DEFAULT_STATE_FILE.name == "state.json"
    assert DEFAULT_STATE_FILE.parent.name == "backend"

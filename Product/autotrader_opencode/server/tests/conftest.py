"""テスト共通設定。一時DBを使用しテスト後に削除する。"""
import pytest

from ..trade_store import TradeStore


@pytest.fixture(autouse=True)
def isolated_db(tmp_path, monkeypatch):
    """各テストで一時的なSQLite DBを使用し、main.trade_store を差し替える"""
    db_path = tmp_path / "autotrader_test.db"
    monkeypatch.setenv("AUTOTRADER_DB_PATH", str(db_path))
    from .. import main as m
    m.trade_store = TradeStore(str(db_path))
    yield db_path

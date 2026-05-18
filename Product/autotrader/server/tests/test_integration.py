"""
統合テスト: 価格受信 → フィルタ → Codex助言 → RiskGuard → 発注判断 の全ワークフローを検証
"""
from datetime import datetime, time
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from ..capital_router import CapitalRouter, Tier
from ..codex_advisor import CodexAdvice
from ..risk_guard import RiskGuard
from ..technical_filter import PriceData, TechnicalFilter
from ..capital_router import TIER_CONFIGS


# ── ヘルパー ─────────────────────────────────────────────────────────────────

def make_price_payload(
    symbol="8306",
    price=1_500.0,          # MID(60万)上限20万: 100株=15万 → 収まる
    volume=5_000_000,
    avg_volume_5d=3_000_000,
    rsi14=45.0,
    prev_close=1_470.0,
    available_cash=600_000,
    timestamp="2026-05-12T10:00:00",
):
    return {
        "symbol": symbol,
        "price": price,
        "volume": volume,
        "avg_volume_5d": avg_volume_5d,
        "rsi14": rsi14,
        "prev_close": prev_close,
        "available_cash": available_cash,
        "timestamp": timestamp,
    }


# ── ティア切替統合テスト ───────────────────────────────────────────────────────

class TestTierSwitching:
    """資金量に応じたティア切替の統合検証"""

    def test_small_tier_max_order_100k(self):
        router = CapitalRouter()
        config = router.get_config(400_000)
        assert config.max_order_amount == 100_000
        assert config.name == Tier.SMALL

    def test_mid_tier_activates_at_500k(self):
        router = CapitalRouter()
        assert router.get_tier(499_999) == Tier.SMALL
        assert router.get_tier(500_000) == Tier.MID

    def test_large_tier_activates_at_1m(self):
        router = CapitalRouter()
        assert router.get_tier(999_999) == Tier.MID
        assert router.get_tier(1_000_000) == Tier.LARGE

    def test_small_tier_stricter_volume_filter(self):
        router = CapitalRouter()
        filt = TechnicalFilter()
        small_config = router.get_config(400_000)
        large_config = router.get_config(1_500_000)

        # 出来高比1.4倍: SMALLは拒否、LARGEは通過
        data = PriceData(
            symbol="7203", price=2310, volume=1_400_000, avg_volume_5d=1_000_000,
            rsi14=45.0, prev_close=2280, current_time=time(10, 0)
        )
        assert not filt.check(data, small_config).passed   # SMALL: ×1.5倍未達
        assert filt.check(data, large_config).passed       # LARGE: ×1.3倍は達成

    def test_large_tier_tighter_rsi_range(self):
        router = CapitalRouter()
        filt = TechnicalFilter()
        small_config = router.get_config(400_000)
        large_config = router.get_config(1_500_000)

        # RSI 37: SMALL通過（35〜55）、LARGE拒否（40〜60）
        data = PriceData(
            symbol="7203", price=2310, volume=1_500_000, avg_volume_5d=1_000_000,
            rsi14=37.0, prev_close=2280, current_time=time(10, 0)
        )
        assert filt.check(data, small_config).passed
        assert not filt.check(data, large_config).passed


# ── フルパイプライン統合テスト ────────────────────────────────────────────────

class TestFullPipeline:
    """価格受信 → フィルタ → リスクチェック → Codex助言 の全フロー"""

    def _make_pipeline(self):
        router = CapitalRouter()
        filt = TechnicalFilter()
        guard = RiskGuard()
        return router, filt, guard

    def test_valid_buy_signal_flows_through(self):
        router, filt, guard = self._make_pipeline()
        # MID上限20万: 1,500円株なら100株=15万で収まる
        available_cash = 600_000
        price = 1_500

        config = router.get_config(available_cash)
        data = PriceData(
            symbol="8306", price=price, volume=5_000_000, avg_volume_5d=3_000_000,
            rsi14=42.0, prev_close=1_470, current_time=time(10, 0)
        )

        # Step1: フィルター
        filter_result = filt.check(data, config)
        assert filter_result.passed, f"フィルター失敗: {filter_result.reason}"

        # Step2: エントリーチェック
        target_price = price * 1.02
        entry_result = guard.check_entry(data.symbol, price, target_price, datetime(2026, 5, 12, 10, 0))
        assert entry_result.allowed, f"エントリー拒否: {entry_result.reason}"

        # Step3: ロット計算（上限内に収まること）
        lot = router.calc_lot(available_cash, price)
        assert lot >= 100
        assert lot * price <= config.max_order_amount

    def test_outside_hours_blocked_at_filter(self):
        router, filt, guard = self._make_pipeline()
        config = router.get_config(600_000)
        data = PriceData(
            symbol="7203", price=2310, volume=1_600_000, avg_volume_5d=1_000_000,
            rsi14=42.0, prev_close=2280, current_time=time(11, 35)  # 昼休み
        )
        result = filt.check(data, config)
        assert not result.passed
        assert "時間外" in result.reason

    def test_profit_target_stops_further_entries(self):
        _, filt, guard = self._make_pipeline()
        guard.on_entry("7203", 2310, datetime(2026, 5, 12, 10, 0))
        guard.on_exit("7203", 5_200)  # +5200円 → 目標超過

        assert guard.session.trading_stopped
        assert guard.session.daily_pnl == 5_200
        result = guard.check_entry("6758", 12500, 12700, datetime(2026, 5, 12, 11, 0))
        assert not result.allowed
        assert "目標" in result.reason

    def test_loss_limit_stops_trading(self):
        _, _, guard = self._make_pipeline()
        guard.on_entry("7203", 2310, datetime(2026, 5, 12, 10, 0))
        guard.on_exit("7203", -3_200)  # -3200円 → 上限超過

        assert guard.session.trading_stopped
        result = guard.check_entry("6758", 12500, 12700, datetime(2026, 5, 12, 11, 0))
        assert not result.allowed

    def test_two_position_limit_enforced(self):
        router, filt, guard = self._make_pipeline()
        guard.on_entry("7203", 2310, datetime(2026, 5, 12, 9, 30))
        guard.on_entry("6758", 12500, datetime(2026, 5, 12, 9, 35))

        # 3銘柄目はRiskGuardで拒否
        result = guard.check_entry("9984", 8900, 9100, datetime(2026, 5, 12, 10, 0))
        assert not result.allowed
        assert "2" in result.reason

    def test_rr_ratio_gate(self):
        _, _, guard = self._make_pipeline()
        # reward = (2315-2310)*100 = 500円 < 2000*1.5=3000円 → RR比不足
        result = guard.check_entry("7203", 2310, 2315, datetime(2026, 5, 12, 10, 0), lot=100)
        assert not result.allowed
        assert "RR" in result.reason

    def test_rr_ratio_passes_when_target_sufficient(self):
        _, _, guard = self._make_pipeline()
        # reward = (2400-2310)*100 = 9000円 > 2000*1.5=3000円 → OK
        result = guard.check_entry("7203", 2310, 2400, datetime(2026, 5, 12, 10, 0), lot=100)
        assert result.allowed

    def test_60min_timeout_forces_exit(self):
        _, _, guard = self._make_pipeline()
        entry_time = datetime(2026, 5, 12, 9, 30)
        guard.on_entry("7203", 2310, entry_time)

        # 61分後: 時間切れで強制売り
        check_time = datetime(2026, 5, 12, 10, 31)
        result = guard.check_exit("7203", 2320, check_time)
        assert result.allowed
        assert "時間切れ" in result.reason

    def test_riskguard_daily_pnl_accumulates(self):
        _, _, guard = self._make_pipeline()
        guard.on_entry("7203", 2310, datetime(2026, 5, 12, 9, 30))
        guard.on_exit("7203", 2_000)
        guard.on_entry("6758", 12500, datetime(2026, 5, 12, 10, 0))
        guard.on_exit("6758", 1_500)

        assert guard.session.daily_pnl == 3_500
        assert not guard.session.trading_stopped  # まだ5000円未達

    def test_remaining_risk_budget_reflects_pnl(self):
        _, _, guard = self._make_pipeline()
        guard.session.daily_pnl = -1_500
        assert guard.get_remaining_risk_budget() == -1_500  # -3000 - (-1500) = -1500


# ── FastAPI エンドポイント統合テスト ─────────────────────────────────────────

class TestFastAPIEndpoints:
    """HTTP API のエンドポイントを通じた統合テスト"""

    @pytest.fixture
    def client(self):
        from .. import main as m
        # テスト用に状態をリセット
        m.risk_guard = RiskGuard()
        m._simulation_mode = True
        with patch.object(m.codex_advisor, "review") as mock_review:
            mock_review.return_value = CodexAdvice(
                risk_state="GREEN",
                should_stop_new_entries=False,
                should_reduce_size=False,
                reason="ローカルルール継続",
                rule_issue="なし",
                improvement="記録を継続する",
            )
            with TestClient(m.app) as c:
                yield c, mock_review

    def test_status_endpoint_returns_defaults(self, client):
        c, _ = client
        resp = c.get("/api/status")
        assert resp.status_code == 200
        data = resp.json()
        assert data["daily_pnl"] == 0.0
        assert data["simulation_mode"] is True

    def test_price_endpoint_hold_outside_hours(self, client):
        c, _ = client
        payload = make_price_payload(timestamp="2026-05-12T12:10:00")  # 昼休み
        resp = c.post("/api/price", json=payload)
        assert resp.status_code == 200
        assert resp.json()["action"] == "hold"

    def test_price_endpoint_exit_check_runs_before_entry_filters(self, client):
        c, mock_review = client
        from .. import main as m
        m.risk_guard.reset_session(datetime(2026, 5, 12).date())
        m.risk_guard.on_entry("7203", 2310, datetime(2026, 5, 12, 9, 30), lot=100)
        payload = make_price_payload(
            symbol="7203",
            price=2280.0,
            prev_close=2310.0,
            available_cash=600_000,
            timestamp="2026-05-12T12:10:00",  # 昼休みでも保有中の損切りを優先
        )

        resp = c.post("/api/price", json=payload)

        assert resp.status_code == 200
        data = resp.json()
        assert data["action"] == "sell"
        assert "損切り" in data["reason"]
        assert data["advisor"] is None
        assert not mock_review.called

    def test_price_endpoint_local_buy_with_advisor_reference(self, client):
        c, mock_review = client
        payload = make_price_payload(timestamp="2026-05-12T10:00:00")
        resp = c.post("/api/price", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        # 発注アクションはローカルルール、Codexはadvisorとして返る
        assert data["action"] == "buy"
        assert data["simulation"] is True
        assert data["advisor"]["risk_state"] == "GREEN"
        assert mock_review.called
        assert "tier" in data
        assert data["tier"] == "MID"  # 60万円 → MID

    def test_price_endpoint_blocks_new_entry_when_advisor_api_fails(self, client):
        c, mock_review = client
        from .. import main as m
        mock_review.return_value = CodexAdvice(
            risk_state="RED",
            should_stop_new_entries=True,
            should_reduce_size=True,
            reason="Codex app-serverが利用できないため新規建て禁止",
            rule_issue="app-server失敗",
            improvement="codex login を確認",
            api_error=True,
        )
        payload = make_price_payload(timestamp="2026-05-12T10:00:00")
        resp = c.post("/api/price", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["action"] == "hold"
        assert data["advisor"]["api_error"] is True
        assert m.risk_guard.session.new_entries_blocked

    def test_tier_reflected_in_response(self, client):
        c, _ = client
        # 40万円 → SMALL。800円株なら100株=8万で収まる
        payload = make_price_payload(
            available_cash=400_000,
            price=800.0,
            prev_close=785.0,
            volume=2_000_000,
            avg_volume_5d=1_000_000,
            timestamp="2026-05-12T10:00:00",
        )
        resp = c.post("/api/price", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("tier") == "SMALL"

    def test_simulation_toggle(self, client):
        c, _ = client
        resp = c.post("/api/simulation/off")
        assert resp.status_code == 200
        assert resp.json()["simulation_mode"] is False

        resp = c.post("/api/simulation/on")
        assert resp.json()["simulation_mode"] is True

    def test_order_result_updates_pnl(self, client):
        c, _ = client
        from .. import main as m
        m.risk_guard.reset_session(datetime(2026, 5, 12).date())
        m.risk_guard.on_entry("7203", 2310, datetime(2026, 5, 12, 9, 30))

        order = {
            "symbol": "7203",
            "action": "sell",
            "executed_price": 2360.0,
            "qty": 100,
            "timestamp": "2026-05-12T10:30:00",
        }
        resp = c.post("/api/order-result", json=order)
        assert resp.status_code == 200
        assert m.risk_guard.session.daily_pnl == (2360 - 2310) * 100  # +5000円

    def test_duplicate_order_result_is_ignored(self, client):
        c, _ = client
        order = {
            "symbol": "7203",
            "action": "buy",
            "executed_price": 2310.0,
            "qty": 100,
            "timestamp": "2026-05-12T09:30:00",
        }
        first = c.post("/api/order-result", json=order)
        duplicate = c.post("/api/order-result", json=order)

        assert first.status_code == 200
        assert duplicate.status_code == 200
        assert first.json()["status"] == "ok"
        assert duplicate.json()["status"] == "ignored"

    def test_unknown_sell_order_result_is_ignored(self, client):
        c, _ = client
        order = {
            "symbol": "7203",
            "action": "sell",
            "executed_price": 2300.0,
            "qty": 100,
            "timestamp": "2026-05-12T10:00:00",
        }
        resp = c.post("/api/order-result", json=order)

        assert resp.status_code == 200
        assert resp.json()["status"] == "ignored"

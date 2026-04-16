import pytest
from datetime import datetime
from pydantic import ValidationError
from server.models import (
    ExecutionResultRequest, OHLCBar, PriceFeedResponse, PriceRequest, TradeDecision, Position, RiskSettings
)


def test_ohlc_bar_valid():
    bar = OHLCBar(o=100.0, h=110.0, l=95.0, c=105.0, v=1000)
    assert bar.c == 105.0
    assert bar.v == 1000


def test_ohlc_bar_volume_default():
    bar = OHLCBar(o=100.0, h=110.0, l=95.0, c=105.0)
    assert bar.v == 0


def test_ohlc_bar_high_lt_low():
    with pytest.raises(ValidationError):
        OHLCBar(o=95.0, h=90.0, l=100.0, c=95.0)


def test_price_request_valid():
    req = PriceRequest(
        code="7203",
        price=2500.0,
        volume=12000,
        ohlc=[OHLCBar(o=2490, h=2510, l=2485, c=2500)],
        timestamp=datetime.now(),
    )
    assert req.code == "7203"
    assert len(req.ohlc) == 1


def test_price_request_zero_price():
    with pytest.raises(ValidationError):
        PriceRequest(
            code="7203",
            price=0.0,
            volume=12000,
            ohlc=[OHLCBar(o=2490, h=2510, l=2485, c=2500)],
            timestamp=datetime.now(),
        )


def test_price_request_negative_price():
    with pytest.raises(ValidationError):
        PriceRequest(
            code="7203",
            price=-100.0,
            volume=12000,
            ohlc=[OHLCBar(o=2490, h=2510, l=2485, c=2500)],
            timestamp=datetime.now(),
        )


def test_price_request_empty_ohlc():
    with pytest.raises(ValidationError):
        PriceRequest(
            code="7203",
            price=2500.0,
            volume=12000,
            ohlc=[],
            timestamp=datetime.now(),
        )


def test_price_request_defaults_to_execution_rakuten_feed():
    req = PriceRequest(
        code="7203",
        price=320.0,
        volume=12000,
        ohlc=[OHLCBar(o=315, h=325, l=310, c=320)],
        timestamp=datetime.now(),
    )
    assert req.feed_role == "execution"
    assert req.feed_source == "rakuten_rss"
    assert req.available_cash_actual is None
    assert req.client_run_mode == "paper"
    assert req.client_order_mode == "stub_only"
    assert req.client_live_armed is False


def test_price_request_normalizes_live_armed_when_not_in_live_broker_mode():
    req = PriceRequest(
        code="7203",
        price=320.0,
        volume=12000,
        ohlc=[OHLCBar(o=315, h=325, l=310, c=320)],
        timestamp=datetime.now(),
        client_run_mode="paper",
        client_order_mode="broker_auto",
        client_live_armed=True,
    )

    assert req.client_run_mode == "paper"
    assert req.client_order_mode == "stub_only"
    assert req.client_live_armed is False


def test_price_request_accepts_live_broker_mode_when_armed():
    req = PriceRequest(
        code="7203",
        price=320.0,
        volume=12000,
        ohlc=[OHLCBar(o=315, h=325, l=310, c=320)],
        timestamp=datetime.now(),
        client_run_mode="live",
        client_order_mode="broker_auto",
        client_live_armed=True,
    )

    assert req.client_run_mode == "live"
    assert req.client_order_mode == "broker_auto"
    assert req.client_live_armed is True


def test_price_request_accepts_available_cash_actual():
    req = PriceRequest(
        code="7203",
        price=320.0,
        volume=12000,
        available_cash_actual=25000,
        ohlc=[OHLCBar(o=315, h=325, l=310, c=320)],
        timestamp=datetime.now(),
    )

    assert req.available_cash_actual == 25000


def test_execution_result_request_normalizes_non_live_mode_to_stub_only():
    req = ExecutionResultRequest(
        code="7203",
        action="buy",
        qty=100,
        price=320.0,
        reason="約定",
        timestamp=datetime.now(),
        client_run_mode="paper",
        client_order_mode="broker_auto",
        client_live_armed=True,
    )

    assert req.client_run_mode == "paper"
    assert req.client_order_mode == "stub_only"
    assert req.client_live_armed is False


def test_execution_result_request_requires_pending_execution_id_in_live_broker_mode():
    with pytest.raises(ValidationError):
        ExecutionResultRequest(
            code="7203",
            action="buy",
            qty=100,
            price=320.0,
            reason="約定",
            timestamp=datetime.now(),
            client_run_mode="live",
            client_order_mode="broker_auto",
            client_live_armed=True,
        )


def test_execution_result_request_accepts_pending_execution_id_in_live_broker_mode():
    req = ExecutionResultRequest(
        code="7203",
        action="buy",
        qty=100,
        price=320.0,
        reason="約定",
        timestamp=datetime.now(),
        client_run_mode="live",
        client_order_mode="broker_auto",
        client_live_armed=True,
        pending_execution_id="pending-123",
    )

    assert req.pending_execution_id == "pending-123"


def test_price_request_reference_feed_defaults_to_jquants_light():
    req = PriceRequest(
        code="7203",
        price=320.0,
        volume=12000,
        ohlc=[OHLCBar(o=315, h=325, l=310, c=320)],
        timestamp=datetime.now(),
        feed_role="reference",
    )
    assert req.feed_role == "reference"
    assert req.feed_source == "jquants_light"


def test_price_request_accepts_optional_bid_ask_and_news_halt():
    req = PriceRequest(
        code="7203",
        price=320.0,
        volume=12000,
        bid=319.8,
        ask=320.2,
        news_halt=True,
        news_note="決算速報",
        ohlc=[OHLCBar(o=315, h=325, l=310, c=320)],
        timestamp=datetime.now(),
    )

    assert req.bid == 319.8
    assert req.ask == 320.2
    assert req.news_halt is True
    assert req.news_note == "決算速報"


def test_price_request_rejects_ask_lower_than_bid():
    with pytest.raises(ValidationError):
        PriceRequest(
            code="7203",
            price=320.0,
            volume=12000,
            bid=320.5,
            ask=320.2,
            ohlc=[OHLCBar(o=315, h=325, l=310, c=320)],
            timestamp=datetime.now(),
        )


def test_price_request_rejects_execution_reference_mismatch():
    with pytest.raises(ValidationError):
        PriceRequest(
            code="7203",
            price=320.0,
            volume=12000,
            ohlc=[OHLCBar(o=315, h=325, l=310, c=320)],
            timestamp=datetime.now(),
            feed_role="reference",
            feed_source="rakuten_rss",
        )


def test_trade_decision_valid():
    d = TradeDecision(action="buy", qty=100, reason="テスト")
    assert d.order_type == "成行"


def test_trade_decision_invalid_action():
    with pytest.raises(ValidationError):
        TradeDecision(action="unknown", qty=100, reason="テスト")


def test_trade_decision_negative_qty():
    with pytest.raises(ValidationError):
        TradeDecision(action="buy", qty=-1, reason="テスト")


def test_price_feed_response_accepts_reference_advisory_fields():
    response = PriceFeedResponse(
        action="hold",
        qty=0,
        reason="様子見",
        reference_status="stale",
        reference_price=251.5,
        reference_volume=12000,
        reference_source="jquants_light",
        reference_as_of="2026-04-01",
        reference_age_days=11,
        reference_gap_pct=-0.596,
        warning_code="reference_stale",
        warning_message="J-Quants reference stale (11 days); execution onlyで継続",
    )

    assert response.reference_status == "stale"
    assert response.reference_source == "jquants_light"
    assert response.warning_code == "reference_stale"


def test_risk_settings_defaults():
    s = RiskSettings()
    assert s.limit_per_order == 100_000
    assert s.stop_loss_pct == 3.0
    assert s.max_qty_per_order == 100
    assert s.poll_interval_sec == 5
    assert s.ai_mode == "gemini"
    assert s.trading_mode == "conservative"
    assert s.available_cash < 300_000
    assert s.execution_feed == "rakuten_rss"
    assert s.reference_feed == "jquants_light"
    assert s.prioritize_manual_price_band is True
    assert s.manual_price_min == 100
    assert s.manual_price_max == 500
    assert s.suggested_price_min == 100
    assert s.suggested_price_max == 290
    assert s.effective_price_min == 100
    assert s.effective_price_max == 500
    assert s.effective_max_daily_orders == 3
    assert s.effective_max_concurrent_positions == 1
    assert s.max_spread_bps == 20.0
    assert s.skip_open_minutes == 5


def test_risk_settings_auto_suggests_band_from_cash_when_manual_priority_disabled():
    s = RiskSettings(
        trading_mode="balanced",
        available_cash=240_000,
        prioritize_manual_price_band=False,
    )
    assert s.suggested_price_min == 100
    assert s.suggested_price_max == 300
    assert s.effective_price_min == 100
    assert s.effective_price_max == 300
    assert s.effective_max_daily_orders == 5
    assert s.effective_max_concurrent_positions == 2


def test_risk_settings_zero_limit():
    with pytest.raises(ValidationError):
        RiskSettings(limit_per_order=0)


def test_risk_settings_zero_stop_loss():
    with pytest.raises(ValidationError):
        RiskSettings(stop_loss_pct=0)


def test_risk_settings_rejects_non_gemini_ai_mode():
    with pytest.raises(ValidationError):
        RiskSettings(ai_mode="hybrid")


def test_position_defaults():
    p = Position()
    assert p.qty == 0
    assert p.avg_cost == 0.0

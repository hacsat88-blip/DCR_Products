import pytest
from datetime import datetime
from pydantic import ValidationError
from server.models import (
    OHLCBar, PriceRequest, TradeDecision, Position, RiskSettings
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


def test_trade_decision_valid():
    d = TradeDecision(action="buy", qty=100, reason="テスト")
    assert d.order_type == "成行"


def test_trade_decision_invalid_action():
    with pytest.raises(ValidationError):
        TradeDecision(action="unknown", qty=100, reason="テスト")


def test_trade_decision_negative_qty():
    with pytest.raises(ValidationError):
        TradeDecision(action="buy", qty=-1, reason="テスト")


def test_risk_settings_defaults():
    s = RiskSettings()
    assert s.limit_per_order == 100_000
    assert s.stop_loss_pct == 3.0
    assert s.max_qty_per_order == 100
    assert s.poll_interval_sec == 5


def test_risk_settings_zero_limit():
    with pytest.raises(ValidationError):
        RiskSettings(limit_per_order=0)


def test_risk_settings_zero_stop_loss():
    with pytest.raises(ValidationError):
        RiskSettings(stop_loss_pct=0)


def test_position_defaults():
    p = Position()
    assert p.qty == 0
    assert p.avg_cost == 0.0

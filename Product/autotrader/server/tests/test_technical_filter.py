from datetime import time
import pytest
from ..capital_router import TIER_CONFIGS, Tier
from ..technical_filter import PriceData, TechnicalFilter


@pytest.fixture
def filt():
    return TechnicalFilter()


@pytest.fixture
def config_small():
    return TIER_CONFIGS[Tier.SMALL]


def _base(override: dict = {}) -> PriceData:
    defaults = dict(
        symbol="7203",
        price=2_310,
        volume=1_500_000,
        avg_volume_5d=1_000_000,
        rsi14=45.0,
        prev_close=2_280,
        current_time=time(10, 0),
    )
    return PriceData(**{**defaults, **override})


def test_passes_valid(filt, config_small):
    result = filt.check(_base(), config_small)
    assert result.passed


def test_fails_outside_session(filt, config_small):
    result = filt.check(_base({"current_time": time(12, 0)}), config_small)
    assert not result.passed
    assert "時間外" in result.reason


def test_fails_low_volume(filt, config_small):
    result = filt.check(_base({"volume": 500_000}), config_small)
    assert not result.passed
    assert "出来高" in result.reason


def test_fails_rsi_too_high(filt, config_small):
    result = filt.check(_base({"rsi14": 65.0}), config_small)
    assert not result.passed
    assert "RSI" in result.reason


def test_fails_rsi_too_low(filt, config_small):
    result = filt.check(_base({"rsi14": 28.0}), config_small)
    assert not result.passed


def test_fails_price_drop_too_large(filt, config_small):
    # -5%下落は範囲外
    result = filt.check(_base({"price": 2_280 * 0.94, "prev_close": 2_280}), config_small)
    assert not result.passed


def test_afternoon_session_passes(filt, config_small):
    result = filt.check(_base({"current_time": time(13, 0)}), config_small)
    assert result.passed

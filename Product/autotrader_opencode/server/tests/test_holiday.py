"""祝日・週末でフィルターがブロックすることを検証"""
from datetime import date, time
import pytest
from ..capital_router import TIER_CONFIGS, Tier
from ..technical_filter import PriceData, TechnicalFilter


@pytest.fixture
def filt():
    return TechnicalFilter()


@pytest.fixture
def cfg():
    return TIER_CONFIGS[Tier.MID]


def _data(d: date, override: dict | None = None):
    base = dict(
        symbol="7203", price=2310, volume=1_500_000,
        avg_volume_5d=1_000_000, rsi14=45.0,
        prev_close=2280, current_time=time(10, 0),
        current_date=d,
    )
    if override:
        base.update(override)
    return PriceData(**base)


def test_kodomo_no_hi_blocked(filt, cfg):
    """2026-05-05 こどもの日 → 祝日ブロック"""
    result = filt.check(_data(date(2026, 5, 5)), cfg)
    assert not result.passed
    assert "祝日" in result.reason


def test_new_year_blocked(filt, cfg):
    """2026-01-01 元日 → 祝日ブロック"""
    result = filt.check(_data(date(2026, 1, 1)), cfg)
    assert not result.passed


def test_saturday_blocked(filt, cfg):
    """2026-05-09 (土) → 土日ブロック"""
    d = date(2026, 5, 9)
    assert d.weekday() == 5
    result = filt.check(_data(d), cfg)
    assert not result.passed
    assert "土日" in result.reason


def test_sunday_blocked(filt, cfg):
    """2026-05-10 (日) → 土日ブロック"""
    d = date(2026, 5, 10)
    assert d.weekday() == 6
    result = filt.check(_data(d), cfg)
    assert not result.passed


def test_weekday_passes(filt, cfg):
    """2026-05-13 (水・平日) → 通過"""
    d = date(2026, 5, 13)
    result = filt.check(_data(d), cfg)
    assert result.passed


def test_legacy_no_date_still_works(filt, cfg):
    """current_dateがNoneの場合は祝日チェックをスキップ（後方互換）"""
    base = PriceData(
        symbol="7203", price=2310, volume=1_500_000,
        avg_volume_5d=1_000_000, rsi14=45.0,
        prev_close=2280, current_time=time(10, 0),
        current_date=None,
    )
    result = filt.check(base, cfg)
    assert result.passed

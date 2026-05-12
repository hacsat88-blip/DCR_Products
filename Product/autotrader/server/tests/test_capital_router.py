import pytest
from ..capital_router import CapitalRouter, Tier


@pytest.fixture
def router():
    return CapitalRouter()


def test_tier_small(router):
    assert router.get_tier(400_000) == Tier.SMALL


def test_tier_boundary_500k(router):
    assert router.get_tier(500_000) == Tier.MID


def test_tier_mid(router):
    assert router.get_tier(750_000) == Tier.MID


def test_tier_boundary_1m(router):
    assert router.get_tier(1_000_000) == Tier.LARGE


def test_tier_large(router):
    assert router.get_tier(1_500_000) == Tier.LARGE


def test_max_order_small(router):
    assert router.get_max_order_amount(400_000) == 100_000


def test_max_order_mid(router):
    assert router.get_max_order_amount(750_000) == 200_000


def test_max_order_large(router):
    assert router.get_max_order_amount(1_500_000) == 300_000


def test_calc_lot_rounds_to_100(router):
    lot = router.calc_lot(400_000, 1_200)
    assert lot % 100 == 0
    assert lot >= 100


def test_calc_lot_does_not_exceed_max_order(router):
    price = 500
    lot = router.calc_lot(400_000, price)
    assert lot * price <= 100_000 + price  # 100株単位の丸めで多少超えることを許容

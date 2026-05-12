from dataclasses import dataclass
from enum import Enum


class Tier(str, Enum):
    SMALL = "SMALL"
    MID = "MID"
    LARGE = "LARGE"


@dataclass
class TierConfig:
    name: Tier
    max_market_cap: float | None  # 億円、Noneは上限なし
    max_order_amount: float        # 円
    volume_ratio_threshold: float  # 5日平均出来高倍率
    rsi_min: float
    rsi_max: float
    price_change_min: float  # 前日比下限（%）
    price_change_max: float  # 前日比上限（%）


TIER_CONFIGS: dict[Tier, TierConfig] = {
    Tier.SMALL: TierConfig(
        name=Tier.SMALL,
        max_market_cap=300.0,
        max_order_amount=100_000,
        volume_ratio_threshold=1.5,
        rsi_min=35.0,
        rsi_max=55.0,
        price_change_min=-3.0,
        price_change_max=5.0,
    ),
    Tier.MID: TierConfig(
        name=Tier.MID,
        max_market_cap=1_000.0,
        max_order_amount=200_000,
        volume_ratio_threshold=1.5,
        rsi_min=35.0,
        rsi_max=55.0,
        price_change_min=-3.0,
        price_change_max=5.0,
    ),
    Tier.LARGE: TierConfig(
        name=Tier.LARGE,
        max_market_cap=None,
        max_order_amount=300_000,
        volume_ratio_threshold=1.3,
        rsi_min=40.0,
        rsi_max=60.0,
        price_change_min=-2.0,
        price_change_max=4.0,
    ),
}


class CapitalRouter:
    def get_tier(self, available_cash: float) -> Tier:
        if available_cash < 500_000:
            return Tier.SMALL
        elif available_cash < 1_000_000:
            return Tier.MID
        return Tier.LARGE

    def get_config(self, available_cash: float) -> TierConfig:
        return TIER_CONFIGS[self.get_tier(available_cash)]

    def get_max_order_amount(self, available_cash: float) -> float:
        return self.get_config(available_cash).max_order_amount

    def calc_lot(self, available_cash: float, price: float) -> int:
        """購入可能株数（100株単位）を返す"""
        max_amount = self.get_max_order_amount(available_cash)
        raw_lot = int(max_amount / price / 100) * 100
        return max(100, raw_lot)

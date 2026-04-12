from typing import Literal
from datetime import datetime
from pydantic import BaseModel, Field, computed_field, field_validator, model_validator

TradeMode = Literal["conservative", "balanced", "aggressive"]
AISelectionMode = Literal["gemini"]
FeedRole = Literal["execution", "reference"]
FeedSource = Literal["rakuten_rss", "jquants_light", "jquants_free"]
ReferenceStatus = Literal["ok", "missing", "stale"]
ReferenceWarningCode = Literal["reference_missing", "reference_stale"]

_MODE_PRICE_DIVISORS: dict[TradeMode, int] = {
    "conservative": 1000,
    "balanced": 800,
    "aggressive": 600,
}
_MODE_MAX_DAILY_ORDERS: dict[TradeMode, int] = {
    "conservative": 3,
    "balanced": 5,
    "aggressive": 8,
}
_MODE_MAX_CONCURRENT_POSITIONS: dict[TradeMode, int] = {
    "conservative": 1,
    "balanced": 2,
    "aggressive": 3,
}


class OHLCBar(BaseModel):
    o: float
    h: float
    l: float
    c: float
    v: int = 0

    @model_validator(mode="after")
    def high_ge_low(self) -> "OHLCBar":
        if self.h < self.l:
            raise ValueError(f"h ({self.h}) must be >= l ({self.l})")
        return self


class PriceRequest(BaseModel):
    code: str
    price: float
    volume: int
    ohlc: list[OHLCBar] = Field(min_length=1)
    timestamp: datetime
    feed_role: FeedRole = "execution"
    feed_source: FeedSource | None = None

    @field_validator("price")
    @classmethod
    def price_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError(f"price must be positive, got {v}")
        return v

    @model_validator(mode="after")
    def validate_feed_mapping(self) -> "PriceRequest":
        if self.feed_source is None:
            self.feed_source = (
                "rakuten_rss" if self.feed_role == "execution" else "jquants_light"
            )

        if self.feed_role == "execution" and self.feed_source != "rakuten_rss":
            raise ValueError("execution feed must use rakuten_rss")

        if self.feed_role == "reference" and self.feed_source not in {
            "jquants_light",
            "jquants_free",
        }:
            raise ValueError("reference feed must use J-Quants Light or Free")

        return self


class TradeDecision(BaseModel):
    action: Literal["buy", "sell", "hold"]
    qty: int = Field(ge=0)
    order_type: str = "成行"
    reason: str


class PriceFeedResponse(TradeDecision):
    reference_status: ReferenceStatus = "missing"
    reference_price: float | None = None
    reference_volume: int | None = None
    reference_source: FeedSource | None = None
    reference_as_of: str | None = None
    reference_age_days: int | None = Field(default=None, ge=0)
    reference_gap_pct: float | None = None
    warning_code: ReferenceWarningCode | None = None
    warning_message: str | None = None


class Position(BaseModel):
    code: str = ""
    qty: int = 0
    avg_cost: float = 0.0
    pnl: float = 0.0
    pnl_pct: float = 0.0


class RiskSettings(BaseModel):
    limit_per_order: int = Field(default=100_000, gt=0)
    stop_loss_pct: float = Field(default=3.0, gt=0)
    max_qty_per_order: int = Field(default=100, gt=0)
    poll_interval_sec: int = Field(default=5, gt=0)
    ai_mode: AISelectionMode = "gemini"
    trading_mode: TradeMode = "conservative"
    available_cash: int = Field(default=290_000, gt=0)
    execution_feed: Literal["rakuten_rss"] = "rakuten_rss"
    reference_feed: Literal["jquants_light", "jquants_free"] = "jquants_light"
    prioritize_manual_price_band: bool = True
    manual_price_min: int = Field(default=100, gt=0)
    manual_price_max: int = Field(default=500, gt=0)
    max_daily_orders: int | None = Field(default=None, gt=0)
    max_concurrent_positions: int | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def validate_manual_band(self) -> "RiskSettings":
        if self.manual_price_min > self.manual_price_max:
            raise ValueError("manual_price_min must be <= manual_price_max")
        return self

    @computed_field(return_type=int)
    @property
    def suggested_price_min(self) -> int:
        return 100

    @computed_field(return_type=int)
    @property
    def suggested_price_max(self) -> int:
        divisor = _MODE_PRICE_DIVISORS[self.trading_mode]
        return max(self.suggested_price_min, min(500, self.available_cash // divisor))

    @computed_field(return_type=int)
    @property
    def effective_price_min(self) -> int:
        if self.prioritize_manual_price_band:
            return self.manual_price_min
        return self.suggested_price_min

    @computed_field(return_type=int)
    @property
    def effective_price_max(self) -> int:
        if self.prioritize_manual_price_band:
            return self.manual_price_max
        return self.suggested_price_max

    @computed_field(return_type=int)
    @property
    def effective_max_daily_orders(self) -> int:
        if self.max_daily_orders is not None:
            return self.max_daily_orders
        return _MODE_MAX_DAILY_ORDERS[self.trading_mode]

    @computed_field(return_type=int)
    @property
    def effective_max_concurrent_positions(self) -> int:
        if self.max_concurrent_positions is not None:
            return self.max_concurrent_positions
        return _MODE_MAX_CONCURRENT_POSITIONS[self.trading_mode]

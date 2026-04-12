from typing import Literal
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, model_validator


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

    @field_validator("price")
    @classmethod
    def price_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError(f"price must be positive, got {v}")
        return v


class TradeDecision(BaseModel):
    action: Literal["buy", "sell", "hold"]
    qty: int = Field(ge=0)
    order_type: str = "成行"
    reason: str


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
    ai_mode: Literal["gemini", "hybrid"] = "gemini"

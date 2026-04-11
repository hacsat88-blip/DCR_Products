from typing import Literal
from datetime import datetime
from pydantic import BaseModel


class OHLCBar(BaseModel):
    o: float
    h: float
    l: float
    c: float
    v: int = 0


class PriceRequest(BaseModel):
    code: str
    price: float
    volume: int
    ohlc: list[OHLCBar]
    timestamp: datetime


class TradeDecision(BaseModel):
    action: Literal["buy", "sell", "hold"]
    qty: int
    order_type: str = "成行"
    reason: str


class Position(BaseModel):
    code: str = ""
    qty: int = 0
    avg_cost: float = 0.0
    pnl: float = 0.0
    pnl_pct: float = 0.0


class RiskSettings(BaseModel):
    limit_per_order: int = 100_000
    stop_loss_pct: float = 3.0
    max_qty_per_order: int = 100
    poll_interval_sec: int = 5

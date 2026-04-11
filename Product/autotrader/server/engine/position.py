import json
from pathlib import Path
from server.models import Position

STATE_FILE = Path("state.json")


class PositionManager:
    def __init__(self):
        self._position = Position()
        self._load()

    def _load(self):
        if STATE_FILE.exists():
            try:
                data = json.loads(STATE_FILE.read_text(encoding="utf-8"))
                self._position = Position(**data.get("position", {}))
            except Exception:
                self._position = Position()

    def _save(self):
        STATE_FILE.write_text(
            json.dumps({"position": self._position.model_dump()}, ensure_ascii=False),
            encoding="utf-8",
        )

    @property
    def position(self) -> Position:
        return self._position

    def apply_buy(self, code: str, qty: int, price: float):
        p = self._position
        total_cost = p.avg_cost * p.qty + price * qty
        p.qty += qty
        p.avg_cost = total_cost / p.qty if p.qty > 0 else 0.0
        p.code = code
        self._update_pnl(price)
        self._save()

    def apply_sell(self, qty: int, price: float):
        p = self._position
        p.qty = max(0, p.qty - qty)
        if p.qty == 0:
            p.avg_cost = 0.0
            p.code = ""
        self._update_pnl(price)
        self._save()

    def update_price(self, price: float):
        self._update_pnl(price)

    def _update_pnl(self, price: float):
        p = self._position
        if p.qty > 0 and p.avg_cost > 0:
            p.pnl = (price - p.avg_cost) * p.qty
            p.pnl_pct = (price - p.avg_cost) / p.avg_cost * 100
        else:
            p.pnl = 0.0
            p.pnl_pct = 0.0

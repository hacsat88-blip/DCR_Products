from collections import deque
from dataclasses import dataclass, field


@dataclass
class PriceHistory:
    """銘柄ごとの価格・出来高履歴を保持し、RSI と5日平均出来高を計算する"""
    prices: deque = field(default_factory=lambda: deque(maxlen=20))
    volumes: deque = field(default_factory=lambda: deque(maxlen=5))

    def update(self, price: float, volume: int) -> None:
        self.prices.append(price)
        self.volumes.append(volume)

    def avg_volume_5d(self) -> int:
        """5日分のデータが揃うまでは 0 を返す（フィルター側で通過扱いにする）"""
        if len(self.volumes) < 5:
            return 0
        return int(sum(self.volumes) / len(self.volumes))

    def rsi14(self) -> float:
        """RSI(14) を計算。データ不足時は中立値 50.0 を返す"""
        if len(self.prices) < 15:
            return 50.0

        gains, losses = [], []
        prices = list(self.prices)
        for i in range(1, len(prices)):
            diff = prices[i] - prices[i - 1]
            if diff >= 0:
                gains.append(diff)
                losses.append(0.0)
            else:
                gains.append(0.0)
                losses.append(abs(diff))

        avg_gain = sum(gains[-14:]) / 14
        avg_loss = sum(losses[-14:]) / 14

        if avg_loss == 0:
            return 100.0
        rs = avg_gain / avg_loss
        return round(100 - (100 / (1 + rs)), 2)


class HistoryStore:
    """全銘柄の PriceHistory を管理するストア"""

    def __init__(self) -> None:
        self._store: dict[str, PriceHistory] = {}

    def update(self, symbol: str, price: float, volume: int) -> PriceHistory:
        if symbol not in self._store:
            self._store[symbol] = PriceHistory()
        self._store[symbol].update(price, volume)
        return self._store[symbol]

    def get(self, symbol: str) -> PriceHistory | None:
        return self._store.get(symbol)

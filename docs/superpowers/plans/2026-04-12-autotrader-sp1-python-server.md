# AutoTrader SP-1: Python ブリッジサーバー 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** FastAPI サーバーを構築し、VBA からの株価受信 → Claude API による売買判断 → リスクガード適用 → WebSocket リアルタイム配信を1本のパイプラインとして動作させる。

**Architecture:** VBA が POST /api/price で株価を送信 → AITrader が Claude API に判断を依頼 → RiskGuard がルールチェック → レスポンスを VBA へ返し、同時に WebSocket で Next.js へブロードキャスト。ポジション状態は state.json に永続化し、サーバー再起動後も維持する。

**Tech Stack:** Python 3.11+, FastAPI 0.115, uvicorn, anthropic SDK, pydantic v2, pytest, pytest-asyncio, httpx

---

## ファイルマップ

| ファイル | 役割 |
|---------|------|
| `Product/autotrader-suite/backend/requirements.txt` | 依存パッケージ一覧 |
| `Product/autotrader-suite/backend/.env.example` | 環境変数テンプレート |
| `Product/autotrader-suite/backend/server/__init__.py` | パッケージ宣言 |
| `Product/autotrader-suite/backend/server/models.py` | Pydantic データモデル全定義 |
| `Product/autotrader-suite/backend/server/engine/__init__.py` | パッケージ宣言 |
| `Product/autotrader-suite/backend/server/engine/position.py` | ポジション管理・state.json 永続化 |
| `Product/autotrader-suite/backend/server/engine/risk_guard.py` | リスクルール適用（損切・上限・時間） |
| `Product/autotrader-suite/backend/server/engine/ai_trader.py` | Claude API 呼び出し・sell/buy/hold 判断 |
| `Product/autotrader-suite/backend/server/routes/__init__.py` | パッケージ宣言 |
| `Product/autotrader-suite/backend/server/routes/ws.py` | WebSocket エンドポイント・broadcast 関数 |
| `Product/autotrader-suite/backend/server/routes/price_feed.py` | POST /api/price ルート |
| `Product/autotrader-suite/backend/server/routes/settings.py` | GET/PUT /api/settings ルート |
| `Product/autotrader-suite/backend/server/main.py` | FastAPI アプリ組み立て・起動エントリ |
| `Product/autotrader-suite/backend/tests/test_models.py` | モデルのバリデーションテスト |
| `Product/autotrader-suite/backend/tests/test_position.py` | PositionManager の単体テスト |
| `Product/autotrader-suite/backend/tests/test_risk_guard.py` | RiskGuard の単体テスト |
| `Product/autotrader-suite/backend/tests/test_ai_trader.py` | AITrader の単体テスト（Claude API モック） |
| `Product/autotrader-suite/backend/tests/test_price_feed.py` | POST /api/price の統合テスト |
| `Product/autotrader-suite/backend/tests/test_settings.py` | GET/PUT /api/settings の統合テスト |

---

## Task 1: プロジェクトスキャフォールド

**Files:**
- Create: `Product/autotrader-suite/backend/requirements.txt`
- Create: `Product/autotrader-suite/backend/.env.example`
- Create: `Product/autotrader-suite/backend/.gitignore`
- Create: `Product/autotrader-suite/backend/server/__init__.py`
- Create: `Product/autotrader-suite/backend/server/engine/__init__.py`
- Create: `Product/autotrader-suite/backend/server/routes/__init__.py`
- Create: `Product/autotrader-suite/backend/tests/__init__.py`

- [ ] **Step 1: ディレクトリとファイルを作成する**

```bash
cd "C:\Users\hacsa\Desktop\サトシ開発\Product"
mkdir -p autotrader/server/engine autotrader/server/routes autotrader/tests
touch autotrader/server/__init__.py
touch autotrader/server/engine/__init__.py
touch autotrader/server/routes/__init__.py
touch autotrader/tests/__init__.py
```

- [ ] **Step 2: requirements.txt を作成する**

`Product/autotrader-suite/backend/requirements.txt`:
```
fastapi==0.115.0
uvicorn[standard]==0.30.6
anthropic>=0.40.0
python-dotenv==1.0.1
pydantic>=2.0
pytest==8.3.3
pytest-asyncio==0.24.0
httpx==0.27.2
```

- [ ] **Step 3: .env.example を作成する**

`Product/autotrader-suite/backend/.env.example`:
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

- [ ] **Step 4: .gitignore を作成する**

`Product/autotrader-suite/backend/.gitignore`:
```
.env
state.json
__pycache__/
*.pyc
.pytest_cache/
```

- [ ] **Step 5: 仮想環境を作成して依存パッケージをインストールする**

```bash
cd "C:\Users\hacsa\Desktop\サトシ開発\Product\autotrader"
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

期待される出力: `Successfully installed fastapi-0.115.0 ...`

- [ ] **Step 6: .env ファイルを作成して API キーを設定する**

```bash
copy .env.example .env
# .env を開き ANTHROPIC_API_KEY に実際のキーをセット
```

- [ ] **Step 7: コミットする**

```bash
cd "C:\Users\hacsa\Desktop\サトシ開発"
git add Product/autotrader-suite/backend/
git commit -m "feat(autotrader): scaffold SP-1 Python server project"
```

---

## Task 2: Pydantic データモデル

**Files:**
- Create: `Product/autotrader-suite/backend/server/models.py`
- Create: `Product/autotrader-suite/backend/tests/test_models.py`

- [ ] **Step 1: テストを書く**

`Product/autotrader-suite/backend/tests/test_models.py`:
```python
import pytest
from datetime import datetime
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


def test_trade_decision_valid():
    d = TradeDecision(action="buy", qty=100, reason="テスト")
    assert d.order_type == "成行"


def test_trade_decision_invalid_action():
    with pytest.raises(Exception):
        TradeDecision(action="unknown", qty=100, reason="テスト")


def test_risk_settings_defaults():
    s = RiskSettings()
    assert s.limit_per_order == 100_000
    assert s.stop_loss_pct == 3.0
    assert s.max_qty_per_order == 100
    assert s.poll_interval_sec == 5


def test_position_defaults():
    p = Position()
    assert p.qty == 0
    assert p.avg_cost == 0.0
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
cd "C:\Users\hacsa\Desktop\サトシ開発\Product\autotrader"
.venv\Scripts\activate
pytest tests/test_models.py -v
```

期待: `ModuleNotFoundError: No module named 'server.models'`

- [ ] **Step 3: models.py を実装する**

`Product/autotrader-suite/backend/server/models.py`:
```python
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
```

- [ ] **Step 4: テストを実行して全て PASS することを確認する**

```bash
pytest tests/test_models.py -v
```

期待:
```
test_models.py::test_ohlc_bar_valid PASSED
test_models.py::test_ohlc_bar_volume_default PASSED
test_models.py::test_price_request_valid PASSED
test_models.py::test_trade_decision_valid PASSED
test_models.py::test_trade_decision_invalid_action PASSED
test_models.py::test_risk_settings_defaults PASSED
test_models.py::test_position_defaults PASSED
7 passed
```

- [ ] **Step 5: コミットする**

```bash
cd "C:\Users\hacsa\Desktop\サトシ開発"
git add Product/autotrader-suite/backend/server/models.py Product/autotrader-suite/backend/tests/test_models.py
git commit -m "feat(autotrader): add Pydantic data models"
```

---

## Task 3: PositionManager

**Files:**
- Create: `Product/autotrader-suite/backend/server/engine/position.py`
- Create: `Product/autotrader-suite/backend/tests/test_position.py`

- [ ] **Step 1: テストを書く**

`Product/autotrader-suite/backend/tests/test_position.py`:
```python
import json
import pytest
from pathlib import Path
from server.engine.position import PositionManager


@pytest.fixture(autouse=True)
def clean_state(tmp_path, monkeypatch):
    """各テストで state.json を tmp_path に向ける"""
    state_file = tmp_path / "state.json"
    monkeypatch.setattr(
        "server.engine.position.STATE_FILE", state_file
    )
    yield state_file


def test_initial_position_is_zero():
    mgr = PositionManager()
    assert mgr.position.qty == 0
    assert mgr.position.avg_cost == 0.0


def test_apply_buy_sets_position():
    mgr = PositionManager()
    mgr.apply_buy("7203", qty=100, price=2500.0)
    assert mgr.position.qty == 100
    assert mgr.position.avg_cost == 2500.0
    assert mgr.position.code == "7203"


def test_apply_buy_calculates_average_cost():
    mgr = PositionManager()
    mgr.apply_buy("7203", qty=100, price=2000.0)
    mgr.apply_buy("7203", qty=100, price=3000.0)
    assert mgr.position.qty == 200
    assert mgr.position.avg_cost == 2500.0


def test_apply_sell_reduces_position():
    mgr = PositionManager()
    mgr.apply_buy("7203", qty=100, price=2500.0)
    mgr.apply_sell(qty=50, price=2600.0)
    assert mgr.position.qty == 50


def test_apply_sell_all_clears_position():
    mgr = PositionManager()
    mgr.apply_buy("7203", qty=100, price=2500.0)
    mgr.apply_sell(qty=100, price=2600.0)
    assert mgr.position.qty == 0
    assert mgr.position.avg_cost == 0.0
    assert mgr.position.code == ""


def test_pnl_calculated_on_buy(clean_state):
    mgr = PositionManager()
    mgr.apply_buy("7203", qty=100, price=2500.0)
    mgr.update_price(2600.0)
    assert mgr.position.pnl == pytest.approx(10000.0)
    assert mgr.position.pnl_pct == pytest.approx(4.0)


def test_state_persisted_to_json(clean_state):
    mgr = PositionManager()
    mgr.apply_buy("7203", qty=100, price=2500.0)
    data = json.loads(clean_state.read_text())
    assert data["position"]["qty"] == 100


def test_state_loaded_on_restart(clean_state):
    mgr1 = PositionManager()
    mgr1.apply_buy("7203", qty=100, price=2500.0)
    mgr2 = PositionManager()
    assert mgr2.position.qty == 100
    assert mgr2.position.avg_cost == 2500.0
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
pytest tests/test_position.py -v
```

期待: `ModuleNotFoundError: No module named 'server.engine.position'`

- [ ] **Step 3: position.py を実装する**

`Product/autotrader-suite/backend/server/engine/position.py`:
```python
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
```

- [ ] **Step 4: テストを実行して全て PASS することを確認する**

```bash
pytest tests/test_position.py -v
```

期待: `8 passed`

- [ ] **Step 5: コミットする**

```bash
cd "C:\Users\hacsa\Desktop\サトシ開発"
git add Product/autotrader-suite/backend/server/engine/position.py Product/autotrader-suite/backend/tests/test_position.py
git commit -m "feat(autotrader): add PositionManager with state.json persistence"
```

---

## Task 4: RiskGuard

**Files:**
- Create: `Product/autotrader-suite/backend/server/engine/risk_guard.py`
- Create: `Product/autotrader-suite/backend/tests/test_risk_guard.py`

- [ ] **Step 1: テストを書く**

`Product/autotrader-suite/backend/tests/test_risk_guard.py`:
```python
import pytest
from datetime import datetime, timedelta
from server.models import TradeDecision, Position, RiskSettings
from server.engine.risk_guard import RiskGuard, WARMUP_SECONDS

SETTINGS = RiskSettings(
    limit_per_order=100_000,
    stop_loss_pct=3.0,
    max_qty_per_order=100,
)
BUY = TradeDecision(action="buy", qty=100, reason="テスト")
SELL = TradeDecision(action="sell", qty=100, reason="テスト")
HOLD = TradeDecision(action="hold", qty=0, reason="テスト")
MARKET_TIME = datetime(2026, 4, 12, 10, 0, 0)  # 平日 10:00
AFTER_HOURS = datetime(2026, 4, 12, 8, 0, 0)   # 市場前


@pytest.fixture
def guard():
    start = datetime.now() - timedelta(seconds=WARMUP_SECONDS + 1)
    return RiskGuard(settings=SETTINGS, start_time=start)


@pytest.fixture
def empty_position():
    return Position()


@pytest.fixture
def long_position():
    return Position(code="7203", qty=100, avg_cost=2500.0, pnl=0.0, pnl_pct=0.0)


def test_hold_during_warmup(empty_position):
    guard = RiskGuard(settings=SETTINGS, start_time=datetime.now())
    result = guard.apply(BUY, empty_position, 2500.0, datetime.now())
    assert result.action == "hold"
    assert "ウォームアップ" in result.reason


def test_hold_after_hours(guard, empty_position):
    result = guard.apply(BUY, empty_position, 2500.0, AFTER_HOURS)
    assert result.action == "hold"
    assert "市場時間外" in result.reason


def test_buy_allowed_in_market_hours(guard, empty_position):
    result = guard.apply(BUY, empty_position, 2500.0, MARKET_TIME)
    assert result.action == "buy"


def test_stop_loss_forces_sell(guard, long_position):
    long_position.pnl_pct = -3.5  # 損切りラインを超過
    result = guard.apply(HOLD, long_position, 2412.0, MARKET_TIME)
    assert result.action == "sell"
    assert "損切り" in result.reason


def test_stop_loss_not_triggered_within_limit(guard, long_position):
    long_position.pnl_pct = -2.9  # 損切りライン以内
    result = guard.apply(HOLD, long_position, 2427.0, MARKET_TIME)
    assert result.action == "hold"


def test_qty_capped_to_max(guard, empty_position):
    decision = TradeDecision(action="buy", qty=200, reason="多め")
    result = guard.apply(decision, empty_position, 500.0, MARKET_TIME)
    assert result.qty <= SETTINGS.max_qty_per_order


def test_buy_blocked_when_price_exceeds_limit(guard, empty_position):
    # 2000円 × 100株 = 200,000円 > limit 100,000円
    result = guard.apply(BUY, empty_position, 2000.0, MARKET_TIME)
    assert result.action == "hold"
    assert "上限" in result.reason


def test_buy_qty_adjusted_to_fit_limit(guard, empty_position):
    # 500円 × 100株 = 50,000円 < limit
    # 500円 × 200株 = 100,000円 = limit → qty は 200 まで許容
    decision = TradeDecision(action="buy", qty=300, reason="多め")
    result = guard.apply(decision, empty_position, 500.0, MARKET_TIME)
    assert result.action == "buy"
    assert result.qty * 500.0 <= SETTINGS.limit_per_order


def test_update_settings(guard):
    new_settings = RiskSettings(limit_per_order=200_000, stop_loss_pct=5.0, max_qty_per_order=200)
    guard.update_settings(new_settings)
    assert guard.settings.limit_per_order == 200_000
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
pytest tests/test_risk_guard.py -v
```

期待: `ModuleNotFoundError: No module named 'server.engine.risk_guard'`

- [ ] **Step 3: risk_guard.py を実装する**

`Product/autotrader-suite/backend/server/engine/risk_guard.py`:
```python
from datetime import datetime, time, timedelta
from server.models import TradeDecision, Position, RiskSettings

WARMUP_SECONDS = 30
_MARKET_AM = (time(9, 0), time(11, 30))
_MARKET_PM = (time(12, 30), time(15, 30))


class RiskGuard:
    def __init__(self, settings: RiskSettings, start_time: datetime):
        self._settings = settings
        self._start_time = start_time

    @property
    def settings(self) -> RiskSettings:
        return self._settings

    def update_settings(self, settings: RiskSettings):
        self._settings = settings

    def apply(
        self,
        decision: TradeDecision,
        position: Position,
        price: float,
        now: datetime,
    ) -> TradeDecision:
        s = self._settings

        # 1. ウォームアップ期間
        if (now - self._start_time).total_seconds() < WARMUP_SECONDS:
            return TradeDecision(action="hold", qty=0, reason="ウォームアップ中")

        # 2. 市場時間外
        t = now.time()
        in_am = _MARKET_AM[0] <= t <= _MARKET_AM[1]
        in_pm = _MARKET_PM[0] <= t <= _MARKET_PM[1]
        if not (in_am or in_pm):
            return TradeDecision(action="hold", qty=0, reason="市場時間外")

        # 3. 損切りライン（強制売り）
        if position.qty > 0 and position.pnl_pct < -s.stop_loss_pct:
            return TradeDecision(
                action="sell",
                qty=position.qty,
                reason=f"損切りライン到達 ({position.pnl_pct:.1f}%)",
            )

        if decision.action == "hold":
            return decision

        # 4. 数量上限
        qty = min(decision.qty, s.max_qty_per_order)

        # 5. 金額上限
        if decision.action == "buy":
            max_qty_by_limit = int(s.limit_per_order / price) if price > 0 else 0
            qty = min(qty, max_qty_by_limit)
            if qty <= 0:
                return TradeDecision(action="hold", qty=0, reason="発注上限金額超過")

        return TradeDecision(
            action=decision.action,
            qty=qty,
            order_type=decision.order_type,
            reason=decision.reason,
        )
```

- [ ] **Step 4: テストを実行して全て PASS することを確認する**

```bash
pytest tests/test_risk_guard.py -v
```

期待: `10 passed`

- [ ] **Step 5: コミットする**

```bash
cd "C:\Users\hacsa\Desktop\サトシ開発"
git add Product/autotrader-suite/backend/server/engine/risk_guard.py Product/autotrader-suite/backend/tests/test_risk_guard.py
git commit -m "feat(autotrader): add RiskGuard with stop-loss, limit, and warmup rules"
```

---

## Task 5: AITrader（Claude API モック使用）

**Files:**
- Create: `Product/autotrader-suite/backend/server/engine/ai_trader.py`
- Create: `Product/autotrader-suite/backend/tests/test_ai_trader.py`

- [ ] **Step 1: テストを書く（Claude API をモックする）**

`Product/autotrader-suite/backend/tests/test_ai_trader.py`:
```python
import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime
from server.models import PriceRequest, Position, RiskSettings, OHLCBar
from server.engine.ai_trader import AITrader

PRICE_REQ = PriceRequest(
    code="7203",
    price=2500.0,
    volume=10000,
    ohlc=[OHLCBar(o=2490, h=2510, l=2485, c=2500)],
    timestamp=datetime.now(),
)
POSITION = Position()
SETTINGS = RiskSettings()


def _mock_response(text: str):
    msg = MagicMock()
    msg.content = [MagicMock(text=text)]
    return msg


@patch("server.engine.ai_trader.anthropic.Anthropic")
def test_decide_returns_buy(mock_anthropic_cls):
    mock_client = MagicMock()
    mock_anthropic_cls.return_value = mock_client
    mock_client.messages.create.return_value = _mock_response(
        '{"action": "buy", "qty": 100, "reason": "RSI過売り圏"}'
    )
    trader = AITrader()
    result = trader.decide(PRICE_REQ, POSITION, SETTINGS)
    assert result.action == "buy"
    assert result.qty == 100
    assert result.reason == "RSI過売り圏"


@patch("server.engine.ai_trader.anthropic.Anthropic")
def test_decide_returns_hold(mock_anthropic_cls):
    mock_client = MagicMock()
    mock_anthropic_cls.return_value = mock_client
    mock_client.messages.create.return_value = _mock_response(
        '{"action": "hold", "qty": 0, "reason": "様子見"}'
    )
    trader = AITrader()
    result = trader.decide(PRICE_REQ, POSITION, SETTINGS)
    assert result.action == "hold"


@patch("server.engine.ai_trader.anthropic.Anthropic")
def test_decide_safe_returns_hold_on_api_error(mock_anthropic_cls):
    mock_client = MagicMock()
    mock_anthropic_cls.return_value = mock_client
    mock_client.messages.create.side_effect = Exception("API timeout")
    trader = AITrader()
    result = trader.decide_safe(PRICE_REQ, POSITION, SETTINGS)
    assert result.action == "hold"
    assert "AI判断エラー" in result.reason


@patch("server.engine.ai_trader.anthropic.Anthropic")
def test_decide_safe_returns_hold_on_invalid_json(mock_anthropic_cls):
    mock_client = MagicMock()
    mock_anthropic_cls.return_value = mock_client
    mock_client.messages.create.return_value = _mock_response("invalid json")
    trader = AITrader()
    result = trader.decide_safe(PRICE_REQ, POSITION, SETTINGS)
    assert result.action == "hold"
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
pytest tests/test_ai_trader.py -v
```

期待: `ModuleNotFoundError: No module named 'server.engine.ai_trader'`

- [ ] **Step 3: ai_trader.py を実装する**

`Product/autotrader-suite/backend/server/engine/ai_trader.py`:
```python
import json
import os
import anthropic
from server.models import PriceRequest, TradeDecision, Position, RiskSettings

_SYSTEM_PROMPT = """あなたは日本株の短期トレーダーです。
与えられた株価データと現在のポジション情報をもとに、
次の売買アクションを JSON のみで回答してください。

ルール:
- action は "buy" / "sell" / "hold" のいずれか
- 確信が持てない場合は必ず "hold"
- 既にポジションがある場合（qty > 0）は追加買いしない
- ノイズに惑わされず、明確なシグナルのみで動く

回答形式（JSONのみ、前後に文字を入れない）:
{"action": "buy"|"sell"|"hold", "qty": N, "reason": "日本語で50字以内"}"""


class AITrader:
    def __init__(self):
        self._client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    def decide(
        self,
        req: PriceRequest,
        position: Position,
        settings: RiskSettings,
    ) -> TradeDecision:
        user_prompt = (
            f"銘柄: {req.code}\n"
            f"現在値: {req.price}円\n"
            f"直近{len(req.ohlc)}本のOHLCV: {[b.model_dump() for b in req.ohlc]}\n"
            f"現在のポジション: {position.qty}株 / 平均取得単価 {position.avg_cost}円 / "
            f"含み損益 {position.pnl:.0f}円 ({position.pnl_pct:.1f}%)\n"
            f"リスク設定: 1発注上限 {settings.limit_per_order}円 / "
            f"損切りライン {settings.stop_loss_pct}% / 最大数量 {settings.max_qty_per_order}株"
        )
        response = self._client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=200,
            system=_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )
        text = response.content[0].text.strip()
        data = json.loads(text)
        return TradeDecision(
            action=data["action"],
            qty=data.get("qty", 0),
            reason=data.get("reason", ""),
        )

    def decide_safe(
        self,
        req: PriceRequest,
        position: Position,
        settings: RiskSettings,
    ) -> TradeDecision:
        """Claude API エラー時は hold を返す"""
        try:
            return self.decide(req, position, settings)
        except Exception as e:
            return TradeDecision(
                action="hold",
                qty=0,
                reason=f"AI判断エラー: {str(e)[:40]}",
            )
```

- [ ] **Step 4: テストを実行して全て PASS することを確認する**

```bash
pytest tests/test_ai_trader.py -v
```

期待: `4 passed`

- [ ] **Step 5: コミットする**

```bash
cd "C:\Users\hacsa\Desktop\サトシ開発"
git add Product/autotrader-suite/backend/server/engine/ai_trader.py Product/autotrader-suite/backend/tests/test_ai_trader.py
git commit -m "feat(autotrader): add AITrader with Claude API integration and safe fallback"
```

---

## Task 6: Settings ルート

**Files:**
- Create: `Product/autotrader-suite/backend/server/routes/settings.py`
- Create: `Product/autotrader-suite/backend/tests/test_settings.py`

- [ ] **Step 1: テストを書く**

`Product/autotrader-suite/backend/tests/test_settings.py`:
```python
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from server.models import RiskSettings
from server.engine.risk_guard import RiskGuard
from server.routes.settings import make_settings_router
from fastapi import FastAPI

@pytest.fixture
def client():
    guard = RiskGuard(
        settings=RiskSettings(),
        start_time=datetime.now() - timedelta(seconds=60),
    )
    app = FastAPI()
    app.include_router(make_settings_router(guard))
    return TestClient(app), guard


def test_get_settings_returns_defaults(client):
    tc, _ = client
    res = tc.get("/api/settings")
    assert res.status_code == 200
    data = res.json()
    assert data["limit_per_order"] == 100_000
    assert data["stop_loss_pct"] == 3.0


def test_put_settings_updates_values(client):
    tc, guard = client
    res = tc.put("/api/settings", json={
        "limit_per_order": 200_000,
        "stop_loss_pct": 5.0,
        "max_qty_per_order": 200,
        "poll_interval_sec": 5,
    })
    assert res.status_code == 200
    assert guard.settings.limit_per_order == 200_000
    assert guard.settings.stop_loss_pct == 5.0
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
pytest tests/test_settings.py -v
```

期待: `ModuleNotFoundError: No module named 'server.routes.settings'`

- [ ] **Step 3: settings.py を実装する**

`Product/autotrader-suite/backend/server/routes/settings.py`:
```python
from fastapi import APIRouter
from server.models import RiskSettings
from server.engine.risk_guard import RiskGuard


def make_settings_router(guard: RiskGuard) -> APIRouter:
    r = APIRouter()

    @r.get("/api/settings", response_model=RiskSettings)
    async def get_settings():
        return guard.settings

    @r.put("/api/settings", response_model=RiskSettings)
    async def update_settings(settings: RiskSettings):
        guard.update_settings(settings)
        return guard.settings

    return r
```

- [ ] **Step 4: テストを実行して全て PASS することを確認する**

```bash
pytest tests/test_settings.py -v
```

期待: `2 passed`

- [ ] **Step 5: コミットする**

```bash
cd "C:\Users\hacsa\Desktop\サトシ開発"
git add Product/autotrader-suite/backend/server/routes/settings.py Product/autotrader-suite/backend/tests/test_settings.py
git commit -m "feat(autotrader): add GET/PUT /api/settings route"
```

---

## Task 7: WebSocket ルートと broadcast

**Files:**
- Create: `Product/autotrader-suite/backend/server/routes/ws.py`

WebSocket は非同期イベント駆動のため単体テストより統合確認で検証する（Task 9 の smoke test で実施）。

- [ ] **Step 1: ws.py を実装する**

`Product/autotrader-suite/backend/server/routes/ws.py`:
```python
import json
from datetime import datetime
from typing import Callable
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from server.engine.position import PositionManager
from server.engine.risk_guard import RiskGuard


def make_ws_router(
    pos_mgr: PositionManager,
    guard: RiskGuard,
) -> tuple[APIRouter, Callable]:
    r = APIRouter()
    _clients: list[WebSocket] = []
    _last_price: dict = {"code": "-", "current": 0.0, "volume": 0}
    _last_action: dict = {"action": "none", "qty": 0, "reason": "起動中", "at": ""}

    async def broadcast(price: dict, action: dict) -> None:
        _last_price.update(price)
        _last_action.update(action)
        pos = pos_mgr.position
        payload = {
            "type": "state_update",
            "ts": datetime.now().isoformat(),
            "price": _last_price.copy(),
            "position": {
                "qty": pos.qty,
                "avg_cost": pos.avg_cost,
                "pnl": pos.pnl,
                "pnl_pct": pos.pnl_pct,
            },
            "last_action": _last_action.copy(),
            "risk": guard.settings.model_dump(),
        }
        dead: list[WebSocket] = []
        for ws in _clients:
            try:
                await ws.send_text(json.dumps(payload, ensure_ascii=False))
            except Exception:
                dead.append(ws)
        for ws in dead:
            _clients.remove(ws)

    @r.websocket("/ws")
    async def ws_endpoint(websocket: WebSocket):
        await websocket.accept()
        _clients.append(websocket)
        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            if websocket in _clients:
                _clients.remove(websocket)

    return r, broadcast
```

- [ ] **Step 2: コミットする**

```bash
cd "C:\Users\hacsa\Desktop\サトシ開発"
git add Product/autotrader-suite/backend/server/routes/ws.py
git commit -m "feat(autotrader): add WebSocket route with broadcast function"
```

---

## Task 8: Price Feed ルート（全モジュールの統合点）

**Files:**
- Create: `Product/autotrader-suite/backend/server/routes/price_feed.py`
- Create: `Product/autotrader-suite/backend/tests/test_price_feed.py`

- [ ] **Step 1: テストを書く**

`Product/autotrader-suite/backend/tests/test_price_feed.py`:
```python
import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from fastapi import FastAPI
from server.models import RiskSettings, TradeDecision
from server.engine.position import PositionManager
from server.engine.risk_guard import RiskGuard
from server.routes.price_feed import make_price_router

PRICE_PAYLOAD = {
    "code": "7203",
    "price": 2500.0,
    "volume": 10000,
    "ohlc": [{"o": 2490, "h": 2510, "l": 2485, "c": 2500, "v": 1000}],
    "timestamp": "2026-04-12T10:00:00",
}


@pytest.fixture
def setup(tmp_path, monkeypatch):
    monkeypatch.setattr("server.engine.position.STATE_FILE", tmp_path / "state.json")
    pos_mgr = PositionManager()
    guard = RiskGuard(
        settings=RiskSettings(),
        start_time=datetime.now() - timedelta(seconds=60),
    )
    broadcast = AsyncMock()
    return pos_mgr, guard, broadcast


@patch("server.routes.price_feed.AITrader")
def test_price_feed_returns_hold_by_default(mock_ai_cls, setup):
    pos_mgr, guard, broadcast = setup
    mock_ai = MagicMock()
    mock_ai_cls.return_value = mock_ai
    mock_ai.decide_safe.return_value = TradeDecision(action="hold", qty=0, reason="様子見")

    app = FastAPI()
    app.include_router(make_price_router(mock_ai, guard, pos_mgr, broadcast))
    tc = TestClient(app)

    res = tc.post("/api/price", json=PRICE_PAYLOAD)
    assert res.status_code == 200
    assert res.json()["action"] == "hold"


@patch("server.routes.price_feed.AITrader")
def test_price_feed_buy_updates_position(mock_ai_cls, setup):
    pos_mgr, guard, broadcast = setup
    mock_ai = MagicMock()
    mock_ai_cls.return_value = mock_ai
    mock_ai.decide_safe.return_value = TradeDecision(action="buy", qty=10, reason="強い")

    app = FastAPI()
    app.include_router(make_price_router(mock_ai, guard, pos_mgr, broadcast))
    tc = TestClient(app)

    # 10株 × 2500円 = 25,000 < limit 100,000 → allow
    res = tc.post("/api/price", json=PRICE_PAYLOAD)
    assert res.status_code == 200
    assert res.json()["action"] == "buy"
    assert pos_mgr.position.qty == 10


@patch("server.routes.price_feed.AITrader")
def test_price_feed_risk_guard_blocks_excessive_buy(mock_ai_cls, setup):
    pos_mgr, guard, broadcast = setup
    mock_ai = MagicMock()
    mock_ai_cls.return_value = mock_ai
    # 2500円 × 100株 = 250,000 > limit 100,000 → hold へ上書き
    mock_ai.decide_safe.return_value = TradeDecision(action="buy", qty=100, reason="過剰")

    app = FastAPI()
    app.include_router(make_price_router(mock_ai, guard, pos_mgr, broadcast))
    tc = TestClient(app)

    res = tc.post("/api/price", json=PRICE_PAYLOAD)
    assert res.status_code == 200
    data = res.json()
    # qty が上限金額内に縮小されるか hold になる
    assert data["action"] in ("buy", "hold")
    if data["action"] == "buy":
        assert data["qty"] * PRICE_PAYLOAD["price"] <= guard.settings.limit_per_order
```

- [ ] **Step 2: テストが失敗することを確認する**

```bash
pytest tests/test_price_feed.py -v
```

期待: `ModuleNotFoundError: No module named 'server.routes.price_feed'`

- [ ] **Step 3: price_feed.py を実装する**

`Product/autotrader-suite/backend/server/routes/price_feed.py`:
```python
from datetime import datetime
from typing import Callable, Awaitable
from fastapi import APIRouter
from server.models import PriceRequest, TradeDecision
from server.engine.ai_trader import AITrader
from server.engine.risk_guard import RiskGuard
from server.engine.position import PositionManager


def make_price_router(
    ai: AITrader,
    guard: RiskGuard,
    pos_mgr: PositionManager,
    broadcast: Callable[..., Awaitable[None]],
) -> APIRouter:
    r = APIRouter()

    @r.post("/api/price", response_model=TradeDecision)
    async def receive_price(req: PriceRequest):
        pos_mgr.update_price(req.price)
        position = pos_mgr.position

        raw = ai.decide_safe(req, position, guard.settings)
        decision = guard.apply(raw, position, req.price, datetime.now())

        if decision.action == "buy":
            pos_mgr.apply_buy(req.code, decision.qty, req.price)
        elif decision.action == "sell":
            pos_mgr.apply_sell(decision.qty, req.price)

        await broadcast(
            price={"code": req.code, "current": req.price, "volume": req.volume},
            action={
                "action": decision.action,
                "qty": decision.qty,
                "reason": decision.reason,
                "at": datetime.now().strftime("%H:%M:%S"),
            },
        )
        return decision

    return r
```

- [ ] **Step 4: テストを実行して全て PASS することを確認する**

```bash
pytest tests/test_price_feed.py -v
```

期待: `3 passed`

- [ ] **Step 5: コミットする**

```bash
cd "C:\Users\hacsa\Desktop\サトシ開発"
git add Product/autotrader-suite/backend/server/routes/price_feed.py Product/autotrader-suite/backend/tests/test_price_feed.py
git commit -m "feat(autotrader): add POST /api/price route integrating AI, risk guard, and position"
```

---

## Task 9: main.py の組み立てとスモークテスト

**Files:**
- Create: `Product/autotrader-suite/backend/server/main.py`
- Create: `Product/autotrader-suite/backend/pytest.ini`

- [ ] **Step 1: pytest.ini を作成する（asyncio モード設定）**

`Product/autotrader-suite/backend/pytest.ini`:
```ini
[pytest]
asyncio_mode = auto
```

- [ ] **Step 2: main.py を実装する**

`Product/autotrader-suite/backend/server/main.py`:
```python
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from server.models import RiskSettings
from server.engine.ai_trader import AITrader
from server.engine.risk_guard import RiskGuard
from server.engine.position import PositionManager
from server.routes.price_feed import make_price_router
from server.routes.settings import make_settings_router
from server.routes.ws import make_ws_router

_pos_mgr = PositionManager()
_guard = RiskGuard(settings=RiskSettings(), start_time=datetime.now())
_ai = AITrader()
_ws_router, _broadcast = make_ws_router(_pos_mgr, _guard)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="AutoTrader Bridge", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(make_price_router(_ai, _guard, _pos_mgr, _broadcast))
app.include_router(make_settings_router(_guard))
app.include_router(_ws_router)
```

- [ ] **Step 3: サーバーを起動してスモークテストを実行する**

ターミナル1（サーバー起動）:
```bash
cd "C:\Users\hacsa\Desktop\サトシ開発\Product\autotrader"
.venv\Scripts\activate
uvicorn server.main:app --reload --port 8000
```

期待: `INFO: Uvicorn running on http://127.0.0.1:8000`

ターミナル2（動作確認）:
```bash
# 設定取得
curl http://localhost:8000/api/settings

# 期待:
# {"limit_per_order":100000,"stop_loss_pct":3.0,"max_qty_per_order":100,"poll_interval_sec":5}

# 設定更新
curl -X PUT http://localhost:8000/api/settings \
  -H "Content-Type: application/json" \
  -d '{"limit_per_order":200000,"stop_loss_pct":5.0,"max_qty_per_order":100,"poll_interval_sec":5}'

# 期待: {"limit_per_order":200000,...}
```

- [ ] **Step 4: 全テストを一括実行して全て PASS することを確認する**

```bash
cd "C:\Users\hacsa\Desktop\サトシ開発\Product\autotrader"
pytest tests/ -v
```

期待:
```
test_models.py       7 passed
test_position.py     8 passed
test_risk_guard.py   10 passed
test_ai_trader.py    4 passed
test_settings.py     2 passed
test_price_feed.py   3 passed
34 passed
```

- [ ] **Step 5: 最終コミットをする**

```bash
cd "C:\Users\hacsa\Desktop\サトシ開発"
git add Product/autotrader-suite/backend/server/main.py Product/autotrader-suite/backend/pytest.ini
git commit -m "feat(autotrader): wire up FastAPI app and verify all 34 tests pass"
```

---

## 完了条件

- [ ] `pytest tests/ -v` が 34 passed で通る
- [ ] `uvicorn server.main:app` でサーバーが起動する
- [ ] `GET /api/settings` が正しいデフォルト値を返す
- [ ] `PUT /api/settings` で設定を更新できる
- [ ] `POST /api/price` に mock データを送ると TradeDecision が返る
- [ ] `/ws` に WebSocket 接続できる（ブラウザの DevTools で確認）

## 次のプラン

SP-1 完成後、以下を別プランとして作成する:
- **SP-3 プラン**: `2026-04-12-autotrader-sp3-nextjs-dashboard.md`
- **SP-2 プラン**: `2026-04-12-autotrader-sp2-excel-vba.md`


import os
import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime
from server.models import PriceRequest, Position, RiskSettings, OHLCBar
from server.engine.ai_trader import AITrader

# テスト中に ANTHROPIC_API_KEY が未設定でも動作するようダミー値をセット
os.environ.setdefault("ANTHROPIC_API_KEY", "test-dummy-key")

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

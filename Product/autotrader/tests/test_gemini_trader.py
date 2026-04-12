import os
import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime
from server.models import PriceRequest, Position, RiskSettings, OHLCBar

os.environ.setdefault("GOOGLE_API_KEY", "test-dummy-key")

from server.engine.gemini_trader import GeminiTrader

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
    resp = MagicMock()
    resp.text = text
    return resp


@patch("server.engine.gemini_trader.genai.Client")
def test_decide_returns_buy(mock_client_cls):
    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client
    mock_client.models.generate_content.return_value = _mock_response(
        '{"action": "buy", "qty": 100, "reason": "RSI過売り圏"}'
    )
    trader = GeminiTrader()
    result = trader.decide(PRICE_REQ, POSITION, SETTINGS)
    assert result.action == "buy"
    assert result.qty == 100
    assert result.reason == "RSI過売り圏"


@patch("server.engine.gemini_trader.genai.Client")
def test_decide_returns_hold(mock_client_cls):
    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client
    mock_client.models.generate_content.return_value = _mock_response(
        '{"action": "hold", "qty": 0, "reason": "様子見"}'
    )
    trader = GeminiTrader()
    result = trader.decide(PRICE_REQ, POSITION, SETTINGS)
    assert result.action == "hold"


@patch("server.engine.gemini_trader.genai.Client")
def test_decide_safe_returns_hold_on_api_error(mock_client_cls):
    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client
    mock_client.models.generate_content.side_effect = Exception("API timeout")
    trader = GeminiTrader()
    result = trader.decide_safe(PRICE_REQ, POSITION, SETTINGS)
    assert result.action == "hold"
    assert "AI判断エラー" in result.reason


@patch("server.engine.gemini_trader.genai.Client")
def test_decide_safe_returns_hold_on_invalid_json(mock_client_cls):
    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client
    mock_client.models.generate_content.return_value = _mock_response("invalid json")
    trader = GeminiTrader()
    result = trader.decide_safe(PRICE_REQ, POSITION, SETTINGS)
    assert result.action == "hold"
    assert "AI判断エラー" in result.reason


@patch("server.engine.gemini_trader.genai.Client")
def test_decide_with_json_wrapped_in_text(mock_client_cls):
    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client
    mock_client.models.generate_content.return_value = _mock_response(
        'Sure! {"action": "sell", "qty": 50, "reason": "利確"}'
    )
    trader = GeminiTrader()
    result = trader.decide(PRICE_REQ, POSITION, SETTINGS)
    assert result.action == "sell"
    assert result.qty == 50


@patch("server.engine.gemini_trader.genai.Client")
def test_decide_normalizes_uppercase_action(mock_client_cls):
    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client
    mock_client.models.generate_content.return_value = _mock_response(
        '{"action": "BUY", "qty": 100, "reason": "テスト"}'
    )
    trader = GeminiTrader()
    result = trader.decide(PRICE_REQ, POSITION, SETTINGS)
    assert result.action == "buy"

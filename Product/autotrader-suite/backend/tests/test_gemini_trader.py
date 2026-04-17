import os
import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime
from google.genai import errors as genai_errors
from google.genai import types
from server.models import PriceRequest, Position, RiskSettings, OHLCBar

os.environ.setdefault("GOOGLE_API_KEY", "test-dummy-key")

from server.engine.gemini_trader import (
    DEFAULT_GEMINI_MODEL,
    GEMINI_FALLBACK_MODEL,
    GEMINI_HTTP_RETRY_ATTEMPTS,
    GEMINI_HTTP_TIMEOUT_MS,
    GEMINI_MODEL_ENV_VAR,
    GeminiTrader,
)

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
    config = mock_client.models.generate_content.call_args.kwargs["config"]
    assert mock_client.models.generate_content.call_args.kwargs["model"] == DEFAULT_GEMINI_MODEL
    assert DEFAULT_GEMINI_MODEL == "gemini-3.1-flash-lite-preview"
    assert config.http_options.timeout == GEMINI_HTTP_TIMEOUT_MS
    assert config.http_options.timeout >= 10_000
    assert config.http_options.retry_options.attempts == GEMINI_HTTP_RETRY_ATTEMPTS
    assert config.response_mime_type == "application/json"
    assert config.max_output_tokens == 128
    assert config.thinking_config.thinking_level == types.ThinkingLevel.LOW
    assert config.thinking_config.thinking_budget is None


@patch("server.engine.gemini_trader.genai.Client")
def test_decide_prefers_env_model_override(mock_client_cls, monkeypatch):
    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client
    mock_client.models.generate_content.return_value = _mock_response(
        '{"action": "hold", "qty": 0, "reason": "様子見"}'
    )
    monkeypatch.setenv(GEMINI_MODEL_ENV_VAR, "gemini-2.5-flash-lite")

    trader = GeminiTrader()
    result = trader.decide(PRICE_REQ, POSITION, SETTINGS)
    config = mock_client.models.generate_content.call_args.kwargs["config"]

    assert result.action == "hold"
    assert mock_client.models.generate_content.call_args.kwargs["model"] == "gemini-2.5-flash-lite"
    assert config.response_mime_type == "application/json"
    assert config.max_output_tokens == 128
    assert config.thinking_config.thinking_budget == 0
    assert config.thinking_config.thinking_level is None


@patch("server.engine.gemini_trader.genai.Client")
def test_decide_falls_back_to_stable_model_on_server_deadline(mock_client_cls):
    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client
    mock_client.models.generate_content.side_effect = [
        genai_errors.ServerError(
            504,
            {
                "error": {
                    "code": 504,
                    "message": "Deadline expired before operation could complete.",
                    "status": "DEADLINE_EXCEEDED",
                }
            },
        ),
        _mock_response('{"action": "hold", "qty": 0, "reason": "fallback ok"}'),
    ]

    trader = GeminiTrader()
    result = trader.decide(PRICE_REQ, POSITION, SETTINGS)

    assert result.action == "hold"
    assert result.reason == "fallback ok"
    assert mock_client.models.generate_content.call_count == 2
    first_call = mock_client.models.generate_content.call_args_list[0].kwargs
    second_call = mock_client.models.generate_content.call_args_list[1].kwargs
    assert first_call["model"] == DEFAULT_GEMINI_MODEL
    assert second_call["model"] == GEMINI_FALLBACK_MODEL
    assert second_call["config"].thinking_config.thinking_budget == 0
    assert second_call["config"].thinking_config.thinking_level is None


@patch("server.engine.gemini_trader.genai.Client")
def test_decide_falls_back_to_stable_model_on_invalid_primary_json(mock_client_cls):
    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client
    mock_client.models.generate_content.side_effect = [
        _mock_response('Here is the JSON'),
        _mock_response('{"action": "hold", "qty": 0, "reason": "fallback parsed"}'),
    ]

    trader = GeminiTrader()
    result = trader.decide(PRICE_REQ, POSITION, SETTINGS)

    assert result.action == "hold"
    assert result.reason == "fallback parsed"
    assert mock_client.models.generate_content.call_count == 2
    first_call = mock_client.models.generate_content.call_args_list[0].kwargs
    second_call = mock_client.models.generate_content.call_args_list[1].kwargs
    assert first_call["model"] == DEFAULT_GEMINI_MODEL
    assert second_call["model"] == GEMINI_FALLBACK_MODEL


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

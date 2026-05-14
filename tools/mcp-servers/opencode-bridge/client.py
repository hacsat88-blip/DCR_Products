"""
opencode_mcp - OpenCode Go API クライアント

Chat Completions API 経由で OSS モデルを呼び出す。
リトライ、タイムアウト、ロールマッピングを処理する。
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import Any, Optional

import httpx

from models import OssTaskInput, OssTaskResult

logger = logging.getLogger(__name__)

OPENCODE_GO_BASE_URL = os.environ.get("OPENCODE_GO_BASE_URL", "https://opencode.ai/zen/go/v1")
DEFAULT_TIMEOUT = float(os.environ.get("OPENCODE_BRIDGE_TIMEOUT", "240"))
DEFAULT_MAX_RETRIES = int(os.environ.get("OPENCODE_BRIDGE_MAX_RETRIES", "2"))

# opencode-bridge リポジトリと同様の developer → system マッピング
_ROLE_MAP = {"developer": "system"}

# モデル別デフォルトシステムプロンプト
_DEFAULT_SYSTEM_PROMPTS: dict[str, str] = {
    "kimi-k2.6": (
        "You are an expert code explorer. Analyze code thoroughly and provide "
        "precise, structured answers. Include file paths, line numbers, and "
        "function signatures when relevant. Output confidence level at the end: "
        "HIGH / MEDIUM / LOW."
    ),
    "deepseek-v4-flash": (
        "You are a technical writer. Generate clear, concise documentation "
        "following existing conventions in the codebase. Be accurate and complete."
    ),
    "deepseek-v4-pro": (
        "You are an expert software engineer. Generate correct, idiomatic code "
        "following the existing patterns. Explain your approach briefly before "
        "presenting the implementation."
    ),
    "glm-5.1": (
        "You are an agentic software engineering model. Break complex engineering "
        "tasks into verifiable steps, reason about tool use carefully, and produce "
        "concise implementation guidance with explicit assumptions and risks."
    ),
}


def _map_role(role: str) -> str:
    return _ROLE_MAP.get(role, role)


def _build_messages(
    task: str,
    context: Optional[str],
    system_prompt: Optional[str],
    model: str,
) -> list[dict[str, str]]:
    sys = system_prompt or _DEFAULT_SYSTEM_PROMPTS.get(model, "You are a helpful AI assistant.")
    user_content = task if not context else f"{task}\n\n---\n\n{context}"
    return [
        {"role": "system", "content": sys},
        {"role": "user", "content": user_content},
    ]


async def _call_with_retry(
    client: httpx.AsyncClient,
    payload: dict[str, Any],
    max_retries: int,
) -> httpx.Response:
    last_exc: Exception | None = None
    for attempt in range(max_retries + 1):
        try:
            response = await client.post(
                f"{OPENCODE_GO_BASE_URL}/chat/completions",
                json=payload,
            )
            if response.status_code == 429 and attempt < max_retries:
                wait = 2 ** attempt
                logger.warning("Rate limited, retrying in %ds (attempt %d)", wait, attempt + 1)
                await asyncio.sleep(wait)
                continue
            response.raise_for_status()
            return response
        except (httpx.TimeoutException, httpx.ConnectError) as exc:
            last_exc = exc
            if attempt < max_retries:
                wait = 2 ** attempt
                logger.warning("Network error, retrying in %ds: %s", wait, exc)
                await asyncio.sleep(wait)
            else:
                raise
    raise last_exc  # type: ignore[misc]


async def call_oss_model(inp: OssTaskInput, default_model: str) -> OssTaskResult:
    """OpenCode Go API を呼び出してOSSモデルの応答を取得する。

    Args:
        inp: タスク入力（task, context, model_override, system_prompt）
        default_model: ツールごとのデフォルトモデルID

    Returns:
        OssTaskResult: モデルの応答とメタ情報

    Returns an error result instead of raising for runtime/API failures so MCP
    clients can render the failure as a normal tool response.
    """
    api_key = os.environ.get("OPENCODE_GO_API_KEY", "")
    if not api_key:
        return OssTaskResult(
            content="",
            model_used=default_model,
            error=(
                "OPENCODE_GO_API_KEY が設定されていません。"
                "tools/mcp-servers/opencode-bridge/.env を確認してください。"
            ),
        )

    model = inp.model_override or default_model
    messages = _build_messages(inp.task, inp.context, inp.system_prompt, model)

    payload: dict[str, Any] = {
        "model": model,
        "messages": [{"role": _map_role(m["role"]), "content": m["content"]} for m in messages],
        "stream": False,
    }

    async with httpx.AsyncClient(
        headers={"Authorization": f"Bearer {api_key}"},
        timeout=httpx.Timeout(DEFAULT_TIMEOUT),
    ) as client:
        try:
            response = await _call_with_retry(client, payload, DEFAULT_MAX_RETRIES)
        except httpx.HTTPStatusError as exc:
            status = exc.response.status_code
            try:
                detail = exc.response.json()
            except Exception:
                detail = exc.response.text
            return OssTaskResult(
                content="",
                model_used=model,
                error=f"HTTP {status}: {detail}",
            )
        except Exception as exc:
            return OssTaskResult(
                content="",
                model_used=model,
                error=str(exc),
            )

        try:
            data = response.json()
            choices = data.get("choices")
            if not isinstance(choices, list) or not choices:
                raise ValueError("response did not include choices")

            message = choices[0].get("message", {})
            if not isinstance(message, dict):
                raise ValueError("response choice did not include a message object")

            content = message.get("content", "")
            if content is None:
                content = ""
            if not isinstance(content, str):
                raise ValueError("response message content was not a string")

            reasoning = message.get("reasoning_content")
            usage = data.get("usage", {})
            if not isinstance(usage, dict):
                usage = {}
        except Exception as exc:
            return OssTaskResult(
                content="",
                model_used=model,
                error=f"Invalid API response: {exc}",
            )

        return OssTaskResult(
            content=content,
            model_used=data.get("model", model),
            input_tokens=usage.get("prompt_tokens", 0),
            output_tokens=usage.get("completion_tokens", 0),
            reasoning_content=reasoning if isinstance(reasoning, str) else None,
        )

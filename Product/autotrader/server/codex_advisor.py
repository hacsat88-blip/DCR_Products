"""Codex advisor integration.

The advisor is deliberately not an order engine.  It can describe risk,
rule weaknesses, and next-day improvements, but it cannot return buy/sell
instructions or confidence scores used for execution.
"""
from __future__ import annotations

import json
import os
import queue
import subprocess
import threading
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, TextIO


CODEX_COMMAND = os.environ.get("AUTOTRADER_CODEX_COMMAND", "codex")
CODEX_MODEL = os.environ.get("AUTOTRADER_CODEX_MODEL", "")
ADVISOR_TIMEOUT_SECONDS = float(os.environ.get("AUTOTRADER_ADVISOR_TIMEOUT", "3"))
APP_SERVER_CWD = str(Path(
    os.environ.get("AUTOTRADER_CODEX_CWD") or Path(__file__).resolve().parents[1]
).resolve())

SYSTEM_PROMPT = """あなたは短期トレードの発注者ではなく、撤退判断とルール改善を支援する参謀です。
売買指示、銘柄推奨、買い/売り判断、現在価格に基づく即時判断は出してはいけません。

目的は、1日の利益目標5000円よりも、大きく負けないこと、連敗時に潔く撤退することです。
返答は指定JSONだけに限定してください。"""

ADVISOR_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "required": [
        "risk_state",
        "should_stop_new_entries",
        "should_reduce_size",
        "reason",
        "rule_issue",
        "improvement",
    ],
    "properties": {
        "risk_state": {"type": "string", "enum": ["GREEN", "YELLOW", "RED"]},
        "should_stop_new_entries": {"type": "boolean"},
        "should_reduce_size": {"type": "boolean"},
        "reason": {"type": "string", "maxLength": 160},
        "rule_issue": {"type": "string", "maxLength": 240},
        "improvement": {"type": "string", "maxLength": 240},
    },
}


@dataclass
class AdvisorContext:
    date: str
    daily_target_profit: int
    max_daily_loss: int
    trade_count: int
    daily_pnl: float
    consecutive_losses: int
    rules_triggered: list[str]
    recent_trades: list[dict[str, Any]]


@dataclass
class CodexAdvice:
    risk_state: str
    should_stop_new_entries: bool
    should_reduce_size: bool
    reason: str
    rule_issue: str
    improvement: str
    api_error: bool = False

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class CodexAdvisor:
    def __init__(self) -> None:
        self._request_id = 0
        self._request_id_lock = threading.Lock()

    def review(self, context: AdvisorContext) -> CodexAdvice:
        try:
            payload = _build_prompt(context)
            response_text = self._run_app_server_turn(payload)
            return self._parse(response_text)
        except Exception as exc:
            return CodexAdvice(
                risk_state="RED",
                should_stop_new_entries=True,
                should_reduce_size=True,
                reason="Codex app-server が利用できないため新規建て禁止",
                rule_issue="app-server失敗時の安全停止が必要",
                improvement=f"codex login・auth.json・CLI起動・タイムアウト設定を確認: {type(exc).__name__}",
                api_error=True,
            )

    def _run_app_server_turn(self, prompt: str) -> str:
        auth_path = Path.home() / ".codex" / "auth.json"
        if not auth_path.exists():
            raise RuntimeError("codex auth.json not found; run codex login")

        proc = subprocess.Popen(
            [CODEX_COMMAND, "app-server", "--listen", "stdio://"],
            cwd=APP_SERVER_CWD,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        assert proc.stdin is not None
        assert proc.stdout is not None
        reader = _LineReader(proc.stdout)
        try:
            init_id = self._send(proc.stdin, "initialize", {
                "clientInfo": {
                    "name": "autotrader-codex-advisor",
                    "title": "Autotrader Codex Advisor",
                    "version": "0.1.0",
                },
                "capabilities": {
                    "experimentalApi": True,
                    "optOutNotificationMethods": [
                        "thread/tokenUsage/updated",
                        "turn/diff/updated",
                        "turn/plan/updated",
                    ],
                },
            })
            self._read_until_response(proc, reader, init_id)

            thread_params: dict[str, Any] = {
                "baseInstructions": SYSTEM_PROMPT,
                "cwd": APP_SERVER_CWD,
                "ephemeral": True,
                "approvalPolicy": "never",
                "sandbox": "read-only",
            }
            if CODEX_MODEL:
                thread_params["model"] = CODEX_MODEL
            thread_id = self._send(proc.stdin, "thread/start", thread_params)
            thread_result = self._read_until_response(proc, reader, thread_id)
            thread = thread_result.get("thread", {})
            actual_thread_id = thread.get("id")
            if not actual_thread_id:
                raise RuntimeError("thread/start returned no thread id")

            turn_id = self._send(proc.stdin, "turn/start", {
                "threadId": actual_thread_id,
                "input": [{"type": "text", "text": prompt}],
                "outputSchema": ADVISOR_SCHEMA,
                "approvalPolicy": "never",
                "sandboxPolicy": {"type": "readOnly", "networkAccess": False},
            })
            self._read_until_response(proc, reader, turn_id)
            return self._read_turn_text(proc, reader, actual_thread_id)
        finally:
            _terminate_process(proc)

    def _send(self, stdin: TextIO, method: str, params: dict[str, Any] | None = None) -> int:
        with self._request_id_lock:
            self._request_id += 1
            request_id = self._request_id
        message = {
            "jsonrpc": "2.0",
            "id": request_id,
            "method": method,
            "params": params or {},
        }
        stdin.write(json.dumps(message, ensure_ascii=False, separators=(",", ":")) + "\n")
        stdin.flush()
        return request_id

    def _read_until_response(
        self,
        proc: subprocess.Popen[str],
        reader: "_LineReader",
        request_id: int | None = None,
    ) -> dict[str, Any]:
        deadline = time.monotonic() + ADVISOR_TIMEOUT_SECONDS
        while time.monotonic() < deadline:
            line = reader.readline(deadline)
            if not line:
                break
            message = json.loads(line)
            self._maybe_answer_server_request(proc, message)
            if "id" in message and (request_id is None or message["id"] == request_id):
                if "error" in message:
                    raise RuntimeError(str(message["error"]))
                return message.get("result") or {}
            if proc.poll() is not None:
                break
        raise TimeoutError("codex app-server response timed out")

    def _read_turn_text(
        self,
        proc: subprocess.Popen[str],
        reader: "_LineReader",
        thread_id: str,
    ) -> str:
        chunks: list[str] = []
        completed_chunks: list[str] = []
        completed = False
        deadline = time.monotonic() + ADVISOR_TIMEOUT_SECONDS
        while time.monotonic() < deadline and not completed:
            line = reader.readline(deadline)
            if not line:
                break
            message = json.loads(line)
            self._maybe_answer_server_request(proc, message)
            method = message.get("method")
            params = message.get("params") or {}
            if method == "item/agentMessage/delta" and params.get("threadId") == thread_id:
                chunks.append(str(params.get("delta", "")))
            elif method == "item/completed" and params.get("threadId") == thread_id:
                completed_chunks.extend(_extract_text_from_completed_item(params.get("item")))
            elif method == "turn/completed" and params.get("threadId") == thread_id:
                completed = True
            if proc.poll() is not None:
                break

        text = "".join(chunks or completed_chunks).strip()
        if not text:
            raise RuntimeError("codex app-server returned empty advisor text")
        return text

    def _maybe_answer_server_request(self, proc: subprocess.Popen[str], message: dict[str, Any]) -> None:
        if "id" not in message or "method" not in message or "result" in message or "error" in message:
            return
        if proc.stdin is None:
            return
        method = message["method"]
        if method == "item/permissions/requestApproval":
            response = {"jsonrpc": "2.0", "id": message["id"], "result": {"permissions": "denied"}}
        elif "requestApproval" in method or method in {"applyPatchApproval", "execCommandApproval"}:
            response = {"jsonrpc": "2.0", "id": message["id"], "result": {"decision": "decline"}}
        else:
            response = {
                "jsonrpc": "2.0",
                "id": message["id"],
                "error": {"code": -32601, "message": f"Unsupported server request: {method}"},
            }
        proc.stdin.write(json.dumps(response, ensure_ascii=False, separators=(",", ":")) + "\n")
        proc.stdin.flush()

    def _parse(self, text: str) -> CodexAdvice:
        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            return CodexAdvice(
                risk_state="RED",
                should_stop_new_entries=True,
                should_reduce_size=True,
                reason="Codex助言JSONを解析できないため新規建て禁止",
                rule_issue="構造化出力の検証に失敗",
                improvement="プロンプト・モデル・app-server応答形式を確認する",
                api_error=True,
            )

        risk_state = str(data.get("risk_state", "RED")).upper()
        if risk_state not in {"GREEN", "YELLOW", "RED"}:
            risk_state = "RED"

        return CodexAdvice(
            risk_state=risk_state,
            should_stop_new_entries=bool(data.get("should_stop_new_entries", risk_state == "RED")),
            should_reduce_size=bool(data.get("should_reduce_size", risk_state != "GREEN")),
            reason=str(data.get("reason", ""))[:160],
            rule_issue=str(data.get("rule_issue", ""))[:240],
            improvement=str(data.get("improvement", ""))[:240],
        )


def _build_prompt(context: AdvisorContext) -> str:
    payload = json.dumps(asdict(context), ensure_ascii=False)
    return (
        "以下の取引日次コンテキストを監査し、JSONだけを返してください。\n"
        "売買指示、銘柄推奨、BUY/SELL/HOLD、confidence、発注可否は絶対に返さないでください。\n"
        f"{payload}"
    )


def _extract_text_from_completed_item(item: Any) -> list[str]:
    if not isinstance(item, dict):
        return []
    texts: list[str] = []
    for key in ("text", "content"):
        value = item.get(key)
        if isinstance(value, str):
            texts.append(value)
        elif isinstance(value, list):
            for part in value:
                if isinstance(part, dict) and isinstance(part.get("text"), str):
                    texts.append(part["text"])
    return texts


class _LineReader:
    def __init__(self, stdout: TextIO) -> None:
        self._lines: "queue.Queue[str | None]" = queue.Queue()
        self._thread = threading.Thread(target=self._read_loop, args=(stdout,), daemon=True)
        self._thread.start()

    def _read_loop(self, stdout: TextIO) -> None:
        try:
            for line in stdout:
                self._lines.put(line)
        finally:
            self._lines.put(None)

    def readline(self, deadline: float) -> str | None:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise TimeoutError("codex app-server response timed out")
        try:
            return self._lines.get(timeout=remaining)
        except queue.Empty as exc:
            raise TimeoutError("codex app-server response timed out") from exc


def _terminate_process(proc: subprocess.Popen[str]) -> None:
    if proc.poll() is not None:
        return
    proc.terminate()
    try:
        proc.wait(timeout=1)
    except subprocess.TimeoutExpired:
        proc.kill()

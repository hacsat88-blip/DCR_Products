import json
import os
import re
from dataclasses import dataclass

from openai import OpenAI


SYSTEM_PROMPT = """あなたは東証プライムの短期デイトレーダーです。
「負けない」を最優先とし、不確実な場面は必ず「待機」を選んでください。

判断基準：
- 買い(buy): テクニカルフィルター通過済み + 5分足の上昇トレンド + 出来高増加
- 売り(sell): 目標利益到達 or 損切りライン到達 or 天井圏シグナル
- 待機(hold): 上記以外は全て待機

必ずJSON形式のみで回答してください（説明文不要）:
{"action": "buy"|"sell"|"hold", "reason": "<30字以内>", "confidence": 0.0-1.0}

重要: confidenceが0.7未満の場合は必ずholdにしてください。"""


@dataclass
class TradeSignal:
    action: str       # "buy" | "sell" | "hold"
    reason: str
    confidence: float


OPENCODE_BASE_URL = "https://opencode.ai/zen/go/v1"
OPENCODE_MODEL = "deepseek-v4-pro"  # 変更する場合: kimi-k2.6 / deepseek-v4-flash / glm-5.1


class AITrader:
    def __init__(self) -> None:
        self._client: OpenAI | None = None

    def _get_client(self) -> OpenAI:
        if self._client is None:
            self._client = OpenAI(
                api_key=os.environ["OPENCODE_GO_API_KEY"],
                base_url=OPENCODE_BASE_URL,
            )
        return self._client

    def judge(
        self,
        symbol: str,
        price: float,
        rsi14: float,
        volume_ratio: float,
        price_change_pct: float,
        position_pnl: float | None,
        tier: str,
    ) -> TradeSignal:
        user_msg = (
            f"銘柄: {symbol} / 現在値: {price:.0f}円\n"
            f"RSI(14): {rsi14:.1f} / 出来高比: {volume_ratio:.1f}倍 / 前日比: {price_change_pct:+.1f}%\n"
            f"ティア: {tier}\n"
        )
        if position_pnl is not None:
            user_msg += f"含み損益: {position_pnl:+.0f}円\n"

        response = self._get_client().chat.completions.create(
            model=OPENCODE_MODEL,
            max_tokens=128,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
        )

        return self._parse(response.choices[0].message.content or "")

    def _parse(self, text: str) -> TradeSignal:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            return TradeSignal(action="hold", reason="パース失敗", confidence=0.0)

        try:
            data = json.loads(match.group())
            action = str(data.get("action", "hold")).lower()
            if action not in ("buy", "sell", "hold"):
                action = "hold"
            confidence = float(data.get("confidence", 0.0))
            if confidence < 0.7:
                action = "hold"
            return TradeSignal(
                action=action,
                reason=str(data.get("reason", ""))[:30],
                confidence=confidence,
            )
        except (json.JSONDecodeError, ValueError):
            return TradeSignal(action="hold", reason="JSON解析エラー", confidence=0.0)

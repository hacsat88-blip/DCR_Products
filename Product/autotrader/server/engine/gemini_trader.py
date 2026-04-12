import json
import logging
import os
import re

from google import genai
from google.genai import types

from server.models import PriceRequest, TradeDecision, Position, RiskSettings

_logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-3.1-flash-lite-preview"

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


class GeminiTrader:
    def __init__(self):
        self._client = genai.Client(api_key=os.environ["GOOGLE_API_KEY"])

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
        response = self._client.models.generate_content(
            model=GEMINI_MODEL,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=_SYSTEM_PROMPT,
            ),
        )
        text = response.text.strip()
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            raise ValueError(f"No JSON object found in response: {text[:80]}")
        data = json.loads(match.group())
        return TradeDecision(
            action=data["action"].lower(),
            qty=data.get("qty", 0),
            reason=data.get("reason", ""),
        )

    def decide_safe(
        self,
        req: PriceRequest,
        position: Position,
        settings: RiskSettings,
    ) -> TradeDecision:
        try:
            return self.decide(req, position, settings)
        except Exception as e:
            _logger.exception("GeminiTrader.decide failed")
            return TradeDecision(
                action="hold",
                qty=0,
                reason=f"AI判断エラー: {str(e)[:40]}",
            )

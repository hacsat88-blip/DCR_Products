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

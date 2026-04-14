import json
import logging
import os
import re
from typing import TYPE_CHECKING

from google import genai
from google.genai import types

from server.models import PriceRequest, TradeDecision, Position, RiskSettings

if TYPE_CHECKING:
    from server.engine.trade_setup import TradeSetup

_logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_HTTP_TIMEOUT_MS = 10_000
GEMINI_HTTP_RETRY_ATTEMPTS = 1

_SYSTEM_PROMPT = """あなたは日本株の短期トレーダーです。
与えられた株価データと現在のポジション情報をもとに、
次の売買アクションを JSON のみで回答してください。

ルール:
- action は "buy" / "sell" / "hold" のいずれか
- 確信が持てない場合は必ず "hold"
- 既にポジションがある場合（qty > 0）は追加買いしない
- ノイズに惑わされず、明確なシグナルのみで動く
- 新規 buy は順張り寄りで、5本レンジが十分あり、直近出来高が平均以上で、価格がレンジ上側または高値更新の時だけ検討する
- 参照価格から大きく上振れした追いかけ buy は避ける
- 板スプレッドが広いとき、寄り付き直後、ニュース停止フラグが立っているときは様子見を優先する
- 引け前は新規建てより手仕舞いを優先する

回答形式（JSONのみ、前後に文字を入れない）:
{"action": "buy"|"sell"|"hold", "qty": N, "reason": "日本語で50字以内"}"""


class GeminiTrader:
    def __init__(self):
        self._client: genai.Client | None = None

    def _request_http_options(self) -> types.HttpOptions:
        return types.HttpOptions(
            timeout=GEMINI_HTTP_TIMEOUT_MS,
            retry_options=types.HttpRetryOptions(
                attempts=GEMINI_HTTP_RETRY_ATTEMPTS,
            ),
        )

    def is_configured(self) -> bool:
        return bool(os.environ.get("GOOGLE_API_KEY", "").strip())

    def _get_client(self) -> genai.Client:
        if self._client is None:
            api_key = os.environ.get("GOOGLE_API_KEY", "").strip()
            if not api_key:
                raise RuntimeError("GOOGLE_API_KEY not set")
            self._client = genai.Client(api_key=api_key)
        return self._client

    def decide(
        self,
        req: PriceRequest,
        position: Position,
        settings: RiskSettings,
        setup: "TradeSetup | None" = None,
    ) -> TradeDecision:
        strategy_prompt = ""
        if setup is not None:
            reference_gap = (
                f"{setup.reference_gap_pct:.2f}%"
                if setup.reference_gap_pct is not None
                else "なし"
            )
            strategy_prompt = (
                f"\n戦略指標: 5本レンジ {setup.five_bar_range_pct:.3f}% / "
                f"直近出来高倍率 {setup.last_bar_volume_ratio:.2f} / "
                f"レンジ位置 {setup.price_position_in_range:.2f} / "
                f"高値更新 {setup.breakout_above_prev_high} / 参照乖離 {reference_gap} / "
                f"スプレッド {setup.spread_bps if setup.spread_bps is not None else 'なし'}bps / "
                f"寄り付き経過 {setup.minutes_from_session_open}分 / "
                f"ニュース停止 {setup.news_halt}"
            )
        user_prompt = (
            f"銘柄: {req.code}\n"
            f"現在値: {req.price}円\n"
            f"直近{len(req.ohlc)}本のOHLCV: {[b.model_dump() for b in req.ohlc]}\n"
            f"現在のポジション: {position.qty}株 / 平均取得単価 {position.avg_cost}円 / "
            f"含み損益 {position.pnl:.0f}円 ({position.pnl_pct:.1f}%)\n"
            f"リスク設定: 1発注上限 {settings.limit_per_order}円 / "
            f"損切りライン {settings.stop_loss_pct}% / 最大数量 {settings.max_qty_per_order}株"
            f"{strategy_prompt}"
        )
        response = self._get_client().models.generate_content(
            model=GEMINI_MODEL,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                http_options=self._request_http_options(),
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
        setup: "TradeSetup | None" = None,
    ) -> TradeDecision:
        try:
            return self.decide(req, position, settings, setup=setup)
        except Exception as e:
            _logger.exception("GeminiTrader.decide failed")
            return TradeDecision(
                action="hold",
                qty=0,
                reason=f"AI判断エラー: {str(e)[:40]}",
            )

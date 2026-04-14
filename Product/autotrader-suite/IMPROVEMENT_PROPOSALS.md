# AutoTrader Suite — 比較分析と改善提案

> 作成日: 2026-04-13  
> 対象ブランチ: `feat/autotrader-gemini-jquants-reference`  
> 視点: 設計・安全性・リスク管理・収益安定性・運用性の多角的評価

---

## 目次

1. [MarketSpeed II RSS vs AutoTrader Suite 比較表](#1-比較表)
2. [改善提案 — 安全性・堅牢性](#2-安全性--堅牢性)
3. [改善提案 — リスク管理の強化](#3-リスク管理の強化)
4. [改善提案 — 収益安定性](#4-収益安定性)
5. [改善提案 — 運用性・監視](#5-運用性--監視)
6. [改善提案 — アーキテクチャ](#6-アーキテクチャ)
7. [優先度マトリクス](#7-優先度マトリクス)

---

## 1. 比較表

### 1-1. 基本アーキテクチャ

| 観点 | MarketSpeed II RSS | AutoTrader Suite |
|---|---|---|
| 構成 | Excel アドイン（XLL） + MS II 本体 | 3層: FastAPI + Next.js + Excel/VBA |
| 動作前提 | MS II 起動・ログイン済み | MS II + Python + Node.js |
| 意思決定 | **ユーザー自前**（Excel 数式/VBA） | **Gemini AI** + ルールベースフォールバック |
| データフロー | Excel ← RSS 関数 → 証券サーバ | Excel → VBA POST → FastAPI → Gemini → VBA → 発注 |

### 1-2. 取引機能

| 機能 | MS II RSS | AutoTrader Suite | 差異 |
|---|---|---|---|
| 成行注文 | ○ | ○ | 同等 |
| 指値注文 | ○ | △（拡張可） | RSS 優位 |
| 逆指値注文 | ○ | ✕ | RSS 優位 |
| アルゴ注文（5種） | ✕（本体 GUI のみ） | ✕ | 同等（両方なし） |
| 注文訂正/取消 | ○ | ✕ | RSS 優位 |
| 信用取引 | ○ | ✕ | RSS 優位 |
| 先物/オプション | ○ | ✕ | RSS 優位 |
| 米国株 | ✕（本体は対応） | ✕ | 同等 |

### 1-3. リスク管理

| リスク制御 | MS II RSS | AutoTrader Suite |
|---|---|---|
| 日次損失上限 | ✕（自前実装必要） | ○（15,000 円デフォルト） |
| 連続損失制御 | ✕ | ○（2 回でクールダウン） |
| クールダウン期間 | ✕ | ○（15 分） |
| ストップロス | ✕（自前実装必要） | ○（3% 自動損切り） |
| 価格帯フィルタ | ✕ | ○（100–500 円バンド） |
| 取引時間制御 | ✕ | ○（AM/PM セッション + 開場後 5 分 + 引け前 10 分） |
| 発注 3 段階ロック | ○（発注可/不可/別ファイルで自動ロック） | ○（run_mode × order_mode × live_armed） |
| スプレッド制限 | ✕ | ○（20 bps 上限） |
| 日次注文数制限 | ✕ | ○（モード別 3–8 回） |
| ニュースハルト | ✕ | ○（手動トグル） |

### 1-4. ペーパートレード・バックテスト

| 観点 | MS II RSS | AutoTrader Suite |
|---|---|---|
| ペーパートレード | ✕（常に実口座） | ○（paper モード） |
| デモ環境 | MS II 本体のみ（RSS 非対応） | stub_only + paper で安全テスト |
| バックテスト | ✕ | ○（CSV 入力、勝率/PF/最大 DD 算出） |

### 1-5. 監視・UI

| 観点 | MS II RSS | AutoTrader Suite |
|---|---|---|
| ダッシュボード | Excel シートのみ | Next.js WebSocket リアルタイム UI |
| ヘルスチェック | ✕ | ○（AI/Reference 各ステータス） |
| 遠隔監視 | ✕ | ○（任意のブラウザから） |
| リスク設定変更 | VBA/セル手動 | ○（UI から PUT で即時反映） |

### 1-6. データ

| 観点 | MS II RSS | AutoTrader Suite |
|---|---|---|
| リアルタイム株価フィールド数 | **148 種類** | RSS 経由で取得（Code/Price/Vol/Bid/Ask のみ利用） |
| 参照価格（前日終値） | RSS で取得可 | J-Quants API（日次、乖離率チェック付き） |
| OHLC 蓄積 | `RssChart` 関数 | VBA 側で 20 bar ローリング蓄積 |
| 余力照会 | `RssCapacityList`（実口座連動） | 設定値のみ（口座連動なし） |

### 1-7. まとめ（補完関係）

AutoTrader Suite は RSS の制限を補完する設計になっている。両者は競合ではなく **共生関係** である。

| RSS が提供するもの | AutoTrader Suite が補完するもの |
|---|---|
| リアルタイム価格データ（148 フィールド） | AI 意思決定エンジン（Gemini） |
| 多様な注文種別 | 包括的リスク管理（18 種の制約） |
| 実口座への発注 | ペーパートレード環境 |
| 口座残高・余力照会 | リファレンス価格検証（J-Quants） |
| — | Web ダッシュボード（リアルタイム遠隔監視） |
| — | バックテスト |

---

## 2. 安全性・堅牢性

### 2-1. 注文重複発注リスク

**現状の問題**  
`modTimer.OnTick` は `Application.OnTime` で再スケジュールするが、前のティック処理が HTTP タイムアウト（3 秒）を超えると、次のティックが並走する可能性がある。

**提案**  
```vba
' modTimer.bas に追加
Private g_IsTickRunning As Boolean

Sub OnTick()
    If g_IsTickRunning Then
        Debug.Print "Tick skipped: previous tick still running"
        GoTo Reschedule
    End If
    g_IsTickRunning = True
    ' ... 処理 ...
    g_IsTickRunning = False
Reschedule:
    Application.OnTime Now + TimeSerial(0, 0, RuntimePollInterval()), "OnTick"
End Sub
```

**効果**: 重複発注・ポジション二重計上の防止

---

### 2-2. state.json の原子書き込みは十分か

**現状**  
`.tmp` ファイル経由の原子書き込みは実装済み。ただし、アプリクラッシュ時に `.tmp` が残留すると次回起動でロードが失敗する可能性がある。

**提案**  
```python
# position.py のロード処理に追加
tmp_path = path.with_suffix(".tmp")
if tmp_path.exists():
    # クラッシュ由来の残留 tmp を警告ログ後に削除
    logger.warning("Stale .tmp file detected, removing: %s", tmp_path)
    tmp_path.unlink()
```

---

### 2-3. Gemini API キー漏洩対策

**現状**  
`.env` で管理されているが、`.gitignore` に `.env` が含まれているか未確認。

**提案**
```
# .gitignore に必須追加
*.env
.env.*
!.env.example
state.json
```

また、`GOOGLE_API_KEY` を環境変数ではなく OS キーチェーン（Windows Credential Manager）に移行することを中期目標とする。

---

### 2-4. VBA → FastAPI 間の認証なし

**現状**  
`http://127.0.0.1:8000` はローカルホストのみ公開で、ネットワーク越しのアクセスは想定外。  
ただし、将来的に外部から監視 UI へアクセスする場合はリスクになる。

**提案（段階的）**  
- 短期: `CORS_ORIGINS` を `localhost:3000` のみに制限（現状維持）  
- 中期: VBA ヘッダに静的 Bearer トークンを追加し、FastAPI で検証  
- 長期: HTTPS + mTLS（自己署名証明書）で保護

---

### 2-5. 発注後の確認フロー欠如

**現状**  
`modOrder.SubmitLiveOrder` が COM 呼び出し後、成功/失敗を `/api/execution-result` にポストするが、約定確認（`RssOrderStatus`）がない。

**提案**  
1. `RssOrderIDList()` で発注 ID を取得
2. 数秒後に `RssOrderStatus(orderID)` をポーリング
3. 約定 or 失敗を確認してから `/api/execution-result` をポスト
4. 未約定の場合は `RssOrderCancel` でキャンセル + ログ記録

---

## 3. リスク管理の強化

### 3-1. 余力チェックの欠如（重大）

**現状の問題**  
`available_cash` は設定値の静的な数値であり、実際の口座余力（`RssCapacityList`）と連動していない。実口座残高を超えた発注を試みるリスクがある。

**提案**  
```vba
' modConfig.bas に追加
Function RuntimeAvailableCash() As Double
    ' RssCapacityList から実口座の現物買付可能額を取得
    Dim capacity As Variant
    capacity = Application.Run("RssCapacityList", "現物買付可能額")
    If IsNumeric(capacity) Then
        RuntimeAvailableCash = CDbl(capacity)
    Else
        RuntimeAvailableCash = 0  ' 取得失敗時は発注不可にする
    End If
End Function
```

バックエンド側も `/api/price` リクエストに `available_cash_actual` フィールドを追加し、`RiskGuard` で静的設定値との低い方を採用する。

---

### 3-2. 単一銘柄集中リスク

**現状**  
コードごとのポジション管理はシングルスロット設計。同一銘柄の連続買いは `apply_buy` で avg_cost を更新するが、「ナンピン」（下落中に追加買い）を防ぐ明示的なルールがない。

**提案**  
```python
# risk_guard.py に追加
def _check_averaging_down(self, position: Position, current_price: float) -> bool:
    """ナンピン防止: 含み損ポジションへの追加買いをブロック"""
    if position.qty > 0 and current_price < position.avg_cost:
        return False  # ブロック
    return True
```

---

### 3-3. 週次・月次損失制限がない

**現状**  
日次損失（`max_daily_loss_yen`）はあるが、週次・月次の累積損失制限がない。連日小さく損失を重ねると月次で大きな損失になる可能性がある。

**提案**  
```python
# RiskSettings に追加
max_weekly_loss_yen: float = 50_000   # 週次損失上限
max_monthly_loss_yen: float = 150_000  # 月次損失上限
```

`RiskGuard` のリセットロジックを日次/週次/月次で分離し、それぞれの累積損失を追跡する。

---

### 3-4. Gemini AI の判断に対する事後検証がない

**現状**  
Gemini の `reason` フィールド（最大 50 文字）はログに記録されるが、AI 判断の事後評価（何%の判断が正しかったか）をトラッキングする仕組みがない。

**提案**  
- ログに `decision_id`（UUID）を付与
- 約定後の結果（PnL）と `decision_id` を紐付けて保存
- 週次集計: AI 判断別の勝率・平均損益を算出
- 期待値が負の場合は `trading_mode` を自動的に conservative へ降格

---

### 3-5. スリッページ考慮なし

**現状**  
成行注文のスリッページ（板の薄い銘柄での約定価格のずれ）が PnL 計算に反映されていない。`apply_buy(code, qty, price)` は送信価格で計算する。

**提案**  
- 板情報（bid/ask）から想定スリッページ（ask - price）を計算
- 買い時: `cost = price + (ask - price)` を avg_cost に使用
- `TradeSetup` に `estimated_slippage_bps` を追加し、Gemini へ渡す

---

## 4. 収益安定性

### 4-1. 単一戦略リスク（Gemini AI 依存）

**現状**  
Gemini AI の API が利用不可の場合、`decide_safe()` は hold を返す。これ自体は安全だが、**稼ぎ時に何もしない** リスクがある。

**提案**  
```python
# 3 段階フォールバック
# 1. Gemini AI（プライマリ）
# 2. RuleBasedTrader（フォールバック）
# 3. hold（最終フォールバック）

async def decide_with_fallback(self, setup: TradeSetup) -> TradeDecision:
    try:
        return await self.gemini.decide(setup)
    except GeminiUnavailableError:
        logger.warning("Gemini unavailable, falling back to rule-based")
        return self.rule_based.decide(setup)
    except Exception:
        return TradeDecision(action="hold", qty=0, reason="fallback: error")
```

---

### 4-2. トレンド判定の時間軸が短い（5 bar = 5 分）

**現状**  
`TradeSetup` は直近 5 本の 1 分足のみを使用。日足・週足トレンドへの適合性がない。

**提案**  
- J-Quants から過去 20 日分の日次データを取得（既存 API で可能）
- 日次 MA（5 日、25 日）を `JQuantsReferenceService` で計算して `TradeSetup` に追加
- Gemini のシステムプロンプトに「日次トレンドと逆らう場合は hold を優先」を追記

---

### 4-3. 取引コスト（手数料）の考慮なし

**現状**  
PnL 計算は手数料ゼロを前提としている。楽天証券のゼロコースなら現物は無料だが、約定金額によっては手数料が発生する口座設定もある。

**提案**  
```python
# RiskSettings に追加
commission_per_trade_yen: float = 0.0  # 手数料（0=ゼロコース）
```

`apply_sell` でPnL計算時に手数料を差し引く。`min_profit_target_pct` も手数料分を上乗せして設定できるようにする。

---

### 4-4. 利確ロジックが弱い

**現状**  
RuleBasedTrader の利確条件は「PnL > 0.5% かつ 45% レンジ以下」のみ。Gemini AI は `reason` に利確判断を含めるが、バックエンドで強制的な利確ルールがない。

**提案**  
```python
# risk_guard.py に追加
take_profit_pct: float = 1.5  # 利確閾値（デフォルト 1.5%）

def check_take_profit(self, position: Position) -> bool:
    """利確ラインに達したら強制売却シグナル"""
    return position.pnl_pct >= self.settings.take_profit_pct
```

`price_feed.py` の処理フローで stop-loss チェックと同様に take-profit チェックを追加し、Gemini 判断の前段で強制 sell を発動できるようにする。

---

### 4-5. 市場環境フィルタがない

**現状**  
VIX（日本版: VI 指数）や市場全体の強弱判断なしに個別銘柄を売買している。相場全体が崩れている日でも個別判断のみで売買する。

**提案**  
- J-Quants から TOPIX / 日経 225 の前日比を取得
- 市場全体が -1.5% 以上下落の日は `mode=conservative` を強制
- 市場全体が -3.0% 以上下落の日は `entry_blocked=True`（新規エントリーなし）
- Control シート B 列に市場フィルタの適用状況を表示

---

## 5. 運用性・監視

### 5-1. アラート通知がない

**現状**  
エラーは `Control!B15` と UI の `last_warning` に表示されるが、**プッシュ通知** がない。PC を離れると異常を検知できない。

**提案（優先度高）**  
```python
# 新規: notifications.py
import httpx

async def send_slack_alert(webhook_url: str, message: str):
    async with httpx.AsyncClient() as client:
        await client.post(webhook_url, json={"text": message})

async def send_line_notify(token: str, message: str):
    async with httpx.AsyncClient() as client:
        await client.post(
            "https://notify-api.line.me/api/notify",
            headers={"Authorization": f"Bearer {token}"},
            data={"message": message}
        )
```

トリガーイベント例:
- 日次損失上限到達
- 連続損失 2 回
- AI ステータス degraded が 5 分継続
- 実発注成功/失敗

---

### 5-2. ログが Excel シートのみ（上限 200 行）

**現状**  
Log シートは 200 行ローテーションで上書きされる。長期的な取引履歴の分析が困難。

**提案**  
```python
# バックエンドに SQLite ログを追加
# trade_log.py
import sqlite3

CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS trade_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL,
    code TEXT,
    price REAL,
    action TEXT,
    qty INTEGER,
    reason TEXT,
    pnl REAL,
    pnl_pct REAL,
    feed_source TEXT,
    reference_price REAL,
    reference_gap_pct REAL,
    risk_block_reason TEXT
)
"""
```

週次サマリ（総取引数・勝率・PF・最大 DD）を JSON エンドポイントで提供し、UI ダッシュボードに表示する。

---

### 5-3. バックエンドの再起動でポジションが失われるリスク

**現状**  
`state.json` は永続化されているが、実口座の実際のポジションと乖離した場合に自動調整する仕組みがない。

**提案**  
```python
# 起動時の reconciliation
async def reconcile_position_on_startup(position_mgr, rss_position_source):
    """
    state.json のポジションと実口座ポジションを照合。
    差異があれば警告を出し、ユーザー確認後に同期する。
    """
    actual = await rss_position_source.get_position()
    local = await position_mgr.get()
    if actual != local:
        logger.warning(
            "Position mismatch: local=%s, actual=%s", local, actual
        )
        # 自動修正はせず、degraded ステータスにして UI に警告表示
        await paper_ops.set_warning("Position mismatch detected. Manual reconciliation required.")
```

---

### 5-4. UI の設定変更が即時反映されるが確認なし

**現状**  
`RiskSettingsAccordion` の PUT は確認ダイアログなしに即時反映される。誤操作で`max_daily_loss_yen` を 0 にすると全取引がブロックされる。

**提案**  
- 変更前後の diff を表示する確認モーダルを追加
- 危険な変更（損失上限の引き上げ、live_armed の変更）は二段階確認
- 設定変更履歴をバックエンドで保持（最大 10 世代）

---

### 5-5. バックテスト結果の保存・比較機能がない

**現状**  
`backtest.py` は標準出力にメトリクスを出力するのみ。パラメータ変更時の比較ができない。

**提案**  
```bash
# CLI 引数で出力先を指定
python -m server.backtest \
  --csv data/7203_2025.csv \
  --settings conservative \
  --output results/backtest_conservative_20260413.json
```

UI に「バックテスト結果一覧」タブを追加し、異なるパラメータセット間の比較テーブルを表示する。

---

## 6. アーキテクチャ

### 6-1. 複数銘柄の並行監視

**現状**  
`PositionManager` はシングルスロット設計（1 銘柄のみ）。`max_concurrent_positions` は 1–3 に設定できるが、バックエンドのポジション管理はスケールしていない。

**提案**  
```python
# position.py のリファクタ
class PositionManager:
    def __init__(self):
        self._positions: dict[str, Position] = {}  # code -> Position

    async def apply_buy(self, code: str, qty: int, price: float):
        pos = self._positions.get(code, Position(code=code))
        # ... 更新 ...
        self._positions[code] = pos

    async def get_all(self) -> list[Position]:
        return list(self._positions.values())
```

VBA 側も複数の `RSS_TICK` named range を定義し、別々のコードを並行監視できるよう `modTimer` を拡張する。

---

### 6-2. WebSocket の再接続ロジックがない（UI）

**現状**  
`useTraderSocket` は 15 秒で stale 検出するが、自動再接続の実装が不明。WebSocket が切断した場合のユーザー体験が悪い。

**提案**  
```typescript
// useTraderSocket.ts に追加
const RECONNECT_DELAY_MS = [1000, 2000, 5000, 10000, 30000]; // 指数バックオフ

function connect(attempt = 0) {
  const ws = new WebSocket(wsUrl);
  ws.onclose = () => {
    const delay = RECONNECT_DELAY_MS[Math.min(attempt, RECONNECT_DELAY_MS.length - 1)];
    setTimeout(() => connect(attempt + 1), delay);
  };
  ws.onopen = () => {
    attempt = 0; // リセット
  };
}
```

---

### 6-3. J-Quants API のフォールバックがない

**現状**  
J-Quants が取得失敗した場合は `reference_status=missing` となり degraded になるが、代替データソースがない。

**提案**  
- `RssMarket` の `前日終値` フィールド（RSS 148 項目に含まれる）をセカンダリリファレンスとして使用
- VBA の `modHTTP.BuildRequestJson` に `prev_close`（前日終値）フィールドを追加
- J-Quants が unavailable の時は RSS 由来の前日終値で代替

---

### 6-4. 設定変更がメモリのみで永続化されない

**現状**  
`PUT /api/settings` はメモリ内の `RiskSettings` を更新するが、再起動すると元の値に戻る。

**提案**  
```python
# settings_store.py
import json
from pathlib import Path

SETTINGS_PATH = Path(__file__).parent.parent / "settings.json"

def save_settings(settings: RiskSettings):
    SETTINGS_PATH.write_text(settings.model_dump_json(indent=2))

def load_settings() -> RiskSettings:
    if SETTINGS_PATH.exists():
        return RiskSettings.model_validate_json(SETTINGS_PATH.read_text())
    return RiskSettings()  # デフォルト値
```

---

## 7. 優先度マトリクス

| 提案 | 影響度 | 実装コスト | 優先度 |
|---|:---:|:---:|:---:|
| **2-1** 注文重複発注防止（VBA tick guard） | 高 | 低 | **S** |
| **3-1** 余力チェック（RssCapacityList 連動） | 高 | 中 | **S** |
| **5-1** アラート通知（Slack/LINE） | 高 | 低 | **S** |
| **6-4** 設定の永続化（settings.json） | 中 | 低 | **A** |
| **3-5** 取引コスト（手数料）考慮 | 中 | 低 | **A** |
| **4-4** 利確ロジック強化 | 中 | 低 | **A** |
| **2-5** 約定確認フロー（RssOrderStatus） | 高 | 高 | **A** |
| **3-2** ナンピン防止 | 中 | 低 | **A** |
| **5-2** SQLite ログ（長期履歴） | 中 | 中 | **B** |
| **3-3** 週次・月次損失制限 | 中 | 中 | **B** |
| **4-1** フォールバック戦略（3 段階） | 中 | 低 | **B** |
| **6-2** WebSocket 自動再接続 | 中 | 低 | **B** |
| **4-2** 日足トレンドフィルタ | 高 | 高 | **B** |
| **5-3** 起動時ポジション照合 | 高 | 高 | **B** |
| **3-4** AI 判断の事後検証 | 高 | 高 | **C** |
| **4-5** 市場環境フィルタ | 高 | 高 | **C** |
| **6-1** 複数銘柄並行監視 | 高 | 高 | **C** |
| **6-3** J-Quants フォールバック（RSS 前日終値） | 中 | 中 | **C** |
| **5-4** 設定変更の確認 UI | 低 | 中 | **C** |
| **5-5** バックテスト結果保存・比較 | 低 | 高 | **C** |

> **凡例**  
> S = 今すぐ着手（安全性・損失防止に直結）  
> A = 次の開発スプリントで対応  
> B = 機能安定後に対応  
> C = 将来検討

---

*このドキュメントは `feat/autotrader-gemini-jquants-reference` ブランチのコード調査と MarketSpeed II RSS 公式ドキュメントのリサーチに基づいて作成。*

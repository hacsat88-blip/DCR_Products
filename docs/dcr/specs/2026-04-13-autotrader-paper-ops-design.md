# AutoTrader Paper Trading Operations Design

> 対象: AutoTrader paper-trading operator workflow

## Goal

実発注を有効化しなくても、operator が AutoTrader を日中運用できる状態にする。起動、停止、接続状態、直近エラー、paper-trading である事実、当日の判断状況を workbook と dashboard の両方から迷わず確認できるようにする。

## Design Summary

- 売買ロジック、risk guard、backtest の判断系は変えない。
- 追加するのは運用状態の可視化と operator 導線だけに絞る。
- VBA は local session state を持ち、backend は単一の shared health state を返す。
- dashboard は WebSocket の価格状態に加えて health state を表示し、tick 停止と server 健康状態を分けて見せる。
- order execution は引き続き stub のままとし、その事実を常時明示する。

## Current Gaps

- workbook 起動時の auto-start はコードコメント切り替えで、operator 設定になっていない。
- order は stub だが、その事実が Log 以外では見えにくい。
- VBA の client error と backend の health が別々で、operator には原因の切り分けが難しい。
- dashboard は WebSocket 接続状態は見えるが、server が生きていて tick だけ止まっているのか、server 自体が不健康なのかが分かりにくい。

## Design

### 0. Shared Health State Owner

backend 側に paper-ops 用の単一 state object を置き、health endpoint の正本にする。owner は FastAPI app と同じ process 内の module-level state で、更新は次のイベントに限定する。

- startup: 初期値を入れる
- execution tick 正常処理: last_price_tick_at、last_price_code、last_warning を更新する
- Gemini degraded 発生: ai_status と last_warning を更新する
- reference publish / fetch 結果変化: reference_status を更新する

初期値は first tick 前提で固定する。

- mode: paper
- order_mode: stub_only
- last_price_tick_at: null
- last_price_code: null
- ai_status: ready | degraded
- reference_status: ready | degraded
- last_warning: null

startup 時点の ai_status / reference_status は環境変数の有無で即時決める。

- GOOGLE_API_KEY あり: ai_status=ready
- GOOGLE_API_KEY なし: ai_status=degraded
- JQUANTS_API_KEY あり: reference_status=ready
- JQUANTS_API_KEY なし: reference_status=degraded

キーが存在しても、初回以降の実 call が失敗した場合は degraded に落とす。成功 call が観測できた場合だけ ready へ戻す。

overall status は次式で導出し、独立に保持しない。

- ai_status=ready かつ reference_status=ready のとき healthy
- それ以外は degraded

last_warning は直近の soft warning を保持し、soft warning が無い正常 tick を処理したときだけ null に戻す。

### 1. Workbook Operational Surface

Control シートに paper-trading 運用向けの状態セルを追加する。

- A10/B10: Run Mode / paper
- A11/B11: Order Mode / stub only
- A12/B12: Auto Start / FALSE
- A13/B13: Last Tick At / -
- A14/B14: Last Action / hold
- A15/B15: Last Error / -

Workbook_Open はコード編集ではなく B12 を見て起動可否を決める。Workbook_BeforeClose は既存どおり確実に timer を止める。

更新規則:

- Last Tick At は /api/price への POST が 200 で成功したとき、その request payload の timestamp field で上書きする
- Last Action は backend response の action で毎 tick 更新する
- Last Error は StartTimer 時に - へ初期化し、その後 client error または /api/price 非 200 応答時に上書きする
- 成功 tick では Last Error を消さない

### 2. Backend Health Surface

backend に read-only health endpoint を追加する。売買判断には関与させない。

- backend path: GET /api/health
- frontend proxy path: GET /api/health
- degraded でも HTTP 200 を返す
- health route が返せない状態は process/network failure とみなし、frontend は health fetch failed として扱う

想定レスポンス:

```json
{
  "status": "healthy",
  "mode": "paper",
  "order_mode": "stub_only",
  "server_time": "2026-04-13T10:30:05",
  "last_price_tick_at": "2026-04-13T10:30:00",
  "last_price_code": "7203",
  "ai_status": "ready",
  "reference_status": "degraded",
  "last_warning": "J-Quants reference missing; execution onlyで継続"
}
```

Field Rules:

- status: healthy | degraded
- mode: 常に paper
- order_mode: 常に stub_only
- last_price_tick_at: backend が最後に正常処理した execution tick 時刻
- last_price_code: 最終 tick の code
- ai_status: ready | degraded
- reference_status: ready | degraded
- last_warning: 直近 warning_message。無ければ null

Readiness Matrix:

| Condition | status | Operator impact | UI severity |
| --- | --- | --- | --- |
| GOOGLE_API_KEY あり、Gemini safe decision 正常 | healthy | 通常運用 | neutral |
| GOOGLE_API_KEY なし、または Gemini decide が劣化 | degraded | 判断は hold 側へ寄る。paper 運用は継続可能 | warning |
| JQUANTS_API_KEY なし、または reference 取得不能 | degraded | advisory 欠落のみ。paper 運用は継続可能 | info |

ai_status=degraded は decisioning degraded を意味し、reference_status=degraded より重い。dashboard は同列表示せず、ai_status を優先して強調する。

backend process 停止は health response の status では表さない。operator が観測する外部状態は health fetch failed として扱う。

### 3. Dashboard Operator View

dashboard は次の 3 つを同時に表示する。

- connection state: waiting-first-tick / connected / reconnecting / stale
- paper-trading banner: 実発注なし、stub only
- backend health summary: server health、最終 tick、reference 準備状態、直近 warning

health は settings と同じく Next proxy 経由で取得する。frontend browser が backend へ直接 fetch しない。

StatusHeader は通信状態だけでなく、paper mode と order mode を前面表示する。tick 停止と server 不健康を別ラベルで出し分ける。

UI State Matrix:

| WebSocket state | Health state | 表示 | 解釈 |
| --- | --- | --- | --- |
| waiting-first-tick | healthy/degraded | 初回待機 | server は応答するが tick 未着 |
| connected | healthy | 接続中 | 正常 |
| connected | degraded | 接続中 + 劣化警告 | 判断または advisory の一部が劣化 |
| stale | healthy/degraded | tick 停滞 | server は生きているが feed が止まっている |
| reconnecting | healthy | 再接続中 | socket 経路のみ不安定 |
| reconnecting | health fetch failed | server 到達不可 | backend 断または network 異常 |

health polling 間隔は 10 秒とし、waiting-first-tick を server failure 扱いしない。

### 4. Error Handling Policy

operator に見せるエラーは短文化して分類する。

- client_error: VBA 側の HTTP / parse / timer error
- server_warning: reference missing / stale などの soft warning
- server_unreachable: health endpoint 取得失敗または socket reconnect 継続
- tick_stale: server は応答するが tick が一定時間来ていない
- server_error: /api/price が非 200 を返した状態

詳細 stack trace は UI に出さず、短い説明だけを出す。Log シートには原文を切り詰めて残してよい。

推奨文言:

- client_error: Excel 側送信エラー
- server_unreachable: backend 応答なし
- server_error: backend 応答エラー
- tick_stale: 価格更新が停滞
- ai_degraded: AI 判断が劣化中
- reference_degraded: 参照価格なしで継続

### 5. Non-Goals

- 実発注 wiring
- 約定照合
- 注文ライフサイクルの擬似化
- PnL 集計ロジックの全面刷新
- RiskSettings schema の変更
- settings UX の再設計
- binary workbook を source of truth にする変更

## Operator Flow

1. workbook を開く
2. Control シートで auto_start と server URL を確認する
3. RUNNING と paper / stub only を確認する
4. dashboard で connection state と backend health を確認する
5. 日中は last tick、last warning、last error を見る
6. 問題時は workbook の StopTimer かブック close で停止する

## Acceptance Criteria

- operator がコード編集なしで auto-start の有無を切り替えられる
- workbook 上で paper と stub only が常時見える
- workbook 上で last tick、last action、last error を確認できる
- backend が read-only health endpoint を返す
- health state の owner が単一 object に固定される
- health endpoint が ai degraded と reference degraded を別状態で返す
- health endpoint が backend process 停止を内部 status に持ち込まない
- health endpoint が degraded 時も HTTP 200 を返す
- backend path と frontend proxy path が共に GET /api/health で固定される
- dashboard で WebSocket stale と backend health failure を区別表示できる
- dashboard で paper-trading / stub only が明示される
- 既存の売買判断、risk guard、backtest の挙動を変えない
- existing settings contract を変えない
- workbook の Last Tick At が request timestamp を正本にして更新される
- workbook の Last Error が client error と /api/price 非 200 の両方で更新される

## Verification

- backend pytest で health endpoint と state 更新を確認する
- frontend vitest で status header と health summary 表示を確認する
- frontend vitest で healthy but waiting、healthy but stale、reconnecting and health fetch failed、ai degraded、reference degraded を確認する
- frontend build を通す
- VBA manual smoke で auto_start true/false、Last Tick At が request timestamp で更新されること、Last Action 更新、Last Error が非 200 でも保持されることを確認する
- validate.ps1 と deploy.ps1 -Check を通す
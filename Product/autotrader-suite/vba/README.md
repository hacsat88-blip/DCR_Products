# AutoTrader VBA Sources

SP-2 Excel VBA bridge の canonical text source です。

- runtime workbook: repo root の autotrader.xlsm
- source modules: `Product/autotrader-suite/vba/src/*.bas`, `Product/autotrader-suite/vba/src/*.cls`
- workbook layout guide: Product/autotrader-suite/vba/workbook-layout.md

起動順、停止順、paper smoke、live go-no-go の canonical 手順は `../RUNBOOK.md` を使います。この README は workbook 固有の仕様だけを扱います。

## Quick Start

1. `powershell -ExecutionPolicy Bypass -File ./Product/autotrader-suite/vba/new-autotrader-workbook.ps1`
2. script が VBA import warning を出した場合は Excel の `VBA プロジェクト オブジェクト モデルへのアクセスを信頼する` を有効にして再実行します。
3. `autotrader.xlsm` を開き、`Control / Market / OHLC_Data / Log` の主要 4 シートと hidden の `BrokerBridge`、および `RSS_TICK` named range を確認します。
4. `Alt+F8` で `modTimer.StartTimer` / `modTimer.StopTimer` を実行するか、必要なら button を手動で割り当てます。

- script の既定値は manual smoke 用の安全な Market seed です。
- MarketSpeed II RSS が使える環境では `-UseRssFormulas` を付けて `Market!B2:G2` を live `RssMarket(...)` formula で初期化できます。

## Manual Fallback

1. repo root に autotrader.xlsm を作成します。
2. workbook-layout.md に従って Control / Market / OHLC_Data / Log を作成します。
3. VBA editor で標準 module として以下を import します。
   - modConfig.bas
   - modOHLC.bas
   - modHTTP.bas
   - modOrder.bas
   - modTimer.bas
4. ThisWorkbook.cls の code を ThisWorkbook object module に反映します。
5. Control sheet の start/stop button を modTimer.StartTimer / modTimer.StopTimer に割り当てます。

## Notes

- response contract の正本は docs/dcr/specs/2026-04-12-autotrader-sp2-reference-advisory-design.md です。
- action / qty / reason が order decision の正本です。
- reference_status / warning_message は display と log の advisory 用です。
- binary workbook は environment-specific なので、repo では text source と workbook layout guide を管理します。
- workbook scaffold は `Product/autotrader-suite/vba/new-autotrader-workbook.ps1` でローカル生成します。
- hidden Excel COM での RSS 評価差分を避けるため、script の既定 Market seed は manual smoke 優先です。live RSS formula は `-UseRssFormulas` を指定したときだけ入ります。
- StartTimer は OHLC_Data の履歴を空にしてから開始します。
- Workbook_Open は modTimer.InitializeOperationalSurface を必ず実行し、Control!B12 が TRUE のときだけ auto-start します。
- MarketSpeed II RSS は旧 `=RSS|...` 形式と互換ではなく、`RssMarket(...)` 系へ書き換える必要があります。
- Market sheet の date/time/bid/ask は `日付` / `時刻` / `買気配` / `売気配` ではなく、`現在日付` / `現在値時刻` / `最良買気配値` / `最良売気配値` を使います。
- Market!A2 が symbol の正本です。B2:G2 の `RssMarket(...)` formula は A2 を参照し、backend へ送る code も A2 ベースで解決します。Control!B4 は Market!A2 の mirror です。
- Workbook_Open / preflight / tick 開始時に `modTimer` が `%LOCALAPPDATA%\MarketSpeed2\Bin\rss` 配下の XLL / XLAM を current session へ自動ロードします。
- symbol を変更したときも、modTimer が一度 OHLC history を破棄して次 tick から新しい symbol で再構築します。

## Operational Controls

- Control!B10/B11 の既定値は `paper` / `stub only` です。
- Control!B13 は `/api/price` が 200 を返した request timestamp を表示します。
- Control!B14 は直近の backend action を表示します。
- Control!B15 は直近 error を保持し、成功 tick で自動消去しません。
- Control!B16 は live arm switch です。`TRUE` にしても、B10=`live` かつ B11=`broker auto` でなければ RSS 注文は送信しません。
- Control!B17 は `RssOrderStatus` の確認待ち秒数です。旧 workbook の `MarketSpeed.TradeII` 値は読み込み時に既定値へ移行します。
- Control!B18:B21 は broker preflight の結果です。`modTimer.RunBrokerPreflight` で `RssCapacityList` を read-only で確認し、状態、実余力、確認時刻、メッセージを更新します。
- hidden の BrokerBridge シートは `RssOrderStatus` / `RssExecutionList` / `RssCapacityList` の読取り専用で、通常運用では表示しません。

## Live Execution

workbook 側の live 条件は `Control!B10=live`、`Control!B11=broker auto`、`Control!B16=TRUE`、`Control!B18=ready`、`Control!B19` が数値であることです。実際の切り替え順と go-no-go は `../RUNBOOK.md` を正本とします。

- いずれか 1 つでも条件を満たさない場合、`modOrder` は `BUY_STUB` / `SELL_STUB` を記録し、実注文は送りません。
- live 発注直前には `modOrder` が同じ read-only preflight を再実行し、失敗時は broker order を送らず `BUY_STUB` / `SELL_STUB` のまま停止します。
- RSS 注文が reject / timeout / cancel になった場合は `BUY_LIVE_ERROR` / `SELL_LIVE_ERROR` を Log に記録し、Control!B15 に error を残します。



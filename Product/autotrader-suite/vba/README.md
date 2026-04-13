# AutoTrader VBA Sources

SP-2 Excel VBA bridge の canonical text source です。

- runtime workbook: repo root の autotrader.xlsm
- source modules: `Product/autotrader-suite/vba/src/*.bas`, `Product/autotrader-suite/vba/src/*.cls`
- workbook layout guide: Product/autotrader-suite/vba/workbook-layout.md

## Quick Start

1. `powershell -ExecutionPolicy Bypass -File ./Product/autotrader-suite/vba/new-autotrader-workbook.ps1`
2. script が VBA import warning を出した場合は Excel の `VBA プロジェクト オブジェクト モデルへのアクセスを信頼する` を有効にして再実行します。
3. `autotrader.xlsm` を開き、`Control / Market / OHLC_Data / Log` の 4 シートと `RSS_TICK` named range を確認します。
4. `Alt+F8` で `modTimer.StartTimer` / `modTimer.StopTimer` を実行するか、必要なら button を手動で割り当てます。

- script の既定値は manual smoke 用の安全な Market seed です。
- MarketSpeed II RSS が使える環境では `-UseRssFormulas` を付けて `Market!B2:G2` を live RSS formula で初期化できます。

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
- hidden Excel COM での DDE 評価クラッシュを避けるため、script の既定 Market seed は manual smoke 優先です。live RSS formula は `-UseRssFormulas` を指定したときだけ入ります。
- StartTimer は OHLC_Data の履歴を空にしてから開始します。
- Workbook_Open は modTimer.InitializeOperationalSurface を必ず実行し、Control!B12 が TRUE のときだけ auto-start します。
- backend へ送る code は live RSS formula を優先して解決し、B2 が RSS formula でない manual smoke 時だけ Market!A2 を fallback として使います。
- RSS mode では modTimer が Market!A2 を live formula の code へ同期します。manual smoke のときだけ A2 を直接更新します。Control!B4 は Market!A2 の mirror です。
- symbol を変更したときも、modTimer が一度 OHLC history を破棄して次 tick から新しい symbol で再構築します。

## Paper Ops Controls

- Control!B10/B11 は常に `paper` / `stub only` を表示します。
- Control!B13 は `/api/price` が 200 を返した request timestamp を表示します。
- Control!B14 は直近の backend action を表示します。
- Control!B15 は直近 error を保持し、成功 tick で自動消去しません。


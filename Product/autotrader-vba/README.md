# AutoTrader VBA Sources

SP-2 Excel VBA bridge の canonical text source です。

- runtime workbook: repo root の autotrader.xlsm
- source modules: Product/autotrader-vba/src/*.bas, *.cls
- workbook layout guide: Product/autotrader-vba/workbook-layout.md

## Import Order

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
- StartTimer は OHLC_Data の履歴を空にしてから開始します。
- backend へ送る code は live RSS formula を優先して解決し、B2 が RSS formula でない manual smoke 時だけ Market!A2 を fallback として使います。
- RSS mode では modTimer が Market!A2 を live formula の code へ同期します。manual smoke のときだけ A2 を直接更新します。Control!B4 は Market!A2 の mirror です。
- symbol を変更したときも、modTimer が一度 OHLC history を破棄して次 tick から新しい symbol で再構築します。
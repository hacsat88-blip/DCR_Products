# AutoTrader Workbook Layout

runtime workbook path は repo root の autotrader.xlsm を想定します。

まず `powershell -ExecutionPolicy Bypass -File ./Product/autotrader-suite/vba/new-autotrader-workbook.ps1` を実行すると、以下の scaffold を自動生成できます。Excel の VBA project access が無効な場合は workbook 保存までは成功し、VBA import だけ warning になります。script の既定値は manual smoke seed で、MarketSpeed II RSS を使う環境では `-UseRssFormulas` を付けて live formula を入れます。

## Sheets

1. Control
2. Market
3. OHLC_Data
4. Log

## Control Sheet

| Cell | Value |
| --- | --- |
| A1 | Server URL |
| B1 | `http://127.0.0.1:8000` |
| A2 | Poll Interval (sec) |
| B2 | 5 |
| A3 | Status |
| B3 | STOPPED |
| A4 | Market Symbol |
| B4 | =Market!A2 |
| A5 | Reference Status |
| B5 | missing |
| A6 | Reference As Of |
| B6 | - |
| A7 | Warning |
| B7 | |
| A8 | News Halt |
| B8 | FALSE |
| A9 | News Note |
| B9 | |
| A10 | Run Mode |
| B10 | paper |
| A11 | Order Mode |
| B11 | stub only |
| A12 | Auto Start |
| B12 | FALSE |
| A13 | Last Tick At |
| B13 | - |
| A14 | Last Action |
| B14 | hold |
| A15 | Last Error |
| B15 | - |

## Market Sheet

| Cell | Value |
| --- | --- |
| A1 | Code |
| B1 | Price |
| C1 | Volume |
| D1 | Date |
| E1 | Time |
| F1 | Bid |
| G1 | Ask |
| A2 | 7203 (auto-synced mirror; manual smoke fallback) |
| B2 | =RSS\|'7203.T'!'現在値' |
| C2 | =RSS\|'7203.T'!'出来高' |
| D2 | =RSS\|'7203.T'!'日付' |
| E2 | =RSS\|'7203.T'!'時刻' |
| F2 | =RSS\|'7203.T'!'買気配' |
| G2 | =RSS\|'7203.T'!'売気配' |

Excel に入力するときは Markdown table の escape backslash を外して使います。

```text
B2: =RSS|'7203.T'!'現在値'
C2: =RSS|'7203.T'!'出来高'
D2: =RSS|'7203.T'!'日付'
E2: =RSS|'7203.T'!'時刻'
F2: =RSS|'7203.T'!'買気配'
G2: =RSS|'7203.T'!'売気配'
```

- backend へ送る code は B2 の live RSS formula から解決し、B2 が RSS formula でない manual smoke 時だけ A2 を fallback として使います。
- RSS mode では modTimer が A2 を live formula の code へ同期します。symbol を切り替えるときは B2:E2 の RSS formula を更新します。
- `F2/G2` が空欄でも送信は継続し、その場合 backend の spread filter は適用されません。
- `Control!B8/B9` は手動のニュース停止トグルです。`B8=TRUE` の間は backend が新規建てを停止します。
- `Control!B12` は workbook open 時の auto-start トグルです。`TRUE` のときだけ `Workbook_Open` で timer を開始します。
- `Control!B13` は `/api/price` が 200 で返った tick の request timestamp を表示します。
- `Control!B14` は直近の backend action を表示します。
- `Control!B15` は直近 client/server error を保持し、成功 tick では消えません。

## OHLC_Data Sheet

| Column | Header |
| --- | --- |
| A | bar_time |
| B | open |
| C | high |
| D | low |
| E | close |
| F | volume |

## Log Sheet

| Column | Header |
| --- | --- |
| A | timestamp |
| B | code |
| C | price |
| D | action |
| E | qty |
| F | reason |
| G | reference_status |
| H | reference_price |
| I | reference_as_of |
| J | reference_gap_pct |
| K | warning_code |
| L | warning_message |

## Named Range

- RSS_TICK = Market!A2:G2


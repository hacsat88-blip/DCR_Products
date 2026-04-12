# AutoTrader Workbook Layout

runtime workbook path は repo root の autotrader.xlsm を想定します。

## Sheets

1. Control
2. Market
3. OHLC_Data
4. Log

## Control Sheet

| Cell | Value |
| --- | --- |
| A1 | Server URL |
| B1 | http://127.0.0.1:8000 |
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

## Market Sheet

| Cell | Value |
| --- | --- |
| A1 | Code |
| B1 | Price |
| C1 | Volume |
| D1 | Date |
| E1 | Time |
| A2 | 7203 (auto-synced mirror; manual smoke fallback) |
| B2 | =RSS\|'7203.T'!'現在値' |
| C2 | =RSS\|'7203.T'!'出来高' |
| D2 | =RSS\|'7203.T'!'日付' |
| E2 | =RSS\|'7203.T'!'時刻' |

Excel に入力するときは Markdown table の escape backslash を外して使います。

```text
B2: =RSS|'7203.T'!'現在値'
C2: =RSS|'7203.T'!'出来高'
D2: =RSS|'7203.T'!'日付'
E2: =RSS|'7203.T'!'時刻'
```

- backend へ送る code は B2 の live RSS formula から解決し、B2 が RSS formula でない manual smoke 時だけ A2 を fallback として使います。
- RSS mode では modTimer が A2 を live formula の code へ同期します。symbol を切り替えるときは B2:E2 の RSS formula を更新します。

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

- RSS_TICK = Market!A2:E2
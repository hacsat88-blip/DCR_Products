# AutoTrader Workbook Layout

runtime workbook path は repo root の autotrader.xlsm を想定します。

まず `powershell -ExecutionPolicy Bypass -File ./Product/autotrader-suite/vba/new-autotrader-workbook.ps1` を実行すると、以下の scaffold を自動生成できます。Excel の VBA project access が無効な場合は workbook 保存までは成功し、VBA import だけ warning になります。script の既定値は manual smoke seed で、MarketSpeed II RSS を使う環境では `-UseRssFormulas` を付けて live `RssMarket(...)` formula を入れます。

## Sheets

1. Control
2. Market
3. OHLC_Data
4. Log
5. BrokerBridge (hidden)

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
| A16 | Live Armed |
| B16 | FALSE |
| A17 | Order Confirm Timeout (sec) |
| B17 | 5 |
| A18 | Broker Preflight |
| B18 | not checked |
| A19 | Broker Cash Actual |
| B19 | - |
| A20 | Broker Checked At |
| B20 | - |
| A21 | Broker Message |
| B21 | - |

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
| A2 | 7203 (primary symbol cell; manual smoke fallback) |
| B2 | =RssMarket(A2&".T","現在値") |
| C2 | =RssMarket(A2&".T","出来高") |
| D2 | =RssMarket(A2&".T","現在日付") |
| E2 | =RssMarket(A2&".T","現在値時刻") |
| F2 | =RssMarket(A2&".T","最良買気配値") |
| G2 | =RssMarket(A2&".T","最良売気配値") |

Excel に入力するときは Markdown table の escape backslash を外して使います。

```text
B2: =RssMarket(A2&".T","現在値")
C2: =RssMarket(A2&".T","出来高")
D2: =RssMarket(A2&".T","現在日付")
E2: =RssMarket(A2&".T","現在値時刻")
F2: =RssMarket(A2&".T","最良買気配値")
G2: =RssMarket(A2&".T","最良売気配値")
```

- MarketSpeed II RSS は旧 `=RSS|...` 形式と互換ではありません。価格 feed は `RssMarket(...)` 関数を使います。
- `日付` / `時刻` / `買気配` / `売気配` のような短い名称ではなく、公式テーブルどおり `現在日付` / `現在値時刻` / `最良買気配値` / `最良売気配値` を使います。
- backend へ送る code は `Market!A2` を正本として扱い、`RssMarket(...)` の直書き式を使う場合だけ式内の銘柄コードを補助的に解決します。
- symbol を切り替えるときは `Market!A2` を更新します。B2:G2 は A2 を参照して追従します。
- `F2/G2` が空欄でも送信は継続し、その場合 backend の spread filter は適用されません。
- `Control!B8/B9` は手動のニュース停止トグルです。`B8=TRUE` の間は backend が新規建てを停止します。
- `Control!B12` は workbook open 時の auto-start トグルです。`TRUE` のときだけ `Workbook_Open` で timer を開始します。
- `Control!B13` は `/api/price` が 200 で返った tick の request timestamp を表示します。
- `Control!B14` は直近の backend action を表示します。
- `Control!B15` は直近 client/server error を保持し、成功 tick では消えません。
- 実発注を有効にするには `Control!B10=live`、`Control!B11=broker auto`、`Control!B16=TRUE` をすべて満たす必要があります。
- `Control!B17` は `RssOrderStatus` の確認待ち秒数です。
- `Control!B18:B21` は `modTimer.RunBrokerPreflight` の結果で、`RssCapacityList` を使った read-only の broker 接続確認を保持します。workbook open 時にも 1 回自動更新されます。
- workbook open 時に `modTimer` が `%LOCALAPPDATA%\MarketSpeed2\Bin\rss` 配下の XLL / XLAM を自動ロードします。手動登録済みでなくても、標準配置なら current session で利用可能になります。
- live 発注直前には `modOrder` が同じ preflight を再実行し、失敗した場合は broker order を送らず stub に留めます。
- hidden の `BrokerBridge` は `RssOrderStatus` / `RssExecutionList` / `RssCapacityList` の一時読取り領域です。

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



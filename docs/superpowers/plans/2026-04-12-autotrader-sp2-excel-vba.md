# AutoTrader SP-2: Excel VBA ブリッジ層 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Excel VBA が MarketSpeed II RSS から株価をリアルタイム取得し、5秒ごとに FastAPI サーバーへ POST して売買判断と reference advisory を受け取り、stub log を通して order wiring 境界まで固める。

**Architecture:** MarketSpeed II RSS の DDE フォーミュラを Market シートに配置してリアルタイム価格を取得 → VBA タイマーが5秒ごとに起動 → OHLC バーを分足で蓄積 → `MSXML2.ServerXMLHTTP.6.0` で `POST /api/price` → レスポンスの `action` を正本として stub order log or skip を行う → 同時に `reference_status` / `reference_price` / `warning_message` を表示・ログへ残す。code は live RSS formula を優先して解決し、A2 は manual smoke fallback に留める。JSON は外部ライブラリなしで文字列連結で組み立て、レスポンスは `InStr`/`Mid` で必要フィールドだけ抜く。

**Tech Stack:** Excel VBA (Excel 2016+), MSXML2.ServerXMLHTTP.6.0, MarketSpeed II RSS, Windows API タイマー

---

## API 仕様（POST /api/price）

**URL:** `http://127.0.0.1:8000/api/price`  
**Method:** POST  
**Content-Type:** application/json

**リクエスト本体:**
```json
{
  "code": "7203",
  "price": 2500.0,
  "volume": 100000,
  "ohlc": [
    {"o": 2480.0, "h": 2510.0, "l": 2475.0, "c": 2500.0, "v": 50000}
  ],
  "timestamp": "2026-04-12T10:00:05"
}
```

**レスポンス:**
```json
{
    "action": "buy",
    "qty": 100,
    "order_type": "成行",
    "reason": "RSI過売り",
    "reference_status": "ok",
    "reference_price": 251.5,
    "reference_volume": 12000,
    "reference_source": "jquants_light",
    "reference_as_of": "2026-04-11",
    "reference_age_days": 1,
    "reference_gap_pct": -0.596,
    "warning_code": null,
    "warning_message": null
}
```

## Reference advisory policy

- `action` / `qty` / `reason` が発注の正本。VBA は reference advisory を使って最終 action を上書きしない。
- `reference_status = missing` または `stale` は soft warning であり、発注停止条件ではない。
- `warning_message` は Control シート表示と Log シート記録に使う。
- Control シートには `reference_status` / `reference_as_of` / `warning_message` を表示する。
- Log シートには `code` / `price` / `action` / `qty` / `reason` / `reference_status` / `reference_price` / `reference_as_of` / `reference_gap_pct` / `warning_code` / `warning_message` を残す。
- 詳細仕様は [docs/dcr/specs/2026-04-12-autotrader-sp2-reference-advisory-design.md](docs/dcr/specs/2026-04-12-autotrader-sp2-reference-advisory-design.md) を正本とする。

---

## Market シートの RSS フォーミュラ配置

repo root の `autotrader.xlsm` は `Product/autotrader-suite/vba/new-autotrader-workbook.ps1` で scaffold を生成する。script の既定値は manual smoke 用の安全な Market seed で、MarketSpeed II RSS を使う場合だけ `-UseRssFormulas` を付けて live RSS formula を入れる。

MarketSpeed II RSS のインストール後、以下のセルにフォーミュラを設定する（ユーザーが手動で行うか、generator の `-UseRssFormulas` を使う）。

| セル | 内容 | 役割 |
|------|------|------|
| `A2` | 銘柄コード（文字列）例: `"7203"` | 手入力 |
| `B2` | `=RssMarket(A2&".T","現在値")` | 現在値 |
| `C2` | `=RssMarket(A2&".T","出来高")` | 累積出来高 |
| `D2` | `=RssMarket(A2&".T","現在日付")` | RSS 現在日付 |
| `E2` | `=RssMarket(A2&".T","現在値時刻")` | RSS 現在値時刻 |
| `F2` | `=RssMarket(A2&".T","最良買気配値")` | 最良買気配値 |
| `G2` | `=RssMarket(A2&".T","最良売気配値")` | 最良売気配値 |

VBA は `A2:G2` を名前付き範囲 `RSS_TICK` として参照する。

backend へ送る code は `Market!A2` を正本として扱い、B2:G2 の `RssMarket(...)` formula は A2 を参照する。symbol を切り替えるときは A2 を更新する。

Excel に入力するときは Markdown table 上の escape backslash を外し、実際には次の式を使う。

```text
B2: =RssMarket(A2&".T","現在値")
C2: =RssMarket(A2&".T","出来高")
D2: =RssMarket(A2&".T","現在日付")
E2: =RssMarket(A2&".T","現在値時刻")
F2: =RssMarket(A2&".T","最良買気配値")
G2: =RssMarket(A2&".T","最良売気配値")
```

初代マーケットスピード RSS の `=RSS|...` 形式は MarketSpeed II RSS と互換ではないため、そのままでは `#REF!` になります。

---

## ファイルマップ

| ファイル/モジュール | 役割 |
|--------------------|------|
| `autotrader.xlsm` | repo root にローカル生成する runtime workbook |
| `Product/autotrader-suite/vba/new-autotrader-workbook.ps1` | workbook scaffold generator |
| `Product/autotrader-suite/vba/` | Git 管理する VBA text source と workbook scaffold guide |
| Sheet: `Control` | URL設定・状態表示・reference warning・paper ops 表示 |
| Sheet: `Market` | RSS フォーミュラでリアルタイム価格・板情報表示 |
| Sheet: `OHLC_Data` | 分足 OHLC バー蓄積（最新20本） |
| Sheet: `Log` | API送受信ログと reference advisory 記録（最新200行） |
| VBA: `modConfig` | 定数定義（URL、タイムアウト、バー数） |
| VBA: `modOHLC` | 分足バー管理・OHLC更新・シート書き込み |
| VBA: `modHTTP` | POST /api/price・JSON組み立て・レスポンス解析 |
| VBA: `modOrder` | 売買判断に応じた発注処理（RSS 経由） |
| VBA: `modTimer` | Application.OnTime タイマー制御・メインループ |

---

## Task 1: ワークブック scaffold の生成

**Files:**
- Create locally: `autotrader.xlsm`（`Product/autotrader-suite/vba/new-autotrader-workbook.ps1` で生成。binary workbook は Git の正本にしない）

- [ ] **Step 1: generator で autotrader.xlsm を作成する**

repo root で以下を実行する。

```powershell
powershell -ExecutionPolicy Bypass -File ./Product/autotrader-suite/vba/new-autotrader-workbook.ps1
```

- [ ] **Step 2: VBA import warning が出た場合だけ trust access を有効化して再実行する**

Excel の「VBA プロジェクト オブジェクト モデルへのアクセスを信頼する」が無効だと、workbook 保存は成功し、VBA import だけ warning になる。warning が出た場合だけ Excel 設定を有効化して script を再実行する。

- [ ] **Step 3: 生成された workbook scaffold を確認する**

`autotrader.xlsm` を開き、以下を確認する:

| シート名 | 用途 |
|---------|------|
| `Control` | 接続設定 |
| `Market` | RSS価格データ |
| `OHLC_Data` | OHLCバー蓄積 |
| `Log` | API通信ログ |

- `RSS_TICK` named range が `Market!A2:G2` を指すこと
- `Control!B10/B11/B12/B13/B14/B15` が `paper / stub only / FALSE / - / hold / -` で初期化されていること

- [ ] **Step 4: 必要なら button を手動で割り当てる**

既定では `Alt+F8` から `modTimer.StartTimer` / `modTimer.StopTimer` を実行できる。UI ボタンが必要な場合だけ `Control` シートに Start / Stop button を配置して `modTimer.StartTimer` / `modTimer.StopTimer` を割り当てる。

- [ ] **Step 5: live RSS が必要なときだけ Market formula を入れる**

MarketSpeed II RSS を使う環境では、以下のどちらかで `Market!B2:G2` を live RSS formula にする。

1. `powershell -ExecutionPolicy Bypass -File ./Product/autotrader-suite/vba/new-autotrader-workbook.ps1 -Force -UseRssFormulas`
2. `workbook-layout.md` に従って `B2:G2` を手動更新する

script の既定 seed は manual smoke 用なので、`-UseRssFormulas` を付けない限り `B2=2500`、`C2=100000`、`D2=TODAY()`、`E2=NOW()`、`F2/G2=空欄` のままになる。

- [ ] **Step 6: Commit**

```bash
git add Product/autotrader-suite/vba/new-autotrader-workbook.ps1 Product/autotrader-suite/vba/README.md Product/autotrader-suite/vba/workbook-layout.md
git commit -m "feat(sp2): automate Excel workbook scaffold generation"
```

---

## Task 2: modConfig — 定数定義モジュール

**Files:**
- Create: VBA モジュール `modConfig`

- [ ] **Step 1: modConfig を挿入する**

VBA エディタで「挿入」→「標準モジュール」→ プロパティウィンドウで名前を `modConfig` に変更する。

- [ ] **Step 2: 以下のコードを入力する**

```vba
Option Explicit

' ─── サーバー接続設定 ───────────────────────────
Public Const API_BASE_URL  As String = "http://127.0.0.1:8000"
Public Const API_PRICE_URL As String = API_BASE_URL & "/api/price"
Public Const HTTP_TIMEOUT  As Long = 15000   ' ミリ秒

' ─── タイマー設定 ──────────────────────────────
Public Const POLL_INTERVAL As Double = 5     ' 秒

' ─── OHLC 設定 ────────────────────────────────
Public Const MAX_OHLC_BARS As Long = 20      ' 保持する最大バー数
Public Const API_OHLC_BARS As Long = 5       ' API に送るバー数

' ─── シート名 ─────────────────────────────────
Public Const SH_CONTROL   As String = "Control"
Public Const SH_MARKET    As String = "Market"
Public Const SH_OHLC      As String = "OHLC_Data"
Public Const SH_LOG       As String = "Log"

' ─── Market シートのセル位置 ──────────────────
' A2: 銘柄コード, B2: 現在値, C2: 出来高, D2: 日付, E2: 時刻
Public Const MARKET_ROW    As Long = 2
Public Const COL_CODE      As Long = 1    ' A
Public Const COL_PRICE     As Long = 2    ' B
Public Const COL_VOLUME    As Long = 3    ' C
Public Const COL_DATE      As Long = 4    ' D
Public Const COL_TIME      As Long = 5    ' E

Public Const LOG_MAX_ROWS  As Long = 200

Public Function RuntimeApiBaseUrl() As String
    Dim configured As String
    configured = Trim$(CStr(ThisWorkbook.Sheets(SH_CONTROL).Cells(1, 2).Value))
    If configured = "" Then
        RuntimeApiBaseUrl = API_BASE_URL
    Else
        RuntimeApiBaseUrl = configured
    End If
End Function

Public Function RuntimeApiPriceUrl() As String
    RuntimeApiPriceUrl = RuntimeApiBaseUrl() & "/api/price"
End Function

Public Function RuntimePollIntervalSeconds() As Long
    Dim configured As Variant
    configured = ThisWorkbook.Sheets(SH_CONTROL).Cells(2, 2).Value
    If IsNumeric(configured) Then
        RuntimePollIntervalSeconds = CLng(configured)
        If RuntimePollIntervalSeconds <= 0 Then RuntimePollIntervalSeconds = POLL_INTERVAL
    Else
        RuntimePollIntervalSeconds = POLL_INTERVAL
    End If
End Function
```

- [ ] **Step 3: 動作確認（手動）**

VBA エディタの「イミディエイト」ウィンドウ（`Ctrl+G`）に以下を入力して Enter:

```
? modConfig.API_PRICE_URL
```

期待出力: `http://127.0.0.1:8000/api/price`

- [ ] **Step 4: Commit**

```bash
git add Product/autotrader-suite/vba/src/modConfig.bas
git commit -m "feat(sp2): add modConfig with URL and sheet constants"
```

---

## Task 3: modOHLC — 分足OHLCバー管理

**Files:**
- Create: VBA モジュール `modOHLC`

**役割:** Market シートの現在値を読み取り、分足バーを OHLC_Data シートに蓄積する。  
バーの区切りは RSS 時刻の「分」が変わったタイミング。

- [ ] **Step 1: modOHLC を挿入する**

VBA エディタで「挿入」→「標準モジュール」→ 名前を `modOHLC` に変更する。

- [ ] **Step 2: 以下のコードを入力する**

```vba
Option Explicit

' 現在構築中のバー情報（モジュール変数）
Private m_BarMinute As Integer   ' 現在バーの「分」(-1 = 未初期化)
Private m_Open      As Double
Private m_High      As Double
Private m_Low       As Double
Private m_Close     As Double
Private m_BarVol    As Long      ' バー内累積出来高（前回取得からの差分）
Private m_PrevVol   As Long      ' 前回取得時の累積出来高
Private m_BarTime   As Date      ' 現在バーの開始時刻（秒は常に00）

' ────────────────────────────────────────────
' Public: 現在の RSS ティックでバーを更新する。
' 呼び出し元のタイマーから毎 POLL_INTERVAL 秒呼ぶ。
' ────────────────────────────────────────────
Public Sub UpdateBar(price As Double, totalVolume As Long, tickTime As Date)
    Dim barTime As Date
    barTime = DateSerial(Year(tickTime), Month(tickTime), Day(tickTime)) + _
              TimeSerial(Hour(tickTime), Minute(tickTime), 0)

    Dim volDelta As Long
    If m_BarMinute = -1 Then
        volDelta = 0
        m_PrevVol = totalVolume
    Else
        volDelta = totalVolume - m_PrevVol
        If volDelta < 0 Then volDelta = 0    ' 日またぎリセット対策
        m_PrevVol = totalVolume
    End If

    If m_BarMinute = -1 Or barTime <> m_BarTime Then
        ' ── 新しいバー開始 ──
        If m_BarMinute <> -1 Then
            ' 完成したバーをシートに保存
            Call SaveBar
        End If
        m_BarMinute = Minute(tickTime)
        m_BarTime = barTime
        m_Open = price
        m_High = price
        m_Low = price
        m_Close = price
        m_BarVol = volDelta
    Else
        ' ── バー更新 ──
        If price > m_High Then m_High = price
        If price < m_Low  Then m_Low = price
        m_Close = price
        m_BarVol = m_BarVol + volDelta
    End If
End Sub

' ────────────────────────────────────────────
' Public: 送信用 OHLC JSON 配列文字列を返す。
' 現在進行中のバーも末尾に追加する。
' ────────────────────────────────────────────
Public Function BuildOHLCJson(currentPrice As Double) As String
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets(SH_OHLC)

    Dim lastRow As Long
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row

    ' シートから最新 API_OHLC_BARS - 1 本を取得（末尾=新しい順なので逆順で読む）
    Dim bars() As String
    Dim count As Long
    count = 0
    Dim maxFromSheet As Long
    maxFromSheet = API_OHLC_BARS - 1   ' 最後の1本は現在バー

    Dim jsonArr As String
    jsonArr = ""

    ' 古い順（行番号昇順）で末尾から maxFromSheet 行を取る
    Dim startRow As Long
    startRow = lastRow - maxFromSheet + 1
    If startRow < 2 Then startRow = 2   ' ヘッダー行(1)はスキップ

    Dim r As Long
    For r = startRow To lastRow
        Dim o As Double, h As Double, l As Double, c As Double, v As Long
        o = CDbl(ws.Cells(r, 2).Value)
        h = CDbl(ws.Cells(r, 3).Value)
        l = CDbl(ws.Cells(r, 4).Value)
        c = CDbl(ws.Cells(r, 5).Value)
        v = CLng(ws.Cells(r, 6).Value)
        If jsonArr <> "" Then jsonArr = jsonArr & ","
        jsonArr = jsonArr & OHLCBarJson(o, h, l, c, v)
        count = count + 1
    Next r

    ' 現在進行中のバーを追加
    Dim curOpen As Double, curHigh As Double, curLow As Double
    If m_BarMinute = -1 Then
        ' バー未初期化時はダミーで現在値のみのバーを使う
        curOpen = currentPrice
        curHigh = currentPrice
        curLow = currentPrice
    Else
        curOpen = m_Open
        curHigh = m_High
        curLow = m_Low
    End If
    If jsonArr <> "" Then jsonArr = jsonArr & ","
    jsonArr = jsonArr & OHLCBarJson(curOpen, curHigh, curLow, IIf(m_BarMinute = -1, currentPrice, m_Close), m_BarVol)

    BuildOHLCJson = "[" & jsonArr & "]"
End Function

' ────────────────────────────────────────────
' Public: モジュール変数をリセット（新銘柄切替時など）
' ────────────────────────────────────────────
Public Sub ResetBar()
    m_BarMinute = -1
    m_BarTime = 0
    m_Open = 0
    m_High = 0
    m_Low = 0
    m_Close = 0
    m_BarVol = 0
    m_PrevVol = 0
End Sub

Public Sub ResetForCodeChange()
    ResetBar

    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets(SH_OHLC)

    Dim lastRow As Long
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
    If lastRow >= 2 Then
        ws.Rows("2:" & CStr(lastRow)).ClearContents
    End If
End Sub

' ────────────────────────────────────────────
' Private: 完成バーを OHLC_Data シートに書き込む
' ────────────────────────────────────────────
Private Sub SaveBar()
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets(SH_OHLC)

    Dim nextRow As Long
    nextRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row + 1

    ws.Cells(nextRow, 1).Value = Format(m_BarTime, "yyyy-mm-dd hh:mm:00")
    ws.Cells(nextRow, 2).Value = m_Open
    ws.Cells(nextRow, 3).Value = m_High
    ws.Cells(nextRow, 4).Value = m_Low
    ws.Cells(nextRow, 5).Value = m_Close
    ws.Cells(nextRow, 6).Value = m_BarVol

    ' 古いバーを削除（MAX_OHLC_BARS 超過分）
    Dim lastRow As Long
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
    Do While lastRow - 1 > MAX_OHLC_BARS   ' row 1 はヘッダー
        ws.Rows(2).Delete
        lastRow = lastRow - 1
    Loop
End Sub

' ────────────────────────────────────────────
' Private: OHLCBar JSON 文字列を生成する
' ────────────────────────────────────────────
Private Function OHLCBarJson(o As Double, h As Double, _
                              l As Double, c As Double, v As Long) As String
    OHLCBarJson = "{""o"":" & Format(o, "0.0") & _
                  ",""h"":" & Format(h, "0.0") & _
                  ",""l"":" & Format(l, "0.0") & _
                  ",""c"":" & Format(c, "0.0") & _
                  ",""v"":" & v & "}"
End Function
```

- [ ] **Step 3: 手動動作確認**

イミディエイトウィンドウで以下を順に実行する:

```vba
modOHLC.ResetBar
modOHLC.UpdateBar 2500, 100000, Now
? modOHLC.BuildOHLCJson(2505)
```

期待出力（例）: `[{"o":2500.0,"h":2505.0,"l":2500.0,"c":2505.0,"v":0}]`

- [ ] **Step 4: Commit**

```bash
git add Product/autotrader-suite/vba/src/modOHLC.bas
git commit -m "feat(sp2): add modOHLC for minute-bar OHLC management"
```

---

## Task 4: modHTTP — POST /api/price と応答解析

**Files:**
- Create: VBA モジュール `modHTTP`

**役割:** `PriceRequest` JSON を組み立てて POST し、`TradeDecision` + reference advisory レスポンスを解析する。

`PostPrice` は `action` / `qty` / `reason` に加え、`reference_status` / `reference_price` / `reference_as_of` / `reference_gap_pct` / `warning_code` / `warning_message` を ByRef で返す。warning は表示とログにのみ使い、発注可否は action を正本とする。

- [ ] **Step 1: modHTTP を挿入する**

VBA エディタで「挿入」→「標準モジュール」→ 名前を `modHTTP`。

- [ ] **Step 2: 以下のコードを入力する**

```vba
Option Explicit

' ────────────────────────────────────────────
' Public: POST /api/price を送信し、TradeDecision を返す。
'
' 戻り値の Long は action コード:
'   1 = buy, -1 = sell, 0 = hold
' qty / reason / reference advisory は参照引数で返す。
' ────────────────────────────────────────────
Public Function PostPrice(code As String, _
                          price As Double, _
                          volume As Long, _
                          ohlcJson As String, _
                          tickTime As Date, _
                          ByRef qty As Long, _
                          ByRef reason As String, _
                          ByRef referenceStatus As String, _
                          ByRef referencePrice As Variant, _
                          ByRef referenceAsOf As String, _
                          ByRef referenceGapPct As Variant, _
                          ByRef warningCode As String, _
                          ByRef warningMessage As String) As Long
    PostPrice = 0   ' デフォルト hold
    qty = 0
    reason = ""
    referenceStatus = "missing"
    referencePrice = Empty
    referenceAsOf = ""
    referenceGapPct = Empty
    warningCode = ""
    warningMessage = ""

    Dim body As String
    body = BuildRequestJson(code, price, volume, ohlcJson, tickTime)

    Dim http As Object
    Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    http.Open "POST", RuntimeApiPriceUrl(), False
    http.setRequestHeader "Content-Type", "application/json"
    http.setRequestHeader "Accept", "application/json"
    http.setTimeouts HTTP_TIMEOUT, HTTP_TIMEOUT, HTTP_TIMEOUT, HTTP_TIMEOUT
    On Error GoTo HttpError

    http.send body
    On Error GoTo 0

    If http.Status <> 200 Then
        reason = "HTTP " & http.Status & ": " & Left(http.responseText, 60)
        PostPrice = 0
        Exit Function
    End If

    Dim respText As String
    respText = http.responseText

    Dim action As String
    action = ExtractJsonString(respText, "action")
    qty = ParseJsonLong(ExtractJsonNumber(respText, "qty"))
    reason = ExtractJsonString(respText, "reason")
    referenceStatus = ExtractJsonString(respText, "reference_status")
    referencePrice = ExtractJsonOptionalNumber(respText, "reference_price")
    referenceAsOf = ExtractJsonString(respText, "reference_as_of")
    referenceGapPct = ExtractJsonOptionalNumber(respText, "reference_gap_pct")
    warningCode = ExtractJsonString(respText, "warning_code")
    warningMessage = ExtractJsonString(respText, "warning_message")

    Select Case LCase(action)
        Case "buy":  PostPrice = 1
        Case "sell": PostPrice = -1
        Case Else:   PostPrice = 0
    End Select
    Exit Function

HttpError:
    reason = "HTTP error: " & Err.Description
    PostPrice = 0
End Function

' ────────────────────────────────────────────
' Private: PriceRequest JSON 文字列を組み立てる
' ────────────────────────────────────────────
Private Function BuildRequestJson(code As String, _
                                   price As Double, _
                                   volume As Long, _
                                   ohlcJson As String, _
                                   tickTime As Date) As String
    ' ISO 8601 形式: "2026-04-12T10:00:05"
    Dim ts As String
    ts = Format$(tickTime, "yyyy-mm-dd") & "T" & Format$(tickTime, "hh:nn:ss")

    BuildRequestJson = "{" & _
        """code"":""" & code & """," & _
        """price"":" & JsonNumber(price) & "," & _
        """volume"":" & volume & "," & _
        """ohlc"":" & ohlcJson & "," & _
        """timestamp"":""" & ts & """" & _
        "}"
End Function

' ────────────────────────────────────────────
' Private: JSON 文字列から指定キーの文字列値を取り出す
' 例: ExtractJsonString(`{"action":"buy"}`, "action") → "buy"
' ────────────────────────────────────────────
Private Function ExtractJsonString(json As String, key As String) As String
    Dim needle As String
    needle = """" & key & """:"""
    Dim pos As Long
    pos = InStr(json, needle)
    If pos = 0 Then
        ExtractJsonString = ""
        Exit Function
    End If
    pos = pos + Len(needle)
    Dim cursor As Long
    Dim escaped As Boolean
    Dim currentChar As String
    Dim result As String
    For cursor = pos To Len(json)
        currentChar = Mid(json, cursor, 1)
        If escaped Then
            Select Case currentChar
                Case """", "\", "/"
                    result = result & currentChar
                Case "n"
                    result = result & vbLf
                Case "r"
                    result = result & vbCr
                Case "t"
                    result = result & vbTab
                Case Else
                    result = result & currentChar
            End Select
            escaped = False
        ElseIf currentChar = "\" Then
            escaped = True
        ElseIf currentChar = """" Then
            ExtractJsonString = result
            Exit Function
        Else
            result = result & currentChar
        End If
    Next cursor
    ExtractJsonString = ""
End Function

' ────────────────────────────────────────────
' Private: JSON 文字列から指定キーの数値を取り出す
' 例: ExtractJsonNumber(`{"qty":100}`, "qty") → "100"
' ────────────────────────────────────────────
Private Function ExtractJsonNumber(json As String, key As String) As String
    Dim needle As String
    needle = """" & key & """:" 
    Dim pos As Long
    pos = InStr(json, needle)
    If pos = 0 Then
        ExtractJsonNumber = "0"
        Exit Function
    End If
    pos = pos + Len(needle)
    ' 数値の終端は , } のいずれか手前まで
    Dim endPos As Long
    Dim i As Long
    For i = pos To Len(json)
        Dim ch As String
        ch = Mid(json, i, 1)
        If ch = "," Or ch = "}" Then
            endPos = i
            Exit For
        End If
    Next i
    If endPos = 0 Then endPos = Len(json) + 1
    ExtractJsonNumber = Trim(Mid(json, pos, endPos - pos))
End Function

' ────────────────────────────────────────────
' Private: JSON 文字列から指定キーの nullable 数値を取り出す
' null または未検出なら Empty を返す
' ────────────────────────────────────────────
Private Function ExtractJsonOptionalNumber(json As String, key As String) As Variant
    Dim rawValue As String
    rawValue = ExtractJsonNumber(json, key)
    If LCase$(rawValue) = "null" Or rawValue = "" Then
        ExtractJsonOptionalNumber = Empty
        Exit Function
    End If
    ExtractJsonOptionalNumber = Val(rawValue)
End Function

Private Function ParseJsonLong(rawValue As String) As Long
    If rawValue = "" Or LCase$(rawValue) = "null" Then
        ParseJsonLong = 0
        Exit Function
    End If
    ParseJsonLong = CLng(Val(rawValue))
End Function

Private Function JsonNumber(value As Double) As String
    JsonNumber = Replace$(Format$(Round(value, 3), "0.###"), ",", ".")
End Function
```

- [ ] **Step 3: 手動テスト（FastAPI サーバーを起動した状態で実行）**

FastAPI サーバーを起動しておく:

```bash
cd "C:\Users\hacsa\Desktop\サトシ開発\Product\autotrader"
uvicorn server.main:app --reload
```

VBA イミディエイトウィンドウで:

```vba
Dim qty As Long, reason As String
Dim referenceStatus As String, referenceAsOf As String, warningCode As String, warningMessage As String
Dim referencePrice As Variant, referenceGapPct As Variant
Dim action As Long
action = modHTTP.PostPrice("7203", 2500, 100000, "[{""o"":2490.0,""h"":2510.0,""l"":2485.0,""c"":2500.0,""v"":50000}]", Now, qty, reason, referenceStatus, referencePrice, referenceAsOf, referenceGapPct, warningCode, warningMessage)
? action & " qty=" & qty & " reason=" & reason & " refStatus=" & referenceStatus & " warning=" & warningMessage
```

期待出力: `0 qty=0 reason=...`（ウォームアップ中またはhold）

- [ ] **Step 4: Commit**

```bash
git add Product/autotrader-suite/vba/src/modHTTP.bas
git commit -m "feat(sp2): add modHTTP with JSON builder and response parser"
```

---

## Task 5: modOrder — 発注処理

**Files:**
- Create: VBA モジュール `modOrder`

**役割:** `PostPrice` の戻り値が buy/sell のときに RSS 経由で発注する。  
RSS 発注は MarketSpeed II の COM オブジェクト経由。本タスクでは **ログ出力のみのスタブ** を実装し、  
RSS 発注 API の詳細は将来差し替えできるよう関数境界だけ確定する。

- [ ] **Step 1: modOrder を挿入する**

VBA エディタで「挿入」→「標準モジュール」→ 名前を `modOrder`。

- [ ] **Step 2: 以下のコードを入力する**

```vba
Option Explicit

' ────────────────────────────────────────────
' Public: 売買判断に応じて発注する。
'
' actionCode:  1 = buy, -1 = sell, 0 = hold
' code:        銘柄コード（例: "7203"）
' qty:         株数
' reason:      AI 判断理由（ログ用）
' ────────────────────────────────────────────
Public Sub ExecuteOrder(actionCode As Long, code As String, _
                         qty As Long, reason As String)
    Select Case actionCode
        Case 1
            Call PlaceBuy(code, qty, reason)
        Case -1
            Call PlaceSell(code, qty, reason)
        Case Else
            ' hold: 何もしない
    End Select
End Sub

' ────────────────────────────────────────────
' Private: 買い発注
' TODO: RSS COM オブジェクト経由の実発注コードに差し替える
' 現時点ではログ出力のみ
' ────────────────────────────────────────────
Private Sub PlaceBuy(code As String, qty As Long, reason As String)
    Call WriteOrderLog("BUY_STUB", code, qty, reason)
    ' [実装ポイント]
    ' Dim rss As Object
    ' Set rss = CreateObject("MarketSpeed.TradeII")   ' ← RSS COM クラス名は要確認
    ' rss.NewOrder code, "成行", "買", qty
End Sub

' ────────────────────────────────────────────
' Private: 売り発注
' ────────────────────────────────────────────
Private Sub PlaceSell(code As String, qty As Long, reason As String)
    Call WriteOrderLog("SELL_STUB", code, qty, reason)
    ' [実装ポイント]
    ' Dim rss As Object
    ' Set rss = CreateObject("MarketSpeed.TradeII")
    ' rss.NewOrder code, "成行", "売", qty
End Sub

' ────────────────────────────────────────────
' Private: Log シートに発注ログを追記する
' ────────────────────────────────────────────
Private Sub WriteOrderLog(orderType As String, code As String, _
                            qty As Long, reason As String)
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets(SH_LOG)

    Dim nextRow As Long
    nextRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row + 1

    ws.Cells(nextRow, 1).Value = Format(Now, "hh:mm:ss")
    ws.Cells(nextRow, 2).Value = code
    ws.Cells(nextRow, 3).Value = ""
    ws.Cells(nextRow, 4).Value = orderType
    ws.Cells(nextRow, 5).Value = qty
    ws.Cells(nextRow, 6).Value = reason
    ws.Cells(nextRow, 7).Value = ""
    ws.Cells(nextRow, 8).Value = ""
    ws.Cells(nextRow, 9).Value = ""
    ws.Cells(nextRow, 10).Value = ""
    ws.Cells(nextRow, 11).Value = ""
    ws.Cells(nextRow, 12).Value = "stub only; broker order not sent"

    ' 200行超えたら古い行を削除
    Do While nextRow - 1 > 200
        ws.Rows(2).Delete
        nextRow = nextRow - 1
    Loop
End Sub
```

- [ ] **Step 3: 手動確認**

イミディエイトウィンドウで:

```vba
modOrder.ExecuteOrder 1, "7203", 100, "テスト買い"
```

Log シートの最終行に `BUY 7203 100 テスト買い` が記録されることを確認する。

- [ ] **Step 4: Commit**

```bash
git add Product/autotrader-suite/vba/src/modOrder.bas
git commit -m "feat(sp2): add modOrder with buy/sell stubs and log output"
```

---

## Task 6: modTimer — メインループ制御

**Files:**
- Create: VBA モジュール `modTimer`

**役割:** `Application.OnTime` で `POLL_INTERVAL` 秒ごとにメインループを呼ぶ。  
Control シートの `B3` セルを `RUNNING` / `STOPPED` で更新し、paper ops operator surface (`B10:B15`) も初期化・更新する。

- [ ] **Step 1: modTimer を挿入する**

VBA エディタで「挿入」→「標準モジュール」→ 名前を `modTimer`。

- [ ] **Step 2: 以下のコードを入力する**

```vba
Option Explicit

Private m_Running  As Boolean
Private m_NextRun  As Date
Private m_LastCode As String

' ────────────────────────────────────────────
' Public: タイマーを開始する（Control シートの Start ボタンから呼ぶ）
' ────────────────────────────────────────────
Public Sub StartTimer()
    If m_Running Then Exit Sub
    m_Running = True
    modOHLC.ResetForCodeChange
    m_LastCode = ""
    InitializeOperationalSurface
    Call SetStatus("RUNNING")
    Call ScheduleNext
End Sub

' ────────────────────────────────────────────
' Public: タイマーを停止する（Stop ボタンから呼ぶ）
' ────────────────────────────────────────────
Public Sub StopTimer()
    m_Running = False
    m_LastCode = ""
    On Error Resume Next
    Application.OnTime m_NextRun, "modTimer.OnTick", , False
    On Error GoTo 0
    Call SetStatus("STOPPED")
End Sub

' ────────────────────────────────────────────
' Public: OnTime コールバック（VBA からのみ呼ばれる）
' ────────────────────────────────────────────
Public Sub OnTick()
    If Not m_Running Then Exit Sub

    On Error GoTo TickError

    ' Market シートから現在のティックデータを取得
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets(SH_MARKET)

    Dim code As String
    Dim price As Double
    Dim volume As Long
    Dim tickDate As Date
    Dim tickTime As Date

    code = ResolveMarketCode(ws)
    If code = "" Then GoTo ScheduleAndExit
    ws.Cells(MARKET_ROW, COL_CODE).Value = code

    If m_LastCode <> "" And StrComp(m_LastCode, code, vbTextCompare) <> 0 Then
        modOHLC.ResetForCodeChange
        m_LastCode = code
        GoTo ScheduleAndExit
    End If
    m_LastCode = code

    price    = CDbl(ws.Cells(MARKET_ROW, COL_PRICE).Value)
    volume   = CLng(ws.Cells(MARKET_ROW, COL_VOLUME).Value)
    tickDate = CDate(ws.Cells(MARKET_ROW, COL_DATE).Value)
    tickTime = CDate(ws.Cells(MARKET_ROW, COL_TIME).Value)

    ' 日付と時刻を合成してタイムスタンプを作る
    Dim ts As Date
    ts = DateSerial(Year(tickDate), Month(tickDate), Day(tickDate)) + _
         TimeSerial(Hour(tickTime), Minute(tickTime), Second(tickTime))

    ' 価格が 0 以下ならスキップ（RSS 未接続時など）
    If price <= 0 Then GoTo ScheduleAndExit

    ' OHLC バー更新
    modOHLC.UpdateBar price, volume, ts

    ' OHLC JSON 組み立て
    Dim ohlcJson As String
    ohlcJson = modOHLC.BuildOHLCJson(price)

    ' API 送信
    Dim qty As Long
    Dim reason As String
    Dim referenceStatus As String
    Dim referenceAsOf As String
    Dim warningCode As String
    Dim warningMessage As String
    Dim referencePrice As Variant
    Dim referenceGapPct As Variant
    Dim actionCode As Long
    Dim requestSucceeded As Boolean
    Dim responseStatus As Long
    actionCode = modHTTP.PostPrice( _
        code, price, volume, ohlcJson, ts, qty, reason, _
        referenceStatus, referencePrice, referenceAsOf, referenceGapPct, warningCode, warningMessage, _
        requestSucceeded, responseStatus)

    ' Control シートに最新 advisory を表示
    Dim ctrlWs As Worksheet
    Set ctrlWs = ThisWorkbook.Sheets(SH_CONTROL)
    ctrlWs.Cells(5, 2).Value = referenceStatus
    ctrlWs.Cells(6, 2).Value = IIf(referenceAsOf = "", "-", referenceAsOf)
    ctrlWs.Cells(7, 2).Value = warningMessage
    If requestSucceeded Then
        ctrlWs.Cells(CONTROL_ROW_LAST_TICK_AT, 2).Value = Format$(ts, "yyyy-mm-dd hh:nn:ss")
        ctrlWs.Cells(CONTROL_ROW_LAST_ACTION, 2).Value = ActionLabel(actionCode)
    Else
        ctrlWs.Cells(CONTROL_ROW_LAST_ERROR, 2).Value = Left$(reason, 120)
    End If

    ' Log シートに記録
    Dim logWs As Worksheet
    Set logWs = ThisWorkbook.Sheets(SH_LOG)
    Dim nextRow As Long
    nextRow = logWs.Cells(logWs.Rows.Count, 1).End(xlUp).Row + 1
    logWs.Cells(nextRow, 1).Value = Format(Now, "hh:mm:ss")
    logWs.Cells(nextRow, 2).Value = code
    logWs.Cells(nextRow, 3).Value = price
    Dim actionStr As String
    Select Case actionCode
        Case 1:  actionStr = "buy"
        Case -1: actionStr = "sell"
        Case Else: actionStr = "hold"
    End Select
    logWs.Cells(nextRow, 4).Value = actionStr
    logWs.Cells(nextRow, 5).Value = qty
    logWs.Cells(nextRow, 6).Value = Left(reason, 60)
    logWs.Cells(nextRow, 7).Value = referenceStatus
    If Not IsEmpty(referencePrice) Then logWs.Cells(nextRow, 8).Value = referencePrice
    logWs.Cells(nextRow, 9).Value = referenceAsOf
    If Not IsEmpty(referenceGapPct) Then logWs.Cells(nextRow, 10).Value = referenceGapPct
    logWs.Cells(nextRow, 11).Value = warningCode
    logWs.Cells(nextRow, 12).Value = warningMessage
    ' 200行超えたら古い行を削除
    Do While nextRow - 1 > 200
        logWs.Rows(2).Delete
        nextRow = nextRow - 1
    Loop

    ' 発注処理
    modOrder.ExecuteOrder actionCode, code, qty, reason

ScheduleAndExit:
    Call ScheduleNext
    Exit Sub

TickError:
    ThisWorkbook.Sheets(SH_CONTROL).Cells(CONTROL_ROW_LAST_ERROR, 2).Value = Left$("OnTick error: " & Err.Description, 120)
    Call WriteErrorLog("OnTick error: " & Err.Description)
    Call ScheduleNext
End Sub

Public Sub InitializeOperationalSurface()
    Dim ctrlWs As Worksheet
    Set ctrlWs = ThisWorkbook.Sheets(SH_CONTROL)

    ctrlWs.Cells(CONTROL_ROW_RUN_MODE, 1).Value = "Run Mode"
    ctrlWs.Cells(CONTROL_ROW_RUN_MODE, 2).Value = "paper"
    ctrlWs.Cells(CONTROL_ROW_ORDER_MODE, 1).Value = "Order Mode"
    ctrlWs.Cells(CONTROL_ROW_ORDER_MODE, 2).Value = "stub only"
    ctrlWs.Cells(CONTROL_ROW_AUTO_START, 1).Value = "Auto Start"
    If Trim$(CStr(ctrlWs.Cells(CONTROL_ROW_AUTO_START, 2).Value)) = "" Then
        ctrlWs.Cells(CONTROL_ROW_AUTO_START, 2).Value = "FALSE"
    End If
    ctrlWs.Cells(CONTROL_ROW_LAST_TICK_AT, 1).Value = "Last Tick At"
    ctrlWs.Cells(CONTROL_ROW_LAST_ACTION, 1).Value = "Last Action"
    ctrlWs.Cells(CONTROL_ROW_LAST_ERROR, 1).Value = "Last Error"
End Sub

' ────────────────────────────────────────────
' Private: 次回実行をスケジュール
' ────────────────────────────────────────────
Private Sub ScheduleNext()
    m_NextRun = DateAdd("s", RuntimePollIntervalSeconds(), Now)
    Application.OnTime m_NextRun, "modTimer.OnTick"
End Sub

' ────────────────────────────────────────────
' Private: Control シートのステータスセルを更新
' ────────────────────────────────────────────
Private Sub SetStatus(status As String)
    ThisWorkbook.Sheets(SH_CONTROL).Cells(3, 2).Value = status
End Sub

' ────────────────────────────────────────────
' Private: エラーを Log シートに書く
' ────────────────────────────────────────────
Private Sub WriteErrorLog(msg As String)
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets(SH_LOG)
    Dim nextRow As Long
    nextRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row + 1
    ws.Cells(nextRow, 1).Value = Format(Now, "hh:mm:ss")
    ws.Cells(nextRow, 2).Value = ""
    ws.Cells(nextRow, 3).Value = ""
    ws.Cells(nextRow, 4).Value = "error"
    ws.Cells(nextRow, 5).Value = 0
    ws.Cells(nextRow, 6).Value = Left(msg, 60)
    ws.Cells(nextRow, 7).Value = ""
    ws.Cells(nextRow, 8).Value = ""
    ws.Cells(nextRow, 9).Value = ""
    ws.Cells(nextRow, 10).Value = ""
    ws.Cells(nextRow, 11).Value = "client_error"
    ws.Cells(nextRow, 12).Value = Left(msg, 120)
End Sub

Private Function ResolveMarketCode(ws As Worksheet) As String
    Dim priceFormula As String
    priceFormula = CStr(ws.Cells(MARKET_ROW, COL_PRICE).Formula)

    Dim quotePos As Long
    Dim marketPos As Long
    quotePos = InStr(1, priceFormula, "'", vbBinaryCompare)
    If quotePos > 0 Then
        marketPos = InStr(quotePos + 1, priceFormula, ".T", vbTextCompare)
        If marketPos > quotePos Then
            ResolveMarketCode = Mid$(priceFormula, quotePos + 1, marketPos - quotePos - 1)
            Exit Function
        End If
    End If

    ResolveMarketCode = Trim$(CStr(ws.Cells(MARKET_ROW, COL_CODE).Value))
End Function
```

- [ ] **Step 3: Control シートのボタンは必要な場合だけ設置する**

1. `Control` シートを開く
2. 「開発」タブ（表示されていない場合は「ファイル」→「オプション」→「リボンのユーザー設定」→「開発」にチェック）
3. 「挿入」→「フォームコントロール」→「ボタン」を `D1` 付近にドラッグ
4. マクロ割り当てダイアログで `modTimer.StartTimer` を選択
5. ボタンのテキストを右クリック→編集 → `▶ START` に変更
6. 同様に `D2` に停止ボタンを追加、マクロ `modTimer.StopTimer`、テキスト `⏹ STOP`

- [ ] **Step 4: 統合スモークテスト（FastAPI サーバー起動済みの状態で実行）**

1. `uvicorn server.main:app --reload` でサーバーを起動
2. Excel で `autotrader.xlsm` を開く
3. `Control!B12=TRUE` にして auto-start を試すか、`Alt+F8` または `▶ START` で `modTimer.StartTimer` を実行
4. 5秒後に Log シートに1行追加されること、`Control!B13/B14` が更新されることを確認

期待する Log シート最終行（例）:

| timestamp | code | price | action | qty | reason | reference_status | reference_price | reference_as_of | reference_gap_pct | warning_code | warning_message |
|-----------|------|-------|--------|-----|--------|------------------|-----------------|-----------------|-------------------|--------------|-----------------|
| `10:05:30` | `7203` | `2500` | `hold` | `0` | `ウォームアップ中 ...` | `missing` |  |  |  | `reference_missing` | `reference snapshot is not available yet` |

1. `⏹ STOP` または `Alt+F8` で `modTimer.StopTimer` を実行 → Control シートの `B3` が `STOPPED` になることを確認
2. `/api/price` 非 200 または VBA error を意図的に起こしたとき、`Control!B15` が更新され、成功 tick では自動消去されないことを確認

- [ ] **Step 5: OHLC 蓄積確認**

10分間放置した後（または Market シートの時刻を手動で変更して分を進めた後）、  
`OHLC_Data` シートに行が追加されていることを確認する。

- [ ] **Step 6: Commit**

```bash
git add Product/autotrader-suite/vba/src/modTimer.bas
git commit -m "feat(sp2): add modTimer main loop with Application.OnTime"
```

---

## Task 7: ThisWorkbook — config-driven open hook

**Files:**
- Modify: `ThisWorkbook` モジュール

**役割:** ブックを開いたときに operator surface を初期化し、`Control!B12` が TRUE のときだけタイマーを自動開始する。

- [ ] **Step 1: ThisWorkbook に以下を追加する**

VBA エディタで `ThisWorkbook` をダブルクリックして開き、以下を追記する:

```vba
Private Sub Workbook_Open()
    modTimer.InitializeOperationalSurface
    If RuntimeAutoStartEnabled() Then
        modTimer.StartTimer
    End If
End Sub

Private Sub Workbook_BeforeClose(Cancel As Boolean)
    modTimer.StopTimer
End Sub
```

- [ ] **Step 2: auto-start true/false の両方を確認する**

`Control!B12=FALSE` では open 時に自動起動しないこと、`TRUE` では open 時に `StartTimer` が走ること、close 時にはどちらでも `StopTimer` が呼ばれて `B3=STOPPED` になることを確認する。

- [ ] **Step 3: Commit**

```bash
git add Product/autotrader-suite/vba/src/ThisWorkbook.cls
git commit -m "feat(sp2): make workbook open config-driven and auto-stop on close"
```

---

## Task 8: RSS フォーミュラ設定ガイド

**Files:**
- 作業: `Market` シートの手動設定（各自の MarketSpeed II 環境で実施）

MarketSpeed II RSS を実際に接続するには、`Market` シートの 2 行目に以下のフォーミュラを入力するか、generator を `-UseRssFormulas` 付きで再実行する。銘柄コードの末尾には `.T`（東証）を付ける。

| セル | フォーミュラ例（トヨタ） | 意味 |
|------|------------------------|------|
| `A2` | `7203` | 手入力（文字列） |
| `B2` | `=RssMarket(A2&".T","現在値")` | 現在値 |
| `C2` | `=RssMarket(A2&".T","出来高")` | 累積出来高 |
| `D2` | `=RssMarket(A2&".T","現在日付")` | RSS 現在日付 |
| `E2` | `=RssMarket(A2&".T","現在値時刻")` | RSS 現在値時刻 |
| `F2` | `=RssMarket(A2&".T","最良買気配値")` | 最良買気配値 |
| `G2` | `=RssMarket(A2&".T","最良売気配値")` | 最良売気配値 |

この source drop では A2 が symbol の正本であり、B2:G2 の `RssMarket(...)` formula が A2 を参照する。generator の既定値は manual smoke seed なので、RSS 環境で使うときだけ `-UseRssFormulas` を付ける。

実際に Excel に入力する式は以下のとおり（Markdown の `\` は不要）。

```text
B2: =RssMarket(A2&".T","現在値")
C2: =RssMarket(A2&".T","出来高")
D2: =RssMarket(A2&".T","現在日付")
E2: =RssMarket(A2&".T","現在値時刻")
F2: =RssMarket(A2&".T","最良買気配値")
G2: =RssMarket(A2&".T","最良売気配値")
```

> **注意:** MarketSpeed II RSS の add-in が読み込まれていない場合は `#NAME?` や `#REF!` になります。MarketSpeed II を起動したうえで XLL / XLAM を登録するか、workbook open 時の自動ロードを利用してください。  
> MarketSpeed II が起動していないと `#N/A` や空値になる場合があります。  
> VBA の `price <= 0` ガードが機能するため、`#N/A` でも OnTick はクラッシュしない  
> （`CDbl("#N/A")` は `Type mismatch` エラーになるため、  
> OnTick の `On Error GoTo TickError` がキャッチして次回まで待機する）。

- [ ] **Step 1: MarketSpeed II を起動して RSS を有効にする**

1. MarketSpeed II を起動してログイン
2. 「リアルタイムスプレッドシート」を有効化（設定→RSS設定→有効）
3. Excel が起動していることを確認

- [ ] **Step 2: Market シートに RSS フォーミュラを入力する**

上記フォーミュラを `B2:G2` に入力する。セルに数値が表示されれば RSS 接続成功。

- [ ] **Step 3: 最終統合テスト**

1. FastAPI サーバーを起動
2. Control シートの `▶ START` をクリック
3. Log シートで 5 秒ごとにリアルタイム価格が記録されることを確認
4. AI が `buy` と判断した場合、Log シートに `buy` が記録されることを確認

---

## スペックカバレッジ確認

| 要件 | 対応タスク |
|------|-----------|
| MarketSpeed II RSS から価格取得 | Task 1（シート設定）& Task 8（RSS フォーミュラ） |
| 5秒ごとに POST /api/price | Task 6（modTimer） |
| PriceRequest の全フィールド送信 | Task 4（modHTTP.BuildRequestJson） |
| 分足 OHLC バーの蓄積 | Task 3（modOHLC） |
| TradeDecision レスポンス解析 | Task 4（modHTTP.ExtractJsonString/Number） |
| buy/sell の発注処理 | Task 5（modOrder） |
| ログ出力 | Task 5 & Task 6（Log シート） |
| 価格 <= 0 のガード | Task 6（OnTick の `If price <= 0` チェック） |
| タイマー開始・停止 | Task 6（StartTimer/StopTimer） |
| ブック終了時の安全停止 | Task 7（Workbook_BeforeClose） |


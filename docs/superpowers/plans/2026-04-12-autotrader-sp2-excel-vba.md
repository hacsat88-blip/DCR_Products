# AutoTrader SP-2: Excel VBA ブリッジ層 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Excel VBA が MarketSpeed II RSS から株価をリアルタイム取得し、5秒ごとに FastAPI サーバーへ POST して売買判断を受け取り、必要に応じて発注する。

**Architecture:** MarketSpeed II RSS の DDE フォーミュラを Market シートに配置してリアルタイム価格を取得 → VBA タイマーが5秒ごとに起動 → OHLC バーを分足で蓄積 → `MSXML2.XMLHTTP60` で `POST /api/price` → レスポンスの `action` に応じて発注 or スキップ → Log シートに記録。JSON は外部ライブラリなしで文字列連結で組み立て、レスポンスは `InStr`/`Mid` で必要フィールドだけ抜く。

**Tech Stack:** Excel VBA (Excel 2016+), MSXML2.XMLHTTP60, MarketSpeed II RSS, Windows API タイマー

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
{"action": "buy", "qty": 100, "order_type": "成行", "reason": "RSI過売り"}
```

---

## Market シートの RSS フォーミュラ配置

MarketSpeed II RSS のインストール後、以下のセルにフォーミュラを設定する（ユーザーが手動で行う）。

| セル | 内容 | 役割 |
|------|------|------|
| `B2` | 銘柄コード（文字列）例: `"7203"` | 手入力 |
| `C2` | `=RSS\|'7203.T'!'現在値'` | 現在値 |
| `D2` | `=RSS\|'7203.T'!'出来高'` | 累積出来高 |
| `E2` | `=RSS\|'7203.T'!'日付'` | RSS 日付 |
| `F2` | `=RSS\|'7203.T'!'時刻'` | RSS 時刻 |

VBA は `B2:F2` を名前付き範囲 `RSS_TICK` として参照する。

---

## ファイルマップ

| ファイル/モジュール | 役割 |
|--------------------|------|
| `autotrader.xlsm` | Excelワークブック本体 |
| Sheet: `Control` | URL設定・銘柄コード・ON/OFFスイッチ |
| Sheet: `Market` | RSS フォーミュラでリアルタイム価格表示 |
| Sheet: `OHLC_Data` | 分足 OHLC バー蓄積（最新20本） |
| Sheet: `Log` | API送受信ログ（最新200行） |
| VBA: `modConfig` | 定数定義（URL、タイムアウト、バー数） |
| VBA: `modOHLC` | 分足バー管理・OHLC更新・シート書き込み |
| VBA: `modHTTP` | POST /api/price・JSON組み立て・レスポンス解析 |
| VBA: `modOrder` | 売買判断に応じた発注処理（RSS 経由） |
| VBA: `modTimer` | Application.OnTime タイマー制御・メインループ |

---

## Task 1: ワークブックとシートの初期化

**Files:**
- Create: `autotrader.xlsm`（手動で作成し、以下のマクロを `ThisWorkbook` モジュールに記述）

- [ ] **Step 1: autotrader.xlsm を作成する**

Excel を起動し、新しいブックを `autotrader.xlsm`（マクロ有効ブック）として  
`C:\Users\hacsa\Desktop\サトシ開発\` に保存する。

- [ ] **Step 2: シートを4枚作成し名前を付ける**

Excel のシートタブを右クリック →「挿入」を繰り返し、以下の4シートを作成する:

| シート名 | 用途 |
|---------|------|
| `Control` | 接続設定 |
| `Market` | RSS価格データ |
| `OHLC_Data` | OHLCバー蓄積 |
| `Log` | API通信ログ |

- [ ] **Step 3: Control シートにラベルと設定値を入力する**

`Control` シートを開き、以下のセルに値を入力する:

| セル | 値 | 意味 |
|------|----|------|
| `A1` | `Server URL` | ラベル |
| `B1` | `http://127.0.0.1:8000` | 接続先 |
| `A2` | `Poll Interval (sec)` | ラベル |
| `B2` | `5` | ポーリング間隔 |
| `A3` | `Status` | ラベル |
| `B3` | `STOPPED` | 実行状態表示 |
| `A4` | `銘柄コード` | ラベル |
| `B4` | `7203` | 例: トヨタ |

- [ ] **Step 4: Market シートに列ヘッダーを設定する**

`Market` シートを開き、以下のヘッダーを設定する:

| セル | 値 |
|------|----|
| `A1` | `銘柄コード` |
| `B1` | `現在値` |
| `C1` | `出来高` |
| `D1` | `日付` |
| `E1` | `時刻` |

2行目（`A2:E2`）は後でユーザーが RSS フォーミュラを設定する。暫定として手動入力値を置く:

| セル | 暫定値 |
|------|--------|
| `A2` | `7203` |
| `B2` | `2500` |
| `C2` | `100000` |
| `D2` | `=TODAY()` |
| `E2` | `=NOW()` |

- [ ] **Step 5: OHLC_Data シートにヘッダーを設定する**

`OHLC_Data` シートの1行目に以下を設定する:

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| `bar_time` | `open` | `high` | `low` | `close` | `volume` |

- [ ] **Step 6: Log シートにヘッダーを設定する**

`Log` シートの1行目に以下を設定する:

| A | B | C | D | E |
|---|---|---|---|---|
| `timestamp` | `price` | `action` | `qty` | `reason` |

- [ ] **Step 7: VBA エディタを開く**

`Alt + F11` で VBA エディタを開く。左のプロジェクトウィンドウに  
`VBAProject (autotrader.xlsm)` が表示されていることを確認する。

- [ ] **Step 8: Commit**

```bash
git add autotrader.xlsm
git commit -m "feat(sp2): add Excel workbook scaffold with 4 sheets"
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
Public Const HTTP_TIMEOUT  As Long = 10000   ' ミリ秒

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
```

- [ ] **Step 3: 動作確認（手動）**

VBA エディタの「イミディエイト」ウィンドウ（`Ctrl+G`）に以下を入力して Enter:

```
? modConfig.API_PRICE_URL
```

期待出力: `http://127.0.0.1:8000/api/price`

- [ ] **Step 4: Commit**

```bash
git add autotrader.xlsm
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
Private m_BarVol    As Long      ' バー内累積出来高（前回取得からの差分）
Private m_PrevVol   As Long      ' 前回取得時の累積出来高

' ────────────────────────────────────────────
' Public: 現在の RSS ティックでバーを更新する。
' 呼び出し元のタイマーから毎 POLL_INTERVAL 秒呼ぶ。
' ────────────────────────────────────────────
Public Sub UpdateBar(price As Double, totalVolume As Long, tickTime As Date)
    Dim currentMin As Integer
    currentMin = Minute(tickTime)

    Dim volDelta As Long
    volDelta = totalVolume - m_PrevVol
    If volDelta < 0 Then volDelta = 0    ' 日またぎリセット対策
    m_PrevVol = totalVolume

    If m_BarMinute = -1 Or currentMin <> m_BarMinute Then
        ' ── 新しいバー開始 ──
        If m_BarMinute <> -1 Then
            ' 完成したバーをシートに保存
            Call SaveBar(tickTime)
        End If
        m_BarMinute = currentMin
        m_Open = price
        m_High = price
        m_Low = price
        m_BarVol = volDelta
    Else
        ' ── バー更新 ──
        If price > m_High Then m_High = price
        If price < m_Low  Then m_Low = price
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
        If currentPrice > curHigh Then curHigh = currentPrice
        curLow = m_Low
        If currentPrice < curLow Then curLow = currentPrice
    End If
    If jsonArr <> "" Then jsonArr = jsonArr & ","
    jsonArr = jsonArr & OHLCBarJson(curOpen, curHigh, curLow, currentPrice, m_BarVol)

    BuildOHLCJson = "[" & jsonArr & "]"
End Function

' ────────────────────────────────────────────
' Public: モジュール変数をリセット（新銘柄切替時など）
' ────────────────────────────────────────────
Public Sub ResetBar()
    m_BarMinute = -1
    m_Open = 0
    m_High = 0
    m_Low = 0
    m_BarVol = 0
    m_PrevVol = 0
End Sub

' ────────────────────────────────────────────
' Private: 完成バーを OHLC_Data シートに書き込む
' ────────────────────────────────────────────
Private Sub SaveBar(barTime As Date)
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets(SH_OHLC)

    Dim nextRow As Long
    nextRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row + 1

    ws.Cells(nextRow, 1).Value = Format(barTime, "yyyy-mm-dd hh:mm:00")
    ws.Cells(nextRow, 2).Value = m_Open
    ws.Cells(nextRow, 3).Value = m_High
    ws.Cells(nextRow, 4).Value = m_Low
    ws.Cells(nextRow, 5).Value = m_Open   ' close = 最後の値 = 次バー開始前の値（簡略化）
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
git add autotrader.xlsm
git commit -m "feat(sp2): add modOHLC for minute-bar OHLC management"
```

---

## Task 4: modHTTP — POST /api/price と応答解析

**Files:**
- Create: VBA モジュール `modHTTP`

**役割:** `PriceRequest` JSON を組み立てて POST し、`TradeDecision` レスポンスを解析する。

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
' qty と reason は参照引数で返す。
' ────────────────────────────────────────────
Public Function PostPrice(code As String, _
                          price As Double, _
                          volume As Long, _
                          ohlcJson As String, _
                          tickTime As Date, _
                          ByRef qty As Long, _
                          ByRef reason As String) As Long
    PostPrice = 0   ' デフォルト hold
    qty = 0
    reason = ""

    Dim body As String
    body = BuildRequestJson(code, price, volume, ohlcJson, tickTime)

    Dim http As Object
    Set http = CreateObject("MSXML2.XMLHTTP60")
    http.Open "POST", API_PRICE_URL, False
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
    qty = CLng(ExtractJsonNumber(respText, "qty"))
    reason = ExtractJsonString(respText, "reason")

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
    ts = Format(tickTime, "yyyy-mm-ddThh:nn:ss")

    BuildRequestJson = "{" & _
        """code"":""" & code & """," & _
        """price"":" & Format(price, "0.0") & "," & _
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
    Dim endPos As Long
    endPos = InStr(pos, json, """")
    If endPos = 0 Then
        ExtractJsonString = ""
        Exit Function
    End If
    ExtractJsonString = Mid(json, pos, endPos - pos)
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
Dim action As Long
action = modHTTP.PostPrice("7203", 2500, 100000, "[{""o"":2490.0,""h"":2510.0,""l"":2485.0,""c"":2500.0,""v"":50000}]", Now, qty, reason)
? action & " qty=" & qty & " reason=" & reason
```

期待出力: `0 qty=0 reason=...`（ウォームアップ中またはhold）

- [ ] **Step 4: Commit**

```bash
git add autotrader.xlsm
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
    Call WriteOrderLog("BUY", code, qty, reason)
    ' [実装ポイント]
    ' Dim rss As Object
    ' Set rss = CreateObject("MarketSpeed.TradeII")   ' ← RSS COM クラス名は要確認
    ' rss.NewOrder code, "成行", "買", qty
End Sub

' ────────────────────────────────────────────
' Private: 売り発注
' ────────────────────────────────────────────
Private Sub PlaceSell(code As String, qty As Long, reason As String)
    Call WriteOrderLog("SELL", code, qty, reason)
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
    ws.Cells(nextRow, 3).Value = orderType
    ws.Cells(nextRow, 4).Value = qty
    ws.Cells(nextRow, 5).Value = reason

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
git add autotrader.xlsm
git commit -m "feat(sp2): add modOrder with buy/sell stubs and log output"
```

---

## Task 6: modTimer — メインループ制御

**Files:**
- Create: VBA モジュール `modTimer`

**役割:** `Application.OnTime` で `POLL_INTERVAL` 秒ごとにメインループを呼ぶ。  
Control シートの `B3` セルを `RUNNING` / `STOPPED` で更新する。

- [ ] **Step 1: modTimer を挿入する**

VBA エディタで「挿入」→「標準モジュール」→ 名前を `modTimer`。

- [ ] **Step 2: 以下のコードを入力する**

```vba
Option Explicit

Private m_Running  As Boolean
Private m_NextRun  As Date

' ────────────────────────────────────────────
' Public: タイマーを開始する（Control シートの Start ボタンから呼ぶ）
' ────────────────────────────────────────────
Public Sub StartTimer()
    If m_Running Then Exit Sub
    m_Running = True
    modOHLC.ResetBar
    Call SetStatus("RUNNING")
    Call ScheduleNext
End Sub

' ────────────────────────────────────────────
' Public: タイマーを停止する（Stop ボタンから呼ぶ）
' ────────────────────────────────────────────
Public Sub StopTimer()
    m_Running = False
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

    code     = CStr(ws.Cells(MARKET_ROW, COL_CODE).Value)
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
    Dim actionCode As Long
    actionCode = modHTTP.PostPrice(code, price, volume, ohlcJson, ts, qty, reason)

    ' Log シートに記録
    Dim logWs As Worksheet
    Set logWs = ThisWorkbook.Sheets(SH_LOG)
    Dim nextRow As Long
    nextRow = logWs.Cells(logWs.Rows.Count, 1).End(xlUp).Row + 1
    logWs.Cells(nextRow, 1).Value = Format(Now, "hh:mm:ss")
    logWs.Cells(nextRow, 2).Value = price
    Dim actionStr As String
    Select Case actionCode
        Case 1:  actionStr = "buy"
        Case -1: actionStr = "sell"
        Case Else: actionStr = "hold"
    End Select
    logWs.Cells(nextRow, 3).Value = actionStr
    logWs.Cells(nextRow, 4).Value = qty
    logWs.Cells(nextRow, 5).Value = Left(reason, 60)
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
    Call WriteErrorLog("OnTick error: " & Err.Description)
    Call ScheduleNext
End Sub

' ────────────────────────────────────────────
' Private: 次回実行をスケジュール
' ────────────────────────────────────────────
Private Sub ScheduleNext()
    m_NextRun = Now + TimeSerial(0, 0, POLL_INTERVAL)
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
    ws.Cells(nextRow, 2).Value = 0
    ws.Cells(nextRow, 3).Value = "ERROR"
    ws.Cells(nextRow, 4).Value = 0
    ws.Cells(nextRow, 5).Value = Left(msg, 60)
End Sub
```

- [ ] **Step 3: Control シートにボタンを設置する**

1. `Control` シートを開く
2. 「開発」タブ（表示されていない場合は「ファイル」→「オプション」→「リボンのユーザー設定」→「開発」にチェック）
3. 「挿入」→「フォームコントロール」→「ボタン」を `D1` 付近にドラッグ
4. マクロ割り当てダイアログで `modTimer.StartTimer` を選択
5. ボタンのテキストを右クリック→編集 → `▶ START` に変更
6. 同様に `D2` に停止ボタンを追加、マクロ `modTimer.StopTimer`、テキスト `⏹ STOP`

- [ ] **Step 4: 統合スモークテスト（FastAPI サーバー起動済みの状態で実行）**

1. `uvicorn server.main:app --reload` でサーバーを起動
2. Excel で `autotrader.xlsm` を開く
3. Control シートの `▶ START` ボタンをクリック
4. 5秒後に Log シートに1行追加されることを確認

期待する Log シート最終行（例）:

| timestamp | price | action | qty | reason |
|-----------|-------|--------|-----|--------|
| `10:05:30` | `2500` | `hold` | `0` | `ウォームアップ中 ...` |

5. `⏹ STOP` ボタンをクリック → Control シートの `B3` が `STOPPED` になることを確認

- [ ] **Step 5: OHLC 蓄積確認**

10分間放置した後（または Market シートの時刻を手動で変更して分を進めた後）、  
`OHLC_Data` シートに行が追加されていることを確認する。

- [ ] **Step 6: Commit**

```bash
git add autotrader.xlsm
git commit -m "feat(sp2): add modTimer main loop with Application.OnTime"
```

---

## Task 7: ThisWorkbook — 自動起動フック（任意）

**Files:**
- Modify: `ThisWorkbook` モジュール

**役割:** ブックを開いたときに自動的にタイマーを開始する（オプション）。

- [ ] **Step 1: ThisWorkbook に以下を追加する**

VBA エディタで `ThisWorkbook` をダブルクリックして開き、以下を追記する:

```vba
Private Sub Workbook_Open()
    ' ブック起動時にタイマーを自動開始したい場合はコメントを外す
    ' modTimer.StartTimer
End Sub

Private Sub Workbook_BeforeClose(Cancel As Boolean)
    modTimer.StopTimer
End Sub
```

- [ ] **Step 2: 閉じるときの動作確認**

ブックを閉じるときに `StopTimer` が呼ばれ、Control シートが `STOPPED` になることを確認する。

- [ ] **Step 3: Commit**

```bash
git add autotrader.xlsm
git commit -m "feat(sp2): add Workbook_BeforeClose to auto-stop timer"
```

---

## Task 8: RSS フォーミュラ設定ガイド

**Files:**
- 作業: `Market` シートの手動設定（各自の MarketSpeed II 環境で実施）

MarketSpeed II RSS を実際に接続するには、`Market` シートの 2 行目に以下のフォーミュラを入力する。  
銘柄コードの末尾には `.T`（東証）を付ける。

| セル | フォーミュラ例（トヨタ） | 意味 |
|------|------------------------|------|
| `A2` | `7203` | 手入力（文字列） |
| `B2` | `=RSS\|'7203.T'!'現在値'` | 現在値 |
| `C2` | `=RSS\|'7203.T'!'出来高'` | 累積出来高 |
| `D2` | `=RSS\|'7203.T'!'日付'` | RSS 日付 |
| `E2` | `=RSS\|'7203.T'!'時刻'` | RSS 時刻 |

> **注意:** MarketSpeed II が起動していないと `#N/A` が返る。  
> VBA の `price <= 0` ガードが機能するため、`#N/A` でも OnTick はクラッシュしない  
> （`CDbl("#N/A")` は `Type mismatch` エラーになるため、  
> OnTick の `On Error GoTo TickError` がキャッチして次回まで待機する）。

- [ ] **Step 1: MarketSpeed II を起動して RSS を有効にする**

1. MarketSpeed II を起動してログイン
2. 「リアルタイムスプレッドシート」を有効化（設定→RSS設定→有効）
3. Excel が起動していることを確認

- [ ] **Step 2: Market シートに RSS フォーミュラを入力する**

上記フォーミュラを `B2:E2` に入力する。セルに数値が表示されれば RSS 接続成功。

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

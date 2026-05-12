Option Explicit

' ============================================================
' AutoTrader.bas — SP-2 VBA 発注モジュール
' 楽天証券 MarketSpeed II RSS 連携 + パスワード自動入力
' ============================================================

Private Const API_BASE As String = "http://localhost:8000"
Private Const SECURE_SHEET As String = "Secure"
Private Const XOR_KEY As String = "SATOSHI_KEY"

' ── メイン処理：RSSから価格取得 → API送信 → 発注 ──────────────

Public Sub OnPriceUpdate()
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets("WatchList")

    Dim i As Long
    For i = 2 To ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
        Dim symbol As String
        symbol = ws.Cells(i, 1).Value
        If symbol = "" Then GoTo NextRow

        Dim price As Double
        Dim volume As Long
        Dim avgVol5d As Long
        Dim rsi14 As Double
        Dim prevClose As Double
        Dim availCash As Double

        price     = ws.Cells(i, 2).Value  ' 現在値
        volume    = ws.Cells(i, 3).Value  ' 出来高
        avgVol5d  = ws.Cells(i, 4).Value  ' 5日平均出来高
        rsi14     = ws.Cells(i, 5).Value  ' RSI(14)
        prevClose = ws.Cells(i, 6).Value  ' 前日終値
        availCash = ThisWorkbook.Sheets("Config").Range("B1").Value  ' 投資余力

        Dim result As String
        result = PostPrice(symbol, price, volume, avgVol5d, rsi14, prevClose, availCash)

        Dim action As String
        Dim lot As Long
        Dim simMode As Boolean
        ParseResponse result, action, lot, simMode

        If Not simMode Then
            Select Case action
            Case "buy"
                Call SubmitOrder(symbol, "buy", lot, price)
            Case "sell"
                Call SubmitOrder(symbol, "sell", lot, price)
            End Select
        End If

        ws.Cells(i, 7).Value = action   ' 判断結果をシートに記録
        ws.Cells(i, 8).Value = Now()
NextRow:
    Next i
End Sub

' ── HTTP POST /api/price ──────────────────────────────────────

Private Function PostPrice( _
    symbol As String, price As Double, volume As Long, _
    avgVol5d As Long, rsi14 As Double, prevClose As Double, _
    availCash As Double) As String

    Dim http As Object
    Set http = CreateObject("MSXML2.XMLHTTP")

    Dim body As String
    body = "{""symbol"":""" & symbol & """" & _
           ",""price"":" & price & _
           ",""volume"":" & volume & _
           ",""avg_volume_5d"":" & avgVol5d & _
           ",""rsi14"":" & rsi14 & _
           ",""prev_close"":" & prevClose & _
           ",""available_cash"":" & availCash & _
           ",""timestamp"":""" & Format(Now(), "yyyy-mm-ddThh:nn:ss") & """}"

    http.Open "POST", API_BASE & "/api/price", False
    http.setRequestHeader "Content-Type", "application/json"
    http.Send body

    PostPrice = http.responseText
End Function

' ── 発注 + パスワード自動入力 ─────────────────────────────────

Public Sub SubmitOrder(symbol As String, action As String, lot As Long, price As Double)
    ' MarketSpeed II の発注ウィンドウを開く（RSSのCOM機能を使用）
    ' 実際の実装はMarketSpeed IIのRSS COM仕様に依存
    Dim rss As Object
    On Error GoTo FallbackSendKeys

    ' RSS COM経由での発注試行
    Set rss = GetObject(, "RSS2.Application")
    ' TODO: RSS COMの発注メソッドに差し替え
    GoTo SendOrderResult

FallbackSendKeys:
    ' COM失敗時はSendKeysでパスワードウィンドウに自動入力
    AppActivate "MarketSpeed II", False
    Application.Wait Now + TimeValue("00:00:01")
    SendKeys GetPassword(), True
    Application.Wait Now + TimeValue("00:00:00.5")
    SendKeys "{ENTER}", True

SendOrderResult:
    ' 発注結果をAPIに通知
    Dim http As Object
    Set http = CreateObject("MSXML2.XMLHTTP")
    Dim body As String
    body = "{""symbol"":""" & symbol & """" & _
           ",""action"":""" & action & """" & _
           ",""executed_price"":" & price & _
           ",""qty"":" & lot & _
           ",""timestamp"":""" & Format(Now(), "yyyy-mm-ddThh:nn:ss") & """}"
    http.Open "POST", API_BASE & "/api/order-result", False
    http.setRequestHeader "Content-Type", "application/json"
    http.Send body
End Sub

' ── パスワード管理（VeryHidden シートから XOR復号） ────────────

Private Function GetPassword() As String
    Dim secureSheet As Worksheet
    On Error GoTo NotFound
    Set secureSheet = ThisWorkbook.Sheets(SECURE_SHEET)
    GetPassword = XorDecrypt(CStr(secureSheet.Range("B1").Value), XOR_KEY)
    Exit Function
NotFound:
    GetPassword = InputBox("取引パスワードを入力してください:", "パスワード確認")
End Function

Private Function XorDecrypt(encoded As String, key As String) As String
    Dim result As String
    Dim i As Integer
    For i = 1 To Len(encoded) Step 2
        Dim byteVal As Integer
        byteVal = Val("&H" & Mid(encoded, i, 2))
        Dim keyChar As Integer
        keyChar = Asc(Mid(key, ((i \ 2) Mod Len(key)) + 1, 1))
        result = result & Chr(byteVal Xor keyChar)
    Next i
    XorDecrypt = result
End Function

Public Function XorEncrypt(plain As String, key As String) As String
    Dim result As String
    Dim i As Integer
    For i = 1 To Len(plain)
        Dim byteVal As Integer
        byteVal = Asc(Mid(plain, i, 1))
        Dim keyChar As Integer
        keyChar = Asc(Mid(key, ((i - 1) Mod Len(key)) + 1, 1))
        result = result & Right("00" & Hex(byteVal Xor keyChar), 2)
    Next i
    XorEncrypt = result
End Function

' ── レスポンスパーサー ────────────────────────────────────────

Private Sub ParseResponse(json As String, action As String, lot As Long, simMode As Boolean)
    action = "hold"
    lot = 0
    simMode = True

    Dim actionMatch As String
    actionMatch = ExtractJsonString(json, "action")
    If actionMatch <> "" Then action = actionMatch

    Dim lotStr As String
    lotStr = ExtractJsonString(json, "lot")
    If lotStr <> "" Then lot = CLng(lotStr)

    Dim simStr As String
    simStr = ExtractJsonString(json, "simulation")
    simMode = (simStr = "true")
End Sub

Private Function ExtractJsonString(json As String, key As String) As String
    Dim pattern As String
    pattern = """" & key & """" & ":"
    Dim pos As Long
    pos = InStr(json, pattern)
    If pos = 0 Then
        ExtractJsonString = ""
        Exit Function
    End If
    pos = pos + Len(pattern)
    Dim endPos As Long
    If Mid(json, pos, 1) = """" Then
        pos = pos + 1
        endPos = InStr(pos, json, """")
        ExtractJsonString = Mid(json, pos, endPos - pos)
    Else
        endPos = pos
        Do While endPos <= Len(json) And Mid(json, endPos, 1) <> "," And Mid(json, endPos, 1) <> "}"
            endPos = endPos + 1
        Loop
        ExtractJsonString = Trim(Mid(json, pos, endPos - pos))
    End If
End Function

' ── パスワードセットアップ（初回のみ実行） ───────────────────

Public Sub SetupPassword()
    Dim pwd As String
    pwd = InputBox("取引パスワードを入力（初回設定）:", "セットアップ")
    If pwd = "" Then Exit Sub

    Dim encoded As String
    encoded = XorEncrypt(pwd, XOR_KEY)

    ' VeryHidden シートに保存
    Dim secureSheet As Worksheet
    On Error Resume Next
    Set secureSheet = ThisWorkbook.Sheets(SECURE_SHEET)
    On Error GoTo 0

    If secureSheet Is Nothing Then
        Set secureSheet = ThisWorkbook.Sheets.Add
        secureSheet.Name = SECURE_SHEET
    End If
    secureSheet.Visible = xlSheetVeryHidden
    secureSheet.Range("B1").Value = encoded

    MsgBox "パスワードを保存しました。", vbInformation
End Sub

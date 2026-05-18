Option Explicit

Private Const API_BASE As String = "http://localhost:8000"
Private Const SECURE_SHEET As String = "Secure"
Private Const XOR_KEY As String = "SATOSHI_KEY"
Private Const TIMER_INTERVAL As Double = 5 / 86400  ' 5秒

Private dtNextRun As Date
Private bRunning As Boolean
Private Const UPDATE_TIME_FORMAT As String = "yyyy/mm/dd hh:mm:ss"

' ブック起動時またはボタンから呼び出す
Public Sub StartAutoTrader()
    If bRunning Then
        MsgBox "自動売買はすでに起動中です", vbInformation
        Exit Sub
    End If
    bRunning = True
    Call OnPriceUpdate
    ScheduleNextRun
    MsgBox "自動売買を開始しました（5秒ごとに価格チェック）", vbInformation
End Sub

' ブック終了時またはボタンから呼び出す
Public Sub StopAutoTrader()
    If Not bRunning Then Exit Sub
    On Error Resume Next
    Application.OnTime dtNextRun, "OnPriceUpdate_Timer", , False
    On Error GoTo 0
    bRunning = False
End Sub

' Application.OnTime から定期呼び出しされるラッパー
Public Sub OnPriceUpdate_Timer()
    If Not bRunning Then Exit Sub
    On Error GoTo TimerError
    Call OnPriceUpdate
TimerDone:
    If bRunning Then ScheduleNextRun
    Exit Sub
TimerError:
    Resume TimerDone
End Sub

Private Sub ScheduleNextRun()
    dtNextRun = Now + TIMER_INTERVAL
    Application.OnTime dtNextRun, "OnPriceUpdate_Timer"
End Sub

Public Sub OnPriceUpdate()
    Dim ws As Worksheet
    On Error GoTo ExitUpdate
    Set ws = ThisWorkbook.Sheets("WatchList")

    Dim availCash As Double
    availCash = GetAvailableCash()

    Dim i As Long
    For i = 2 To ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
        ProcessWatchRow ws, i, availCash
    Next i
ExitUpdate:
End Sub

Private Sub ProcessWatchRow(ws As Worksheet, rowIndex As Long, availCash As Double)
    On Error GoTo RowError

    Dim symbol As String
    symbol = Trim(CStr(ws.Cells(rowIndex, 1).Value))
    If symbol = "" Then Exit Sub

    TouchWatchRow ws, rowIndex

    Dim price As Double, volume As Long, prevClose As Double
    price = CellDouble(ws.Cells(rowIndex, 2).Value)
    volume = CellLong(ws.Cells(rowIndex, 3).Value)
    prevClose = CellDouble(ws.Cells(rowIndex, 4).Value)

    Dim result As String
    result = PostPrice(symbol, price, volume, prevClose, availCash)

    Dim action As String, lot As Long, simMode As Boolean
    ParseResponse result, action, lot, simMode

    ' Codex Advisor は助言専用。発注はサーバーのローカルルール action のみを使う。
    ' APIエラー・タイムアウト・advisor api_error 時は ParseResponse 側で hold に倒す。
    If Not simMode Then
        If action = "buy" And lot > 0 Then Call SubmitOrder(symbol, "buy", lot, price)
        If action = "sell" Then Call SubmitOrder(symbol, "sell", lot, price)
    End If

    ws.Cells(rowIndex, 7).Value = action
    TouchWatchRow ws, rowIndex
    Exit Sub

RowError:
    On Error Resume Next
    ws.Cells(rowIndex, 7).Value = "hold"
    TouchWatchRow ws, rowIndex
End Sub

Private Sub TouchWatchRow(ws As Worksheet, rowIndex As Long)
    ws.Cells(rowIndex, 8).NumberFormat = UPDATE_TIME_FORMAT
    ws.Cells(rowIndex, 8).Value = Now()
End Sub

Private Function GetAvailableCash() As Double
    On Error GoTo UseZero
    GetAvailableCash = CellDouble(ThisWorkbook.Sheets("Config").Range("B1").Value)
    Exit Function
UseZero:
    GetAvailableCash = 0
End Function

Private Function CellDouble(value As Variant) As Double
    If IsNumeric(value) Then CellDouble = CDbl(value) Else CellDouble = 0
End Function

Private Function CellLong(value As Variant) As Long
    If IsNumeric(value) Then CellLong = CLng(value) Else CellLong = 0
End Function

Private Function PostPrice(symbol As String, price As Double, volume As Long, prevClose As Double, availCash As Double) As String
    On Error GoTo FailClosed
    Dim http As Object
    Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    Dim body As String
    body = "{""symbol"":""" & symbol & """" & _
           ",""price"":" & price & _
           ",""volume"":" & volume & _
           ",""prev_close"":" & prevClose & _
           ",""available_cash"":" & availCash & _
           ",""timestamp"":""" & Format(Now(), "yyyy-mm-ddThh:nn:ss") & """}"
    http.setTimeouts 1000, 1000, 2000, 2000
    http.Open "POST", API_BASE & "/api/price", False
    http.setRequestHeader "Content-Type", "application/json"
    http.Send body
    If http.Status < 200 Or http.Status >= 300 Then GoTo FailClosed
    PostPrice = http.responseText
    Exit Function
FailClosed:
    PostPrice = "{""action"":""hold"",""reason"":""APIエラーまたはタイムアウト"",""simulation"":true,""advisor"":{""api_error"":true}}"
End Function

Public Sub SubmitOrder(symbol As String, action As String, lot As Long, price As Double)
    If action <> "buy" And action <> "sell" Then Exit Sub
    If action = "buy" And lot <= 0 Then Exit Sub

    Dim rss As Object
    On Error GoTo FallbackSendKeys
    Set rss = GetObject(, "RSS2.Application")
    GoTo SendOrderResult
FallbackSendKeys:
    AppActivate "MarketSpeed II", False
    Application.Wait Now + TimeValue("00:00:01")
    SendKeys GetPassword(), True
    Application.Wait Now + TimeValue("00:00:00.5")
    SendKeys "{ENTER}", True
SendOrderResult:
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

Private Function GetPassword() As String
    Dim s As Worksheet
    On Error GoTo NotFound
    Set s = ThisWorkbook.Sheets(SECURE_SHEET)
    GetPassword = XorDecrypt(CStr(s.Range("B1").Value), XOR_KEY)
    Exit Function
NotFound:
    GetPassword = InputBox("Password:", "Auth")
End Function

Private Function XorDecrypt(encoded As String, key As String) As String
    Dim result As String, i As Integer
    For i = 1 To Len(encoded) Step 2
        result = result & Chr(Val("&H" & Mid(encoded, i, 2)) Xor Asc(Mid(key, ((i \ 2) Mod Len(key)) + 1, 1)))
    Next i
    XorDecrypt = result
End Function

Public Function XorEncrypt(plain As String, key As String) As String
    Dim result As String, i As Integer
    For i = 1 To Len(plain)
        result = result & Right("00" & Hex(Asc(Mid(plain, i, 1)) Xor Asc(Mid(key, ((i - 1) Mod Len(key)) + 1, 1))), 2)
    Next i
    XorEncrypt = result
End Function

Private Sub ParseResponse(json As String, action As String, lot As Long, simMode As Boolean)
    action = "hold" : lot = 0 : simMode = True
    Dim s As String
    s = ExtractJsonString(json, "action") : If s <> "" Then action = s
    s = ExtractJsonString(json, "lot") : If s <> "" And IsNumeric(s) Then lot = CLng(s)
    s = ExtractJsonString(json, "simulation") : simMode = (s = "true")
    s = ExtractJsonString(json, "api_error") : If s = "true" Then action = "hold" : simMode = True
    s = ExtractJsonString(json, "new_entries_blocked") : If action = "buy" And s = "true" Then action = "hold"
    If action <> "buy" And action <> "sell" Then action = "hold"
End Sub

Private Function ExtractJsonString(json As String, key As String) As String
    Dim pattern As String : pattern = """" & key & """" & ":"
    Dim pos As Long : pos = InStr(json, pattern)
    If pos = 0 Then Exit Function
    pos = pos + Len(pattern)
    Dim endPos As Long
    If Mid(json, pos, 1) = """" Then
        pos = pos + 1 : endPos = InStr(pos, json, """")
        ExtractJsonString = Mid(json, pos, endPos - pos)
    Else
        endPos = pos
        Do While endPos <= Len(json) And Mid(json, endPos, 1) <> "," And Mid(json, endPos, 1) <> "}"
            endPos = endPos + 1
        Loop
        ExtractJsonString = Trim(Mid(json, pos, endPos - pos))
    End If
End Function

Public Sub SetupPassword()
    Dim pwd As String
    pwd = InputBox("Password (first time setup):", "Setup")
    If pwd = "" Then Exit Sub
    Dim encoded As String
    encoded = XorEncrypt(pwd, XOR_KEY)
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
    MsgBox "Saved.", vbInformation
End Sub

Attribute VB_Name = "modTimer"
Option Explicit

Private m_Running As Boolean
Private m_NextRun As Date
Private m_LastCode As String

Public Sub StartTimer()
    If m_Running Then Exit Sub
    m_Running = True
    modOHLC.ResetForCodeChange
    m_LastCode = ""
    InitializeOperationalSurface
    SetStatus "RUNNING"
    ScheduleNext
End Sub

Public Sub StopTimer()
    m_Running = False
    m_LastCode = ""
    On Error Resume Next
    Application.OnTime m_NextRun, "modTimer.OnTick", , False
    On Error GoTo 0
    SetStatus "STOPPED"
End Sub

Public Sub OnTick()
    If Not m_Running Then Exit Sub

    On Error GoTo TickError

    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets(SH_MARKET)

    Dim code As String
    Dim price As Double
    Dim volume As Long
    Dim bid As Variant
    Dim ask As Variant
    Dim tickDate As Date
    Dim tickTime As Date
    Dim ts As Date
    Dim newsHalt As Boolean
    Dim newsNote As String

    code = ResolveMarketCode(ws)
    If code = "" Then GoTo ScheduleAndExit
    ws.Cells(MARKET_ROW, COL_CODE).Value = code

    If m_LastCode <> "" And StrComp(m_LastCode, code, vbTextCompare) <> 0 Then
        modOHLC.ResetForCodeChange
        m_LastCode = code
        GoTo ScheduleAndExit
    End If
    m_LastCode = code

    price = CDbl(ws.Cells(MARKET_ROW, COL_PRICE).Value)
    volume = CLng(ws.Cells(MARKET_ROW, COL_VOLUME).Value)
    bid = ReadOptionalMarketNumber(ws, COL_BID)
    ask = ReadOptionalMarketNumber(ws, COL_ASK)
    tickDate = CDate(ws.Cells(MARKET_ROW, COL_DATE).Value)
    tickTime = CDate(ws.Cells(MARKET_ROW, COL_TIME).Value)
    newsHalt = RuntimeNewsHaltEnabled()
    newsNote = RuntimeNewsNote()

    ts = DateSerial(Year(tickDate), Month(tickDate), Day(tickDate)) + _
        TimeSerial(Hour(tickTime), Minute(tickTime), Second(tickTime))

    If price <= 0 Then GoTo ScheduleAndExit

    modOHLC.UpdateBar price, volume, ts

    Dim ohlcJson As String
    ohlcJson = modOHLC.BuildOHLCJson(price)

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
        code, price, volume, bid, ask, newsHalt, newsNote, ohlcJson, ts, qty, reason, _
        referenceStatus, referencePrice, referenceAsOf, referenceGapPct, warningCode, warningMessage, _
        requestSucceeded, responseStatus)

    WriteControlAdvisory referenceStatus, referenceAsOf, warningMessage
    If requestSucceeded Then
        WriteOperationalSuccess ts, actionCode
    Else
        WriteOperationalError reason
    End If
    WriteTickLog code, price, actionCode, qty, reason, referenceStatus, referencePrice, referenceAsOf, referenceGapPct, warningCode, warningMessage
    modOrder.ExecuteOrder actionCode, code, qty, reason

ScheduleAndExit:
    ScheduleNext
    Exit Sub

TickError:
    WriteOperationalError "OnTick error: " & Err.Description
    WriteErrorLog "OnTick error: " & Err.Description
    ScheduleNext
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
    ctrlWs.Cells(CONTROL_ROW_LAST_TICK_AT, 2).Value = "-"
    ctrlWs.Cells(CONTROL_ROW_LAST_ACTION, 1).Value = "Last Action"
    ctrlWs.Cells(CONTROL_ROW_LAST_ACTION, 2).Value = "hold"
    ctrlWs.Cells(CONTROL_ROW_LAST_ERROR, 1).Value = "Last Error"
    ctrlWs.Cells(CONTROL_ROW_LAST_ERROR, 2).Value = "-"
End Sub

Private Sub ScheduleNext()
    If Not m_Running Then Exit Sub
    m_NextRun = DateAdd("s", RuntimePollIntervalSeconds(), Now)
    Application.OnTime m_NextRun, "modTimer.OnTick"
End Sub

Private Sub SetStatus(ByVal status As String)
    ThisWorkbook.Sheets(SH_CONTROL).Cells(CONTROL_ROW_STATUS, 2).Value = status
End Sub

Private Sub WriteOperationalSuccess(ByVal tickTimestamp As Date, ByVal actionCode As Long)
    Dim ctrlWs As Worksheet
    Set ctrlWs = ThisWorkbook.Sheets(SH_CONTROL)

    ctrlWs.Cells(CONTROL_ROW_LAST_TICK_AT, 2).Value = Format$(tickTimestamp, "yyyy-mm-dd hh:nn:ss")
    ctrlWs.Cells(CONTROL_ROW_LAST_ACTION, 2).Value = ActionLabel(actionCode)
End Sub

Private Sub WriteOperationalError(ByVal message As String)
    ThisWorkbook.Sheets(SH_CONTROL).Cells(CONTROL_ROW_LAST_ERROR, 2).Value = Left$(message, 120)
End Sub

Private Sub WriteControlAdvisory(ByVal referenceStatus As String, ByVal referenceAsOf As String, ByVal warningMessage As String)
    Dim ctrlWs As Worksheet
    Set ctrlWs = ThisWorkbook.Sheets(SH_CONTROL)

    ctrlWs.Cells(CONTROL_ROW_REFERENCE_STATUS, 2).Value = referenceStatus
    If referenceAsOf = "" Then
        ctrlWs.Cells(CONTROL_ROW_REFERENCE_AS_OF, 2).Value = "-"
    Else
        ctrlWs.Cells(CONTROL_ROW_REFERENCE_AS_OF, 2).Value = referenceAsOf
    End If
    ctrlWs.Cells(CONTROL_ROW_WARNING, 2).Value = warningMessage
End Sub

Private Sub WriteTickLog(ByVal code As String, ByVal price As Double, ByVal actionCode As Long, ByVal qty As Long, ByVal reason As String, ByVal referenceStatus As String, ByVal referencePrice As Variant, ByVal referenceAsOf As String, ByVal referenceGapPct As Variant, ByVal warningCode As String, ByVal warningMessage As String)
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets(SH_LOG)

    Dim nextRow As Long
    nextRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row + 1

    ws.Cells(nextRow, 1).Value = Format$(Now, "hh:mm:ss")
    ws.Cells(nextRow, 2).Value = code
    ws.Cells(nextRow, 3).Value = price
    ws.Cells(nextRow, 4).Value = ActionLabel(actionCode)
    ws.Cells(nextRow, 5).Value = qty
    ws.Cells(nextRow, 6).Value = Left$(reason, 120)
    ws.Cells(nextRow, 7).Value = referenceStatus
    If Not IsEmpty(referencePrice) Then ws.Cells(nextRow, 8).Value = referencePrice
    ws.Cells(nextRow, 9).Value = referenceAsOf
    If Not IsEmpty(referenceGapPct) Then ws.Cells(nextRow, 10).Value = referenceGapPct
    ws.Cells(nextRow, 11).Value = warningCode
    ws.Cells(nextRow, 12).Value = warningMessage

    TrimLogRows ws
End Sub

Private Function ActionLabel(ByVal actionCode As Long) As String
    Select Case actionCode
        Case 1
            ActionLabel = "buy"
        Case -1
            ActionLabel = "sell"
        Case Else
            ActionLabel = "hold"
    End Select
End Function

Private Sub WriteErrorLog(ByVal message As String)
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets(SH_LOG)

    Dim nextRow As Long
    nextRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row + 1

    ws.Cells(nextRow, 1).Value = Format$(Now, "hh:mm:ss")
    ws.Cells(nextRow, 2).Value = ""
    ws.Cells(nextRow, 3).Value = ""
    ws.Cells(nextRow, 4).Value = "error"
    ws.Cells(nextRow, 5).Value = 0
    ws.Cells(nextRow, 6).Value = Left$(message, 120)
    ws.Cells(nextRow, 7).Value = ""
    ws.Cells(nextRow, 8).Value = ""
    ws.Cells(nextRow, 9).Value = ""
    ws.Cells(nextRow, 10).Value = ""
    ws.Cells(nextRow, 11).Value = "client_error"
    ws.Cells(nextRow, 12).Value = Left$(message, 120)

    TrimLogRows ws
End Sub

Private Sub TrimLogRows(ByVal ws As Worksheet)
    Dim lastRow As Long
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row

    Do While lastRow - 1 > LOG_MAX_ROWS
        ws.Rows(2).Delete
        lastRow = lastRow - 1
    Loop
End Sub

Private Function ResolveMarketCode(ByVal ws As Worksheet) As String
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

Private Function ReadOptionalMarketNumber(ByVal ws As Worksheet, ByVal columnIndex As Long) As Variant
    Dim rawValue As Variant
    rawValue = ws.Cells(MARKET_ROW, columnIndex).Value
    If IsNumeric(rawValue) Then
        ReadOptionalMarketNumber = CDbl(rawValue)
    Else
        ReadOptionalMarketNumber = Empty
    End If
End Function
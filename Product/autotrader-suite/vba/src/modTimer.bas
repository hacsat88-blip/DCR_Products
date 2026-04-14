Attribute VB_Name = "modTimer"
Option Explicit

Private m_Running As Boolean
Private m_NextRun As Date
Private m_LastCode As String
Private m_TickInProgress As Boolean
Private m_RssAddinsLoaded As Boolean
Private m_MarketRssFormulasRefreshed As Boolean

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

Public Sub RunBrokerPreflight()
    Dim availableCashActual As Variant
    Dim detail As String

    EnsureRssAddinsLoaded

    If modOrder.RefreshBrokerPreflight(availableCashActual, detail) Then Exit Sub

    WriteOperationalError "Broker preflight failed: " & detail
    WriteErrorLog "Broker preflight failed: " & detail
End Sub

Public Sub RunSingleTick()
    Dim wasRunning As Boolean

    wasRunning = m_Running
    m_Running = True

    On Error GoTo Cleanup
    OnTick

Cleanup:
    On Error Resume Next
    Application.OnTime m_NextRun, "modTimer.OnTick", , False
    m_Running = wasRunning
    On Error GoTo 0

    If Err.Number <> 0 Then
        Err.Raise Err.Number, Err.Source, Err.Description
    End If
End Sub

Public Sub OnTick()
    If Not m_Running Then Exit Sub
    If m_TickInProgress Then
        ScheduleNext
        Exit Sub
    End If

    EnsureRssAddinsLoaded

    m_TickInProgress = True

    On Error GoTo TickError

    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets(SH_MARKET)

    Dim code As String
    Dim price As Double
    Dim volume As Long
    Dim bid As Variant
    Dim ask As Variant
    Dim availableCashActual As Variant
    Dim tickDate As Date
    Dim tickTime As Date
    Dim ts As Date
    Dim newsHalt As Boolean
    Dim newsNote As String
    Dim clientRunMode As String
    Dim clientOrderMode As String
    Dim clientLiveArmed As Boolean

    code = ResolveMarketCode(ws)
    If code = "" Then GoTo ScheduleAndExit
    ws.Cells(MARKET_ROW, COL_CODE).Value = code

    If m_LastCode <> "" And StrComp(m_LastCode, code, vbTextCompare) <> 0 Then
        modOHLC.ResetForCodeChange
        m_LastCode = code
        GoTo ScheduleAndExit
    End If
    m_LastCode = code

    If Not TryReadMarketDouble(ws, COL_PRICE, price) Then GoTo ScheduleAndExit
    If Not TryReadMarketLong(ws, COL_VOLUME, volume) Then volume = 0
    bid = ReadOptionalMarketNumber(ws, COL_BID)
    ask = ReadOptionalMarketNumber(ws, COL_ASK)
    If Not TryReadMarketDateTime(ws, COL_DATE, tickDate) Then tickDate = Date
    If Not TryReadMarketDateTime(ws, COL_TIME, tickTime) Then
        tickTime = TimeSerial(Hour(Now), Minute(Now), Second(Now))
    End If
    newsHalt = RuntimeNewsHaltEnabled()
    newsNote = RuntimeNewsNote()
    clientRunMode = RuntimeClientRunMode()
    clientOrderMode = RuntimeClientOrderMode()
    clientLiveArmed = RuntimeLiveArmedEnabled()
    availableCashActual = Empty
    Call modOrder.TryReadAvailableCashActual(availableCashActual)

    ts = DateSerial(Year(tickDate), Month(tickDate), Day(tickDate)) + _
        TimeSerial(Hour(tickTime), Minute(tickTime), Second(tickTime))

    If price <= 0 Then GoTo ScheduleAndExit

    modOHLC.UpdateBar price, volume, ts

    Dim ohlcJson As String
    ohlcJson = modOHLC.BuildOHLCJson(price)

    Dim qty As Long
    Dim orderType As String
    Dim reason As String
    Dim referenceStatus As String
    Dim referenceAsOf As String
    Dim warningCode As String
    Dim warningMessage As String
    Dim pendingExecutionId As String
    Dim referencePrice As Variant
    Dim referenceGapPct As Variant
    Dim actionCode As Long
    Dim requestSucceeded As Boolean
    Dim responseStatus As Long
    Dim requestedLiveBrokerMode As Boolean

    requestedLiveBrokerMode = (clientRunMode = RUN_MODE_LIVE And clientOrderMode = "broker_auto")

    actionCode = modHTTP.PostPrice( _
        code, price, volume, availableCashActual, bid, ask, newsHalt, newsNote, ohlcJson, ts, clientRunMode, clientOrderMode, clientLiveArmed, qty, orderType, reason, _
        referenceStatus, referencePrice, referenceAsOf, referenceGapPct, warningCode, warningMessage, pendingExecutionId, _
        requestSucceeded, responseStatus)

    WriteControlAdvisory referenceStatus, referenceAsOf, warningMessage
    If requestSucceeded Then
        WriteOperationalSuccess ts, actionCode
    Else
        WriteOperationalError reason
    End If
    WriteTickLog code, price, actionCode, qty, reason, referenceStatus, referencePrice, referenceAsOf, referenceGapPct, warningCode, warningMessage

    Dim orderDisposition As String
    Dim orderError As String
    Dim executionRunMode As String
    Dim executionOrderMode As String
    Dim executionLiveArmed As Boolean
    Dim executedQty As Long
    Dim executedPrice As Double
    executionRunMode = RuntimeClientRunMode()
    executionOrderMode = RuntimeClientOrderMode()
    executionLiveArmed = RuntimeLiveArmedEnabled()

    If Not modOrder.ExecuteOrder(actionCode, code, qty, orderType, price, reason, executionRunMode, executionOrderMode, executionLiveArmed, orderDisposition, orderError, executedQty, executedPrice) Then
        WriteOperationalError orderError
        WriteErrorLog orderError
    End If

    If requestedLiveBrokerMode And actionCode <> 0 And qty > 0 Then
        Dim confirmSucceeded As Boolean
        Dim confirmStatus As Long
        Dim confirmError As String
        Dim brokerOrderSucceeded As Boolean
        Dim executionErrorMessage As String
        Dim confirmationQty As Long
        Dim confirmationPrice As Double

        brokerOrderSucceeded = (orderError = "" And InStr(1, orderDisposition, "RSS order confirmed", vbTextCompare) > 0)
        If brokerOrderSucceeded Then
            executionErrorMessage = ""
            confirmationQty = qty
            confirmationPrice = price
            If executedQty > 0 Then confirmationQty = executedQty
            If executedPrice > 0 Then confirmationPrice = executedPrice
        ElseIf orderError <> "" Then
            executionErrorMessage = orderError
            confirmationQty = qty
            confirmationPrice = price
        Else
            executionErrorMessage = orderDisposition
            confirmationQty = qty
            confirmationPrice = price
        End If

        confirmSucceeded = modHTTP.PostExecutionResult( _
            code, actionCode, confirmationQty, confirmationPrice, volume, orderType, reason, ts, _
            executionRunMode, executionOrderMode, executionLiveArmed, pendingExecutionId, brokerOrderSucceeded, executionErrorMessage, _
            confirmStatus, confirmError)

        If Not confirmSucceeded Then
            WriteOperationalError "execution confirm failed: " & confirmError
            WriteErrorLog "execution confirm failed: " & confirmError
            StopTimer
        End If
    End If

ScheduleAndExit:
    m_TickInProgress = False
    ScheduleNext
    Exit Sub

TickError:
    WriteOperationalError "OnTick error: " & Err.Description
    WriteErrorLog "OnTick error: " & Err.Description
    m_TickInProgress = False
    ScheduleNext
End Sub

Public Sub InitializeOperationalSurface()
    Dim ctrlWs As Worksheet
    Set ctrlWs = ThisWorkbook.Sheets(SH_CONTROL)

    EnsureRssAddinsLoaded

    modOrder.InitializeBrokerBridge

    EnsureControlCell ctrlWs, CONTROL_ROW_RUN_MODE, "Run Mode", RUN_MODE_PAPER
    EnsureControlCell ctrlWs, CONTROL_ROW_ORDER_MODE, "Order Mode", ORDER_MODE_STUB_ONLY
    EnsureControlCell ctrlWs, CONTROL_ROW_AUTO_START, "Auto Start", "FALSE"
    ctrlWs.Cells(CONTROL_ROW_LAST_TICK_AT, 1).Value = "Last Tick At"
    ctrlWs.Cells(CONTROL_ROW_LAST_TICK_AT, 2).Value = "-"
    ctrlWs.Cells(CONTROL_ROW_LAST_ACTION, 1).Value = "Last Action"
    ctrlWs.Cells(CONTROL_ROW_LAST_ACTION, 2).Value = "hold"
    ctrlWs.Cells(CONTROL_ROW_LAST_ERROR, 1).Value = "Last Error"
    ctrlWs.Cells(CONTROL_ROW_LAST_ERROR, 2).Value = "-"
    EnsureControlCell ctrlWs, CONTROL_ROW_LIVE_ARMED, "Live Armed", "FALSE"
    ctrlWs.Cells(CONTROL_ROW_ORDER_CONFIRM_TIMEOUT, 1).Value = "Order Confirm Timeout (sec)"
    If Trim$(CStr(ctrlWs.Cells(CONTROL_ROW_ORDER_CONFIRM_TIMEOUT, 2).Value)) = "" Or StrComp(Trim$(CStr(ctrlWs.Cells(CONTROL_ROW_ORDER_CONFIRM_TIMEOUT, 2).Value)), LEGACY_BROKER_PROG_ID, vbTextCompare) = 0 Then
        ctrlWs.Cells(CONTROL_ROW_ORDER_CONFIRM_TIMEOUT, 2).Value = CStr(LIVE_ORDER_STATUS_TIMEOUT_SECONDS)
    End If
    EnsureControlCell ctrlWs, CONTROL_ROW_BROKER_PREFLIGHT, "Broker Preflight", BROKER_PREFLIGHT_STATUS_NOT_CHECKED
    EnsureControlCell ctrlWs, CONTROL_ROW_BROKER_CASH_ACTUAL, "Broker Cash Actual", "-"
    EnsureControlCell ctrlWs, CONTROL_ROW_BROKER_CHECKED_AT, "Broker Checked At", "-"
    EnsureControlCell ctrlWs, CONTROL_ROW_BROKER_MESSAGE, "Broker Message", "-"
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

    Dim rssCode As String
    rssCode = ExtractRssMarketCode(priceFormula)
    If rssCode <> "" Then
        ResolveMarketCode = NormalizeRuntimeCode(rssCode)
        Exit Function
    End If

    Dim quotePos As Long
    Dim marketPos As Long
    quotePos = InStr(1, priceFormula, "'", vbBinaryCompare)
    If quotePos > 0 Then
        marketPos = InStr(quotePos + 1, priceFormula, ".T", vbTextCompare)
        If marketPos > quotePos Then
            ResolveMarketCode = NormalizeRuntimeCode(Mid$(priceFormula, quotePos + 1, marketPos - quotePos - 1))
            Exit Function
        End If
    End If

    ResolveMarketCode = NormalizeRuntimeCode(Trim$(CStr(ws.Cells(MARKET_ROW, COL_CODE).Value)))
End Function

Private Sub EnsureRssAddinsLoaded()
    If Not m_RssAddinsLoaded Then
        Dim rssDir As String
        rssDir = Environ$("LOCALAPPDATA") & "\MarketSpeed2\Bin\rss"
        If Dir$(rssDir, vbDirectory) = "" Then Exit Sub

        Dim xllRegistered As Boolean
        xllRegistered = TryRegisterRssXll(rssDir)

        Dim xlamLoaded As Boolean
        xlamLoaded = EnsureRssVbaAddinWorkbook(rssDir)

        m_RssAddinsLoaded = (xllRegistered Or xlamLoaded)
    End If

    If m_RssAddinsLoaded Then
        RefreshMarketRssFormulasIfConfigured
        On Error Resume Next
        Application.CalculateFullRebuild
        On Error GoTo 0
    End If
End Sub

Private Sub RefreshMarketRssFormulasIfConfigured()
    If m_MarketRssFormulasRefreshed Then Exit Sub

    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets(SH_MARKET)

    If Not HasConfiguredRssMarketFormula(ws) Then Exit Sub

    ws.Cells(MARKET_ROW, COL_PRICE).Formula = "=RssMarket(A2&"".T"",""現在値"")"
    ws.Cells(MARKET_ROW, COL_VOLUME).Formula = "=RssMarket(A2&"".T"",""出来高"")"
    ws.Cells(MARKET_ROW, COL_DATE).Formula = "=RssMarket(A2&"".T"",""現在日付"")"
    ws.Cells(MARKET_ROW, COL_TIME).Formula = "=RssMarket(A2&"".T"",""現在値時刻"")"
    ws.Cells(MARKET_ROW, COL_BID).Formula = "=RssMarket(A2&"".T"",""最良買気配値"")"
    ws.Cells(MARKET_ROW, COL_ASK).Formula = "=RssMarket(A2&"".T"",""最良売気配値"")"
    m_MarketRssFormulasRefreshed = True
End Sub

Private Function HasConfiguredRssMarketFormula(ByVal ws As Worksheet) As Boolean
    Dim columnIndex As Long

    For columnIndex = COL_PRICE To COL_ASK
        If InStr(1, CStr(ws.Cells(MARKET_ROW, columnIndex).Formula), "RssMarket(", vbTextCompare) > 0 Then
            HasConfiguredRssMarketFormula = True
            Exit Function
        End If
    Next columnIndex
End Function

Private Function TryRegisterRssXll(ByVal rssDir As String) As Boolean
    On Error Resume Next

    Dim xllPath As String
    xllPath = rssDir & "\MarketSpeed2_RSS_64bit.xll"
    If Dir$(xllPath) <> "" Then
        TryRegisterRssXll = CBool(Application.RegisterXLL(xllPath))
        If TryRegisterRssXll Then
            On Error GoTo 0
            Exit Function
        End If
    End If

    xllPath = rssDir & "\MarketSpeed2_RSS_32bit.xll"
    If Dir$(xllPath) <> "" Then
        TryRegisterRssXll = CBool(Application.RegisterXLL(xllPath))
    End If

    On Error GoTo 0
End Function

Private Function EnsureRssVbaAddinWorkbook(ByVal rssDir As String) As Boolean
    On Error GoTo OpenFailed

    Dim wb As Workbook
    For Each wb In Application.Workbooks
        If StrComp(wb.Name, "MarketSpeed2_RSS_VBA.xlam", vbTextCompare) = 0 Then
            wb.IsAddin = True
            EnsureRssVbaAddinWorkbook = True
            Exit Function
        End If
    Next wb

    Dim xlamPath As String
    xlamPath = rssDir & "\MarketSpeed2_RSS_VBA.xlam"
    If Dir$(xlamPath) = "" Then Exit Function

    Set wb = Application.Workbooks.Open(xlamPath, False, True)
    wb.IsAddin = True
    EnsureRssVbaAddinWorkbook = True
    Exit Function

OpenFailed:
    EnsureRssVbaAddinWorkbook = False
End Function

Private Function ExtractRssMarketCode(ByVal priceFormula As String) As String
    Dim marketFnPos As Long
    marketFnPos = InStr(1, priceFormula, "RssMarket(", vbTextCompare)
    If marketFnPos = 0 Then Exit Function

    Dim argsStartPos As Long
    argsStartPos = marketFnPos + Len("RssMarket(")

    Dim firstArgEndPos As Long
    firstArgEndPos = InStr(argsStartPos, priceFormula, ",", vbBinaryCompare)
    If firstArgEndPos <= argsStartPos Then Exit Function

    Dim firstArgExpr As String
    firstArgExpr = Trim$(Mid$(priceFormula, argsStartPos, firstArgEndPos - argsStartPos))
    If firstArgExpr = "" Then Exit Function

    If Left$(firstArgExpr, 1) <> Chr$(34) Or Right$(firstArgExpr, 1) <> Chr$(34) Then Exit Function
    If Len(firstArgExpr) < 3 Then Exit Function

    ExtractRssMarketCode = Mid$(firstArgExpr, 2, Len(firstArgExpr) - 2)
End Function

Private Function NormalizeRuntimeCode(ByVal rawCode As String) As String
    Dim normalizedCode As String
    normalizedCode = Trim$(rawCode)

    If Left$(normalizedCode, 1) = "." Then
        NormalizeRuntimeCode = ""
        Exit Function
    End If

    Dim dotPos As Long
    dotPos = InStr(1, normalizedCode, ".", vbTextCompare)
    If dotPos > 1 Then
        normalizedCode = Left$(normalizedCode, dotPos - 1)
    End If

    NormalizeRuntimeCode = normalizedCode
End Function

Private Function ReadOptionalMarketNumber(ByVal ws As Worksheet, ByVal columnIndex As Long) As Variant
    Dim parsedValue As Double

    If TryReadMarketDouble(ws, columnIndex, parsedValue) Then
        ReadOptionalMarketNumber = parsedValue
    Else
        ReadOptionalMarketNumber = Empty
    End If
End Function

Private Function TryReadMarketDouble(ByVal ws As Worksheet, ByVal columnIndex As Long, ByRef parsedValue As Double) As Boolean
    Dim hasRawValue As Boolean
    Dim rawValue As Variant
    Dim textValue As String

    hasRawValue = TryReadMarketCellValue(ws, columnIndex, rawValue)

    On Error GoTo ParseFailed
    If hasRawValue And IsNumeric(rawValue) Then
        parsedValue = CDbl(rawValue)
        TryReadMarketDouble = True
        Exit Function
    End If

    textValue = ReadMarketCellText(ws, columnIndex)
    If textValue <> "" And IsNumeric(textValue) Then
        parsedValue = CDbl(textValue)
        TryReadMarketDouble = True
    End If
    Exit Function

ParseFailed:
    TryReadMarketDouble = False
End Function

Private Function TryReadMarketLong(ByVal ws As Worksheet, ByVal columnIndex As Long, ByRef parsedValue As Long) As Boolean
    Dim numericValue As Double

    If Not TryReadMarketDouble(ws, columnIndex, numericValue) Then Exit Function

    On Error GoTo ParseFailed
    parsedValue = CLng(numericValue)
    TryReadMarketLong = True
    Exit Function

ParseFailed:
    TryReadMarketLong = False
End Function

Private Function TryReadMarketDateTime(ByVal ws As Worksheet, ByVal columnIndex As Long, ByRef parsedValue As Date) As Boolean
    Dim hasRawValue As Boolean
    Dim rawValue As Variant
    Dim textValue As String

    hasRawValue = TryReadMarketCellValue(ws, columnIndex, rawValue)

    On Error GoTo ParseFailed
    If hasRawValue And VarType(rawValue) = vbDate Then
        parsedValue = CDate(rawValue)
        TryReadMarketDateTime = True
        Exit Function
    End If

    If hasRawValue And IsNumeric(rawValue) Then
        parsedValue = CDate(CDbl(rawValue))
        TryReadMarketDateTime = True
        Exit Function
    End If

    textValue = ReadMarketCellText(ws, columnIndex)
    If textValue <> "" And IsDate(textValue) Then
        parsedValue = CDate(textValue)
        TryReadMarketDateTime = True
    End If
    Exit Function

ParseFailed:
    TryReadMarketDateTime = False
End Function

Private Function TryReadMarketCellValue(ByVal ws As Worksheet, ByVal columnIndex As Long, ByRef rawValue As Variant) As Boolean
    On Error GoTo ReadFailed

    rawValue = ws.Cells(MARKET_ROW, columnIndex).Value2
    If IsError(rawValue) Then Exit Function

    TryReadMarketCellValue = True
    Exit Function

ReadFailed:
    rawValue = Empty
End Function

Private Function ReadMarketCellText(ByVal ws As Worksheet, ByVal columnIndex As Long) As String
    On Error Resume Next
    ReadMarketCellText = NormalizeMarketCellText(ws.Cells(MARKET_ROW, columnIndex).Text)
    On Error GoTo 0
End Function

Private Function NormalizeMarketCellText(ByVal rawText As String) As String
    Dim normalized As String

    normalized = Trim$(rawText)
    If normalized = "" Then Exit Function
    If normalized = "-" Or normalized = "--" Then Exit Function
    If Left$(normalized, 1) = "#" Then Exit Function

    normalized = Replace$(normalized, ",", "")
    normalized = Replace$(normalized, " ", "")
    normalized = Replace$(normalized, vbTab, "")

    NormalizeMarketCellText = normalized
End Function

Private Sub EnsureControlCell(ByVal ws As Worksheet, ByVal rowIndex As Long, ByVal label As String, ByVal defaultValue As String)
    ws.Cells(rowIndex, 1).Value = label
    If Trim$(CStr(ws.Cells(rowIndex, 2).Value)) = "" Then
        ws.Cells(rowIndex, 2).Value = defaultValue
    End If
End Sub
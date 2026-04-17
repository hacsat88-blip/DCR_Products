Attribute VB_Name = "modOrder"
Option Explicit

Private Const BRIDGE_ORDER_ID_RANGE As String = "A1:F64"
Private Const BRIDGE_EXECUTION_RANGE As String = "J1:X128"
Private Const BRIDGE_CAPACITY_RANGE As String = "Z1:AF8"
Private Const BRIDGE_STATUS_CELL As String = "AH1"
Private Const BRIDGE_NEXT_ORDER_LABEL_CELL As String = "AI1"
Private Const BRIDGE_NEXT_ORDER_ID_CELL As String = "AJ1"
Private Const ORDER_STATUS_NOT_FOUND As Long = -1
Private Const ORDER_STATUS_INVALID As Long = 1
Private Const ORDER_STATUS_ACTIVE As Long = 2
Private Const ORDER_STATUS_FILLED As Long = 3

Public Sub InitializeBrokerBridge()
    Dim ws As Worksheet
    Set ws = EnsureBridgeSheet()

    ws.Range(BRIDGE_NEXT_ORDER_LABEL_CELL).Value = "next_order_id"
    If Not IsNumeric(ws.Range(BRIDGE_NEXT_ORDER_ID_CELL).Value) Then
        ws.Range(BRIDGE_NEXT_ORDER_ID_CELL).Value = 1
    ElseIf CLng(ws.Range(BRIDGE_NEXT_ORDER_ID_CELL).Value) < 1 Then
        ws.Range(BRIDGE_NEXT_ORDER_ID_CELL).Value = 1
    End If

    ws.Visible = xlSheetVeryHidden
End Sub

Public Function TryReadAvailableCashActual(ByRef availableCashActual As Variant) As Boolean
    Dim detail As String
    TryReadAvailableCashActual = ReadBrokerCapacitySnapshot(availableCashActual, detail)
End Function

Public Function RefreshBrokerPreflight(ByRef availableCashActual As Variant, ByRef detail As String) As Boolean
    RefreshBrokerPreflight = ReadBrokerCapacitySnapshot(availableCashActual, detail)
    WriteBrokerPreflightState RefreshBrokerPreflight, availableCashActual, detail
End Function

Private Function ReadBrokerCapacitySnapshot(ByRef availableCashActual As Variant, ByRef detail As String) As Boolean
    availableCashActual = Empty
    detail = ""

    Dim ws As Worksheet
    Set ws = EnsureBridgeSheet()

    Dim rawValue As Variant
    ResetBridgeRange ws, BRIDGE_CAPACITY_RANGE
    ws.Range("Z1").Formula = "=RssCapacityList()"

    rawValue = ReadCapacityMatrixValue(ws, CashBuyingPowerLabel())
    If HasNumericValue(rawValue) Then
        availableCashActual = CLng(rawValue)
        detail = "RssCapacityList ok: cash buying power matrix"
        ReadBrokerCapacitySnapshot = True
        Exit Function
    End If

    rawValue = ws.Range("Z3").Value
    If HasNumericValue(rawValue) Then
        availableCashActual = CLng(rawValue)
        detail = "RssCapacityList ok: first capacity column fallback"
        ReadBrokerCapacitySnapshot = True
        Exit Function
    End If

    detail = ReadBridgeDiagnostic(ws, BRIDGE_CAPACITY_RANGE)
End Function

Public Function ExecuteOrder(ByVal actionCode As Long, ByVal code As String, ByVal qty As Long, ByVal orderType As String, ByVal requestedPrice As Double, ByVal reason As String, ByVal clientRunMode As String, ByVal clientOrderMode As String, ByVal clientLiveArmed As Boolean, ByRef disposition As String, ByRef errorMessage As String, ByRef executedQty As Long, ByRef executedPrice As Double) As Boolean
    ExecuteOrder = True
    disposition = ""
    errorMessage = ""
    executedQty = 0
    executedPrice = 0

    Select Case actionCode
        Case 1
            ExecuteOrder = PlaceOrder("BUY", code, qty, orderType, requestedPrice, "買", reason, clientRunMode, clientOrderMode, clientLiveArmed, disposition, errorMessage, executedQty, executedPrice)
        Case -1
            ExecuteOrder = PlaceOrder("SELL", code, qty, orderType, requestedPrice, "売", reason, clientRunMode, clientOrderMode, clientLiveArmed, disposition, errorMessage, executedQty, executedPrice)
        Case Else
            ' hold
    End Select
End Function

Private Function PlaceOrder(ByVal orderPrefix As String, ByVal code As String, ByVal qty As Long, ByVal orderType As String, ByVal requestedPrice As Double, ByVal sideLabel As String, ByVal reason As String, ByVal clientRunMode As String, ByVal clientOrderMode As String, ByVal clientLiveArmed As Boolean, ByRef disposition As String, ByRef errorMessage As String, ByRef executedQty As Long, ByRef executedPrice As Double) As Boolean
    If qty <= 0 Or Trim$(code) = "" Then
        PlaceOrder = True
        Exit Function
    End If

    If Not CanSendLiveOrder(clientRunMode, clientOrderMode, clientLiveArmed, disposition) Then
        WriteOrderLog orderPrefix & "_STUB", code, qty, reason, disposition
        PlaceOrder = True
        Exit Function
    End If

    If SubmitLiveOrder(code, qty, orderType, requestedPrice, sideLabel, disposition, errorMessage, executedQty, executedPrice) Then
        WriteOrderLog orderPrefix & "_LIVE", code, qty, reason, disposition
        PlaceOrder = True
        Exit Function
    End If

    WriteOrderLog orderPrefix & "_LIVE_ERROR", code, qty, reason, errorMessage
    PlaceOrder = False
End Function

Private Function CanSendLiveOrder(ByVal clientRunMode As String, ByVal clientOrderMode As String, ByVal clientLiveArmed As Boolean, ByRef disposition As String) As Boolean
    If clientRunMode <> RUN_MODE_LIVE Then
        disposition = "paper mode; broker order not sent"
        Exit Function
    End If

    If clientOrderMode <> "broker_auto" Then
        disposition = "order mode is stub only; broker order not sent"
        Exit Function
    End If

    If Not clientLiveArmed Then
        disposition = "live mode not armed; broker order not sent"
        Exit Function
    End If

    Dim availableCashActual As Variant
    Dim brokerDetail As String
    If Not RefreshBrokerPreflight(availableCashActual, brokerDetail) Then
        disposition = "broker preflight failed; " & Left$(brokerDetail, 120)
        Exit Function
    End If

    CanSendLiveOrder = True
End Function

Private Sub WriteBrokerPreflightState(ByVal isReady As Boolean, ByVal availableCashActual As Variant, ByVal detail As String)
    Dim ctrlWs As Worksheet
    Set ctrlWs = ThisWorkbook.Sheets(SH_CONTROL)

    If isReady Then
        ctrlWs.Cells(CONTROL_ROW_BROKER_PREFLIGHT, 2).Value = BROKER_PREFLIGHT_STATUS_READY
    Else
        ctrlWs.Cells(CONTROL_ROW_BROKER_PREFLIGHT, 2).Value = BROKER_PREFLIGHT_STATUS_DEGRADED
    End If

    If IsNumeric(availableCashActual) Then
        ctrlWs.Cells(CONTROL_ROW_BROKER_CASH_ACTUAL, 2).Value = CLng(availableCashActual)
    Else
        ctrlWs.Cells(CONTROL_ROW_BROKER_CASH_ACTUAL, 2).Value = "-"
    End If

    ctrlWs.Cells(CONTROL_ROW_BROKER_CHECKED_AT, 2).Value = Format$(Now, "yyyy-mm-dd hh:nn:ss")

    If Trim$(detail) = "" Then
        If isReady Then
            detail = "RssCapacityList ok"
        Else
            detail = "RssCapacityList read failed"
        End If
    End If
    ctrlWs.Cells(CONTROL_ROW_BROKER_MESSAGE, 2).Value = Left$(detail, 120)
End Sub

Private Function ReadBridgeDiagnostic(ByVal ws As Worksheet, ByVal rangeAddress As String) As String
    Dim cell As Range
    Dim cellText As String

    For Each cell In ws.Range(rangeAddress).Cells
        cellText = Trim$(CStr(cell.Text))
        If cellText <> "" Then
            If Left$(cellText, 1) <> "=" And Not IsNumeric(cell.Value) Then
                ReadBridgeDiagnostic = Left$(cellText, 120)
                Exit Function
            End If
        End If
    Next cell

    ReadBridgeDiagnostic = "MarketSpeed II RSS login or broker readiness could not be confirmed"
End Function

Private Function ReadCapacityMatrixValue(ByVal ws As Worksheet, ByVal capacityLabel As String) As Variant
    Dim rawValue As Variant

    SafeCalculateBridge ws
    WaitMilliseconds 2000
    SafeCalculateBridge ws

    rawValue = ReadCapacityMatrixValueOnce(ws, capacityLabel)
    If HasNumericValue(rawValue) Then
        ReadCapacityMatrixValue = CLng(rawValue)
    Else
        ReadCapacityMatrixValue = Empty
    End If
End Function

Private Function ReadCapacityMatrixValueOnce(ByVal ws As Worksheet, ByVal capacityLabel As String) As Variant
    Dim bridgeRange As Range
    Dim headerRow As Long
    Dim valueRow As Long
    Dim columnIndex As Long
    Dim normalizedTarget As String
    Dim currentLabel As String
    Dim rawValue As Variant

    Set bridgeRange = ws.Range(BRIDGE_CAPACITY_RANGE)
    headerRow = bridgeRange.Row + 1
    valueRow = bridgeRange.Row + 2
    normalizedTarget = NormalizeCapacityLabel(capacityLabel)

    For columnIndex = bridgeRange.Column To bridgeRange.Column + bridgeRange.Columns.Count - 1
        currentLabel = NormalizeCapacityLabel(CStr(ws.Cells(headerRow, columnIndex).Value))
        If currentLabel = normalizedTarget Then
            rawValue = ws.Cells(valueRow, columnIndex).Value
            ReadCapacityMatrixValueOnce = rawValue
            Exit Function
        End If
    Next columnIndex

    ReadCapacityMatrixValueOnce = Empty
End Function

Private Function HasNumericValue(ByVal rawValue As Variant) As Boolean
    If IsError(rawValue) Then Exit Function
    If IsEmpty(rawValue) Then Exit Function

    If VarType(rawValue) = vbString Then
        If Trim$(CStr(rawValue)) = "" Then Exit Function
    End If

    HasNumericValue = IsNumeric(rawValue)
End Function

Private Function NormalizeCapacityLabel(ByVal rawLabel As String) As String
    Dim normalized As String

    normalized = Trim$(rawLabel)
    normalized = Replace$(normalized, " ", "")
    normalized = Replace$(normalized, vbTab, "")

    NormalizeCapacityLabel = normalized
End Function

Private Function CashBuyingPowerLabel() As String
    CashBuyingPowerLabel = _
        ChrW(&H73FE) & _
        ChrW(&H7269) & _
        ChrW(&H8CB7) & _
        ChrW(&H4ED8) & _
        ChrW(&H53EF) & _
        ChrW(&H80FD) & _
        ChrW(&H984D)
End Function

Private Function SubmitLiveOrder(ByVal code As String, ByVal qty As Long, ByVal orderType As String, ByVal requestedPrice As Double, ByVal sideLabel As String, ByRef disposition As String, ByRef errorMessage As String, ByRef executedQty As Long, ByRef executedPrice As Double) As Boolean
    Dim normalizedOrderType As String
    Dim orderId As Long
    Dim submissionResult As String
    Dim sideValue As Long
    Dim submittedAt As Date

    normalizedOrderType = Trim$(orderType)
    If normalizedOrderType = "" Then normalizedOrderType = DEFAULT_ORDER_TYPE
    sideValue = OrderSideCode(sideLabel)
    orderId = NextOrderId()
    submittedAt = Now

    On Error GoTo SubmitError
    submissionResult = CStr(Application.Run( _
        "RssStockOrder_V", _
        orderId, _
        NormalizeStockCode(code), _
        sideValue, _
        DEFAULT_STOCK_ORDER_KIND, _
        DEFAULT_SOR_MODE, _
        qty, _
        DEFAULT_ORDER_PRICE_MODE_MARKET, _
        Empty, _
        DEFAULT_ORDER_EXEC_CONDITION, _
        Empty, _
        DEFAULT_ACCOUNT_TYPE, _
        Empty, _
        Empty, _
        Empty, _
        Empty, _
        Empty, _
        Empty, _
        Empty, _
        Empty))
    SubmitLiveOrder = True

    If Not IsAcceptedSubmissionStatus(submissionResult) Then
        SubmitLiveOrder = False
        errorMessage = "RSS order rejected: " & Left$(submissionResult, 120)
        disposition = Left$(submissionResult, 120)
        Exit Function
    End If

    disposition = "RSS order accepted: " & Left$(submissionResult, 120) & " / order_id=" & CStr(orderId)
    If Not WaitForConfirmedOrder(orderId, code, sideValue, submittedAt, qty, requestedPrice, executedQty, executedPrice, disposition, errorMessage) Then
        SubmitLiveOrder = False
        Exit Function
    End If

    Exit Function

SubmitError:
    errorMessage = "RSS order failed: " & Err.Description
End Function

Private Function WaitForConfirmedOrder(ByVal orderId As Long, ByVal code As String, ByVal sideValue As Long, ByVal submittedAt As Date, ByVal expectedQty As Long, ByVal requestedPrice As Double, ByRef executedQty As Long, ByRef executedPrice As Double, ByRef disposition As String, ByRef errorMessage As String) As Boolean
    Dim deadline As Date
    Dim orderStatus As Long
    Dim orderNumber As Long
    Dim orderResult As String

    deadline = DateAdd("s", RuntimeOrderConfirmTimeoutSeconds(), Now)

    Do
        orderStatus = ReadOrderStatus(orderId)
        Select Case orderStatus
            Case ORDER_STATUS_FILLED
                If TryResolveExecutionFromList(code, sideValue, submittedAt, expectedQty, executedQty, executedPrice) Then
                    disposition = "RSS order confirmed / order_id=" & CStr(orderId) & " / qty=" & CStr(executedQty) & " / price=" & Format$(executedPrice, "0.###")
                Else
                    executedQty = expectedQty
                    executedPrice = requestedPrice
                    disposition = "RSS order confirmed / order_id=" & CStr(orderId) & " / execution list pending; fallback price used"
                End If
                WaitForConfirmedOrder = True
                Exit Function
            Case ORDER_STATUS_INVALID
                If TryReadOrderIdRecord(orderId, orderNumber, orderResult) Then
                    errorMessage = "RSS order invalid: " & Left$(orderResult, 120)
                Else
                    errorMessage = "RSS order invalid"
                End If
                Exit Function
            Case ORDER_STATUS_ACTIVE, ORDER_STATUS_NOT_FOUND
                ' continue polling
            Case Else
                errorMessage = "Unexpected RSS order status: " & CStr(orderStatus)
                Exit Function
        End Select

        WaitMilliseconds LIVE_ORDER_STATUS_POLL_INTERVAL_MS
    Loop While Now < deadline

    If TryCancelLiveOrder(orderId, disposition) Then
        errorMessage = "RSS order confirmation timed out; cancel requested"
    Else
        errorMessage = "RSS order confirmation timed out"
    End If
End Function

Private Function TryCancelLiveOrder(ByVal orderId As Long, ByRef disposition As String) As Boolean
    Dim orderNumber As Long
    Dim orderResult As String
    Dim cancelResult As String

    If Not TryReadOrderIdRecord(orderId, orderNumber, orderResult) Then
        Exit Function
    End If

    On Error GoTo CancelError
    cancelResult = CStr(Application.Run("RssCancelOrder_V", NextOrderId(), orderNumber))
    disposition = Left$("cancel requested: " & cancelResult, 120)
    TryCancelLiveOrder = True
    Exit Function

CancelError:
    disposition = Left$("cancel failed: " & Err.Description, 120)
End Function

Private Function TryReadOrderIdRecord(ByVal orderId As Long, ByRef orderNumber As Long, ByRef orderResult As String) As Boolean
    Dim ws As Worksheet
    Dim lastRow As Long
    Dim rowIndex As Long
    Dim rowOrderId As Variant

    Set ws = EnsureBridgeSheet()
    ResetBridgeRange ws, BRIDGE_ORDER_ID_RANGE
    ws.Range("A1").Formula = "=RssOrderIDList()"
    SafeCalculateBridge ws

    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
    For rowIndex = 3 To lastRow
        rowOrderId = ws.Cells(rowIndex, 1).Value
        If IsNumeric(rowOrderId) Then
            If CLng(rowOrderId) = orderId Then
                If IsNumeric(ws.Cells(rowIndex, 5).Value) Then
                    orderNumber = CLng(ws.Cells(rowIndex, 5).Value)
                End If
                orderResult = Trim$(CStr(ws.Cells(rowIndex, 6).Value))
                TryReadOrderIdRecord = (orderNumber > 0)
                Exit Function
            End If
        End If
    Next rowIndex
End Function

Private Function ReadOrderStatus(ByVal orderId As Long) As Long
    Dim ws As Worksheet
    Dim rawValue As Variant

    Set ws = EnsureBridgeSheet()
    ws.Range(BRIDGE_STATUS_CELL).Formula = "=RssOrderStatus(" & CStr(orderId) & ")"
    SafeCalculateBridge ws

    rawValue = ws.Range(BRIDGE_STATUS_CELL).Value
    If IsNumeric(rawValue) Then
        ReadOrderStatus = CLng(rawValue)
    Else
        ReadOrderStatus = ORDER_STATUS_NOT_FOUND
    End If
End Function

Private Function TryResolveExecutionFromList(ByVal code As String, ByVal sideValue As Long, ByVal submittedAt As Date, ByVal expectedQty As Long, ByRef executedQty As Long, ByRef executedPrice As Double) As Boolean
    Dim ws As Worksheet
    Dim lastRow As Long
    Dim rowIndex As Long
    Dim normalizedCode As String
    Dim totalQty As Long
    Dim weightedPriceTotal As Double
    Dim rowQty As Long
    Dim rowPrice As Double
    Dim rowCode As String
    Dim rowTimestamp As Variant
    Dim thresholdTime As Date

    normalizedCode = NormalizeExecutionCode(code)
    thresholdTime = DateAdd("s", -5, submittedAt)
    Set ws = EnsureBridgeSheet()
    ResetBridgeRange ws, BRIDGE_EXECUTION_RANGE
    ws.Range("J1").Formula = "=RssExecutionList(,0,""" & normalizedCode & """,""A"",0," & CStr(sideValue) & ")"
    SafeCalculateBridge ws

    lastRow = ws.Cells(ws.Rows.Count, 10).End(xlUp).Row
    For rowIndex = lastRow To 3 Step -1
        rowCode = Trim$(CStr(ws.Cells(rowIndex, 12).Value))
        If StrComp(rowCode, normalizedCode, vbTextCompare) = 0 Then
            rowTimestamp = ws.Cells(rowIndex, 10).Value
            If IsNumeric(ws.Cells(rowIndex, 20).Value) And IsNumeric(ws.Cells(rowIndex, 21).Value) Then
                If IsDate(rowTimestamp) Then
                    If CDate(rowTimestamp) >= thresholdTime Then
                        rowQty = CLng(ws.Cells(rowIndex, 20).Value)
                        rowPrice = CDbl(ws.Cells(rowIndex, 21).Value)
                        If rowQty > 0 And rowPrice > 0 Then
                            totalQty = totalQty + rowQty
                            weightedPriceTotal = weightedPriceTotal + (rowQty * rowPrice)
                            If expectedQty > 0 And totalQty >= expectedQty Then Exit For
                        End If
                    End If
                End If
            End If
        End If
    Next rowIndex

    If totalQty > 0 Then
        executedQty = totalQty
        executedPrice = weightedPriceTotal / totalQty
        TryResolveExecutionFromList = True
    End If
End Function

Private Function NormalizeStockCode(ByVal code As String) As String
    If InStr(1, code, ".", vbTextCompare) > 0 Then
        NormalizeStockCode = Trim$(code)
    Else
        NormalizeStockCode = Trim$(code) & ".T"
    End If
End Function

Private Function NormalizeExecutionCode(ByVal code As String) As String
    Dim dotPosition As Long
    dotPosition = InStr(1, code, ".", vbTextCompare)
    If dotPosition > 0 Then
        NormalizeExecutionCode = Left$(Trim$(code), dotPosition - 1)
    Else
        NormalizeExecutionCode = Trim$(code)
    End If
End Function

Private Function OrderSideCode(ByVal sideLabel As String) As Long
    If StrComp(sideLabel, "売", vbTextCompare) = 0 Then
        OrderSideCode = 1
    Else
        OrderSideCode = 3
    End If
End Function

Private Function IsAcceptedSubmissionStatus(ByVal submissionResult As String) As Boolean
    Dim normalized As String
    normalized = Trim$(submissionResult)
    If normalized = "" Then Exit Function

    If InStr(1, normalized, "発注済", vbTextCompare) > 0 Then
        IsAcceptedSubmissionStatus = True
        Exit Function
    End If

    If InStr(1, normalized, "応答待ち", vbTextCompare) > 0 Then
        IsAcceptedSubmissionStatus = True
        Exit Function
    End If
End Function

Private Function EnsureBridgeSheet() As Worksheet
    On Error Resume Next
    Set EnsureBridgeSheet = ThisWorkbook.Worksheets(SH_BROKER_BRIDGE)
    On Error GoTo 0

    If EnsureBridgeSheet Is Nothing Then
        Set EnsureBridgeSheet = ThisWorkbook.Worksheets.Add(After:=ThisWorkbook.Worksheets(ThisWorkbook.Worksheets.Count))
        EnsureBridgeSheet.Name = SH_BROKER_BRIDGE
    End If

    EnsureBridgeSheet.Visible = xlSheetVeryHidden
End Function

Private Function NextOrderId() As Long
    Dim ws As Worksheet
    Dim currentValue As Variant

    Set ws = EnsureBridgeSheet()
    currentValue = ws.Range(BRIDGE_NEXT_ORDER_ID_CELL).Value
    If Not IsNumeric(currentValue) Then
        currentValue = 1
    ElseIf CLng(currentValue) < 1 Then
        currentValue = 1
    End If

    NextOrderId = CLng(currentValue)
    ws.Range(BRIDGE_NEXT_ORDER_ID_CELL).Value = NextOrderId + 1
End Function

Private Sub ResetBridgeRange(ByVal ws As Worksheet, ByVal rangeAddress As String)
    ws.Range(rangeAddress).ClearContents
End Sub

Private Sub SafeCalculateBridge(ByVal ws As Worksheet)
    ws.Calculate
    DoEvents
End Sub

Private Sub WaitMilliseconds(ByVal milliseconds As Long)
    Dim startedAt As Double
    Dim target As Double

    startedAt = Timer
    target = startedAt + (milliseconds / 1000#)

    Do
        DoEvents
        If Timer < startedAt Then Exit Do
    Loop While Timer < target
End Sub

Private Sub WriteOrderLog(ByVal orderType As String, ByVal code As String, ByVal qty As Long, ByVal reason As String, ByVal note As String)
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets(SH_LOG)

    Dim nextRow As Long
    nextRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row + 1

    ws.Cells(nextRow, 1).Value = Format$(Now, "hh:mm:ss")
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
    ws.Cells(nextRow, 12).Value = Left$(note, 120)

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
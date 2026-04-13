Attribute VB_Name = "modOrder"
Option Explicit

Public Sub ExecuteOrder(ByVal actionCode As Long, ByVal code As String, ByVal qty As Long, ByVal reason As String)
    Select Case actionCode
        Case 1
            PlaceBuy code, qty, reason
        Case -1
            PlaceSell code, qty, reason
        Case Else
            ' hold
    End Select
End Sub

Private Sub PlaceBuy(ByVal code As String, ByVal qty As Long, ByVal reason As String)
    WriteOrderLog "BUY_STUB", code, qty, reason
    ' Dim rss As Object
    ' Set rss = CreateObject("MarketSpeed.TradeII")
    ' rss.NewOrder code, "成行", "買", qty
End Sub

Private Sub PlaceSell(ByVal code As String, ByVal qty As Long, ByVal reason As String)
    WriteOrderLog "SELL_STUB", code, qty, reason
    ' Dim rss As Object
    ' Set rss = CreateObject("MarketSpeed.TradeII")
    ' rss.NewOrder code, "成行", "売", qty
End Sub

Private Sub WriteOrderLog(ByVal orderType As String, ByVal code As String, ByVal qty As Long, ByVal reason As String)
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
    ws.Cells(nextRow, 12).Value = "stub only; broker order not sent"

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
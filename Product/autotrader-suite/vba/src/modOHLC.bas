Attribute VB_Name = "modOHLC"
Option Explicit

Private m_BarMinute As Integer
Private m_Open As Double
Private m_High As Double
Private m_Low As Double
Private m_Close As Double
Private m_BarVol As Long
Private m_PrevVol As Long
Private m_BarTime As Date

Public Sub UpdateBar(ByVal price As Double, ByVal totalVolume As Long, ByVal tickTime As Date)
    Dim barTime As Date
    barTime = DateSerial(Year(tickTime), Month(tickTime), Day(tickTime)) + _
        TimeSerial(Hour(tickTime), Minute(tickTime), 0)

    Dim volDelta As Long
    If m_BarMinute = -1 Then
        volDelta = 0
    Else
        volDelta = totalVolume - m_PrevVol
        If volDelta < 0 Then volDelta = 0
    End If
    m_PrevVol = totalVolume

    If m_BarMinute = -1 Or barTime <> m_BarTime Then
        If m_BarMinute <> -1 Then SaveBar

        m_BarMinute = Minute(tickTime)
        m_BarTime = barTime
        m_Open = price
        m_High = price
        m_Low = price
        m_Close = price
        m_BarVol = volDelta
    Else
        If price > m_High Then m_High = price
        If price < m_Low Then m_Low = price
        m_Close = price
        m_BarVol = m_BarVol + volDelta
    End If
End Sub

Public Function BuildOHLCJson(ByVal currentPrice As Double) As String
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets(SH_OHLC)

    Dim lastRow As Long
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row

    Dim jsonArr As String
    Dim maxFromSheet As Long
    Dim startRow As Long
    Dim rowIndex As Long

    maxFromSheet = API_OHLC_BARS - 1
    jsonArr = ""
    startRow = lastRow - maxFromSheet + 1
    If startRow < 2 Then startRow = 2

    For rowIndex = startRow To lastRow
        If Trim$(CStr(ws.Cells(rowIndex, 1).Value)) <> "" Then
            If jsonArr <> "" Then jsonArr = jsonArr & ","
            jsonArr = jsonArr & OHLCBarJson( _
                CDbl(ws.Cells(rowIndex, 2).Value), _
                CDbl(ws.Cells(rowIndex, 3).Value), _
                CDbl(ws.Cells(rowIndex, 4).Value), _
                CDbl(ws.Cells(rowIndex, 5).Value), _
                CLng(ws.Cells(rowIndex, 6).Value))
        End If
    Next rowIndex

    If jsonArr <> "" Then jsonArr = jsonArr & ","
    jsonArr = jsonArr & CurrentBarJson(currentPrice)

    BuildOHLCJson = "[" & jsonArr & "]"
End Function

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

Private Function CurrentBarJson(ByVal currentPrice As Double) As String
    Dim currentOpen As Double
    Dim currentHigh As Double
    Dim currentLow As Double
    Dim currentClose As Double

    If m_BarMinute = -1 Then
        currentOpen = currentPrice
        currentHigh = currentPrice
        currentLow = currentPrice
        currentClose = currentPrice
    Else
        currentOpen = m_Open
        currentHigh = m_High
        currentLow = m_Low
        currentClose = m_Close
    End If

    CurrentBarJson = OHLCBarJson(currentOpen, currentHigh, currentLow, currentClose, m_BarVol)
End Function

Private Sub SaveBar()
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets(SH_OHLC)

    Dim nextRow As Long
    nextRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row + 1

    ws.Cells(nextRow, 1).Value = Format$(m_BarTime, "yyyy-mm-dd hh:mm:00")
    ws.Cells(nextRow, 2).Value = m_Open
    ws.Cells(nextRow, 3).Value = m_High
    ws.Cells(nextRow, 4).Value = m_Low
    ws.Cells(nextRow, 5).Value = m_Close
    ws.Cells(nextRow, 6).Value = m_BarVol

    TrimRows ws, MAX_OHLC_BARS
End Sub

Private Function OHLCBarJson(ByVal openPrice As Double, ByVal highPrice As Double, ByVal lowPrice As Double, ByVal closePrice As Double, ByVal volume As Long) As String
    OHLCBarJson = "{""o"":" & JsonNumber(openPrice) & _
        ",""h"":" & JsonNumber(highPrice) & _
        ",""l"":" & JsonNumber(lowPrice) & _
        ",""c"":" & JsonNumber(closePrice) & _
        ",""v"":" & CStr(volume) & "}"
End Function

Private Function JsonNumber(ByVal value As Double) As String
    Dim formatted As String
    formatted = Replace$(Format$(Round(value, 3), "0.000"), ",", ".")

    Do While Right$(formatted, 1) = "0"
        formatted = Left$(formatted, Len(formatted) - 1)
    Loop
    If Right$(formatted, 1) = "." Then
        formatted = Left$(formatted, Len(formatted) - 1)
    End If

    JsonNumber = formatted
End Function

Private Sub TrimRows(ByVal ws As Worksheet, ByVal maxDataRows As Long)
    Dim lastRow As Long
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row

    Do While lastRow - 1 > maxDataRows
        ws.Rows(2).Delete
        lastRow = lastRow - 1
    Loop
End Sub
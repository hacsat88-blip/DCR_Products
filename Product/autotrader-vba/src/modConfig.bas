Attribute VB_Name = "modConfig"
Option Explicit

Public Const API_BASE_URL As String = "http://127.0.0.1:8000"
Public Const API_PRICE_URL As String = API_BASE_URL & "/api/price"
Public Const HTTP_TIMEOUT As Long = 3000

Public Const POLL_INTERVAL As Long = 5

Public Const MAX_OHLC_BARS As Long = 20
Public Const API_OHLC_BARS As Long = 5

Public Const SH_CONTROL As String = "Control"
Public Const SH_MARKET As String = "Market"
Public Const SH_OHLC As String = "OHLC_Data"
Public Const SH_LOG As String = "Log"

Public Const MARKET_ROW As Long = 2
Public Const COL_CODE As Long = 1
Public Const COL_PRICE As Long = 2
Public Const COL_VOLUME As Long = 3
Public Const COL_DATE As Long = 4
Public Const COL_TIME As Long = 5

Public Const LOG_MAX_ROWS As Long = 200

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
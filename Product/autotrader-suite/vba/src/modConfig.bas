Attribute VB_Name = "modConfig"
Option Explicit

Public Const API_BASE_URL As String = "http://127.0.0.1:8000"
Public Const API_PRICE_URL As String = API_BASE_URL & "/api/price"
Public Const HTTP_TIMEOUT As Long = 15000
Public Const RUN_MODE_PAPER As String = "paper"
Public Const RUN_MODE_LIVE As String = "live"
Public Const ORDER_MODE_STUB_ONLY As String = "stub only"
Public Const ORDER_MODE_BROKER_AUTO As String = "broker auto"
Public Const LEGACY_BROKER_PROG_ID As String = "MarketSpeed.TradeII"
Public Const DEFAULT_ORDER_TYPE As String = "成行"
Public Const DEFAULT_STOCK_ORDER_KIND As Long = 0
Public Const DEFAULT_SOR_MODE As Long = 0
Public Const DEFAULT_ORDER_PRICE_MODE_MARKET As Long = 0
Public Const DEFAULT_ORDER_EXEC_CONDITION As Long = 1
Public Const DEFAULT_ACCOUNT_TYPE As Long = 0
Public Const LIVE_ORDER_STATUS_TIMEOUT_SECONDS As Long = 5
Public Const LIVE_ORDER_STATUS_POLL_INTERVAL_MS As Long = 500

Public Const POLL_INTERVAL As Long = 5

Public Const MAX_OHLC_BARS As Long = 20
Public Const API_OHLC_BARS As Long = 5

Public Const SH_CONTROL As String = "Control"
Public Const SH_MARKET As String = "Market"
Public Const SH_OHLC As String = "OHLC_Data"
Public Const SH_LOG As String = "Log"
Public Const SH_BROKER_BRIDGE As String = "BrokerBridge"

Public Const MARKET_ROW As Long = 2
Public Const COL_CODE As Long = 1
Public Const COL_PRICE As Long = 2
Public Const COL_VOLUME As Long = 3
Public Const COL_DATE As Long = 4
Public Const COL_TIME As Long = 5
Public Const COL_BID As Long = 6
Public Const COL_ASK As Long = 7

Public Const CONTROL_ROW_SERVER_URL As Long = 1
Public Const CONTROL_ROW_POLL_INTERVAL As Long = 2
Public Const CONTROL_ROW_STATUS As Long = 3
Public Const CONTROL_ROW_REFERENCE_STATUS As Long = 5
Public Const CONTROL_ROW_REFERENCE_AS_OF As Long = 6
Public Const CONTROL_ROW_WARNING As Long = 7
Public Const CONTROL_ROW_NEWS_HALT As Long = 8
Public Const CONTROL_ROW_NEWS_NOTE As Long = 9
Public Const CONTROL_ROW_RUN_MODE As Long = 10
Public Const CONTROL_ROW_ORDER_MODE As Long = 11
Public Const CONTROL_ROW_AUTO_START As Long = 12
Public Const CONTROL_ROW_LAST_TICK_AT As Long = 13
Public Const CONTROL_ROW_LAST_ACTION As Long = 14
Public Const CONTROL_ROW_LAST_ERROR As Long = 15
Public Const CONTROL_ROW_LIVE_ARMED As Long = 16
Public Const CONTROL_ROW_ORDER_CONFIRM_TIMEOUT As Long = 17
Public Const CONTROL_ROW_BROKER_PREFLIGHT As Long = 18
Public Const CONTROL_ROW_BROKER_CASH_ACTUAL As Long = 19
Public Const CONTROL_ROW_BROKER_CHECKED_AT As Long = 20
Public Const CONTROL_ROW_BROKER_MESSAGE As Long = 21

Public Const BROKER_PREFLIGHT_STATUS_NOT_CHECKED As String = "not checked"
Public Const BROKER_PREFLIGHT_STATUS_READY As String = "ready"
Public Const BROKER_PREFLIGHT_STATUS_DEGRADED As String = "degraded"

Public Const LOG_MAX_ROWS As Long = 200

Public Function RuntimeApiBaseUrl() As String
    Dim configured As String
    configured = Trim$(CStr(ThisWorkbook.Sheets(SH_CONTROL).Cells(CONTROL_ROW_SERVER_URL, 2).Value))
    If configured = "" Then
        RuntimeApiBaseUrl = API_BASE_URL
    Else
        RuntimeApiBaseUrl = configured
    End If
End Function

Public Function RuntimeApiPriceUrl() As String
    RuntimeApiPriceUrl = RuntimeApiBaseUrl() & "/api/price"
End Function

Public Function RuntimeApiExecutionResultUrl() As String
    RuntimeApiExecutionResultUrl = RuntimeApiBaseUrl() & "/api/execution-result"
End Function

Public Function RuntimePollIntervalSeconds() As Long
    Dim configured As Variant
    configured = ThisWorkbook.Sheets(SH_CONTROL).Cells(CONTROL_ROW_POLL_INTERVAL, 2).Value
    If IsNumeric(configured) Then
        RuntimePollIntervalSeconds = CLng(configured)
        If RuntimePollIntervalSeconds <= 0 Then RuntimePollIntervalSeconds = POLL_INTERVAL
    Else
        RuntimePollIntervalSeconds = POLL_INTERVAL
    End If
End Function

Public Function RuntimeNewsHaltEnabled() As Boolean
    Dim rawValue As String
    rawValue = LCase$(Trim$(CStr(ThisWorkbook.Sheets(SH_CONTROL).Cells(CONTROL_ROW_NEWS_HALT, 2).Value)))
    RuntimeNewsHaltEnabled = (rawValue = "true" Or rawValue = "1" Or rawValue = "yes" Or rawValue = "on")
End Function

Public Function RuntimeNewsNote() As String
    RuntimeNewsNote = Trim$(CStr(ThisWorkbook.Sheets(SH_CONTROL).Cells(CONTROL_ROW_NEWS_NOTE, 2).Value))
End Function

Public Function RuntimeAutoStartEnabled() As Boolean
    Dim rawValue As String
    rawValue = LCase$(Trim$(CStr(ThisWorkbook.Sheets(SH_CONTROL).Cells(CONTROL_ROW_AUTO_START, 2).Value)))
    RuntimeAutoStartEnabled = (rawValue = "true" Or rawValue = "1" Or rawValue = "yes" Or rawValue = "on")
End Function

Public Function RuntimeRunModeLabel() As String
    Dim rawValue As String
    rawValue = LCase$(Trim$(CStr(ThisWorkbook.Sheets(SH_CONTROL).Cells(CONTROL_ROW_RUN_MODE, 2).Value)))
    If rawValue = RUN_MODE_LIVE Then
        RuntimeRunModeLabel = RUN_MODE_LIVE
    Else
        RuntimeRunModeLabel = RUN_MODE_PAPER
    End If
End Function

Public Function RuntimeOrderModeLabel() As String
    Dim rawValue As String
    rawValue = LCase$(Trim$(CStr(ThisWorkbook.Sheets(SH_CONTROL).Cells(CONTROL_ROW_ORDER_MODE, 2).Value)))
    If rawValue = ORDER_MODE_BROKER_AUTO Then
        RuntimeOrderModeLabel = ORDER_MODE_BROKER_AUTO
    Else
        RuntimeOrderModeLabel = ORDER_MODE_STUB_ONLY
    End If
End Function

Public Function RuntimeClientRunMode() As String
    RuntimeClientRunMode = RuntimeRunModeLabel()
End Function

Public Function RuntimeClientOrderMode() As String
    If RuntimeOrderModeLabel() = ORDER_MODE_BROKER_AUTO Then
        RuntimeClientOrderMode = "broker_auto"
    Else
        RuntimeClientOrderMode = "stub_only"
    End If
End Function

Public Function RuntimeLiveArmedEnabled() As Boolean
    If RuntimeClientRunMode() <> RUN_MODE_LIVE Then Exit Function
    If RuntimeClientOrderMode() <> "broker_auto" Then Exit Function

    Dim rawValue As String
    rawValue = LCase$(Trim$(CStr(ThisWorkbook.Sheets(SH_CONTROL).Cells(CONTROL_ROW_LIVE_ARMED, 2).Value)))
    RuntimeLiveArmedEnabled = (rawValue = "true" Or rawValue = "1" Or rawValue = "yes" Or rawValue = "on")
End Function

Public Function RuntimeOrderConfirmTimeoutSeconds() As Long
    Dim configured As Variant
    configured = ThisWorkbook.Sheets(SH_CONTROL).Cells(CONTROL_ROW_ORDER_CONFIRM_TIMEOUT, 2).Value

    If VarType(configured) = vbString Then
        Dim normalized As String
        normalized = Trim$(CStr(configured))
        If normalized = "" Or StrComp(normalized, LEGACY_BROKER_PROG_ID, vbTextCompare) = 0 Then
            RuntimeOrderConfirmTimeoutSeconds = LIVE_ORDER_STATUS_TIMEOUT_SECONDS
            Exit Function
        End If
    End If

    If IsNumeric(configured) Then
        RuntimeOrderConfirmTimeoutSeconds = CLng(configured)
        If RuntimeOrderConfirmTimeoutSeconds <= 0 Then
            RuntimeOrderConfirmTimeoutSeconds = LIVE_ORDER_STATUS_TIMEOUT_SECONDS
        End If
    Else
        RuntimeOrderConfirmTimeoutSeconds = LIVE_ORDER_STATUS_TIMEOUT_SECONDS
    End If
End Function
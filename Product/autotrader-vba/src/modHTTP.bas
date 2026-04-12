Attribute VB_Name = "modHTTP"
Option Explicit

Public Function PostPrice(ByVal code As String, _
                          ByVal price As Double, _
                          ByVal volume As Long, _
                          ByVal ohlcJson As String, _
                          ByVal tickTime As Date, _
                          ByRef qty As Long, _
                          ByRef reason As String, _
                          ByRef referenceStatus As String, _
                          ByRef referencePrice As Variant, _
                          ByRef referenceAsOf As String, _
                          ByRef referenceGapPct As Variant, _
                          ByRef warningCode As String, _
                          ByRef warningMessage As String) As Long
    PostPrice = 0
    qty = 0
    reason = ""
    referenceStatus = "missing"
    referencePrice = Empty
    referenceAsOf = ""
    referenceGapPct = Empty
    warningCode = ""
    warningMessage = ""

    Dim http As Object
    Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")

    On Error GoTo HttpError
    http.Open "POST", RuntimeApiPriceUrl(), False
    http.setRequestHeader "Content-Type", "application/json"
    http.setRequestHeader "Accept", "application/json"
    http.setTimeouts HTTP_TIMEOUT, HTTP_TIMEOUT, HTTP_TIMEOUT, HTTP_TIMEOUT
    http.send BuildRequestJson(code, price, volume, ohlcJson, tickTime)
    On Error GoTo 0

    If http.Status <> 200 Then
        reason = "HTTP " & CStr(http.Status) & ": " & Left$(http.responseText, 120)
        Exit Function
    End If

    Dim respText As String
    respText = http.responseText

    qty = ParseJsonLong(ExtractJsonNumber(respText, "qty", "0"))
    reason = ExtractJsonString(respText, "reason")
    referenceStatus = ExtractJsonString(respText, "reference_status")
    referencePrice = ExtractJsonOptionalNumber(respText, "reference_price")
    referenceAsOf = ExtractJsonString(respText, "reference_as_of")
    referenceGapPct = ExtractJsonOptionalNumber(respText, "reference_gap_pct")
    warningCode = ExtractJsonString(respText, "warning_code")
    warningMessage = ExtractJsonString(respText, "warning_message")

    Select Case LCase$(ExtractJsonString(respText, "action"))
        Case "buy"
            PostPrice = 1
        Case "sell"
            PostPrice = -1
        Case Else
            PostPrice = 0
    End Select
    Exit Function

HttpError:
    reason = "HTTP error: " & Err.Description
    PostPrice = 0
End Function

Private Function BuildRequestJson(ByVal code As String, ByVal price As Double, ByVal volume As Long, ByVal ohlcJson As String, ByVal tickTime As Date) As String
    Dim isoTimestamp As String
    isoTimestamp = Format$(tickTime, "yyyy-mm-dd") & "T" & Format$(tickTime, "hh:nn:ss")

    BuildRequestJson = "{" & _
        """code"":""" & EscapeJson(code) & """," & _
        """price"":" & JsonNumber(price) & "," & _
        """volume"":" & CStr(volume) & "," & _
        """ohlc"":" & ohlcJson & "," & _
        """timestamp"":""" & isoTimestamp & """" & _
        "}"
End Function

Private Function EscapeJson(ByVal value As String) As String
    EscapeJson = Replace$(value, "\", "\\")
    EscapeJson = Replace$(EscapeJson, Chr$(34), "\" & Chr$(34))
End Function

Private Function ExtractJsonString(ByVal json As String, ByVal key As String) As String
    Dim needle As String
    needle = Chr$(34) & key & Chr$(34) & ":"

    Dim pos As Long
    pos = InStr(1, json, needle, vbBinaryCompare)
    If pos = 0 Then Exit Function

    pos = SkipWhitespace(json, pos + Len(needle))
    If Mid$(json, pos, 4) = "null" Then Exit Function
    If Mid$(json, pos, 1) <> Chr$(34) Then Exit Function

    pos = pos + 1
    Dim cursor As Long
    Dim escaped As Boolean
    Dim currentChar As String
    Dim result As String

    For cursor = pos To Len(json)
        currentChar = Mid$(json, cursor, 1)
        If escaped Then
            Select Case currentChar
                Case Chr$(34), "\", "/"
                    result = result & currentChar
                Case "n"
                    result = result & vbLf
                Case "r"
                    result = result & vbCr
                Case "t"
                    result = result & vbTab
                Case Else
                    result = result & currentChar
            End Select
            escaped = False
        ElseIf currentChar = "\" Then
            escaped = True
        ElseIf currentChar = Chr$(34) Then
            ExtractJsonString = result
            Exit Function
        Else
            result = result & currentChar
        End If
    Next cursor
End Function

Private Function ExtractJsonNumber(ByVal json As String, ByVal key As String, Optional ByVal defaultValue As String = "0") As String
    Dim needle As String
    needle = Chr$(34) & key & Chr$(34) & ":"

    Dim pos As Long
    pos = InStr(1, json, needle, vbBinaryCompare)
    If pos = 0 Then
        ExtractJsonNumber = defaultValue
        Exit Function
    End If

    pos = SkipWhitespace(json, pos + Len(needle))
    If Mid$(json, pos, 4) = "null" Then
        ExtractJsonNumber = "null"
        Exit Function
    End If

    Dim cursor As Long
    cursor = pos
    Do While cursor <= Len(json)
        Dim ch As String
        ch = Mid$(json, cursor, 1)
        If ch = "," Or ch = "}" Then Exit Do
        cursor = cursor + 1
    Loop

    ExtractJsonNumber = Trim$(Mid$(json, pos, cursor - pos))
End Function

Private Function ExtractJsonOptionalNumber(ByVal json As String, ByVal key As String) As Variant
    Dim rawValue As String
    rawValue = ExtractJsonNumber(json, key, "")
    If rawValue = "" Or LCase$(rawValue) = "null" Then
        ExtractJsonOptionalNumber = Empty
        Exit Function
    End If

    ExtractJsonOptionalNumber = Val(rawValue)
End Function

Private Function ParseJsonLong(ByVal rawValue As String) As Long
    If rawValue = "" Or LCase$(rawValue) = "null" Then
        ParseJsonLong = 0
        Exit Function
    End If

    ParseJsonLong = CLng(Val(rawValue))
End Function

Private Function SkipWhitespace(ByVal source As String, ByVal startPos As Long) As Long
    SkipWhitespace = startPos
    Do While SkipWhitespace <= Len(source)
        Select Case Mid$(source, SkipWhitespace, 1)
            Case " ", vbTab, vbCr, vbLf
                SkipWhitespace = SkipWhitespace + 1
            Case Else
                Exit Do
        End Select
    Loop
End Function

Private Function JsonNumber(ByVal value As Double) As String
    JsonNumber = Replace$(Format$(Round(value, 3), "0.###"), ",", ".")
End Function
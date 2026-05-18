VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
END
Attribute VB_Name = "ThisWorkbook"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = True
Option Explicit

' ブックを開いたときにタイマーを自動起動
Private Sub Workbook_Open()
    Call StartAutoTrader
End Sub

' ブックを閉じるときにタイマーを自動停止
Private Sub Workbook_BeforeClose(Cancel As Boolean)
    Call StopAutoTrader
End Sub

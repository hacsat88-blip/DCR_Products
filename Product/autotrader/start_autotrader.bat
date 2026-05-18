@echo off
setlocal
chcp 65001 > nul
title Autotrader Launcher

set "ROOT=%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%ROOT%start_autotrader.ps1" %*

if errorlevel 1 (
  echo.
  echo Autotrader startup failed. See the message above.
  pause
)

endlocal

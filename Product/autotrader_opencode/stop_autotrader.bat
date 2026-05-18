@echo off
chcp 65001 > nul
title Autotrader Stop

echo Autotrader を停止します...

echo - FastAPI サーバーを停止...
taskkill /FI "WINDOWTITLE eq Autotrader API*" /T /F > nul 2>&1

echo - UI を停止...
taskkill /FI "WINDOWTITLE eq Autotrader UI*" /T /F > nul 2>&1

echo 停止完了
timeout /t 2 /nobreak > nul
exit

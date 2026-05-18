@echo off
chcp 65001 > nul
title Autotrader Launcher

set "ROOT=%~dp0"
cd /d "%ROOT%"

echo ============================================
echo  Autotrader 起動中...
echo ============================================
echo.

echo [1/4] FastAPI サーバーを起動中...
start "Autotrader API" cmd /k "cd /d %ROOT% && python -m uvicorn server.main:app --port 8000"

echo [2/4] サーバー起動待機（5秒）...
timeout /t 5 /nobreak > nul

echo [3/4] ダッシュボード UI を起動中...
start "Autotrader UI" cmd /k "cd /d %ROOT%ui && npm run dev"

echo [4/4] UI 起動待機（8秒）...
timeout /t 8 /nobreak > nul

echo ブラウザでダッシュボードを開きます...
start "" "http://localhost:3000"

echo Excel ファイルを開きます...
start "" "%ROOT%autotrader.xlsm"

echo.
echo ============================================
echo  起動完了
echo  停止するには各ウィンドウを Ctrl+C で終了
echo ============================================
timeout /t 3 /nobreak > nul
exit

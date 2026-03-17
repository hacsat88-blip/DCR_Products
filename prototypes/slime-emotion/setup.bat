@echo off
chcp 65001 > nul
echo 感情粘菌プロジェクト - セットアップ
md "%~dp0slime-emotion" 2>nul
copy "%~dp0感情粘菌.html" "%~dp0slime-emotion\index.html" > nul
echo.
echo フォルダ slime-emotion を作成し、index.html をコピーしました。
echo ブラウザで slime-emotion\index.html を開いてください。
pause

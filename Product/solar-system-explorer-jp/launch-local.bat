@echo off
setlocal

cd /d "%~dp0"
start "" "http://127.0.0.1:8125/index.html"
python -m http.server 8125 --bind 127.0.0.1

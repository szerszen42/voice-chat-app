@echo off
title VoiceChat Desktop
cd /d "%~dp0"

echo =========================================================
echo   Uruchamianie aplikacji VoiceChat Desktop (Chmura 24/7)
echo =========================================================
echo.

:: 1. Uruchomienie okna natywnego przez Electron (jesli dostepny)
if exist "node_modules\electron\dist\electron.exe" (
    start "" "node_modules\electron\dist\electron.exe" .
    exit
)

:: 2. Uruchomienie przez Google Chrome w trybie aplikacji (bez paskow przegladarki)
start "" chrome.exe --app=https://voice-chat-app-8m36.onrender.com --window-size=1280,820 2>nul
if %ERRORLEVEL% EQU 0 exit

:: 3. Uruchomienie przez Microsoft Edge w trybie aplikacji
start "" msedge.exe --app=https://voice-chat-app-8m36.onrender.com --window-size=1280,820 2>nul
if %ERRORLEVEL% EQU 0 exit

:: 4. Awaryjnie w domyslnej przegladarce
start https://voice-chat-app-8m36.onrender.com
exit

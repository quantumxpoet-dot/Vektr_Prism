@echo off
title Vektr Prism

:: ─── 1. Start Vektr Prism server (minimized, in background) ──────────────────
start /min "Vektr Prism Server" node server.js

:: ─── 2. Wait for server to be ready ─────────────────────────────────────────
timeout /t 2 /nobreak >nul

:: ─── 3. Find Chrome executable (check common paths) ─────────────────────────
set "CHROME="

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
    goto :found
)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
    goto :found
)
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"
    goto :found
)

:notfound
echo [WARNING] Chrome not found. Open Chrome manually with:
echo   chrome.exe --remote-debugging-port=9222 --user-data-dir="C:\temp\chrome-debug"
start http://localhost:3001
goto :end

:found
:: ─── 4. Launch Chrome in CDP debug mode + open Vektr Prism ───────────────────
echo Starting Chrome in debug mode...
start "" "%CHROME%" --remote-debugging-port=9222 --user-data-dir="C:\temp\chrome-debug" http://localhost:3001

:end
echo.
echo  🔮 Vektr Prism running at http://localhost:3001
echo  🌐 Chrome debug mode active on port 9222
echo  💬 Open any AI chatbot tab in Chrome to connect.
echo.

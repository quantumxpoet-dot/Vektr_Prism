@echo off
title VektrIDE
echo.
echo   ============================
echo        VektrIDE  v1.0
echo   ============================
echo.

cd /d "%~dp0"

:: Check if dist/ exists (production build)
if not exist "dist\index.html" (
    echo   [!] No production build found. Running setup first...
    echo.
    call npm run build
    echo.
)

:: Start the server
echo   Starting VektrIDE on http://localhost:3001 ...
echo   Press Ctrl+C to stop.
echo.
echo   TIP: Open Chrome with CDP for AI features:
echo   chrome.exe --remote-debugging-port=9222 --user-data-dir="C:\temp\chrome-debug"
echo.

node server.js

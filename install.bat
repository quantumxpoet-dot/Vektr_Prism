@echo off
title VektrIDE — First-Time Setup
echo.
echo   ==============================
echo    VektrIDE — First-Time Setup
echo   ==============================
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo   [ERROR] Node.js is not installed.
    echo   Download from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo   [1/3] Node.js found:
node --version
echo.

:: Install dependencies
echo   [2/3] Installing dependencies...
cd /d "%~dp0"
call npm install
echo.

:: Build production bundle
echo   [3/3] Building production bundle...
call npm run build
echo.

echo   ==============================
echo    Setup complete!
echo    Run launch.bat to start VektrIDE.
echo   ==============================
echo.
pause

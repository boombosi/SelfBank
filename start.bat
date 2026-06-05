@echo off
title Learning Dashboard
cd /d "%~dp0"

echo ==============================
echo   Learning Dashboard Startup
echo ==============================

if not exist "venv\Scripts\activate.bat" (
    echo [ERROR] venv not found. Run: python -m venv venv
    pause
    exit
)

call venv\Scripts\activate.bat

echo.
echo ==============================
echo   Server starting...
echo   Open: http://localhost:5000
echo   Press Ctrl+C to stop
echo ==============================
echo.

start http://localhost:5000
python app.py
pause

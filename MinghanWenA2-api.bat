@echo off
title Charity Hub - Starter (Fixed)
color 0A

set "BASE_DIR=%~dp0"
set "API_FOLDER=MinghanWenA2-api"
set "API_PATH=%BASE_DIR%%API_FOLDER%"

echo ==========================================
echo   Starting Charity Hub Backend API
echo ==========================================
echo Base Dir : %BASE_DIR%
echo API Path : %API_PATH%
echo.

if not exist "%API_PATH%" (
    echo [ERROR] Folder NOT found: %API_FOLDER%
    echo Please check if the folder name is correct!
    echo Current folder name should be: MinghanWenA2-api
    echo.
    pause
    exit /b
)

echo [OK] Folder found. Starting server...

start "Backend API (Port 3001)" cmd /k "cd /d "%API_PATH%" && npm install && npm start"

echo.
echo ==========================================
echo   Backend is starting in a new window.
echo   Please wait for "Server running" message.
echo ==========================================
echo.
echo Next Step: Open VS Code -> Right Click index.html -> Open with Live Server
echo.
pause
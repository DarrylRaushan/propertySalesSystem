@echo off
title Property Sales System - Launcher
color 0A

cd /d "%~dp0"

echo.
echo  ============================================
echo   Property Sales System - Starting Up...
echo  ============================================
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js not found. Install from: https://nodejs.org/
    pause
    exit /b 1
)

:: Check pnpm
where pnpm >nul 2>&1
if %errorlevel% neq 0 (
    echo  [!] pnpm not found - installing via npm...
    npm install -g pnpm
    if %errorlevel% neq 0 (
        echo  [ERROR] Could not install pnpm.
        pause
        exit /b 1
    )
)

:: Install if needed
if not exist "node_modules\.bin\cross-env.cmd" (
    echo  [1/2] Installing dependencies ^(first time only^)...
    pnpm install --no-frozen-lockfile
    if %errorlevel% neq 0 (
        echo  [ERROR] Install failed - see above.
        pause
        exit /b 1
    )
    echo  [OK] Done.
    echo.
) else (
    echo  [1/2] Dependencies ready.
    echo.
)

:: Open browser after 6 seconds
start /b cmd /c "ping -n 7 127.0.0.1 >nul && start http://localhost:3000"

:: -------------------------------------------------------
:: Use "start cmd /k" so the window stays open no matter
:: what - even if pnpm dev crashes.
:: -------------------------------------------------------
echo  [2/2] Opening server window...
echo.
start "Property Sales System - Server" cmd /k "cd /d "%~dp0" && echo. && echo  App running at: http://localhost:3000 && echo  Press Ctrl+C then Y to stop. && echo. && pnpm dev"

:: This launcher window can now close
exit

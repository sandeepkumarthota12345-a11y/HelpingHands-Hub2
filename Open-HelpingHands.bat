@echo off
setlocal
cd /d "%~dp0"

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo Node.js and npm were not found. Install Node.js and try again.
  pause
  exit /b 1
)

if not exist "node_modules\vite\bin\vite.js" (
  echo Installing dependencies. This can take a minute.
  call npm.cmd install
  if errorlevel 1 (
    echo Install failed. Check your internet connection and try again.
    pause
    exit /b 1
  )
)

echo Starting the API server in a second window.
start "HelpingHands API" cmd /k npm.cmd run server

echo Starting the app. Keep both windows open while you use it.
call npm.cmd run dev -- --open
pause

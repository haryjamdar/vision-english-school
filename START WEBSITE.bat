@echo off
setlocal
cd /d "%~dp0"

title The Vision English School - Website Launcher

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo Node.js is not installed.
  echo Please install Node.js LTS from https://nodejs.org/ and then run this file again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo.
  echo First-time setup: installing website packages...
  echo This may take a few minutes.
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo npm install failed. Please check your internet connection and try again.
    pause
    exit /b 1
  )
)

rem Start the local data server in a separate window.
start "Vision School - Data Server" cmd /k "cd /d "%~dp0" && npm run server"

rem Start the Vite website in a separate window.
start "Vision School - Website" cmd /k "cd /d "%~dp0" && npm run dev -- --host 127.0.0.1"

rem Give Vite a moment to start, then open the site.
timeout /t 4 /nobreak >nul
start "" "http://127.0.0.1:5173"

echo.
echo The Vision English School website is starting.
echo Website: http://127.0.0.1:5173
 echo Data server: http://127.0.0.1:8787
 echo.
echo Keep the two black command windows open while using the website.
echo Close those windows when you are finished.
echo.
endlocal

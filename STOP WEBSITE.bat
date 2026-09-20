@echo off
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'vite.*--host 127.0.0.1|node server.js' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"
echo Website and local data server stopped.
pause

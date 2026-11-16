@echo off
title Stop Show and Restore Display

:: 1. Tell bridge.ps1 to shut down gracefully
powershell -NoProfile -Command "try { Invoke-WebRequest -Uri 'http://localhost:8765/api/shutdown' -UseBasicParsing -TimeoutSec 2 | Out-Null } catch {}"

:: 2. Force-close ShowBridge terminal and ShowController Edge app
taskkill /f /fi "WINDOWTITLE eq ShowBridge*" >nul 2>&1
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name = 'msedge.exe'\" | Where-Object { $_.CommandLine -like '*ShowControllerEdge*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"

:: 3. Restore Duplicate display
DisplaySwitch.exe /clone
exit

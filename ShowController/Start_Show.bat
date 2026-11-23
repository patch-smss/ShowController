@echo off
title Show Controller Launcher
cd /d "%~dp0"

:: 1. Extend Windows displays
DisplaySwitch.exe /extend
timeout /t 2 /nobreak >nul

:: 2. Start the local PowerShell server minimized
start "" /min powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0bridge.ps1"
timeout /t 2 /nobreak >nul

:: 3. Open Control Deck directly in isolated Edge App instance
start "" msedge --app="http://localhost:8765/control.html" --user-data-dir="%TEMP%\ShowControllerEdge"
timeout /t 2 /nobreak >nul

:: 4. Initialize PowerPoint Master Deck on Monitor 2 & snap Monitor 1 windows 50/50
powershell -NoProfile -Command "try { Invoke-WebRequest -Uri 'http://localhost:8765/api/ppt/init' -Method POST -UseBasicParsing -TimeoutSec 10 | Out-Null } catch {}"
exit

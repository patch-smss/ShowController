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
exit

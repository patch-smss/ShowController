@echo off
title ShowController - Wi-Fi Remote Permission Setup

:: Automatically request Administrator privileges if not already elevated
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting Administrator permission for Wi-Fi Remote setup...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

echo ========================================================
echo   Configuring Windows Firewall ^& Wi-Fi Remote ^(Port 8765^)
echo ========================================================
echo.

netsh advfirewall firewall delete rule name="ShowBridge" >nul 2>&1
netsh advfirewall firewall add rule name="ShowBridge" dir=in action=allow protocol=TCP localport=8765

netsh http delete urlacl url=http://+:8765/ >nul 2>&1
netsh http add urlacl url=http://+:8765/ user=Everyone

echo.
echo [SUCCESS] Your phone can now connect over Wi-Fi!
echo.
pause

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32Window {
    [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@

function Arrange-Monitor1Windows {
    $pri = [System.Windows.Forms.Screen]::PrimaryScreen
    if (-not $pri) { return }
    $wa = $pri.WorkingArea
    $halfW = [int]($wa.Width / 2)

    Get-Process msedge -ErrorAction SilentlyContinue | Where-Object {
        $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -like "*Show Control Deck*"
    } | ForEach-Object {
        [Win32Window]::ShowWindow($_.MainWindowHandle, 9) | Out-Null
        [Win32Window]::MoveWindow($_.MainWindowHandle, $wa.X, $wa.Y, $halfW, $wa.Height, $true) | Out-Null
    }

    Get-Process POWERPNT -ErrorAction SilentlyContinue | Where-Object {
        $_.MainWindowHandle -ne 0
    } | ForEach-Object {
        [Win32Window]::ShowWindow($_.MainWindowHandle, 9) | Out-Null
        [Win32Window]::MoveWindow($_.MainWindowHandle, $wa.X + $halfW, $wa.Y, $halfW, $wa.Height, $true) | Out-Null
    }
}

function Handle-ScreensApi($rawPath, $res) {
    if ($rawPath -eq "/api/info") {
        $localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
            $_.InterfaceAlias -notmatch "Loopback|vEthernet|WSL|Docker|Bluetooth|Virtual" -and
            $_.IPAddress -notlike "169.254.*" -and $_.AddressState -eq "Preferred"
        } | Select-Object -First 1).IPAddress
        if (-not $localIP) { $localIP = "127.0.0.1" }
        Send-Json $res @{ ip = $localIP; port = 8765 }
        return $true
    }

    if ($rawPath -eq "/api/qr-image") {
        $qrDir = Join-Path $PSScriptRoot "..\Media\qr code"
        $img = Get-ChildItem -Path $qrDir -File -ErrorAction SilentlyContinue | Where-Object {
            $_.Extension -match "\.(png|jpg|jpeg|webp|gif|svg)$"
        } | Select-Object -First 1
        if ($img) { Send-Json $res @{ url = "/Media/qr code/" + [Uri]::EscapeDataString($img.Name) } }
        else { Send-Json $res @{ url = $null } }
        return $true
    }

    if ($rawPath -eq "/api/screens") {
        $sec = [System.Windows.Forms.Screen]::AllScreens | Where-Object { -not $_.Primary } | Select-Object -First 1
        $data = if ($sec) { @{ hasSecond = $true; x = $sec.Bounds.X; y = $sec.Bounds.Y; w = $sec.Bounds.Width; h = $sec.Bounds.Height } }
                else { @{ hasSecond = $false; x = 80; y = 80; w = 1024; h = 600 } }
        Send-Json $res $data
        return $true
    }

    if ($rawPath -eq "/api/screens/arrange") {
        Arrange-Monitor1Windows
        Send-Json $res @{ ok = $true }
        return $true
    }

    if ($rawPath -eq "/api/focus-browser") {
        $wshell = New-Object -ComObject WScript.Shell
        Get-Process msedge -ErrorAction SilentlyContinue | Where-Object {
            $_.MainWindowTitle -ne "" -and $_.MainWindowTitle -notmatch "Show Control"
        } | ForEach-Object { $wshell.AppActivate($_.Id) | Out-Null }
        Send-Json $res @{ ok = $true }
        return $true
    }

    return $false
}

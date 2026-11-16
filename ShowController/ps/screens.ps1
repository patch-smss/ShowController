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

    if ($rawPath -eq "/api/screens") {
        $sec = [System.Windows.Forms.Screen]::AllScreens | Where-Object { -not $_.Primary } | Select-Object -First 1
        $data = if ($sec) { @{ hasSecond = $true; x = $sec.Bounds.X; y = $sec.Bounds.Y; w = $sec.Bounds.Width; h = $sec.Bounds.Height } }
                else { @{ hasSecond = $false; x = 80; y = 80; w = 1024; h = 600 } }
        Send-Json $res $data
        return $true
    }

    if ($rawPath -eq "/api/focus-browser") {
        $wshell = New-Object -ComObject WScript.Shell
        Get-Process msedge -ErrorAction SilentlyContinue | Where-Object {
            $_.MainWindowTitle -ne "" -and $_.MainWindowTitle -notmatch "Show Control|Projector Output"
        } | ForEach-Object { $wshell.AppActivate($_.Id) | Out-Null }
        Send-Json $res @{ ok = $true }
        return $true
    }

    return $false
}

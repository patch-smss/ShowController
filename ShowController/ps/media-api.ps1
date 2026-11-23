$script:phoneQueue = [System.Collections.ArrayList]::Synchronized((New-Object System.Collections.ArrayList))

function Handle-RemoteApi($rawPath, $req, $res) {
    if ($rawPath -eq "/api/phone-cmd" -and $req.HttpMethod -eq "POST") {
        $cmdObj = (New-Object System.IO.StreamReader($req.InputStream)).ReadToEnd() | ConvertFrom-Json
        $cfg = if (Get-Command Get-ShowSettings -ErrorAction SilentlyContinue) { Get-ShowSettings } else { @{ remotePin = "" } }
        if ($cfg.remotePin -and $cmdObj.pin -ne $cfg.remotePin) {
            $res.StatusCode = 401
            Send-Json $res @{ ok = $false; error = "Invalid PIN" }
            return $true
        }
        [void]$script:phoneQueue.Add($cmdObj)
        Send-Json $res @{ ok = $true }
        return $true
    }

    if ($rawPath -eq "/api/poll") {
        $items = @()
        while ($script:phoneQueue.Count -gt 0) {
            $items += $script:phoneQueue
            $script:phoneQueue.RemoveAt(0)
        }
        $json = if ($items.Count -eq 0) { "[]" } else { ConvertTo-Json -InputObject @($items) -Compress }
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
        $res.ContentType = "application/json; charset=utf-8"
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
        $res.Close()
        return $true
    }

    return $false
}

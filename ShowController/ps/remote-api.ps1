$script:phoneQueue = [System.Collections.ArrayList]::Synchronized((New-Object System.Collections.ArrayList))

#Phone remote command queue, PIN check, and Wifi media upload endpoint

function Test-RemotePin($providedPin) {
    $cfg = if (Get-Command Get-ShowSettings -ErrorAction SilentlyContinue) { Get-ShowSettings } else { @{ remotePin = "" } }
    if ($cfg.remotePin -and $providedPin -ne $cfg.remotePin) { return $false }
    return $true
}

function Handle-RemoteApi($rawPath, $req, $res, $mediaDir) {
    if ($rawPath -eq "/api/phone-cmd" -and $req.HttpMethod -eq "POST") {
        $cmdObj = (New-Object System.IO.StreamReader($req.InputStream)).ReadToEnd() | ConvertFrom-Json
        if (-not (Test-RemotePin $cmdObj.pin)) {
            $res.StatusCode = 401; Send-Json $res @{ ok = $false; error = "Invalid PIN" }; return $true
        }
        [void]$script:phoneQueue.Add($cmdObj)
        Send-Json $res @{ ok = $true }
        return $true
    }

    if ($rawPath -eq "/api/phone-upload" -and $req.HttpMethod -eq "POST") {
        if (-not (Test-RemotePin $req.Headers["X-Pin"])) {
            $res.StatusCode = 401; Send-Json $res @{ ok = $false; error = "Invalid PIN" }; return $true
        }
        $safeName = [System.IO.Path]::GetFileName([System.Uri]::UnescapeDataString($req.Headers["X-Filename"]))
        if (-not $safeName) { $res.StatusCode = 400; Send-Json $res @{ ok = $false; error = "Missing filename" }; return $true }
        $destPath = Join-Path $mediaDir $safeName
        $fs = [System.IO.File]::Create($destPath)
        $req.InputStream.CopyTo($fs)
        $fs.Close()
        Unblock-File -Path $destPath -ErrorAction SilentlyContinue
        $playNow = ($req.Headers["X-PlayNow"] -eq "1")
        [void]$script:phoneQueue.Add(@{ type = "ADD_MEDIA"; file = $safeName; playNow = $playNow })
        Send-Json $res @{ ok = $true; file = $safeName }
        return $true
    }

    if ($rawPath -eq "/api/poll") {
        $items = @()
        while ($script:phoneQueue.Count -gt 0) {
            $items += $script:phoneQueue[0]
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

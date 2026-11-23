function Handle-MediaApi($rawPath, $req, $res, $mediaDir) {
    if ($rawPath -eq "/api/upload-media" -and $req.HttpMethod -eq "POST") {
        $relPath = [System.Uri]::UnescapeDataString($req.Headers["X-Filename"]).Replace('/', '\').TrimStart('\')
        if ($relPath -and -not $relPath.Contains("..")) {
            $destPath = Join-Path $mediaDir $relPath
            $parent = Split-Path $destPath -Parent
            if (!(Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
            $fs = [System.IO.File]::Create($destPath)
            $req.InputStream.CopyTo($fs)
            $fs.Close()
            Unblock-File -Path $destPath -ErrorAction SilentlyContinue
            Send-Json $res @{ ok = $true }
        } else {
            $res.StatusCode = 400
            Send-Json $res @{ error = "Invalid path" }
        }
        return $true
    }

    if ($rawPath -eq "/api/cleanup-temp" -and $req.HttpMethod -eq "POST") {
        $body = (New-Object System.IO.StreamReader($req.InputStream)).ReadToEnd() | ConvertFrom-Json
        foreach ($f in $body.files) {
            $safe = [System.IO.Path]::GetFileName($f)
            if ($safe) { Remove-Item (Join-Path $mediaDir $safe) -Force -ErrorAction SilentlyContinue }
        }
        Send-Json $res @{ ok = $true }
        return $true
    }

    return $false
}

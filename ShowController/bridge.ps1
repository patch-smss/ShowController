Add-Type -AssemblyName System.Windows.Forms
$Host.UI.RawUI.WindowTitle = "ShowBridge"
$port = 8765

. "$PSScriptRoot\ps\screens.ps1"
. "$PSScriptRoot\ps\media-api.ps1"
. "$PSScriptRoot\ps\remote-api.ps1"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://+:$port/")
try { $listener.Start() } catch {
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://127.0.0.1:$port/")
    $listener.Start()
}

$mediaDir = Join-Path $PSScriptRoot "Media"
if (!(Test-Path $mediaDir)) { New-Item -ItemType Directory -Path $mediaDir | Out-Null }

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"; ".css" = "text/css; charset=utf-8"; ".js" = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"; ".png" = "image/png"; ".jpg" = "image/jpeg"; ".jpeg" = "image/jpeg"
    ".gif" = "image/gif"; ".webp" = "image/webp"; ".svg" = "image/svg+xml"; ".mp3" = "audio/mpeg"; ".wav" = "audio/wav"
    ".ogg" = "audio/ogg"; ".m4a" = "audio/mp4"; ".mp4" = "video/mp4"; ".mov" = "video/quicktime"
    ".pdf" = "application/pdf";
}

function Send-Json($res, $obj) {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes((ConvertTo-Json -InputObject $obj -Compress))
    $res.ContentType = "application/json; charset=utf-8"
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
    $res.Close()
}

Write-Host "Show Server running on port $port" -ForegroundColor Green

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $req = $context.Request; $res = $context.Response
        $rawPath = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath)

        if ($rawPath -eq "/api/shutdown") {
            Send-Json $res @{ status = "stopping" }
            DisplaySwitch.exe /clone
            Start-Sleep -Seconds 1
            Get-CimInstance Win32_Process -Filter "Name = 'msedge.exe'" | Where-Object { $_.CommandLine -like "*ShowControllerEdge*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
            break
        }

        if (Handle-ScreensApi $rawPath $res) { continue }
        if (Handle-MediaApi $rawPath $req $res $mediaDir) { continue }
        if (Handle-RemoteApi $rawPath $req $res) { continue }

        if ($rawPath -eq "/") { $rawPath = "/control.html" }
        $rel = $rawPath.TrimStart('/').Replace('/', '\')
        if ($rel.Contains("..")) { $res.StatusCode = 403; $res.Close(); continue }

        $target = Join-Path $PSScriptRoot $rel
        if (Test-Path $target -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($target).ToLower()
            $res.ContentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
            $bytes = [System.IO.File]::ReadAllBytes($target)
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        } else { $res.StatusCode = 404 }
        $res.Close()
    } catch {}
}
$listener.Stop()

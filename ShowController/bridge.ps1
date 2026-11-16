Add-Type -AssemblyName System.Windows.Forms
$Host.UI.RawUI.WindowTitle = "ShowBridge"
$port = 8765
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$port/")
$listener.Start()

# Use local Media folder inside ShowController
$mediaDir = Join-Path $PSScriptRoot "Media"
if (!(Test-Path $mediaDir)) { New-Item -ItemType Directory -Path $mediaDir | Out-Null }


$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".webp" = "image/webp"
    ".svg"  = "image/svg+xml"
    ".mp3"  = "audio/mpeg"
    ".wav"  = "audio/wav"
    ".ogg"  = "audio/ogg"
    ".m4a"  = "audio/mp4"
    ".mp4"  = "video/mp4"
    ".mov"  = "video/quicktime"
}

Write-Host "Show Server running at http://127.0.0.1:$port/" -ForegroundColor Green
Write-Host "Serving media from: $mediaDir" -ForegroundColor Cyan

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $req = $context.Request
        $res = $context.Response
        $rawPath = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath)

        # API: Detect Monitor 2 Coordinates
        if ($rawPath -eq "/api/screens") {
            $screens = [System.Windows.Forms.Screen]::AllScreens
            $sec = $screens | Where-Object { -not $_.Primary } | Select-Object -First 1
            if ($sec) {
                $payload = @{ hasSecond = $true; x = $sec.Bounds.X; y = $sec.Bounds.Y; w = $sec.Bounds.Width; h = $sec.Bounds.Height }
            } else {
                $payload = @{ hasSecond = $false; x = 80; y = 80; w = 1024; h = 600 }
            }
            $json = ConvertTo-Json -InputObject $payload -Compress
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            $res.ContentType = "application/json; charset=utf-8"
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.Close()
            continue
        }

        # API: Bring Standard Edge Browser Window (Pre-loaded YouTube/Canva Tabs) to Front
        if ($rawPath -eq "/api/focus-browser") {
            $wshell = New-Object -ComObject WScript.Shell
            $edgeProcs = Get-Process msedge -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -ne "" -and $_.MainWindowTitle -notmatch "Show Control|Projector Output" }
            foreach ($p in $edgeProcs) {
                $wshell.AppActivate($p.Id) | Out-Null
            }
            $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"ok":true}')
            $res.ContentType = "application/json"
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.Close()
            continue
        }


        # API: Graceful Shutdown, Restore Display & Close Show Edge Instance
        if ($rawPath -eq "/api/shutdown") {
            $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"status":"stopping"}')
            $res.ContentType = "application/json"
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.Close()

            DisplaySwitch.exe /clone
            Start-Sleep -Seconds 1

            Get-CimInstance Win32_Process -Filter "Name = 'msedge.exe'" | Where-Object {
                $_.CommandLine -like "*ShowControllerEdge*"
            } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

            break
        }

                # API: Launch or Kill Native PowerPoint Slideshow (/S)
        if ($rawPath -eq "/api/ppt" -and $req.HttpMethod -eq "POST") {
            $reader = New-Object System.IO.StreamReader($req.InputStream, [System.Text.Encoding]::UTF8)
            $body = $reader.ReadToEnd() | ConvertFrom-Json
            $status = '{"status":"ok"}'

            if ($body.action -eq "launch_ppt") {
                Get-Process powerpnt -ErrorAction SilentlyContinue | Stop-Process -Force
                Start-Sleep -Milliseconds 250
                $safeName = [System.IO.Path]::GetFileName($body.file)
                $fullPath = Join-Path $mediaDir $safeName

                if ((Test-Path $fullPath) -and ($safeName -like "*.ppt*")) {
                    Start-Process "powerpnt.exe" -ArgumentList "/S `"$fullPath`""
                    $status = '{"status":"launched"}'
                } else {
                    $res.StatusCode = 404
                    $status = '{"error":"Place your .pptx file inside the ShowController\\Media folder first."}'
                }
            } elseif ($body.action -eq "kill_ppt") {
                Get-Process powerpnt -ErrorAction SilentlyContinue | Stop-Process -Force
                $status = '{"status":"closed"}'
            }

            $bytes = [System.Text.Encoding]::UTF8.GetBytes($status)
            $res.ContentType = "application/json; charset=utf-8"
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.Close()
            continue
        }

        # API: List files on Desktop
        if ($rawPath -eq "/api/media") {
            $files = @(Get-ChildItem -Path $mediaDir -File | Select-Object -ExpandProperty Name)
            $json = if ($files.Count -eq 0) { "[]" } else { ConvertTo-Json -InputObject $files -Compress }
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
            $res.ContentType = "application/json; charset=utf-8"
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.Close()
            continue
        }

        # Default route -> index.html
        if ($rawPath -eq "/") { $rawPath = "/control.html" }

        # Block directory traversal
        $cleanRelPath = $rawPath.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
        if ($cleanRelPath.Contains("..")) {
            $res.StatusCode = 403
            $res.Close()
            continue
        }

        # Route /Media/* requests to Windows Desktop; everything else to ShowController folder
        if ($rawPath.StartsWith("/Media/")) {
            $fileName = $rawPath.Substring(7).Replace('/', [System.IO.Path]::DirectorySeparatorChar)
            $targetFile = Join-Path $mediaDir $fileName
        } else {
            $targetFile = Join-Path $PSScriptRoot $cleanRelPath
        }

        if (Test-Path $targetFile -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($targetFile).ToLower()
            $res.ContentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
            $fileBytes = [System.IO.File]::ReadAllBytes($targetFile)
            $res.ContentLength64 = $fileBytes.Length
            $res.OutputStream.Write($fileBytes, 0, $fileBytes.Length)
        } else {
            $res.StatusCode = 404
        }
        $res.Close()
    } catch {
        # Keep server alive on minor connection drops
    }
}
$listener.Stop()

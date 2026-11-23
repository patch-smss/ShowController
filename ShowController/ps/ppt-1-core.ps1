$script:pptApp = $null
$script:masterPres = $null
$script:frozenTempSlide = 0
$script:intermissionSlide = 0

function Get-PptApp {
    if ($null -ne $script:pptApp) {
        try { $null = $script:pptApp.Version; return $script:pptApp } catch { $script:pptApp = $null }
    }
    try { $script:pptApp = [Runtime.InteropServices.Marshal]::GetActiveObject("PowerPoint.Application") }
    catch { $script:pptApp = New-Object -ComObject PowerPoint.Application }
    $script:pptApp.Visible = -1
    return $script:pptApp
}

function Ensure-MasterPresentation($mediaDir) {
    $app = Get-PptApp
    $masterPath = Join-Path $mediaDir "_ShowMaster.pptx"
    if ($null -ne $script:masterPres) {
        try { $null = $script:masterPres.Slides.Count; return $script:masterPres } catch { $script:masterPres = $null }
    }
    foreach ($p in $app.Presentations) {
        if ($p.FullName -eq $masterPath) { $script:masterPres = $p; break }
    }
    if ($null -eq $script:masterPres) {
        $cfg = if (Get-Command Get-ShowSettings -ErrorAction SilentlyContinue) { Get-ShowSettings } else { @{ aspectRatio = "16:9" } }
        $script:masterPres = $app.Presentations.Add(-1)
        $script:masterPres.PageSetup.SlideSize = if ($cfg.aspectRatio -eq "4:3") { 15 } else { 16 }
        $s1 = $script:masterPres.Slides.Add(1, 12)
        $s1.FollowMasterBackground = 0; $s1.Background.Fill.Solid(); $s1.Background.Fill.ForeColor.RGB = 0
        $script:masterPres.SaveAs($masterPath)
    }
    return $script:masterPres
}

function Start-StageSlideShow($pres) {
    $app = Get-PptApp
    $sec = [System.Windows.Forms.Screen]::AllScreens | Where-Object { -not $_.Primary } | Select-Object -First 1
    if ($app.SlideShowWindows.Count -eq 0) {
        $pres.SlideShowSettings.ShowType = 1
        $pres.SlideShowSettings.LoopUntilStopped = 0
        $pres.SlideShowSettings.ShowWithNarration = -1
        $pres.SlideShowSettings.ShowWithAnimation = -1
        $ssWin = $pres.SlideShowSettings.Run()
    } else { $ssWin = $app.SlideShowWindows.Item(1) }
    if ($sec -and $ssWin) {
        $ssWin.Left = [float]($sec.Bounds.X * 0.75); $ssWin.Top = [float]($sec.Bounds.Y * 0.75)
        $ssWin.Width = [float]($sec.Bounds.Width * 0.75); $ssWin.Height = [float]($sec.Bounds.Height * 0.75)
    }
    return $ssWin
}

function Close-PptCleanly {
    try {
        if ($null -ne $script:pptApp) {
            while ($script:pptApp.SlideShowWindows.Count -gt 0) { $script:pptApp.SlideShowWindows.Item(1).View.Exit() }
            if ($null -ne $script:masterPres) { $script:masterPres.Saved = -1; $script:masterPres.Close() }
            if ($script:pptApp.Presentations.Count -eq 0) { $script:pptApp.Quit() }
        }
    } catch {}
    $script:masterPres = $null; $script:pptApp = $null; $script:frozenTempSlide = 0; $script:intermissionSlide = 0
}

function Handle-PptCoreApi($rawPath, $req, $res, $mediaDir) {
    if ($rawPath -eq "/api/ppt/init" -and $req.HttpMethod -eq "POST") {
        try {
            $pres = Ensure-MasterPresentation $mediaDir; $ssWin = Start-StageSlideShow $pres
            if (Get-Command Arrange-Monitor1Windows -ErrorAction SilentlyContinue) { Arrange-Monitor1Windows }
            Send-Json $res @{ ok = $true; slides = $pres.Slides.Count; current = if ($ssWin) { $ssWin.View.CurrentShowPosition } else { 1 } }
        } catch { $res.StatusCode = 500; Send-Json $res @{ ok = $false; error = $_.Exception.Message } }
        return $true
    }

    if ($rawPath -eq "/api/ppt/save" -and $req.HttpMethod -eq "POST") {
        try {
            $body = (New-Object System.IO.StreamReader($req.InputStream)).ReadToEnd() | ConvertFrom-Json
            $pres = Ensure-MasterPresentation $mediaDir
            $safe = [System.IO.Path]::GetFileNameWithoutExtension($body.name) + ".pptx"
            $pres.SaveCopyAs((Join-Path $mediaDir $safe))
            Send-Json $res @{ ok = $true; file = $safe }
        } catch { $res.StatusCode = 500; Send-Json $res @{ ok = $false; error = $_.Exception.Message } }
        return $true
    }

    if ($rawPath -eq "/api/ppt/load" -and $req.HttpMethod -eq "POST") {
        try {
            $body = (New-Object System.IO.StreamReader($req.InputStream)).ReadToEnd() | ConvertFrom-Json
            $safe = [System.IO.Path]::GetFileName($body.file)
            $src = Join-Path $mediaDir $safe
            if (-not (Test-Path $src)) { throw "Saved PPTX not found: $safe" }
            $app = Get-PptApp
            while ($app.SlideShowWindows.Count -gt 0) { $app.SlideShowWindows.Item(1).View.Exit() }
            if ($null -ne $script:masterPres) { $script:masterPres.Saved = -1; $script:masterPres.Close() }
            $masterPath = Join-Path $mediaDir "_ShowMaster.pptx"
            Copy-Item -Path $src -Destination $masterPath -Force
            Unblock-File -Path $masterPath -ErrorAction SilentlyContinue
            $script:masterPres = $app.Presentations.Open($masterPath, 0, 0, -1)
            $script:intermissionSlide = 0
            Start-StageSlideShow $script:masterPres | Out-Null
            if (Get-Command Arrange-Monitor1Windows -ErrorAction SilentlyContinue) { Arrange-Monitor1Windows }
            Send-Json $res @{ ok = $true; slides = $script:masterPres.Slides.Count }
        } catch { $res.StatusCode = 500; Send-Json $res @{ ok = $false; error = $_.Exception.Message } }
        return $true
    }

    if ($rawPath -eq "/api/ppt/close" -and $req.HttpMethod -eq "POST") {
        Close-PptCleanly; Send-Json $res @{ ok = $true }; return $true
    }

    return $false
}

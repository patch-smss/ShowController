$script:pptApp = $null
$script:masterPres = $null
$script:frozenTempSlide = 0

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
        $script:masterPres = $app.Presentations.Add(-1)
        $script:masterPres.PageSetup.SlideSize = 16
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

function Insert-MediaSlide($pres, $fullPath, $kind) {
    $idx = $pres.Slides.Count + 1
    $sl = $pres.Slides.Add($idx, 12)
    $sl.FollowMasterBackground = 0; $sl.Background.Fill.Solid(); $sl.Background.Fill.ForeColor.RGB = 0
    $sw = $pres.PageSetup.SlideWidth; $sh = $pres.PageSetup.SlideHeight
    if ($kind -eq "image") {
        $shp = $sl.Shapes.AddPicture($fullPath, 0, -1, 0, 0)
        $shp.LockAspectRatio = -1
        $scale = [Math]::Min($sw / $shp.Width, $sh / $shp.Height)
        $shp.Width = $shp.Width * $scale
        $shp.Left = ($sw - $shp.Width) / 2; $shp.Top = ($sh - $shp.Height) / 2
    } elseif ($kind -eq "video") {
        $shp = $sl.Shapes.AddMediaObject2($fullPath, 0, -1, 0, 0, $sw, $sh)
        $shp.AnimationSettings.PlaySettings.PlayOnEntry = -1
        $shp.AnimationSettings.PlaySettings.PauseAnimation = 0
        $shp.AnimationSettings.PlaySettings.HideWhileNotPlaying = -1
    }
    return $idx
}

function Close-PptCleanly {
    try {
        if ($null -ne $script:pptApp) {
            while ($script:pptApp.SlideShowWindows.Count -gt 0) { $script:pptApp.SlideShowWindows.Item(1).View.Exit() }
            if ($null -ne $script:masterPres) { $script:masterPres.Saved = -1; $script:masterPres.Close() }
            if ($script:pptApp.Presentations.Count -eq 0) { $script:pptApp.Quit() }
        }
    } catch {}
    $script:masterPres = $null; $script:pptApp = $null; $script:frozenTempSlide = 0
}

function Handle-PptComApi($rawPath, $req, $res, $mediaDir) {
    if ($rawPath -eq "/api/ppt/init" -and $req.HttpMethod -eq "POST") {
        try {
            $pres = Ensure-MasterPresentation $mediaDir; $ssWin = Start-StageSlideShow $pres
            Send-Json $res @{ ok = $true; slides = $pres.Slides.Count; current = if ($ssWin) { $ssWin.View.CurrentShowPosition } else { 1 } }
        } catch { $res.StatusCode = 500; Send-Json $res @{ ok = $false; error = $_.Exception.Message } }
        return $true
    }

    if ($rawPath -eq "/api/ppt/save" -and $req.HttpMethod -eq "POST") {
        try {
            $body = (New-Object System.IO.StreamReader($req.InputStream)).ReadToEnd() | ConvertFrom-Json
            $pres = Ensure-MasterPresentation $mediaDir
            $safe = [System.IO.Path]::GetFileNameWithoutExtension($body.name) + ".pptx"
            $dest = Join-Path $mediaDir $safe
            $pres.SaveCopyAs($dest)
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
            $ssWin = Start-StageSlideShow $script:masterPres
            Send-Json $res @{ ok = $true; slides = $script:masterPres.Slides.Count }
        } catch { $res.StatusCode = 500; Send-Json $res @{ ok = $false; error = $_.Exception.Message } }
        return $true
    }

    if ($rawPath -eq "/api/ppt/close" -and $req.HttpMethod -eq "POST") {
        Close-PptCleanly
        Send-Json $res @{ ok = $true }
        return $true
    }

    if ($rawPath -eq "/api/ppt/insert" -and $req.HttpMethod -eq "POST") {
        try {
            $body = (New-Object System.IO.StreamReader($req.InputStream)).ReadToEnd() | ConvertFrom-Json
            $pres = Ensure-MasterPresentation $mediaDir
            $rel = $body.file.Replace('/', '\').TrimStart('\')
            $full = Join-Path $mediaDir $rel
            if ($rel.Contains("..") -or -not (Test-Path $full)) { throw "File not found: $rel" }
            $startIdx = $pres.Slides.Count + 1
            if ($body.kind -eq "ppt") { $added = $pres.Slides.InsertFromFile($full, $pres.Slides.Count, 1, -1); $endIdx = $startIdx + $added - 1 }
            else { $endIdx = Insert-MediaSlide $pres $full $body.kind }
            Send-Json $res @{ ok = $true; startSlide = $startIdx; endSlide = $endIdx; total = $pres.Slides.Count }
        } catch { $res.StatusCode = 500; Send-Json $res @{ ok = $false; error = $_.Exception.Message } }
        return $true
    }

    if ($rawPath -eq "/api/ppt/sync") {
        try {
            $app = Get-PptApp; $pres = Ensure-MasterPresentation $mediaDir; $list = @()
            for ($i = 1; $i -le $pres.Slides.Count; $i++) {
                $sl = $pres.Slides.Item($i)
                $title = if ($i -eq 1) { "Stage Blackout (Slide 1)" } elseif ($sl.Shapes.HasTitle -eq -1) { $sl.Shapes.Title.TextFrame.TextRange.Text } else { "Slide $i" }
                $list += @{ index = $i; title = $title.Trim(); hidden = ($sl.SlideShowTransition.Hidden -eq -1) }
            }
            $hasWin = ($app.SlideShowWindows.Count -gt 0)
            Send-Json $res @{
                ok = $true; frozen = ($script:frozenTempSlide -gt 0); slides = $list
                current = if ($hasWin) { $app.SlideShowWindows.Item(1).View.CurrentShowPosition } else { 0 }
                state = if ($hasWin) { [int]$app.SlideShowWindows.Item(1).View.State } else { 0 }
            }
        } catch { Send-Json $res @{ ok = $false; error = $_.Exception.Message } }
        return $true
    }

    if ($rawPath -eq "/api/ppt/nav" -and $req.HttpMethod -eq "POST") {
        try {
            $body = (New-Object System.IO.StreamReader($req.InputStream)).ReadToEnd() | ConvertFrom-Json
            $pres = Ensure-MasterPresentation $mediaDir; $ssWin = Start-StageSlideShow $pres; $view = $ssWin.View
            switch ($body.action) {
                "focus"    { $ssWin.Activate() }
                "next"     { $view.State = 1; $view.Next() }
                "prev"     { $view.State = 1; $view.Previous() }
                "goto"     { $view.State = 1; $view.GotoSlide([int]$body.slide) }
                "blackout" { $view.State = if ($body.active) { 3 } else { 1 } }
                "freeze"   {
                    if ($body.active -and $script:frozenTempSlide -eq 0) {
                        $dup = $pres.Slides.Item($view.CurrentShowPosition).Duplicate()
                        $script:frozenTempSlide = $dup.SlideIndex; $view.GotoSlide($script:frozenTempSlide)
                    } elseif (-not $body.active -and $script:frozenTempSlide -gt 0) {
                        $view.GotoSlide([Math]::Max(1, $script:frozenTempSlide - 1))
                        $pres.Slides.Item($script:frozenTempSlide).Delete(); $script:frozenTempSlide = 0
                    }
                }
            }
            Send-Json $res @{ ok = $true; current = $view.CurrentShowPosition; state = [int]$view.State; frozen = ($script:frozenTempSlide -gt 0) }
        } catch { $res.StatusCode = 500; Send-Json $res @{ ok = $false; error = $_.Exception.Message } }
        return $true
    }

    return $false
}
